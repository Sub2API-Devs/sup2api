package cleanup

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/keylock"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

const (
	draftKey   = "d0123456789abcdef"
	otherDraft = "dfedcba9876543210"
)

// stubHost is a contract.CleanupHost: account locks, the shared bindings,
// and a delete through the guard that refuses foreign volume users first.
type stubHost struct {
	g        guardapi.Client
	st       *store.Store
	locks    *keylock.Locks
	mu       sync.Mutex
	bindings map[string]pyjson.Ordered
	extra    []string // more binding keys (the size limit)
	deleted  []string
	failNext error
}

func (h *stubHost) Lock(ctx context.Context, aid string) (*keylock.Held, error) {
	return h.locks.Lock(ctx, aid)
}

func (h *stubHost) SharedBindingKeys() []string {
	h.mu.Lock()
	defer h.mu.Unlock()
	var out []string
	for k := range h.bindings {
		out = append(out, k)
	}
	return append(out, h.extra...)
}

func (h *stubHost) SharedBinding(aid string) (pyjson.Ordered, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	b, ok := h.bindings[aid]
	return b.Clone(), ok
}

func (h *stubHost) DeleteLocked(ctx context.Context, held *keylock.Held, account, purge bool) (*contract.DeleteResult, error) {
	aid := held.Key()
	held.Check(aid)
	if !account || !purge {
		panic("cleanup must purge the account")
	}
	if err := h.failNext; err != nil {
		h.failNext = nil
		return nil, err
	}
	a, err := h.g.Account(ctx, aid)
	if err != nil {
		return nil, err
	}
	ours := map[string]bool{}
	if a.App != nil {
		ours[a.App.Name] = true
	}
	for _, c := range a.Others {
		ours[c.Name] = true
	}
	var foreign []string
	for _, u := range a.VolumeUsers {
		if !ours[u.Name] {
			foreign = append(foreign, u.Name)
		}
	}
	for _, u := range a.NetworkForeign {
		foreign = append(foreign, u.Name)
	}
	if len(foreign) > 0 {
		return nil, errs.InUse(foreign)
	}
	for name := range ours {
		if err := h.g.DeleteContainer(ctx, aid, strings.TrimPrefix(name, "ccg-"+aid+"-")); err != nil && !guardapi.IsNotFound(err) {
			return nil, err
		}
	}
	for _, role := range []string{"net", "uplink"} {
		if err := h.g.DeleteNetwork(ctx, aid, role); err != nil && !guardapi.IsNotFound(err) {
			return nil, err
		}
	}
	if err := h.g.DeleteVolume(ctx, aid); err != nil && !guardapi.IsNotFound(err) {
		return nil, err
	}
	if err := h.st.RemoveAccountDir(aid); err != nil {
		return nil, err
	}
	if err := h.st.RemoveBackup(aid); err != nil {
		return nil, err
	}
	h.mu.Lock()
	delete(h.bindings, aid)
	h.deleted = append(h.deleted, aid)
	h.mu.Unlock()
	return &contract.DeleteResult{}, nil
}

type env struct {
	t   *testing.T
	g   *fakeguard.Guard
	h   *stubHost
	st  *store.Store
	c   *cleaner
	log *bytes.Buffer
}

func newEnv(t *testing.T) *env {
	g := fakeguard.New()
	g.AddImage("app:test", fakeguard.ImageSpec{})
	g.AddImage("busybox", fakeguard.ImageSpec{})
	st, err := store.Open(filepath.Join(t.TempDir(), "r"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	h := &stubHost{g: g.Client(), st: st, locks: keylock.New(), bindings: map[string]pyjson.Ordered{}}
	var buf bytes.Buffer
	c, err := New(Options{Host: h, Guard: g.Client(), Store: st, Prefix: "ccg", Log: logx.New(&buf, "cleanup")})
	if err != nil {
		t.Fatal(err)
	}
	return &env{t: t, g: g, h: h, st: st, c: c.(*cleaner), log: &buf}
}

var subnet = 0

// apply is a provisioned runtime: network, volume, running app, state.json.
func (e *env) apply(aid string) {
	e.t.Helper()
	subnet++
	label := map[string]string{names.LabelAccount: aid}
	e.g.AddNetwork("ccg-"+aid+"-net", fmt.Sprintf("10.77.%d.0/24", subnet), true, label)
	e.g.AddVolume("ccg-"+aid+"-data", map[string]string{"size": "10737418240"}, label)
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-" + aid + "-app", Image: "app:test", Labels: label,
		Path: "/usr/local/bin/worker", Networks: map[string]string{"ccg-" + aid + "-net": fmt.Sprintf("10.77.%d.3", subnet)},
		Volumes: map[string]string{"ccg-" + aid + "-data": "/work"}})
	if err := e.st.EnsureAccountDir(aid); err != nil {
		e.t.Fatal(err)
	}
	if err := e.st.SaveState(aid, store.NewAccountState("k", "a", "10.77.0.3", "10.77.0.2", "2026-11-01T00:00:00Z")); err != nil {
		e.t.Fatal(err)
	}
}

func (e *env) inventory() []any {
	e.t.Helper()
	v, err := e.c.Inventory(context.Background())
	if err != nil {
		e.t.Fatal(err)
	}
	rows, _ := v.Get("runtimes")
	return rows.([]any)
}

func keysOf(rows []any) string {
	var out []string
	for _, r := range rows {
		k, _ := r.(pyjson.Ordered).Get("key")
		out = append(out, k.(string))
	}
	return strings.Join(out, ",")
}

func keepList(keys ...string) []any {
	out := []any{}
	for _, k := range keys {
		out = append(out, k)
	}
	return out
}

// cleanup runs a request with keep and candidates (the current inventory when nil).
func (e *env) cleanup(keep []any, candidates []any) pyjson.Ordered {
	e.t.Helper()
	if candidates == nil {
		candidates = e.inventory()
	}
	v, err := e.c.Cleanup(context.Background(), pyjson.Ordered{{Key: "keep_keys", Value: keep}, {Key: "candidates", Value: candidates}})
	if err != nil {
		e.t.Fatal(err)
	}
	return v
}

func get(o pyjson.Ordered, k string) any {
	v, _ := o.Get(k)
	return v
}

func js(v any) string { return string(pyjson.MustMarshal(v)) }

// covers: X1 X2 X5 D2 (a rollback copy alone is found, identified and purged)
func TestRollbackCopyAloneIsFoundIdentifiedAndPurged(t *testing.T) {
	e := newEnv(t)
	e.g.AddVolume("ccg-30-data", nil, map[string]string{names.LabelAccount: "30"})
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-30-app-rollback-cli16x", Image: "app:test", Status: "created",
		Labels: map[string]string{names.LabelAccount: "30"}, Volumes: map[string]string{"ccg-30-data": "/work"}})
	e.g.StopContainer("ccg-30-app-rollback-cli16x")
	snapshot := e.inventory()
	if keysOf(snapshot) != "30" {
		t.Fatal(js(snapshot))
	}
	e.g.RestartContainer("ccg-30-app-rollback-cli16x") // its identity covers the rollback container
	if r := e.cleanup(keepList(), snapshot); js(get(r, "results")) != `[{"key": "30", "status": "changed"}]` {
		t.Fatal(js(r))
	}
	if r := e.cleanup(keepList(), nil); js(get(r, "deleted")) != "1" {
		t.Fatal(js(r))
	}
	if e.g.Exists("ccg-30-app-rollback-cli16x") || len(e.inventory()) != 0 {
		t.Fatal(e.g.ContainerNames())
	}
}

// covers: X1 D2 (another prefix and unrelated names are not inventoried)
func TestOtherPrefixAndUnrelatedNamesAreNotInventoried(t *testing.T) {
	e := newEnv(t)
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-clean-x1-31-app-rollback-a", Image: "app:test", Labels: map[string]string{names.LabelAccount: "31"}})
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-31-sidecar", Image: "app:test", Labels: map[string]string{names.LabelAccount: "31"}})
	e.g.AddNetwork("ccg-31-other", "10.88.0.0/24", false, map[string]string{names.LabelAccount: "31"})
	e.g.AddVolume("unrelated-data", nil, map[string]string{names.LabelAccount: "31"})
	if rows := e.inventory(); len(rows) != 0 {
		t.Fatal(js(rows))
	}
}

// covers: X5 (a foreign user of the volume: failed, resource_in_use, nothing removed)
func TestForeignUserOfTheVolumeIsReportedInUse(t *testing.T) {
	e := newEnv(t)
	e.apply("21")
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "debug-shell", Image: "busybox", Volumes: map[string]string{"ccg-21-data": "/d"}})
	r := e.cleanup(keepList(), nil)
	if js(get(r, "results")) != `[{"key": "21", "status": "failed", "reason": "resource_in_use"}]` || js(get(r, "failed")) != "1" {
		t.Fatal(js(r))
	}
	if !e.g.Exists("ccg-21-app") {
		t.Fatal("app removed")
	}
	if !strings.Contains(e.log.String(), "cleanup key=21 failed: ResourceInUse") {
		t.Fatal(e.log.String())
	}
}

// covers: X4 X5 (kept keys are never touched)
func TestDisabledAccountAndAuthorizationPreparationAreKept(t *testing.T) {
	e := newEnv(t)
	for _, k := range []string{"21", "22", draftKey, otherDraft} {
		e.apply(k)
	}
	e.g.StopContainer("ccg-22-app") // blocked
	r := e.cleanup(keepList("21", "22", draftKey), nil)
	if js(get(r, "deleted")) != "1" || js(get(r, "failed")) != "0" {
		t.Fatal(js(r))
	}
	if js(get(r, "results")) != `[{"key": "21", "status": "kept"}, {"key": "22", "status": "kept"}, {"key": "`+draftKey+
		`", "status": "kept"}, {"key": "`+otherDraft+`", "status": "deleted"}]` {
		t.Fatal(js(r))
	}
	if !e.g.Exists("ccg-22-data") || !e.g.Exists("ccg-"+draftKey+"-app") || e.g.Exists("ccg-"+otherDraft+"-data") {
		t.Fatal(e.g.VolumeNames())
	}
}

// covers: X1 X5 (a runtime without state is still found by its resources)
func TestMissingStateStillFindsOwnedResources(t *testing.T) {
	e := newEnv(t)
	e.g.AddVolume("ccg-21-data", nil, map[string]string{names.LabelAccount: "21"})
	e.g.AddVolume("unrelated-data", nil, map[string]string{names.LabelAccount: "22"})
	if r := e.cleanup(keepList(), nil); js(get(r, "deleted")) != "1" {
		t.Fatal(js(r))
	}
	if !e.g.Exists("unrelated-data") || e.g.Exists("ccg-21-data") {
		t.Fatal(e.g.VolumeNames())
	}
}

// covers: X2 X5 (a restart after the inventory changes the identity; a new runtime is not a candidate)
func TestChangedRuntimeAndNewRuntimeAreNotDeleted(t *testing.T) {
	e := newEnv(t)
	e.apply("21")
	snapshot := e.inventory()
	e.g.RestartContainer("ccg-21-app")
	e.apply("22")
	r := e.cleanup(keepList(), snapshot)
	if js(r) != `{"results": [{"key": "21", "status": "changed"}], "deleted": 0, "failed": 0}` {
		t.Fatal(js(r))
	}
	if !e.g.Exists("ccg-21-app") || !e.g.Exists("ccg-22-app") {
		t.Fatal(e.g.ContainerNames())
	}
}

// covers: X2 X5 (a resource that became someone else's is caught before any deletion)
func TestForeignResourceIsCheckedBeforeAnyDeletion(t *testing.T) {
	e := newEnv(t)
	e.apply("21")
	snapshot := e.inventory()
	// The volume name is now taken by another account's volume.
	e.g.AddVolume("ccg-21-data", nil, map[string]string{names.LabelAccount: "22"})
	r := e.cleanup(keepList(), snapshot)
	if js(get(r, "results")) != `[{"key": "21", "status": "failed", "reason": "resource_in_use"}]` {
		t.Fatal(js(r))
	}
	if !e.g.Exists("ccg-21-app") || !e.g.Exists("ccg-21-net") {
		t.Fatal(e.g.ContainerNames())
	}
}

// covers: X1 X2 X5 (an own egress and uplink left by an older controller are inventoried and purged)
func TestOwnEgressLeftByAnOlderControllerIsInventoriedAndPurged(t *testing.T) {
	e := newEnv(t)
	e.apply("21")
	e.g.AddImage("egress:test", fakeguard.ImageSpec{})
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-21-egress", Image: "egress:test", Labels: map[string]string{names.LabelAccount: "21"}})
	e.g.AddNetwork("ccg-21-uplink", "10.99.0.0/24", false, map[string]string{names.LabelAccount: "21"})
	rows, err := e.c.dockerResources(context.Background(), "21")
	if err != nil {
		t.Fatal(err)
	}
	var roles []string
	for _, r := range rows {
		roles = append(roles, r.([]any)[0].(string)+":"+r.([]any)[1].(string))
	}
	if strings.Join(roles, ",") != "container:app,container:egress,network:net,network:uplink,volume:data" {
		t.Fatal(roles)
	}
	if r := e.cleanup(keepList(), nil); js(get(r, "deleted")) != "1" {
		t.Fatal(js(r))
	}
	if e.g.Exists("ccg-21-egress") || e.g.Exists("ccg-21-uplink") {
		t.Fatal(e.g.ContainerNames(), e.g.NetworkNames())
	}
}

// covers: X3 (one unreadable runtime does not fail the inventory; its identity never matches)
func TestOneUnreadableRuntimeDoesNotFailTheInventory(t *testing.T) {
	e := newEnv(t)
	e.apply("21")
	if err := e.st.EnsureAccountDir("23"); err != nil {
		t.Fatal(err)
	}
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-23-app", Image: "busybox", Labels: map[string]string{names.LabelAccount: "99"}})
	snapshot := e.inventory()
	if keysOf(snapshot) != "21,23" || !strings.Contains(e.log.String(), "WARNING") || !strings.Contains(e.log.String(), "cleanup inventory key=23") {
		t.Fatal(js(snapshot), e.log.String())
	}
	if id := get(snapshot[1].(pyjson.Ordered), "identity"); id != UnreadableIdentity("23") {
		t.Fatal(id)
	}
	r := e.cleanup(keepList(), snapshot)
	if js(get(r, "results")) != `[{"key": "21", "status": "deleted"}, {"key": "23", "status": "failed", "reason": "resource_in_use"}]` {
		t.Fatal(js(r))
	}
	if !e.g.Exists("ccg-23-app") || !e.st.Exists("23") {
		t.Fatal("23 touched")
	}
	// Once the name conflict is gone the runtime is listed normally.
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-23-app", Image: "app:test", Labels: map[string]string{names.LabelAccount: "23"}})
	r = e.cleanup(keepList(), snapshot)
	if js(get(r, "results")) != `[{"key": "21", "status": "absent"}, {"key": "23", "status": "changed"}]` {
		t.Fatal(js(r))
	}
	if r := e.cleanup(keepList(), nil); js(get(r, "deleted")) != "1" || e.st.Exists("23") {
		t.Fatal(js(r))
	}
}

// covers: X4 R21 (an invalid or incomplete request deletes nothing)
func TestInvalidOrIncompleteRequestDoesNotDelete(t *testing.T) {
	e := newEnv(t)
	e.apply("21")
	id := strings.Repeat("a", 64)
	cand := func(k any, identity any) pyjson.Ordered {
		return pyjson.Ordered{{Key: "key", Value: k}, {Key: "identity", Value: identity}}
	}
	for _, body := range []any{
		pyjson.Ordered{}, pyjson.Ordered{{Key: "keep_keys", Value: []any{}}},
		pyjson.Ordered{{Key: "keep_keys", Value: nil}, {Key: "candidates", Value: []any{}}},
		pyjson.Ordered{{Key: "keep_keys", Value: []any{"../21"}}, {Key: "candidates", Value: []any{}}},
		pyjson.Ordered{{Key: "keep_keys", Value: []any{}}, {Key: "candidates", Value: []any{cand("21", "invalid")}}},
		pyjson.Ordered{{Key: "keep_keys", Value: []any{"21", "21"}}, {Key: "candidates", Value: []any{}}},
		pyjson.Ordered{{Key: "keep_keys", Value: []any{21}}, {Key: "candidates", Value: []any{}}},
		pyjson.Ordered{{Key: "keep_keys", Value: []any{}}, {Key: "candidates", Value: []any{cand("21", id), cand("21", id)}}},
		pyjson.Ordered{{Key: "keep_keys", Value: []any{}}, {Key: "candidates", Value: []any{cand("21", strings.ToUpper(id))}}},
		pyjson.Ordered{{Key: "keep_keys", Value: []any{}}, {Key: "candidates", Value: []any{append(cand("21", id), pyjson.KV{Key: "x", Value: 1})}}},
		pyjson.Ordered{{Key: "keep_keys", Value: []any{}}, {Key: "candidates", Value: []any{"21"}}},
		pyjson.Ordered{{Key: "keep_keys", Value: []any{}}, {Key: "candidates", Value: []any{}}, {Key: "x", Value: 1}},
		pyjson.Ordered{{Key: "keep_keys", Value: make([]any, MaxKeys+1)}, {Key: "candidates", Value: []any{}}},
		[]any{}, nil,
	} {
		_, err := e.c.Cleanup(context.Background(), body)
		if st, code, _ := errs.Answer(err, errs.Management); st != 400 || code != "invalid_request" {
			t.Fatal(js(body), err)
		}
	}
	if !e.g.Exists("ccg-21-app") || len(e.h.deleted) != 0 {
		t.Fatal("deleted")
	}
}

// covers: X1 X2 (a binding alone is a runtime; a binding change changes the identity)
func TestSharedBindingIsPartOfTheIdentity(t *testing.T) {
	e := newEnv(t)
	e.h.bindings["21"] = pyjson.Ordered{{Key: "active", Value: true}, {Key: "ip", Value: "10.77.0.3"}}
	snapshot := e.inventory()
	if keysOf(snapshot) != "21" {
		t.Fatal(js(snapshot))
	}
	want := identityOf(t, []any{[]any{"shared_binding", pyjson.Ordered{{Key: "active", Value: true}, {Key: "ip", Value: "10.77.0.3"}}}})
	if get(snapshot[0].(pyjson.Ordered), "identity") != want {
		t.Fatal(js(snapshot))
	}
	e.h.bindings["21"] = pyjson.Ordered{{Key: "active", Value: false}, {Key: "ip", Value: "10.77.0.3"}}
	if r := e.cleanup(keepList(), snapshot); js(get(r, "results")) != `[{"key": "21", "status": "changed"}]` {
		t.Fatal(js(r))
	}
	if r := e.cleanup(keepList(), nil); js(get(r, "deleted")) != "1" || len(e.h.bindings) != 0 {
		t.Fatal(js(r))
	}
}

func identityOf(t *testing.T, resources []any) string {
	b, err := pyjson.MarshalSorted(resources)
	if err != nil {
		t.Fatal(err)
	}
	s := sha256.Sum256(b)
	return hex.EncodeToString(s[:])
}

// covers: X5 (a failed delete is reported; a retry completes)
func TestFailureIsReportedAndRetryCompletesRemainingResources(t *testing.T) {
	e := newEnv(t)
	e.apply("21")
	e.g.Fail("DELETE /v1/accounts/{aid}/network", fakeguard.Fault{Status: 502, Code: "docker_error", Message: "busy network"})
	r := e.cleanup(keepList(), nil)
	if js(get(r, "results")) != `[{"key": "21", "status": "failed", "reason": "resource_cleanup_failed"}]` {
		t.Fatal(js(r))
	}
	if !e.g.Exists("ccg-21-data") {
		t.Fatal("volume removed")
	}
	if r := e.cleanup(keepList(), nil); js(get(r, "deleted")) != "1" || e.g.Exists("ccg-21-data") {
		t.Fatal(js(r))
	}
}

// covers: X1 X2 S28 (a backup alone is a runtime and is purged)
func TestBackupOnlyRuntimeIsFoundAndPurged(t *testing.T) {
	e := newEnv(t)
	if err := e.st.WriteBackup("21", []byte("{}")); err != nil {
		t.Fatal(err)
	}
	snapshot := e.inventory()
	if get(snapshot[0].(pyjson.Ordered), "identity") != identityOf(t, []any{[]any{"backup", sha(t, "{}")}}) {
		t.Fatal(js(snapshot))
	}
	if r := e.cleanup(keepList(), nil); js(get(r, "deleted")) != "1" || e.st.Exists("backups/21.json") {
		t.Fatal(js(r))
	}
}

func sha(t *testing.T, s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

// covers: X1 X2 (a directory without state, with other files, is purged)
func TestStateMissingDirectoryWithLogsIsPurged(t *testing.T) {
	e := newEnv(t)
	if err := e.st.EnsureAccountDir("21"); err != nil {
		t.Fatal(err)
	}
	if err := e.st.WriteAtomic("21/history.log", []byte("fixture")); err != nil {
		t.Fatal(err)
	}
	if r := e.cleanup(keepList(), nil); js(get(r, "deleted")) != "1" || e.st.Exists("21") {
		t.Fatal(js(r))
	}
}

// covers: X2 (the state's content is part of the identity)
func TestStateRewriteChangesIdentity(t *testing.T) {
	e := newEnv(t)
	e.apply("21")
	snapshot := e.inventory()
	st, _ := e.st.LoadState("21")
	st.Revision = strings.Repeat("c", 64)
	if err := e.st.SaveState("21", st); err != nil {
		t.Fatal(err)
	}
	if r := e.cleanup(keepList(), snapshot); js(get(r, "results")) != `[{"key": "21", "status": "changed"}]` {
		t.Fatal(js(r))
	}
}

// covers: X1 R20 (more than 20000 runtimes is an error, 503 runtime_unavailable)
func TestInventoryTooLarge(t *testing.T) {
	e := newEnv(t)
	for i := 1; i <= MaxKeys+1; i++ {
		e.h.extra = append(e.h.extra, fmt.Sprint(i))
	}
	_, err := e.c.Inventory(context.Background())
	if st, code, known := errs.Answer(err, errs.Management); err == nil || known || st != 503 || code != "runtime_unavailable" {
		t.Fatal(err)
	}
	e.h.extra = e.h.extra[:MaxKeys]
	if _, err := e.c.keys(context.Background()); err != nil {
		t.Fatal(err)
	}
}

// covers: X2 (the identity is Python's: sha256 of json.dumps(rows, sort_keys=True))
func TestIdentityMatchesPythonDigest(t *testing.T) {
	e := newEnv(t)
	e.g.AddVolume("ccg-21-data", nil, map[string]string{names.LabelAccount: "21"})
	rows, err := e.c.dockerResources(context.Background(), "21")
	if err != nil {
		t.Fatal(err)
	}
	created := rows[0].([]any)[3]
	got := e.inventory()
	// json.dumps([["volume", "data", "ccg-21-data", <CreatedAt>, None, None]], sort_keys=True)
	text := `[["volume", "data", "ccg-21-data", "` + created.(string) + `", null, null]]`
	if get(got[0].(pyjson.Ordered), "identity") != sha(t, text) {
		t.Fatal(js(rows), text)
	}
	if UnreadableIdentity("23") != sha(t, "unreadable runtime 23") {
		t.Fatal("unreadable identity")
	}
}

// covers: X5 K10 (the account lock is held across the snapshot and the delete)
func TestCleanupHoldsTheAccountLock(t *testing.T) {
	e := newEnv(t)
	e.apply("21")
	snapshot := e.inventory()
	h, err := e.h.Lock(context.Background(), "21")
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err = e.c.Cleanup(ctx, pyjson.Ordered{{Key: "keep_keys", Value: []any{}}, {Key: "candidates", Value: snapshot}})
	if err != nil {
		t.Fatal(err)
	}
	h.Release()
	if !e.g.Exists("ccg-21-app") {
		t.Fatal("deleted without the lock")
	}
	if _, err := e.c.Inventory(ctx); !errors.Is(err, context.Canceled) && !errs.Is(err, errs.RuntimeBusy) {
		t.Fatal(err)
	}
}

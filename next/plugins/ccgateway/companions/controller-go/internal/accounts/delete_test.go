package accounts

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
)

func (e *env) del(aid string, account, purge bool) string {
	t := e.t
	t.Helper()
	r, err := e.m.Delete(bg, aid, account, purge)
	if err != nil {
		t.Fatal(err)
	}
	return string(pyjson.MustMarshal(r))
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// covers: D1 D5 D6 G13 (test_delete_draft_removes_everything_and_is_idempotent)
func TestDeleteDraftRemovesEverythingAndIsIdempotent(t *testing.T) {
	e := newEnv(t)
	e.mustApply(draftKey, desired(rev))
	e.mustApply(otherDraft, desired(rev))
	got := e.del(draftKey, false, false)
	want := `{"deleted": true, "removed": {"containers": ["ccg-` + draftKey + `-app"], "networks": ["ccg-` + draftKey + `-net"], "volume": true}}`
	if got != want {
		t.Fatal(got)
	}
	for _, n := range []string{"-app", "-net", "-data"} {
		if e.g.Exists("ccg-" + draftKey + n) {
			t.Fatal(n)
		}
	}
	if exists(filepath.Join(e.dir, draftKey)) || e.m.OnlineAt(draftKey, rev) || e.status(draftKey) != "pending" {
		t.Fatal("directory and readiness gone")
	}
	if _, ok := e.m.SharedBinding(draftKey); ok {
		t.Fatal("binding gone")
	}
	gw, _ := e.g.Client().Gateway(bg)
	if _, on := gw.Container.Networks["ccg-"+draftKey+"-net"]; on {
		t.Fatal("gateway detached")
	}
	nothing := `{"deleted": true, "removed": {"containers": [], "networks": [], "volume": false}}`
	if e.del(draftKey, false, false) != nothing || e.del("d"+strings.Repeat("f", 16), false, false) != nothing {
		t.Fatal("idempotent")
	}
	if !e.g.Exists("ccg-"+otherDraft+"-app") || !exists(filepath.Join(e.dir, otherDraft, "state.json")) || e.status(otherDraft) != "ready" {
		t.Fatal("other runtimes untouched")
	}
}

// covers: D1 V1 (test_delete_refuses_account_keys)
func TestDeleteRefusesAccountKeys(t *testing.T) {
	e := newEnv(t)
	e.mustApply("5", desired(rev))
	if _, err := e.m.Delete(bg, "5", false, false); !isKind(err, errs.NotDraft) {
		t.Fatal(err)
	}
	if !e.g.Exists("ccg-5-app") || !e.g.Exists("ccg-5-data") || !exists(filepath.Join(e.dir, "5", "state.json")) {
		t.Fatal("kept")
	}
	if _, err := e.m.Delete(bg, "../5", true, false); !isKind(err, errs.BadRequest) {
		t.Fatal(err)
	}
}

// covers: D1 D5 S28 (test_delete_account_runtime_when_named_explicitly)
func TestDeleteAccountRuntimeWhenNamedExplicitly(t *testing.T) {
	e := newEnv(t)
	e.mustApply("5", desired(rev))
	state, _ := e.st.StateBytes("5")
	if _, err := e.m.Delete(bg, "5", true, false); err != nil {
		t.Fatal(err)
	}
	backup, err := os.ReadFile(filepath.Join(e.dir, "backups", "5.json"))
	if err != nil || !bytes.Equal(backup, state) {
		t.Fatal("backup is the state")
	}
	if e.g.Exists("ccg-5-app") || !e.g.Exists("ccg-5-data") || exists(filepath.Join(e.dir, "5")) {
		t.Fatal("volume kept, the rest gone")
	}
	if _, err := e.m.Delete(bg, "5", true, false); err != nil {
		t.Fatal(err)
	}
}

// covers: D2 H10 (test_delete_refuses_foreign_resources: 409 on DELETE)
func TestDeleteRefusesForeignResources(t *testing.T) {
	e := newEnv(t)
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-" + draftKey + "-app", Image: "app:test",
		Labels: map[string]string{names.LabelAccount: "someone-else"}})
	_, err := e.m.Delete(bg, draftKey, false, false)
	if status, code, _ := errs.Answer(err, errs.Delete); !isKind(err, errs.OwnershipMismatch) || status != 409 || code != "resource_in_use" {
		t.Fatal(err)
	}
	if !e.g.Exists("ccg-" + draftKey + "-app") {
		t.Fatal("kept")
	}
	// Elsewhere a same-name foreign resource is 503 (H10).
	if status, _, _ := errs.Answer(err, errs.Request); status != 503 {
		t.Fatal(status)
	}
}

// covers: D5 D7 (test_delete_tolerates_a_network_removed_meanwhile)
func TestDeleteToleratesANetworkRemovedMeanwhile(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.g.Fail("DELETE /v1/accounts/{aid}/network", fakeguard.Fault{Status: 404, Code: "not_found", Reason: "network"})
	r, err := e.m.Delete(bg, "21", true, true)
	if err != nil || len(r.Networks) != 0 || !r.Volume {
		t.Fatalf("%+v %v", r, err)
	}
}

// covers: D2 D6 PV13 (test_delete_purges_an_own_egress_left_by_an_older_controller)
func TestDeletePurgesAnOwnEgressLeftByAnOlderController(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	ownEgressLeftovers(t, e, "21")
	got := e.del("21", true, true)
	if got != `{"deleted": true, "removed": {"containers": ["ccg-21-app", "ccg-21-egress"], "networks": ["ccg-21-net", "ccg-21-uplink"], "volume": true}}` {
		t.Fatal(got)
	}
}

// covers: PV12 PV13 (test_network_change_removes_an_own_egress_left_by_an_older_controller)
func TestNetworkChangeRemovesAnOwnEgressLeftByAnOlderController(t *testing.T) {
	e := newEnv(t)
	e.mustApply("7", desired(rev))
	ownEgressLeftovers(t, e, "7")
	e.mustApply("7", desired(rev, kv("network", obj(t, `{"pool": "10.80.0.0/16", "allocation": "sequential"}`))))
	if e.g.Exists("ccg-7-egress") || e.g.Exists("ccg-7-uplink") || e.status("7") != "ready" {
		t.Fatal("removed, ready")
	}
}

// covers: D3 D4 02-§8.3 (ended one-shot helpers are the guard's; a running one is a foreign user)
func TestDeleteLeavesEndedHelpersToTheGuardButNotARunningOne(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-oneshot-0123456789abcdef", Image: "app:test",
		Volumes: map[string]string{"ccg-21-data": "/work"}, Status: "running"})
	_, err := e.m.Delete(bg, "21", true, true)
	if !isKind(err, errs.ResourceInUse) || !e.g.Exists("ccg-21-app") {
		t.Fatal(err)
	}
	e.g.StopContainer("ccg-oneshot-0123456789abcdef")
	r, err := e.m.Delete(bg, "21", true, true)
	if err != nil || !r.Volume || e.g.Exists("ccg-oneshot-0123456789abcdef") {
		t.Fatal("the guard removes an ended helper with the volume", err)
	}
}

func rollbackCopy(e *env, prefix, aid string) {
	e.g.AddContainer(fakeguard.ContainerSpec{Name: prefix + "-" + aid + "-app-rollback-cli16x", Image: "app:test",
		Labels: map[string]string{names.LabelAccount: aid}, Status: "exited",
		Volumes: map[string]string{prefix + "-" + aid + "-data": "/work"}})
}

// covers: D2 D6 (test_delete_purge_removes_suffixed_rollback_containers)
func TestDeletePurgeRemovesSuffixedRollbackContainers(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	rollbackCopy(e, "ccg", "21")
	got := e.del("21", true, true)
	if got != `{"deleted": true, "removed": {"containers": ["ccg-21-app", "ccg-21-app-rollback-cli16x"], "networks": ["ccg-21-net"], "volume": true}}` {
		t.Fatal(got)
	}
	if e.g.Exists("ccg-21-data") || exists(filepath.Join(e.dir, "21")) {
		t.Fatal("gone")
	}
	// Only the rollback copy and the volume left (the 30 incident): still completed.
	e.g.AddVolume("ccg-30-data", nil, map[string]string{names.LabelAccount: "30"})
	rollbackCopy(e, "ccg", "30")
	got = e.del("30", true, true)
	if got != `{"deleted": true, "removed": {"containers": ["ccg-30-app-rollback-cli16x"], "networks": [], "volume": true}}` {
		t.Fatal(got)
	}
}

// covers: D3 (test_delete_refuses_foreign_container_on_the_volume_and_removes_nothing)
func TestDeleteRefusesForeignUsersAndRemovesNothing(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	os.MkdirAll(filepath.Join(e.dir, "backups"), 0o700)
	os.WriteFile(filepath.Join(e.dir, "backups", "21.json"), []byte("{}"), 0o600)
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "debug-shell", Image: "app:test", Volumes: map[string]string{"ccg-21-data": "/data"}})
	_, err := e.m.Delete(bg, "21", true, true)
	var named *errs.Error
	if !isKind(err, errs.ResourceInUse) || !errors.As(err, &named) || strings.Join(named.Names, ",") != "debug-shell" {
		t.Fatal(err)
	}
	for _, n := range []string{"ccg-21-app", "debug-shell", "ccg-21-net", "ccg-21-data"} {
		if !e.g.Exists(n) {
			t.Fatal(n)
		}
	}
	if !exists(filepath.Join(e.dir, "21", "state.json")) || !exists(filepath.Join(e.dir, "backups", "21.json")) {
		t.Fatal("files kept")
	}
	if _, ok := e.m.SharedBinding("21"); !ok {
		t.Fatal("binding kept")
	}
	// A foreign endpoint on the account network blocks it as well.
	e.mustApply("22", desired(rev))
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "sidecar", Image: "app:test", Networks: map[string]string{"ccg-22-net": "10.0.1.200"}})
	if _, err := e.m.Delete(bg, "22", true, true); !isKind(err, errs.ResourceInUse) || !e.g.Exists("ccg-22-app") {
		t.Fatal(err)
	}
}

// covers: D2 (test_delete_never_touches_another_prefix_with_the_same_key)
func TestDeleteNeverTouchesAnotherPrefixWithTheSameKey(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	rollbackCopy(e, "ccg-clean-x1", "21")
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-clean-x1-21-app", Image: "app:test",
		Labels: map[string]string{names.LabelAccount: "21"}})
	if _, err := e.m.Delete(bg, "21", true, true); err != nil {
		t.Fatal(err)
	}
	if !e.g.Exists("ccg-clean-x1-21-app-rollback-cli16x") || !e.g.Exists("ccg-clean-x1-21-app") || e.g.Exists("ccg-21-app") {
		t.Fatal("another prefix stays")
	}
}

// covers: D1 D5 S28 (test_delete_without_purge_keeps_volume_and_backup)
func TestDeleteWithoutPurgeKeepsVolumeAndBackup(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	rollbackCopy(e, "ccg", "21")
	r, err := e.m.Delete(bg, "21", true, false)
	if err != nil || r.Volume || e.g.Exists("ccg-21-app-rollback-cli16x") || !e.g.Exists("ccg-21-data") ||
		!exists(filepath.Join(e.dir, "backups", "21.json")) {
		t.Fatal(err)
	}
	if e.del("21", true, false) != `{"deleted": true, "removed": {"containers": [], "networks": [], "volume": false}}` ||
		!e.g.Exists("ccg-21-data") || !exists(filepath.Join(e.dir, "backups", "21.json")) {
		t.Fatal("repeated: nothing left, backup and volume stay")
	}
	// purge removes the backup too.
	if _, err := e.m.Delete(bg, "21", true, true); err != nil || exists(filepath.Join(e.dir, "backups", "21.json")) || e.g.Exists("ccg-21-data") {
		t.Fatal(err)
	}
}

// covers: D7 (test_delete_failure_propagates_and_retry_completes)
func TestDeleteFailurePropagatesAndRetryCompletes(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	rollbackCopy(e, "ccg", "21")
	e.g.Fail("DELETE /v1/accounts/{aid}/containers/{suffix}", fakeguard.Fault{Nth: 2, Status: 502, Code: "docker_error", Message: "device busy"})
	if _, err := e.m.Delete(bg, "21", true, true); err == nil {
		t.Fatal("failure propagates")
	}
	if !e.g.Exists("ccg-21-data") {
		t.Fatal("not reached")
	}
	r, err := e.m.Delete(bg, "21", true, true)
	if err != nil || !r.Volume || e.g.Exists("ccg-21-app-rollback-cli16x") {
		t.Fatal(err)
	}
}

// covers: K1 K10 (DeleteLocked runs under a lock the caller holds and checks it is that runtime's)
func TestDeleteLockedUsesTheHeldLock(t *testing.T) {
	e := newEnv(t)
	e.mustApply(draftKey, desired(rev))
	h, err := e.m.Lock(bg, draftKey)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := e.m.TryLock(draftKey); ok {
		t.Fatal("held")
	}
	if r, err := e.m.DeleteLocked(bg, h, false, false); err != nil || !r.Volume {
		t.Fatal(err)
	}
	h.Release()
	if _, ok := e.m.TryLock(draftKey); !ok {
		t.Fatal("released")
	}
}

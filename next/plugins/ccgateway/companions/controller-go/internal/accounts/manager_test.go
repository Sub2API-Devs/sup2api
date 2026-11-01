package accounts

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/scripts"
	"ccgateway/controller/internal/store"
)

func (e *env) kindOf(aid string, d pyjson.Ordered) string {
	t := e.t
	t.Helper()
	out, err := e.apply(aid, d)
	if err != nil {
		t.Fatal(err)
	}
	switch v := out.(type) {
	case *contract.Public:
		return v.Status
	case *contract.Blocked:
		return "blocked"
	}
	t.Fatalf("%#v", out)
	return ""
}

// covers: A4 BL1 G5 (test_direct_runtime_without_proxy)
func TestDirectRuntimeWithoutProxy(t *testing.T) {
	e := newEnv(t)
	if s := e.kindOf("5", pyjson.Ordered{kv("revision", rev), kv("proxy", nil), kv("direct", true)}); s != "ready" {
		t.Fatal(s)
	}
	if !strings.Contains(e.g.AppliedNFT(), "meta nfproto ipv4 meta l4proto tcp accept") {
		t.Fatal("direct outbound: private destinations dropped, the rest allowed")
	}
	// Without the core's direct flag a missing proxy still blocks.
	for _, d := range []pyjson.Ordered{
		{kv("revision", rev), kv("proxy", nil)},
		{kv("revision", rev), kv("direct", "yes")},
		{kv("revision", rev), kv("direct", true), kv("enabled", false)},
		{kv("revision", rev), kv("proxy", pyjson.Ordered{})},
	} {
		if s := e.kindOf("5", d); s != "blocked" {
			t.Fatal(s)
		}
	}
}

// covers: PV20 02-§8.3 (adapted test_oneshot_removes_a_container_that_could_not_start: a failed guard job leaves nothing)
func TestFailedGuardJobLeavesNothing(t *testing.T) {
	e := newEnv(t)
	e.g.OnJob(func(string, guardapi.Job) (int, []byte) { return -1, nil })
	if _, err := e.apply("7", desired(rev)); err == nil {
		t.Fatal("job failed")
	}
	if e.g.Exists("ccg-7-app") {
		t.Fatal("no container")
	}
	for _, n := range e.g.ContainerNames() {
		if strings.Contains(n, "oneshot") {
			t.Fatal(n)
		}
	}
}

// covers: A2 S22 D1 (test_failed_migration_draft_left_by_an_older_controller_is_only_discarded)
func TestFailedMigrationDraftIsOnlyDiscarded(t *testing.T) {
	e := newEnv(t)
	e.mustApply("7", desired(rev))
	e.mustApply(draftKey, desired(rev))
	st := e.state(draftKey)
	st.MigrationFailed = store.Some[any](true)
	e.save(draftKey, st)
	if _, err := e.apply(draftKey, desired(rev)); !isKind(err, errs.BadRequest) {
		t.Fatal(err)
	}
	if _, err := e.m.Delete(bg, draftKey, false, false); err != nil {
		t.Fatal(err)
	}
	if !e.g.Exists("ccg-7-data") || e.g.Exists("ccg-"+draftKey+"-data") {
		t.Fatal("only the draft goes")
	}
}

// covers: I4 Y3 Y5 PV5 (test_missing_default_image_does_not_break_existing_connection)
func TestMissingDefaultImageDoesNotBreakExistingConnection(t *testing.T) {
	e := newEnv(t)
	e.mustApply("7", desired(rev))
	app := e.appID("7")
	if err := e.images.Set(e.st, "missing:tag", "ccgateway-egress:test"); err != nil {
		t.Fatal(err)
	}
	if c, err := e.m.Connection(bg, "7", rev); err != nil || c.Revision != rev {
		t.Fatal(err)
	}
	if p, _ := e.m.Public(bg, "7"); p.TargetImageAvailable || p.TargetImage != "missing:tag" {
		t.Fatalf("%+v", p)
	}
	e.mustApply("7", desired(rev))
	if e.appID("7") != app || e.g.Count("POST /v1/images/pull") != 0 {
		t.Fatal("never pulled, never replaced")
	}
}

// covers: A5 PV12 PV14 N3 S5 S6 G13 (test_network_change_recreates_containers_keeps_volume_and_keys)
func TestNetworkChangeRecreatesContainersKeepsVolumeAndKeys(t *testing.T) {
	e := newEnv(t)
	e.mustApply("7", desired(rev))
	old := e.state("7")
	oldApp := e.appID("7")
	policy := obj(t, `{"pool": "10.80.0.0/16", "allocation": "sequential"}`)
	e.mustApply("7", desired(rev, kv("network", policy)))
	st := e.state("7")
	if e.appID("7") == oldApp || !e.g.Exists("ccg-7-data") {
		t.Fatal("new container, same volume")
	}
	if st.APIKey != old.APIKey || st.AdminKey != old.AdminKey {
		t.Fatal("keys kept")
	}
	if st.AppIP != "10.80.0.3" {
		t.Fatal(st.AppIP)
	}
	a, _ := e.g.Client().Account(bg, "7")
	if s, _ := a.Network.FirstSubnet(); s.String() != "10.80.0.0/24" || e.g.Exists("ccg-7-uplink") {
		t.Fatal(s)
	}
	app := e.appID("7")
	e.mustApply("7", desired(rev, kv("network", policy)))
	if e.appID("7") != app {
		t.Fatal("same policy keeps the container")
	}
}

// covers: R7 PV13 (test_new_account_has_no_egress_container_or_uplink)
func TestNewAccountHasNoEgressContainerOrUplink(t *testing.T) {
	e := newEnv(t)
	e.mustApply("7", desired(rev))
	if e.g.Exists("ccg-7-egress") || e.g.Exists("ccg-7-uplink") {
		t.Fatal("no own egress")
	}
	if eg, _ := e.m.EgressStatus(bg, "7"); string(pyjson.MustMarshal(eg)) != `{"backend": "shared_xray", "ready": true}` {
		t.Fatal(eg)
	}
	if strings.Contains(string(pyjson.MustMarshal(e.status("7"))), "uplink_ip") {
		t.Fatal("public has no uplink_ip")
	}
}

// covers: PV15 S23 (test_runtime_left_by_an_own_egress_controller_drops_its_uplink_address)
func TestRuntimeLeftByAnOwnEgressControllerDropsItsUplinkAddress(t *testing.T) {
	e := newEnv(t)
	e.mustApply("7", desired(rev))
	st := e.state("7")
	st.Extra.Set("uplink_ip", "10.1.2.3")
	e.save("7", st)
	e.mustApply("7", desired(rev, kv("network", obj(t, `{"pool": "10.80.0.0/16", "allocation": "sequential"}`))))
	if e.state("7").Has("uplink_ip") {
		t.Fatal("dropped")
	}
}

// covers: A2 N1 V8 (test_invalid_network_does_not_interrupt_existing_runtime)
func TestInvalidNetworkDoesNotInterruptExistingRuntime(t *testing.T) {
	e := newEnv(t)
	e.mustApply("7", desired(rev))
	app := e.appID("7")
	if _, err := e.apply("7", desired(rev, kv("network", obj(t, `{"pool": "8.8.8.0/24"}`)))); !isKind(err, errs.BadRequest) {
		t.Fatal(err)
	}
	if e.appID("7") != app || e.g.ContainerStatus("ccg-7-app") != "running" {
		t.Fatal("untouched")
	}
}

// covers: PV11 BUG-22(kept) (test_exhausted_pool_does_not_interrupt_existing_runtime: 503 runtime_unavailable)
func TestExhaustedPoolDoesNotInterruptExistingRuntime(t *testing.T) {
	e := newEnv(t)
	e.mustApply("7", desired(rev))
	e.g.AddNetwork("external", "192.168.50.0/24", false, nil)
	app := e.appID("7")
	_, err := e.apply("7", desired(rev, kv("network", obj(t, `{"pool": "192.168.50.0/24"}`))))
	if status, code, named := errs.Answer(err, errs.Request); status != 503 || code != "runtime_unavailable" || named {
		t.Fatal(err)
	}
	if e.appID("7") != app || e.g.ContainerStatus("ccg-7-app") != "running" {
		t.Fatal("untouched")
	}
	if !strings.Contains(e.logs.String(), "network pool exhausted") {
		t.Fatal("the reason is logged")
	}
}

// covers: V1 K1 (test_guard_and_paths_reject_traversal)
func TestLocksAndPathsRejectTraversal(t *testing.T) {
	e := newEnv(t)
	for _, key := range []string{"../x", "..", draftKey + "/../../etc", "/etc", "0", ""} {
		if _, err := e.m.Lock(bg, key); !isKind(err, errs.BadRequest) {
			t.Fatal(key)
		}
		if _, err := e.m.State(key); !isKind(err, errs.BadRequest) {
			t.Fatal(key)
		}
		if _, err := e.m.Delete(bg, key, true, true); !isKind(err, errs.BadRequest) {
			t.Fatal(key)
		}
		if _, err := e.m.Apply(bg, key, desired(rev)); !isKind(err, errs.BadRequest) {
			t.Fatal(key)
		}
	}
}

// covers: PV15 S11 O2 (test_first_provision_records_created_at_and_image)
func TestFirstProvisionRecordsCreatedAtAndImage(t *testing.T) {
	e := newEnv(t)
	st, err := e.provision(draftKey, nil)
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$`).MatchString(st.CreatedAt) {
		t.Fatal(st.CreatedAt)
	}
	app := e.app(draftKey)
	if app.Labels[names.LabelAccount] != draftKey || app.Labels[names.LabelImage] != e.g.ImageID("app:test") ||
		len(app.Labels[names.LabelAuth]) != 64 {
		t.Fatalf("%v", app.Labels)
	}
	e.clock.Advance(time.Hour)
	again, _ := e.provision(draftKey, nil)
	if again.CreatedAt != st.CreatedAt || e.appID(draftKey) != app.ID {
		t.Fatal("kept")
	}
	if got := st.Keys(); strings.Join(got[:7], ",") != "api_key,admin_key,app_ip,gateway_ip,revision,status,created_at" {
		t.Fatal(got)
	}
}

func (e *env) newImage() string {
	id := e.g.AddImage("app:test", fakeguard.ImageSpec{})
	e.clock.Advance(time.Minute) // past the 30 s status cache
	return id
}

// covers: PV5 I4 (test_image_change_keeps_app_and_volume)
func TestImageChangeKeepsAppAndVolume(t *testing.T) {
	e := newEnv(t)
	st, _ := e.provision("7", nil)
	old := e.app("7")
	e.newImage()
	again, err := e.provision("7", nil)
	if err != nil || e.appID("7") != old.ID || e.app("7").Image != old.Image || again.APIKey != st.APIKey {
		t.Fatal(err)
	}
}

// covers: PV5 (test_container_without_image_label_uses_inspect_data)
func TestContainerWithoutImageLabelUsesInspectData(t *testing.T) {
	e := newEnv(t)
	st, _ := e.provision("7", nil)
	old := e.app("7")
	labels := map[string]string{names.LabelAccount: "7", names.LabelAuth: old.Labels[names.LabelAuth]}
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-7-app", Image: "app:test", User: "1000:1000", Labels: labels,
		Status: "created", Networks: map[string]string{"ccg-7-net": st.AppIP}, Volumes: map[string]string{"ccg-7-data": "/work"}})
	id := e.appID("7")
	if _, err := e.provision("7", nil); err != nil || e.appID("7") != id {
		t.Fatal("created by an older controller: kept", err)
	}
}

// covers: PV5 V9 (test_bad_new_image_keeps_running_container)
func TestBadNewImageKeepsRunningContainer(t *testing.T) {
	e := newEnv(t)
	e.provision("7", nil)
	app := e.appID("7")
	e.g.AddImage("app:test", fakeguard.ImageSpec{Env: []string{"ANTHROPIC_API_KEY=leak"}})
	if _, err := e.provision("7", nil); err != nil || e.appID("7") != app {
		t.Fatal(err)
	}
	// A new account on the bad image is refused (InvalidImage: 503 on PUT config, H10).
	_, err := e.apply("8", desired(rev))
	if !isKind(err, errs.InvalidImage) {
		t.Fatal(err)
	}
	if status, _, _ := errs.Answer(err, errs.Request); status != 503 || e.g.Exists("ccg-8-app") {
		t.Fatal(status)
	}
}

// covers: Y3 I4 A6 (test_image_change_only_reports_available_update)
func TestImageChangeOnlyReportsAvailableUpdate(t *testing.T) {
	e := newEnv(t)
	e.mustApply(draftKey, desired(rev))
	old := e.appID(draftKey)
	e.newImage()
	p, _ := e.m.Public(bg, draftKey)
	if p.Status != "ready" || !p.ImageUpdateAvailable || !p.TargetImageAvailable {
		t.Fatalf("%+v", p)
	}
	firewalls := e.g.Count("PUT /v1/accounts/{aid}/firewall")
	if e.mustApply(draftKey, desired(rev)).Status != "ready" || e.appID(draftKey) != old {
		t.Fatal("kept")
	}
	if e.g.Count("PUT /v1/accounts/{aid}/firewall") != firewalls {
		t.Fatal("A6: already ready at this revision: the gateway is not touched")
	}
}

// covers: M1 PV8 PV18 RB9 (test_controller_restart_keeps_old_image_and_new_accounts_use_new_default)
func TestControllerRestartKeepsOldImageAndNewAccountsUseNewDefault(t *testing.T) {
	e := newEnv(t)
	app1 := "ghcr.io/sub2api-devs/ccgateway-app@sha256:" + strings.Repeat("b", 64)
	app2 := "ghcr.io/sub2api-devs/ccgateway-app@sha256:" + strings.Repeat("c", 64)
	e.g.AddPullable(app1, fakeguard.ImageSpec{ID: "sha256:" + strings.Repeat("1", 64)})
	e.g.AddPullable(app2, fakeguard.ImageSpec{ID: "sha256:" + strings.Repeat("2", 64)})
	e.open(app1, "ccgateway-egress:test")
	e.mustApply("8", desired(rev))
	old := e.app("8")
	if e.g.Count("POST /v1/images/pull") != 1 || old.Image != "sha256:"+strings.Repeat("1", 64) {
		t.Fatal("pulled once")
	}
	e.mustApply("8", desired(rev))
	if e.g.Count("POST /v1/images/pull") != 1 {
		t.Fatal("present images are not pulled again")
	}
	// Core upgrade: the controller restarts with a new pinned digest.
	e.open(app2, "ccgateway-egress:test")
	if e.status("8") != "pending" {
		t.Fatal("persisted readiness is never trusted")
	}
	e.mustApply("8", desired(rev))
	if e.appID("8") != old.ID || e.g.Count("POST /v1/images/pull") != 1 {
		t.Fatal("the running account keeps its image")
	}
	e.mustApply("9", desired(rev))
	if e.app("9").Image != "sha256:"+strings.Repeat("2", 64) || e.g.Count("POST /v1/images/pull") != 2 {
		t.Fatal("new accounts use the new default")
	}
}

// covers: PV18 (test_pull_failure)
func TestPullFailure(t *testing.T) {
	e := newEnv(t)
	e.open("ghcr.io/x/app@sha256:"+strings.Repeat("e", 64), "ccgateway-egress:test")
	if _, err := e.apply("8", desired(rev)); !isKind(err, errs.ImagePullFailed) {
		t.Fatal(err)
	}
	if e.g.Exists("ccg-8-app") {
		t.Fatal("nothing created")
	}
}

// covers: PV17 (test_new_container_discards_in_place_environment)
func TestNewContainerDiscardsInPlaceEnvironment(t *testing.T) {
	e := newEnv(t)
	e.mustApply("7", desired(rev))
	found := false
	for _, j := range e.g.Jobs() {
		if len(j.Job.Argv) == 1 && j.Job.Argv[0] == scripts.PrepareVolume &&
			strings.Contains(j.Job.Argv[0], "rm -f /work/data/environment.json") {
			found = true
		}
	}
	if !found {
		t.Fatal("prepare job")
	}
	// The guard needs resolv.conf before the container (R11), the job before both.
	routes := e.g.Routes()
	idx := func(r string) int {
		last := -1
		for i, x := range routes {
			if x == r {
				last = i
			}
		}
		return last
	}
	first := func(r string) int {
		for i, x := range routes {
			if x == r {
				return i
			}
		}
		return -1
	}
	if !(idx("PUT /v1/accounts/{aid}/network") < idx("POST /v1/accounts/{aid}/jobs") &&
		idx("PUT /v1/accounts/{aid}/volume") < idx("POST /v1/accounts/{aid}/jobs") &&
		first("PUT /v1/accounts/{aid}/resolv") > idx("POST /v1/accounts/{aid}/jobs") && first("PUT /v1/accounts/{aid}/resolv") < idx("PUT /v1/accounts/{aid}/app")) {
		t.Fatal(routes)
	}
}

// covers: Y4 S11 (test_runtimes_lists_state_directories)
func TestRuntimesListsStateDirectories(t *testing.T) {
	e := newEnv(t)
	e.mustApply("3", desired(rev))
	e.provision(draftKey, nil)
	st := e.state(draftKey)
	st.Status = store.StatusBlocked
	e.save(draftKey, st)
	legacy := filepath.Join(e.dir, otherDraft)
	os.Mkdir(legacy, 0o700)
	os.WriteFile(filepath.Join(legacy, "state.json"), []byte(`{"status": "ready", "revision": "`+rev+`"}`), 0o600)
	stamp := time.Unix(1700000000, 0)
	os.Chtimes(legacy, stamp, stamp)
	os.Mkdir(filepath.Join(e.dir, "not-a-key"), 0o700)
	os.WriteFile(filepath.Join(e.dir, "12"), []byte("a file, not a runtime"), 0o600)
	list, err := e.m.Runtimes(bg)
	if err != nil {
		t.Fatal(err)
	}
	var keys []string
	by := map[string]contract.RuntimeRow{}
	for _, r := range list.Runtimes {
		keys = append(keys, r.Key)
		by[r.Key] = r
	}
	if strings.Join(keys, ",") != "3,"+draftKey+","+otherDraft {
		t.Fatal(keys)
	}
	if by["3"].Status != "ready" || by[draftKey].Status != "blocked" || by[otherDraft].Status != "pending" ||
		by[otherDraft].CreatedAt != "2023-11-14T22:13:20Z" {
		t.Fatalf("%+v", by)
	}
}

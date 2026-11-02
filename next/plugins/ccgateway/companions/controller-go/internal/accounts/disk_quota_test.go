package accounts

import (
	"bytes"
	"strconv"
	"testing"

	"ccgateway/controller/internal/cliprofile"
	"ccgateway/controller/internal/config"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/hoststate"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/scripts"
	"ccgateway/controller/internal/store"
)

func lookupWith(extra map[string]string) func(string) (string, bool) {
	base := map[string]string{"CCG_CONTROLLER_KEY": "k0123456789012345678901234567890123", "CCG_RUNTIME_ROOT": "/data",
		"CCG_APP_IMAGE": "app:test", "CCG_EGRESS_IMAGE": "egress:test", "CCG_GUARD_URL": "http://172.29.255.1:8790",
		"CCG_GUARD_TOKEN": fakeguard.Token}
	for k, v := range extra {
		base[k] = v
	}
	return func(k string) (string, bool) { v, ok := base[k]; return v, ok }
}

// covers: V21 E5 (test_invalid_disk_defaults_are_rejected_before_state_is_opened)
func TestInvalidDiskDefaultsAreRejected(t *testing.T) {
	for _, v := range []string{"0", "-1", "1.5", "010", "1025", "10g", ""} {
		if _, err := config.FromEnv(lookupWith(map[string]string{"CCG_ACCOUNT_DISK_GIB": v}), ""); err == nil {
			t.Fatal(v)
		}
	}
	c, err := config.FromEnv(lookupWith(nil), "")
	if err != nil || c.AccountDiskBytes != 10<<30 {
		t.Fatal(err)
	}
}

// covers: V22 E5 (test_invalid_quota_requirement_is_rejected)
func TestInvalidQuotaRequirementIsRejected(t *testing.T) {
	for _, v := range []string{"2", "yes", "true", ""} {
		if _, err := config.FromEnv(lookupWith(map[string]string{"CCG_ACCOUNT_DISK_QUOTA_REQUIRED": v}), ""); err == nil {
			t.Fatal(v)
		}
	}
}

// covers: PV9 PV10 PV16 O3 O5 O7 (test_new_account_uses_a_hard_volume_quota_and_passes_the_verified_limit)
func TestNewAccountUsesAHardVolumeQuota(t *testing.T) {
	e := newEnv(t)
	st, err := e.provision("7", nil)
	if err != nil {
		t.Fatal(err)
	}
	limit := strconv.FormatInt(10<<30, 10)
	vol := e.volume("7")
	if vol.Options["size"] != limit || vol.Labels[names.LabelDiskQuota] != limit || vol.Labels[names.LabelAccount] != "7" {
		t.Fatalf("%+v", vol)
	}
	if dq, _ := st.DiskQuota.Get(); dq != (store.DiskQuota{LimitBytes: 10 << 30, Status: store.QuotaEnforced}) {
		t.Fatalf("%+v", dq)
	}
	if e.appEnv("7")["CCG_ACCOUNT_DISK_QUOTA_BYTES"] != limit {
		t.Fatal("quota variable")
	}
	jobs := e.g.Jobs()
	// The image's packaged CLI and its probe come first.
	if len(jobs) != 4 || jobs[0].Job.Argv[1] != cliprofile.PackagedScript || jobs[1].Job.Argv[1] != cliprofile.ProbeScript {
		t.Fatalf("%+v", jobs)
	}
	quota, prepare := jobs[2].Job, jobs[3].Job
	if quota.User != "1000:1000" || quota.Volume != "ro" || len(quota.Caps) != 0 || quota.Argv[1] != scripts.DiskQuota(limit) {
		t.Fatalf("%+v", quota)
	}
	if prepare.User != "0" || prepare.Volume != "rw" || len(prepare.Caps) != 2 || prepare.Caps[0] != "CHOWN" ||
		prepare.Caps[1] != "DAC_OVERRIDE" || prepare.Argv[0] != scripts.PrepareVolume {
		t.Fatalf("D5: CHOWN and DAC_OVERRIDE only: %+v", prepare)
	}
	if body := e.g.CallsTo("PUT /v1/accounts/{aid}/app")[0].Body; bytes.Contains(body, []byte("memory_bytes")) ||
		bytes.Contains(body, []byte("nano_cpus")) {
		t.Fatal("the guard's defaults: 1 GiB, 2 CPUs")
	}
	if e.quota.Get() != hoststate.QuotaAvailable {
		t.Fatal(e.quota.Get())
	}
}

// covers: PV16 (test_new_account_container_carries_the_telemetry_switches)
func TestNewAccountContainerCarriesTheTelemetrySwitches(t *testing.T) {
	e := newEnv(t)
	if _, err := e.provision("7", nil); err != nil {
		t.Fatal(err)
	}
	env := e.appEnv("7")
	for _, kv := range scripts.Telemetry {
		if env[kv[0]] != kv[1] {
			t.Fatal(kv)
		}
	}
	for _, k := range []string{"CLAUDE_CODE_DISABLE_WEB_FETCH", "CLAUDE_CODE_DISABLE_ARTIFACT", "ENABLE_CLAUDEAI_MCP_SERVERS",
		"CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL"} {
		if _, ok := env[k]; ok {
			t.Fatal(k)
		}
	}
	st := e.state("7")
	if env["CCG_API_KEY"] != st.APIKey || env["CCG_ADMIN_KEY"] != st.AdminKey || env["CCG_EXTERNAL_EGRESS"] != "1" {
		t.Fatal("keys")
	}
}

func (e *env) volume(aid string) *guardapi.Volume {
	e.t.Helper()
	a, err := e.g.Client().Account(bg, aid)
	if err != nil || a.Volume == nil {
		e.t.Fatal("volume", err)
	}
	return a.Volume
}

// covers: PV9 R1 (test_unsupported_storage_creates_an_unbounded_volume_and_reports_it)
func TestUnsupportedStorageCreatesAnUnboundedVolume(t *testing.T) {
	e := newEnv(t)
	e.g.SetQuotaSupported(false)
	st, err := e.provision("7", nil)
	if err != nil {
		t.Fatal(err)
	}
	vol := e.volume("7")
	if _, ok := vol.Options["size"]; ok || vol.Labels[names.LabelDiskQuota] != "" {
		t.Fatalf("%+v", vol)
	}
	if dq, _ := st.DiskQuota.Get(); dq != (store.DiskQuota{Status: store.QuotaUnbounded}) {
		t.Fatalf("%+v", dq)
	}
	if _, ok := e.appEnv("7")["CCG_ACCOUNT_DISK_QUOTA_BYTES"]; ok || e.quota.Get() != hoststate.QuotaUnavailable {
		t.Fatal("reported unavailable")
	}
	// The unbounded volume is kept as it is on the next configuration.
	st, err = e.provision("7", apiKeyAuth())
	if dq, _ := st.DiskQuota.Get(); err != nil || dq.Status != store.QuotaUnbounded {
		t.Fatal(err)
	}
}

// covers: PV9 V22 (test_required_quota_never_creates_an_unlimited_fallback)
func TestRequiredQuotaNeverCreatesAnUnlimitedFallback(t *testing.T) {
	e := newEnv(t)
	e.cfg.RequireDiskQuota = true
	e.open("app:test", "ccgateway-egress:test")
	e.g.SetQuotaSupported(false)
	_, err := e.provision("7", nil)
	if !isKind(err, errs.DiskQuotaUnavailable) {
		t.Fatal(err)
	}
	if e.g.Exists("ccg-7-app") || e.g.Exists("ccg-7-data") || e.g.Exists("ccg-7-net") || e.quota.Get() != hoststate.QuotaUnavailable {
		t.Fatal("nothing created")
	}
}

// covers: PV10 PV2 (test_failed_mount_verification_keeps_the_working_runtime)
func TestFailedMountVerificationKeepsTheWorkingRuntime(t *testing.T) {
	e := newEnv(t)
	if _, err := e.provision("7", nil); err != nil {
		t.Fatal(err)
	}
	old := e.appID("7")
	before, _ := e.st.StateBytes("7")
	e.g.OnJob(func(aid string, job guardapi.Job) (int, []byte) {
		if job.Volume == guardapi.VolumeRO {
			return 42, nil
		}
		return e.defaultJob(aid, job)
	})
	if _, err := e.provision("7", apiKeyAuth()); !isKind(err, errs.DiskQuotaUnavailable) {
		t.Fatal(err)
	}
	after, _ := e.st.StateBytes("7")
	if e.appID("7") != old || !bytes.Equal(before, after) || !e.g.Exists("ccg-7-data") {
		t.Fatal("validated before anything is replaced")
	}
}

// covers: PV9 (test_default_changes_do_not_resize_existing_data)
func TestDefaultChangesDoNotResizeExistingData(t *testing.T) {
	e := newEnv(t)
	if _, err := e.provision("7", nil); err != nil {
		t.Fatal(err)
	}
	e.m.cfg.AccountDiskBytes = 20 << 30
	if _, err := e.provision("8", nil); err != nil {
		t.Fatal(err)
	}
	a, _ := e.m.accountVolume(bg, "7", false)
	b, _ := e.m.accountVolume(bg, "8", false)
	if a != 10<<30 || b != 20<<30 {
		t.Fatal(a, b)
	}
}

// covers: PV8 PV9 S13 (test_legacy_data_is_preserved_and_not_claimed_to_have_a_quota)
func TestLegacyDataIsPreservedAndNotClaimedToHaveAQuota(t *testing.T) {
	e := newEnv(t)
	if _, err := e.provision("7", nil); err != nil {
		t.Fatal(err)
	}
	e.g.AddVolume("ccg-7-data", nil, map[string]string{names.LabelAccount: "7"})
	st := e.state("7")
	st.Pop("disk_quota")
	e.save("7", st)
	st, err := e.provision("7", apiKeyAuth())
	if err != nil {
		t.Fatal(err)
	}
	if dq, _ := st.DiskQuota.Get(); dq.Status != store.QuotaLegacyUnbounded || e.volume("7").Options["size"] != "" {
		t.Fatalf("%+v", dq)
	}
	if _, ok := e.appEnv("7")["CCG_ACCOUNT_DISK_QUOTA_BYTES"]; ok {
		t.Fatal("no quota claimed")
	}
}

// covers: PV9 V23 (test_unowned_or_inconsistent_volumes_cannot_be_adopted)
func TestUnownedOrInconsistentVolumesCannotBeAdopted(t *testing.T) {
	e := newEnv(t)
	e.g.AddVolume("ccg-7-data", nil, map[string]string{names.LabelAccount: "other"})
	if _, err := e.m.accountVolume(bg, "7", true); !isKind(err, errs.OwnershipMismatch) {
		t.Fatal(err)
	}
	e.g.AddVolume("ccg-7-data", map[string]string{"size": strconv.FormatInt(20<<30, 10)},
		map[string]string{names.LabelAccount: "7", names.LabelDiskQuota: strconv.FormatInt(10<<30, 10)})
	if _, err := e.m.accountVolume(bg, "7", true); !isKind(err, errs.DiskQuotaUnavailable) {
		t.Fatal(err)
	}
	if !e.g.Exists("ccg-7-data") {
		t.Fatal("never removed")
	}
}

// covers: PV8 PV9 (test_a_previously_enforced_volume_cannot_silently_become_legacy)
func TestAPreviouslyEnforcedVolumeCannotSilentlyBecomeLegacy(t *testing.T) {
	e := newEnv(t)
	if _, err := e.provision("7", nil); err != nil {
		t.Fatal(err)
	}
	old := e.appID("7")
	e.g.AddVolume("ccg-7-data", nil, map[string]string{names.LabelAccount: "7"})
	if _, err := e.provision("7", apiKeyAuth()); !isKind(err, errs.DiskQuotaUnavailable) {
		t.Fatal(err)
	}
	if e.appID("7") != old {
		t.Fatal("kept")
	}
}

// covers: PV8 PV9 (test_an_enforced_account_never_falls_back_to_an_unbounded_volume)
func TestAnEnforcedAccountNeverFallsBackToAnUnboundedVolume(t *testing.T) {
	e := newEnv(t)
	if err := e.st.EnsureAccountDir("7"); err != nil {
		t.Fatal(err)
	}
	st := store.NewAccountState("k", "salt", "", "", "2026-11-01T00:00:00Z")
	st.DiskQuota = store.Some(store.DiskQuota{LimitBytes: 10 << 30, Status: store.QuotaEnforced})
	e.save("7", st)
	e.g.SetQuotaSupported(false)
	if _, err := e.provision("7", apiKeyAuth()); !isKind(err, errs.DiskQuotaUnavailable) {
		t.Fatal(err)
	}
	if e.g.Exists("ccg-7-data") || e.g.Exists("ccg-7-app") {
		t.Fatal("no unbounded fallback")
	}
}

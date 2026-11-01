package accounts

import (
	"strings"
	"sync"
	"testing"

	"ccgateway/controller/internal/cliprofile"
	"ccgateway/controller/internal/containerfs"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/pyjson"
)

func profile(version, mode string) pyjson.Ordered {
	return pyjson.Ordered{kv("version", version), kv("request_mode", mode), kv("disable_auto_update", true)}
}

// prober answers the CLI probe job (PV19) for the packaged versions.
type prober struct {
	mu       sync.Mutex
	packaged map[string]bool
	versions []string // probed versions, in order
	fail     bool     // a probe is a test failure
	t        *testing.T
}

func (e *env) probe(versions ...string) *prober {
	p := &prober{packaged: map[string]bool{}, t: e.t}
	for _, v := range versions {
		p.packaged[v] = true
	}
	e.g.OnJob(func(aid string, job guardapi.Job) (int, []byte) {
		if len(job.Argv) < 4 || job.Argv[1] != cliprofile.ProbeScript {
			return 0, nil
		}
		p.mu.Lock()
		defer p.mu.Unlock()
		if p.fail {
			p.t.Error("the existing runtime must be reused: no probe")
		}
		v := job.Argv[2]
		p.versions = append(p.versions, v)
		if !p.packaged[v] {
			return 1, []byte("requested CLI version/mode is not packaged in this image")
		}
		out := pyjson.Ordered{kv("path", "/opt/ccgateway/cli/"+v+"/claude"), kv("version", v),
			kv("sha256", strings.Repeat("a", 64)), kv("patch", "ccgateway-v7-request-modes")}
		return 0, pyjson.MustMarshal(out)
	})
	return p
}

func (p *prober) forbid() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.fail = true
}

// covers: PV4 PV5 PV8 (test_retired_agent_mode_requires_explicit_activation_and_keeps_data)
func TestRetiredAgentModeRequiresExplicitActivationAndKeepsData(t *testing.T) {
	e := newEnv(t)
	e.probe("2.1.302")
	e.mustApply("21", desired(rev, kv("cli", profile("2.1.302", "direct"))))
	old := e.appID("21")
	st := e.state("21")
	cli := st.CLI.V.(pyjson.Ordered).Clone()
	cli.Set("request_mode", "native")
	st.CLI.V = cli
	e.save("21", st)
	e.newImage()
	if _, err := e.apply("21", desired(revB, kv("cli", profile("2.1.302", "build")))); !isKind(err, errs.InvalidCLIProfile) {
		t.Fatal(err)
	}
	if e.appID("21") != old || !e.g.Exists("ccg-21-data") {
		t.Fatal("kept")
	}
}

// covers: PV8 EV (test_new_authorization_runtime_uses_controller_default)
func TestNewAuthorizationRuntimeUsesControllerDefault(t *testing.T) {
	e := newEnv(t)
	e.cfg.DefaultCLIVersion = "2.1.304"
	e.open("app:test", "ccgateway-egress:test")
	p := e.probe("2.1.304")
	e.mustApply("22", desired(rev))
	if string(pyjson.MustMarshal(e.state("22").CLI.V)) != `{"version": "2.1.304", "request_mode": "build", "disable_auto_update": true}` {
		t.Fatal(e.state("22").CLI.V)
	}
	if len(p.versions) != 1 || p.versions[0] != "2.1.304" || e.appEnv("22")["CCG_REQUEST_MODE"] != "build" {
		t.Fatal(p.versions)
	}
	e.cfg.DefaultCLIVersion = "../bad"
	e.open("app:test", "ccgateway-egress:test")
	if _, err := e.apply("23", desired(rev)); !isKind(err, errs.BadRequest) {
		t.Fatal("invalid controller default CLI version")
	}
}

// covers: PV5 PV8 (test_new_default_does_not_upgrade_existing_302_container)
func TestNewDefaultDoesNotUpgradeExisting302Container(t *testing.T) {
	e := newEnv(t)
	p := e.probe("2.1.302", "2.1.304")
	e.mustApply("21", desired(rev, kv("cli", profile("2.1.302", "direct"))))
	old := e.appID("21")
	e.cfg.DefaultCLIVersion = "2.1.304"
	e.open("app:test", "ccgateway-egress:test")
	p.forbid()
	e.mustApply("21", desired(revB))
	if e.appID("21") != old || !pyjson.Equal(e.state("21").CLI.V, profile("2.1.302", "direct")) {
		t.Fatal("kept")
	}
}

// covers: PV16 PV19 PV5 PV8 (test_creation_passes_version_and_disables_updaters)
func TestCreationPassesVersionAndDisablesUpdaters(t *testing.T) {
	e := newEnv(t)
	p := e.probe("2.1.302")
	e.mustApply("21", desired(rev, kv("cli", profile("2.1.302", "direct"))))
	env := e.appEnv("21")
	want := map[string]string{"WORKER_CLI_PATH": "/opt/ccgateway/cli/2.1.302/claude", "WORKER_CLI_VERSION": "2.1.302",
		"CCG_CLI_PATCH": "ccgateway-v7-request-modes", "CCG_CLI_SHA256": strings.Repeat("a", 64), "CCG_REQUEST_MODE": "direct",
		"DISABLE_AUTOUPDATER": "1"}
	for k, v := range want {
		if env[k] != v {
			t.Fatal(k, env[k])
		}
	}
	job := e.g.Jobs()[0].Job // the probe precedes the quota check and the volume layout
	if job.User != "0" || job.Volume != "none" || len(job.Caps) != 0 || job.Entrypoint[0] != "node" {
		t.Fatalf("O7-③: %+v", job)
	}
	if !pyjson.Equal(e.state("21").CLI.V, profile("2.1.302", "direct")) || len(p.versions) != 1 {
		t.Fatal("state.cli")
	}
	old := e.app("21")
	e.mustApply("21", desired(rev, kv("cli", profile("2.1.302", "direct"))))
	if e.appID("21") != old.ID {
		t.Fatal("same profile: kept")
	}
	e.newImage()
	e.mustApply("21", desired(revB, kv("cli", profile("2.1.302", "build"))))
	if now := e.app("21"); now.ID != old.ID || now.Image != old.Image {
		t.Fatal("a mode change between direct and build keeps the container and its image")
	}
}

// covers: PV4 PV5 S16 W12 (test_active_runtime_version_does_not_recreate_account)
func TestActiveRuntimeVersionDoesNotRecreateAccount(t *testing.T) {
	e := newEnv(t)
	p := e.probe("2.1.302")
	e.mustApply("21", desired(rev, kv("cli", profile("2.1.302", "direct"))))
	old := e.app("21")
	identity, err := containerfs.Identity(old)
	if err != nil {
		t.Fatal(err)
	}
	st := e.state("21")
	st.ActiveRuntime.Set, st.ActiveRuntime.V = true, pyjson.Ordered{kv("version", "2.1.304"),
		kv("container_id", old.ID), kv("container_identity", identity)}
	e.save("21", st)
	p.forbid()
	e.mustApply("21", desired(revB, kv("cli", profile("2.1.304", "build"))))
	if e.appID("21") != old.ID {
		t.Fatal("reuses the activated runtime")
	}
	if _, err := e.apply("21", desired(revC, kv("cli", profile("2.1.305", "direct")))); !isKind(err, errs.InvalidCLIProfile) {
		t.Fatal(err)
	}
	if status, code, _ := errs.Answer(err409(e), errs.Request); status != 409 || code != "cli_profile_unavailable" || e.appID("21") != old.ID {
		t.Fatal(code)
	}
}

func err409(e *env) error {
	_, err := e.apply("21", desired(revC, kv("cli", profile("2.1.305", "direct"))))
	return err
}

// covers: V7 A2 (test_bad_profile_does_not_replace_container)
func TestBadProfileDoesNotReplaceContainer(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	old := e.appID("21")
	for _, cli := range []pyjson.Ordered{
		profile("../bad", "direct"),
		{kv("version", "2.1.302"), kv("request_mode", "direct"), kv("disable_auto_update", false)},
		profile("2.1.302", "other"),
		profile("2.1.302", "native"),
		{kv("version", "2.1.302"), kv("request_mode", "direct")},
	} {
		if _, err := e.apply("21", desired(rev, kv("cli", cli))); !isKind(err, errs.BadRequest) {
			t.Fatal(cli, err)
		}
		if e.appID("21") != old {
			t.Fatal("kept")
		}
	}
}

// covers: PV8 PV19 (test_missing_packaged_version_preserves_existing)
func TestMissingPackagedVersionPreservesExisting(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	old := e.appID("21")
	e.probe() // nothing packaged
	if _, err := e.apply("21", desired(revB, kv("cli", profile("2.1.302", "direct")))); !isKind(err, errs.InvalidCLIProfile) {
		t.Fatal(err)
	}
	if e.appID("21") != old || e.g.ContainerStatus("ccg-21-app") != "running" {
		t.Fatal("kept")
	}
}

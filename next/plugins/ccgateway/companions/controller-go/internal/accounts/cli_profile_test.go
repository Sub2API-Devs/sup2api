package accounts

import (
	"slices"
	"strings"
	"sync"
	"testing"

	"ccgateway/controller/internal/cliprofile"
	"ccgateway/controller/internal/containerfs"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

func profile(version, mode string) pyjson.Ordered {
	return pyjson.Ordered{kv("version", version), kv("request_mode", mode), kv("disable_auto_update", true)}
}

// prober answers the CLI jobs (PV19 and the packaged version) for the
// packaged versions, or per image for the images listed in images.
type prober struct {
	mu       sync.Mutex
	packaged map[string]bool
	images   map[string][]string // image ref or ID -> the versions it packages
	versions []string            // probed versions, in order
	fail     bool                // a probe is a test failure
	t        *testing.T
}

func (e *env) probe(versions ...string) *prober {
	p := &prober{packaged: map[string]bool{}, images: map[string][]string{}, t: e.t}
	for _, v := range versions {
		p.packaged[v] = true
	}
	e.g.OnJob(func(aid string, job guardapi.Job) (int, []byte) {
		if len(job.Argv) < 2 || job.Argv[1] != cliprofile.ProbeScript && job.Argv[1] != cliprofile.PackagedScript {
			return 0, nil
		}
		p.mu.Lock()
		defer p.mu.Unlock()
		if p.fail {
			p.t.Error("the existing runtime must be reused: no probe")
		}
		packaged, own := p.images[job.Image]
		if !own {
			for v := range p.packaged {
				packaged = append(packaged, v)
			}
		}
		if job.Argv[1] == cliprofile.PackagedScript {
			slices.Sort(packaged)
			return 0, pyjson.MustMarshal(strList(packaged))
		}
		v := job.Argv[2]
		p.versions = append(p.versions, v)
		if !slices.Contains(packaged, v) {
			return 1, []byte("requested CLI version/mode is not packaged in this image")
		}
		return 0, probeAnswer(v)
	})
	return p
}

// image says what image (a ref or an ID) packages.
func (p *prober) image(ref string, versions ...string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.images[ref] = versions
}

func strList(list []string) []any {
	out := make([]any, len(list))
	for i, s := range list {
		out[i] = s
	}
	return out
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

// covers: PV8 EV, 2026-11-02 cli-from-image-v1: a new runtime nobody names
// a CLI for runs the one its image packages.
func TestNewRuntimeRunsTheImagesCLI(t *testing.T) {
	e := newEnv(t)
	p := e.probe("2.1.304")
	e.mustApply("22", desired(rev))
	if string(pyjson.MustMarshal(e.state("22").CLI.V)) != `{"version": "2.1.304", "request_mode": "build", "disable_auto_update": true}` {
		t.Fatal(e.state("22").CLI.V)
	}
	if len(p.versions) != 1 || p.versions[0] != "2.1.304" || e.appEnv("22")["CCG_REQUEST_MODE"] != "build" ||
		e.appEnv("22")["WORKER_CLI_VERSION"] != "2.1.304" {
		t.Fatal(p.versions)
	}
	if ref, _ := e.state("22").RuntimeImage.Get(); ref != e.app("22").Image {
		t.Fatal("runtime image", ref)
	}
	p.packaged["2.1.312"] = true // two versions: which one is not the image's to say
	if _, err := e.apply("23", desired(rev)); !isKind(err, errs.InvalidCLIProfile) || e.g.Exists("ccg-23-app") {
		t.Fatal(err)
	}
}

// covers: PV5 PV8: a new target image (with another CLI) leaves the existing
// runtime alone, and a recreation keeps the CLI it runs.
func TestNewImageDoesNotUpgradeExistingRuntime(t *testing.T) {
	e := newEnv(t)
	p := e.probe("2.1.302")
	e.mustApply("21", desired(rev))
	first := e.app("21").Image
	e.newImage()
	p.image(first, "2.1.302")
	p.image("app:test", "2.1.304")
	e.mustApply("21", desired(revB))
	if e.app("21").Image != first || !pyjson.Equal(e.state("21").CLI.V, profile("2.1.302", "build")) {
		t.Fatal("kept")
	}
	// A credential change recreates it: same image, same CLI.
	if _, err := e.provision("21", apiKeyAuth()); err != nil {
		t.Fatal(err)
	}
	if e.app("21").Image != first || e.appEnv("21")["WORKER_CLI_VERSION"] != "2.1.302" ||
		!pyjson.Equal(e.state("21").CLI.V, profile("2.1.302", "build")) {
		t.Fatal("recreated from the image it runs", e.app("21").Image)
	}
	// A runtime created now runs the new image's CLI.
	e.mustApply("22", desired(rev))
	if e.app("22").Image == first || e.appEnv("22")["WORKER_CLI_VERSION"] != "2.1.304" {
		t.Fatal("new runtime")
	}
}

// covers: 2026-11-02: a recreation starts from the image the Worker and CLI
// were last updated from in place (RuntimeImage), not the container's own.
func TestRecreationUsesTheRuntimeImage(t *testing.T) {
	e := newEnv(t)
	p := e.probe("2.1.302")
	e.mustApply("21", desired(rev))
	first := e.app("21").Image
	second := e.newImage()
	p.image(first, "2.1.302")
	p.image(second, "2.1.304")
	p.image("app:test", "2.1.304")
	// What a paired in-place update leaves: the pair active in this
	// container, its image recorded.
	st := e.state("21")
	st.ActiveRuntime = store.Some[any](pyjson.Ordered{kv("version", "2.1.304"), kv("container_identity", identityOf(e.app("21")))})
	st.RuntimeImage = store.Some(second)
	e.save("21", st)
	if _, err := e.provision("21", apiKeyAuth()); err != nil {
		t.Fatal(err)
	}
	if e.app("21").Image != second || e.appEnv("21")["WORKER_CLI_VERSION"] != "2.1.304" ||
		!pyjson.Equal(e.state("21").CLI.V, profile("2.1.304", "build")) {
		t.Fatal("recreated from the runtime image", e.app("21").Image)
	}
	// The recorded image is gone: the next one packaging the CLI.
	st = e.state("21")
	st.RuntimeImage = store.Some("sha256:" + strings.Repeat("f", 64))
	e.save("21", st)
	if _, err := e.provision("21", nil); err != nil {
		t.Fatal(err)
	}
	if e.appEnv("21")["WORKER_CLI_VERSION"] != "2.1.304" {
		t.Fatal("fallback")
	}
}

// covers: PV8 S25 (2026-11-06: the container of a runtime updated in place
// is removed; the next configuration recreates it from RuntimeImage with the
// activated CLI the pair recorded in state.cli)
func TestRecreationAfterAPairWithoutItsContainer(t *testing.T) {
	e := newEnv(t)
	p := e.probe("2.1.302")
	e.mustApply("21", desired(rev))
	first := e.app("21").Image
	second := e.newImage()
	p.image(first, "2.1.302")
	p.image(second, "2.1.304")
	p.image("app:test", "2.1.304")
	// What a paired in-place update leaves (updates.activatedCLI).
	st := e.state("21")
	st.ActiveRuntime = store.Some[any](pyjson.Ordered{kv("version", "2.1.304"), kv("container_identity", identityOf(e.app("21")))})
	st.RuntimeImage = store.Some(second)
	st.CLI = store.Some[any](profile("2.1.304", "build"))
	e.save("21", st)
	e.g.RejectMountSource("21/resolv.conf", "hardlink")
	if _, err := e.apply("21", desired(revB)); err == nil || e.g.Exists("ccg-21-app") {
		t.Fatal("the replaced resolv.conf removes the container", err)
	}
	e.mustApply("21", desired(revB))
	if e.app("21").Image != second || e.appEnv("21")["WORKER_CLI_VERSION"] != "2.1.304" || e.status("21") != "ready" {
		t.Fatal("recreated from the pair's image with its CLI", e.app("21").Image)
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

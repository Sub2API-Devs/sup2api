package updates

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/scripts"
	"ccgateway/controller/internal/store"
)

const (
	cliVersion = "2.1.304"
	cliPatch   = "ccgateway-v12-feature-policy"
)

var (
	cliBinary = []byte("\x7fELFcli")
	prior     = []byte(`{"schema_version": 1, "manifest": "manifest.json", "version": "2.1.302", "request_mode": "build"}`)
)

func manifestFor(entry pyjson.Ordered) []byte {
	return pyjson.MustMarshal(pyjson.Ordered{{Key: "versions", Value: pyjson.Ordered{{Key: cliVersion, Value: entry}}}})
}

func goodEntry() pyjson.Ordered {
	return pyjson.Ordered{{Key: "path", Value: cliVersion + "/claude"}, {Key: "sha256", Value: sha(cliBinary)},
		{Key: "patch", Value: cliPatch}, {Key: "modes", Value: []any{"direct", "build"}}}
}

// newPairEnv is newEnv plus the release image trusted:release and the
// current pointer in the container.
func newPairEnv(t *testing.T) *env {
	e := newEnv(t)
	e.g.AddImage("trusted:release", fakeguard.ImageSpec{Files: map[string][]byte{
		CLIRoot + "/manifest.json":             manifestFor(goodEntry()),
		CLIRoot + "/" + cliVersion + "/claude": cliBinary,
		worker:                                 nw,
	}})
	e.g.PutFile(appName, ActivePointer, prior, 0o644)
	return e
}

func pairBody() pyjson.Ordered {
	return pyjson.Ordered{{Key: "image", Value: "trusted:release"}, {Key: "components", Value: []any{"worker", "cli"}},
		{Key: "cli_version", Value: cliVersion}}
}

func (e *env) pair() (pyjson.Ordered, error) {
	return e.u.UpdatePair(context.Background(), aid, pairBody())
}

func (e *env) pointer() pyjson.Ordered {
	o, err := pyjson.DecodeObject(e.file(ActivePointer))
	if err != nil {
		e.t.Fatal(err)
	}
	return o
}

// cliFiles are the files under CLIRoot other than the pointer.
func (e *env) cliFiles() []string {
	var out []string
	for _, p := range e.g.Files(appName) {
		if strings.HasPrefix(p, CLIRoot+"/") && p != ActivePointer {
			out = append(out, p)
		}
	}
	return out
}

// covers: P3 P4 P5 P6 P7 P8 S16 S36 S37 (the pair is switched in the same container; old CLI kept)
func TestPairSwitchRetainsContainerAndOldCLI(t *testing.T) {
	e := newPairEnv(t)
	id := e.appID()
	var health []string
	e.g.OnExec("app:"+aid, []string{"node", "-e", scripts.PairHealth}, func(argv []string, user string) (int, []byte) {
		health = append(append(health, argv[3:]...), "user="+user)
		return 0, nil
	})
	res, err := e.pair()
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, pyjson.Ordered{{Key: "status", Value: "updated"}, {Key: "sha256", Value: sha(nw)},
		{Key: "cli_version", Value: cliVersion}, {Key: "cli_patch", Value: cliPatch}, {Key: "cli_sha256", Value: sha(cliBinary)},
		{Key: "online", Value: true}})
	if e.appID() != id || e.w.restartCount() != 1 || !bytes.Equal(e.file(worker), nw) {
		t.Fatal(e.appID(), e.w.restartCount())
	}
	p := e.pointer()
	if v, _ := p.Get("version"); v != cliVersion || p.Has("maintenance_lease") {
		t.Fatal(p)
	}
	m, _ := p.Get("manifest")
	release := strings.TrimSuffix(m.(string), "/manifest.json")
	if !strings.HasPrefix(release, cliPatch+"-"+sha(cliBinary)[:12]+"-") {
		t.Fatal(release)
	}
	if !bytes.Equal(e.file(CLIRoot+"/"+release+"/claude"), cliBinary) {
		t.Fatal(e.cliFiles())
	}
	staged := goodEntry()
	staged.Set("path", "claude")
	if !bytes.Equal(e.file(CLIRoot+"/"+release+"/manifest.json"), manifestFor(staged)) {
		t.Fatal(string(e.file(CLIRoot + "/" + release + "/manifest.json")))
	}
	ar, _ := e.state().ActiveRuntime.Get()
	identity, _ := ar.(pyjson.Ordered).Get("container_identity")
	eq(t, ar, pyjson.Ordered{{Key: "version", Value: cliVersion}, {Key: "patch", Value: cliPatch},
		{Key: "sha256", Value: sha(cliBinary)}, {Key: "worker_sha256", Value: sha(nw)}, {Key: "container_id", Value: id},
		{Key: "container_identity", Value: identity}})
	cli, _ := e.state().CLI.Get()
	eq(t, cli, pyjson.Ordered{{Key: "version", Value: cliVersion}, {Key: "request_mode", Value: "build"},
		{Key: "disable_auto_update", Value: true}})
	eq(t, e.mvTargets(), []any{ActivePointer, worker, ActivePointer})
	if len(e.backups()) != 1 {
		t.Fatal(e.backups())
	}
	eq(t, health, []any{cliVersion, cliPatch, sha(cliBinary), string(pyjson.MustMarshal(strList(scripts.HealthRequired))), "user="})
}

// covers: P9 (an unhealthy pair: pointer, Worker and state rolled back)
func TestUnhealthyPairRollsBackBothFilesAndState(t *testing.T) {
	e := newPairEnv(t)
	e.unhealthy(worker, nw)
	res, err := e.pair()
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, pyjson.Ordered{{Key: "status", Value: "rolled_back"}, {Key: "reason", Value: "unhealthy"}, {Key: "online", Value: true}})
	if !bytes.Equal(e.file(ActivePointer), prior) || !bytes.Equal(e.file(worker), old) {
		t.Fatal(e.files())
	}
	if e.state().Has("active_runtime") || e.state().Has("cli") || e.w.restartCount() != 2 {
		t.Fatal(e.state().Keys(), e.w.restartCount())
	}
}

// covers: P7 (the saved CLI profile names the activated version, its other
// fields kept: a recreation runs that version from the pair's image)
func TestPairRecordsTheActivatedCLIVersion(t *testing.T) {
	e := newPairEnv(t)
	st := e.state()
	st.CLI = store.Some[any](pyjson.Ordered{{Key: "version", Value: "2.1.302"}, {Key: "request_mode", Value: "direct"},
		{Key: "disable_auto_update", Value: false}})
	if err := e.st.SaveState(aid, st); err != nil {
		t.Fatal(err)
	}
	if res, err := e.pair(); err != nil {
		t.Fatal(err)
	} else if s, _ := res.Get("status"); s != "updated" {
		t.Fatal(res)
	}
	cli, _ := e.state().CLI.Get()
	eq(t, cli, pyjson.Ordered{{Key: "version", Value: cliVersion}, {Key: "request_mode", Value: "direct"},
		{Key: "disable_auto_update", Value: false}})
}

// covers: P6 P9 (the Worker restarts but reports the wrong pair)
func TestFailedIdentityHealthRollsBackPair(t *testing.T) {
	e := newPairEnv(t)
	e.g.OnExec("app:"+aid, []string{"node", "-e", scripts.PairHealth}, fakeguard.ExecReply(1, ""))
	res, err := e.pair()
	if err != nil {
		t.Fatal(err)
	}
	if s, _ := res.Get("status"); s != "rolled_back" {
		t.Fatal(res)
	}
	if !bytes.Equal(e.file(ActivePointer), prior) {
		t.Fatal(string(e.file(ActivePointer)))
	}
}

// covers: P3 W6 (busy: nothing swapped or restarted, no backup rotated)
func TestPairBusyDoesNotSwapOrRestart(t *testing.T) {
	e := newPairEnv(t)
	e.g.SetProcesses(appName, []string{"1", "docker-init"}, []string{"7", "worker"}, []string{"9", "claude"})
	res, err := e.pair()
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, status("busy"))
	if len(e.mvTargets()) != 0 || e.w.restartCount() != 0 || len(e.backups()) != 0 || len(e.srv.actions()) != 0 {
		t.Fatal(e.mvTargets(), e.srv.actions())
	}
}

// covers: P4 (the staged CLI is checked for the required capabilities, as root)
func TestStagedCLIIsCheckedForRequiredCapabilities(t *testing.T) {
	e := newPairEnv(t)
	var argv []string
	var user string
	e.g.OnExec("app:"+aid, []string{"node", "-e", scripts.Info}, func(a []string, u string) (int, []byte) {
		argv, user = a, u
		return 0, nil
	})
	if _, err := e.pair(); err != nil {
		t.Fatal(err)
	}
	if user != "0" || len(argv) != 8 || argv[4] != cliVersion || argv[5] != cliPatch || argv[6] != sha(cliBinary) ||
		argv[7] != string(pyjson.MustMarshal(strList(scripts.Required))) || !strings.HasSuffix(argv[3], "/claude") {
		t.Fatal(argv, user)
	}
	if argv[7] != `["request_direct", "request_build", "build_attachment_sources_v2", "build_billing_sources_v1", "build_content_preservation_v1"]` {
		t.Fatal(argv[7])
	}
}

// covers: P4 BUG-8 (a CLI that fails verification leaves the current pair; the placed release is removed)
func TestCLIVerificationFailureLeavesCurrentPair(t *testing.T) {
	e := newPairEnv(t)
	e.g.OnExec("app:"+aid, []string{"node", "-e", scripts.Info}, fakeguard.ExecReply(1, "unsupported CLI"))
	_, err := e.pair()
	if err == nil || !strings.Contains(err.Error(), "staged CLI") || answer(err) != "503 runtime_unavailable" {
		t.Fatal(err)
	}
	if !bytes.Equal(e.file(ActivePointer), prior) || !bytes.Equal(e.file(worker), old) || e.w.restartCount() != 0 {
		t.Fatal(e.files())
	}
	if len(e.cliFiles()) != 0 || len(e.staged()) != 0 {
		t.Fatal(e.cliFiles(), e.staged())
	}
	if e.srv.resumes() != 1 {
		t.Fatal(e.srv.actions())
	}
}

// covers: P1 (no path, no single component, a string version)
func TestPairInputCannotChoosePathsOrPartialComponents(t *testing.T) {
	e := newPairEnv(t)
	withPath := pairBody()
	withPath.Set("path", "/tmp/worker")
	cliOnly := pairBody()
	cliOnly.Set("components", []any{"cli"})
	numeric := pairBody()
	numeric.Set("cli_version", 304)
	swapped := pairBody()
	swapped.Set("components", []any{"cli", "worker"})
	for _, body := range []any{withPath, cliOnly, numeric, swapped, nil, []any{}} {
		if _, err := e.u.UpdatePair(context.Background(), aid, body); answer(err) != "400 invalid_request" {
			t.Fatal(body, err)
		}
	}
	if len(e.h.ensured) != 0 {
		t.Fatal(e.h.ensured)
	}
}

// covers: P7 P8 (reactivation fails after resume: updated, never rolled back or restarted again)
func TestReactivationFailureAfterResumeNeverRollsBackOrRestarts(t *testing.T) {
	e := newPairEnv(t)
	e.h.reapplyErr = errors.New("container changed after resume")
	res, err := e.pair()
	if err != nil {
		t.Fatal(err)
	}
	if s, _ := res.Get("status"); s != "updated" {
		t.Fatal(res)
	}
	if o, _ := res.Get("online"); o != false {
		t.Fatal(res)
	}
	if e.w.restartCount() != 1 || !bytes.Equal(e.file(worker), nw) {
		t.Fatal(e.w.restartCount())
	}
	if v, _ := e.pointer().Get("version"); v != cliVersion {
		t.Fatal(e.pointer())
	}
}

// covers: P9 (a rollback that fails half way never resumes a mixed pair)
func TestIncompleteRollbackDoesNotResumeMixedPair(t *testing.T) {
	e := newPairEnv(t)
	e.unhealthy(worker, nw)
	// archive PUTs: claude, manifest, Worker, pointer, rollback pointer, then the restored Worker
	e.g.Fail("PUT /v1/accounts/{aid}/app/archive", fakeguard.Fault{Nth: 6, Status: 502, Code: "docker_error", Message: "disk unavailable"})
	_, err := e.pair()
	if err == nil || !strings.Contains(err.Error(), "disk unavailable") {
		t.Fatal(err)
	}
	if e.srv.resumes() != 0 {
		t.Fatal(e.srv.actions())
	}
	if _, ok := e.h.isOnline(); ok {
		t.Fatal("online")
	}
	if !e.pointer().Has("maintenance_lease") {
		t.Fatal(e.pointer())
	}
}

// covers: P9 S36 (the rollback stays paused across the restart until the old pair is healthy)
func TestRollbackStaysPausedAcrossRestartUntilHealthConfirmed(t *testing.T) {
	e := newPairEnv(t)
	e.unhealthy(worker, nw)
	checked := false
	e.w.onRestart = func(n int) error {
		if n == 2 {
			checked = true
			p := e.pointer()
			if !p.Has("maintenance_lease") || e.srv.resumes() != 0 {
				t.Errorf("rollback restart: pointer %v, actions %v", p, e.srv.actions())
			}
			if exp, _ := p.Get("maintenance_expires"); !pyjson.Equal(exp, e.clk.Now().Unix()+300) {
				t.Errorf("expires %v", exp)
			}
		}
		return nil
	}
	res, err := e.pair()
	if err != nil || !checked {
		t.Fatal(err, checked)
	}
	if s, _ := res.Get("status"); s != "rolled_back" {
		t.Fatal(res)
	}
	if !bytes.Equal(e.file(ActivePointer), prior) {
		t.Fatal(string(e.file(ActivePointer)))
	}
}

// covers: P9 (an unhealthy rollback stays paused)
func TestUnhealthyRollbackStaysPaused(t *testing.T) {
	e := newPairEnv(t)
	e.unhealthy(worker, nw, old)
	res, err := e.pair()
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, pyjson.Ordered{{Key: "status", Value: "rolled_back"}, {Key: "reason", Value: "rollback_unhealthy"}, {Key: "online", Value: false}})
	if e.srv.resumes() != 0 || !e.pointer().Has("maintenance_lease") {
		t.Fatal(e.srv.actions(), e.pointer())
	}
}

func (e *env) session() (*session, func()) {
	s, err := e.u.lock(context.Background(), aid)
	if err != nil {
		e.t.Fatal(err)
	}
	return s, s.release
}

func (e *env) legacyApp(snapshot string) {
	e.g.Client().AppExec(context.Background(), aid, []string{"rm", "-f", ActivePointer}, "0")
	e.replaceApp(worker, []string{}, []string{"CCG_REQUEST_MODE=native"})
	e.g.OnExec("app:"+aid, []string{"node", "-e", scripts.LegacySnapshot}, fakeguard.ExecReply(0, snapshot))
}

// covers: P10 S38 (an image without a pointer: a sealed snapshot of the legacy CLI)
func TestNativeLegacyWithoutManifestGetsSealedRollbackSnapshot(t *testing.T) {
	e := newPairEnv(t)
	e.legacyApp(`{"version":"2.1.302","path":"2.1.302/claude","sha256":"` + strings.Repeat("b", 64) +
		`","patch":"ccgateway-v11-native-build-parameters","modes":["direct","build"]}`)
	var expected string
	e.g.OnExec("app:"+aid, []string{"node", "-e", scripts.LegacySnapshot}, func(argv []string, user string) (int, []byte) {
		expected = argv[3] + " user=" + user
		return 0, []byte(`{"version":"2.1.302","path":"2.1.302/claude","sha256":"` + strings.Repeat("b", 64) +
			`","patch":"ccgateway-v11-native-build-parameters","modes":["direct","build"]}`)
	})
	s, done := e.session()
	defer done()
	r, err := s.runningWorker()
	if err != nil {
		t.Fatal(err)
	}
	raw, name, err := s.priorSelection(r.app)
	if err != nil {
		t.Fatal(err)
	}
	if expected != `{"path": "/usr/local/bin/claude", "version": "", "sha256": "", "patch": ""} user=0` {
		t.Fatal(expected)
	}
	if !strings.HasPrefix(name, "legacy-snapshot-bbbbbbbbbbbb-") || !strings.HasSuffix(name, ".json") || len(name) != len("legacy-snapshot-bbbbbbbbbbbb-")+12+5 {
		t.Fatal(name)
	}
	if string(raw) != `{"schema_version": 1, "manifest": "`+name+`", "version": "2.1.302", "request_mode": "build", "maintenance_only": true}` {
		t.Fatal(string(raw))
	}
	snap, err := pyjson.DecodeObject(e.file(CLIRoot + "/" + name))
	if err != nil {
		t.Fatal(err)
	}
	vs, _ := snap.Get("versions")
	entry, _ := vs.(pyjson.Ordered).Get("2.1.302")
	if s, _ := entry.(pyjson.Ordered).Get("sha256"); s != strings.Repeat("b", 64) {
		t.Fatal(snap)
	}
	if e.file(ActivePointer) != nil || !bytes.Equal(e.file(worker), old) {
		t.Fatal(e.files())
	}
}

// covers: P10 (a legacy CLI without both request modes is not assumed migratable)
func TestLegacyWithoutObservedRequestModesIsNotAssumedMigratable(t *testing.T) {
	e := newPairEnv(t)
	e.legacyApp(`{"version":"2.1.302","path":"2.1.302/claude","sha256":"` + strings.Repeat("b", 64) +
		`","patch":"ccgateway-native-only","modes":[]}`)
	s, done := e.session()
	defer done()
	r, err := s.runningWorker()
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := s.priorSelection(r.app); err == nil || !strings.Contains(err.Error(), "runtime identity") {
		t.Fatal(err)
	}
	if e.file(ActivePointer) != nil || len(e.cliFiles()) != 0 || !bytes.Equal(e.file(worker), old) {
		t.Fatal(e.files())
	}
}

// covers: P2 V25 (release_entry refuses escapes and unverified entries)
func TestReleaseEntryRejectsEscapeOrUnverifiedEntry(t *testing.T) {
	base := pyjson.Ordered{{Key: "path", Value: "2.1.304/claude"}, {Key: "patch", Value: cliPatch},
		{Key: "sha256", Value: strings.Repeat("a", 64)}, {Key: "modes", Value: []any{"direct", "build"}}}
	wrap := func(item any) pyjson.Ordered {
		return pyjson.Ordered{{Key: "versions", Value: pyjson.Ordered{{Key: "2.1.304", Value: item}}}}
	}
	got, err := releaseEntry(wrap(base), "2.1.304")
	if err != nil {
		t.Fatal(err)
	}
	eq(t, got, base)
	for _, c := range []struct {
		field string
		value any
	}{{"path", "../claude"}, {"path", "/tmp/claude"}, {"path", `x\claude`}, {"path", "a//b"}, {"path", "./claude"}, {"path", ""},
		{"patch", "official"}, {"sha256", strings.Repeat("a", 63)}, {"modes", []any{"build"}}, {"modes", "direct build"}, {"path", 5}} {
		item := base.Clone()
		item.Set(c.field, c.value)
		if _, err := releaseEntry(wrap(item), "2.1.304"); err == nil {
			t.Fatal(c)
		}
	}
	for _, m := range []any{nil, []any{}, pyjson.Ordered{}, wrap("x")} {
		if _, err := releaseEntry(m, "2.1.304"); err == nil {
			t.Fatal(m)
		}
	}
	if _, err := releaseEntry(wrap(base), "2.1"); err == nil {
		t.Fatal("bad version accepted")
	}
}

// covers: P3 BUG-7 (fixed: an invalid lease reopens admission without a lease, best effort)
func TestInvalidLeaseResumesWithoutLease(t *testing.T) {
	e := newPairEnv(t)
	e.srv.lease = "short"
	_, err := e.pair()
	if err == nil || !strings.Contains(err.Error(), "invalid maintenance lease") || answer(err) != "503 runtime_unavailable" {
		t.Fatal(err)
	}
	eq(t, e.srv.actions(), []any{"pause", "resume"})
	if !bytes.Equal(e.file(ActivePointer), prior) || !bytes.Equal(e.file(worker), old) || len(e.cliFiles()) != 0 {
		t.Fatal(e.files())
	}
	if !strings.Contains(e.log.String(), "invalid maintenance lease") {
		t.Fatal(e.log.String())
	}
}

// covers: P5 BUG-8 (fixed: validate answers busy: the placed release and staged Worker are removed)
func TestValidateBusyRemovesPlacedRelease(t *testing.T) {
	e := newPairEnv(t)
	e.srv.busy["validate"] = true
	res, err := e.pair()
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, status("busy"))
	eq(t, e.files(), map[string]any{ActivePointer: string(prior), worker: string(old)})
	if e.w.restartCount() != 0 || e.srv.resumes() != 1 {
		t.Fatal(e.srv.actions())
	}
	rmdir := false
	for _, x := range e.execs() {
		rmdir = rmdir || (x.Argv[0] == "rmdir" && strings.HasPrefix(x.Argv[1], CLIRoot+"/"+cliPatch+"-") && x.User == "0")
	}
	if !rmdir {
		t.Fatal(e.execs())
	}
}

// covers: P3 P10 BUG-8 (fixed: a busy answer removes the snapshot written for the legacy CLI)
func TestBusyBeginRemovesLegacySnapshot(t *testing.T) {
	e := newPairEnv(t)
	e.legacyApp(`{"version":"2.1.302","path":"2.1.302/claude","sha256":"` + strings.Repeat("b", 64) +
		`","patch":"ccgateway-v11","modes":["direct","build"]}`)
	e.g.SetProcesses(appName, []string{"1", "docker-init"}, []string{"7", "worker"}, []string{"9", "claude"})
	res, err := e.pair()
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, status("busy"))
	eq(t, e.files(), map[string]any{worker: string(old)})
	// The pause answering busy cleans up the same way.
	e.g.SetProcesses(appName, []string{"1", "docker-init"}, []string{"7", "worker"})
	e.srv.busy["pause"] = true
	if res, err = e.pair(); err != nil {
		t.Fatal(err)
	}
	eq(t, res, status("busy"))
	eq(t, e.files(), map[string]any{worker: string(old)})
}

// covers: P5 W12 BUG-8 (fixed: the staged pointer is removed when the container changes before the swap)
func TestPointerDiscardedWhenContainerChangesBeforeSwap(t *testing.T) {
	e := newPairEnv(t)
	e.srv.onValidate = func() { e.h.setRelabel(true) }
	_, err := e.pair()
	if !errs.Is(err, errs.ContainerChanged) {
		t.Fatal(err)
	}
	eq(t, e.files(), map[string]any{ActivePointer: string(prior), worker: string(old)})
	if e.w.restartCount() != 0 || e.srv.resumes() != 1 {
		t.Fatal(e.srv.actions())
	}
	if r, _ := e.h.isOnline(); r != rev {
		t.Fatal("went offline before the switch")
	}
}

// covers: P8 BUG-14 (kept: a committed pair is resumed twice, by commit and by the finally)
func TestCommitResumesTwice(t *testing.T) {
	e := newPairEnv(t)
	if _, err := e.pair(); err != nil {
		t.Fatal(err)
	}
	lease := strings.Repeat("a", 48)
	eq(t, e.srv.actions(), []any{"pause", "validate:" + lease, "resume:" + lease, "resume:" + lease})
}

// covers: P2 BUG-6 (kept: package failures are 503 runtime_unavailable, not invalid_image)
func TestPackageFailuresAreUnnamed(t *testing.T) {
	escape := goodEntry()
	escape.Set("path", "../claude")
	wrongSum := goodEntry()
	wrongSum.Set("sha256", strings.Repeat("c", 64))
	for name, files := range map[string]map[string][]byte{
		"manifest escape": {CLIRoot + "/manifest.json": manifestFor(escape)},
		"checksum":        {CLIRoot + "/manifest.json": manifestFor(wrongSum), CLIRoot + "/" + cliVersion + "/claude": cliBinary, worker: nw},
		"worker not ELF":  {CLIRoot + "/manifest.json": manifestFor(goodEntry()), CLIRoot + "/" + cliVersion + "/claude": cliBinary, worker: []byte("#!/bin/sh")},
		"no manifest":     {worker: nw},
		"not JSON":        {CLIRoot + "/manifest.json": []byte("{")},
	} {
		e := newPairEnv(t)
		e.g.AddImage("bad:release", fakeguard.ImageSpec{Files: files})
		body := pairBody()
		body.Set("image", "bad:release")
		_, err := e.u.UpdatePair(context.Background(), aid, body)
		if _, _, known := errs.Answer(err, errs.Worker); err == nil || known || answer(err) != "503 runtime_unavailable" {
			t.Fatal(name, err)
		}
		if len(e.execs()) != 0 {
			t.Fatal(name, "touched the container")
		}
	}
}

// covers: P3 BUG-7 (not running, an untrusted CLI root, and a runtime without state)
func TestPairBeginRefusals(t *testing.T) {
	e := newPairEnv(t)
	e.g.StopContainer(appName)
	res, err := e.pair()
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, status("not_running"))

	e = newPairEnv(t)
	e.g.OnExec("app:"+aid, []string{"node", "-e", scripts.Trust}, fakeguard.ExecReply(1, "untrusted CLI root"))
	if _, err := e.pair(); answer(err) != "409 unsupported_container" {
		t.Fatal(err)
	}

	e = newPairEnv(t)
	if err := e.st.Remove(aid + "/state.json"); err != nil {
		t.Fatal(err)
	}
	if _, err := e.pair(); err == nil || answer(err) != "503 runtime_unavailable" {
		t.Fatal(err)
	}
	if len(e.srv.actions()) != 0 || !bytes.Equal(e.file(worker), old) {
		t.Fatal(e.srv.actions())
	}
}

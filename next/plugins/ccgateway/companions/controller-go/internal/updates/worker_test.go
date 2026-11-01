package updates

import (
	"archive/tar"
	"bytes"
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/scripts"
)

func answer(err error) string {
	status, code, _ := errs.Answer(err, errs.Worker)
	return fmt.Sprintf("%d %s", status, code)
}

// covers: W1 W2 W3 W5 W6 W7 W8 W9 W11 W13 S27 S35 (updated in place, privileged steps as root, rules back after the restart)
func TestUpdatedNewImagePath(t *testing.T) {
	e := newEnv(t)
	id := e.appID()
	res, err := e.update("app:new")
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, pyjson.Ordered{{Key: "status", Value: "updated"}, {Key: "previous_sha256", Value: sha(old)},
		{Key: "sha256", Value: sha(nw)}, {Key: "path", Value: worker}, {Key: "online", Value: true}})
	if !bytes.Equal(e.file(worker), nw) || e.w.restartCount() != 1 || len(e.staged()) != 0 || e.appID() != id {
		t.Fatal(e.files(), e.w.restartCount(), e.appID())
	}
	mode, uid, gid, _ := e.g.FileMode(appName, worker)
	if mode != 0o755 || uid != 0 || gid != 0 {
		t.Fatal(mode, uid, gid)
	}
	users := map[string]string{}
	for _, x := range e.execs() {
		users[x.Argv[0]] = x.User
	}
	if users["sha256sum"] != "0" || users["mv"] != "0" || users["chmod"] != "0" || users["node"] != "" {
		t.Fatal(users)
	}
	// The rules go back right after the restart; readiness at the old revision after reactivation.
	eq(t, e.h.eventList(), []any{"firewall 10.77.0.2", "reapply"})
	if r, _ := e.h.isOnline(); r != rev {
		t.Fatal(r)
	}
	list := e.backups()
	if len(list) != 1 || !strings.HasSuffix(list[0], "-"+sha(old)[:12]) || list[0][:16] != "20261101T120000Z" {
		t.Fatal(list)
	}
	data, _ := e.st.ReadFile(aid + "/worker-backups/" + list[0])
	if !bytes.Equal(data, old) {
		t.Fatal("backup content")
	}
	// The only image read is the Worker program, through images/file; nothing is created.
	if e.g.Count("PUT /v1/accounts/{aid}/app") != 0 || e.g.Count("GET /v1/images/file") != 1 {
		t.Fatal(e.g.Routes())
	}
}

// covers: W3 (the older docker-entrypoint.sh ccgateway command)
func TestUpdatedLegacyCcgatewayPath(t *testing.T) {
	e := newEnv(t)
	e.replaceApp("docker-entrypoint.sh", []string{"ccgateway"}, nil)
	e.g.PutFile(appName, legacy, old, 0o755)
	e.g.Client().AppExec(context.Background(), aid, []string{"rm", "-f", worker}, "0")
	e.g.SetProcesses(appName, []string{"1", "docker-init"}, []string{"7", "ccgateway"})
	res, err := e.update("app:new")
	if err != nil {
		t.Fatal(err)
	}
	if s, _ := res.Get("status"); s != "updated" {
		t.Fatal(res)
	}
	if p, _ := res.Get("path"); p != legacy {
		t.Fatal(res)
	}
	if !bytes.Equal(e.file(legacy), nw) || e.file(worker) != nil || e.w.restartCount() != 1 {
		t.Fatal(e.files())
	}
}

// covers: W4
func TestUnchanged(t *testing.T) {
	e := newEnv(t)
	res, err := e.update("app:test")
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, pyjson.Ordered{{Key: "status", Value: "unchanged"}, {Key: "sha256", Value: sha(old)}})
	if e.w.restartCount() != 0 || len(e.backups()) != 0 {
		t.Fatal("changed")
	}
	if r, _ := e.h.isOnline(); r != rev {
		t.Fatal(r)
	}
}

// covers: W5 W6 (busy for the whole wait: nothing changes, no backup rotated)
func TestBusyAllAlongChangesNothing(t *testing.T) {
	e := newEnv(t)
	e.g.SetProcesses(appName, []string{"1", "docker-init"}, []string{"7", "worker"}, []string{"9", "claude"})
	res, err := e.update("app:new")
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, status("busy"))
	if e.w.topCount() != 61 { // every 2 s for 120 s
		t.Fatal(e.w.topCount())
	}
	eq(t, e.files(), map[string]any{worker: string(old)})
	if e.w.restartCount() != 0 || len(e.backups()) != 0 {
		t.Fatal("changed")
	}
	if r, _ := e.h.isOnline(); r != rev {
		t.Fatal(r)
	}
}

// covers: W5
func TestWaitsUntilIdle(t *testing.T) {
	e := newEnv(t)
	e.g.SetProcesses(appName, []string{"1", "docker-init"}, []string{"7", "worker"}, []string{"9", "node"})
	e.w.onTop = func(n int) {
		if n == 3 {
			e.g.SetProcesses(appName, []string{"1", "docker-init"}, []string{"7", "worker"})
		}
	}
	res, err := e.update("app:new")
	if err != nil {
		t.Fatal(err)
	}
	if s, _ := res.Get("status"); s != "updated" || !bytes.Equal(e.file(worker), nw) {
		t.Fatal(res)
	}
}

// covers: W7 (a request started after staging: the staged file is discarded)
func TestBusyOnSecondCheckDiscardsStagedFile(t *testing.T) {
	e := newEnv(t)
	e.w.onTop = func(n int) {
		if n == 2 {
			e.g.SetProcesses(appName, []string{"1", "docker-init"}, []string{"7", "worker"}, []string{"9", "claude"})
		}
	}
	res, err := e.update("app:new")
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, status("busy"))
	if e.w.topCount() != 2 {
		t.Fatal(e.w.topCount())
	}
	eq(t, e.files(), map[string]any{worker: string(old)})
	rm := false
	for _, x := range e.execs() {
		rm = rm || (x.Argv[0] == "rm" && x.Argv[1] == "-f")
	}
	if !rm || e.w.restartCount() != 0 {
		t.Fatal(rm)
	}
	if r, _ := e.h.isOnline(); r != rev {
		t.Fatal(r)
	}
}

// covers: W2
func TestNotRunning(t *testing.T) {
	e := newEnv(t)
	e.g.StopContainer(appName)
	res, err := e.update("app:new")
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, status("not_running"))
	if len(e.execs()) != 0 || e.w.restartCount() != 0 {
		t.Fatal(e.execs())
	}
}

// covers: W2 BUG-10 (no container, and a same-name foreign container, are both 404 not_found: kept)
func TestNotFound(t *testing.T) {
	e := newEnv(t)
	_, err := e.u.UpdateWorker(context.Background(), "22", pyjson.Ordered{{Key: "image", Value: "app:new"}})
	if !errs.Is(err, errs.RuntimeNotFound) || answer(err) != "404 not_found" {
		t.Fatal(err)
	}
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-23-app", Image: "app:test", Labels: map[string]string{names.LabelAccount: "someone-else"}})
	_, err = e.u.UpdateWorker(context.Background(), "23", pyjson.Ordered{{Key: "image", Value: "app:new"}})
	if !errs.Is(err, errs.RuntimeNotFound) || answer(err) != "404 not_found" {
		t.Fatal(err)
	}
}

// covers: W3 (worker program elsewhere, other commands, a missing program)
func TestUnsupportedContainer(t *testing.T) {
	for _, c := range []struct {
		path string
		args []string
	}{{"/bin/sh", []string{"-c", "sleep 1"}}, {"/opt/bin/worker", []string{}}, {"docker-entrypoint.sh", []string{"./ccgateway"}}} {
		e := newEnv(t)
		e.replaceApp(c.path, c.args, nil)
		_, err := e.update("app:new")
		if !errs.Is(err, errs.UnsupportedContainer) || answer(err) != "409 unsupported_container" {
			t.Fatal(c.path, err)
		}
		if e.w.restartCount() != 0 {
			t.Fatal(c.path)
		}
	}
	e := newEnv(t)
	e.g.Client().AppExec(context.Background(), aid, []string{"rm", "-f", worker}, "0")
	_, err := e.update("app:new")
	if !errs.Is(err, errs.UnsupportedContainer) {
		t.Fatal(err)
	}
	eq(t, e.files(), map[string]any{})
	if e.w.restartCount() != 0 {
		t.Fatal("restarted")
	}
}

// covers: W6 (the backup must be a regular file)
func TestBackupMustBeARegularFile(t *testing.T) {
	e := newEnv(t)
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	tw.WriteHeader(&tar.Header{Name: "worker", Typeflag: tar.TypeSymlink, Linkname: "/elsewhere"})
	tw.Close()
	e.w.archiveOverride = buf.Bytes()
	_, err := e.update("app:new")
	if !errs.Is(err, errs.UnsupportedContainer) {
		t.Fatal(err)
	}
	eq(t, e.files(), map[string]any{worker: string(old)})
	if e.w.restartCount() != 0 {
		t.Fatal("restarted")
	}
}

// covers: W10 (an unhealthy new program is rolled back; readiness restored)
func TestRolledBackWhenUnhealthy(t *testing.T) {
	e := newEnv(t)
	e.unhealthy(worker, bad)
	res, err := e.update("app:bad")
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, pyjson.Ordered{{Key: "status", Value: "rolled_back"}, {Key: "reason", Value: "unhealthy"}, {Key: "online", Value: true}})
	eq(t, e.files(), map[string]any{worker: string(old)})
	if e.w.restartCount() != 2 {
		t.Fatal(e.w.restartCount())
	}
	if r, _ := e.h.isOnline(); r != rev {
		t.Fatal(r)
	}
}

// covers: W10 (the old program is unhealthy too: no activation)
func TestRollbackUnhealthy(t *testing.T) {
	e := newEnv(t)
	e.unhealthy(worker, bad, old)
	res, err := e.update("app:bad")
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, pyjson.Ordered{{Key: "status", Value: "rolled_back"}, {Key: "reason", Value: "rollback_unhealthy"}, {Key: "online", Value: false}})
	eq(t, e.files(), map[string]any{worker: string(old)})
	if _, ok := e.h.isOnline(); ok {
		t.Fatal("still online")
	}
	for _, ev := range e.h.eventList() {
		if ev == "reapply" {
			t.Fatal("activated")
		}
	}
}

// covers: W10 (the new program exits at once: the backup is written straight into the stopped container)
func TestRollbackIntoExitedContainer(t *testing.T) {
	e := newEnv(t)
	e.crashing(worker, crash)
	res, err := e.update("app:crash")
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, pyjson.Ordered{{Key: "status", Value: "rolled_back"}, {Key: "reason", Value: "unhealthy"}, {Key: "online", Value: true}})
	eq(t, e.files(), map[string]any{worker: string(old)})
	if e.g.ContainerStatus(appName) != "running" || e.w.restartCount() != 2 {
		t.Fatal(e.g.ContainerStatus(appName), e.w.restartCount())
	}
}

// covers: W8 (a failed restart keeps the old StartedAt: never reported healthy)
func TestFailedRestartIsNeverReportedHealthy(t *testing.T) {
	e := newEnv(t)
	e.w.onRestart = func(n int) error {
		if n == 1 {
			return errors.New("restart failed")
		}
		return nil
	}
	res, err := e.update("app:new")
	if err != nil {
		t.Fatal(err)
	}
	if s, _ := res.Get("status"); s != "rolled_back" {
		t.Fatal(res)
	}
	eq(t, e.files(), map[string]any{worker: string(old)})
}

// covers: W12 (the container changed before the replacement: nothing replaced)
func TestContainerChangedBeforeReplacement(t *testing.T) {
	e := newEnv(t)
	e.w.onTop = func(int) { e.h.setRelabel(true) }
	_, err := e.update("app:new")
	if !errs.Is(err, errs.ContainerChanged) || answer(err) != "503 container_changed" {
		t.Fatal(err)
	}
	eq(t, e.files(), map[string]any{worker: string(old)})
	if e.w.restartCount() != 0 {
		t.Fatal("restarted")
	}
	if r, _ := e.h.isOnline(); r != rev {
		t.Fatal(r)
	}
}

// covers: W12 (the container changed across the restart)
func TestContainerChangedAfterRestart(t *testing.T) {
	e := newEnv(t)
	e.w.afterRestart = func(int) { e.h.setRelabel(true) }
	_, err := e.update("app:new")
	if !errs.Is(err, errs.ContainerChanged) {
		t.Fatal(err)
	}
	if e.w.restartCount() != 1 || e.g.ContainerStatus(appName) == "" {
		t.Fatal(e.w.restartCount())
	}
	if _, ok := e.h.isOnline(); ok {
		t.Fatal("still online")
	}
}

// covers: W12 (another container under the same name)
func TestContainerReplacedByName(t *testing.T) {
	e := newEnv(t)
	e.w.onTop = func(n int) {
		if n == 1 {
			e.replaceApp(worker, []string{}, nil)
		}
	}
	_, err := e.update("app:new")
	if !errs.Is(err, errs.ContainerChanged) {
		t.Fatal(err)
	}
	if e.w.restartCount() != 0 || len(e.staged()) != 0 {
		t.Fatal(e.files())
	}
}

// covers: W11 (an activation failure only clears readiness; nothing is recreated)
func TestActivationFailureOnlyClearsReadiness(t *testing.T) {
	e := newEnv(t)
	e.h.reapplyErr = errors.New("nft failed")
	res, err := e.update("app:new")
	if err != nil {
		t.Fatal(err)
	}
	if s, _ := res.Get("status"); s != "updated" {
		t.Fatal(res)
	}
	if o, _ := res.Get("online"); o != false {
		t.Fatal(res)
	}
	if _, ok := e.h.isOnline(); ok {
		t.Fatal("online")
	}
	if e.state().Revision != rev || !bytes.Equal(e.file(worker), nw) {
		t.Fatal("state or program")
	}
	if !strings.Contains(e.log.String(), "reactivate key=21 failed") {
		t.Fatal(e.log.String())
	}
}

// covers: W8 W9 W11 (an offline runtime gets its rules back but is not activated)
func TestOfflineAccountIsNotActivated(t *testing.T) {
	e := newEnv(t)
	e.h.GoOffline(aid)
	res, err := e.update("app:new")
	if err != nil {
		t.Fatal(err)
	}
	if s, _ := res.Get("status"); s != "updated" {
		t.Fatal(res)
	}
	if o, _ := res.Get("online"); o != false {
		t.Fatal(res)
	}
	eq(t, e.h.eventList(), []any{"firewall 10.77.0.2"})
}

// covers: W8 W9 (rules before the health wait)
func TestRulesReturnRightAfterRestartBeforeHealthWait(t *testing.T) {
	e := newEnv(t)
	e.g.OnExec("app:"+aid, []string{"node", "-e", scripts.WorkerHealth}, func([]string, string) (int, []byte) {
		e.h.event("health")
		return 0, nil
	})
	if _, err := e.update("app:new"); err != nil {
		t.Fatal(err)
	}
	eq(t, e.h.eventList(), []any{"firewall 10.77.0.2", "health", "reapply"})
}

// covers: W6 S27 (newest five backups kept, other files left alone)
func TestBackupsKeepNewestFive(t *testing.T) {
	e := newEnv(t)
	if err := e.st.MkdirPrivate(aid+"/worker-backups", true); err != nil {
		t.Fatal(err)
	}
	var older []string
	for i := 1; i <= 6; i++ {
		older = append(older, fmt.Sprintf("2020010%dT000000Z-%s", i, strings.Repeat("a", 12)))
	}
	for _, n := range append(append([]string(nil), older...), "notes.txt") {
		if err := e.st.WriteAtomic(aid+"/worker-backups/"+n, []byte("x")); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := e.update("app:new"); err != nil {
		t.Fatal(err)
	}
	list := e.backups()
	if len(list) != 5 || strings.Join(list[:4], ",") != strings.Join(older[2:], ",") || !strings.HasSuffix(list[4], sha(old)[:12]) {
		t.Fatal(list)
	}
	if !e.st.Exists(aid + "/worker-backups/notes.txt") {
		t.Fatal("notes.txt removed")
	}
	e.clk.Advance(1e9)
	res, err := e.update("app:test")
	if err != nil {
		t.Fatal(err)
	}
	if s, _ := res.Get("status"); s != "updated" || len(e.backups()) != 5 {
		t.Fatal(res, e.backups())
	}
}

// covers: W1 (an image without the program, or with a directory or an oversized file there, is invalid_image; a cut transfer is unnamed)
func TestImageWithoutProgram(t *testing.T) {
	e := newEnv(t)
	_, err := e.update("app:empty")
	if !errs.Is(err, errs.InvalidImage) || answer(err) != "400 invalid_image" {
		t.Fatal(err)
	}
	if len(e.execs()) != 0 || e.g.Count("GET /v1/accounts/{aid}") != 0 {
		t.Fatal(e.g.Routes())
	}
	// The program path is a directory (images/file 422 not_regular_file).
	e.g.AddImage("app:dir", fakeguard.ImageSpec{Dirs: []string{worker}})
	if _, err := e.update("app:dir"); !errs.Is(err, errs.InvalidImage) {
		t.Fatal(err)
	}
	// A program larger than 256 MiB is refused by the guard (422 too_large).
	e.g.Fail("GET /v1/images/file", fakeguard.Fault{Status: 422, Code: "unprocessable", Reason: "too_large"})
	if _, err := e.update("app:new"); !errs.Is(err, errs.InvalidImage) {
		t.Fatal(err)
	}
	// A cut transfer is a guard failure, never a short program.
	e.g.Fail("GET /v1/images/file", fakeguard.Fault{Status: 0})
	if _, err := e.update("app:new"); answer(err) != "503 runtime_unavailable" {
		t.Fatal(err)
	}
	if len(e.execs()) != 0 {
		t.Fatal(e.execs())
	}
}

// covers: W1 (a pull failure is image_pull_failed, before reading anything)
func TestPullFailure(t *testing.T) {
	e := newEnv(t)
	_, err := e.update("ghcr.io/x/missing:1")
	if !errs.Is(err, errs.ImagePullFailed) || answer(err) != "503 image_pull_failed" {
		t.Fatal(err)
	}
	if e.g.Count("GET /v1/images/file") != 0 {
		t.Fatal(e.g.Routes())
	}
}

// covers: W1 R9 (request validation: exactly {"image": ref})
func TestWorkerRequestValidation(t *testing.T) {
	e := newEnv(t)
	for _, body := range []any{nil, pyjson.Ordered{}, pyjson.Ordered{{Key: "image", Value: "app:new"}, {Key: "x", Value: 1}},
		pyjson.Ordered{{Key: "image", Value: "App:New"}}, []any{}, pyjson.Ordered{{Key: "image", Value: 7}}} {
		_, err := e.u.UpdateWorker(context.Background(), aid, body)
		if answer(err) != "400 invalid_request" {
			t.Fatal(body, err)
		}
	}
	if _, err := e.u.UpdateWorker(context.Background(), "../21", pyjson.Ordered{{Key: "image", Value: "app:new"}}); answer(err) != "400 invalid_request" {
		t.Fatal(err)
	}
	if len(e.h.ensured) != 0 {
		t.Fatal(e.h.ensured)
	}
}

// covers: W3 W12 H9 (the Worker endpoint group's answers: unsupported, changed, a guard failure unnamed)
func TestWorkerErrorAnswers(t *testing.T) {
	e := newEnv(t)
	e.replaceApp("/bin/sh", []string{}, nil)
	_, err := e.update("app:new")
	if answer(err) != "409 unsupported_container" {
		t.Fatal(err)
	}
	e = newEnv(t)
	e.g.Fail("GET /v1/accounts/{aid}/app/top", fakeguard.Fault{Status: 502, Code: "docker_error", Message: "daemon error"})
	_, err = e.update("app:new")
	if _, _, known := errs.Answer(err, errs.Worker); known || answer(err) != "503 runtime_unavailable" {
		t.Fatal(err)
	}
	eq(t, e.files(), map[string]any{worker: string(old)})
	if e.w.restartCount() != 0 {
		t.Fatal("restarted")
	}
}

// covers: W11 W12 BUG-9 (fixed: the container changes after a healthy swap: updated with online false, not 503)
func TestChangedAfterHealthyRestartAnswersUpdatedOffline(t *testing.T) {
	e := newEnv(t)
	e.g.OnExec("app:"+aid, []string{"node", "-e", scripts.WorkerHealth}, func([]string, string) (int, []byte) {
		e.h.setRelabel(true) // the identity changes once the new program answered
		return 0, nil
	})
	res, err := e.update("app:new")
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, pyjson.Ordered{{Key: "status", Value: "updated"}, {Key: "previous_sha256", Value: sha(old)},
		{Key: "sha256", Value: sha(nw)}, {Key: "path", Value: worker}, {Key: "online", Value: false}})
	if _, ok := e.h.isOnline(); ok {
		t.Fatal("online")
	}
	if !strings.Contains(e.log.String(), "reactivate key=21 failed: ContainerChanged") {
		t.Fatal(e.log.String())
	}
}

// covers: W1 W6 (archive reading: one regular file within the limit, else an archive error)
func TestReadSingleBlob(t *testing.T) {
	mk := func(entries ...tar.Header) []byte {
		var buf bytes.Buffer
		tw := tar.NewWriter(&buf)
		for _, h := range entries {
			h := h
			tw.WriteHeader(&h)
			if h.Typeflag == tar.TypeReg {
				tw.Write(nw[:h.Size])
			}
		}
		tw.Close()
		return buf.Bytes()
	}
	reg := tar.Header{Name: "worker", Typeflag: tar.TypeReg, Size: int64(len(nw)), Mode: 0o644}
	b, err := readSingleBlob(bytes.NewReader(mk(reg)), 1<<20, nil)
	if err != nil || b.SHA256() != sha(nw) {
		t.Fatal(err)
	}
	for _, raw := range [][]byte{mk(tar.Header{Name: "worker", Typeflag: tar.TypeDir}),
		mk(tar.Header{Name: "worker", Typeflag: tar.TypeSymlink, Linkname: "x"}),
		mk(reg, tar.Header{Name: "other", Typeflag: tar.TypeReg, Size: 3}), mk(), bytes.Repeat([]byte("not a tar"), 100)} {
		if _, err := readSingleBlob(bytes.NewReader(raw), 1<<20, nil); err == nil {
			t.Fatal("accepted")
		} else if !strings.Contains(err.Error(), "invalid file archive") {
			t.Fatal(err)
		}
	}
	if _, err := readSingleBlob(bytes.NewReader(mk(reg)), 10, nil); err == nil {
		t.Fatal("over the limit accepted")
	}
}

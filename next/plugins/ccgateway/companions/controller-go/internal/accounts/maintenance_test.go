package accounts

import (
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/guardapi/fakeguard"
)

func runtimeView(paused, expired bool) func([]byte) []byte {
	return func(body []byte) []byte {
		if len(body) > 0 { // POST resume
			return []byte(`{"paused":false,"lease":"","active_requests":0}`)
		}
		lease := ""
		if paused {
			lease = strings.Repeat("ab", 24)
		}
		return []byte(`{"paused":` + boolText(paused) + `,"lease":"` + lease + `","active_requests":0,"expired":` + boolText(expired) + `}`)
	}
}

func boolText(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

func (w *workerServer) posts() []workerCall {
	w.mu.Lock()
	defer w.mu.Unlock()
	var out []workerCall
	for _, c := range w.calls {
		if c.Method == "POST" {
			out = append(out, c)
		}
	}
	return out
}

// covers: IT-X02 P11 (an expired maintenance lease of a Worker paused by a
// dead activation is resumed with that lease by the background pass)
func TestExpiredMaintenanceLeaseIsReleased(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	w := e.startWorker(200)
	w.set(200, runtimeView(true, true))
	e.m.releaseMaintenance(bg)
	p := w.posts()
	if len(p) != 1 || !strings.Contains(string(p[0].Body), `"resume"`) || !strings.Contains(string(p[0].Body), strings.Repeat("ab", 24)) {
		t.Fatalf("resume calls: %+v", p)
	}
	if !strings.Contains(e.logs.String(), "stale maintenance lease released key=21") {
		t.Fatal(e.logs.String())
	}
}

// covers: IT-X02 P3 (a lease that has not expired is left alone: an
// activation of another process or a slow one may still own it)
func TestUnexpiredMaintenanceLeaseIsKept(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	w := e.startWorker(200)
	w.set(200, runtimeView(true, false))
	e.m.releaseMaintenance(bg)
	if p := w.posts(); len(p) != 0 {
		t.Fatalf("resumed: %+v", p)
	}
}

// covers: IT-X02 K1 (the pass skips a runtime whose account lock is held:
// a paired activation or update of this process is running)
func TestMaintenancePassSkipsALockedRuntime(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	w := e.startWorker(200)
	w.set(200, runtimeView(true, true))
	h, err := e.m.Lock(bg, "21")
	if err != nil {
		t.Fatal(err)
	}
	e.m.releaseMaintenance(bg)
	h.Release()
	if n := w.count(); n != 0 {
		t.Fatalf("Worker called %d times under a held lock", n)
	}
}

// covers: IT-X02 W1 (an old Worker without admin/runtime: 404/405 silently skipped)
func TestMaintenancePassSkipsAnOldWorker(t *testing.T) {
	for _, status := range []int{http.StatusNotFound, http.StatusMethodNotAllowed} {
		e := newEnv(t)
		e.mustApply("21", desired(rev))
		w := e.startWorker(status)
		w.set(status, func([]byte) []byte { return []byte(`{"error":"not_found"}`) })
		e.m.releaseMaintenance(bg)
		if p := w.posts(); len(p) != 0 || strings.Contains(e.logs.String(), "runtime maintenance check") {
			t.Fatalf("%d: posts %v logs %s", status, p, e.logs.String())
		}
	}
}

// covers: IT-X02 BUG-8 (a half-staged release directory is removed once old
// enough; complete, active, young or foreign directories stay)
func TestStaleReleaseSelection(t *testing.T) {
	now := time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC)
	old := now.Add(-11 * time.Minute).Unix()
	young := now.Add(-5 * time.Minute).Unix()
	ts := func(v int64) string { return strconvI(v) }
	out := strings.Join([]string{
		"2.1.312 0 " + ts(old), // image CLI: not a release name
		"ccgateway-v41-login-401-2c80da642815-0d40e358692a 0 " + ts(old),   // half staged, old: removed
		"ccgateway-v41-login-401-2c80da642815-111111111111 0 " + ts(young), // half staged, young: kept
		"ccgateway-v41-login-401-2c80da642815-777d6b743c71 1 " + ts(old),   // complete: kept
		"ccgateway-v41-login-401-2c80da642815-222222222222 0 " + ts(old),   // active pointer: kept
		"../etc 0 " + ts(old),
		"@ccgateway-v41-login-401-2c80da642815-222222222222/manifest.json",
	}, "\n")
	got := staleReleases(out, now)
	if strings.Join(got, ",") != "ccgateway-v41-login-401-2c80da642815-0d40e358692a" {
		t.Fatal(got)
	}
}

// covers: IT-X02 BUG-8 (the pass removes it through the guard, only for a
// runtime that is not paused)
func TestStaleReleaseRemovedThroughTheGuard(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	w := e.startWorker(200)
	old := e.clock.Now().Add(-time.Hour).Unix()
	listing := "ccgateway-v41-login-401-2c80da642815-0d40e358692a 0 " + strconvI(old) + "\n"
	var removed []string
	e.g.OnExec("app:21", []string{"sh", "-c"}, fakeguard.ExecReply(0, listing))
	e.g.OnExec("app:21", []string{"rm", "-rf", "--"}, func(argv []string, user string) (int, []byte) {
		removed = append(removed, argv[3]+" as "+user)
		return 0, nil
	})
	w.set(200, runtimeView(true, false)) // paused: nothing removed
	e.m.releaseMaintenance(bg)
	if len(removed) != 0 {
		t.Fatal(removed)
	}
	w.set(200, runtimeView(false, false))
	e.m.releaseMaintenance(bg)
	if len(removed) != 1 || !strings.HasPrefix(removed[0], "/opt/ccgateway/cli/ccgateway-v41-login-401-2c80da642815-0d40e358692a as ") {
		t.Fatal(removed)
	}
}

func strconvI(v int64) string { return strconv.FormatInt(v, 10) }

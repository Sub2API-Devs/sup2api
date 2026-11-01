package accounts

import (
	"errors"
	"testing"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/store"
)

// covers: S25 IT-S09 03-§3.5.12 (a replaced resolv.conf removes the running container; the next configuration recreates it)
func TestReplacedResolvConfRecreatesTheContainer(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	old := e.appID("21")
	keys := e.state("21")
	e.g.RejectMountSource("21/resolv.conf", "hardlink")
	_, err := e.apply("21", desired(revB))
	if !errors.Is(err, guardapi.ErrMountReplaced) {
		t.Fatal(err)
	}
	if status, code, _ := errs.Answer(err, errs.Request); status != 503 || code != "runtime_unavailable" {
		t.Fatal(code)
	}
	if e.g.Exists("ccg-21-app") || e.m.OnlineAt("21", rev) || !e.g.Exists("ccg-21-data") {
		t.Fatal("the container goes, the volume stays")
	}
	e.mustApply("21", desired(revB))
	st := e.state("21")
	if e.appID("21") == old || st.APIKey != keys.APIKey || st.AdminKey != keys.AdminKey || e.status("21") != "ready" {
		t.Fatal("recreated with the same keys")
	}
}

// covers: PV17 03-§3.5.6 (a lost CreateApp answer: the retry is answered 400 address in use, then found)
func TestLostCreateAppAnswerIsQueriedAgain(t *testing.T) {
	e := newEnv(t)
	e.g.Fail("PUT /v1/accounts/{aid}/app", fakeguard.Fault{Status: 400, Code: "invalid_request", Message: "address in use"})
	if _, err := e.apply("21", desired(rev)); err == nil {
		t.Fatal("a real 400 without a container fails")
	}
	e.g.ClearFaults()
	e.mustApply("21", desired(rev))
	// The container exists with this address and fingerprint: a create
	// answered 400 (the real guard's answer here) or 409 is that container.
	a := e.app("21")
	req := guardapi.AppRequest{Image: "app:test", IPv4: a.IP("ccg-21-net"), Env: map[string]string{"A": "1"},
		AuthLabel: a.Labels["io.sup2api.ccgateway.auth"], ImageLabel: a.Image}
	if err := e.m.createContainer(bg, "21", req); err != nil {
		t.Fatal("400 address in use, then found:", err)
	}
	e.g.Fail("PUT /v1/accounts/{aid}/app", fakeguard.Fault{Status: 409, Code: "conflict", Reason: "exists"})
	if err := e.m.createContainer(bg, "21", req); err != nil {
		t.Fatal(err)
	}
	req.AuthLabel = "other"
	if err := e.m.createContainer(bg, "21", req); err == nil {
		t.Fatal("another fingerprint is not ours")
	}
}

// covers: S25 (the volume layout runs with a replaced resolv.conf before the first container)
func TestReplacedResolvBeforeTheFirstContainerIsFine(t *testing.T) {
	e := newEnv(t)
	e.g.RejectMountSource("21/resolv.conf", "symlink")
	if e.mustApply("21", desired(rev)).Status != "ready" {
		t.Fatal("ready")
	}
}

// covers: A7 03-§3.5.7 (a rejected mount on start is a 503 and leaves the runtime offline)
func TestRejectedMountOnStartIsUnnamed(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.g.StopContainer("ccg-21-app")
	e.g.Fail("POST /v1/accounts/{aid}/app/{action}", fakeguard.Fault{Status: 403, Code: "forbidden", Reason: "mount_source_rejected"})
	_, err := e.apply("21", desired(revB))
	if !errors.Is(err, guardapi.ErrMountRejected) || e.state("21").Status != store.StatusEgressError {
		t.Fatal(err)
	}
	if status, _, _ := errs.Answer(err, errs.Request); status != 503 {
		t.Fatal(status)
	}
}

// covers: 02-§5.5 03-§3.3 (a starting guard is treated like an unreachable one)
func TestStartingGuardKeepsReadiness(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.g.SetStarting(true)
	_, err := e.m.Connection(bg, "21", rev)
	if !errors.Is(err, guardapi.ErrUnavailable) || !errors.Is(err, guardapi.ErrStarting) {
		t.Fatal(err)
	}
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	e.g.SetStarting(false)
	if !e.m.OnlineAt("21", rev) {
		t.Fatal("kept")
	}
}

// covers: G14 03-§3.7.4 (exec without a gateway is not_running; collect checks first)
func TestGatewayExecWithoutAGatewayIsNotRunning(t *testing.T) {
	e := newEnv(t)
	if _, err := e.g.Client().GatewayExec(bg, []string{"true"}); !errors.Is(err, guardapi.ErrNotRunning) {
		t.Fatal(err)
	}
	if err := e.m.shared.collect(bg); err != nil || e.g.Count("POST /v1/gateway/exec") != 1 {
		t.Fatal(err)
	}
}

// covers: D5 PV17 (the jobs' capabilities and memory are what the guard accepts)
func TestJobsUseOnlyTheAllowedCapabilities(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	for _, j := range e.g.Jobs() {
		if len(j.Job.Caps) > 0 && j.Job.Volume != guardapi.VolumeRW || j.Job.MemoryBytes != 0 {
			t.Fatalf("%+v", j.Job)
		}
		for _, c := range j.Job.Caps {
			if c != guardapi.CapChown && c != guardapi.CapDACOverride {
				t.Fatal(c)
			}
		}
	}
	res, err := e.g.Client().RunJob(bg, "21", guardapi.Job{Image: "app:test", Entrypoint: []string{"sh"}, User: "0",
		Volume: "rw", Caps: []string{guardapi.CapFowner}})
	if e, ok := guardapi.AsError(err); !ok || e.Status != 400 {
		t.Fatal("FOWNER is refused (D5)", res, err)
	}
}

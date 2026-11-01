package accounts

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

// covers: K2 B3 (test_request_path_never_waits_unbounded_for_the_account_lock)
func TestRequestPathNeverWaitsUnboundedForTheAccountLock(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	h, err := e.m.Lock(bg, "21")
	if err != nil {
		t.Fatal(err)
	}
	e.m.reqWait = 50 * time.Millisecond
	if _, err := e.m.Connection(bg, "21", rev); !isKind(err, errs.RuntimeBusy) {
		t.Fatal(err)
	}
	if status, code, named := errs.Answer(errOf(e.m.ReadyState(bg, "21", rev)), errs.Tunnel); status != 503 || code != "runtime_unavailable" || !named {
		t.Fatal(code)
	}
	h.Release()
	if c, err := e.m.Connection(bg, "21", rev); err != nil || c.Revision != rev {
		t.Fatal(err)
	}
}

func errOf[T any](_ T, err error) error { return err }

// covers: Y1 Y5 BUG-2(fixed) R2 (test_connection_reads_readiness_without_image_lookups: one guard call)
func TestConnectionIsOneGuardCallWithoutImageLookups(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.g.ResetCalls()
	for i := 0; i < 3; i++ {
		if c, err := e.m.Connection(bg, "21", rev); err != nil || c == nil {
			t.Fatal(err)
		}
	}
	routes := e.g.Routes()
	if len(routes) != 3 {
		t.Fatal(routes)
	}
	for _, r := range routes {
		if r != "GET /v1/accounts/{aid}?fields=state" {
			t.Fatal(r)
		}
	}
	// Not online: no guard call at all.
	e.g.ResetCalls()
	if c, _ := e.m.Connection(bg, "21", revB); c != nil {
		t.Fatal("another revision")
	}
	if e.m.GoOffline("21"); true {
		e.g.ResetCalls()
		e.m.Connection(bg, "21", rev)
		if len(e.g.Calls()) != 0 {
			t.Fatal(e.g.Routes())
		}
	}
}

// covers: K4 BUG-1(fixed) 02-§4.3 (connection does not wait for another account's configure)
func TestConnectionDoesNotWaitForTheSharedOperationLock(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	held, release := make(chan struct{}), make(chan struct{})
	go e.m.WithSharedOp(bg, func(context.Context) error {
		close(held)
		<-release
		return nil
	})
	<-held
	defer close(release)
	start := time.Now()
	ctx, cancel := context.WithTimeout(bg, time.Second)
	defer cancel()
	for _, f := range []func() error{
		func() error { return errOf(e.m.Connection(ctx, "21", rev)) },
		func() error { return errOf(e.m.Public(ctx, "21")) },
		func() error { return errOf(e.m.Runtimes(ctx)) },
		func() error { return errOf(e.m.EgressStatus(ctx, "21")) },
	} {
		if err := f(); err != nil {
			t.Fatal(err)
		}
	}
	if d := time.Since(start); d > 100*time.Millisecond {
		t.Fatal("the request path waited for sharedOp:", d)
	}
}

// covers: Y5 R6 Y1 (test_connection_requires_current_ready_revision_and_keeps_key_private)
func TestConnectionRequiresCurrentReadyRevisionAndKeepsKeyPrivate(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	st := e.state("21")
	for _, r := range []string{"", revB} {
		if c, err := e.m.Connection(bg, "21", r); c != nil || err != nil {
			t.Fatal(r)
		}
	}
	c, err := e.m.Connection(bg, "21", rev)
	if err != nil || string(pyjson.MustMarshal(c)) != `{"app_ip": "`+st.AppIP+`", "port": 8787, "api_key": "`+st.APIKey+`", "revision": "`+rev+`"}` {
		t.Fatal(err)
	}
	p, _ := e.m.Public(bg, "21")
	if b := string(pyjson.MustMarshal(p)); containsStr(b, st.APIKey) || containsStr(b, "api_key\"") {
		t.Fatal(b)
	}
	e.g.StopContainer("ccg-21-app")
	if c, _ := e.m.Connection(bg, "21", rev); c != nil || e.m.OnlineAt("21", rev) {
		t.Fatal("a stopped container drops readiness")
	}
}

func containsStr(s, sub string) bool {
	return len(sub) > 0 && len(s) >= len(sub) && indexOf(s, sub) >= 0
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

// covers: Y1 M2 (a restarted account container drops readiness; a missing one too)
func TestRestartedOrMissingContainersDropReadiness(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.g.RestartContainer("ccg-21-app")
	if e.status("21") != "pending" {
		t.Fatal("restarted app")
	}
	e.mustApply("21", desired(rev))
	e.g.Client().DeleteContainer(bg, "21", "app")
	if r, err := e.m.Readiness(bg, "21", e.state("21")); r != "" || err != nil {
		t.Fatal(r, err)
	}
}

// covers: 02-§5.5 IT-X01 IT-X09 (an unreachable guard answers 503 and keeps readiness)
func TestUnreachableGuardKeepsReadiness(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	// No usable snapshot (older than SnapshotMaxAge): the unreachable
	// guard answers 503 and readiness is kept (IT-X01 covers the fallback).
	e.clock.Advance(SnapshotMaxAge + time.Second)
	e.g.Fail("GET /v1/accounts/{aid}?fields=state", fakeguard.Fault{Status: 0, Times: 3})
	_, err := e.m.Connection(bg, "21", rev)
	if !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal(err)
	}
	if status, code, named := errs.Answer(err, errs.Request); status != 503 || code != "runtime_unavailable" || named {
		t.Fatal(code)
	}
	if !e.m.OnlineAt("21", rev) {
		t.Fatal("not taken offline")
	}
	if _, err := e.m.Public(bg, "21"); err == nil {
		t.Fatal("status is 503 too")
	}
	// The background recovery does not take it offline either.
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	if c, err := e.m.Connection(bg, "21", rev); err != nil || c == nil {
		t.Fatal("ready once the guard is back", err)
	}
}

// covers: Y3 R5 BUG-21(kept) (an unknown key is 200 pending with the defaults)
func TestPublicOfAnUnknownKey(t *testing.T) {
	e := newEnv(t)
	p, err := e.m.Public(bg, "99")
	if err != nil {
		t.Fatal(err)
	}
	want := `{"account_id": "99", "container": "ccg-99-app", "cli": null, "active_runtime": null, "current_image": "", ` +
		`"target_image": "app:test", "image_update_available": false, "target_image_available": true, ` +
		`"environment_pending": false, "disk_quota": {"limit_bytes": 0, "status": "legacy_unbounded"}, "status": "pending", ` +
		`"revision": "", "auth_mode": "oauth", "network": null, "app_ip": "", "gateway_ip": ""}`
	if got := string(pyjson.MustMarshal(p)); got != want {
		t.Fatal(got)
	}
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-98-app", Image: "app:test", Labels: map[string]string{names.LabelAccount: "x"}})
	if _, err := e.m.Public(bg, "98"); !isKind(err, errs.OwnershipMismatch) {
		t.Fatal("a same-name foreign container is an error (503 on status)", err)
	}
}

// covers: Q2 Q3 (test_moved_proxy_host_makes_the_runtime_pending)
func TestMovedProxyHostMakesTheRuntimePending(t *testing.T) {
	e := newEnv(t)
	e.resolver.set("proxy.example.test", proxyIP)
	e.mustApply("21", desired(rev, kv("proxy", proxyObj("proxy.example.test"))))
	e.resolver.set("proxy.example.test", proxyIP, "198.51.100.8")
	e.m.recheckProxies(bg) // round-robin that still includes the pinned address
	if e.status("21") != "ready" {
		t.Fatal("still pinned")
	}
	e.resolver.set("other.example.test")
	delete(e.resolver.hosts, "proxy.example.test")
	e.m.recheckProxies(bg) // a failed lookup is no evidence
	if e.status("21") != "ready" {
		t.Fatal("failed lookup")
	}
	e.resolver.set("proxy.example.test", "198.51.100.9")
	e.m.recheckProxies(bg)
	if e.status("21") != "pending" || !containsStr(e.logs.String(), "proxy of key=21 resolves to another address") {
		t.Fatal("moved")
	}
}

// covers: Q3 A6 (test_new_resolution_reconfigures_the_gateway_at_the_same_revision)
func TestNewResolutionReconfiguresTheGatewayAtTheSameRevision(t *testing.T) {
	e := newEnv(t)
	e.resolver.set("proxy.example.test", proxyIP)
	e.mustApply("21", desired(rev, kv("proxy", proxyObj("proxy.example.test"))))
	app := e.appID("21")
	e.resolver.set("proxy.example.test", "198.51.100.9")
	e.m.recheckProxies(bg)
	firewalls := e.g.Count("PUT /v1/accounts/{aid}/firewall")
	e.mustApply("21", desired(rev, kv("proxy", proxyObj("proxy.example.test"))))
	if e.g.Count("PUT /v1/accounts/{aid}/firewall") != firewalls+1 || e.appID("21") != app || e.status("21") != "ready" {
		t.Fatal("applied again, same container")
	}
	if ep := e.m.shared.endpoint("21"); ep == nil || ep.IP != "198.51.100.9" {
		t.Fatal("pinned to the new address")
	}
}

// covers: Q1 (test_address_literal_and_direct_are_never_rechecked)
func TestAddressLiteralAndDirectAreNeverRechecked(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.mustApply("22", pyjson.Ordered{kv("revision", rev), kv("proxy", nil), kv("direct", true)})
	calls := e.resolver.calls
	e.m.recheckProxies(bg)
	if e.resolver.calls != calls || e.status("21") != "ready" || e.status("22") != "ready" {
		t.Fatal("never resolved")
	}
}

// covers: Q3 K1 (a runtime whose lock is held is skipped by the recheck)
func TestProxyRecheckSkipsALockedRuntime(t *testing.T) {
	e := newEnv(t)
	e.resolver.set("proxy.example.test", proxyIP)
	e.mustApply("21", desired(rev, kv("proxy", proxyObj("proxy.example.test"))))
	e.resolver.set("proxy.example.test", "198.51.100.9")
	h, _ := e.m.Lock(bg, "21")
	e.m.recheckProxies(bg)
	h.Release()
	if !e.m.OnlineAt("21", rev) {
		t.Fatal("skipped")
	}
	e.m.recheckProxies(bg)
	if e.m.OnlineAt("21", rev) {
		t.Fatal("rechecked once free")
	}
}

// covers: B1 B2 02-§4.4 (the loops wait one period first, run after it, stop with ctx)
func TestBackgroundLoopsRunAfterTheirPeriod(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.resolver.set("proxy.example.test", proxyIP)
	e.mustApply("22", desired(rev, kv("proxy", proxyObj("proxy.example.test"))))
	e.resolver.set("proxy.example.test", "198.51.100.9")
	e.g.RestartGateway()
	e.m.recoverEvery = 20 * time.Millisecond
	e.m.recheckEvery = time.Hour
	ctx, cancel := context.WithCancel(bg)
	e.m.RunBackground(ctx)
	deadline := time.Now().Add(10 * time.Second)
	for !e.m.OnlineAt("21", rev) {
		if time.Now().After(deadline) {
			t.Fatal("recover pass")
		}
		time.Sleep(5 * time.Millisecond)
	}
	cancel()
	time.Sleep(50 * time.Millisecond)
	if !e.m.OnlineAt("22", rev) {
		t.Fatal("the proxy recheck waits its 300 s period")
	}
}

// covers: B1 (a panic in a pass is logged and the loop goes on)
func TestBackgroundPanicIsLogged(t *testing.T) {
	e := newEnv(t)
	e.m.safe(bg, func(context.Context) { panic("boom") })
	if !containsStr(e.logs.String(), "shared egress pass failed: panic: boom") {
		t.Fatal(e.logs.String())
	}
}

// covers: G15 BUG-23(kept) (a stopped account container is never started by the recovery)
func TestRecoveryNeverStartsAStoppedAccount(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.g.StopContainer("ccg-21-app")
	starts := e.g.Count("POST /v1/accounts/{aid}/app/{action}")
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	if e.g.ContainerStatus("ccg-21-app") != "exited" || e.g.Count("POST /v1/accounts/{aid}/app/{action}") != starts {
		t.Fatal("left stopped")
	}
	if e.state("21").Status != store.StatusReady {
		t.Fatal("state untouched")
	}
}

// covers: BUG-2 IT-X01 (the guard is unreachable: a snapshot younger than
// SnapshotMaxAge keeps an online runtime ready; the request path does not
// depend on the guard)
func TestReadinessFallsBackToARecentSnapshotWhenTheGuardIsUnreachable(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	if c, err := e.m.Connection(bg, "21", rev); err != nil || c == nil {
		t.Fatal(err)
	}
	e.clock.Advance(SnapshotMaxAge - time.Second)
	e.g.Fail("GET /v1/accounts/{aid}?fields=state", fakeguard.Fault{Times: 3}) // transport failure
	for i := 0; i < 2; i++ {
		if c, err := e.m.Connection(bg, "21", rev); err != nil || c == nil || c.Revision != rev {
			t.Fatalf("transport failure %d: %v", i, err)
		}
	}
	e.g.ClearFaults()
	e.g.Fail("GET /v1/accounts/{aid}?fields=state", fakeguard.Fault{Status: 503, Code: "unavailable", Reason: "starting"})
	if c, err := e.m.Connection(bg, "21", rev); err != nil || c == nil {
		t.Fatalf("guard starting: %v", err)
	}
	if !e.m.OnlineAt("21", rev) {
		t.Fatal("the fallback took the runtime offline")
	}
	if n := strings.Count(e.logs.String(), "readiness from cached snapshot"); n != 1 {
		t.Fatalf("want one rate-limited warning, got %d", n)
	}
}

// covers: BUG-2 IT-X01 (a snapshot older than SnapshotMaxAge is not used: 503
// as before, readiness kept)
func TestReadinessSnapshotOlderThanTheLimitAnswers503(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	if _, err := e.m.Connection(bg, "21", rev); err != nil {
		t.Fatal(err)
	}
	e.clock.Advance(SnapshotMaxAge + time.Second)
	e.g.Fail("GET /v1/accounts/{aid}?fields=state", fakeguard.Fault{})
	_, err := e.m.Connection(bg, "21", rev)
	if status, code, _ := errs.Answer(err, errs.Tunnel); status != 503 || code != "runtime_unavailable" {
		t.Fatalf("%d %s (%v)", status, code, err)
	}
	if !e.m.OnlineAt("21", rev) {
		t.Fatal("a transport failure must not take the runtime offline")
	}
	// Never answered: no snapshot, 503.
	e2 := newEnv(t)
	e2.mustApply("21", desired(rev))
	e2.m.memMu.Lock()
	delete(e2.m.snaps, "21")
	e2.m.memMu.Unlock()
	e2.g.Fail("GET /v1/accounts/{aid}?fields=state", fakeguard.Fault{})
	if _, err := e2.m.Connection(bg, "21", rev); err == nil {
		t.Fatal("no snapshot: want 503")
	}
}

// covers: BUG-2 IT-X01 (a definite guard answer is never replaced by the
// snapshot: 404 takes the runtime offline, 403 controller_unguarded fails)
func TestReadinessDefiniteGuardAnswersDoNotUseTheSnapshot(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	if _, err := e.m.Connection(bg, "21", rev); err != nil {
		t.Fatal(err)
	}
	e.g.Fail("GET /v1/accounts/{aid}?fields=state", fakeguard.Fault{Status: 403, Code: "forbidden", Reason: "controller_unguarded"})
	if c, err := e.m.Connection(bg, "21", rev); err == nil || c != nil {
		t.Fatal("403 controller_unguarded answered from the snapshot")
	}
	e.g.ClearFaults()
	e.g.Fail("GET /v1/accounts/{aid}?fields=state", fakeguard.Fault{Status: 404, Code: "not_found", Reason: "container"})
	if c, _ := e.m.Connection(bg, "21", rev); c != nil {
		t.Fatal("404 answered from the snapshot")
	}
	if e.m.OnlineAt("21", rev) {
		t.Fatal("404 must take the runtime offline")
	}
}

// covers: Y1 Y2 G15 IT-X06 (the gateway detached from the account network:
// the runtime goes offline and the background recovery re-attaches it;
// intended difference from Python, which kept it ready and cut off)
func TestDetachedGatewayTakesTheRuntimeOfflineAndRecoverReattaches(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	if err := e.g.Client().DisconnectGateway(bg, "21"); err != nil {
		t.Fatal(err)
	}
	if c, _ := e.m.Connection(bg, "21", rev); c != nil {
		t.Fatal("ready with the gateway off its network")
	}
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	if c, err := e.m.Connection(bg, "21", rev); err != nil || c == nil {
		t.Fatal("recover did not re-attach", err)
	}
}

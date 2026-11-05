package admin

import (
	"bytes"
	"context"
	"testing"
	"time"

	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/sessionstate"
	"ccgateway/controller/internal/sessionstate/fakevalkey"
)

const adminPass = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

// covers: SESSION-MEMORY §7.5 /health session_state: reachable, memory,
// evictions, account users; 30 s cache; a stopped or hung Valkey is
// "unreachable" within the 3 s bound and never fails /health
func TestHealthSessionState(t *testing.T) {
	e := newEnv(t)
	fv := fakevalkey.New(adminPass)
	client := &sessionstate.Client{Socket: sessionstate.SocketPath, Dial: fv.Dial, Timeout: 200 * time.Millisecond,
		Secret: func() ([]byte, error) { return []byte(adminPass), nil }}
	a, err := New(Options{Config: e.cfg, Host: e.h, Guard: e.g.Client(), Store: e.st, Images: e.im, Clock: e.clk,
		Log: logx.New(&bytes.Buffer{}, "admin"), SessionState: client})
	if err != nil {
		t.Fatal(err)
	}
	ad := a.(*admin)
	ctx := context.Background()
	_ = client.SetUser(ctx, "21", "pw", true)
	_ = client.SetUser(ctx, "22", "pw", false)
	fv.SetStats(5<<20, 7)
	ss := func() string { return js(get(ad.Health(ctx), "session_state")) }
	if got := ss(); got != `{"reachable": true, "used_memory": 5242880, "evicted_keys": 7, "users": 2}` {
		t.Fatal(got)
	}
	fv.ResetCommands()
	fv.SetStats(6<<20, 9)
	e.clk.Advance(GatewayCacheTTL - time.Second)
	if got := ss(); got != `{"reachable": true, "used_memory": 5242880, "evicted_keys": 7, "users": 2}` || len(fv.Commands()) != 0 {
		t.Fatal("cached for 30 s:", got, fv.Commands())
	}
	e.clk.Advance(time.Second)
	if got := ss(); got != `{"reachable": true, "used_memory": 6291456, "evicted_keys": 9, "users": 2}` {
		t.Fatal(got)
	}
	fv.SetDown(true)
	e.clk.Advance(GatewayCacheTTL)
	if got := ss(); got != `{"reachable": false, "used_memory": null, "evicted_keys": null, "users": null}` {
		t.Fatal(got)
	}
	fv.SetDown(false)
	fv.SetHang(true)
	e.clk.Advance(GatewayCacheTTL)
	start := time.Now()
	if got := ss(); got != `{"reachable": false, "used_memory": null, "evicted_keys": null, "users": null}` {
		t.Fatal(got)
	}
	if d := time.Since(start); d > healthGuardWait {
		t.Fatalf("/health waited %v for a hung Valkey", d)
	}
}

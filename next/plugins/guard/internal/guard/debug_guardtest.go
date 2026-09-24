//go:build guardtest

package guard

import (
	"context"
	"net"
	"net/http"
	"runtime"
	"strconv"
	"sync"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Test build only (go build -tags guardtest): routes used by e2e tests to
// verify strict network mode and the memory watchdog.

var (
	ballastMu sync.Mutex
	ballast   [][]byte
)

func init() {
	debugRoutes = func(p *Plugin) {
		p.Handle("POST", "/debug/dial", debugDial)
		p.Handle("POST", "/debug/alloc", debugAlloc)
	}
}

// debugDial opens a raw TCP socket with net.Dialer, bypassing the egress
// tunnel. In strict mode (seccomp) this must fail.
// Body: {"address": "1.1.1.1:443"} (default).
func debugDial(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in struct {
		Address string `json:"address"`
	}
	_ = pluginsdk.DecodeJSON(req, &in)
	if in.Address == "" {
		in.Address = "1.1.1.1:443"
	}
	d := &net.Dialer{Timeout: 5 * time.Second}
	start := time.Now()
	conn, err := d.DialContext(ctx, "tcp", in.Address)
	out := map[string]any{"address": in.Address, "ok": err == nil, "elapsed_ms": time.Since(start).Milliseconds()}
	if err != nil {
		out["error"] = err.Error()
	} else {
		out["remote_addr"] = conn.RemoteAddr().String()
		_ = conn.Close()
	}
	return pluginsdk.JSONResponse(http.StatusOK, out), nil
}

// debugAlloc allocates and touches ?mb=N MiB (default 512) and keeps it
// alive, to trigger the host memory watchdog. ?free=1 releases it.
func debugAlloc(_ context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	ballastMu.Lock()
	defer ballastMu.Unlock()
	if pluginsdk.Query(req, "free") == "1" {
		ballast = nil
		runtime.GC()
		return pluginsdk.JSONResponse(http.StatusOK, map[string]any{"ok": true, "held_mb": 0}), nil
	}
	mb, _ := strconv.Atoi(pluginsdk.Query(req, "mb"))
	if mb <= 0 {
		mb = 512
	}
	for i := 0; i < mb; i++ {
		b := make([]byte, 1<<20)
		for j := 0; j < len(b); j += 4096 {
			b[j] = 1
		}
		ballast = append(ballast, b)
	}
	return pluginsdk.JSONResponse(http.StatusOK, map[string]any{"ok": true, "held_mb": len(ballast)}), nil
}

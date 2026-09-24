//go:build guardtest

package guard

import (
	"encoding/json"
	"net"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

func TestDebugRoutes(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	go func() {
		if c, err := l.Accept(); err == nil {
			_ = c.Close()
		}
	}()
	h := pluginsdktest.Start(t, New(), pluginsdktest.Options{SDK: sdkOpts()})
	resp := h.Do("POST", "/debug/dial", nil, map[string]string{"address": l.Addr().String()})
	var out map[string]any
	_ = json.Unmarshal(resp.GetBody(), &out)
	if resp.GetStatus() != 200 || out["ok"] != true {
		t.Fatalf("dial = %d %s", resp.GetStatus(), resp.GetBody())
	}
	resp = h.Do("POST", "/debug/alloc", map[string]string{"mb": "4"}, nil)
	_ = json.Unmarshal(resp.GetBody(), &out)
	if out["held_mb"] != float64(4) {
		t.Fatalf("alloc = %s", resp.GetBody())
	}
	resp = h.Do("POST", "/debug/alloc", map[string]string{"free": "1"}, nil)
	_ = json.Unmarshal(resp.GetBody(), &out)
	if out["held_mb"] != float64(0) {
		t.Fatalf("free = %s", resp.GetBody())
	}
}

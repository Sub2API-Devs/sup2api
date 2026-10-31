package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// TestChannelProxy stores a proxy sealed, routes the channel's calls through
// it and asks for the key again when the proxy changes (CONTRACTS §72.14.6).
func TestChannelProxy(t *testing.T) {
	mod := newFakeMod(t)
	var proxied atomic.Int64
	proxy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		proxied.Add(1) // an HTTP proxy gets the absolute URL; forward it
		out, err := http.NewRequest(r.Method, r.URL.String(), r.Body)
		if err != nil {
			w.WriteHeader(502)
			return
		}
		out.Header = r.Header.Clone()
		resp, err := http.DefaultTransport.RoundTrip(out)
		if err != nil {
			w.WriteHeader(502)
			return
		}
		defer resp.Body.Close()
		w.WriteHeader(resp.StatusCode)
		_, _ = io.Copy(w, resp.Body)
	}))
	t.Cleanup(proxy.Close)
	_, h, _ := startDB(t, nil, nil)
	ch := decodeData[ChannelView](t, h.Do("POST", "/channels", nil, map[string]any{"type": ChannelOpenAI, "name": "o", "base_url": mod.srv.URL,
		"api_key": "key-o", "proxy": proxy.URL}))
	if !ch.HasProxy {
		t.Fatalf("has_proxy = false")
	}
	if r := decodeData[ChannelTestResult](t, h.Do("POST", fmt.Sprintf("/channels/%d/test", ch.ID), nil, nil)); !r.OK || proxied.Load() != 1 {
		t.Fatalf("test through proxy = %+v, proxied %d", r, proxied.Load())
	}
	body := map[string]any{"name": "o", "base_url": mod.srv.URL, "proxy": "socks5://10.0.0.1:1080"}
	if r := h.Do("PUT", fmt.Sprintf("/channels/%d", ch.ID), nil, body); r.GetStatus() != 400 {
		t.Fatalf("proxy change without key = %d", r.GetStatus())
	}
	body["proxy"] = proxy.URL // unchanged: no key needed
	decodeData[ChannelView](t, h.Do("PUT", fmt.Sprintf("/channels/%d", ch.ID), nil, body))
	body["proxy"] = "ftp://x"
	if r := h.Do("PUT", fmt.Sprintf("/channels/%d", ch.ID), nil, body); r.GetStatus() != 400 {
		t.Fatalf("invalid proxy = %d", r.GetStatus())
	}
	body["proxy"], body["api_key"] = "", "key-o"
	if c := decodeData[ChannelView](t, h.Do("PUT", fmt.Sprintf("/channels/%d", ch.ID), nil, body)); c.HasProxy {
		t.Fatal("proxy not cleared")
	}
	decodeData[ChannelTestResult](t, h.Do("POST", fmt.Sprintf("/channels/%d/test", ch.ID), nil, nil))
	if proxied.Load() != 1 {
		t.Fatalf("cleared proxy still used: %d", proxied.Load())
	}
}

// TestFlowErrorRateAlert alerts once when a flow's last-hour error rate
// crosses the threshold (CONTRACTS §72.14.5).
func TestFlowErrorRateAlert(t *testing.T) {
	mod := newFakeMod(t)
	var mu sync.Mutex
	var got []map[string]any
	hook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var m map[string]any
		_ = json.NewDecoder(r.Body).Decode(&m)
		mu.Lock()
		got = append(got, m)
		mu.Unlock()
	}))
	t.Cleanup(hook.Close)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "notify_webhook_url": hook.URL, "error_rate_alert_percent": 5})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	for i := range minAlertSamples {
		mustHook(t, h, hookReq(fmt.Sprintf("MOD-500 request %d", i)))
	}
	run := func() {
		t.Helper()
		if _, err := p.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: JobAlerts}); err != nil {
			t.Fatal(err)
		}
	}
	run()
	waitFor(t, "alert webhook", func() bool { mu.Lock(); defer mu.Unlock(); return len(got) == 1 })
	run()                              // still above: no second alert
	time.Sleep(300 * time.Millisecond) // a second webhook would have arrived by now
	mu.Lock()
	defer mu.Unlock()
	if len(got) != 1 || got[0]["event"] != EventFlowErrorRate || got[0]["flow_id"] != float64(flow) || got[0]["audited"] != float64(minAlertSamples) {
		t.Fatalf("alerts = %+v", got)
	}
}

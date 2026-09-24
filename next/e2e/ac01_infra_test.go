package e2e

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"net/http"
	"strings"
	"testing"
	"time"
)

// AC 1: `docker compose up` starts PG, Redis, two nodes and Caddy.
func TestAC01_ComposeStack(t *testing.T) {
	e := Setup(t)

	t.Run("both nodes serve through the load balancer", func(t *testing.T) {
		seen := map[string]bool{}
		c := NewClient(e.BaseURL)
		for i := 0; i < 10 && len(seen) < 2; i++ {
			r := c.Do(t, http.MethodGet, "/healthz", nil)
			if r.Status != 200 || r.JSON().Get("status").String() != "ok" {
				t.Fatalf("healthz: %s", r)
			}
			seen[r.JSON().Get("node").String()] = true
		}
		if !seen["node-1"] || !seen["node-2"] {
			t.Fatalf("load balancer reached %v, want node-1 and node-2", seen)
		}
	})

	t.Run("each node healthy with the same version", func(t *testing.T) {
		var version string
		for n := range e.NodeURLs {
			h := e.With(t).NodeHealth(n + 1)
			if want := "node-" + itoa(int64(n+1)); h.Get("node").String() != want {
				t.Fatalf("node %d reports %q", n+1, h.Get("node").String())
			}
			if version == "" {
				version = h.Get("version").String()
			} else if h.Get("version").String() != version {
				t.Fatalf("version mismatch: %s vs %s", version, h.Get("version").String())
			}
		}
	})

	t.Run("core migrations applied exactly once", func(t *testing.T) {
		e2 := e.With(t)
		e2.RequireDocker()
		rows := e2.SQL(`SELECT id FROM schema_migrations ORDER BY id`)
		if len(rows) == 0 || rows[0] != "0001_core.sql" {
			t.Fatalf("schema_migrations = %v", rows)
		}
	})

	t.Run("market index served and signed", func(t *testing.T) {
		c := NewClient(e.BaseURL)
		r := c.Do(t, http.MethodGet, "/market/index.json", nil)
		if r.Status != 200 {
			t.Fatalf("index: %s", r)
		}
		idx := r.JSON()
		if idx.Get("version").Int() != 1 || !idx.Get("plugins").IsArray() {
			t.Fatalf("index format: %s", r.Body)
		}
		sig := c.Do(t, http.MethodGet, "/market/index.json.sig", nil)
		if sig.Status == 404 {
			if len(idx.Get("plugins").Array()) > 0 {
				t.Fatal("index lists plugins but index.json.sig is missing")
			}
			t.Log("index.json.sig missing: plugin CLI not built yet (empty unsigned index)")
			return
		}
		pubResp := c.Do(t, http.MethodGet, "/market/dev-official.pub", nil)
		if pubResp.Status != 200 {
			t.Fatalf("dev-official.pub: %s", pubResp)
		}
		pub, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(pubResp.Body)))
		if err != nil || len(pub) != ed25519.PublicKeySize {
			t.Fatalf("bad dev public key %q", pubResp.Body)
		}
		raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(sig.Body)))
		if err != nil {
			t.Fatalf("index.json.sig not base64: %v", err)
		}
		h := sha256.Sum256(r.Body)
		msg := []byte("sub2api-market-index-v1:" + hex.EncodeToString(h[:]))
		if !ed25519.Verify(pub, msg, raw) {
			t.Fatal("index.json.sig does not verify with dev-official.pub (CONTRACTS §11.1)")
		}
		for _, p := range idx.Get("plugins").Array() {
			for _, v := range p.Get("versions").Array() {
				e2 := e.With(t)
				e2.MarketPackage(p.Get("key").String(), v.Get("version").String())
			}
		}
	})

	t.Run("mock upstream", func(t *testing.T) {
		m := e.Mock()
		mark := m.Mark(t)
		key := "sk-ant-mock-ac01-" + e.RunID

		// Non-stream JSON with usage.
		g := e.Gateway(t, e.MockURL, "/v1/messages", key, MessagesBody("claude-mock", "hi", false), nil)
		if g.Status != 200 || g.JSON().Get("usage.input_tokens").Int() != MockInputTokens ||
			g.JSON().Get("usage.output_tokens").Int() != MockOutputTokens {
			t.Fatalf("non-stream: %d %s", g.Status, g.Body)
		}

		// Stream: events in order and delivered incrementally through Caddy.
		g = e.Gateway(t, e.MockURL, "/v1/messages", key, MessagesBody("claude-mock", "hi", true),
			map[string]string{"x-mock-chunk-delay-ms": "150"})
		types := g.EventTypes()
		if g.Status != 200 || len(types) < 6 || types[0] != "message_start" || types[len(types)-1] != "message_stop" {
			t.Fatalf("stream events: %d %v", g.Status, types)
		}
		start := g.Events[0].Data.Get("message.usage")
		if start.Get("input_tokens").Int() != MockInputTokens || start.Get("cache_read_input_tokens").Int() != MockCacheReadTokens ||
			start.Get("cache_creation_input_tokens").Int() != MockCacheCreationTokens {
			t.Fatalf("message_start usage: %s", start.Raw)
		}
		if spread := g.Events[len(g.Events)-1].At - g.Events[0].At; spread < 500*time.Millisecond {
			t.Fatalf("SSE appears buffered: all events within %s", spread)
		}

		// Errors.
		for _, st := range []int{429, 401, 529, 500} {
			g = e.Gateway(t, e.MockURL, "/v1/messages", key, MessagesBody("claude-mock", "hi", false),
				map[string]string{"x-mock-status": itoa(int64(st))})
			if g.Status != st || g.JSON().Get("type").String() != "error" {
				t.Fatalf("x-mock-status %d: got %d %s", st, g.Status, g.Body)
			}
			if st == 429 && g.Header.Get("retry-after") != "2" {
				t.Fatalf("429 without retry-after: 2")
			}
		}

		// count_tokens.
		g = e.Gateway(t, e.MockURL, "/v1/messages/count_tokens", key, MessagesBody("claude-mock", "hi", false), nil)
		if g.Status != 200 || g.JSON().Get("input_tokens").Int() <= 0 {
			t.Fatalf("count_tokens: %d %s", g.Status, g.Body)
		}

		// Delay.
		t0 := time.Now()
		e.Gateway(t, e.MockURL, "/v1/messages", key, MessagesBody("claude-mock", "hi", false), map[string]string{"x-mock-delay-ms": "300"})
		if time.Since(t0) < 300*time.Millisecond {
			t.Fatal("x-mock-delay-ms ignored")
		}

		// Control rule consumed once, recorded requests carry the key.
		m.SetRule(t, MockRule{APIKey: key, Status: 529, Remaining: 1})
		if g = e.Gateway(t, e.MockURL, "/v1/messages", key, MessagesBody("claude-mock", "hi", false), nil); g.Status != 529 {
			t.Fatalf("rule not applied: %d", g.Status)
		}
		if g = e.Gateway(t, e.MockURL, "/v1/messages", key, MessagesBody("claude-mock", "hi", false), nil); g.Status != 200 {
			t.Fatalf("rule not consumed: %d", g.Status)
		}
		reqs := m.Since(t, mark)
		mine := 0
		for _, k := range KeysUsed(reqs, "") {
			if k == key {
				mine++
			}
		}
		if mine < 10 {
			t.Fatalf("mock recorded %d requests with x-api-key %q, want >= 10", mine, key)
		}
	})
}

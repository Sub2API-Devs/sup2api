package billing

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
)

const litellmSample = `{
  "sample_spec": {"input_cost_per_token": 0},
  "claude-opus-5-5": {"litellm_provider": "anthropic", "mode": "chat", "input_cost_per_token": 4e-06,
    "output_cost_per_token": 2e-05, "cache_read_input_token_cost": 2e-07, "cache_creation_input_token_cost": 5e-06,
    "cache_creation_input_token_cost_above_1hr": 8e-06},
  "claude-sonnet-4-5": {"litellm_provider": "anthropic", "mode": "chat", "input_cost_per_token": 3e-06,
    "output_cost_per_token": 1.5e-05, "cache_read_input_token_cost": 3e-07,
    "input_cost_per_token_above_200k_tokens": 6e-06, "output_cost_per_token_above_200k_tokens": 2.25e-05},
  "gemini/gemini-2.5-flash": {"litellm_provider": "gemini", "mode": "chat", "input_cost_per_token": 3e-07, "output_cost_per_token": 2.5e-06},
  "vertex_ai/gemini-2.5-flash": {"litellm_provider": "vertex_ai-language-models", "mode": "chat", "input_cost_per_token": 9},
  "dall-e-3": {"litellm_provider": "openai", "mode": "image_generation", "input_cost_per_token": 1},
  "text-embedding-3-small": {"litellm_provider": "openai", "mode": "embedding", "input_cost_per_token": 2e-08, "output_cost_per_token": 0},
  "ft:gpt-4o:*": {"litellm_provider": "openai", "mode": "chat", "input_cost_per_token": 1e-06}
}`

func cfgOf(t *testing.T, p *syncPrice) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(p.Config, &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func TestParseLiteLLM(t *testing.T) {
	f, err := parseLiteLLM([]byte(litellmSample), defaultLiteLLMProviders)
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range f.prices {
		if err := p.compile(); err != nil {
			t.Fatalf("%s: %v", p.Model, err)
		}
	}
	if len(f.prices) != 4 || f.skipped != 1 {
		t.Fatalf("prices %d skipped %d: %v", len(f.prices), f.skipped, f.prices)
	}
	opus := f.prices["claude-opus-5-5"]
	if opus.Mode != "per_token" || opus.Expression != `v1:tier("base", p*4 + c*20 + cr*0.2 + cc*5 + cc1h*8)` {
		t.Fatalf("opus: %+v", opus)
	}
	sonnet := f.prices["claude-sonnet-4-5"]
	if sonnet.Mode != "expression" || !strings.Contains(sonnet.Expression, `len <= 200000 ? tier("standard", p*3 + c*15 + cr*0.3)`) ||
		!strings.Contains(sonnet.Expression, `tier("long_context", p*6 + c*22.5 + cr*0.3)`) {
		t.Fatalf("sonnet: %+v", sonnet)
	}
	if g := f.prices["gemini-2.5-flash"]; g == nil || cfgOf(t, g)["p"] != 0.3 {
		t.Fatalf("gemini: %+v", g)
	}
	if e := f.prices["text-embedding-3-small"]; e == nil || cfgOf(t, e)["p"] != 0.02 {
		t.Fatalf("embedding: %+v", e)
	}
}

func TestParseModelsDev(t *testing.T) {
	body := `{"anthropic": {"models": {"claude-opus-5-5": {"cost": {"input": 4, "output": 20, "cache_read": 0.2, "cache_write": 5}}}},
		"google": {"models": {
			"gemini-2.5-pro": {"cost": {"input": 1.25, "output": 10, "cache_read": 0.125,
				"tiers": [{"input": 2.5, "output": 15, "cache_read": 0.25, "tier": {"type": "context", "size": 200000}}]}},
			"no-cost": {}}},
		"other": {"models": {"x": {"cost": {"input": 1, "output": 1}}}}}`
	f, err := parseModelsDev([]byte(body), defaultModelsDevProviders)
	if err != nil {
		t.Fatal(err)
	}
	if len(f.prices) != 2 {
		t.Fatalf("prices: %v", f.prices)
	}
	if c := cfgOf(t, f.prices["claude-opus-5-5"]); c["cc"] != 5.0 || c["cc1h"] != nil {
		t.Fatalf("opus: %v", c)
	}
	pro := f.prices["gemini-2.5-pro"]
	if err := pro.compile(); err != nil || !strings.Contains(pro.Expression, `tier("long_context", p*2.5 + c*15 + cr*0.25)`) {
		t.Fatalf("pro: %+v %v", pro, err)
	}
}

func TestParseSup2APIAppliesMultiplier(t *testing.T) {
	body := `{"data": {"prices": [
		{"model": "claude-opus-5-5", "mode": "per_token", "config": {"p": 4, "c": 20, "cr": 0.2}, "expression": "x"},
		{"model": "web-search", "mode": "per_request", "config": {"price": 0.01}, "expression": "x"},
		{"model": "custom", "mode": "expression", "config": {}, "expression": "tier(\"base\", p*2)"},
		{"model": "bad*", "mode": "per_token", "config": {"p": 1}, "expression": "x"}],
		"rate_multiplier": "1.5", "group": {"id": 3, "name": "g"}}}`
	f, err := parseSup2API([]byte(body), true)
	if err != nil {
		t.Fatal(err)
	}
	if len(f.prices) != 3 || f.skipped != 1 {
		t.Fatalf("prices %v skipped %d", f.prices, f.skipped)
	}
	for _, p := range f.prices {
		if err := p.compile(); err != nil {
			t.Fatalf("%s: %v", p.Model, err)
		}
	}
	if e := f.prices["claude-opus-5-5"].Expression; e != `v1:tier("base", p*6 + c*30 + cr*0.3)` {
		t.Fatalf("opus: %s", e)
	}
	if e := f.prices["web-search"].Expression; e != `v1:tier("base", flat(0.015))` {
		t.Fatalf("per request: %s", e)
	}
	if e := f.prices["custom"].Expression; e != `v1:tier("base", p*2) ||| true ? 1.5 : 1` {
		t.Fatalf("expression: %s", e)
	}
	f, _ = parseSup2API([]byte(body), false)
	_ = f.prices["claude-opus-5-5"].compile()
	if e := f.prices["claude-opus-5-5"].Expression; e != `v1:tier("base", p*4 + c*20 + cr*0.2)` {
		t.Fatalf("without multiplier: %s", e)
	}
}

// fakeKeys authenticates "sk-good" into a group with multiplier 2.
type fakeKeys struct{}

func (fakeKeys) Authenticate(_ context.Context, raw string) (*core.APIKeyPrincipal, error) {
	if raw != "sk-good" {
		return nil, core.ErrUnauthenticated
	}
	return &core.APIKeyPrincipal{KeyID: 1, UserID: 1, Group: core.GroupInfo{ID: 7, Name: "vip",
		RateMultiplier: decimal.NewFromInt(2), ModelAllowlist: []string{"claude-*"}}}, nil
}

func TestPriceSourcesSync(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	admin := e.user("admin@example.com")
	cipher, err := secret.New([]byte(strings.Repeat("k", 32)))
	if err != nil {
		t.Fatal(err)
	}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/litellm.json":
			_, _ = w.Write([]byte(litellmSample))
		default:
			// An upstream sup2api: forward to this test instance's /key/prices.
			req := httptest.NewRequest("GET", "/api/v1/key/prices", nil)
			req.Header.Set("Authorization", r.Header.Get("Authorization"))
			e.h.ServeHTTP(w, req)
		}
	}))
	defer upstream.Close()
	e.svc.SetSyncDeps(SyncDeps{Cipher: cipher, Keys: fakeKeys{}, HTTP: upstream.Client()})

	// Seeded sources.
	list := e.mustCall(admin, 200, "GET", "/price-sources", nil)["data"].([]any)
	if len(list) != 2 || list[0].(map[string]any)["kind"] != "litellm" || list[1].(map[string]any)["kind"] != "models_dev" {
		t.Fatalf("seeded: %v", list)
	}
	litellmID := int64(list[0].(map[string]any)["id"].(float64))
	e.mustCall(admin, 200, "PATCH", "/price-sources/"+itoa(litellmID), map[string]any{"url": upstream.URL + "/litellm.json"})

	// A manual price that differs from the source.
	e.mustCall(admin, 201, "POST", "/prices", map[string]any{"model": "claude-opus-5-5", "mode": "per_token", "config": map[string]any{"p": 1, "c": 1}})

	prev := data(e.mustCall(admin, 200, "POST", "/price-sources/"+itoa(litellmID)+"/preview", nil))
	actions := map[string]string{}
	for _, it := range prev["items"].([]any) {
		m := it.(map[string]any)
		actions[m["model"].(string)] = m["action"].(string)
	}
	if prev["total"].(float64) != 4 || actions["claude-opus-5-5"] != "manual" || actions["claude-sonnet-4-5"] != "create" {
		t.Fatalf("preview: %v", actions)
	}

	res := data(e.mustCall(admin, 200, "POST", "/price-sources/"+itoa(litellmID)+"/apply",
		map[string]any{"models": []string{"claude-sonnet-4-5", "gemini-2.5-flash", "nope"}}))
	if res["created"].(float64) != 2 || len(res["skipped"].([]any)) != 1 {
		t.Fatalf("apply: %v", res)
	}
	// The manual price was not selected and stays manual.
	r, err := e.svc.Resolve(ctx, "claude-opus-5-5")
	if err != nil || r.Expression != `v1:tier("base", p*1 + c*1)` && r.Expression != `tier("base", p*1 + c*1)` {
		t.Fatalf("manual kept: %+v %v", r, err)
	}
	res = data(e.mustCall(admin, 200, "POST", "/price-sources/"+itoa(litellmID)+"/apply",
		map[string]any{"models": []string{"claude-opus-5-5", "claude-sonnet-4-5"}}))
	if res["updated"].(float64) != 1 || res["unchanged"].(float64) != 1 {
		t.Fatalf("apply 2: %v", res)
	}
	synced := e.mustCall(admin, 200, "GET", "/prices?source=sync&sync_source_id="+itoa(litellmID), nil)
	if synced["page"].(map[string]any)["total"].(float64) != 3 {
		t.Fatalf("synced prices: %v", synced)
	}
	if r, _ := e.svc.Resolve(ctx, "claude-opus-5-5"); !strings.Contains(r.Expression, "cc1h*8") {
		t.Fatalf("opus after sync: %+v", r)
	}

	// /key/prices: API key auth, group allowlist, multiplier.
	code, _ := e.call(0, "GET", "/key/prices", nil, "Authorization", "Bearer sk-bad")
	if code != 401 {
		t.Fatalf("bad key: %d", code)
	}
	_, kp := e.call(0, "GET", "/key/prices", nil, "Authorization", "Bearer sk-good")
	d := kp["data"].(map[string]any)
	if d["rate_multiplier"] != "2" || len(d["prices"].([]any)) != 2 {
		t.Fatalf("key prices: %v", d)
	}

	// A sup2api source requires an API key and imports with the multiplier.
	_, resp := e.call(admin, "POST", "/price-sources", map[string]any{"name": "up", "kind": "sup2api", "url": upstream.URL})
	if errCode(resp) != "invalid_argument" {
		t.Fatalf("sup2api without key: %v", resp)
	}
	src := data(e.mustCall(admin, 201, "POST", "/price-sources", map[string]any{"name": "up", "kind": "sup2api",
		"url": upstream.URL, "api_key": "sk-good"}))
	if src["has_api_key"] != true || src["options"].(map[string]any)["apply_multiplier"] != true {
		t.Fatalf("source: %v", src)
	}
	var enc []byte
	_ = e.db.Pool.QueryRow(ctx, `SELECT api_key_enc FROM price_sync_sources WHERE name = 'up'`).Scan(&enc)
	if strings.Contains(string(enc), "sk-good") {
		t.Fatal("API key stored in clear")
	}
	upID := itoa(int64(src["id"].(float64)))
	prev = data(e.mustCall(admin, 200, "POST", "/price-sources/"+upID+"/preview", nil))
	for _, it := range prev["items"].([]any) {
		m := it.(map[string]any)
		if m["model"] == "claude-opus-5-5" && (m["action"] != "update" ||
			!strings.Contains(m["incoming"].(map[string]any)["expression"].(string), "p*8 + c*40")) {
			t.Fatalf("upstream opus: %v", m)
		}
	}
	e.mustCall(admin, 409, "POST", "/price-sources", map[string]any{"name": "up", "kind": "litellm", "url": upstream.URL})

	// Fetch failures are reported and recorded.
	e.mustCall(admin, 200, "PATCH", "/price-sources/"+upID, map[string]any{"api_key": "sk-bad"})
	_, resp = e.call(admin, "POST", "/price-sources/"+upID+"/preview", nil)
	if errCode(resp) != "unavailable" {
		t.Fatalf("bad upstream key: %v", resp)
	}
	var lastErr string
	_ = e.db.Pool.QueryRow(ctx, `SELECT last_error FROM price_sync_sources WHERE name = 'up'`).Scan(&lastErr)
	if !strings.Contains(lastErr, "401") {
		t.Fatalf("last_error = %q", lastErr)
	}

	// Deleting a source keeps its prices.
	e.mustCall(admin, 204, "DELETE", "/price-sources/"+itoa(litellmID), nil)
	var n int
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM model_prices WHERE source = 'sync' AND sync_source_id IS NULL`).Scan(&n)
	if n != 3 {
		t.Fatalf("orphaned synced prices: %d", n)
	}
}

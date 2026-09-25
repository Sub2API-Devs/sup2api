package account

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"testing"

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// TestAccountModelsAndLimits covers the core account attributes of CONTRACTS
// §18: model list, model mapping, weight and rate limits.
func TestAccountModelsAndLimits(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	g1 := e.exec1(`INSERT INTO groups (name) VALUES ('default') RETURNING id`)
	creds := map[string]any{"api_key": "sk-good-key-123"}
	mk := func(extra map[string]any) map[string]any {
		m := map[string]any{"name": "acc", "plugin_key": "anthropic", "type": "apikey",
			"group_ids": []int64{g1}, "credentials": creds}
		for k, v := range extra {
			m[k] = v
		}
		return m
	}
	fields := func(out map[string]any) string {
		f := fieldsOf(out)
		sort.Strings(f)
		return fmt.Sprint(f)
	}

	// Validation.
	code, out := e.do("POST", "/accounts", mk(map[string]any{
		"models":        []string{"claude-sonnet-4-5", "claude-*", "claude-sonnet-4-5", ""},
		"model_mapping": map[string]string{"gpt-4o": "gpt-4.1", "bad*": "x", "ok": ""},
		"weight":        0, "rpm_limit": -1, "tpm_limit": -5, "tpd_limit": -1, "spm_limit": -2,
	}))
	if code != 400 || fields(out) != "[model_mapping.bad*:invalid model_mapping.ok:invalid models[1]:invalid models[2]:duplicate models[3]:invalid rpm_limit:invalid spm_limit:invalid tpd_limit:invalid tpm_limit:invalid weight:invalid]" {
		t.Fatalf("validation: %d %s", code, fields(out))
	}
	if code, out = e.do("POST", "/accounts", mk(map[string]any{"weight": 1001})); code != 400 || fields(out) != "[weight:invalid]" {
		t.Fatalf("weight max: %d %s", code, fields(out))
	}

	// Defaults.
	code, out = e.do("POST", "/accounts", mk(nil))
	if code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	acc := out["data"].(map[string]any)
	if acc["weight"] != 1.0 || len(acc["models"].([]any)) != 0 || len(acc["model_mapping"].(map[string]any)) != 0 ||
		acc["rpm_limit"] != 0.0 || acc["tpm_limit"] != 0.0 || acc["tpd_limit"] != 0.0 || acc["spm_limit"] != 0.0 {
		t.Fatalf("defaults: %v", acc)
	}
	if ru := acc["rate_usage"].(map[string]any); ru["rpm"] != 0.0 || ru["spm"] != 0.0 {
		t.Fatalf("rate_usage: %v", ru)
	}
	id1 := int64(acc["id"].(float64))

	// Full set.
	code, out = e.do("POST", "/accounts", mk(map[string]any{
		"name": "limited", "priority": 1, "weight": 7,
		"models":        []string{" claude-sonnet-4-5 ", "claude-opus-4-1"},
		"model_mapping": map[string]string{"claude-sonnet-4-5": "claude-sonnet-4-5-20250929"},
		"rpm_limit":     60, "tpm_limit": 100000, "tpd_limit": 5000000, "spm_limit": 20,
	}))
	if code != 201 {
		t.Fatalf("create limited: %d %v", code, out)
	}
	acc = out["data"].(map[string]any)
	id2 := int64(acc["id"].(float64))
	if fmt.Sprint(acc["models"]) != "[claude-sonnet-4-5 claude-opus-4-1]" || acc["weight"] != 7.0 ||
		acc["model_mapping"].(map[string]any)["claude-sonnet-4-5"] != "claude-sonnet-4-5-20250929" ||
		acc["rpm_limit"] != 60.0 || acc["tpm_limit"] != 100000.0 || acc["tpd_limit"] != 5000000.0 || acc["spm_limit"] != 20.0 {
		t.Fatalf("limited view: %v", acc)
	}
	// settings never carries the mapping.
	if _, ok := acc["settings"].(map[string]any)["model_mapping"]; ok {
		t.Fatalf("settings must not contain model_mapping: %v", acc["settings"])
	}

	// List order: priority, weight DESC, id; ?model= filter.
	_, out = e.do("GET", "/accounts", nil)
	items := out["data"].([]any)
	if len(items) != 2 || items[0].(map[string]any)["name"] != "limited" {
		t.Fatalf("order: %v", items)
	}
	_, out = e.do("GET", "/accounts?model=claude-opus-4-1", nil)
	if items = out["data"].([]any); len(items) != 2 {
		t.Fatalf("model filter (serves all + listed): %d", len(items))
	}
	_, out = e.do("GET", "/accounts?model=gpt-4o", nil)
	if items = out["data"].([]any); len(items) != 1 || int64(items[0].(map[string]any)["id"].(float64)) != id1 {
		t.Fatalf("model filter (only the unrestricted account): %v", items)
	}

	// The gateway snapshot carries the new attributes.
	refs, err := e.svc.Candidates(ctx, g1, nil)
	if err != nil || len(refs) != 2 {
		t.Fatalf("candidates: %v %v", refs, err)
	}
	var lim core.AccountRef
	for _, r := range refs {
		if r.ID == id2 {
			lim = r
		}
	}
	if lim.Weight != 7 || lim.RPMLimit != 60 || lim.TPMLimit != 100000 || lim.TPDLimit != 5000000 || lim.SPMLimit != 20 ||
		!lim.ServesModel("claude-opus-4-1") || lim.ServesModel("gpt-4o") ||
		lim.MapModel("claude-sonnet-4-5") != "claude-sonnet-4-5-20250929" || lim.MapModel("claude-opus-4-1") != "claude-opus-4-1" {
		t.Fatalf("ref: %+v", lim)
	}
	if a, _ := e.svc.Load(ctx, id2); a == nil || a.Weight != 7 || a.SPMLimit != 20 || len(a.Models) != 2 {
		t.Fatalf("load: %+v", a)
	}

	// PATCH replaces models / mapping wholesale and keeps the rest.
	code, out = e.do("PATCH", fmt.Sprintf("/accounts/%d", id2), map[string]any{
		"models": []string{}, "model_mapping": map[string]string{"a": "b"}, "spm_limit": 0, "weight": 2})
	if code != 200 {
		t.Fatalf("patch: %d %v", code, out)
	}
	acc = out["data"].(map[string]any)
	if len(acc["models"].([]any)) != 0 || fmt.Sprint(acc["model_mapping"]) != "map[a:b]" || acc["spm_limit"] != 0.0 ||
		acc["weight"] != 2.0 || acc["rpm_limit"] != 60.0 {
		t.Fatalf("patched: %v", acc)
	}
	if code, out = e.do("PATCH", fmt.Sprintf("/accounts/%d", id2), map[string]any{"model_mapping": map[string]string{"x y": "z"}}); code != 400 ||
		fields(out) != "[model_mapping.x y:invalid]" {
		t.Fatalf("patch invalid mapping: %d %v", code, fields(out))
	}

	// Rate usage is read from the limiter.
	e.svc.d.Limiter.Hit(ctx, id2, "s1")
	e.svc.d.Limiter.AddTokens(ctx, id2, 1234)
	_, out = e.do("GET", fmt.Sprintf("/accounts/%d", id2), nil)
	raw, _ := json.Marshal(out)
	if gjson.GetBytes(raw, "data.rate_usage.rpm").Int() != 1 || gjson.GetBytes(raw, "data.rate_usage.tpm").Int() != 1234 ||
		gjson.GetBytes(raw, "data.rate_usage.tpd").Int() != 1234 || gjson.GetBytes(raw, "data.rate_usage.spm").Int() != 1 {
		t.Fatalf("rate usage: %s", gjson.GetBytes(raw, "data.rate_usage").Raw)
	}

	// The test action maps the model before the plugin builds the request.
	_, _ = e.do("PATCH", fmt.Sprintf("/accounts/%d", id2), map[string]any{"model_mapping": map[string]string{"claude-x": "claude-y"}})
	code, out = e.do("POST", fmt.Sprintf("/accounts/%d/test", id2), map[string]any{"model": "claude-x"})
	if code != 200 {
		t.Fatalf("test: %d %v", code, out)
	}
	e.plat.mu.Lock()
	got := e.plat.tests[len(e.plat.tests)-1].GetModel()
	e.plat.mu.Unlock()
	if got != "claude-y" {
		t.Fatalf("test model sent %q, want claude-y", got)
	}
}

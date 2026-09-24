package billing

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

var anthropicDefaults = []manifest.PricingEntry{
	{Model: "claude-sonnet-*", Mode: "expression", Expression: `len <= 200000 ? tier("standard", p*3 + c*15 + cr*0.3 + cc*3.75 + cc1h*6) : tier("long_context", p*6 + c*22.5 + cr*0.6 + cc*7.5 + cc1h*12)`},
	{Model: "claude-haiku-*", Mode: "per_token", Config: map[string]any{"p": 1, "c": 5, "cr": 0.1, "cc": 1.25, "cc1h": 2}},
}

func TestPriceAPI(t *testing.T) {
	e := newEnv(t)
	admin := e.user("admin@example.com")
	e.plugin("anthropic")
	if err := syncDefaultsCtx(e, "anthropic"); err != nil {
		t.Fatal(err)
	}

	// validate: generated expression and analysis; config errors are reported, not failed.
	out := data(e.mustCall(admin, 200, "POST", "/prices/validate", map[string]any{
		"mode": "per_token", "config": map[string]any{"p": 1, "c": 5, "cr": 0.1, "cc": 1.25, "cc1h": 2},
	}))
	if out["ok"] != true || out["expression"] != `tier("base", p*1 + c*5 + cr*0.1 + cc*1.25 + cc1h*2)` {
		t.Fatalf("validate: %v", out)
	}
	out = data(e.mustCall(admin, 200, "POST", "/prices/validate", map[string]any{"mode": "expression", "expression": "p +"}))
	if out["ok"] != false || len(out["errors"].([]any)) == 0 {
		t.Fatalf("validate error: %v", out)
	}
	out = data(e.mustCall(admin, 200, "POST", "/prices/validate", map[string]any{"mode": "per_request", "config": map[string]any{}}))
	if out["ok"] != false {
		t.Fatalf("validate config error: %v", out)
	}

	// create: visual expression config (A.6), big cost needs confirmation.
	visual := map[string]any{
		"tiers": []any{
			map[string]any{"name": "standard", "max_len": 200000, "p": 3, "c": 15, "cr": 0.3, "cc": 3.75, "cc1h": 6, "flat": 0},
			map[string]any{"name": "long_context", "max_len": nil, "p": 6, "c": 22.5, "cr": 0.6, "cc": 7.5, "cc1h": 12},
		},
		"rules": []any{
			map[string]any{"kind": "header", "name": "anthropic-beta", "op": "contains", "value": "fast-mode", "multiplier": 2},
			map[string]any{"kind": "time", "tz": "Asia/Shanghai", "from_hour": 0, "to_hour": 8, "multiplier": 0.8},
		},
	}
	created := data(e.mustCall(admin, 201, "POST", "/prices", map[string]any{
		"model_pattern": "claude-sonnet-x", "mode": "expression", "config": visual,
	}))
	id := int64(created["id"].(float64))
	if _, has := created["platform"]; created["source"] != "admin" || created["expr_hash"] == "" || has ||
		!contains(str(created["expression"]), `tier("standard"`) {
		t.Fatalf("created %v", created)
	}
	var hist int
	_ = e.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM model_price_history WHERE expr_hash = $1`, created["expr_hash"]).Scan(&hist)
	if hist != 1 {
		t.Fatal("history not recorded")
	}
	e.mustCall(admin, 200, "GET", "/prices/history/"+str(created["expr_hash"]), nil)
	e.mustCall(admin, 404, "GET", "/prices/history/nope", nil)

	code, resp := e.call(admin, "POST", "/prices", map[string]any{
		"model_pattern": "big-model", "mode": "per_token", "config": map[string]any{"p": 15, "c": 75},
	})
	if code != 400 || data(map[string]any{"data": resp["error"]})["details"].(map[string]any)["confirmation_required"] != true {
		t.Fatalf("big cost: %d %v", code, resp)
	}
	e.mustCall(admin, 201, "POST", "/prices", map[string]any{
		"model_pattern": "big-model", "mode": "per_token", "config": map[string]any{"p": 15, "c": 75}, "confirm": true,
	})
	_, resp = e.call(admin, "POST", "/prices", map[string]any{"model_pattern": "big-model", "mode": "per_token", "config": map[string]any{"p": 1}})
	if errCode(resp) != "conflict" {
		t.Fatalf("duplicate: %v", resp)
	}
	_, resp = e.call(admin, "POST", "/prices", map[string]any{"model_pattern": "x", "mode": "expression", "expression": "p * -1"})
	if errCode(resp) != "invalid_argument" {
		t.Fatalf("invalid expression: %v", resp)
	}

	// preview by id: A.6 numbers, group multiplier applied.
	var gid int64
	_ = e.db.Pool.QueryRow(context.Background(), `INSERT INTO groups (name, rate_multiplier) VALUES ('vip', 1.5) RETURNING id`).Scan(&gid)
	prev := data(e.mustCall(admin, 200, "POST", "/prices/preview", map[string]any{
		"price_id": id,
		"usage":    map[string]any{"p": 100000, "c": 2000, "cr": 80000},
		"headers":  map[string]any{"Anthropic-Beta": "fast-mode"},
		"at":       "2026-09-24T02:00:00Z",
	}))
	if prev["cost"] != "0.708" || prev["tier"] != "standard" {
		t.Fatalf("preview: %v", prev)
	}
	rules := prev["rules"].([]any)
	if rules[0].(map[string]any)["matched"] != true || rules[1].(map[string]any)["matched"] != false {
		t.Fatalf("rules: %v", rules)
	}
	bd := prev["breakdown"].(map[string]any)
	if bd["vars"].(map[string]any)["len"].(float64) != 180000 || bd["subtotal"] != "0.354" {
		t.Fatalf("breakdown: %v", bd)
	}
	prev = data(e.mustCall(admin, 200, "POST", "/prices/preview", map[string]any{
		"mode": "per_token", "config": map[string]any{"p": 3, "c": 15},
		"usage": map[string]any{"p": 1204, "c": 812}, "group_id": gid,
	}))
	if prev["base_cost"] != "0.015792" || prev["cost"] != "0.023688" || prev["rate_multiplier"] != "1.5" {
		t.Fatalf("preview with group: %v", prev)
	}
	e.mustCall(admin, 404, "POST", "/prices/preview", map[string]any{"price_id": 999999})

	// list with filters and analysis.
	list := e.mustCall(admin, 200, "GET", "/prices?source=plugin_default&plugin_key=anthropic", nil)
	items := list["data"].([]any)
	if len(items) != 2 || list["page"].(map[string]any)["total"].(float64) != 2 {
		t.Fatalf("list: %v", list)
	}
	first := items[0].(map[string]any)
	if first["analysis"] == nil {
		t.Fatalf("analysis missing: %v", first)
	}
	list = e.mustCall(admin, 200, "GET", "/prices?q=sonnet", nil)
	if len(list["data"].([]any)) != 2 {
		t.Fatalf("search: %v", list)
	}

	// plugin defaults: read-only except enabled; override creates admin copy.
	var defID int64
	_ = e.db.Pool.QueryRow(context.Background(), `SELECT id FROM model_prices WHERE source = 'plugin_default' AND model_pattern = 'claude-haiku-*'`).Scan(&defID)
	path := "/prices/" + itoa(defID)
	_, resp = e.call(admin, "PATCH", path, map[string]any{"note": "x"})
	if errCode(resp) != "conflict" {
		t.Fatalf("patch default: %v", resp)
	}
	if upd := data(e.mustCall(admin, 200, "PATCH", path, map[string]any{"enabled": false})); upd["enabled"] != false {
		t.Fatalf("disable default: %v", upd)
	}
	_, resp = e.call(admin, "DELETE", path, nil)
	if errCode(resp) != "conflict" {
		t.Fatalf("delete default: %v", resp)
	}
	ov := data(e.mustCall(admin, 201, "POST", path+"/override", nil))
	if ov["source"] != "admin" || ov["model_pattern"] != "claude-haiku-*" || ov["expression"] == "" {
		t.Fatalf("override: %v", ov)
	}
	_, resp = e.call(admin, "POST", path+"/override", nil)
	if errCode(resp) != "conflict" {
		t.Fatalf("second override: %v", resp)
	}
	ovPath := "/prices/" + str(int64(ov["id"].(float64)))
	_, resp = e.call(admin, "POST", ovPath+"/override", nil)
	if errCode(resp) != "conflict" {
		t.Fatalf("override admin: %v", resp)
	}

	// patch admin price: switch to per_token, pricing is regenerated.
	upd := data(e.mustCall(admin, 200, "PATCH", ovPath, map[string]any{"mode": "per_token", "config": map[string]any{"p": 2, "c": 4}, "note": "cheaper"}))
	if upd["expression"] != `tier("base", p*2 + c*4)` || upd["note"] != "cheaper" || upd["expr_hash"] == ov["expr_hash"] {
		t.Fatalf("patch: %v", upd)
	}
	// Resolution sees the change immediately (local invalidation + bus).
	r, err := e.svc.Resolve(context.Background(), "claude-haiku-4")
	if err != nil || r.Expression != `tier("base", p*2 + c*4)` {
		t.Fatalf("resolve after patch: %+v %v", r, err)
	}
	if len(e.bus.sent) == 0 {
		t.Fatal("config:changed not published")
	}
	e.mustCall(admin, 200, "GET", ovPath, nil)
	e.mustCall(admin, 204, "DELETE", ovPath, nil)
	e.mustCall(admin, 404, "GET", ovPath, nil)
}

func syncDefaultsCtx(e *env, plugin string) error {
	return syncDefaults(e.t, e, plugin, anthropicDefaults)
}

func TestBalanceAndSettingsAPI(t *testing.T) {
	e := newEnv(t)
	admin := e.user("admin@example.com")
	u := e.user("user@example.com")

	res := data(e.mustCall(admin, 200, "POST", "/users/"+itoa(u)+"/balance/adjust",
		map[string]any{"amount": "20", "credit": true, "note": "topup"}, "Idempotency-Key", "abc"))
	if res["balance_after"] != "20" || res["duplicate"] != false {
		t.Fatalf("adjust: %v", res)
	}
	res = data(e.mustCall(admin, 200, "POST", "/users/"+itoa(u)+"/balance/adjust",
		map[string]any{"amount": "20", "credit": true}, "Idempotency-Key", "abc"))
	if res["duplicate"] != true {
		t.Fatalf("retry: %v", res)
	}
	e.mustCall(admin, 200, "POST", "/users/"+itoa(u)+"/balance/adjust", map[string]any{"amount": 2.5, "credit": false, "note": "fix"})
	_, resp := e.call(admin, "POST", "/users/"+itoa(u)+"/balance/adjust", map[string]any{"amount": "-1", "credit": true})
	if errCode(resp) != "invalid_argument" {
		t.Fatalf("negative: %v", resp)
	}
	_, resp = e.call(admin, "POST", "/users/999999/balance/adjust", map[string]any{"amount": "1", "credit": true})
	if errCode(resp) != "not_found" {
		t.Fatalf("unknown user: %v", resp)
	}

	if b := data(e.mustCall(u, 200, "GET", "/me/balance", nil)); b["balance"] != "17.5" {
		t.Fatalf("me/balance: %v", b)
	}
	if b := data(e.mustCall(admin, 200, "GET", "/me/balance", nil)); b["balance"] != "0" {
		t.Fatalf("admin balance: %v", b)
	}
	mine := e.mustCall(u, 200, "GET", "/me/ledger", nil)["data"].([]any)
	if len(mine) != 2 || mine[0].(map[string]any)["delta"] != "-2.5" || mine[1].(map[string]any)["kind"] != "admin_adjust" {
		t.Fatalf("me/ledger: %v", mine)
	}
	all := e.mustCall(admin, 200, "GET", "/ledger?user_id="+itoa(u)+"&kind=admin_adjust", nil)
	rows := all["data"].([]any)
	if len(rows) != 2 || rows[0].(map[string]any)["user_email"] != "user@example.com" || rows[0].(map[string]any)["operator_id"].(float64) != float64(admin) {
		t.Fatalf("ledger: %v", all)
	}
	if n := len(e.mustCall(admin, 200, "GET", "/ledger?kind=usage", nil)["data"].([]any)); n != 0 {
		t.Fatalf("kind filter: %d", n)
	}
	e.mustCall(admin, 400, "GET", "/ledger?from=yesterday", nil)

	// settings
	st := data(e.mustCall(admin, 200, "GET", "/settings/billing", nil))
	if st["missing_price_policy"] != "reject" || st["min_balance"] != "0" || st["big_cost_warning_usd"] != "10" {
		t.Fatalf("settings: %v", st)
	}
	st = data(e.mustCall(admin, 200, "PUT", "/settings/billing", map[string]any{"missing_price_policy": "free", "min_balance": "1.5"}))
	if st["missing_price_policy"] != "free" || st["min_balance"] != "1.5" || st["big_cost_warning_usd"] != "10" {
		t.Fatalf("put settings: %v", st)
	}
	_, resp = e.call(admin, "PUT", "/settings/billing", map[string]any{"missing_price_policy": "maybe"})
	if errCode(resp) != "invalid_argument" {
		t.Fatalf("bad policy: %v", resp)
	}
	s, _ := e.svc.Settings(context.Background())
	if s.MissingPricePolicy != PolicyFree || s.MinBalance.String() != "1.5" {
		t.Fatalf("service settings: %+v", s)
	}
}

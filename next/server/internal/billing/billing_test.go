package billing

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestGlobMatch(t *testing.T) {
	cases := []struct {
		p, s string
		ok   bool
	}{
		{"claude-sonnet-*", "claude-sonnet-4-5", true},
		{"claude-sonnet-*", "claude-haiku-4", false},
		{"*", "anything/with/slash", true},
		{"gpt-?o", "gpt-4o", true},
		{"gpt-?o", "gpt-40o", false},
		{"*-mini", "o4-mini", true},
		{"a*b*c", "axxbyyc", true},
		{"a*b*c", "axxbyy", false},
		{"exact", "exact", true},
	}
	for _, c := range cases {
		if got := globMatch(c.p, c.s); got != c.ok {
			t.Errorf("globMatch(%q, %q) = %v", c.p, c.s, got)
		}
	}
}

func syncDefaults(t *testing.T, e *env, plugin string, entries []manifest.PricingEntry) error {
	t.Helper()
	return e.db.Tx(context.Background(), func(tx pgx.Tx) error {
		return e.svc.SyncPluginDefaults(context.Background(), tx, plugin, entries)
	})
}

func TestSyncPluginDefaultsAndResolve(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	e.plugin("anthropic")
	e.plugin("relay")
	// anthropic was installed first: its defaults win over relay's.
	e.exec(`UPDATE plugins SET installed_at = now() - interval '1 day' WHERE key = 'anthropic'`)
	entries := []manifest.PricingEntry{
		{Model: "claude-sonnet-*", Mode: "expression", Expression: `len <= 200000 ? tier("standard", p*3 + c*15) : tier("long_context", p*6 + c*22.5)`},
		{Model: "claude-haiku-*", Mode: "per_token", Config: map[string]any{"p": 1, "c": 5, "cr": 0.1, "cc": 1.25, "cc1h": 2}},
		{Model: "claude-sonnet-4-5", Mode: "per_token", Config: map[string]any{"p": 3, "c": 15}},
		{Model: "web-search", Mode: "per_request", Config: map[string]any{"price": 0.01}},
	}
	if err := syncDefaults(t, e, "anthropic", entries); err != nil {
		t.Fatal(err)
	}
	// relay declares the same pattern (allowed: one default per plugin and
	// pattern), a more specific one, and a model anthropic does not price.
	relay := []manifest.PricingEntry{
		{Model: "claude-haiku-*", Mode: "per_token", Config: map[string]any{"p": 7}},
		{Model: "claude-haiku-4-5", Mode: "per_token", Config: map[string]any{"p": 8}},
		{Model: "gpt-4o", Mode: "per_token", Config: map[string]any{"p": 2.5, "c": 10}},
	}
	if err := syncDefaults(t, e, "relay", relay); err != nil {
		t.Fatal(err)
	}
	var n int
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM model_price_history`).Scan(&n)
	if n != 7 {
		t.Fatalf("history rows = %d", n)
	}

	resolve := func(model string) *core.PriceRule {
		t.Helper()
		r, err := e.svc.Resolve(ctx, model)
		if err != nil {
			t.Fatalf("resolve %s: %v", model, err)
		}
		return r
	}
	if r := resolve("claude-sonnet-4-5"); r.Pattern != "claude-sonnet-4-5" {
		t.Fatalf("exact should beat glob, got %s", r.Pattern)
	}
	if r := resolve("claude-sonnet-4"); r.Pattern != "claude-sonnet-*" || r.Mode != "expression" {
		t.Fatalf("got %+v", r)
	}
	// A more specific pattern wins across plugins (relay's exact match)...
	if r := resolve("claude-haiku-4-5"); r.Expression != `tier("base", p*8 + c*0)` {
		t.Fatalf("haiku-4-5 expression %q", r.Expression)
	}
	// ...and for the same pattern the earliest installed plugin wins.
	if r := resolve("claude-haiku-3"); r.Expression != `tier("base", p*1 + c*5 + cr*0.1 + cc*1.25 + cc1h*2)` {
		t.Fatalf("haiku-3 expression %q", r.Expression)
	}
	if r := resolve("gpt-4o"); r.Expression != `tier("base", p*2.5 + c*10)` {
		t.Fatalf("relay-only model: %+v", r)
	}
	if r := resolve("web-search"); r.Mode != "per_request" {
		t.Fatalf("got %+v", r)
	}
	_, err := e.svc.Resolve(ctx, "gemini-2.5-pro")
	if ce := core.AsError(err); ce.Code != "model_price_not_configured" {
		t.Fatalf("missing price err = %v", err)
	}

	// Admin price beats plugin defaults even when it is a shorter glob; the
	// longer admin glob wins among admin prices; bus invalidates the cache.
	e.exec(`INSERT INTO model_prices (model_pattern, mode, expression, expr_hash, source)
		VALUES ('claude-*', 'per_token', 'tier("base", p*9)', 'h1', 'admin'),
		       ('claude-sonnet-*', 'per_token', 'tier("base", p*8)', 'h2', 'admin')`)
	if r := resolve("claude-sonnet-4-5"); r.Pattern != "claude-sonnet-4-5" {
		t.Fatal("cache should still serve the old answer before invalidation")
	}
	_ = e.bus.Publish(ctx, core.ChannelConfigChanged, []byte(`{"key":"prices"}`))
	if r := resolve("claude-sonnet-4-5"); r.Pattern != "claude-sonnet-*" || r.Expression != `tier("base", p*8)` {
		t.Fatalf("longer admin glob should win, got %+v", r)
	}
	if r := resolve("claude-haiku-4-5"); r.Pattern != "claude-*" {
		t.Fatalf("admin should beat plugin defaults, got %s", r.Pattern)
	}
	// An admin pattern is unique.
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO model_prices (model_pattern, mode, expression, expr_hash, source)
		VALUES ('claude-*', 'per_token', 'tier("base", p)', 'h3', 'admin')`); err == nil {
		t.Fatal("duplicate admin pattern accepted")
	}
	bodies, headers := e.svc.Inputs(&core.PriceRule{Expression: `tier("b", p) ||| param("service_tier") == "x" ? 2 : 1 ||| has(header("Anthropic-Beta"), "f") ? 2 : 1`})
	if len(bodies) != 1 || bodies[0] != "service_tier" || len(headers) != 1 || headers[0] != "anthropic-beta" {
		t.Fatalf("inputs %v %v", bodies, headers)
	}

	// Disabled rows keep their flag across re-sync; stale defaults are
	// removed; admin rows and other plugins' defaults survive.
	e.exec(`UPDATE model_prices SET enabled = false WHERE model_pattern = 'claude-haiku-*' AND plugin_key = 'anthropic'`)
	if err := syncDefaults(t, e, "anthropic", entries[1:2]); err != nil {
		t.Fatal(err)
	}
	rows, _ := e.db.Pool.Query(ctx, `SELECT model_pattern, source, COALESCE(plugin_key, ''), enabled FROM model_prices
		ORDER BY model_pattern, source, plugin_key NULLS FIRST`)
	var got []string
	for rows.Next() {
		var p, s, k string
		var en bool
		_ = rows.Scan(&p, &s, &k, &en)
		got = append(got, p+"/"+s+"/"+k+"/"+map[bool]string{true: "on", false: "off"}[en])
	}
	want := []string{"claude-*/admin//on", "claude-haiku-*/plugin_default/anthropic/off", "claude-haiku-*/plugin_default/relay/on",
		"claude-haiku-4-5/plugin_default/relay/on", "claude-sonnet-*/admin//on", "gpt-4o/plugin_default/relay/on"}
	if fmt.Sprint(got) != fmt.Sprint(want) {
		t.Fatalf("rows\n got %v\nwant %v", got, want)
	}
	// A plugin without prices loses all its defaults.
	if err := syncDefaults(t, e, "relay", nil); err != nil {
		t.Fatal(err)
	}
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM model_prices WHERE plugin_key = 'relay'`).Scan(&n)
	if n != 0 {
		t.Fatalf("relay defaults left: %d", n)
	}

	// Invalid entries fail the sync.
	if err := syncDefaults(t, e, "anthropic", []manifest.PricingEntry{{Model: "x", Mode: "expression", Expression: "p +"}}); err == nil {
		t.Fatal("invalid expression accepted")
	}
	if err := syncDefaults(t, e, "anthropic", []manifest.PricingEntry{{Model: "x", Mode: "per_token", Config: map[string]any{"p": -1}}}); err == nil {
		t.Fatal("negative price accepted")
	}

	// Free policy.
	e.exec(`INSERT INTO settings (key, value) VALUES ('billing', '{"missing_price_policy":"free"}')`)
	e.svc.invalidate()
	if r, err := e.svc.Resolve(ctx, "gemini-2.5-pro"); r != nil || err != nil {
		t.Fatalf("free policy: %v %v", r, err)
	}
}

// TestPricePrecedence checks the ordering of price entries without a
// database (ARCHITECTURE 7.3).
func TestPricePrecedence(t *testing.T) {
	day := func(d int) *time.Time {
		v := time.Date(2026, 9, d, 0, 0, 0, 0, time.UTC)
		return &v
	}
	entry := func(id int64, source, plugin string, installed *time.Time, pattern string) priceEntry {
		return priceEntry{rule: core.PriceRule{ID: id, Pattern: pattern}, source: source, glob: isGlob(pattern),
			pluginKey: plugin, installedAt: installed}
	}
	snap := &priceSnapshot{entries: []priceEntry{
		entry(1, SourcePluginDefault, "late", day(20), "claude-sonnet-4-5"),
		entry(2, SourcePluginDefault, "early", day(1), "claude-*"),
		entry(3, SourcePluginDefault, "early", day(1), "claude-sonnet-*"),
		entry(4, SourceAdmin, "", nil, "gpt-*"),
		entry(5, SourceAdmin, "", nil, "gpt-4o"),
		entry(6, SourcePluginDefault, "gone", nil, "gemini-*"),
		entry(7, SourcePluginDefault, "late", day(20), "gemini-2.5-*"),
		entry(8, SourcePluginDefault, "b-same-day", day(5), "o3"),
		entry(9, SourcePluginDefault, "a-same-day", day(5), "o3"),
		entry(10, SourcePluginDefault, "late", day(20), "claude-opus-*"),
		entry(11, SourcePluginDefault, "early", day(1), "claude-opus-*"),
	}}
	sort.Slice(snap.entries, func(i, j int) bool { return less(snap.entries[i], snap.entries[j]) })
	cases := map[string]int64{
		"claude-sonnet-4-5": 1, // most specific pattern wins, even from a later plugin
		"claude-haiku-4":    2,
		"gpt-4o":            5, // admin exact before admin glob
		"gpt-4.1":           4,
		"gemini-2.5-pro":    7, // longer glob wins
		"gemini-1.5":        6,
		"o3":                9,  // same install time: plugin key order
		"claude-opus-4":     11, // same pattern: earliest installed plugin
	}
	for model, want := range cases {
		r := snap.match(model)
		if r == nil || r.ID != want {
			t.Errorf("match(%s) = %+v, want id %d", model, r, want)
		}
	}
	if r := snap.match("llama"); r != nil {
		t.Errorf("unexpected match %+v", r)
	}
}

// fakeGen implements the parts of core.Generation used by declaredFacts.
type fakeGen struct {
	core.Generation
	plats []core.PlatformBinding
	types []core.AccountTypeBinding
}

func (g *fakeGen) Platforms() []core.PlatformBinding       { return g.plats }
func (g *fakeGen) AccountTypes() []core.AccountTypeBinding { return g.types }

func TestDeclaredFacts(t *testing.T) {
	facts := func(keys ...string) manifest.UsageRules {
		m := map[string]manifest.UsageFact{}
		for _, k := range keys {
			m[k] = manifest.UsageFact{Type: "number"}
		}
		return manifest.UsageRules{Facts: m}
	}
	epUsage := facts("frames")
	g := &fakeGen{
		plats: []core.PlatformBinding{
			{Builtin: true, Platform: manifest.Platform{ID: "anthropic", Usage: facts("web_search")}},
			{Plugin: core.PluginInfo{Key: "img"}, Platform: manifest.Platform{ID: "img", Usage: facts("images"),
				Endpoints: []manifest.Endpoint{{Protocol: "img.gen"}, {Protocol: "img.video", Usage: &epUsage}}}},
		},
		types: []core.AccountTypeBinding{{Type: manifest.AccountType{ID: "k", Platforms: []manifest.AccountPlatform{
			{Platform: "anthropic"},
			{Platform: "img", Usage: map[string]manifest.UsageRules{"img.gen": facts("seconds"), "img.video": facts("images")}},
		}}}},
	}
	got := declaredFacts(g)
	if len(got) != 4 || !got["images"] || !got["seconds"] || !got["web_search"] || !got["frames"] {
		t.Fatalf("facts %v", got)
	}
}

func TestLedger(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	uid := e.user("a@example.com")

	res, err := e.svc.Apply(ctx, core.LedgerChange{UserID: uid, Amount: decimal.RequireFromString("20"), Credit: true, Kind: KindAdminAdjust, IdempotencyKey: "k1"})
	if err != nil || res.Duplicate || !res.BalanceAfter.Equal(decimal.NewFromInt(20)) {
		t.Fatalf("credit: %+v %v", res, err)
	}
	res2, err := e.svc.Apply(ctx, core.LedgerChange{UserID: uid, Amount: decimal.RequireFromString("0.0158"), Kind: KindUsage, IdempotencyKey: "usage:r1", RefType: "usage", RefID: "r1"})
	if err != nil || !res2.BalanceAfter.Equal(decimal.RequireFromString("19.9842")) {
		t.Fatalf("debit: %+v %v", res2, err)
	}
	dup, err := e.svc.Apply(ctx, core.LedgerChange{UserID: uid, Amount: decimal.RequireFromString("0.0158"), Kind: KindUsage, IdempotencyKey: "usage:r1"})
	if err != nil || !dup.Duplicate || dup.LedgerID != res2.LedgerID {
		t.Fatalf("duplicate: %+v %v", dup, err)
	}
	var bal decimal.Decimal
	_ = e.db.Pool.QueryRow(ctx, `SELECT balance FROM user_balances WHERE user_id = $1`, uid).Scan(&bal)
	if !bal.Equal(decimal.RequireFromString("19.9842")) {
		t.Fatalf("balance %s", bal)
	}
	var events int
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM events WHERE type = 'balance.changed'`).Scan(&events)
	if events != 2 {
		t.Fatalf("balance.changed events = %d", events)
	}
	if v, _ := e.mr.Get("balance:" + itoa(uid)); v != itoa(res2.LedgerID)+":19.9842" {
		t.Fatalf("cache = %q", v)
	}

	// An older observation never overwrites a newer one.
	e.svc.CacheBalance(ctx, uid, res.LedgerID, decimal.NewFromInt(20))
	if v, _ := e.mr.Get("balance:" + itoa(uid)); v != itoa(res2.LedgerID)+":19.9842" {
		t.Fatalf("cache regressed to %q", v)
	}

	// Validation and unknown users.
	bad := []core.LedgerChange{
		{UserID: uid, Amount: decimal.Zero, Kind: KindUsage, IdempotencyKey: "z"},
		{UserID: uid, Amount: decimal.RequireFromString("0.000000001"), Kind: KindUsage, IdempotencyKey: "z"},
		{UserID: uid, Amount: decimal.NewFromInt(1), Kind: "gift", IdempotencyKey: "z"},
		{UserID: uid, Amount: decimal.NewFromInt(1), Kind: KindUsage},
	}
	for _, ch := range bad {
		if _, err := e.svc.Apply(ctx, ch); core.AsError(err).Code != "invalid_argument" {
			t.Fatalf("%+v: err %v", ch, err)
		}
	}
	if _, err := e.svc.Apply(ctx, core.LedgerChange{UserID: 999999, Amount: decimal.NewFromInt(1), Credit: true, Kind: KindRefund, IdempotencyKey: "nouser"}); core.AsError(err).Code != "not_found" {
		t.Fatalf("unknown user: %v", err)
	}
}

func itoa(i int64) string { return decimal.NewFromInt(i).String() }

func TestBalanceGate(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	uid := e.user("gate@example.com")

	// No balance row: 0 is not above the default minimum of 0.
	if err := e.svc.CheckBalance(ctx, uid); !errors.Is(err, core.ErrInsufficientBalance) && core.AsError(err).Code != "insufficient_balance" {
		t.Fatalf("empty balance: %v", err)
	}
	e.mr.FlushAll()
	if _, err := e.svc.Apply(ctx, core.LedgerChange{UserID: uid, Amount: decimal.NewFromInt(5), Credit: true, Kind: KindAdminAdjust, IdempotencyKey: "g1"}); err != nil {
		t.Fatal(err)
	}
	if err := e.svc.CheckBalance(ctx, uid); err != nil {
		t.Fatalf("funded: %v", err)
	}
	// Cache miss falls back to PostgreSQL and repopulates the cache.
	e.mr.FlushAll()
	if err := e.svc.CheckBalance(ctx, uid); err != nil {
		t.Fatal(err)
	}
	if !e.mr.Exists("balance:" + itoa(uid)) {
		t.Fatal("cache not repopulated")
	}
	// min_balance from settings.
	e.exec(`INSERT INTO settings (key, value) VALUES ('billing', '{"min_balance":"10"}')`)
	_ = e.bus.Publish(ctx, core.ChannelConfigChanged, []byte(`{}`))
	if err := e.svc.CheckBalance(ctx, uid); core.AsError(err).Code != "insufficient_balance" {
		t.Fatalf("below minimum: %v", err)
	}
	// Overdraft through usage makes the next request fail.
	e.exec(`UPDATE settings SET value = '{"min_balance":"0"}' WHERE key = 'billing'`)
	e.svc.invalidate()
	if _, err := e.svc.Apply(ctx, core.LedgerChange{UserID: uid, Amount: decimal.NewFromInt(6), Kind: KindUsage, IdempotencyKey: "usage:x"}); err != nil {
		t.Fatal(err)
	}
	if err := e.svc.CheckBalance(ctx, uid); core.AsError(err).Code != "insufficient_balance" {
		t.Fatalf("negative balance: %v", err)
	}
	// Redis outage: the gate still answers from PostgreSQL.
	e.mr.Close()
	if err := e.svc.CheckBalance(ctx, uid); core.AsError(err).Code != "insufficient_balance" {
		t.Fatalf("redis down: %v", err)
	}
}

func TestSettingsDefaultsAndCache(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	st, err := e.svc.Settings(ctx)
	if err != nil || st.MissingPricePolicy != PolicyReject || !st.MinBalance.IsZero() || !st.BigCostWarningUSD.Equal(decimal.NewFromInt(10)) {
		t.Fatalf("defaults %+v %v", st, err)
	}
	e.svc.cacheTTL = time.Hour
	e.exec(`INSERT INTO settings (key, value) VALUES ('billing', '{"big_cost_warning_usd":"50"}')`)
	st, _ = e.svc.Settings(ctx)
	if !st.BigCostWarningUSD.Equal(decimal.NewFromInt(10)) {
		t.Fatal("expected cached value")
	}
	_ = e.bus.Publish(ctx, core.ChannelConfigChanged, nil)
	st, _ = e.svc.Settings(ctx)
	if !st.BigCostWarningUSD.Equal(decimal.NewFromInt(50)) || st.MissingPricePolicy != PolicyReject {
		t.Fatalf("after invalidation %+v", st)
	}
}

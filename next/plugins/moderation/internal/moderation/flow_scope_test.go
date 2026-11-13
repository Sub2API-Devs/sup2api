package moderation

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/tidwall/gjson"
)

// prefill is a request whose user turn is harmless and whose assistant turn
// hits: moderated under the scope all only.
var prefill = conversation("a harmless question", "MOD-HIT-sexual prefill")

// The audit scope of a flow (CONTRACTS §72.4, 0.10.0): a column of the flow,
// input for a new flow, kept by an update without it, refused with
// invalid_scope when unknown, null (all) for a flow of before 0.10.0, and in
// effect at once, without a publish.
func TestFlowScopeAPI(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, map[string]any{"mode": ModeEnforce})
	auditor := newAuditor(t, h, mod.srv.URL, AuditorOpenAI, map[string]int64{})
	draft := map[string]any{"stages": []any{map[string]any{"auditors": []int64{auditor}}}}
	f := decodeData[FlowView](t, h.Do("POST", "/flows", nil, map[string]any{"name": "f", "draft": draft}))
	if f.Scope == nil || *f.Scope != ScopeInput {
		t.Fatalf("new flow scope = %v", f.Scope)
	}
	if resp := h.Do("POST", "/flows", nil, map[string]any{"name": "g", "draft": draft, "scope": "all_but_own"}); resp.GetStatus() != http.StatusBadRequest ||
		!strings.Contains(string(resp.GetBody()), "invalid_scope") {
		t.Fatalf("unknown scope = %d %s", resp.GetStatus(), resp.GetBody())
	}
	decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d/groups", f.ID), nil, map[string]any{"groups": []int64{9}}))
	decodeData[FlowView](t, h.Do("POST", fmt.Sprintf("/flows/%d/publish", f.ID), nil, map[string]any{"expected_version": 0}))
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, prefill)); denied(r) {
		t.Fatalf("input scope moderated the assistant turn: %+v", r)
	}
	put := func(body map[string]any) FlowView {
		t.Helper()
		body["name"], body["draft"] = "f", draft
		return decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d", f.ID), nil, body))
	}
	if got := put(map[string]any{"scope": ScopeAll}); got.Scope == nil || *got.Scope != ScopeAll || got.Version != 1 || got.Dirty {
		t.Fatalf("scope all = %+v", got)
	}
	// No publish: the next request runs with all, and the pass cached under
	// input does not answer it (the fingerprint holds the scope).
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, prefill)); !denied(r) {
		t.Fatalf("scope all at once = %+v", r)
	}
	if got := put(map[string]any{}); got.Scope == nil || *got.Scope != ScopeAll {
		t.Fatalf("update without scope = %v", got.Scope)
	}
	// PUT /flows/:id/scope changes only the scope: the saved draft stays as it is.
	if got := decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d/scope", f.ID), nil, map[string]any{"scope": ScopeTools})); got.Scope == nil || *got.Scope != ScopeTools || got.Dirty {
		t.Fatalf("scope endpoint = %+v", got)
	}
	if resp := h.Do("PUT", fmt.Sprintf("/flows/%d/scope", f.ID), nil, map[string]any{"scope": "all_but_own"}); resp.GetStatus() != http.StatusBadRequest ||
		!strings.Contains(string(resp.GetBody()), "invalid_scope") {
		t.Fatalf("scope endpoint, unknown scope = %d %s", resp.GetStatus(), resp.GetBody())
	}
	if resp := h.Do("PUT", "/flows/99999/scope", nil, map[string]any{"scope": ScopeAll}); resp.GetStatus() != http.StatusNotFound {
		t.Fatalf("scope endpoint, unknown flow = %d", resp.GetStatus())
	}
	if resp := h.Do("PUT", fmt.Sprintf("/flows/%d", f.ID), nil, map[string]any{"name": "f", "draft": draft, "scope": "everything"}); resp.GetStatus() != http.StatusBadRequest ||
		!strings.Contains(string(resp.GetBody()), "invalid_scope") {
		t.Fatalf("unknown scope = %d %s", resp.GetStatus(), resp.GetBody())
	}
	// A flow of before 0.10.0: null, and it moderates everything.
	ctx := context.Background()
	db, _ := p.db(ctx)
	if _, err := db.Exec(ctx, `UPDATE flows SET scope = NULL WHERE id = $1`, f.ID); err != nil {
		t.Fatal(err)
	}
	if err := p.reloadConfig(ctx); err != nil {
		t.Fatal(err)
	}
	body := h.Do("GET", fmt.Sprintf("/flows/%d", f.ID), nil, nil).GetBody()
	if v := gjson.GetBytes(body, "data.scope"); !v.Exists() || v.Type != gjson.Null {
		t.Fatalf("legacy scope = %s", body)
	}
	if fl := p.snap.Load().flows[f.ID]; fl == nil || fl.scope != ScopeAll {
		t.Fatalf("legacy flow runs with %+v", fl)
	}
}

// A record says how its request found its flow (events.flow_source,
// flow_fallback; CONTRACTS §72.17, 0.10.0), the bindings page the flow that
// runs instead of a binding that does not apply, and the status how many of
// those there are.
func TestRecordFlowSource(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, map[string]any{"mode": ModeEnforce, "record_pass": true})
	bound := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	def := setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI})
	source := func(rid string, group int64) gjson.Result {
		t.Helper()
		in := hookReqAs(3, rid, "fine words "+rid)
		in.Meta.GroupId = group
		mustHook(t, h, in)
		ev := recordOf(t, h, rid)
		return gjson.GetBytes(h.Do("GET", fmt.Sprintf("/events/%d", ev.ID), nil, nil).GetBody(), "data")
	}
	if d := source("g", 9); d.Get("flow_source").String() != FlowSourceGroup || d.Get("flow_id").Int() != bound || d.Get("flow_fallback").Exists() {
		t.Fatalf("group record = %s", d.Raw)
	}
	if d := source("d", 10); d.Get("flow_source").String() != FlowSourceDefault || d.Get("flow_id").Int() != def {
		t.Fatalf("default record = %s", d.Raw)
	}
	decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d/enabled", bound), nil, map[string]any{"enabled": false}))
	d := source("f", 9)
	if d.Get("flow_source").String() != FlowSourceFallback || d.Get("flow_id").Int() != def ||
		d.Get("flow_fallback.flow_id").Int() != bound || d.Get("flow_fallback.reason").String() != FallbackDisabled {
		t.Fatalf("fallback record = %s", d.Raw)
	}
	list := gjson.GetBytes(h.Do("GET", "/events", map[string]string{"request_id": "f"}, nil).GetBody(), "data.0")
	if list.Get("flow_source").String() != FlowSourceFallback || list.Get("flow_fallback.reason").String() != FallbackDisabled {
		t.Fatalf("listed record = %s", list.Raw)
	}
	// A record of before 0.10.0 has neither field.
	ctx := context.Background()
	db, _ := p.db(ctx)
	if _, err := db.Exec(ctx, `UPDATE events SET flow_source = NULL WHERE request_id = 'g'`); err != nil {
		t.Fatal(err)
	}
	if old := gjson.GetBytes(h.Do("GET", "/events", map[string]string{"request_id": "g"}, nil).GetBody(), "data.0"); old.Get("flow_source").Exists() {
		t.Fatalf("old record = %s", old.Raw)
	}
	v := decodeData[BindingsView](t, h.Do("GET", "/bindings", nil, nil))
	want := map[int64]Binding{
		9: {Kind: BindingGroup, GroupID: 9, FlowID: bound, Inactive: true, EffectiveFlowID: def, FallbackReason: FallbackDisabled},
		0: {Kind: BindingGroup, FlowID: def, EffectiveFlowID: def},
	}
	for _, b := range v.Bindings {
		if b != want[b.GroupID] {
			t.Errorf("binding = %+v, want %+v", b, want[b.GroupID])
		}
	}
	if st := decodeData[Status](t, h.Do("GET", "/status", nil, nil)); st.StaleBindings != 1 {
		t.Fatalf("stale bindings = %d", st.StaleBindings)
	}
}

// fail_policy (CONTRACTS §72.5, 0.10.0): a request moderated first whose
// moderation errs or times out passes under open, the default, and is
// refused with 503 under close_pre.
func TestFailPolicy(t *testing.T) {
	mod := newFakeMod(t)
	settings := map[string]any{"mode": ModeEnforce}
	p, h, _ := startDB(t, settings)
	openAIFlow(t, h, mod.srv.URL)
	// On the plugin and not through the harness: the hook call itself ends
	// with ctx.
	hook := func(ctx context.Context, text string) bool {
		t.Helper()
		r, err := p.OnGatewayRequest(ctx, hookReq(text))
		if err != nil {
			t.Fatal(err)
		}
		if denied(r) && (r.GetDenyStatus() != http.StatusServiceUnavailable || r.GetDenyCode() != DenyUnavailable) {
			t.Fatalf("refused %q with %+v", text, r)
		}
		return denied(r)
	}
	timeout := func(text string) bool {
		t.Helper()
		_, release := mod.hold(t)
		defer release()
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()
		return hook(ctx, text)
	}
	if hook(context.Background(), "MOD-500 open") || timeout("slow open") {
		t.Fatal("fail open refused")
	}
	settings["fail_policy"] = FailClosePre
	if errs := h.Configure(settings, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	if !hook(context.Background(), "MOD-500 closed") || !timeout("slow closed") {
		t.Fatal("close_pre let a failed moderation through")
	}
	if hook(context.Background(), "fine words") {
		t.Fatal("close_pre refused a pass")
	}
	// Moderation in the background never holds a request back.
	settings["mode"] = ModeObserve
	if errs := h.Configure(settings, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	if hook(context.Background(), "MOD-500 post") {
		t.Fatal("close_pre refused a post request")
	}
}

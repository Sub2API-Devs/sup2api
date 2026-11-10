package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// bindingSnapshot builds a snapshot with the live flows and the bindings
// {group, account, flow} as loadSnapshot registers them (account 0 = a
// group binding).
func bindingSnapshot(live []int64, bindings ...[3]int64) *snapshot {
	s := emptySnapshot()
	for _, id := range live {
		s.flows[id] = &liveFlow{ID: id}
	}
	for _, b := range bindings {
		if b[1] == 0 {
			s.bindGroup(b[0], b[2])
		} else {
			s.bindAccount(accountKey{b[0], b[1]}, b[2])
		}
	}
	return s
}

// The most specific binding decides (CONTRACTS §72.17): the account within
// the group, the account in any group, the group, the default group. A
// binding to flow 0 exempts; a binding to a flow that is disabled or
// unpublished (not in snapshot.flows) counts as absent. The same cases as
// ui/native/src/bindingOps.spec.ts.
func TestFlowForAccount(t *testing.T) {
	// Flows 1-3 are live, 4 and 5 are disabled or unpublished.
	live := []int64{1, 2, 3}
	s := bindingSnapshot(live, [3]int64{0, 0, 1}, [3]int64{9, 0, 2}, [3]int64{10, 0, 0},
		[3]int64{9, 7, 3}, [3]int64{0, 7, 0}, [3]int64{0, 8, 3})
	type want struct {
		group, account int64
		flow           int64 // 0 = not moderated
	}
	check := func(t *testing.T, s *snapshot, cases ...want) {
		t.Helper()
		for _, tc := range cases {
			var got int64
			if f := s.flowForAccount(tc.group, tc.account); f != nil {
				got = f.ID
			}
			if got != tc.flow {
				t.Errorf("flowForAccount(%d, %d) = flow %d, want %d", tc.group, tc.account, got, tc.flow)
			}
		}
	}
	check(t, s,
		want{9, 7, 3},  // group + account beats the account
		want{5, 7, 0},  // the account is exempt elsewhere
		want{9, 8, 3},  // the account beats the group
		want{10, 8, 3}, // ... and a group bound to no flow
		want{9, 6, 2},  // the group
		want{5, 6, 1},  // the default
		want{10, 6, 0},
	)
	if !s.perAccount(5) || !s.perAccount(9) {
		t.Fatal("an any-group account binding makes every group per account")
	}
	g := bindingSnapshot(live, [3]int64{0, 0, 1}, [3]int64{9, 7, 3})
	if !g.perAccount(9) || g.perAccount(5) {
		t.Fatal("a group + account binding makes only its group per account")
	}
	if emptySnapshot().perAccount(0) {
		t.Fatal("no account binding, no group per account")
	}

	t.Run("group bound to a disabled flow takes the default flow", func(t *testing.T) {
		s := bindingSnapshot(live, [3]int64{0, 0, 1}, [3]int64{9, 0, 4})
		check(t, s, want{9, 6, 1}, want{9, 0, 1})
		if f := s.flowFor(9); f == nil || f.ID != 1 {
			t.Fatalf("flowFor(9) = %+v", f)
		}
		// The console still lists the group under the disabled flow.
		if got := s.groupsOf(4); len(got) != 1 || got[0] != 9 {
			t.Fatalf("groupsOf(4) = %v", got)
		}
	})
	t.Run("group bound to an unpublished flow falls back", func(t *testing.T) {
		// An unpublished flow is not in snapshot.flows either; without a
		// default flow nothing is left.
		check(t, bindingSnapshot(live, [3]int64{0, 0, 2}, [3]int64{9, 0, 5}), want{9, 6, 2})
		check(t, bindingSnapshot(live, [3]int64{9, 0, 5}), want{9, 6, 0})
	})
	t.Run("group + account bound to a disabled flow takes the account binding", func(t *testing.T) {
		s := bindingSnapshot(live, [3]int64{0, 0, 1}, [3]int64{9, 0, 2}, [3]int64{9, 7, 4}, [3]int64{0, 7, 3})
		check(t, s, want{9, 7, 3})
	})
	t.Run("both account bindings disabled take the group flow", func(t *testing.T) {
		s := bindingSnapshot(live, [3]int64{0, 0, 1}, [3]int64{9, 0, 2}, [3]int64{9, 7, 4}, [3]int64{0, 7, 5})
		check(t, s, want{9, 7, 2}, want{5, 7, 1})
		// Bindings that do not apply do not send the group to the attempts.
		if s.perAccount(9) || s.perAccount(5) {
			t.Fatal("inactive account bindings made a group per account")
		}
	})
	t.Run("every level disabled or absent is not moderated", func(t *testing.T) {
		s := bindingSnapshot(live, [3]int64{0, 0, 4}, [3]int64{9, 0, 5}, [3]int64{9, 7, 4}, [3]int64{0, 7, 5})
		check(t, s, want{9, 7, 0}, want{9, 6, 0}, want{5, 6, 0})
		check(t, bindingSnapshot(live), want{9, 7, 0})
	})
	t.Run("flow 0 exempts and does not fall back", func(t *testing.T) {
		s := bindingSnapshot(live, [3]int64{0, 0, 1}, [3]int64{9, 0, 2}, [3]int64{9, 7, 0}, [3]int64{0, 7, 3})
		check(t, s, want{9, 7, 0}, want{5, 7, 3})
		if !s.perAccount(9) {
			t.Fatal("an exempt account binding makes its group per account")
		}
		// An exempt group does not fall back to the default either.
		check(t, bindingSnapshot(live, [3]int64{0, 0, 1}, [3]int64{10, 0, 0}), want{10, 6, 0})
	})
}

func TestAttemptRuns(t *testing.T) {
	now := time.Unix(1000, 0)
	a := newAttemptRuns(func() time.Time { return now })
	if _, left := a.get("r1"); left {
		t.Fatal("unknown request left to the attempts")
	}
	a.leave("r1")
	if flows, left := a.get("r1"); !left || len(flows) != 0 {
		t.Fatalf("left = %v %v", flows, left)
	}
	a.add("r1", 3)
	a.add("r1", 3)
	a.add("r2", 4)
	if flows, _ := a.get("r1"); len(flows) != 1 || flows[0] != 3 {
		t.Fatalf("flows = %v", flows)
	}
	// One TTL later the entries are in the previous generation, still found
	// and moved forward when a flow is added; two TTLs later they are gone.
	now = now.Add(attemptRunsTTL)
	a.add("r1", 5)
	if flows, left := a.get("r2"); !left || len(flows) != 1 {
		t.Fatalf("previous generation lost: %v %v", flows, left)
	}
	now = now.Add(attemptRunsTTL)
	a.add("r3", 1)
	if _, left := a.get("r2"); left {
		t.Fatal("expired request still known")
	}
	if flows, _ := a.get("r1"); len(flows) != 2 {
		t.Fatalf("r1 = %v", flows)
	}
}

func TestAttemptHookGranted(t *testing.T) {
	for scope, want := range map[string]bool{
		`{"points":["gateway.request","gateway.attempt"],"fields":["model"]}`: true,
		`{"points":["gateway.request"]}`:                                      false,
		`{"fields":["model"]}`:                                                true, // no point restriction
		`not json`:                                                            false,
	} {
		cfg := pluginsdk.Config{Grants: []pluginsdk.Grant{{Permission: "gateway.hook", Scope: json.RawMessage(scope)}}}
		if got := attemptHookGranted(cfg); got != want {
			t.Errorf("scope %s: %v, want %v", scope, got, want)
		}
	}
	if attemptHookGranted(pluginsdk.Config{}) {
		t.Error("granted without gateway.hook")
	}
}

var attemptGrants = []*pluginv1.Grant{{Permission: "gateway.hook", ScopeJson: `{"points":["gateway.request","gateway.attempt"]}`}}

// attemptReq is the gateway.attempt call of request rid on account.
func attemptReq(rid string, group, account int64, text string) *pluginv1.GatewayRequestHookRequest {
	in := hookReqAs(3, rid, text)
	in.HookId, in.Meta.GroupId, in.Meta.AccountId = HookAttempt, group, account
	return in
}

// requestReq is the gateway.request call of the moderation hook.
func requestReq(rid string, group int64, text string) *pluginv1.GatewayRequestHookRequest {
	in := hookReqAs(3, rid, text)
	in.HookId, in.Meta.GroupId = HookModeration, group
	return in
}

func putBinding(t *testing.T, h *pluginsdktest.Harness, group, account, flow int64) BindingsView {
	t.Helper()
	return decodeData[BindingsView](t, h.Do("PUT", "/bindings", nil, map[string]any{"group_id": group, "account_id": account, "flow_id": flow, "replace": true}))
}

func noteFlow(r *pluginv1.GatewayRequestHookResponse, flow int64) bool {
	return strings.Contains(r.GetNote(), fmt.Sprintf(" flow=%d ", flow))
}

// Upgrade compatibility (§72.17): the group bindings of 0.6.x keep their
// meaning - a group with its own binding uses its flow, any other group the
// default flow, an exempt group (flow 0) is not moderated - and the request
// hook settles every such request, so the attempt hook adds nothing. Since
// 0.8.0 a group bound to a disabled flow falls back to the default flow.
func TestUpgradeKeepsGroupBindings(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	if errs := h.Configure(map[string]any{"mode": ModeEnforce}, attemptGrants); len(errs) > 0 {
		t.Fatal(errs)
	}
	def := setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI})
	own := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	off := setupFlow(t, h, mod.srv.URL, []int64{10}, CombineAny, []string{AuditorOpenAI})
	decodeData[map[string]any](t, h.Do("PUT", fmt.Sprintf("/flows/%d/enabled", off), nil, map[string]any{"enabled": false}))
	putBinding(t, h, 12, 0, 0) // group 12 is exempt
	if !p.attemptHook.Load() {
		t.Fatal("attempt hook grant not seen")
	}
	for _, tc := range []struct {
		group int64
		flow  int64 // 0 = not moderated
	}{{9, own}, {11, def}, {0, def}, {10, def}, {12, 0}} {
		r := mustHook(t, h, requestReq("", tc.group, fmt.Sprintf("MOD-HIT-sexual group %d", tc.group)))
		if !r.GetSkipAttemptHooks() {
			t.Fatalf("group %d: request hook did not settle the request: %+v", tc.group, r)
		}
		if tc.flow == 0 {
			if denied(r) || r.GetNote() != "" {
				t.Fatalf("group %d moderated: %+v", tc.group, r)
			}
			continue
		}
		if !denied(r) || !noteFlow(r, tc.flow) {
			t.Fatalf("group %d: %+v, want a hit of flow %d", tc.group, r, tc.flow)
		}
	}
	// The attempt hook, should the core call it anyway, does not moderate again.
	before := len(mod.moderated())
	if r := mustHook(t, h, attemptReq("", 9, 7, "MOD-HIT-sexual again")); denied(r) || r.GetNote() != "" {
		t.Fatalf("attempt hook moderated a group-bound request: %+v", r)
	}
	if len(mod.moderated()) != before {
		t.Fatal("attempt hook called the auditor")
	}
	v := decodeData[BindingsView](t, h.Do("GET", "/bindings", nil, nil))
	if !v.AccountBindingsActive || len(v.Bindings) != 4 {
		t.Fatalf("bindings = %+v", v)
	}
	for _, b := range v.Bindings {
		if b.Kind != BindingGroup || b.AccountID != 0 {
			t.Fatalf("binding %+v is not a group binding", b)
		}
		// Only the binding to the disabled flow is inactive; the exempt
		// one applies.
		if b.Inactive != (b.GroupID == 10) {
			t.Fatalf("binding %+v: inactive = %v", b, b.Inactive)
		}
	}
	// Once the flow is enabled again its binding applies as before.
	decodeData[map[string]any](t, h.Do("PUT", fmt.Sprintf("/flows/%d/enabled", off), nil, map[string]any{"enabled": true}))
	if r := mustHook(t, h, requestReq("", 10, "MOD-HIT-sexual group 10 again")); !denied(r) || !noteFlow(r, off) {
		t.Fatalf("group 10 after enabling its flow: %+v", r)
	}
}

// Account bindings that all point to a disabled flow do not apply, so they
// do not leave the group to the attempts: the request hook moderates by the
// group and settles the request. GET /bindings marks them inactive.
func TestInactiveAccountBindingDoesNotDeferToAttempt(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	if errs := h.Configure(map[string]any{"mode": ModeEnforce}, attemptGrants); len(errs) > 0 {
		t.Fatal(errs)
	}
	def := setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI})
	off := setupFlow(t, h, mod.srv.URL, nil, CombineAny, []string{AuditorOpenAI})
	auds := decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil))
	draft := decodeData[FlowView](t, h.Do("POST", "/flows", nil, map[string]any{"name": "draft",
		"draft": map[string]any{"stages": []any{map[string]any{"auditors": []int64{auds[0].ID}}}}}))
	putBinding(t, h, 9, 7, off)
	putBinding(t, h, 0, 8, off)
	putBinding(t, h, 9, 6, draft.ID) // never published

	// While the flow is enabled the group is left to the attempts.
	if r := mustHook(t, h, requestReq("a1", 9, "MOD-HIT-sexual")); denied(r) || r.GetSkipAttemptHooks() || r.GetNote() != notePrefix+"per account" {
		t.Fatalf("active account binding = %+v", r)
	}
	if r := mustHook(t, h, attemptReq("a1", 9, 7, "MOD-HIT-sexual")); !denied(r) || !noteFlow(r, off) {
		t.Fatalf("attempt on the bound account = %+v", r)
	}

	decodeData[map[string]any](t, h.Do("PUT", fmt.Sprintf("/flows/%d/enabled", off), nil, map[string]any{"enabled": false}))
	if s := p.snap.Load(); s.perAccount(9) || s.perAccount(5) || len(s.byAccount) != 0 {
		t.Fatalf("inactive bindings in the snapshot: %+v", s.byAccount)
	}
	for _, group := range []int64{9, 5} {
		r := mustHook(t, h, requestReq("", group, fmt.Sprintf("MOD-HIT-sexual inactive %d", group)))
		if !denied(r) || !r.GetSkipAttemptHooks() || !noteFlow(r, def) {
			t.Fatalf("group %d: %+v, want a hit of the default flow settled by the request hook", group, r)
		}
	}
	// The attempt hook has nothing left to do for these requests.
	n := len(mod.moderated())
	mustHook(t, h, requestReq("a2", 9, "MOD-HIT-violence"))
	if r := mustHook(t, h, attemptReq("a2", 9, 7, "MOD-HIT-violence")); denied(r) || r.GetNote() != "" || len(mod.moderated()) != n+1 {
		t.Fatalf("attempt after the request hook settled = %+v", r)
	}

	v := decodeData[BindingsView](t, h.Do("GET", "/bindings", nil, nil))
	if len(v.Bindings) != 4 {
		t.Fatalf("bindings = %+v", v.Bindings)
	}
	for _, b := range v.Bindings {
		if want := b.AccountID != 0; b.Inactive != want {
			t.Fatalf("binding %+v: inactive = %v, want %v", b, b.Inactive, want)
		}
	}
	// The list a write answers with carries the mark too, and an exempt
	// binding is never inactive.
	v = putBinding(t, h, 9, 7, 0)
	for _, b := range v.Bindings {
		if want := b.AccountID != 0 && b.FlowID != 0; b.Inactive != want {
			t.Fatalf("binding %+v after the write: inactive = %v, want %v", b, b.Inactive, want)
		}
	}
	// A binding whose flow row is gone is inactive as well (a deleted flow
	// normally takes its bindings with it).
	db, err := p.db(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(context.Background(), `INSERT INTO flow_accounts (group_id, account_id, flow_id) VALUES (3, 4, 99999)`); err != nil {
		t.Fatal(err)
	}
	v = decodeData[BindingsView](t, h.Do("GET", "/bindings", nil, nil))
	found := false
	for _, b := range v.Bindings {
		if b.FlowID == 99999 {
			found = b.Inactive
		}
	}
	if !found {
		t.Fatalf("binding to a missing flow not inactive: %+v", v.Bindings)
	}
}

// With account bindings the attempts moderate: an exempt account passes, a
// failover to an account that is moderated runs the flow before the request
// is sent to it, and a flow runs once per request.
func TestAccountBindingsModerateEachAttempt(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	if errs := h.Configure(map[string]any{"mode": ModeEnforce}, attemptGrants); len(errs) > 0 {
		t.Fatal(errs)
	}
	def := setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI})
	strict := setupFlow(t, h, mod.srv.URL, nil, CombineAny, []string{AuditorOpenAI})
	putBinding(t, h, 0, 7, 0) // account 7 is exempt in every group

	calls := func() int { return len(mod.moderated()) }
	r := mustHook(t, h, requestReq("r1", 9, "MOD-HIT-sexual"))
	if denied(r) || r.GetSkipAttemptHooks() || r.GetNote() != notePrefix+"per account" || calls() != 0 {
		t.Fatalf("request hook = %+v (calls %d)", r, calls())
	}
	if r := mustHook(t, h, attemptReq("r1", 9, 7, "MOD-HIT-sexual")); denied(r) || calls() != 0 {
		t.Fatalf("exempt account = %+v (calls %d)", r, calls())
	}
	if r := mustHook(t, h, attemptReq("r1", 9, 8, "MOD-HIT-sexual")); !denied(r) || !noteFlow(r, def) {
		t.Fatalf("failover to a moderated account = %+v", r)
	}

	// A clean request: the second account of the same flow is not moderated again.
	mustHook(t, h, requestReq("r2", 9, "fine words"))
	if r := mustHook(t, h, attemptReq("r2", 9, 8, "fine words")); denied(r) || !noteFlow(r, def) {
		t.Fatalf("first attempt = %+v", r)
	}
	n := calls()
	if r := mustHook(t, h, attemptReq("r2", 9, 6, "fine words")); denied(r) || r.GetNote() != "" || calls() != n {
		t.Fatalf("same flow moderated twice: %+v", r)
	}

	// Group + account beats the account binding.
	putBinding(t, h, 9, 7, strict)
	mustHook(t, h, requestReq("r3", 9, "MOD-HIT-violence"))
	if r := mustHook(t, h, attemptReq("r3", 9, 7, "MOD-HIT-violence")); !denied(r) || !noteFlow(r, strict) {
		t.Fatalf("group + account = %+v", r)
	}
	mustHook(t, h, requestReq("r4", 12, "MOD-HIT-violence"))
	if r := mustHook(t, h, attemptReq("r4", 12, 7, "MOD-HIT-violence")); denied(r) {
		t.Fatalf("account 7 outside group 9 = %+v", r)
	}

	v := decodeData[BindingsView](t, h.Do("GET", "/bindings", nil, nil))
	kinds := map[string]Binding{}
	for _, b := range v.Bindings {
		kinds[b.Kind] = b
	}
	if len(v.Bindings) != 3 || kinds[BindingGroupAccount].FlowID != strict || kinds[BindingAccount].FlowID != 0 || kinds[BindingGroup].FlowID != def {
		t.Fatalf("bindings = %+v", v.Bindings)
	}
	flows := decodeData[[]FlowView](t, h.Do("GET", "/flows", nil, nil))
	for _, f := range flows {
		if f.ID == strict && (len(f.Accounts) != 1 || f.Accounts[0] != AccountBinding{GroupID: 9, AccountID: 7}) {
			t.Fatalf("flow accounts = %+v", f.Accounts)
		}
	}
	// A binding to another flow is not replaced silently; a bound enabled flow is not deleted.
	if resp := h.Do("PUT", "/bindings", nil, map[string]any{"group_id": 9, "account_id": 7, "flow_id": def}); resp.GetStatus() != 409 ||
		!strings.Contains(string(resp.GetBody()), "binding_exists") {
		t.Fatalf("conflict = %d %s", resp.GetStatus(), resp.GetBody())
	}
	if resp := h.Do("DELETE", fmt.Sprintf("/flows/%d", strict), nil, nil); resp.GetStatus() != 409 {
		t.Fatalf("delete bound flow = %d %s", resp.GetStatus(), resp.GetBody())
	}
	if resp := h.Do("PUT", "/bindings", nil, map[string]any{"group_id": 0, "account_id": 5, "flow_id": 999}); resp.GetStatus() != 404 {
		t.Fatalf("missing flow = %d %s", resp.GetStatus(), resp.GetBody())
	}
	decodeData[BindingsView](t, h.Do("DELETE", "/bindings/9/7", nil, nil))
	if resp := h.Do("DELETE", "/bindings/9/7", nil, nil); resp.GetStatus() != 404 {
		t.Fatalf("delete twice = %d", resp.GetStatus())
	}

	// Without the gateway.attempt grant the account bindings are not applied:
	// the request hook moderates by group and settles the request.
	if errs := h.Configure(map[string]any{"mode": ModeEnforce}, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	r = mustHook(t, h, requestReq("r5", 9, "MOD-HIT-sexual"))
	if !denied(r) || !r.GetSkipAttemptHooks() || !noteFlow(r, def) {
		t.Fatalf("no grant = %+v", r)
	}
	if v := decodeData[BindingsView](t, h.Do("GET", "/bindings", nil, nil)); v.AccountBindingsActive {
		t.Fatal("account bindings reported active without the grant")
	}
}

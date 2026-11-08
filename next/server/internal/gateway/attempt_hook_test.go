package gateway

import (
	"context"
	"strings"
	"testing"

	"github.com/coder/websocket"
	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// addPluginHook registers hook h of plugin key (env.addHook always uses "guard").
func (e *env) addPluginHook(key string, h manifest.Hook, granted []string, client core.HookPlugin) {
	info := core.PluginInfo{Key: key, Version: "0.1.0", Manifest: &manifest.Manifest{Key: key, Hooks: []manifest.Hook{h}}}
	e.gen.hooks = append(e.gen.hooks, core.HookBinding{Plugin: info, Hook: h, GrantedFields: granted, Client: client})
}

func attemptHook(id string) manifest.Hook {
	return manifest.Hook{ID: id, Point: pointGatewayAttempt, Order: 100, Needs: []string{"model"}, TimeoutMs: 300, Failure: "open"}
}

func allowResp() *pluginv1.GatewayRequestHookResponse {
	return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW}
}

func denyAccount(id int64) func(context.Context, *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
	return func(_ context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
		if in.GetMeta().GetAccountId() == id {
			return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_DENY,
				DenyStatus: 451, DenyCode: "checked_blocked", DenyMessage: "blocked for this account", Note: "per account"}, nil
		}
		return allowResp(), nil
	}
}

// Every attempt, failover included, calls the attempt hook with the account
// it is about to use; the request hook runs once without one.
func TestAttemptHookRunsOnEveryAttempt(t *testing.T) {
	e := newEnv(t)
	e.up.set("acc-1", &upstreamRule{status: 429})
	req := &fakeHook{}
	att := &fakeHook{}
	e.addPluginHook("mod", guardHook(300, "open"), []string{"model"}, req)
	e.addPluginHook("mod", attemptHook("per-account"), []string{"model"}, att)

	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if req.count() != 1 || req.calls[0].GetMeta().GetAccountId() != 0 {
		t.Fatalf("request hook calls %v", req.calls)
	}
	if att.count() != 2 {
		t.Fatalf("attempt hook calls %d", att.count())
	}
	for i, want := range []int64{1, 2} {
		in := att.calls[i]
		if in.GetMeta().GetAccountId() != want || in.GetHookId() != "per-account" || in.GetFields()["model"] != `"`+testModel+`"` ||
			in.GetMeta().GetGroupId() != testGroup {
			t.Fatalf("attempt %d: %+v", i, in)
		}
	}
	rec := e.record()
	d := rec.HookDecisions
	if len(d) != 3 || d[0].AccountID != 0 || d[1].AccountID != 1 || d[2].AccountID != 2 || d[2].HookID != "per-account" || d[2].Decision != decisionAllow {
		t.Fatalf("decisions %+v", d)
	}
	// Calls of an attempt carry its account too.
	if b := e.plat.builds; len(b) != 2 || b[0].GetMeta().GetAccountId() != 1 || b[1].GetMeta().GetAccountId() != 2 {
		t.Fatalf("build meta %v", b)
	}
}

// A deny at an attempt ends the request: no other account is tried.
func TestAttemptHookDenyStopsFailover(t *testing.T) {
	e := newEnv(t)
	e.up.set("acc-1", &upstreamRule{status: 429})
	e.addPluginHook("mod", attemptHook("per-account"), []string{"model"}, &fakeHook{fn: denyAccount(2)})

	r := e.messages(body(testModel, false))
	if r.status != 451 || r.json().Get("error.code").String() != "checked_blocked" {
		t.Fatalf("deny: %d %s", r.status, r.body)
	}
	if k := e.up.keys(); strings.Join(k, ",") != "acc-1" {
		t.Fatalf("upstream calls %v", k)
	}
	rec := e.record()
	if rec.ErrorType != errTypeBlockedByHook || rec.Attempts != 1 || rec.Billable || len(rec.HookDecisions) != 2 ||
		rec.HookDecisions[1].Decision != decisionDeny || rec.HookDecisions[1].AccountID != 2 {
		t.Fatalf("record %+v", rec)
	}
}

// skip_attempt_hooks from a plugin's request hook drops that plugin's
// attempt hooks for the request, and only that plugin's.
func TestAttemptHookSkippedByRequestHook(t *testing.T) {
	e := newEnv(t)
	settle := &fakeHook{fn: func(context.Context, *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
		return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW, SkipAttemptHooks: true}, nil
	}}
	own := &fakeHook{}
	other := &fakeHook{}
	e.addPluginHook("mod", guardHook(300, "open"), []string{"model"}, settle)
	e.addPluginHook("mod", attemptHook("per-account"), []string{"model"}, own)
	e.addPluginHook("other", attemptHook("audit"), []string{"model"}, other)

	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	e.record()
	if own.count() != 0 || other.count() != 1 {
		t.Fatalf("own %d other %d", own.count(), other.count())
	}
	// A request hook that fails sets nothing: the attempt hook still runs.
	settle.fn = func(context.Context, *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
		return nil, context.DeadlineExceeded
	}
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	e.record()
	if own.count() != 1 {
		t.Fatalf("attempt hook after a failed request hook: %d", own.count())
	}
}

// An attempt hook cannot patch the body: the hook fails per its mode.
func TestAttemptHookPatchRefused(t *testing.T) {
	e := newEnv(t)
	patcher := func(context.Context, *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
		return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW,
			Patches: []*pluginv1.BodyPatch{{Op: pluginv1.BodyPatch_OP_SET, Path: "max_tokens", ValueJson: "1"}}}, nil
	}
	h := attemptHook("patcher")
	h.Needs = []string{"max_tokens"}
	e.addPluginHook("mod", h, []string{"max_tokens"}, &fakeHook{fn: patcher})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("open: %d %s", r.status, r.body)
	}
	if got := gjson.GetBytes(e.up.last().body, "max_tokens").Int(); got != 64 {
		t.Fatalf("body patched by an attempt hook: max_tokens %d", got)
	}
	if d := e.record().HookDecisions; len(d) != 1 || d[0].Decision != decisionErrorOpen || !strings.Contains(d[0].Note, "cannot patch") {
		t.Fatalf("decisions %+v", d)
	}
}

// Every WebSocket turn runs the attempt hook on the connection's account; a
// deny ends the turn and keeps the connection.
func TestAttemptHookOnWebSocketTurns(t *testing.T) {
	e := newWSEnv(t)
	att := &fakeHook{fn: func(_ context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
		if strings.Contains(in.GetFields()["input"], "forbidden") {
			return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_DENY, DenyCode: "checked_blocked"}, nil
		}
		return allowResp(), nil
	}}
	h := attemptHook("per-account")
	h.Needs = []string{"input"}
	e.addPluginHook("mod", h, []string{"input"}, att)
	c := e.mustDial()
	c.send(create(wsModel, "hello"))
	c.until("response.completed")
	e.record()
	c.send(create(wsModel, "forbidden"))
	if ev := c.until("error"); ev[0].Get("status").Int() != 403 || ev[0].Get("error.code").String() != "checked_blocked" {
		t.Fatalf("denied turn: %v", ev)
	}
	if r := e.record(); r.ErrorType != errTypeBlockedByHook {
		t.Fatalf("denied turn record: %+v", r)
	}
	c.send(create(wsModel, "again"))
	c.until("response.completed")
	e.record()
	if att.count() != 3 {
		t.Fatalf("attempt hook calls %d", att.count())
	}
	for _, in := range att.calls {
		if in.GetMeta().GetAccountId() != 11 {
			t.Fatalf("turn account %d", in.GetMeta().GetAccountId())
		}
	}
	if _, msgs := e.wsUp.snapshot(); len(msgs) != 2 {
		t.Fatalf("denied turn reached the upstream: %v", msgs)
	}
	c.conn.Close(websocket.StatusNormalClosure, "")
}

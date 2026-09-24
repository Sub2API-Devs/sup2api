package guard

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// Without a database a rules.changed broadcast cannot reload: the handler
// reports the error and keeps the current rules.
func TestRulesChangedWithoutDB(t *testing.T) {
	p := New()
	h := pluginsdktest.Start(t, p, pluginsdktest.Options{SDK: sdkOpts()})
	setRules(t, p, Rule{ID: 1, Name: "x", Kind: KindKeyword, Pattern: "blockme", Enabled: true})
	if err := h.Deliver(TopicRulesChanged, nil, "node-2"); err == nil {
		t.Fatal("reload without database should fail")
	}
	if len(p.rules.Load().rules) != 1 {
		t.Fatal("failed reload must keep the current rules")
	}
	if err := h.Deliver("other.topic", nil, "node-2"); err != nil {
		t.Fatalf("unknown topic: %v", err)
	}
	if resp := h.Do("PUT", "/rules", nil, `{"rules":[]}`); resp.GetStatus() != 503 || len(h.Host.Published()) != 0 {
		t.Fatalf("PUT without db = %d, published %v", resp.GetStatus(), h.Host.Published())
	}
}

// Two "nodes" share one schema: a PUT /rules on node 1 is broadcast and node
// 2 reloads at once, long before its polling period.
func TestRulesChangedBroadcast(t *testing.T) {
	dsn, schema := pluginsdktest.NewSchema(t, "plg_guard_bc")
	pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))
	host1, host2 := pluginsdktest.NewFakeHost(), pluginsdktest.NewFakeHost()
	host1.SetDSN(dsn, schema)
	host2.SetDSN(dsn, schema)
	p1, p2 := New(), New()
	p2.reloadEvery = time.Hour // only the broadcast can make node 2 reload
	h1 := pluginsdktest.Start(t, p1, pluginsdktest.Options{Host: host1, SDK: sdkOpts()})
	h2 := pluginsdktest.Start(t, p2, pluginsdktest.Options{Host: host2, SDK: sdkOpts()})
	delivered := make(chan error, 4)
	host1.OnPublish = func(m pluginsdktest.PublishedMessage) { delivered <- h2.Deliver(m.Topic, m.Payload, "node-1") }

	ctx := context.Background()
	if r, _ := h2.Hook.OnGatewayRequest(ctx, hookReq("BROADCAST_WORD")); r.GetDecision() != pluginv1.GatewayRequestHookResponse_DECISION_ALLOW {
		t.Fatal("no rule yet")
	}
	resp := h1.Do("PUT", "/rules", nil, map[string]any{"rules": []map[string]any{
		{"name": "bc", "kind": "keyword", "pattern": "BROADCAST_WORD", "enabled": true},
	}})
	if resp.GetStatus() != 200 {
		t.Fatalf("PUT = %d %s", resp.GetStatus(), resp.GetBody())
	}
	if pub := host1.Published(); len(pub) != 1 || pub[0].Topic != TopicRulesChanged {
		t.Fatalf("published = %+v", pub)
	}
	select {
	case err := <-delivered:
		if err != nil {
			t.Fatalf("deliver: %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("broadcast not delivered")
	}
	if r, _ := h2.Hook.OnGatewayRequest(ctx, hookReq("say BROADCAST_WORD")); r.GetDecision() != pluginv1.GatewayRequestHookResponse_DECISION_DENY {
		t.Fatal("node 2 must block right after the broadcast")
	}
	// Rejected PUTs do not broadcast.
	if bad := h1.Do("PUT", "/rules", nil, `{"rules":[{"kind":"regex","pattern":"("}]}`); bad.GetStatus() != 400 || len(host1.Published()) != 1 {
		t.Fatalf("bad PUT = %d, published %d", bad.GetStatus(), len(host1.Published()))
	}
}

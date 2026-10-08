package gateway

import (
	"context"
	"encoding/json"
	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCacheWriteEvidenceHTTPPreservesProviderSuccess(t *testing.T) {
	raw := `{"id":"msg-cache","type":"message","role":"assistant","model":"` + testModel + `","content":[],"stop_reason":"end_turn","usage":{"input_tokens":218,"output_tokens":380,"cache_creation_input_tokens":2595,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":1376}}}`
	e := newEnv(t)
	for _, key := range []string{"acc-1", "acc-2", "acc-3"} {
		e.up.set(key, &upstreamRule{status: 200, body: raw})
	}
	got := e.messages(map[string]any{"model": testModel, "max_tokens": 10, "messages": []any{map[string]any{"role": "user", "content": "fixture"}}})
	if got.status != 200 || string(got.body) != raw {
		t.Fatal("response changed", got.status)
	}
	rec := e.record()
	evidence, ok := rec.Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
	if !ok || *evidence.UnclassifiedTokens != 1219 || rec.Tokens.CacheCreation != 1219 || rec.Tokens.CacheCreation1h != 1376 || !rec.Success {
		t.Fatal("usage facts lost", rec.Tokens, rec.Metrics)
	}
}

func TestCacheWriteEvidenceSSEPreservesBytes(t *testing.T) {
	raw := "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":2,\"output_tokens\":0,\"cache_creation_input_tokens\":1376,\"cache_creation\":{\"ephemeral_5m_input_tokens\":0,\"ephemeral_1h_input_tokens\":1376}}}}\n\nevent: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\"},\"usage\":{\"input_tokens\":218,\"output_tokens\":380,\"cache_creation_input_tokens\":2595}}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"
	e := newEnv(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Write([]byte(raw))
	}))
	defer server.Close()
	e.plat.base = server.URL
	got := e.messages(map[string]any{"model": testModel, "max_tokens": 10, "stream": true, "messages": []any{map[string]any{"role": "user", "content": "fixture"}}})
	if got.status != 200 || string(got.body) != raw {
		t.Fatal("stream changed", got.status)
	}
	rec := e.record()
	ev := rec.Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
	if ev.Source != "sse" || *ev.UnclassifiedTokens != 1219 || !rec.Success {
		t.Fatal(ev)
	}
}

func TestCacheWriteEvidenceHelperCallsRemainSeparate(t *testing.T) {
	var rules manifest.UsageRules
	for _, p := range platforms.Builtin() {
		if p.ID == "anthropic" {
			rules = p.Usage
		}
	}
	c := &call{rec: &core.UsageRecord{Model: "model", UpstreamModel: "model"}}
	a := &wire.AccountingEvidence{Source: wire.AccountingProviderCalls, Known: true, Complete: false, Calls: []wire.AccountingCall{
		{Complete: true, Frames: []json.RawMessage{json.RawMessage(`{"usage":{"input_tokens":2,"output_tokens":8,"cache_creation_input_tokens":2595,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":1376}}}`)}},
		{Complete: false, Frames: []json.RawMessage{json.RawMessage(`{"usage":{"input_tokens":3,"output_tokens":0,"cache_creation_input_tokens":5}}`)}},
	}}
	c.applyHelperAccounting(a, &typeRoute{usage: rules})
	if len(c.rec.Replacement) != 2 {
		t.Fatal(c.rec)
	}
	for i, want := range []int64{1219, 5} {
		ev := c.rec.Replacement[i].Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
		if *ev.UnclassifiedTokens != want {
			t.Fatal(ev)
		}
	}
	if c.rec.Metrics != nil {
		t.Fatal("per-call evidence leaked to aggregate")
	}
}

func TestCacheWriteEvidencePluginCannotForgeOrReplace(t *testing.T) {
	c := &call{rec: &core.UsageRecord{}}
	rt := &typeRoute{usage: manifest.UsageRules{Facts: map[string]manifest.UsageFact{core.CacheWriteEvidenceKey: {Type: "string"}}}}
	if got := c.reportedFacts(context.Background(), rt, map[string]string{core.CacheWriteEvidenceKey: "fake"}); got != nil {
		t.Fatal(got)
	}
	n := int64(1219)
	host := core.CacheWriteEvidence{Version: 1, UnclassifiedTokens: &n}
	out := preserveHostCacheEvidence(map[string]any{core.CacheWriteEvidenceKey: host}, map[string]any{"other": 1})
	*out[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence).UnclassifiedTokens = 3
	if *host.UnclassifiedTokens != 1219 {
		t.Fatal("aliased host evidence")
	}
}

func TestCacheWriteEvidenceCloneAndReservedKeyIsolation(t *testing.T) {
	n := int64(9007199254740993)
	e := core.CacheWriteEvidence{Version: 1, Total: core.CacheCounter{State: "value", Value: &n}, Source: "json"}
	r := &core.UsageRecord{Metrics: map[string]any{core.CacheWriteEvidenceKey: e}, Additional: []core.PricedUsage{{Metrics: map[string]any{core.CacheWriteEvidenceKey: e}}}}
	cloned := cloneUsage(r)
	for _, m := range []map[string]any{cloned.Metrics, cloned.Additional[0].Metrics} {
		if *m[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence).Total.Value != n {
			t.Fatal("clone lost integer precision")
		}
	}
	*cloned.Additional[0].Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence).Total.Value = 1
	if *r.Additional[0].Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence).Total.Value != n {
		t.Fatal("clone shared pointer")
	}
	raw, _, _ := core.HelperHistoryUsageBytes(r)
	decoded, _, err := core.DecodeHelperHistoryUsage(raw)
	if err != nil {
		t.Fatal(err)
	}
	again := cloneUsage(decoded)
	actual := again.Metrics[core.CacheWriteEvidenceKey].(map[string]any)["total"].(map[string]any)["value"]
	if actual != json.Number("9007199254740993") {
		t.Fatal("decoded map clone lost precision", actual)
	}
	again.Metrics[core.CacheWriteEvidenceKey].(map[string]any)["total"].(map[string]any)["value"] = json.Number("2")
	if decoded.Metrics[core.CacheWriteEvidenceKey].(map[string]any)["total"].(map[string]any)["value"] != json.Number("9007199254740993") {
		t.Fatal("decoded map aliased")
	}
	if got := preserveHostCacheEvidence(nil, map[string]any{core.CacheWriteEvidenceKey: e}); got[core.CacheWriteEvidenceKey] != nil {
		t.Fatal("unobserved plugin evidence accepted")
	}
	host := map[string]any{core.CacheWriteEvidenceKey: e}
	got := preserveHostCacheEvidence(host, host)
	if got[core.CacheWriteEvidenceKey] == nil {
		t.Fatal("same-map host evidence lost")
	}
}

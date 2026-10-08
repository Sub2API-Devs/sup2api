package usagerules

import (
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"strings"
	"testing"
)

func cacheEvidenceRules() manifest.UsageRules {
	m := map[string]string{manifest.UsageCacheCreationTokens: "usage.cache_creation_input_tokens", manifest.UsageCacheCreation1h: "usage.cache_creation.ephemeral_1h_input_tokens"}
	return manifest.UsageRules{JSON: &manifest.UsageMap{Map: m}}
}

func TestCacheWriteEvidenceActualUnclassified1219(t *testing.T) {
	u := New(cacheEvidenceRules())
	u.ApplyJSON([]byte(`{"usage":{"cache_creation_input_tokens":2595,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":1376}}}`))
	if u.Metrics["cache_write_evidence"] == nil {
		t.Fatal("missing cache TTL evidence: 1219 must not be declared known 5m")
	}
	if u.Tokens().CacheCreation != 1219 || u.Tokens().CacheCreation1h != 1376 {
		t.Fatal("compatible price inputs changed")
	}
}

func TestCacheEvidenceBuiltinSSELifecycle(t *testing.T) {
	var rules manifest.UsageRules
	for _, p := range platforms.Builtin() {
		if p.ID == "anthropic" {
			rules = p.Usage
		}
	}
	u := New(rules)
	u.ApplySSE("message_start", []byte(`{"message":{"usage":{"input_tokens":2,"output_tokens":24,"cache_creation_input_tokens":1376,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":1376}}}}`))
	first := u.Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
	u.ApplySSE("message_delta", []byte(`{"usage":{"input_tokens":218,"output_tokens":380,"cache_creation_input_tokens":2595}}`))
	e := u.Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
	if e.Completeness != "partial" || e.Source != "sse" || *e.UnclassifiedTokens != 1219 || *first.Total.Value != 1376 || first.Completeness != "complete" {
		t.Fatalf("evidence %+v / %+v", e, first)
	}
	if u.Tokens().CacheCreation != 1219 || u.Tokens().CacheCreation1h != 1376 {
		t.Fatal(u.Tokens())
	}
	u.ApplySSE("message_delta", []byte(`{"usage":{"cache_creation":{"ephemeral_5m_input_tokens":1219,"ephemeral_1h_input_tokens":1376}}}`))
	e = u.Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
	if e.Completeness != "complete" || *e.UnclassifiedTokens != 0 {
		t.Fatal(e)
	}
	u.ApplySSE("message_delta", []byte(`{"usage":{"cache_creation":null}}`))
	e = u.Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
	if e.Completeness != "partial" || e.Explicit1h.State != "null" || e.Explicit1h.Value != nil || *e.UnclassifiedTokens != 2595 {
		t.Fatal(e)
	}
	// Billing compatibility intentionally still uses the previously reported 1h.
	if u.Tokens().CacheCreation != 1219 {
		t.Fatal("price changed")
	}
}

func TestCacheEvidenceShapeBoundaries(t *testing.T) {
	for _, tc := range []struct{ usage, state, total string }{
		{`{"cache_creation_input_tokens":null}`, "unknown", "null"},
		{`{"cache_creation":{"ephemeral_5m_input_tokens":0}}`, "unknown", "absent"},
		{`{"cache_creation_input_tokens":0}`, "partial", "value"},
		{`{"cache_creation_input_tokens":5,"cache_creation":{"ephemeral_1h_input_tokens":6}}`, "inconsistent", "value"},
		{`{"cache_creation_input_tokens":5,"cache_creation":3}`, "inconsistent", "value"},
		{`{"cache_creation_input_tokens":"5"}`, "inconsistent", "invalid"},
		{`{"cache_creation_input_tokens":-1}`, "inconsistent", "invalid"},
		{`{"cache_creation_input_tokens":1.5}`, "inconsistent", "invalid"},
		{`{"cache_creation_input_tokens":9223372036854775808}`, "inconsistent", "invalid"},
	} {
		t.Run(tc.usage, func(t *testing.T) {
			u := New(cacheEvidenceRules())
			u.ApplyJSON([]byte(`{"usage":` + tc.usage + `}`))
			e := u.Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
			if e.Completeness != tc.state || e.Total.State != tc.total {
				t.Fatal(e)
			}
		})
	}
}

func TestCacheEvidenceAdditionalAndReplacementFrozen(t *testing.T) {
	u := New(additionalRules())
	u.ApplyJSON([]byte(`{"usage":{"iterations":[{"type":"advisor_message","model":"a","input_tokens":1,"output_tokens":2,"cache_creation_input_tokens":10,"cache_creation":{"ephemeral_1h_input_tokens":4}}]}}`))
	a := u.Additional()[0]
	e := a.Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
	*e.Total.Value = 99
	if *u.Additional()[0].Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence).Total.Value != 10 {
		t.Fatal("mutable additional")
	}
	r := New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
	raw := strings.Replace(attemptFixture, `"input_tokens":10,"output_tokens":0`, `"input_tokens":10,"output_tokens":0,"cache_creation_input_tokens":9,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":4}`, 1)
	r.ApplyJSON([]byte(raw))
	items, err := r.Replacement()
	if err != nil {
		t.Fatal(err)
	}
	if items[0].Metrics[core.CacheWriteEvidenceKey] == nil || items[1].Metrics[core.CacheWriteEvidenceKey] != nil {
		t.Fatal(items)
	}
	rec := &core.UsageRecord{RequestID: "cache-evidence", Metrics: u.Additional()[0].Metrics, Replacement: []core.PricedUsage{{Model: items[0].Model, Metrics: items[0].Metrics, Tokens: items[0].Tokens}}}
	bytes, digest, err := core.HelperHistoryUsageBytes(rec)
	if err != nil {
		t.Fatal(err)
	}
	decoded, d2, err := core.DecodeHelperHistoryUsage(bytes)
	if err != nil || d2 != digest {
		t.Fatal(err)
	}
	b1, _ := json.Marshal(rec.Metrics)
	var normalized any
	if err := json.Unmarshal(b1, &normalized); err != nil {
		t.Fatal(err)
	}
	b1, _ = json.Marshal(normalized)
	b2, _ := json.Marshal(decoded.Metrics)
	if string(b1) != string(b2) || decoded.Replacement[0].Tokens != rec.Replacement[0].Tokens {
		t.Fatal("frozen evidence changed")
	}
}

func TestCacheEvidenceOtherRulesAndForgedFact(t *testing.T) {
	rules := manifest.UsageRules{JSON: &manifest.UsageMap{Map: map[string]string{manifest.UsageCacheCreationTokens: "other.cache", core.CacheWriteEvidenceKey: "fake"}}, Facts: map[string]manifest.UsageFact{core.CacheWriteEvidenceKey: {Type: "string", Path: "fake"}}}
	u := New(rules)
	u.ApplyJSON([]byte(`{"other":{"cache":10},"fake":"forged","usage":{"cache_creation_input_tokens":9}}`))
	if u.Metrics[core.CacheWriteEvidenceKey] != nil || u.Tokens().CacheCreation != 10 {
		t.Fatal(u)
	}
}

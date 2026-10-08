package usagerules

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func reviewCacheAcc() *Acc {
	for _, p := range platforms.Builtin() {
		if p.ID == "anthropic" {
			return New(p.Usage)
		}
	}
	panic("missing builtin")
}
func reviewCacheFact(t *testing.T, u *Acc) core.CacheWriteEvidence {
	t.Helper()
	e, ok := u.Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
	if !ok {
		t.Fatal("missing host fact")
	}
	return e
}

func TestReviewCacheEvidenceSnapshotLifecycle(t *testing.T) {
	u := reviewCacheAcc()
	u.ApplySSE("message_start", []byte(`{"message":{"usage":{"cache_creation_input_tokens":100,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":100}}}}`))
	snapshot := reviewCacheFact(t, u)
	*snapshot.Total.Value = 999 // A consumer cannot change the accumulator's next observation.
	u.ApplySSE("message_delta", []byte(`{"usage":{"output_tokens":1}}`))
	if *reviewCacheFact(t, u).Total.Value != 100 {
		t.Fatal("published pointer leaked into state")
	}
	u.ApplySSE("message_delta", []byte(`{"usage":{"cache_creation_input_tokens":1319}}`))
	partial := reviewCacheFact(t, u)
	if partial.Completeness != "partial" || *partial.UnclassifiedTokens != 1219 || *partial.Explicit5m.Value != 0 {
		t.Fatal(partial)
	}
	fees := u.Tokens()
	u.ApplySSE("message_delta", []byte(`{"usage":{"cache_creation_input_tokens":1319,"cache_creation":{"ephemeral_5m_input_tokens":1219}}}`))
	if reviewCacheFact(t, u).Completeness != "complete" || u.Tokens() != fees {
		t.Fatal("same-total evidence changed fees")
	}
	u.ApplySSE("message_delta", []byte(`{"usage":{"cache_creation":null}}`))
	cleared := reviewCacheFact(t, u)
	if cleared.Explicit5m.State != "null" || cleared.Explicit1h.State != "null" || *cleared.UnclassifiedTokens != 1319 || u.Tokens() != fees {
		t.Fatal(cleared)
	}
	if *partial.Explicit1h.Value != 100 || partial.Completeness != "partial" {
		t.Fatal("old snapshot changed")
	}
}

func TestReviewCacheEvidenceInvalidAndSourceIsolation(t *testing.T) {
	for _, raw := range []string{`"bad"`, `-1`, `1.25`, `9223372036854775808`} {
		u := reviewCacheAcc()
		u.ApplyJSON([]byte(`{"usage":{"cache_creation_input_tokens":` + raw + `}}`))
		if e := reviewCacheFact(t, u); e.Total.State != "invalid" || e.Completeness != "inconsistent" || e.UnclassifiedTokens != nil {
			t.Fatal(e)
		}
	}
	u := reviewCacheAcc()
	u.ApplyJSON([]byte(`{"usage":{"cache_creation_input_tokens":8,"cache_creation":{"ephemeral_5m_input_tokens":5,"ephemeral_1h_input_tokens":4}}}`))
	if reviewCacheFact(t, u).Completeness != "inconsistent" {
		t.Fatal("sum conflict hidden")
	}
	foreign := New(manifest.UsageRules{JSON: &manifest.UsageMap{Map: map[string]string{manifest.UsageCacheCreationTokens: "other.total", manifest.UsageCacheCreation1h: "other.hour"}}})
	foreign.ApplyJSON([]byte(`{"other":{"total":10,"hour":3},"usage":{"cache_creation_input_tokens":999}}`))
	if foreign.Metrics[core.CacheWriteEvidenceKey] != nil || foreign.Tokens().CacheCreation != 7 {
		t.Fatal("foreign source interpreted as Anthropic")
	}
}

func TestReviewCacheEvidenceExactFrozenReplay(t *testing.T) {
	u := reviewCacheAcc()
	u.ApplyJSON([]byte(`{"usage":{"cache_creation_input_tokens":9007199254740993,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":0}}}`))
	rec := &core.UsageRecord{RequestID: "review-exact-cache", Metrics: core.CloneUsageMetrics(u.Metrics), Tokens: u.Tokens()}
	frozen, hash, err := core.HelperHistoryUsageBytes(rec)
	if err != nil {
		t.Fatal(err)
	}
	decoded, got, err := core.DecodeHelperHistoryUsage(frozen)
	if err != nil || got != hash {
		t.Fatal(err)
	}
	round, hash2, err := core.HelperHistoryUsageBytes(decoded)
	if err != nil || hash2 != hash || !bytes.Equal(round, frozen) {
		t.Fatal("typed/cold envelope changed")
	}
	cloned := core.CloneUsageMetrics(decoded.Metrics)
	value := cloned[core.CacheWriteEvidenceKey].(map[string]any)["total"].(map[string]any)
	value["value"] = json.Number("1")
	old := decoded.Metrics[core.CacheWriteEvidenceKey].(map[string]any)["total"].(map[string]any)["value"]
	if old != json.Number("9007199254740993") {
		t.Fatal("decoded clone rounded or shared")
	}
}

func TestReviewCacheEvidenceReplacementDoesNotShareAttempts(t *testing.T) {
	raw := strings.Replace(attemptFixture, `"input_tokens":10,"output_tokens":0`, `"input_tokens":10,"output_tokens":0,"cache_creation_input_tokens":7`, 1)
	u := New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
	u.ApplyJSON([]byte(raw))
	items, err := u.Replacement()
	if err != nil || len(items) != 2 {
		t.Fatal(err)
	}
	if items[1].Metrics[core.CacheWriteEvidenceKey] != nil {
		t.Fatal("first attempt leaked to last")
	}
	e := items[0].Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
	*e.Total.Value = 99
	again, err := u.Replacement()
	if err != nil || *again[0].Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence).Total.Value != 7 {
		t.Fatal("replacement mutable", err)
	}
}

func TestReviewCacheEvidenceAdditionalNullAndAbsentStaySeparate(t *testing.T) {
	u := New(additionalRules())
	u.ApplyJSON([]byte(`{"usage":{"iterations":[{"type":"advisor_message","model":"a","input_tokens":1,"output_tokens":2,"cache_creation_input_tokens":9,"cache_creation":null},{"type":"advisor_message","model":"b","input_tokens":3,"output_tokens":4}]}}`))
	items := u.Additional()
	if u.AdditionalError != "" || len(items) != 2 {
		t.Fatal(u.AdditionalError)
	}
	e := items[0].Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence)
	if e.Source != "iteration" || e.Explicit1h.State != "null" || items[1].Metrics[core.CacheWriteEvidenceKey] != nil {
		t.Fatal("iteration facts mixed")
	}
	items[0].Metrics[core.CacheWriteEvidenceKey] = "changed"
	if _, ok := u.Additional()[0].Metrics[core.CacheWriteEvidenceKey].(core.CacheWriteEvidence); !ok {
		t.Fatal("additional map leaked")
	}
}

package usage

import (
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/stretchr/testify/require"
	"testing"
)

func TestFailurePolicyTracePersistsWithoutAnomaly(t *testing.T) {
	f := newFixture(t)
	r := f.record("policy-trace", true)
	r.FailurePolicy = `[{"attempt":1,"action":"switch_reset","reason":"retry_scheduled"}]`
	f.svc.process(t.Context(), []*core.UsageRecord{r})
	require.Equal(t, r.FailurePolicy, f.scalar(`SELECT anomalies->>'failure_policy' FROM usage_logs WHERE request_id='policy-trace'`))
	rows := f.get(f.user, "/usage/summary?group_by=model&from=2026-09-01T00:00:00Z", 200)["data"].([]any)
	require.Len(t, rows, 1)
	require.Equal(t, float64(0), rows[0].(map[string]any)["anomalies"])
}

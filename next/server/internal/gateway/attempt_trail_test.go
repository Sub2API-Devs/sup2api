package gateway

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// trailStep is what a test compares of a step: the account, the outcome and
// what followed, without the timing.
type trailStep struct {
	account   int64
	status    int
	errorType string
	next      string
}

func trailShape(tr *core.AttemptTrail) []trailStep {
	if tr == nil {
		return nil
	}
	out := make([]trailStep, len(tr.Steps))
	for i, s := range tr.Steps {
		out[i] = trailStep{s.AccountID, s.Status, s.ErrorType, s.Next}
	}
	return out
}

// Every attempt sent upstream is a step of the record's attempt trail, stored
// under anomalies.attempts; a request sent once records none (CONTRACTS §98).
func TestAttemptTrail(t *testing.T) {
	t.Run("sent once", func(t *testing.T) {
		e := newEnv(t)
		require.Equal(t, 200, e.messages(body(testModel, false)).status)
		rec := e.record()
		require.Nil(t, rec.AttemptTrail)
		require.NotContains(t, rec.Anomalies(), core.AnomalyAttempts)
	})
	t.Run("switch", func(t *testing.T) {
		e := newEnv(t)
		e.up.set("acc-1", &upstreamRule{status: 429})
		require.Equal(t, 200, e.messages(body(testModel, false)).status)
		rec := e.record()
		require.Equal(t, []trailStep{{1, 429, errTypeUpstream, core.AttemptSwitch}, {2, 200, "", ""}}, trailShape(rec.AttemptTrail))
		require.Equal(t, 1, rec.AttemptTrail.V)
		require.NotEmpty(t, rec.AttemptTrail.Steps[0].Message)
		require.Empty(t, rec.AttemptTrail.Steps[1].Message)
		var stored core.AttemptTrail
		require.NoError(t, json.Unmarshal([]byte(rec.Anomalies()[core.AnomalyAttempts]), &stored))
		require.Equal(t, *rec.AttemptTrail, stored)
	})
	t.Run("same then switch", func(t *testing.T) {
		e := newEnv(t)
		p := testFailurePolicy()
		p.MaxRetries = 2
		p.RetryRules[0].Action, p.RetryRules[0].SameAccountRetries, p.RetryRules[0].ExhaustedAction = failureRetry, 1, failureReset
		e.setFailurePolicy(p)
		e.up.set("acc-1", &upstreamRule{status: 503})
		require.Equal(t, 200, e.messages(body(testModel, false)).status)
		require.Equal(t, []trailStep{{1, 503, errTypeUpstream, core.AttemptSame}, {1, 503, errTypeUpstream, core.AttemptSwitch}, {2, 200, "", ""}},
			trailShape(e.record().AttemptTrail))
	})
	t.Run("all fail", func(t *testing.T) {
		e := newEnv(t)
		e.setSettings(GatewaySettings{MaxAttempts: 2}, StickySettings{})
		for _, k := range []string{"acc-1", "acc-2", "acc-3"} {
			e.up.set(k, &upstreamRule{status: 529})
		}
		require.Equal(t, 529, e.messages(body(testModel, false)).status)
		rec := e.record()
		require.Equal(t, 2, rec.Attempts)
		require.Equal(t, []trailStep{{1, 529, errTypeUpstream, core.AttemptSwitch}, {2, 529, errTypeUpstream, ""}}, trailShape(rec.AttemptTrail))
	})
}

// The trail keeps the first maxTrailSteps attempts and counts the rest; the
// last kept step still says what followed it, and a long error message is cut.
func TestAttemptTrailBounds(t *testing.T) {
	c := &call{g: &Gateway{now: time.Now}, rec: &core.UsageRecord{StatusCode: 200, Success: true}}
	long := &gwError{Status: 502, RecordType: errTypeUpstream, Message: string(make([]byte, 400))}
	for i := range maxTrailSteps + 2 {
		var e *gwError
		if i < maxTrailSteps+1 {
			e = long
		}
		c.noteAttempt(int64(1+i%2), e, time.Now())
	}
	tr := c.attemptTrail()
	require.Len(t, tr.Steps, maxTrailSteps)
	require.Equal(t, 2, tr.Omitted)
	require.Equal(t, core.AttemptSwitch, tr.Steps[maxTrailSteps-1].Next)
	require.Len(t, tr.Steps[0].Message, maxTrailMessage)
	// The step that went through is omitted: the kept ones keep their own outcome.
	require.Equal(t, 502, tr.Steps[maxTrailSteps-1].Status)
}

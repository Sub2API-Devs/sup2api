package gateway

import (
	"slices"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Bounds of an AttemptTrail (CONTRACTS §98): max_attempts and a failure
// policy's 1 + max_retries both stop at maxMaxAttempts, so omitted only
// guards a future higher limit.
const (
	maxTrailSteps   = maxMaxAttempts
	maxTrailMessage = 160
)

// trailState collects each attempt of a request as it goes upstream; it
// becomes usage_logs.anomalies.attempts only when there was more than one
// (attemptTrail).
type trailState struct {
	steps   []core.AttemptStep
	omitted int
	// pending: the last step ended without an error, so how it went is
	// what the record says once the response is finished (attemptTrail).
	pending bool
}

// noteAttempt notes an attempt on account id that began at begun and ended
// with e (nil: it went through). A failure keeps the reason the attempt
// recorded (the account effect, the transport error) over the client text.
// The step before it learns whether the request stayed on its account from
// what the next pick did, whichever rule (failure policy, failover) made it.
func (c *call) noteAttempt(id int64, e *gwError, begun time.Time) {
	t := &c.trail
	if n := len(t.steps); n > 0 && t.omitted == 0 {
		t.steps[n-1].Next = core.AttemptSwitch
		if t.steps[n-1].AccountID == id {
			t.steps[n-1].Next = core.AttemptSame
		}
	}
	if len(t.steps) >= maxTrailSteps {
		t.omitted++
		return
	}
	step := core.AttemptStep{AccountID: id, Ms: c.g.now().Sub(begun).Milliseconds()}
	if e != nil {
		step.Status, step.ErrorType, step.Message = e.Status, e.RecordType, truncateUTF8(firstNonEmpty(c.rec.ErrorMessage, e.Message), maxTrailMessage)
	}
	t.steps = append(t.steps, step)
	t.pending = e == nil
}

// attemptTrail is usage_logs.anomalies.attempts: nil for a request sent
// upstream at most once. An attempt that went through ends as the record
// does: a WebSocket handshake's turn, a relayed error.
func (c *call) attemptTrail() *core.AttemptTrail {
	t := &c.trail
	if len(t.steps)+t.omitted < 2 {
		return nil
	}
	tr := &core.AttemptTrail{V: 1, Steps: slices.Clone(t.steps), Omitted: t.omitted}
	if last := &tr.Steps[len(tr.Steps)-1]; t.pending && t.omitted == 0 {
		last.Status = c.rec.StatusCode
		if !c.rec.Success {
			last.ErrorType, last.Message = c.rec.ErrorType, truncateUTF8(c.rec.ErrorMessage, maxTrailMessage)
		}
	}
	return tr
}

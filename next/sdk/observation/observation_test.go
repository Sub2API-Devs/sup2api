package observation

import (
	"testing"

	"github.com/stretchr/testify/assert"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// One rule decides which finished attempts count against an account and with
// which upstream status (CONTRACTS §73.1, §74.5).
func TestAttemptOutcomeAndAccountFailure(t *testing.T) {
	finished := func(mut func(*pluginv1.RequestObservation)) *pluginv1.RequestObservation {
		o := &pluginv1.RequestObservation{Phase: AttemptFinished, StatusCode: 502}
		mut(o)
		return o
	}
	for _, tc := range []struct {
		name            string
		o               *pluginv1.RequestObservation
		counted, failed bool
		status          int
		failure         bool // AccountFailure with 400 exempt
	}{
		{"success", finished(func(o *pluginv1.RequestObservation) { o.Success, o.UpstreamStatusCode = true, 200 }), true, false, 0, false},
		{"upstream 529", finished(func(o *pluginv1.RequestObservation) { o.UpstreamStatusCode = 529 }), true, true, 529, true},
		{"upstream 400 is exempt", finished(func(o *pluginv1.RequestObservation) { o.UpstreamStatusCode = 400 }), true, true, 400, false},
		{"client 400 mapped from a transport failure", finished(func(o *pluginv1.RequestObservation) { o.StatusCode = 400 }), true, true, 0, true},
		{"out-of-range upstream status", finished(func(o *pluginv1.RequestObservation) { o.UpstreamStatusCode = 999 }), true, true, 0, true},
		{"canceled", finished(func(o *pluginv1.RequestObservation) { o.Canceled = true }), false, false, 0, false},
		{"local failure", finished(func(o *pluginv1.RequestObservation) { o.LocalFailure, o.ErrorType = true, "rate_limited" }), false, false, 0, false},
		{"not a finished attempt", finished(func(o *pluginv1.RequestObservation) { o.Phase = UsageFinalized }), false, false, 0, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			counted, failed, status := AttemptOutcome(tc.o)
			assert.Equal(t, []any{tc.counted, tc.failed, tc.status}, []any{counted, failed, status})
			assert.Equal(t, tc.failure, AccountFailure(tc.o, 400))
		})
	}
}

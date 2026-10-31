package gateway

import (
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/stretchr/testify/require"
)

type observationCapture struct {
	events chan *pluginv1.RequestObservation
}

func (c observationCapture) PublishObservation(e *pluginv1.RequestObservation) { c.events <- e }

func TestObservationAttemptIdentityComesFromSelection(t *testing.T) {
	capture := observationCapture{events: make(chan *pluginv1.RequestObservation, 8)}
	oldID := int64(1)
	c := &call{g: &Gateway{d: Deps{Observations: capture}, now: time.Now}, start: time.Now(), model: "model",
		rec: &core.UsageRecord{RequestID: "request", AccountID: &oldID, PluginKey: "old", Attempts: 2}}
	ref := &core.AccountRef{ID: 2, PluginKey: "next"}
	c.startObservationAttempt(ref)
	c.observeAttemptResult(ref, attemptResult{kind: attemptFailover, err: &gwError{Status: 503, RecordType: errTypeNoAccount, LocalFailure: true}})
	for i := range 2 {
		e := <-capture.events
		require.Equal(t, i == 1, e.LocalFailure)
		require.EqualValues(t, 2, e.AccountId)
		require.Equal(t, "next", e.AccountPluginKey)
		require.Equal(t, "request:2", e.AttemptId)
		require.Positive(t, e.AttemptStartedAtUnixMs)
	}
	require.EqualValues(t, 1, *c.rec.AccountID)
	require.Equal(t, "old", c.rec.PluginKey)
}

func TestObservationGatewayLifecycleAndFailover(t *testing.T) {
	e := newEnv(t)
	capture := observationCapture{events: make(chan *pluginv1.RequestObservation, 32)}
	e.gw.d.Observations = capture
	e.up.set("acc-1", &upstreamRule{status: 429})
	r := e.messages(body(testModel, true))
	require.Equal(t, 200, r.status)
	rec := e.record()
	phases := map[int64][]string{}
	for len(capture.events) > 0 {
		event := <-capture.events
		phases[event.AccountId] = append(phases[event.AccountId], event.Phase)
		require.Equal(t, rec.RequestID, event.RequestId)
		require.Equal(t, rec.GroupID, event.GroupId)
		require.False(t, event.LocalFailure)
		if event.AccountId == 1 && event.Phase == observation.AttemptFinished {
			require.False(t, event.Success)
			require.EqualValues(t, 429, event.StatusCode)
			require.EqualValues(t, 429, event.UpstreamStatusCode)
		}
		if event.AccountId == 2 && event.Phase == observation.AttemptFinished {
			require.EqualValues(t, 200, event.UpstreamStatusCode)
		}
		if event.Phase == observation.UsageFinalized {
			require.True(t, event.Success)
			require.Equal(t, rec.Tokens.Total(), event.TotalTokens)
			require.Equal(t, rec.Tokens.Input, event.GetTokens().GetInput())
			require.Equal(t, rec.Tokens.Output, event.GetTokens().GetOutput())
			require.GreaterOrEqual(t, event.ResponseStartedAtUnixMs, event.AttemptStartedAtUnixMs)
			require.GreaterOrEqual(t, event.FirstStreamEventAtUnixMs, event.ResponseStartedAtUnixMs)
			require.GreaterOrEqual(t, event.CompletedAtUnixMs, event.FirstStreamEventAtUnixMs)
		}
	}
	require.Equal(t, []string{observation.AttemptStarted, observation.ResponseStarted, observation.AttemptFinished}, phases[1])
	require.Equal(t, []string{observation.AttemptStarted, observation.ResponseStarted, observation.FirstStreamEvent, observation.AttemptFinished, observation.Completed, observation.UsageFinalized}, phases[2])
}

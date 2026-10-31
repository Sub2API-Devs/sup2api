package gateway

import (
	"cmp"
	"net/http"
	"strconv"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func (c *call) observeRequest(phase string, rec *core.UsageRecord) {
	c.publishObservation(phase, rec, false)
}

func (c *call) publishObservation(phase string, rec *core.UsageRecord, localFailure bool) {
	if c.g.d.Observations == nil || rec == nil || rec.AccountID == nil || c.ep.TaskSubmit() || c.ep.TaskQuery() {
		return
	}
	attempt := rec.RequestID + ":" + strconv.Itoa(rec.Attempts)
	id := attempt + ":" + phase
	if phase == observation.UsageFinalized {
		id = rec.RequestID + ":" + phase
	}
	if phase == observation.ResponseStarted && c.observationResponseAt.IsZero() {
		c.observationResponseAt = c.g.now()
		// A WebSocket turn has no status of its own: its first message is
		// the upstream's answer.
		c.observationUpstreamCode = cmp.Or(rec.StatusCode, http.StatusOK)
	}
	v := &pluginv1.RequestObservation{Id: id, RequestId: rec.RequestID, AttemptId: attempt, Phase: phase, AccountId: *rec.AccountID,
		AccountPluginKey: rec.PluginKey, Model: truncateUTF8(rec.Model, 256), UpstreamModel: truncateUTF8(rec.UpstreamModel, 256), Protocol: rec.Protocol,
		Stream: rec.Stream, OccurredAtUnixMs: c.g.now().UnixMilli(), StartedAtUnixMs: c.start.UnixMilli(), Revision: 1,
		LocalFailure: localFailure, Success: rec.Success && !c.statsCanceled, Canceled: c.statsCanceled, StatusCode: int32(rec.StatusCode), ErrorType: truncateUTF8(rec.ErrorType, 128), NodeId: rec.NodeID,
		UsagePending: rec.Reservation != nil || rec.ReservationDropped != "" || (phase != observation.UsageFinalized && c.usage != nil)}
	if c.principal != nil {
		v.GroupId = c.principal.Group.ID
	}
	if !c.statsCompletedAt.IsZero() {
		v.CompletedAtUnixMs = c.statsCompletedAt.UnixMilli()
	}
	if !c.observationAttemptAt.IsZero() {
		v.AttemptStartedAtUnixMs = c.observationAttemptAt.UnixMilli()
	}
	if !c.observationResponseAt.IsZero() {
		v.ResponseStartedAtUnixMs = c.observationResponseAt.UnixMilli()
		v.UpstreamStatusCode = int32(c.observationUpstreamCode)
	}
	if phase == observation.FirstStreamEvent && c.observationFirstStreamAt.IsZero() {
		c.observationFirstStreamAt = c.g.now()
	}
	if !c.observationFirstStreamAt.IsZero() {
		v.FirstStreamEventAtUnixMs = c.observationFirstStreamAt.UnixMilli()
	}
	v.Canceled = v.Canceled || rec.ErrorType == errTypeClientCanceled
	if phase == observation.AttemptStarted {
		v.Success, v.StatusCode, v.ErrorType = false, 0, ""
	}
	if phase == observation.UsageFinalized {
		v.Tokens = &pluginv1.ObservationTokens{}
		valid := true
		if len(rec.Replacement) == 0 {
			valid = addObservationTokens(v, rec.Tokens)
		} else {
			for _, item := range rec.Replacement {
				valid = valid && addObservationTokens(v, item.Tokens)
			}
		}
		for _, item := range rec.Additional {
			valid = valid && addObservationTokens(v, item.Tokens)
		}
		if !valid {
			v.TotalTokens, v.UsagePending, v.Tokens = 0, true, nil
		}
	}
	c.g.d.Observations.PublishObservation(v)
}

func (c *call) startObservationAttempt(ref *core.AccountRef) {
	if c.g.d.Observations == nil {
		return
	}
	c.observationAttemptAt = c.g.now()
	c.observationResponseAt, c.observationFirstStreamAt, c.observationUpstreamCode = time.Time{}, time.Time{}, 0
	rec := *c.rec
	rec.AccountID, rec.PluginKey, rec.UpstreamModel = &ref.ID, ref.PluginKey, ref.MapModel(c.model)
	c.observeRequest(observation.AttemptStarted, &rec)
}

func (c *call) observeAttemptResult(ref *core.AccountRef, result attemptResult) {
	if c.g.d.Observations == nil || c.rec == nil {
		return
	}
	rec := *c.rec
	rec.AccountID, rec.PluginKey = &ref.ID, ref.PluginKey
	local := false
	if result.err != nil {
		rec.Success, rec.StatusCode, rec.ErrorType = false, result.err.Status, result.err.RecordType
		local = result.err.LocalFailure
	}
	c.publishObservation(observation.AttemptFinished, &rec, local)
}

func addObservationTokens(event *pluginv1.RequestObservation, tokens core.UsageTokens) bool {
	for _, n := range [...]int64{tokens.Input, tokens.Output, tokens.CacheRead, tokens.CacheCreation, tokens.CacheCreation1h} {
		if n < 0 || n > observation.MaxValue-event.TotalTokens {
			return false
		}
		event.TotalTokens += n
	}
	event.Tokens.Input += tokens.Input
	event.Tokens.Output += tokens.Output
	event.Tokens.CacheRead += tokens.CacheRead
	event.Tokens.CacheCreation += tokens.CacheCreation
	event.Tokens.CacheCreation_1H += tokens.CacheCreation1h
	return true
}

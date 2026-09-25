package moderation

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Deny codes and messages (CONTRACTS §20.4).
const (
	DenyBlocked      = "moderation_blocked"
	DenyUserBlocked  = "moderation_user_blocked"
	DenyUnavailable  = "moderation_unavailable"
	MsgUserBlocked   = "该用户因多次违规已被暂停使用，请联系管理员"
	MsgUnavailable   = "提示词审核服务暂不可用，请稍后重试"
	maxNoteBytes     = 1024
	notePrefix       = "moderation: "
	eventTextMaxChar = 100000
)

var (
	allowEmpty = &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW}
	allowSelf  = &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW, Note: notePrefix + "self"}
)

func allow(note string) *pluginv1.GatewayRequestHookResponse {
	return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW, Note: truncateBytes(note, maxNoteBytes)}
}

func deny(status int, code, msg, note string) *pluginv1.GatewayRequestHookResponse {
	return &pluginv1.GatewayRequestHookResponse{
		Decision: pluginv1.GatewayRequestHookResponse_DECISION_DENY, DenyStatus: int32(status),
		DenyCode: code, DenyMessage: msg, Note: truncateBytes(note, maxNoteBytes),
	}
}

// verdictNote renders "moderation: block [a,b] reason".
func verdictNote(v Verdict, cached bool) string {
	var b strings.Builder
	b.WriteString(notePrefix)
	b.WriteString(v.Verdict)
	if len(v.Categories) > 0 {
		b.WriteString(" [")
		b.WriteString(strings.Join(v.Categories, ","))
		b.WriteByte(']')
	}
	if cached {
		b.WriteString(" (cached)")
	}
	if v.Reason != "" {
		b.WriteByte(' ')
		b.WriteString(v.Reason)
	}
	return b.String()
}

// OnGatewayRequest implements pluginsdk.Hook (CONTRACTS §20.4).
func (p *Plugin) OnGatewayRequest(ctx context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
	c := p.cfg.Load()
	if !c.enabled {
		return allowEmpty, nil
	}
	meta := in.GetMeta()
	uid := meta.GetUserId()
	if c.exempt[uid] {
		return allowEmpty, nil
	}
	if p.isBlocked(uid) {
		return deny(http.StatusForbidden, DenyUserBlocked, MsgUserBlocked, notePrefix+"user blocked"), nil
	}
	if len(c.groups) > 0 && !c.groups[meta.GetGroupId()] {
		return allowEmpty, nil
	}
	fields := in.GetFields()
	model := fieldString(fields[FieldModel])
	if model == "" {
		model = meta.GetModel()
	}
	if !c.modelMatches(model) {
		return allowEmpty, nil
	}
	text := extractText(fields)
	if text == "" {
		return allowEmpty, nil
	}
	if isSelfRequest(c.markerKey, text) {
		return allowSelf, nil
	}
	if visibleChars(text) < c.MinChars {
		return allowEmpty, nil
	}
	text = truncateText(text, c.InputMaxChars)
	h := textHash(text)
	if !sampled(h, c.SampleRate) {
		return allowEmpty, nil
	}
	protocol := meta.GetClientProtocol()
	if protocol == "" {
		protocol = meta.GetProtocol()
	}
	rec := eventRec{
		At: p.now().UTC(), RequestID: meta.GetRequestId(), UserID: uid, APIKeyID: meta.GetApiKeyId(),
		GroupID: meta.GetGroupId(), Model: truncateRunes(model, 200), Protocol: protocol, Mode: c.Mode,
		TextChars: utf8.RuneCountInString(text), TextHash: hex.EncodeToString(h[:]), LLMModel: c.Model,
	}
	if c.StoreText {
		t := truncateRunes(text, eventTextMaxChar)
		rec.Text = &t
	}
	key := cacheKey(c.policy, text)

	if c.Mode == ModeObserve {
		if v, ok := p.cacheGet(ctx, c, key, false); ok {
			p.stats.cacheHits.Add(1)
			rec.Cached = true
			p.finishRecord(c, rec, v, nil, ActionAllow)
			return allow(verdictNote(v, true)), nil
		}
		if !p.enqueue(observeJob{cfg: c, rec: rec, text: text, key: key}) {
			p.stats.dropped.Add(1)
			return allow(notePrefix + "dropped (queue full)"), nil
		}
		return allow(notePrefix + "queued"), nil
	}

	// enforce
	start := time.Now()
	if v, ok := p.cacheGet(ctx, c, key, true); ok {
		p.stats.cacheHits.Add(1)
		rec.Cached = true
		rec.LatencyMs = int(time.Since(start).Milliseconds())
		return p.enforceDecision(c, rec, v, nil, true), nil
	}
	res, shared, err := p.judgeShared(ctx, c, key, text)
	if res != nil {
		rec.Turns, rec.PromptTokens, rec.CompletionTokens = res.Turns, res.Usage.PromptTokens, res.Usage.CompletionTokens
		if res.LLMModel != "" {
			rec.LLMModel = res.LLMModel
		}
	}
	if shared {
		rec.Cached, rec.Turns, rec.PromptTokens, rec.CompletionTokens = true, 0, 0, 0
	}
	rec.LatencyMs = int(time.Since(start).Milliseconds())
	if err != nil {
		return p.enforceDecision(c, rec, Verdict{}, err, false), nil
	}
	return p.enforceDecision(c, rec, res.Verdict, nil, rec.Cached), nil
}

// enforceDecision records the outcome and builds the hook response.
func (p *Plugin) enforceDecision(c *config, rec eventRec, v Verdict, err error, cached bool) *pluginv1.GatewayRequestHookResponse {
	if err != nil {
		note := notePrefix + "error " + err.Error()
		if c.OnError == "block" {
			p.finishRecord(c, rec, Verdict{}, err, ActionDeny)
			return deny(http.StatusServiceUnavailable, DenyUnavailable, MsgUnavailable, note)
		}
		p.finishRecord(c, rec, Verdict{}, err, ActionAllow)
		return allow(note)
	}
	note := verdictNote(v, cached)
	if v.Verdict == VerdictBlock {
		p.finishRecord(c, rec, v, nil, ActionDeny)
		return deny(c.BlockStatus, DenyBlocked, c.blockMessage, note)
	}
	p.finishRecord(c, rec, v, nil, ActionAllow)
	return allow(note)
}

// finishRecord fills the verdict into rec and queues it for the database
// (pass verdicts only with record_pass).
func (p *Plugin) finishRecord(c *config, rec eventRec, v Verdict, err error, action string) {
	rec.Action = action
	if err != nil {
		rec.Verdict = VerdictError
		rec.Error = truncateRunes(err.Error(), 1000)
		rec.Categories = []string{}
	} else {
		rec.Verdict, rec.Categories, rec.Severity, rec.Reason = v.Verdict, v.Categories, v.Severity, v.Reason
		if rec.Categories == nil {
			rec.Categories = []string{}
		}
	}
	if rec.Verdict == VerdictPass && !c.RecordPass {
		return
	}
	select {
	case p.events <- rec:
	default:
		p.stats.droppedEvents.Add(1)
	}
}

// judgeShared runs one moderation per distinct text at a time
// (singleflight). The shared call gets its own deadline (timeout_ms from
// now), so a waiter giving up does not cancel it for the others.
// shared=true for callers that reused another caller's run.
func (p *Plugin) judgeShared(ctx context.Context, c *config, key, text string) (res *Result, shared bool, err error) {
	deadline := time.Now().Add(c.timeout)
	leader := false
	ch := p.sf.DoChan(key, func() (any, error) {
		leader = true
		jctx, cancel := context.WithDeadline(context.WithoutCancel(ctx), deadline)
		defer cancel()
		r, err := p.judge(jctx, c, text, false)
		if err == nil {
			p.cachePut(c, key, r.Verdict)
		}
		return r, err
	})
	wait := time.NewTimer(time.Until(deadline) + 50*time.Millisecond)
	defer wait.Stop()
	select {
	case r := <-ch:
		res, _ = r.Val.(*Result)
		return res, !leader, r.Err
	case <-ctx.Done():
		return nil, false, fmt.Errorf("timeout: %w", ctx.Err())
	case <-wait.C:
		return nil, false, errors.New("timeout: moderation did not finish within timeout_ms")
	}
}

// judge acquires a concurrency slot and runs the agent. ctx carries the
// deadline (timeout_ms, including the wait for a slot).
func (p *Plugin) judge(ctx context.Context, c *config, text string, transcript bool) (*Result, error) {
	release, err := p.acquire(ctx)
	if err != nil {
		p.stats.calls.Add(1)
		p.stats.errors.Add(1)
		return nil, err
	}
	defer release()
	p.stats.inflight.Add(1)
	defer p.stats.inflight.Add(-1)
	res, err := p.agent.run(ctx, c, text, transcript)
	p.stats.calls.Add(1)
	if res != nil {
		p.stats.latencyMsSum.Add(res.Latency.Milliseconds())
	}
	if err != nil {
		p.stats.errors.Add(1)
	}
	return res, err
}

// runObserve moderates one queued request (observe mode) and records it.
func (p *Plugin) runObserve(j observeJob) {
	c := j.cfg
	rec := j.rec
	start := time.Now()
	if v, ok := p.cacheGet(p.bg, c, j.key, true); ok {
		p.stats.cacheHits.Add(1)
		rec.Cached = true
		rec.LatencyMs = int(time.Since(start).Milliseconds())
		p.finishRecord(c, rec, v, nil, ActionAllow)
		return
	}
	ctx, cancel := context.WithTimeout(p.bg, c.timeout)
	defer cancel()
	res, err := p.judge(ctx, c, j.text, false)
	rec.LatencyMs = int(time.Since(start).Milliseconds())
	if res != nil {
		rec.Turns, rec.PromptTokens, rec.CompletionTokens = res.Turns, res.Usage.PromptTokens, res.Usage.CompletionTokens
		if res.LLMModel != "" {
			rec.LLMModel = res.LLMModel
		}
	}
	if err != nil {
		if p.bg.Err() != nil {
			return // shutting down
		}
		p.finishRecord(c, rec, Verdict{}, err, ActionAllow)
		return
	}
	p.cachePut(c, j.key, res.Verdict)
	p.finishRecord(c, rec, res.Verdict, nil, ActionAllow)
}

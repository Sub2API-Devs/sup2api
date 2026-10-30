package moderation

import (
	"context"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/textutil"
)

// Deny codes and messages.
const (
	DenyBlocked     = "moderation_blocked"
	DenyUserBlocked = "moderation_user_blocked"
	MsgUserBlocked  = "该用户因多次违规已被暂停使用，请联系管理员"
	maxNoteBytes    = 1024
	notePrefix      = "moderation: "
	textMaxChars    = 100000

	// Timings (events.timing).
	TimingPre  = "pre"
	TimingPost = "post"

	// preBudget caps a synchronous run below the 30 s hook timeout.
	preBudget = 29 * time.Second
)

var (
	allowEmpty = &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW}
	allowSelf  = &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW, Note: notePrefix + "self"}
)

func allow(note string) *pluginv1.GatewayRequestHookResponse {
	return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW, Note: textutil.TruncateBytes(note, maxNoteBytes)}
}

func deny(status int, code, msg, note string) *pluginv1.GatewayRequestHookResponse {
	return &pluginv1.GatewayRequestHookResponse{
		Decision: pluginv1.GatewayRequestHookResponse_DECISION_DENY, DenyStatus: int32(status),
		DenyCode: code, DenyMessage: msg, Note: textutil.TruncateBytes(note, maxNoteBytes),
	}
}

// moderation is one request being moderated.
type moderation struct {
	cfg    *config
	flow   *liveFlow
	snap   *snapshot
	in     *Input
	rec    eventRec
	timing string
	source string // cost source; "" = audit
	key    string // pass cache / singleflight key
	size   int64  // bytes held while queued
	queued time.Time
}

// OnGatewayRequest implements pluginsdk.Hook (CONTRACTS §72.5).
func (p *Plugin) OnGatewayRequest(ctx context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
	m, early := p.admit(in)
	if early != nil {
		return early, nil
	}
	if m.timing == TimingPost {
		m.queued = p.now()
		if !p.enqueue(m) {
			p.stats.dropped.Add(1)
			return allow(notePrefix + "dropped (queue full)"), nil
		}
		return allow(notePrefix + "queued"), nil
	}
	return p.runPre(ctx, m), nil
}

// admit applies every precondition (steps 1–8). A non-nil response ends the
// hook; otherwise m is ready to run.
func (p *Plugin) admit(in *pluginv1.GatewayRequestHookRequest) (*moderation, *pluginv1.GatewayRequestHookResponse) {
	c := p.cfg.Load()
	if !c.enabled {
		return nil, allowEmpty
	}
	meta := in.GetMeta()
	uid := meta.GetUserId()
	if c.exempt[uid] {
		return nil, allowEmpty
	}
	if p.isBlocked(uid) {
		return nil, deny(http.StatusForbidden, DenyUserBlocked, MsgUserBlocked, notePrefix+"user blocked")
	}
	snap := p.snap.Load()
	flow := snap.flowFor(meta.GetGroupId())
	if flow == nil {
		return nil, allowEmpty
	}
	fields := in.GetFields()
	model := fieldString(fields[FieldModel])
	if model == "" {
		model = meta.GetModel()
	}
	if !flow.Spec.ModelFilter.Allows(model) {
		return nil, allowEmpty
	}
	input := extractInput(fields, c.InputMaxChars)
	if input.Empty() {
		return nil, allowEmpty
	}
	if snap.isSelf(input.Text) {
		return nil, allowSelf
	}
	if len(input.Images) == 0 && visibleChars(input.Text) < c.MinChars {
		return nil, allowEmpty
	}
	level := p.watchLevel(uid)
	m := &moderation{cfg: c, flow: flow, snap: snap, in: input, timing: TimingPost}
	if c.Mode == ModeEnforce || level == LevelEnforce {
		m.timing = TimingPre
	}
	if m.timing == TimingPost && !sampled(input.Hash, flow.Spec.SampleRate) {
		return nil, allowEmpty
	}
	m.key = passKey(snap, flow, input.Hash)
	if p.passCached(m.key, m.timing == TimingPre) {
		p.stats.cacheHits.Add(1)
		p.countCacheHit(m, uid, meta.GetGroupId())
		return nil, allow(notePrefix + "pass (cached)")
	}
	protocol := meta.GetClientProtocol()
	if protocol == "" {
		protocol = meta.GetProtocol()
	}
	m.rec = eventRec{
		At: p.now().UTC(), RequestID: meta.GetRequestId(), UserID: uid, APIKeyID: meta.GetApiKeyId(),
		GroupID: meta.GetGroupId(), Model: textutil.TruncateRunes(model, 200), Protocol: protocol, Mode: c.Mode,
		Timing: m.timing, FlowID: flow.ID, FlowVersion: flow.Version, InputFormat: protocol,
		TextChars: len([]rune(input.Text)), TextHash: hex.EncodeToString(input.Hash[:]), ImageCount: len(input.Images),
		WatchLevel: level,
	}
	if c.StoreText {
		t := textutil.TruncateRunes(input.Text, textMaxChars)
		m.rec.Text = &t
	} else {
		input.Messages = nil // only kept for the record
	}
	if !snap.sendsImages(flow) {
		input.Images = nil // the hash and image_count are already taken
	}
	m.size = input.size()
	return m, nil
}

// passKey is the pass cache key: (config version, flow, flow version, input
// hash). The config version changes with every auditor, channel or default
// question set change, which a flow version does not see.
func passKey(s *snapshot, f *liveFlow, h [32]byte) string {
	return strconv.FormatInt(s.version, 10) + ":" + strconv.FormatInt(f.ID, 10) + ":" + strconv.Itoa(f.Version) + ":" + hex.EncodeToString(h[:])
}

// runPre moderates inline; a hit refuses the request.
func (p *Plugin) runPre(ctx context.Context, m *moderation) *pluginv1.GatewayRequestHookResponse {
	start := p.now()
	resp := p.moderatePre(ctx, m)
	denied := resp.GetDecision() == pluginv1.GatewayRequestHookResponse_DECISION_DENY
	if denied || ctx.Err() == nil { // a client that left without a hit added no latency (new-api gate.go)
		p.countRequest(m.rec.GroupID, p.now().Sub(start).Milliseconds(), denied)
	}
	return resp
}

func (p *Plugin) moderatePre(ctx context.Context, m *moderation) *pluginv1.GatewayRequestHookResponse {
	budget := min(m.flow.timeout, preBudget)
	ch := p.sf.DoChan(m.key, func() (any, error) {
		// The shared run has its own deadline, so a waiter that gives up
		// does not cancel it for the others.
		rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), budget)
		defer cancel()
		tr := p.run(rctx, m)
		return &tr, nil
	})
	var tr Trace
	select {
	case r := <-ch:
		tr = *r.Val.(*Trace)
	case <-ctx.Done():
		// The client is gone or the hook timed out: no record unless the
		// shared run hits (written by finish below once it returns).
		go func() {
			r := <-ch
			if t := *r.Val.(*Trace); t.Final == Hit {
				p.finish(m, t, false)
			}
		}()
		return allow(notePrefix + "error canceled")
	}
	refused := tr.Final == Hit
	if ctx.Err() != nil && !refused {
		return allow(traceNote(m, tr))
	}
	p.finish(m, tr, refused)
	if refused {
		return deny(m.cfg.BlockStatus, DenyBlocked, m.cfg.BlockMessage, traceNote(m, tr))
	}
	return allow(traceNote(m, tr))
}

// runPost moderates one queued request (worker). Jobs still queued when
// moderation is switched off are dropped without calling upstream.
func (p *Plugin) runPost(m *moderation) {
	if !p.cfg.Load().enabled {
		return
	}
	m.rec.QueueMs = int(p.now().Sub(m.queued).Milliseconds())
	if p.passCached(m.key, true) {
		p.stats.cacheHits.Add(1)
		p.countCacheHit(m, m.rec.UserID, m.rec.GroupID)
		return
	}
	ctx, cancel := context.WithTimeout(p.bg, m.flow.timeout)
	defer cancel()
	tr := p.run(ctx, m)
	if p.bg.Err() != nil {
		return
	}
	p.finish(m, tr, false)
}

// run executes the flow of m.
func (p *Plugin) run(ctx context.Context, m *moderation) Trace {
	tr := runFlow(ctx, m.flow.Spec, m.flow.timeout, func(ctx context.Context, id int64) Outcome {
		a := m.snap.auditors[id]
		if a == nil {
			return Outcome{AuditorID: id, Err: errAuditorMissing}
		}
		src := m.source
		if src == "" {
			src = SourceAudit
		}
		return p.audit(ctx, a, m.in, m.timing == TimingPre, src)
	})
	tr.TruncatedRun = m.in.TruncatedRun
	if m.source == "" && p.bg.Err() == nil { // runs cut short by Shutdown are not errors
		p.countRun(m, tr)
	}
	return tr
}

// finish caches a clean or overturned pass (new-api gate.go), counts the
// request on the user's day and records the run.
func (p *Plugin) finish(m *moderation, tr Trace, refused bool) {
	if tr.Final == Pass && !tr.Errored && !tr.Skipped && !tr.anySkipped() && !m.in.HasURLImage {
		p.passPut(m.cfg, m.key)
	}
	rec := m.rec
	rec.LatencyMs = int(tr.LatencyMs)
	rec.fillFromTrace(tr, refused)
	if m.source == "" {
		p.countUser(rec.UserID, rec.GroupID, rec.Result, rec.Severity)
	}
	if tr.firstStageHit() && m.cfg.StoreText {
		s := string(m.in.Messages)
		rec.InputMessage, rec.InputMessageSize = &s, len(s)
	}
	switch rec.Result {
	case ResultPass:
		if !m.cfg.RecordPass {
			return
		}
	case ResultOverturned:
		if !m.cfg.RecordOverturned {
			return
		}
	case ResultError:
		if !m.cfg.RecordErrors {
			return
		}
	}
	rec.KeepUntil = rec.At.Add(m.cfg.retention[rec.Result])
	p.eventWriter.Send(rec)
}

// traceNote renders "moderation: hit flow=3 v5 [a,b] 0.97".
func traceNote(m *moderation, tr Trace) string {
	var b strings.Builder
	b.WriteString(notePrefix)
	result := tr.Final
	switch {
	case tr.Final == Pass && tr.Errored:
		result = "error"
	case tr.Overturned:
		result = "overturned"
	}
	b.WriteString(result)
	fmt.Fprintf(&b, " flow=%d v%d", m.flow.ID, m.flow.Version)
	if hits := tr.HitCategories(); len(hits) > 0 {
		cats := make([]string, 0, len(hits))
		for _, h := range hits {
			cats = append(cats, h.Category)
		}
		fmt.Fprintf(&b, " [%s] %.2f", strings.Join(cats, ","), hits[0].Score)
	}
	return b.String()
}

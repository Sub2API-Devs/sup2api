package moderation

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"runtime/debug"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"unicode/utf8"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/textutil"
)

// Deny codes and messages.
const (
	DenyBlocked       = "moderation_blocked"
	DenyUserBlocked   = "moderation_user_blocked"
	DenyBusy          = "moderation_busy"
	DenyInputTooLarge = "moderation_input_too_large"
	MsgUserBlocked    = "该用户因多次违规已被暂停使用，请联系管理员"
	MsgBusy           = "提示词审核繁忙，请稍后重试 / moderation is busy, please retry later"
	MsgInputTooLarge  = "请求内容超出审核上限，请缩短后重试 / the request is too long to moderate, please shorten it"
	maxNoteBytes      = 1024
	notePrefix        = "moderation: "
	textMaxChars      = 100000

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
	chunks []*chunk
	plan   *plan // segment hashes and pieces for the verdict cache
	// asked: the reading of the last lookup of the verdict cache for this
	// request; its run stores the verdicts with it (settleVerdicts).
	asked  reading
	rec    eventRec
	timing string
	source string // cost source; "" = audit
	key    string // singleflight key
	size   int64  // bytes held while queued
	queued time.Time
	// counted: the post run is on the statistics; userCounted: finish has
	// counted the request on the user's day. A job that panics after either
	// is not counted again (postPanicked).
	counted     bool
	userCounted bool
}

// OnGatewayRequest implements pluginsdk.Hook (CONTRACTS §72.5). The ban
// hook (every protocol) only refuses banned users. The moderation hook
// moderates with the flow of the request's group, unless that flow depends
// on the account: then it leaves the request to the attempt hook, which
// moderates with the flow of each attempt's account (§72.17).
func (p *Plugin) OnGatewayRequest(ctx context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
	c := p.cfg.Load()
	early := p.precheck(c, in)
	meta := in.GetMeta()
	switch in.GetHookId() {
	case HookBan:
		if early == nil {
			early = allowEmpty
		}
		return early, nil
	case HookAttempt:
		if early != nil {
			return early, nil
		}
		snap := p.snap.Load()
		return p.moderate(ctx, c, in, snap, p.attemptFlow(snap, meta)), nil
	}
	if early == nil {
		snap := p.snap.Load()
		if p.attemptHook.Load() && snap.perAccount(meta.GetGroupId()) {
			p.attempts.leave(meta.GetRequestId())
			return allow(notePrefix + "per account"), nil
		}
		early = p.moderate(ctx, c, in, snap, snap.flowFor(meta.GetGroupId()))
	}
	return settled(early), nil
}

// moderate runs flow on the request (steps 3–10); nil flow = not moderated.
func (p *Plugin) moderate(ctx context.Context, c *config, in *pluginv1.GatewayRequestHookRequest, snap *snapshot, flow *liveFlow) *pluginv1.GatewayRequestHookResponse {
	// What is known without reading the body: a request no flow moderates
	// (flow == nil: its group has none, or the binding exempts it) and a
	// model the flow's filter leaves out are not moderated whatever is in
	// progress, so they are never answered busy.
	if flow == nil {
		return allowEmpty
	}
	model := requestModel(in)
	if !flow.Spec.ModelFilter.Allows(model) {
		return allowEmpty
	}
	// The hook request is held until this returns: admit it by its bytes
	// before reading it, and answer at once when too much is in progress
	// (instead of growing towards the memory limit). A request that would
	// be moderated first fails closed (503): under mode = enforce that is
	// every user who is not on the allowlist or at the observe level.
	size := hookRequestSize(in)
	if !p.admitBytes(c, size) {
		p.stats.busy.Add(1)
		if p.preModerated(c, in.GetMeta().GetUserId()) {
			return deny(http.StatusServiceUnavailable, DenyBusy, MsgBusy, notePrefix+"busy")
		}
		return allow(notePrefix + "busy")
	}
	defer p.inflightBytes.Add(-size)
	m, early := p.admit(ctx, c, in, snap, flow, model)
	if early != nil {
		return early
	}
	if m.timing == TimingPost {
		m.queued = p.now()
		for _, ch := range m.chunks {
			ch.detach()
		}
		if !p.enqueue(m) {
			p.stats.dropped.Add(1)
			return allow(notePrefix + "dropped (queue full)")
		}
		return allow(notePrefix + "queued")
	}
	return p.runPre(ctx, m)
}

// precheck applies the steps every hook takes (CONTRACTS §72.5 steps 1–2):
// off passes, banned users are refused. nil = go on.
func (p *Plugin) precheck(c *config, in *pluginv1.GatewayRequestHookRequest) *pluginv1.GatewayRequestHookResponse {
	if !c.enabled {
		return allowEmpty
	}
	if p.isBlocked(in.GetMeta().GetUserId()) {
		return deny(http.StatusForbidden, DenyUserBlocked, MsgUserBlocked, notePrefix+"user blocked")
	}
	return nil
}

// effectiveLevel is the user's watch level, or the default level without a
// live entry (new-api gate.go effectiveLevel).
func (p *Plugin) effectiveLevel(c *config, uid int64) string {
	if level := p.watchLevel(uid); level != "" {
		return level
	}
	return c.defaultLevel
}

// preModerated reports whether the user's requests are moderated before
// they are sent on (and refused on a hit): blocklisted users always,
// allowlisted users never, everyone else at the enforce level (new-api
// gate.go preModerated).
func (p *Plugin) preModerated(c *config, uid int64) bool {
	switch {
	case c.blocklisted(uid):
		return true
	case c.allowlisted(uid):
		return false
	}
	return p.effectiveLevel(c, uid) == LevelEnforce
}

// requestModel is the client model of a hook request: the model field, or
// the model of the request's meta.
func requestModel(in *pluginv1.GatewayRequestHookRequest) string {
	if model := fieldString(in.GetFields()[FieldModel]); model != "" {
		return model
	}
	return in.GetMeta().GetModel()
}

// hookRequestSize is the bytes of the hook fields (what the request holds).
func hookRequestSize(in *pluginv1.GatewayRequestHookRequest) int64 {
	var n int64
	for k, v := range in.GetFields() {
		n += int64(len(k) + len(v))
	}
	return n
}

// admitBytes takes size bytes of the max_inflight_mb budget. One request is
// always admitted, however large, so a single request above the budget is
// still moderated.
func (p *Plugin) admitBytes(c *config, size int64) bool {
	if n := p.inflightBytes.Add(size); n > c.maxInflight && n != size {
		p.inflightBytes.Add(-size)
		return false
	}
	return true
}

// admit applies the remaining preconditions (steps 4–8) for flow, a flow of
// snap whose model filter takes model, the request's model. A non-nil
// response ends the hook; otherwise m is ready to run. ctx is the hook
// call's (planUncached).
func (p *Plugin) admit(ctx context.Context, c *config, in *pluginv1.GatewayRequestHookRequest, snap *snapshot, flow *liveFlow, model string) (*moderation, *pluginv1.GatewayRequestHookResponse) {
	meta := in.GetMeta()
	uid := meta.GetUserId()
	protocol := meta.GetClientProtocol()
	if protocol == "" {
		protocol = meta.GetProtocol()
	}
	pieces, moderated := extractPieces(protocol, in.GetFields())
	if !moderated {
		return nil, allowEmpty
	}
	req := buildRequest(pieces)
	if len(req.segs) == 0 {
		return nil, allowEmpty
	}
	if req.texts(snap.isSelf) {
		return nil, allowSelf
	}
	if req.images == 0 && req.visible < c.MinChars {
		return nil, allowEmpty
	}
	m := &moderation{cfg: c, flow: flow, snap: snap, timing: TimingPost}
	if p.preModerated(c, uid) {
		m.timing = TimingPre
	}
	if m.timing == TimingPost && !sampled(req.hash, flow.Spec.SampleRate) {
		return nil, allowEmpty
	}
	m.rec = eventRec{
		At: p.now().UTC(), RequestID: meta.GetRequestId(), UserID: uid, APIKeyID: meta.GetApiKeyId(),
		GroupID: meta.GetGroupId(), Model: textutil.TruncateRunes(model, 200), Protocol: protocol, Mode: c.Mode,
		Endpoint: textutil.TruncateRunes(meta.GetEndpoint(), 255), SessionFp: textutil.TruncateRunes(meta.GetSessionFingerprint(), 64),
		Timing: m.timing, FlowID: flow.ID, FlowVersion: flow.Version, InputFormat: protocol,
		TextHash: hex.EncodeToString(req.hash[:]), WatchLevel: p.watchLevel(uid),
	}
	pl, early := p.planUncached(ctx, m, req)
	if early != nil {
		return nil, early
	}
	if pl.trace.Sampled && c.InputOverflow == OverflowBlock && m.timing == TimingPre {
		return nil, deny(c.BlockStatus, DenyInputTooLarge, MsgInputTooLarge,
			fmt.Sprintf("%sinput too large (%d chunks, limit %d)", notePrefix, pl.trace.ChunksTotal, c.InputMaxChunks))
	}
	m.chunks, m.plan = pl.chunks, pl
	m.key = runKey(snap, flow, pl.chunks)
	m.rec.TextChars, m.rec.ImageCount = pl.trace.Chars, pl.trace.Images
	if c.StoreText {
		t := textutil.TruncateRunes(m.text(), textMaxChars)
		m.rec.Text = &t
	}
	if !snap.sendsImages(flow) {
		for _, ch := range m.chunks {
			// image_count is already taken. The chunk still lists the
			// segments of its images (segs): they pass with it, for this
			// flow has nothing to say about an image - the fingerprint
			// changes when an auditor that takes images joins it. A hit
			// names only what was sent (sentKeys).
			ch.dropImages()
		}
	}
	for _, ch := range m.chunks {
		m.size += ch.size()
	}
	return m, nil
}

// planUncached asks the verdict cache about the segments of the request
// (post: memory only, the worker asks the KV) and plans the chunks of what
// is left to moderate - in a mixed flow (snapshot.mixedImages), with an image
// that is not cached and is sent, the cached text of the request too
// (makePlan). A non-nil response ends the hook: a cached hit whose whole
// segment set is in the request decides it at once (replay), and a request
// whose segments have all passed is not sent again.
//
// Under pre timing the lookup asks the KV too, on ctx, the hook call
// (lookupVerdicts). When that ends first, what was not read is unknown: the
// request goes on to its run like any other, where a client that left is
// dealt with (runPre).
func (p *Plugin) planUncached(ctx context.Context, m *moderation, req *request) (*plan, *pluginv1.GatewayRequestHookResponse) {
	hashes := make([][32]byte, len(req.segs))
	for i := range req.segs {
		hashes[i] = req.segs[i].key
	}
	cached := p.lookupVerdicts(ctx, m.snap.scopeOf(m.flow), hashes, m.timing == TimingPre)
	m.asked = cached.asked
	if cached.hit != nil {
		// Known limitation, kept as in new-api (gate.go planAudit: a cached
		// hit ends the plan): the replay decides the whole request, so what
		// the request holds beside the hit set - new content after a hit in
		// the history of a conversation - is not moderated in this request.
		// Under post timing such a conversation is recorded as a replayed
		// hit on every turn and its new content is never sent to an
		// auditor; under pre timing the request is refused anyway.
		return nil, p.replaySafely(m, req, cached.hit, cached.hitID)
	}
	lim := m.cfg.limits
	lim.mixed = m.snap.mixedImages(m.flow)
	pl := req.makePlan(lim, func(h [32]byte) bool { return cached.passed[h] })
	if len(pl.chunks) > 0 {
		return pl, nil
	}
	if pl.trace.Cached == 0 {
		return nil, allowEmpty // only images beyond input_max_images
	}
	p.stats.cacheHits.Add(1)
	p.countCacheHit(m, m.rec.UserID, m.rec.GroupID)
	return nil, allow(notePrefix + "pass (cached)")
}

// text is the moderated text of every chunk (the record text).
func (m *moderation) text() string {
	texts := make([]string, 0, len(m.chunks))
	for _, ch := range m.chunks {
		if ch.in.Text != "" {
			texts = append(texts, ch.in.Text)
		}
	}
	return strings.Join(texts, "\n")
}

// runKey is the singleflight key of a run: the cache scope of the flow
// (clear counter, flow, verdict fingerprint) and the chunks' hashes.
func runKey(s *snapshot, f *liveFlow, chunks []*chunk) string {
	h := sha256.New()
	for _, ch := range chunks {
		h.Write(ch.in.Hash[:])
	}
	return "r:" + s.scopeOf(f) + ":" + hex.EncodeToString(h.Sum(nil))
}

// sharedRun is one pre run shared by concurrent requests with the same
// input (singleflight): the run of every chunk and their combined trace;
// counted makes its flow statistics count once. Its verdicts are stored by
// the run itself, once, whoever waits for it.
type sharedRun struct {
	tr      Trace
	counted atomic.Bool
}

// runPre moderates inline; a hit refuses the request. Without a hit, a
// client that left adds nothing: no request, run or record. A hit is
// counted and recorded as a refusal even after the client left, so
// disconnecting cannot dodge the watch list (new-api gate.go runPre). The
// verdicts of the run go to the cache in either case (new-api stores them
// before it looks at the context), in the background and without the request
// waiting for it (storeVerdicts). The record is written after the answer
// (finish), never before it.
func (p *Plugin) runPre(ctx context.Context, m *moderation) *pluginv1.GatewayRequestHookResponse {
	start := p.now()
	budget := min(m.flow.timeout, preBudget)
	ch := p.sf.DoChan(m.key, func() (r any, _ error) {
		// singleflight hands a panic of this function to a goroutine of its
		// own (go panic), where neither the SDK's recover around the hook nor
		// anything else can catch it: it would end the plugin process. So it
		// is caught here. A panic before the chunks have run leaves a run
		// that errored - counted and recorded as one, the request passes (the
		// error path). After that the runs stand: what the auditors decided,
		// a hit above all, is the result although storing it in the cache
		// (which is best effort) did not work out (afterPanic).
		var runs []Trace
		defer func() {
			if v := recover(); v != nil {
				p.log.Error("moderation: pre run panicked", "request_id", m.rec.RequestID, "panic", fmt.Sprint(v), "stack", string(debug.Stack()))
				r = &sharedRun{tr: afterPanic(runs, m.combine)}
			}
		}()
		// The shared run has its own deadline, so a waiter that gives up
		// does not cancel it for the others.
		rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), budget)
		defer cancel()
		runs = p.runChunks(rctx, m)
		// Stored here and not by the waiters: once for all of them, and
		// also when every one of them has left.
		p.settleVerdicts(m, runs)
		return &sharedRun{tr: m.combine(runs)}, nil
	})
	var r *sharedRun
	p.stats.preWaiting.Add(1)
	select {
	case res := <-ch:
		p.stats.preWaiting.Add(-1)
		r = res.Val.(*sharedRun)
	case <-ctx.Done():
		p.stats.preWaiting.Add(-1)
		// The client is gone or the hook timed out: the shared run goes on
		// and only a hit is concluded once it returns.
		p.goTracked(func() {
			res := <-ch
			if r := res.Val.(*sharedRun); r.tr.Final == Hit {
				p.concludePre(m, r, start)
			}
		})
		return allow(notePrefix + "error canceled")
	}
	refused := r.tr.Final == Hit
	if ctx.Err() != nil && !refused {
		return allow(traceNote(m, r.tr))
	}
	p.concludeSafely(m, r, start)
	if refused {
		return deny(m.cfg.BlockStatus, DenyBlocked, m.cfg.BlockMessage, traceNote(m, r.tr))
	}
	return allow(traceNote(m, r.tr))
}

// concludeSafely is concludePre on the goroutine of the hook. A panic while
// the request is counted or its record handed over is logged and ends there:
// the answer is the one the run decided. Left to the SDK's recover the hook
// would fail, and the core lets a request through whose hook failed
// (manifest: failure "open") - also one the auditors judged a hit.
func (p *Plugin) concludeSafely(m *moderation, r *sharedRun, start time.Time) {
	defer func() {
		if v := recover(); v != nil {
			p.log.Error("moderation: concluding the pre run panicked; the verdict stands", "request_id", m.rec.RequestID,
				"final", r.tr.Final, "panic", fmt.Sprint(v), "stack", string(debug.Stack()))
		}
	}()
	p.concludePre(m, r, start)
}

// replaySafely is replay on the goroutine of the hook: a panic while the
// replayed hit is counted or recorded is logged, and the answer is the one of
// the replay - a refusal under pre timing (concludeSafely has the reason).
func (p *Plugin) replaySafely(m *moderation, req *request, hit *storedHit, id string) (resp *pluginv1.GatewayRequestHookResponse) {
	defer func() {
		if v := recover(); v != nil {
			p.log.Error("moderation: replaying a cached hit panicked; the verdict stands", "request_id", m.rec.RequestID,
				"panic", fmt.Sprint(v), "stack", string(debug.Stack()))
			resp = allow(notePrefix + "hit (replay)")
			if m.timing == TimingPre {
				resp = deny(m.cfg.BlockStatus, DenyBlocked, m.cfg.BlockMessage, notePrefix+"hit replay")
			}
		}
	}()
	return p.replay(m, req, hit, id)
}

// panickedRun is the trace of a run that panicked: nothing judged, an error.
func panickedRun() Trace { return Trace{Final: Pass, Decider: -1, Errored: true} }

// afterPanic is the trace of a shared pre run that panicked. runs are the
// runs of its chunks, nil when the panic came before they returned: then
// nothing judged (panickedRun). With them the panic came while the verdicts
// were stored or the runs combined, and the result is the combined runs
// (combine, moderation.combine) as without the panic. Should combining them
// panic (again), the first run that hit stands alone: a hit the auditors
// decided is never turned into a pass. It is its chunk's own run, with the
// number of the chunk when there are several (as combineTraces numbers them;
// the record names the hit set of that chunk, finish) and without the other
// runs and the request's input; without a hit nothing judged (panickedRun).
func afterPanic(runs []Trace, combine func([]Trace) Trace) (tr Trace) {
	if runs == nil {
		return panickedRun()
	}
	defer func() {
		if recover() != nil {
			tr = panickedRun()
			for i := range runs {
				if runs[i].Final == Hit {
					tr = runs[i]
					if len(runs) > 1 {
						tr.Chunk = i + 1
					}
					break
				}
			}
		}
	}()
	return combine(runs)
}

// concludePre counts the request (with the latency moderation added) and the
// shared run, and records the result; a hit is a refusal. It never waits
// for the database: the record goes to the event writer, or to the
// background store when the writer's queue is full (finish).
func (p *Plugin) concludePre(m *moderation, r *sharedRun, start time.Time) {
	refused := r.tr.Final == Hit
	p.countRequest(m.rec.GroupID, p.now().Sub(start).Milliseconds(), refused)
	if r.counted.CompareAndSwap(false, true) && p.bg.Err() == nil { // runs cut short by Shutdown are not errors
		p.countRun(m, r.tr)
	}
	p.finish(m, r.tr, refused)
}

// runPost moderates one queued request (worker). Jobs still queued when
// moderation is switched off are dropped without calling upstream.
func (p *Plugin) runPost(m *moderation) {
	if !p.cfg.Load().enabled {
		return
	}
	m.rec.QueueMs = int(p.now().Sub(m.queued).Milliseconds())
	if m.plan != nil {
		// What the cache learned since the job was queued, now with the KV:
		// a cached hit is replayed, and nothing runs when every moderated
		// segment has passed meanwhile (another request with the same
		// content, or a review). The cache is asked under the clear counter
		// of now (scopeNow), not of the snapshot the job was queued with:
		// after a clear the job is answered by what the cache learned since
		// the clear, or runs. Its verdicts are stored with the reading of
		// this lookup, so what was reviewed before it, the job saw.
		cached := p.lookupVerdicts(p.postCtx, p.scopeNow(m.flow), m.plan.keys, true)
		m.asked = cached.asked
		if cached.hit != nil {
			p.replay(m, nil, cached.hit, cached.hitID)
			return
		}
		if m.allPassed(cached.passed) {
			p.stats.cacheHits.Add(1)
			p.countCacheHit(m, m.rec.UserID, m.rec.GroupID)
			return
		}
	}
	ctx, cancel := context.WithTimeout(p.postCtx, m.flow.timeout)
	defer cancel()
	runs := p.runChunks(ctx, m)
	if p.postCtx.Err() != nil { // runs cut short by Shutdown are not errors
		return
	}
	p.settleVerdicts(m, runs)
	tr := m.combine(runs)
	p.countRun(m, tr)
	m.counted = true
	p.finish(m, tr, false)
}

// allPassed reports whether every segment of the chunks is in passed.
func (m *moderation) allPassed(passed map[[32]byte]bool) bool {
	for _, ch := range m.chunks {
		for _, s := range ch.segs {
			if !passed[m.plan.keys[s]] {
				return false
			}
		}
	}
	return true
}

// run executes the flow of m on every chunk and combines the runs. The
// caller counts the run (countRun) once it knows the run is to be counted.
func (p *Plugin) run(ctx context.Context, m *moderation) Trace {
	return m.combine(p.runChunks(ctx, m))
}

// runChunks executes the flow of m on every chunk, concurrently; the result
// holds the run of chunk i at i.
func (p *Plugin) runChunks(ctx context.Context, m *moderation) []Trace {
	trs := make([]Trace, len(m.chunks))
	if len(m.chunks) == 1 {
		trs[0] = p.runChunk(ctx, m, m.chunks[0].in)
	} else {
		var wg sync.WaitGroup
		for i, ch := range m.chunks {
			wg.Add(1)
			go func() {
				defer wg.Done()
				trs[i] = p.runChunk(ctx, m, ch.in)
			}()
		}
		wg.Wait()
	}
	return trs
}

// combine makes the request's trace of the chunk runs (combineTraces).
func (m *moderation) combine(runs []Trace) Trace {
	tr := combineTraces(runs)
	if m.plan != nil {
		it := m.plan.trace
		tr.Input = &it
	}
	return tr
}

func (p *Plugin) runChunk(ctx context.Context, m *moderation, in *Input) Trace {
	return runFlow(ctx, m.flow.Spec, m.flow.timeout, func(ctx context.Context, id int64, prior []HitCategory) Outcome {
		a := m.snap.auditors[id]
		if a == nil {
			return Outcome{AuditorID: id, Err: errAuditorMissing}
		}
		src := m.source
		if src == "" {
			src = SourceAudit
		}
		return p.audit(ctx, a, in, prior, m.timing == TimingPre, src)
	})
}

// settleVerdicts stores what the runs decided in the verdict cache, each
// chunk by its own run (runs[i] is chunk i; new-api gate.go settleBlocks):
// nothing for a chunk with a URL image (its content can change behind the
// same address) or a run that errored, hit or pass - a hit may stand only
// because a later stage failed, so the content is moderated again; a hit is
// stored for the set of segments of the chunk; a pass (also an overturned
// one) counts for the chunk's segments unless a whole stage was skipped. A
// segment is stored as a pass when every chunk holding it passed.
//
// An image counts only when an auditor received it in a call that judged: one
// that was skipped - not redrawn in time, too large, undecodable, beyond the
// request budget, left out of a retry, unusable for the OpenAI auditor - is
// neither stored as a pass nor part of the hit set. For the set of a hit any
// judging auditor of the run will do (Trace.receivedImages); for a pass the
// image must have been received by an auditor that itself passed, in a stage
// that passed (Trace.passedImages) - not by one that hit while another
// auditor, which never got the image, passed the text. An image nobody
// received is moderated again with the next request that holds it, together
// with the text of that request, although that has passed (makePlan).
//
// A chunk whose run ends in a pass while it holds an image that some auditor
// received and no passing auditor did (Trace.judgedUnpassedImage: the first
// stage hit because of the image and a text-only reviewer overturned it, or
// one all / at_least stage whose passing auditors did not get the image)
// stores no pass for ANY of its segments, the text included (the owner's
// decision of 2026-11-10): the request is let through, like an audit that
// reached no conclusion, and it gets that result every time - the same
// request is not let through first and refused later.
//
// Two things make that hold. Nothing is stored here, so the request does not
// cache its own text. And in a mixed flow (some auditors take images, some do
// not: snapshot.mixedImages) the plan keeps the text of a request beside an
// image that is not cached, also text that some OTHER request cached as
// passed (makePlan, fifth round): were it left out, the image would be alone
// in its chunk, the auditor that got it would hit again, the reviewer would
// have nothing to judge and be skipped, and the request that was let through
// would be refused, counted as a violation and replayed as a hit from then
// on. So the result of a request does not depend on what other requests
// cached. The cost: these requests are never answered from the cache, every
// one of them calls the auditors again, and a request with an image that is
// not cached sends its text again although it is cached. (new-api refuses
// them: there an image is a block of its own, which a text-only auditor
// cannot overturn.) A flow whose auditors all take images does not keep the
// text: its reviewer gets the image too, and the case that is left there is
// described at makePlan.
//
// The exception that stays: a request that holds ONLY the image. No reviewer
// has anything to judge there, the hit of the auditor that got the image
// stands, and {image} is cached as a hit. From then on every request that
// holds the image is refused by replay, also one that was let through
// before. That hit was established by a different request.
//
// It is called once per run (the shared pre run, the post worker), not per
// request. It decides what is stored and hands it over (storeVerdicts),
// under the clear counter of now (scopeNow) and with the reading of the
// request's lookup (m.asked): the write runs in the background, and leaves
// alone what a review changed since the request asked the cache (writeRun).
func (p *Plugin) settleVerdicts(m *moderation, runs []Trace) {
	if m.plan == nil || m.cfg.cacheTTL <= 0 {
		return
	}
	passed := map[int]int{}
	var hits []storedHit
	at := p.now().Unix()
	for i := range min(len(runs), len(m.chunks)) {
		run, ch := &runs[i], m.chunks[i]
		switch {
		case ch.in.HasURLImage, run.Errored:
		case run.Final == Hit:
			if keys := m.sentKeys(ch, run); len(keys) > 0 {
				hits = append(hits, newStoredHit(m.rec.RequestID, hexKeys(keys), *run, at))
			}
		case run.judgedUnpassedImage():
			// Nothing is stored: judged as a whole again the next time.
		case !run.stageSkipped():
			skipped := m.unreceived(ch, run.passedImages)
			for _, s := range ch.segs {
				if !skipped[s] {
					passed[s]++
				}
			}
		}
	}
	var passes [][32]byte
	for s, key := range m.plan.keys {
		if n := passed[s]; n > 0 && n == m.plan.pieces[s] {
			passes = append(passes, key)
		}
	}
	p.storeVerdicts(p.scopeNow(m.flow), passes, hits, at, m.cfg.cacheTTL, m.asked)
}

// unreceived are the request segments of the images of ch that are not among
// received(), the images of its run that count (Trace.receivedImages for a
// hit, Trace.passedImages for a pass): nothing was decided about them. The
// images of a chunk are its image parts, in order. The images a flow without
// an image auditor dropped (dropImages) are no parts and not among them: such
// a flow has nothing to say about an image, and they pass with their chunk
// (admit).
func (m *moderation) unreceived(ch *chunk, received func() map[int]bool) map[int]bool {
	var out map[int]bool
	var got map[int]bool
	image := 0
	for _, part := range ch.parts {
		if part.img == nil {
			continue
		}
		if got == nil {
			got, out = received(), map[int]bool{}
		}
		if !got[image] {
			out[part.seg] = true
		}
		image++
	}
	return out
}

// sentKeys are the hashes of the segments of a chunk the auditors of run,
// its run, judged, in request order: the segments with a part in it, without
// the images no auditor received (unreceived). The images a flow without an
// image auditor dropped (dropImages) are not among them either, so the hit
// set of the chunk is what was judged and nothing else.
func (m *moderation) sentKeys(ch *chunk, run *Trace) [][32]byte {
	skipped := m.unreceived(ch, run.receivedImages)
	var keys [][32]byte
	last := -1
	for _, part := range ch.parts {
		if part.seg != last && !skipped[part.seg] {
			keys = append(keys, m.plan.keys[part.seg])
			last = part.seg
		}
	}
	return keys
}

// replay decides a request with a cached hit (new-api gate.go replayHit): no
// upstream call, no concurrency slot, no shared run. The stored trace is
// recorded as this request's, marked replayed; a pre request is refused, a
// post one is recorded as a hit. A replay is not a new violation: it is
// counted on the flow row (countReplay) but not on the user's day, and its
// record changes neither the watch list nor the bans (afterWrite).
//
// req is the request (admit); nil for a queued post job, whose record then
// only shows the segments of the hit that are in its chunks - the ones that
// had passed when it was queued are not kept.
func (p *Plugin) replay(m *moderation, req *request, hit *storedHit, id string) *pluginv1.GatewayRequestHookResponse {
	in := make(map[string]bool, len(hit.Keys))
	for _, k := range hit.Keys {
		in[k] = true
	}
	shown := &chunk{}
	segments := 0
	if req != nil {
		segments = len(req.segs)
		images := m.snap.sendsImages(m.flow)
		for i := range req.segs {
			s := &req.segs[i]
			switch {
			case !in[hex.EncodeToString(s.key[:])]:
			case s.img == nil:
				shown.parts = append(shown.parts, chunkPart{seg: i, role: s.role, text: s.text})
			case images:
				shown.parts = append(shown.parts, chunkPart{seg: i, role: s.role, img: s.img})
			}
		}
	} else if m.plan != nil {
		segments = len(m.plan.keys)
		for _, ch := range m.chunks {
			for _, part := range ch.parts {
				if key := m.plan.keys[part.seg]; in[hex.EncodeToString(key[:])] {
					shown.parts = append(shown.parts, part)
				}
			}
		}
	}
	var texts []string
	images := 0
	for _, part := range shown.parts {
		if part.img != nil {
			images++
		} else {
			texts = append(texts, part.text)
		}
	}
	text := strings.Join(texts, "\n")

	tr := hit.Trace.ownRun()
	tr.LatencyMs = 0
	tr.Input = &InputTrace{Segments: segments, Chars: utf8.RuneCountInString(text), Images: images}
	tr.Cache = &CacheInfo{Hit: true, SourceRequestID: hit.RequestID, Key: id, Segs: hit.Keys, FP: m.flow.fp}
	refused := m.timing == TimingPre
	rec := m.rec
	rec.Replayed = true
	rec.TextChars, rec.ImageCount = tr.Input.Chars, images
	rec.fillFromTrace(tr, refused)
	if m.cfg.StoreText {
		t := textutil.TruncateRunes(text, textMaxChars)
		rec.Text = &t
		if len(shown.parts) > 0 {
			rec.setInputMessage(shown)
		}
	}
	p.countReplay(m)
	p.record(m.cfg, rec)
	if refused {
		return deny(m.cfg.BlockStatus, DenyBlocked, m.cfg.BlockMessage, traceNote(m, tr)+" replay")
	}
	return allow(notePrefix + "hit (replay)")
}

// chunkOf returns the chunk a (combined) trace shows.
func (m *moderation) chunkOf(tr Trace) *chunk {
	idx := max(tr.Chunk-1, 0)
	if idx >= len(m.chunks) {
		return nil
	}
	return m.chunks[idx]
}

// finish counts the request on the user's day and records the run (its
// verdicts are on their way to the cache by then, settleVerdicts). It never
// blocks on the database (CONTRACTS §72.5 step 10): a suspicious record the
// event writer cannot take goes to the background store (storeSuspicious),
// anything else is dropped.
func (p *Plugin) finish(m *moderation, tr Trace, refused bool) {
	// A hit names the hit set of its verdict chunk, also when the run errored
	// and nothing was cached: confirming the record stores it (syncReviewed).
	if ch := m.chunkOf(tr); m.plan != nil && ch != nil && tr.Final == Hit && !ch.in.HasURLImage {
		if keys := m.sentKeys(ch, &tr); len(keys) > 0 {
			tr.Cache = &CacheInfo{Key: hitID(keys), Segs: hexKeys(keys), FP: m.flow.fp}
		}
	}
	rec := m.rec
	rec.LatencyMs = int(tr.LatencyMs)
	rec.fillFromTrace(tr, refused)
	if m.source == "" {
		p.countUser(rec.UserID, rec.GroupID, rec.Result, rec.Severity)
	}
	m.userCounted = true
	if rec.Result == ResultError && rec.Text != nil {
		// Records of a channel outage keep only the start of the text
		// (error_text_max_chars, CONTRACTS §72.9).
		if m.cfg.ErrorTextMaxChars <= 0 {
			rec.Text = nil
		} else {
			t := textutil.TruncateRunes(*rec.Text, m.cfg.ErrorTextMaxChars)
			rec.Text = &t
		}
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
	// The raw messages of the verdict chunk: always when a stage hit, of the
	// other records with record_pass_input_message; never of an error
	// record (§72.9). Built only here, for a record that is written: with
	// images it is megabytes, and most requests pass without a record.
	if m.cfg.StoreText && rec.Result != ResultError && (tr.keepsMessage() || m.cfg.RecordPassInputMessage) {
		if ch := m.chunkOf(tr); ch != nil {
			rec.setInputMessage(ch)
		}
	}
	p.record(m.cfg, rec)
}

// setInputMessage gives the record the raw messages of a chunk.
func (r *eventRec) setInputMessage(ch *chunk) {
	s := string(ch.messages())
	r.InputMessage, r.InputMessageSize = &s, len(s)
}

// record hands a record to the event writer, kept for the retention of its
// result. When the writer cannot take it (its queue is full, or it is
// stopped), a suspicious record - it drives the watch list, the violation
// count and the ban - is stored in the background with retries (new-api
// worker.go enqueue); anything else is dropped and counted.
func (p *Plugin) record(c *config, rec eventRec) {
	rec.KeepUntil = rec.At.Add(c.retention[rec.Result])
	if p.sendEvent(rec) {
		return
	}
	if rec.suspicious() {
		p.storeSuspicious(rec)
		return
	}
	p.stats.droppedEvents.Add(1)
}

// traceNote renders "moderation: hit flow=3 v5 [a,b] 0.97".
func traceNote(m *moderation, tr Trace) string {
	var b strings.Builder
	b.WriteString(notePrefix)
	b.WriteString(tr.verdict())
	fmt.Fprintf(&b, " flow=%d v%d", m.flow.ID, m.flow.Version)
	if hits := tr.HitCategories(); len(hits) > 0 {
		cats := make([]string, 0, len(hits))
		for _, h := range hits {
			cats = append(cats, h.Category)
		}
		fmt.Fprintf(&b, " [%s] %.2f", strings.Join(cats, ","), hits[0].Score)
	}
	if tr.Input != nil && tr.Input.Chunks > 1 {
		fmt.Fprintf(&b, " chunk=%d/%d", max(tr.Chunk, 1), tr.Input.Chunks)
	}
	return b.String()
}

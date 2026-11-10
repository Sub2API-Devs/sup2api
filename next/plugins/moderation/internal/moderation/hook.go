package moderation

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
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
	rec    eventRec
	timing string
	source string // cost source; "" = audit
	key    string // singleflight key
	size   int64  // bytes held while queued
	queued time.Time
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
	if flow == nil {
		return allowEmpty
	}
	// The hook request is held until this returns: admit it by its bytes
	// before reading it, and answer at once when too much is in progress
	// (instead of growing towards the memory limit).
	size := hookRequestSize(in)
	if !p.admitBytes(c, size) {
		p.stats.busy.Add(1)
		if p.preModerated(c, in.GetMeta().GetUserId()) {
			return deny(http.StatusServiceUnavailable, DenyBusy, MsgBusy, notePrefix+"busy")
		}
		return allow(notePrefix + "busy")
	}
	defer p.inflightBytes.Add(-size)
	m, early := p.admit(c, in, snap, flow)
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
// snap. A non-nil response ends the hook; otherwise m is ready to run.
func (p *Plugin) admit(c *config, in *pluginv1.GatewayRequestHookRequest, snap *snapshot, flow *liveFlow) (*moderation, *pluginv1.GatewayRequestHookResponse) {
	meta := in.GetMeta()
	uid := meta.GetUserId()
	fields := in.GetFields()
	model := fieldString(fields[FieldModel])
	if model == "" {
		model = meta.GetModel()
	}
	if !flow.Spec.ModelFilter.Allows(model) {
		return nil, allowEmpty
	}
	protocol := meta.GetClientProtocol()
	if protocol == "" {
		protocol = meta.GetProtocol()
	}
	pieces, moderated := extractPieces(protocol, fields)
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
	hashes := make([][32]byte, len(req.segs))
	for i := range req.segs {
		hashes[i] = req.segs[i].key
	}
	// The cached verdicts (post: memory only, the worker asks the KV): a
	// cached hit whose whole segment set is in the request decides it at
	// once; the segments that passed are not sent again.
	cached := p.lookupVerdicts(snap, flow, hashes, m.timing == TimingPre)
	if cached.hit != nil {
		return nil, p.replay(m, req, cached.hit, cached.hitID)
	}
	pl := req.makePlan(c.limits, func(h [32]byte) bool { return cached.passed[h] })
	if len(pl.chunks) == 0 {
		if pl.trace.Cached == 0 {
			return nil, allowEmpty // only images beyond input_max_images
		}
		p.stats.cacheHits.Add(1)
		p.countCacheHit(m, uid, meta.GetGroupId())
		return nil, allow(notePrefix + "pass (cached)")
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
			ch.dropImages() // image_count is already taken
		}
	}
	for _, ch := range m.chunks {
		m.size += ch.size()
	}
	return m, nil
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
// counted makes its flow statistics count once.
type sharedRun struct {
	tr      Trace
	runs    []Trace
	counted atomic.Bool
}

// runPre moderates inline; a hit refuses the request. Without a hit, a
// client that left adds nothing: no request, run or record. A hit is
// counted and recorded as a refusal even after the client left, so
// disconnecting cannot dodge the watch list (new-api gate.go runPre). The
// record is written after the answer (finish), never before it.
func (p *Plugin) runPre(ctx context.Context, m *moderation) *pluginv1.GatewayRequestHookResponse {
	start := p.now()
	budget := min(m.flow.timeout, preBudget)
	ch := p.sf.DoChan(m.key, func() (any, error) {
		// The shared run has its own deadline, so a waiter that gives up
		// does not cancel it for the others.
		rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), budget)
		defer cancel()
		runs := p.runChunks(rctx, m)
		return &sharedRun{tr: m.combine(runs), runs: runs}, nil
	})
	var r *sharedRun
	select {
	case res := <-ch:
		r = res.Val.(*sharedRun)
	case <-ctx.Done():
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
	p.concludePre(m, r, start)
	if refused {
		return deny(m.cfg.BlockStatus, DenyBlocked, m.cfg.BlockMessage, traceNote(m, r.tr))
	}
	return allow(traceNote(m, r.tr))
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
	p.finish(m, r.tr, r.runs, refused)
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
		// content).
		cached := p.lookupVerdicts(m.snap, m.flow, m.plan.keys, true)
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
	tr := m.combine(runs)
	p.countRun(m, tr)
	p.finish(m, tr, runs, false)
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
func (p *Plugin) settleVerdicts(m *moderation, runs []Trace) {
	if m.plan == nil || m.cfg.cacheTTL <= 0 {
		return
	}
	passed := map[int]int{}
	var hits []storedHit
	now := p.now().Unix()
	for i := range min(len(runs), len(m.chunks)) {
		run, ch := &runs[i], m.chunks[i]
		switch {
		case ch.in.HasURLImage, run.Errored:
		case run.Final == Hit:
			tr := *run
			tr.Chunk, tr.Chunks, tr.Input, tr.Cache, tr.InputMessageDropped = 0, nil, nil, nil, ""
			hits = append(hits, storedHit{RequestID: m.rec.RequestID, Keys: hexKeys(m.segKeys(ch)), Trace: tr, At: now})
		case !run.stageSkipped():
			for _, s := range ch.segs {
				passed[s]++
			}
		}
	}
	var passes [][32]byte
	for s, key := range m.plan.keys {
		if n := passed[s]; n > 0 && n == m.plan.pieces[s] {
			passes = append(passes, key)
		}
	}
	p.storeVerdicts(m.cfg, m.snap, m.flow, passes, hits)
}

// segKeys are the hashes of the segments a chunk holds, in request order.
func (m *moderation) segKeys(ch *chunk) [][32]byte {
	keys := make([][32]byte, len(ch.segs))
	for i, s := range ch.segs {
		keys[i] = m.plan.keys[s]
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

	tr := hit.Trace
	tr.LatencyMs, tr.Chunk, tr.Chunks, tr.InputMessageDropped = 0, 0, nil, ""
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
			s := string(shown.messages())
			rec.InputMessage, rec.InputMessageSize = &s, len(s)
		}
	}
	rec.KeepUntil = rec.At.Add(m.cfg.retention[rec.Result])
	p.countReplay(m)
	if !p.sendEvent(rec) {
		p.storeSuspicious(rec)
	}
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

// finish stores the verdicts of the chunk runs in the cache, counts the
// request on the user's day and records the run. It never blocks on the
// database (CONTRACTS §72.5 step 10): a suspicious record the event writer
// cannot take goes to the background store (storeSuspicious), anything else
// is dropped.
func (p *Plugin) finish(m *moderation, tr Trace, runs []Trace, refused bool) {
	p.settleVerdicts(m, runs)
	// A hit names the hit set of its verdict chunk, also when the run errored
	// and nothing was cached: confirming the record stores it (syncReviewed).
	if ch := m.chunkOf(tr); m.plan != nil && ch != nil && tr.Final == Hit && !ch.in.HasURLImage {
		keys := m.segKeys(ch)
		tr.Cache = &CacheInfo{Key: hitID(keys), Segs: hexKeys(keys), FP: m.flow.fp}
	}
	rec := m.rec
	rec.LatencyMs = int(tr.LatencyMs)
	rec.fillFromTrace(tr, refused)
	if m.source == "" {
		p.countUser(rec.UserID, rec.GroupID, rec.Result, rec.Severity)
	}
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
	// The raw messages of the verdict chunk: always when a stage hit, of the
	// other records with record_pass_input_message; never of an error
	// record (§72.9).
	if m.cfg.StoreText && rec.Result != ResultError && (tr.keepsMessage() || m.cfg.RecordPassInputMessage) {
		if ch := m.chunkOf(tr); ch != nil {
			s := string(ch.messages())
			rec.InputMessage, rec.InputMessageSize = &s, len(s)
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
	rec.KeepUntil = rec.At.Add(m.cfg.retention[rec.Result])
	if p.sendEvent(rec) {
		return
	}
	// The queue is full or the writer stopped. A suspicious record drives
	// the watch list, the violation count and the ban, so it is stored in
	// the background with retries (new-api worker.go enqueue); anything else
	// is dropped.
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

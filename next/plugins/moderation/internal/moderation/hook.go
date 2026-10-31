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
	plan   *plan // segment hashes and pieces for the pass cache
	rec    eventRec
	timing string
	source string // cost source; "" = audit
	key    string // singleflight key
	size   int64  // bytes held while queued
	queued time.Time
}

// OnGatewayRequest implements pluginsdk.Hook (CONTRACTS §72.5). The ban
// hook (every protocol) only refuses banned users.
func (p *Plugin) OnGatewayRequest(ctx context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
	c := p.cfg.Load()
	if early := p.precheck(c, in); early != nil || in.GetHookId() == HookBan {
		if early == nil {
			early = allowEmpty
		}
		return early, nil
	}
	// The hook request is held until this returns: admit it by its bytes
	// before reading it, and answer at once when too much is in progress
	// (instead of growing towards the memory limit).
	size := hookRequestSize(in)
	if !p.admitBytes(c, size) {
		p.stats.busy.Add(1)
		if p.watchLevel(in.GetMeta().GetUserId()) == LevelEnforce {
			return deny(http.StatusServiceUnavailable, DenyBusy, MsgBusy, notePrefix+"busy"), nil
		}
		return allow(notePrefix + "busy"), nil
	}
	defer p.inflightBytes.Add(-size)
	m, early := p.admit(c, in)
	if early != nil {
		return early, nil
	}
	if m.timing == TimingPost {
		m.queued = p.now()
		for _, ch := range m.chunks {
			ch.detach()
		}
		if !p.enqueue(m) {
			p.stats.dropped.Add(1)
			return allow(notePrefix + "dropped (queue full)"), nil
		}
		return allow(notePrefix + "queued"), nil
	}
	return p.runPre(ctx, m), nil
}

// precheck applies the steps every hook takes (CONTRACTS §72.5 steps 1–2):
// off, exempt users pass, banned users are refused. nil = go on.
func (p *Plugin) precheck(c *config, in *pluginv1.GatewayRequestHookRequest) *pluginv1.GatewayRequestHookResponse {
	if !c.enabled {
		return allowEmpty
	}
	uid := in.GetMeta().GetUserId()
	if c.exempt[uid] {
		return allowEmpty
	}
	if p.isBlocked(uid) {
		return deny(http.StatusForbidden, DenyUserBlocked, MsgUserBlocked, notePrefix+"user blocked")
	}
	return nil
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

// admit applies the remaining preconditions (steps 3–8). A non-nil response
// ends the hook; otherwise m is ready to run.
func (p *Plugin) admit(c *config, in *pluginv1.GatewayRequestHookRequest) (*moderation, *pluginv1.GatewayRequestHookResponse) {
	meta := in.GetMeta()
	uid := meta.GetUserId()
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
	level := p.watchLevel(uid)
	m := &moderation{cfg: c, flow: flow, snap: snap, timing: TimingPost}
	if c.Mode == ModeEnforce || level == LevelEnforce {
		m.timing = TimingPre
	}
	if m.timing == TimingPost && !sampled(req.hash, flow.Spec.SampleRate) {
		return nil, allowEmpty
	}
	hashes := make([][32]byte, len(req.segs))
	for i := range req.segs {
		hashes[i] = req.segs[i].key
	}
	cached := p.cachedSegments(snap, flow, hashes, m.timing == TimingPre)
	pl := req.makePlan(c.limits, func(h [32]byte) bool { return cached[h] })
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
	m.rec = eventRec{
		At: p.now().UTC(), RequestID: meta.GetRequestId(), UserID: uid, APIKeyID: meta.GetApiKeyId(),
		GroupID: meta.GetGroupId(), Model: textutil.TruncateRunes(model, 200), Protocol: protocol, Mode: c.Mode,
		Endpoint: textutil.TruncateRunes(meta.GetEndpoint(), 255), SessionFp: textutil.TruncateRunes(meta.GetSessionFingerprint(), 64),
		Timing: m.timing, FlowID: flow.ID, FlowVersion: flow.Version, InputFormat: protocol,
		TextChars: pl.trace.Chars, TextHash: hex.EncodeToString(req.hash[:]), ImageCount: pl.trace.Images,
		WatchLevel: level,
	}
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

// runKey is the singleflight key of a run: (config version, flow, flow
// version, the chunks' hashes).
func runKey(s *snapshot, f *liveFlow, chunks []*chunk) string {
	h := sha256.New()
	for _, ch := range chunks {
		h.Write(ch.in.Hash[:])
	}
	var sum [32]byte
	copy(sum[:], h.Sum(nil))
	return segKey(s, f, sum)
}

// sharedRun is one pre run shared by concurrent requests with the same
// input (singleflight); counted makes its flow statistics count once.
type sharedRun struct {
	tr      Trace
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
		return &sharedRun{tr: p.run(rctx, m)}, nil
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
	p.finish(m, r.tr, refused)
}

// runPost moderates one queued request (worker). Jobs still queued when
// moderation is switched off are dropped without calling upstream.
func (p *Plugin) runPost(m *moderation) {
	if !p.cfg.Load().enabled {
		return
	}
	m.rec.QueueMs = int(p.now().Sub(m.queued).Milliseconds())
	if p.allCached(m) {
		p.stats.cacheHits.Add(1)
		p.countCacheHit(m, m.rec.UserID, m.rec.GroupID)
		return
	}
	ctx, cancel := context.WithTimeout(p.postCtx, m.flow.timeout)
	defer cancel()
	tr := p.run(ctx, m)
	if p.postCtx.Err() != nil { // runs cut short by Shutdown are not errors
		return
	}
	p.countRun(m, tr)
	p.finish(m, tr, false)
}

// allCached reports whether every moderated segment has been cached since
// the job was queued (another request with the same content passed).
func (p *Plugin) allCached(m *moderation) bool {
	if m.plan == nil {
		return false
	}
	var hashes [][32]byte
	for _, ch := range m.chunks {
		for _, s := range ch.segs {
			hashes = append(hashes, m.plan.keys[s])
		}
	}
	cached := p.cachedSegments(m.snap, m.flow, hashes, true)
	for _, h := range hashes {
		if !cached[h] {
			return false
		}
	}
	return true
}

// run executes the flow of m on every chunk, concurrently, and combines the
// runs. The caller counts the run (countRun) once it knows the run is to be
// counted.
func (p *Plugin) run(ctx context.Context, m *moderation) Trace {
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
	tr := combineTraces(trs)
	if m.plan != nil {
		it := m.plan.trace
		tr.Input = &it
	}
	return tr
}

func (p *Plugin) runChunk(ctx context.Context, m *moderation, in *Input) Trace {
	return runFlow(ctx, m.flow.Spec, m.flow.timeout, func(ctx context.Context, id int64) Outcome {
		a := m.snap.auditors[id]
		if a == nil {
			return Outcome{AuditorID: id, Err: errAuditorMissing}
		}
		src := m.source
		if src == "" {
			src = SourceAudit
		}
		return p.audit(ctx, a, in, m.timing == TimingPre, src)
	})
}

// cachePasses caches the segments whose every chunk passed cleanly: a pass
// or an overturned pass without errors or skipped auditors, and without URL
// images (their content can change behind the same address).
func (p *Plugin) cachePasses(m *moderation, tr Trace) {
	if m.plan == nil {
		return
	}
	passed := map[int]int{}
	for _, run := range tr.runs() {
		idx := max(run.Chunk-1, 0)
		if idx >= len(m.chunks) {
			continue
		}
		ch := m.chunks[idx]
		if run.Final != Pass || run.Errored || run.Skipped || run.anySkipped() || ch.in.HasURLImage {
			continue
		}
		for _, s := range ch.segs {
			passed[s]++
		}
	}
	var hashes [][32]byte
	for s, n := range passed {
		if n == m.plan.pieces[s] {
			hashes = append(hashes, m.plan.keys[s])
		}
	}
	p.putSegments(m.cfg, m.snap, m.flow, hashes)
}

// chunkOf returns the chunk a (combined) trace shows.
func (m *moderation) chunkOf(tr Trace) *chunk {
	idx := max(tr.Chunk-1, 0)
	if idx >= len(m.chunks) {
		return nil
	}
	return m.chunks[idx]
}

// finish caches the clean passes, counts the request on the user's day and
// records the run. It never blocks on the database (CONTRACTS §72.5 step
// 10): a suspicious record the event writer cannot take goes to the
// background store (storeSuspicious), anything else is dropped.
func (p *Plugin) finish(m *moderation, tr Trace, refused bool) {
	p.cachePasses(m, tr)
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
	if tr.firstStageHit() && m.cfg.StoreText && rec.Result != ResultError {
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
	if tr.Input != nil && tr.Input.Chunks > 1 {
		fmt.Fprintf(&b, " chunk=%d/%d", max(tr.Chunk, 1), tr.Input.Chunks)
	}
	return b.String()
}

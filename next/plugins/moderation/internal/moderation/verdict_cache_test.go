package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// Verdict cache (CONTRACTS §72.4, DESIGN-2026-11-10 §5): hits are cached per
// set of segments and replayed, passes per segment.

// A pre hit is cached with its trace: the same content again is refused
// without an upstream call, and its record is marked replayed and points to
// the request the verdict came from.
func TestVerdictCacheStoresHitAndReplays(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flow := openAIFlow(t, h, mod.srv.URL)
	first := mustHook(t, h, hookReqAs(3, "src", "MOD-HIT-sexual one"))
	if !denied(first) || replayed(first) {
		t.Fatalf("first = %+v", first)
	}
	calls := mod.count("/v1/moderations")
	again := mustHook(t, h, hookReqAs(3, "again", "MOD-HIT-sexual   one"))
	if !denied(again) || again.GetDenyCode() != DenyBlocked || again.GetNote() != fmt.Sprintf("%shit flow=%d v1 [sexual] 0.99 replay", notePrefix, flow) {
		t.Fatalf("second = %+v", again)
	}
	if n := mod.count("/v1/moderations"); n != calls {
		t.Fatalf("a replay called upstream: %d -> %d", calls, n)
	}
	fp := p.snap.Load().flows[flow].fp
	if len(fp) != 16 {
		t.Fatalf("fingerprint = %q", fp)
	}
	// The source record names the hit set of its verdict chunk.
	src := recordOf(t, h, "src")
	sc := traceOf(t, src).Cache
	if src.Replayed || src.Result != ResultBlock || sc == nil || sc.Hit || sc.Key == "" || len(sc.Segs) != 1 || sc.FP != fp || sc.SourceRequestID != "" {
		t.Fatalf("source record replayed=%v cache=%+v", src.Replayed, sc)
	}
	rep := recordOf(t, h, "again")
	tr := traceOf(t, rep)
	if !rep.Replayed || rep.Result != ResultBlock || rep.Timing != TimingPre || rep.LatencyMs != 0 || tr.LatencyMs != 0 ||
		rep.FlowID != flow || rep.FlowVersion != 1 || rep.Severity != "high" || rep.HighestCategory != "sexual" {
		t.Fatalf("replayed record = %+v (trace %s)", rep.Event, rep.Trace)
	}
	if c := tr.Cache; c == nil || !c.Hit || c.SourceRequestID != "src" || c.Key != sc.Key || len(c.Segs) != 1 || c.Segs[0] != sc.Segs[0] || c.FP != fp {
		t.Fatalf("replayed cache = %+v, source %+v", tr.Cache, sc)
	}
	if tr.Final != Hit || len(tr.Stages) != 1 || tr.Input == nil || tr.Input.Segments != 1 {
		t.Fatalf("replayed trace = %s", rep.Trace)
	}
	// The record keeps the text and the raw messages of the hit set.
	d := decodeData[EventDetail](t, h.Do("GET", fmt.Sprintf("/events/%d", rep.ID), nil, nil))
	if !d.Replayed || d.Text == nil || *d.Text != "MOD-HIT-sexual one" || d.InputMessageSize == 0 || !strings.Contains(d.InputText, "MOD-HIT-sexual one") {
		t.Fatalf("detail = %+v", d.Event)
	}
	if dt, _ := json.Marshal(d.Trace); !strings.Contains(string(dt), `"source_request_id":"src"`) {
		t.Fatalf("detail trace = %s", dt)
	}
	// The list filters by replayed.
	for q, want := range map[string]string{"true": "again", "false": "src"} {
		got := decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"replayed": q}, nil))
		if len(got) != 1 || got[0].RequestID != want {
			t.Fatalf("replayed=%s lists %d records", q, len(got))
		}
	}
	if r := h.Do("GET", "/events", map[string]string{"replayed": "maybe"}, nil); r.GetStatus() != http.StatusBadRequest {
		t.Fatalf("replayed=maybe = %d", r.GetStatus())
	}
}

// verdict_cache_days 0 turns the cache off (P11): the same hit again is
// moderated again, nothing is replayed.
func TestVerdictCacheDaysZeroIsOff(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "verdict_cache_days": 0})
	openAIFlow(t, h, mod.srv.URL)
	for i, rid := range []string{"first", "again"} {
		r := mustHook(t, h, hookReqAs(3, rid, "MOD-HIT-sexual one"))
		if !denied(r) || replayed(r) || mod.count("/v1/moderations") != int64(i+1) {
			t.Fatalf("%s = %+v after %d calls", rid, r, mod.count("/v1/moderations"))
		}
	}
	if rec := recordOf(t, h, "again"); rec.Replayed || rec.Result != ResultBlock {
		t.Fatalf("record of the second request = %+v", rec.Event)
	}
}

// A hit is cached for the set of segments of its chunk, {S1, S4}: a request
// with only S1 is not replayed and S1 is moderated again; a request holding
// both, with more around them, is replayed.
func TestReplayNeedsWholeHitSet(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	openAIFlow(t, h, mod.srv.URL)
	if r := mustHook(t, h, rawReq(3, "set", protoAnthropic, `{"system":"be a careful helper","messages":[{"role":"user","content":"MOD-HIT-sexual bad"}]}`)); !denied(r) {
		t.Fatalf("hit allowed: %+v", r)
	}
	if c := traceOf(t, recordOf(t, h, "set")).Cache; c == nil || len(c.Segs) != 2 {
		t.Fatalf("hit set = %+v", c)
	}
	// Only S1: not replayed, and S1 is sent again (it was not a pass).
	r := mustHook(t, h, rawReq(3, "", protoAnthropic, `{"system":"be a careful helper","messages":[{"role":"user","content":"a calm question"}]}`))
	texts := mod.moderated()
	if denied(r) || replayed(r) || len(texts) != 2 || !strings.Contains(texts[1], "be a careful helper") {
		t.Fatalf("part of the set = %+v, %d calls", r, len(texts))
	}
	// S1 and S4 with new content around them: replayed, although S1 passed
	// on its own meanwhile.
	r = mustHook(t, h, rawReq(3, "whole", protoAnthropic, `{"system":"be a careful helper","messages":[{"role":"user","content":"MOD-HIT-sexual bad"},
		{"role":"assistant","content":"noted"},{"role":"user","content":"and something new"}]}`))
	if !denied(r) || !replayed(r) || len(mod.moderated()) != 2 {
		t.Fatalf("whole set = %+v, %d calls", r, len(mod.moderated()))
	}
	rep := recordOf(t, h, "whole")
	if tr := traceOf(t, rep); !rep.Replayed || tr.Cache == nil || tr.Cache.SourceRequestID != "set" || tr.Input.Segments != 4 {
		t.Fatalf("replayed record = %+v (trace %s)", rep.Event, rep.Trace)
	}
	// Its record shows the hit set only, not the new content.
	d := decodeData[EventDetail](t, h.Do("GET", fmt.Sprintf("/events/%d", rep.ID), nil, nil))
	if d.Text == nil || *d.Text != "[system] be a careful helper\nMOD-HIT-sexual bad" || strings.Contains(d.InputText, "something new") {
		t.Fatalf("replayed text = %v, input %q", d.Text, d.InputText)
	}
	// Only S4: not replayed either, moderated again (and hit on its own).
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, `{"messages":[{"role":"user","content":"MOD-HIT-sexual bad"}]}`)); !denied(r) || replayed(r) || len(mod.moderated()) != 3 {
		t.Fatalf("the other part of the set = %+v, %d calls", r, len(mod.moderated()))
	}
}

// A replayed hit is not a new violation: the watch entry, the user's day and
// the ban count stay as they were; the flow row counts it as hit and
// replayed. A user who is not watched is not added by a replay.
func TestReplayIsNotAViolation(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "ban_threshold": 2, "ban_window_hours": 24})
	flow := openAIFlow(t, h, mod.srv.URL)
	ctx := context.Background()
	db, _ := p.db(ctx)
	mustHook(t, h, hookReqAs(3, "v1", "MOD-HIT-sexual history"))
	waitFor(t, "watch entry", func() bool {
		w := decodeData[[]Watch](t, h.Do("GET", "/watchlist", nil, nil))
		return len(w) == 1 && w[0].ViolationCount == 1
	})
	type state struct {
		hits, violations   int
		expires            time.Time
		audited, suspcious int64
	}
	read := func() (s state) {
		t.Helper()
		p.flushStats(ctx)
		if err := db.QueryRow(ctx, `SELECT hit_count, violation_count, expires_at FROM watchlist WHERE user_id = 3`).Scan(&s.hits, &s.violations, &s.expires); err != nil {
			t.Fatal(err)
		}
		if err := db.QueryRow(ctx, `SELECT coalesce(sum(audited), 0), coalesce(sum(suspicious), 0) FROM user_daily WHERE user_id = 3`).Scan(&s.audited, &s.suspcious); err != nil {
			t.Fatal(err)
		}
		return s
	}
	flowRow := func() (audited, hit, rep int64) {
		t.Helper()
		p.flushStats(ctx)
		if err := db.QueryRow(ctx, `SELECT coalesce(sum(audited), 0), coalesce(sum(hit), 0), coalesce(sum(replayed), 0) FROM stats_hourly
			WHERE flow_id = $1 AND stage = 0`, flow).Scan(&audited, &hit, &rep); err != nil {
			t.Fatal(err)
		}
		return
	}
	before := read()
	if before.hits != 1 || before.violations != 1 || before.audited != 1 || before.suspcious != 1 {
		t.Fatalf("before = %+v", before)
	}
	if a, hit, rep := flowRow(); a != 1 || hit != 1 || rep != 0 {
		t.Fatalf("flow row before = %d %d %d", a, hit, rep)
	}
	calls := mod.count("/v1/moderations")
	// The same content in the next turn: a replay, recorded as a hit.
	if r := mustHook(t, h, hookReqAs(3, "v2", "MOD-HIT-sexual history")); denied(r) || r.GetNote() != notePrefix+"hit (replay)" {
		t.Fatalf("replay = %+v", r)
	}
	if ev := waitEvents(t, h, map[string]string{"user_id": "3", "replayed": "true"}, 1)[0]; ev.Result != ResultHit || ev.Counted {
		t.Fatalf("replayed record = %+v", ev.Event)
	}
	time.Sleep(300 * time.Millisecond) // what follows the write of the record
	if after := read(); after != before {
		t.Fatalf("a replay changed the user: %+v -> %+v", before, after)
	}
	if a, hit, rep := flowRow(); a != 2 || hit != 2 || rep != 1 {
		t.Fatalf("flow row after the replay = %d %d %d", a, hit, rep)
	}
	// Two suspicious records, one violation: the ban threshold is not reached.
	if n, err := countViolations(ctx, db, 3, p.now().Add(-24*time.Hour)); err != nil || n != 1 {
		t.Fatalf("violations = %d %v", n, err)
	}
	if p.isBlocked(3) || len(decodeData[[]Block](t, h.Do("GET", "/blocks", nil, nil))) != 0 {
		t.Fatal("a replay banned the user")
	}
	// Another user sending the same content is replayed too and stays off
	// the watch list.
	if r := mustHook(t, h, hookReqAs(4, "v3", "MOD-HIT-sexual history")); r.GetNote() != notePrefix+"hit (replay)" {
		t.Fatalf("replay for another user = %+v", r)
	}
	waitEvents(t, h, map[string]string{"user_id": "4", "replayed": "true"}, 1)
	time.Sleep(300 * time.Millisecond)
	p.flushStats(ctx)
	var watched, days int
	if err := db.QueryRow(ctx, `SELECT (SELECT count(*) FROM watchlist WHERE user_id = 4), (SELECT count(*) FROM user_daily WHERE user_id = 4)`).Scan(&watched, &days); err != nil {
		t.Fatal(err)
	}
	if watched != 0 || days != 0 || p.watchLevel(4) != "" {
		t.Fatalf("user 4 after a replay: watched %d, daily rows %d", watched, days)
	}
	if n, err := countViolations(ctx, db, 4, p.now().Add(-24*time.Hour)); err != nil || n != 0 {
		t.Fatalf("violations of user 4 = %d %v", n, err)
	}
	if n := mod.count("/v1/moderations"); n != calls {
		t.Fatalf("replays called upstream: %d -> %d", calls, n)
	}
}

// Post timing: a replay lets the request pass and records a hit; a queued
// job whose content another node cached meanwhile is replayed by the worker.
func TestReplayPostTiming(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
	openAIFlow(t, h, mod.srv.URL)
	if r := mustHook(t, h, hookReqAs(3, "p1", "MOD-HIT-violence post")); r.GetNote() != queuedNote {
		t.Fatalf("first = %+v", r)
	}
	if ev := recordOf(t, h, "p1"); ev.Result != ResultHit || ev.Replayed || ev.Timing != TimingPost {
		t.Fatalf("first record = %+v", ev.Event)
	}
	calls := mod.count("/v1/moderations")
	if r := mustHook(t, h, hookReqAs(5, "p2", "MOD-HIT-violence post")); denied(r) || r.GetNote() != notePrefix+"hit (replay)" {
		t.Fatalf("replay = %+v", r)
	}
	ev := recordOf(t, h, "p2")
	if tr := traceOf(t, ev); ev.Result != ResultHit || !ev.Replayed || ev.Timing != TimingPost || ev.UserID != 5 || tr.Cache == nil || tr.Cache.SourceRequestID != "p1" {
		t.Fatalf("replayed record = %+v (trace %s)", ev.Event, ev.Trace)
	}
	// Only the KV knows the hit (as on another node): the hook queues the
	// request, the worker finds the hit and replays it.
	emptyMemory(p)
	if r := mustHook(t, h, hookReqAs(6, "p3", "MOD-HIT-violence post")); r.GetNote() != queuedNote {
		t.Fatalf("memory miss = %+v", r)
	}
	ev = recordOf(t, h, "p3")
	d := decodeData[EventDetail](t, h.Do("GET", fmt.Sprintf("/events/%d", ev.ID), nil, nil))
	if tr := traceOf(t, ev); ev.Result != ResultHit || !ev.Replayed || tr.Cache == nil || tr.Cache.SourceRequestID != "p1" ||
		d.Text == nil || *d.Text != "MOD-HIT-violence post" || d.InputMessageSize == 0 {
		t.Fatalf("worker replay = %+v text %v (trace %s)", ev.Event, d.Text, ev.Trace)
	}
	if n := mod.count("/v1/moderations"); n != calls {
		t.Fatalf("replays called upstream: %d -> %d", calls, n)
	}
}

// What is never cached: a hit of a run that errored, a pass with a whole
// stage skipped, chunks with a URL image. A pass of a stage in which one
// auditor skipped while another judged is cached.
func TestVerdictCacheSkipsErrorsSkippedStagesURLImages(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	// Group 9: OpenAI then Jev. Group 10: only a Jev auditor that takes no
	// images. Group 11: OpenAI and that Jev auditor in one stage.
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI}, []string{AuditorTypeSafe})
	var oai, jevCh int64
	for _, a := range decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil)) {
		if a.Type == AuditorOpenAI {
			oai = a.ID
		} else {
			jevCh = a.ChannelID
		}
	}
	blind := decodeData[AuditorView](t, h.Do("POST", "/auditors", nil, map[string]any{"name": "jev without images", "type": AuditorTypeSafe,
		"channel_id": jevCh, "config": map[string]any{"review_images": false}})).ID
	publishFlow(t, h, Spec{Stages: []Stage{stageOf(false, blind)}}, 10)      // a stage that skips
	publishFlow(t, h, Spec{Stages: []Stage{stageOf(false, oai, blind)}}, 11) // one auditor of the stage skips
	send := func(group int64, rid, protocol, body string) *pluginv1.GatewayRequestHookResponse {
		t.Helper()
		req := rawReq(3, rid, protocol, body)
		req.Meta.GroupId = group
		return mustHook(t, h, req)
	}
	calls := func() int64 { return mod.count("/v1/moderations") + mod.count("/v1/systemone") }
	const image = `{"messages":[{"role":"user","content":[{"type":"image","source":{"type":"base64","media_type":"image/png","data":"iVBORw0KGgo="}}]}]}`

	t.Run("errored hit", func(t *testing.T) {
		// The review stage fails, the first hit stands: refused, not cached.
		const body = `{"messages":[{"role":"user","content":"MOD-HIT-violence JEV-500 words"}]}`
		if r := send(9, "err1", protoAnthropic, body); !denied(r) || replayed(r) {
			t.Fatalf("first = %+v", r)
		}
		before := calls()
		if r := send(9, "err2", protoAnthropic, body); !denied(r) || replayed(r) || calls() != before+2 {
			t.Fatalf("second = %+v, calls %d -> %d", r, before, calls())
		}
		// The record still names its hit set, for a later review.
		ev := recordOf(t, h, "err2")
		if tr := traceOf(t, ev); ev.Replayed || !tr.Errored || tr.Cache == nil || tr.Cache.Key == "" || tr.Cache.Hit {
			t.Fatalf("errored hit record = %s", ev.Trace)
		}
	})
	t.Run("skipped stage", func(t *testing.T) {
		// Nothing the only auditor can read: a skipped pass, never cached.
		for i := range 2 {
			if r := send(10, "", protoAnthropic, image); denied(r) || r.GetNote() == cachedPass || !strings.HasPrefix(r.GetNote(), notePrefix+"pass ") {
				t.Fatalf("skipped pass %d = %+v", i, r)
			}
		}
	})
	t.Run("one skipped auditor", func(t *testing.T) {
		// The stage judged (OpenAI read the image): the pass is cached.
		before := calls()
		if r := send(11, "", protoAnthropic, image); denied(r) || r.GetNote() == cachedPass || calls() != before+1 {
			t.Fatalf("first = %+v, calls %d -> %d", r, before, calls())
		}
		if r := send(11, "", protoAnthropic, image); r.GetNote() != cachedPass || calls() != before+1 {
			t.Fatalf("second = %+v, calls %d -> %d", r, before, calls())
		}
	})
	t.Run("url image", func(t *testing.T) {
		url := func(text string) string {
			return `{"messages":[{"role":"user","content":[{"type":"text","text":"` + text + `"},{"type":"image_url","image_url":{"url":"https://img.example/a.png"}}]}]}`
		}
		for i := range 2 {
			before := calls()
			if r := send(11, "", "openai.chat", url("a calm picture")); denied(r) || r.GetNote() == cachedPass || calls() == before {
				t.Fatalf("pass with a URL image %d = %+v", i, r)
			}
		}
		for i := range 2 {
			before := calls()
			rid := fmt.Sprintf("url-hit-%d", i)
			if r := send(11, rid, "openai.chat", url("MOD-HIT-sexual picture")); !denied(r) || replayed(r) || calls() == before {
				t.Fatalf("hit with a URL image %d = %+v", i, r)
			}
			if ev := recordOf(t, h, rid); ev.Replayed || traceOf(t, ev).Cache != nil {
				t.Fatalf("record of a URL image hit = %s", ev.Trace)
			}
		}
	})
}

// The segments of a cached hit passing one by one in other requests do not
// turn the hit into a pass, in memory or in the KV.
func TestHitSurvivesPassesOfItsSegments(t *testing.T) {
	base, calls := newPairMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	_, h, fh := startDB(t, nil, cfg)
	openAIFlow(t, h, base)
	if r := mustHook(t, h, rawReq(3, "pair", protoAnthropic, pairWhole)); !denied(r) || replayed(r) {
		t.Fatalf("the pair = %+v", r)
	}
	if c := traceOf(t, recordOf(t, h, "pair")).Cache; c == nil || len(c.Segs) != 2 {
		t.Fatalf("hit set = %+v", c)
	}
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || !replayed(r) || calls.Load() != 1 {
		t.Fatalf("the pair again = %+v, calls %d", r, calls.Load())
	}
	// Each segment alone passes, and is then a cached pass.
	for i, body := range []string{pairFirst, pairLast} {
		if r := mustHook(t, h, rawReq(3, "", protoAnthropic, body)); denied(r) || r.GetNote() == cachedPass || calls.Load() != int64(i+2) {
			t.Fatalf("part %d = %+v, calls %d", i, r, calls.Load())
		}
	}
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairLast)); r.GetNote() != cachedPass || calls.Load() != 3 {
		t.Fatalf("the part again = %+v, calls %d", r, calls.Load())
	}
	// The pair is still the cached hit, for any user.
	for _, uid := range []int64{3, 4} {
		if r := mustHook(t, h, rawReq(uid, "", protoAnthropic, pairWhole)); !denied(r) || !replayed(r) || calls.Load() != 3 {
			t.Fatalf("the pair after its parts passed (user %d) = %+v, calls %d", uid, r, calls.Load())
		}
	}
	// In the KV both segments hold the pass and the pointer; another node
	// decides the same from it.
	if hits, segs := kvCount(t, fh, "h:"), segCount(t, fh, passedAndPointed); hits != 1 || segs != 2 {
		t.Fatalf("in the KV: %d hit entries, %d segment keys with a pass and a pointer", hits, segs)
	}
	_, h2 := secondNode(t, fh, cfg)
	if r := mustHook(t, h2, rawReq(5, "", protoAnthropic, pairWhole)); !denied(r) || !replayed(r) {
		t.Fatalf("the pair on a second node = %+v", r)
	}
	if r := mustHook(t, h2, rawReq(5, "", protoAnthropic, pairLast)); r.GetNote() != cachedPass {
		t.Fatalf("the part on a second node = %+v", r)
	}
	if calls.Load() != 3 {
		t.Fatalf("calls = %d", calls.Load())
	}
}

// A hit is decoded once and kept decoded in memory; the runtime figures show
// the bytes of the cache.
func TestHitKeptDecoded(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flow := openAIFlow(t, h, mod.srv.URL)
	if r := mustHook(t, h, hookReqAs(3, "dec", "MOD-HIT-sexual decoded")); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	scope := flowScope(p, flow)
	hit := hitInKV(t, fh, scope)
	key := hit.segs[0]
	emptyMemory(p)
	fromKV := p.lookupVerdicts(context.Background(), scope, [][32]byte{key}, true)
	if fromKV.hit == nil || fromKV.hitID != hit.id || fromKV.hit.RequestID != "dec" {
		t.Fatalf("from the KV = %+v", fromKV)
	}
	for range 2 {
		if again := p.lookupVerdicts(context.Background(), scope, [][32]byte{key}, false); again.hit != fromKV.hit {
			t.Fatal("the hit was decoded again")
		}
	}
	st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	if st.Runtime.CacheEntries != 2 || st.Runtime.CacheBytes != p.cache.Load().size() || st.Runtime.CacheBytes < 2*cacheEntryOverhead {
		t.Fatalf("runtime = %d entries, %d bytes", st.Runtime.CacheEntries, st.Runtime.CacheBytes)
	}
}

// The cache is per flow and per verdict fingerprint: another flow moderates
// the same content itself; changing an auditor's thresholds drops the
// flow's cached verdicts; the sample rate of the flow and a channel timeout
// do not.
func TestVerdictCacheScope(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flowA := openAIFlow(t, h, mod.srv.URL)
	auditor := decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil))[0]
	channel := decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil))[0]
	spec := Spec{SampleRate: 100, Stages: []Stage{stageOf(false, auditor.ID)}}
	spec.ModelFilter.Type = FilterAll
	flowB := publishFlow(t, h, spec, 10)
	send := func(group int64) *pluginv1.GatewayRequestHookResponse {
		t.Helper()
		req := hookReqAs(3, "", "MOD-HIT-sexual scope")
		req.Meta.GroupId = group
		r := mustHook(t, h, req)
		if !denied(r) {
			t.Fatalf("group %d allowed: %+v", group, r)
		}
		return r
	}
	calls := func() int64 { return mod.count("/v1/moderations") }
	fpA := func() string { return p.snap.Load().flows[flowA].fp }

	if r := send(9); replayed(r) || calls() != 1 {
		t.Fatalf("flow A first = %+v, calls %d", r, calls())
	}
	if r := send(9); !replayed(r) || calls() != 1 {
		t.Fatalf("flow A again = %+v, calls %d", r, calls())
	}
	// Flow B has the same auditor and so the same fingerprint, but its own
	// cache.
	if a, b := fpA(), p.snap.Load().flows[flowB].fp; a != b {
		t.Fatalf("fingerprints of equal flows differ: %s %s", a, b)
	}
	if r := send(10); replayed(r) || calls() != 2 {
		t.Fatalf("flow B = %+v, calls %d", r, calls())
	}
	fp := fpA()
	// A new version of flow A that only changes the sample rate.
	spec.SampleRate = 50
	decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d", flowA), nil, map[string]any{"name": "f", "draft": spec}))
	if pub := decodeData[FlowView](t, h.Do("POST", fmt.Sprintf("/flows/%d/publish", flowA), nil, map[string]any{"expected_version": 1})); pub.Version != 2 {
		t.Fatalf("published = %+v", pub)
	}
	if r := send(9); !replayed(r) || !strings.Contains(r.GetNote(), " v2 ") || calls() != 2 || fpA() != fp {
		t.Fatalf("after a sample rate change = %+v, calls %d, fp %s -> %s", r, calls(), fp, fpA())
	}
	// The channel's timeout.
	decodeData[ChannelView](t, h.Do("PUT", fmt.Sprintf("/channels/%d", channel.ID), nil, map[string]any{"type": channel.Type, "name": channel.Name,
		"base_url": channel.BaseURL, "timeout_ms": 9000}))
	if p.snap.Load().channels[channel.ID].Timeout != 9*time.Second {
		t.Fatal("channel timeout not applied")
	}
	if r := send(9); !replayed(r) || calls() != 2 || fpA() != fp {
		t.Fatalf("after a channel timeout change = %+v, calls %d, fp %s -> %s", r, calls(), fp, fpA())
	}
	// A threshold of the auditor: the fingerprint changes, the content is
	// moderated again, and cached again under the new fingerprint.
	decodeData[AuditorView](t, h.Do("PUT", fmt.Sprintf("/auditors/%d", auditor.ID), nil, map[string]any{"name": auditor.Name, "type": auditor.Type,
		"channel_id": auditor.ChannelID, "config": map[string]any{"thresholds": map[string]float64{"sexual": 0.5}}}))
	if fpA() == fp {
		t.Fatal("a threshold change kept the fingerprint")
	}
	if r := send(9); replayed(r) || calls() != 3 {
		t.Fatalf("after a threshold change = %+v, calls %d", r, calls())
	}
	if r := send(9); !replayed(r) || calls() != 3 {
		t.Fatalf("cached under the new fingerprint = %+v, calls %d", r, calls())
	}
}

// Clearing the cache makes everything be moderated again, on this node at
// once and on another node after its next poll.
func TestClearVerdictCache(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	p, h, fh := startDB(t, nil, cfg)
	openAIFlow(t, h, mod.srv.URL)
	calls := func() int64 { return mod.count("/v1/moderations") }
	const x, y = "MOD-HIT-sexual clear x", "MOD-HIT-sexual clear y"
	for _, text := range []string{x, y} {
		if r := mustHook(t, h, hookReq(text)); !denied(r) || replayed(r) {
			t.Fatalf("first %q = %+v", text, r)
		}
	}
	// A second node on the same database and KV replays both.
	p2, h2 := secondNode(t, fh, cfg)
	for _, text := range []string{x, y} {
		if r := mustHook(t, h2, hookReq(text)); !denied(r) || !replayed(r) {
			t.Fatalf("second node %q = %+v", text, r)
		}
	}
	if r := mustHook(t, h, hookReq(x)); !replayed(r) || calls() != 2 {
		t.Fatalf("before the clear = %+v, calls %d", r, calls())
	}

	if got := clearCache(t, h); got != 1 {
		t.Fatalf("clear = %d", got)
	}
	if st := decodeData[Status](t, h.Do("GET", "/status", nil, nil)); st.Runtime.CacheEpoch != 1 || st.Runtime.CacheEntries != 0 || p.snap.Load().cacheEpoch != 1 {
		t.Fatalf("runtime after the clear = %+v", st.Runtime)
	}
	if r := mustHook(t, h, hookReq(x)); !denied(r) || replayed(r) || calls() != 3 {
		t.Fatalf("after the clear = %+v, calls %d", r, calls())
	}
	// The other node learns the new epoch with its next poll.
	if err := p2.pollVersions(context.Background()); err != nil {
		t.Fatal(err)
	}
	if p2.snap.Load().cacheEpoch != 1 {
		t.Fatalf("second node epoch = %d", p2.snap.Load().cacheEpoch)
	}
	if r := mustHook(t, h2, hookReq(y)); !denied(r) || replayed(r) || calls() != 4 {
		t.Fatalf("second node after the clear = %+v, calls %d", r, calls())
	}
	// A second clear counts on.
	if got := clearCache(t, h); got != 2 {
		t.Fatalf("second clear = %d", got)
	}
}

// The review of a record updates the cache: false positive stores passes,
// confirmed stores the hit again, pending forgets both; a hit judged under
// another fingerprint is not stored again.
func TestReviewSyncsVerdictCache(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flow := openAIFlow(t, h, mod.srv.URL)
	calls := func() int64 { return mod.count("/v1/moderations") }
	send := func() *pluginv1.GatewayRequestHookResponse {
		t.Helper()
		return mustHook(t, h, rawReq(3, "", protoAnthropic, `{"system":"review the essay","messages":[{"role":"user","content":"MOD-HIT-sexual essay"}]}`))
	}
	first := rawReq(3, "rev", protoAnthropic, `{"system":"review the essay","messages":[{"role":"user","content":"MOD-HIT-sexual essay"}]}`)
	if r := mustHook(t, h, first); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	rec := recordOf(t, h, "rev")
	mark := func(status string, want int) {
		t.Helper()
		if updated, synced := review(t, h, status, rec.ID); updated != 1 || synced != want {
			t.Fatalf("review %s: %d updated, cache synced for %d, want %d", status, updated, synced, want)
		}
	}

	// False positive: the content passes without being sent, here and (KV)
	// on other nodes; the hit is gone.
	mark(ReviewFalsePositive, 1)
	if r := send(); denied(r) || r.GetNote() != cachedPass || calls() != 1 {
		t.Fatalf("after false positive = %+v, calls %d", r, calls())
	}
	if n := kvCount(t, fh, "h:"); n != 0 {
		t.Fatalf("%d hit entries after false positive", n)
	}
	emptyMemory(p)
	if r := send(); denied(r) || r.GetNote() != cachedPass || calls() != 1 {
		t.Fatalf("after false positive, from the KV = %+v, calls %d", r, calls())
	}
	// The other nodes are told which keys changed.
	var told verdictChanged
	for _, m := range reviewBroadcasts(t, fh) {
		if err := json.Unmarshal(m.Payload, &told); err != nil {
			t.Fatal(err)
		}
	}
	if len(told.Keys) != 3 { // the hit entry and its two segments
		t.Fatalf("verdict.changed keys = %v", told.Keys)
	}

	// Confirmed: the hit is back, over the passes.
	mark(ReviewConfirmed, 1)
	r := send()
	if !denied(r) || !replayed(r) || calls() != 1 {
		t.Fatalf("after confirmed = %+v, calls %d", r, calls())
	}
	rep := waitEvents(t, h, map[string]string{"replayed": "true"}, 1)[0]
	if c := traceOf(t, rep).Cache; c == nil || c.SourceRequestID != "rev" {
		t.Fatalf("replay after confirmed = %s", rep.Trace)
	}
	emptyMemory(p)
	if r := send(); !denied(r) || !replayed(r) || calls() != 1 {
		t.Fatalf("after confirmed, from the KV = %+v, calls %d", r, calls())
	}

	// Pending: moderated again.
	mark(ReviewPending, 1)
	if n := kvCount(t, fh, ""); n != 0 {
		t.Fatalf("%d keys left after pending", n)
	}
	if r := send(); !denied(r) || replayed(r) || calls() != 2 {
		t.Fatalf("after pending = %+v, calls %d", r, calls())
	}

	// The flow's fingerprint changes: the old record's hit is not stored
	// under the new configuration.
	auditor := decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil))[0]
	old := p.snap.Load().flows[flow].fp
	decodeData[AuditorView](t, h.Do("PUT", fmt.Sprintf("/auditors/%d", auditor.ID), nil, map[string]any{"name": auditor.Name, "type": auditor.Type,
		"channel_id": auditor.ChannelID, "config": map[string]any{"thresholds": map[string]float64{"sexual": 0.5}}}))
	if p.snap.Load().flows[flow].fp == old {
		t.Fatal("fingerprint unchanged")
	}
	mark(ReviewConfirmed, 0)
	if r := send(); !denied(r) || replayed(r) || calls() != 3 {
		t.Fatalf("confirmed under another fingerprint = %+v, calls %d", r, calls())
	}
	// Records that are not suspicious, or unknown, sync nothing.
	if n := p.syncReviewed(context.Background(), []int64{999999}, ReviewConfirmed); n != 0 {
		t.Fatalf("unknown record synced %d", n)
	}
}

// Reviewing a hit and its replays at once writes every cache key once, and all
// the records count as synced.
func TestReviewSyncWritesEachKeyOnce(t *testing.T) {
	mod := newFakeMod(t)
	spy := &kvFake{}
	_, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(spy))
	openAIFlow(t, h, mod.srv.URL)
	const body = `{"system":"grade the essay","messages":[{"role":"user","content":"MOD-HIT-sexual essay"}]}`
	for i := range 4 {
		if r := mustHook(t, h, rawReq(3, "", protoAnthropic, body)); !denied(r) || replayed(r) != (i > 0) {
			t.Fatalf("request %d = %+v", i, r)
		}
	}
	var ids []int64
	for _, rec := range waitEvents(t, h, nil, 4) {
		ids = append(ids, rec.ID)
	}
	if hits, segs := kvCount(t, fh, "h:"), segCount(t, fh, pointed); hits != 1 || segs != 2 {
		t.Fatalf("in the KV: %d hit entries, %d segment keys pointing to one", hits, segs)
	}
	for _, status := range []string{ReviewFalsePositive, ReviewConfirmed, ReviewPending} {
		spy.counts()
		if updated, synced := review(t, h, status, ids...); updated != 4 || synced != 4 {
			t.Fatalf("review %s: %d updated, cache synced for %d", status, updated, synced)
		}
		writes := spy.counts()
		if len(writes) != 3 { // the hit entry and its two segments
			t.Fatalf("review %s wrote %v", status, writes)
		}
		for key, n := range writes {
			if n != 1 {
				t.Fatalf("review %s wrote %s %d times (%v)", status, key, n, writes)
			}
		}
	}
	if n := kvCount(t, fh, ""); n != 0 {
		t.Fatalf("%d keys left after pending", n)
	}
}

// When the KV cannot be written, no record counts as synced and every node
// keeps deciding by what the KV holds - not the reviewing node by its memory
// and the others by the KV.
func TestReviewSyncKVFailure(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	spy := &kvFake{}
	p, h, fh := startDB(t, nil, cfg, withKV(spy))
	openAIFlow(t, h, mod.srv.URL)
	const text = "MOD-HIT-sexual kv review"
	if r := mustHook(t, h, hookReqAs(3, "kvr", text)); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	rec := recordOf(t, h, "kvr")
	_, h2 := secondNode(t, fh, cfg)
	if r := mustHook(t, h2, hookReq(text)); !replayed(r) {
		t.Fatalf("second node = %+v", r)
	}
	calls := mod.count("/v1/moderations")

	spy.fail.Store(true)
	errs := p.stats.kvErrors.Load()
	if updated, synced := review(t, h, ReviewFalsePositive, rec.ID); updated != 1 || synced != 0 {
		t.Fatalf("review while the KV fails: %d updated, cache synced for %d", updated, synced)
	}
	// One failed sync is one kv error, not one for every key: the call for
	// the hit entry failed, and nothing was asked of the KV after it.
	if n := p.stats.kvErrors.Load() - errs; n != 1 {
		t.Fatalf("the failed sync counted %d kv errors", n)
	}
	spy.fail.Store(false)
	deliverLastReview(t, fh, h2)
	// The KV still holds the hit: both nodes replay it.
	for name, node := range map[string]*pluginsdktest.Harness{"reviewing node": h, "second node": h2} {
		if r := mustHook(t, node, hookReq(text)); !denied(r) || !replayed(r) {
			t.Fatalf("%s after the failed sync = %+v", name, r)
		}
	}
	if n := mod.count("/v1/moderations"); n != calls {
		t.Fatalf("calls %d -> %d", calls, n)
	}
	// Reviewing again once the KV is back syncs it, on both nodes.
	if _, synced := review(t, h, ReviewFalsePositive, rec.ID); synced != 1 {
		t.Fatalf("review after the KV is back: cache synced for %d", synced)
	}
	deliverLastReview(t, fh, h2)
	for name, node := range map[string]*pluginsdktest.Harness{"reviewing node": h, "second node": h2} {
		if r := mustHook(t, node, hookReq(text)); r.GetNote() != cachedPass {
			t.Fatalf("%s after the sync = %+v", name, r)
		}
	}
}

// A hit names only the segments that were sent (not an image the flow had no
// auditor for), and a false positive of a record judged under another
// fingerprint stores no pass.
func TestFalsePositiveUnderAnotherFingerprint(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorTypeSafe})
	jev := decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil))[0]
	blind := decodeData[AuditorView](t, h.Do("POST", "/auditors", nil, map[string]any{"name": "jev without images", "type": AuditorTypeSafe,
		"channel_id": jev.ChannelID, "config": map[string]any{"review_images": false}}))
	publishFlow(t, h, Spec{Stages: []Stage{stageOf(false, blind.ID)}}, 10)
	send := func(rid, body string) *pluginv1.GatewayRequestHookResponse {
		t.Helper()
		req := rawReq(3, rid, protoAnthropic, body)
		req.Meta.GroupId = 10
		return mustHook(t, h, req)
	}
	calls := func() int64 { return mod.count("/v1/systemone") }
	const (
		text      = `{"type":"text","text":"MOD-HIT-sexual picture"}`
		image     = `{"type":"image","source":{"type":"base64","media_type":"image/png","data":"iVBORw0KGgo="}}`
		withImage = `{"messages":[{"role":"user","content":[` + text + `,` + image + `]}]}`
		textOnly  = `{"messages":[{"role":"user","content":[` + text + `]}]}`
	)
	if r := send("img", withImage); !denied(r) || replayed(r) || calls() != 1 {
		t.Fatalf("first = %+v, calls %d", r, calls())
	}
	rec := recordOf(t, h, "img")
	if c := traceOf(t, rec).Cache; rec.ImageCount != 1 || c == nil || len(c.Segs) != 1 {
		t.Fatalf("hit set of a chunk whose image was not sent = %+v (images %d)", c, rec.ImageCount)
	}
	// The text was judged a hit by itself: it replays without the image.
	if r := send("", textOnly); !denied(r) || !replayed(r) || calls() != 1 {
		t.Fatalf("the text alone = %+v, calls %d", r, calls())
	}
	// The auditor now takes images: another fingerprint. The old record is a
	// false positive - of the old configuration. Nothing passes under the
	// new one, which has judged neither the text nor the image.
	decodeData[AuditorView](t, h.Do("PUT", fmt.Sprintf("/auditors/%d", blind.ID), nil, map[string]any{"name": blind.Name, "type": blind.Type,
		"channel_id": blind.ChannelID, "config": map[string]any{"review_images": true}}))
	if updated, _ := review(t, h, ReviewFalsePositive, rec.ID); updated != 1 {
		t.Fatalf("review: %d updated", updated)
	}
	if r := send("", withImage); !denied(r) || replayed(r) || calls() != 2 {
		t.Fatalf("after a false positive under another fingerprint = %+v, calls %d", r, calls())
	}
}

// A node that gets verdict.changed drops the keys from its memory: its next
// read takes the reviewed verdict from the KV.
func TestVerdictChangedBroadcastDropsMemory(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	_, h, fh := startDB(t, nil, cfg)
	openAIFlow(t, h, mod.srv.URL)
	if r := mustHook(t, h, hookReqAs(3, "bc", "MOD-HIT-sexual broadcast")); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	rec := recordOf(t, h, "bc")
	p2, h2 := secondNode(t, fh, cfg)
	if r := mustHook(t, h2, hookReq("MOD-HIT-sexual broadcast")); !replayed(r) {
		t.Fatalf("second node = %+v", r)
	}
	if p2.cache.Load().len() != 2 {
		t.Fatalf("second node memory = %d entries", p2.cache.Load().len())
	}
	review(t, h, ReviewFalsePositive, rec.ID)
	// Without the broadcast the second node still replays from its memory.
	if r := mustHook(t, h2, hookReq("MOD-HIT-sexual broadcast")); !replayed(r) {
		t.Fatalf("second node before the broadcast = %+v", r)
	}
	delivered := 0
	for _, m := range reviewBroadcasts(t, fh) {
		if err := h2.Deliver(m.Topic, m.Payload, "node-1"); err != nil {
			t.Fatal(err)
		}
		delivered++
	}
	if delivered != 1 || p2.cache.Load().len() != 0 {
		t.Fatalf("delivered %d, second node memory = %d entries", delivered, p2.cache.Load().len())
	}
	if r := mustHook(t, h2, hookReq("MOD-HIT-sexual broadcast")); denied(r) || r.GetNote() != cachedPass {
		t.Fatalf("second node after the broadcast = %+v", r)
	}
	if n := mod.count("/v1/moderations"); n != 1 {
		t.Fatalf("calls = %d", n)
	}
	// A broken payload is ignored.
	if err := h2.Deliver(TopicVerdictChanged, []byte("{"), "node-1"); err != nil {
		t.Fatal(err)
	}
}

// A hit one node stores counts on the other nodes although their memory
// holds passes of its segments: at once on a node that gets the broadcast of
// the store. A node the broadcast does not reach keeps answering by the
// passes in its memory - a value in memory is not read from the KV again -
// until they expire or its cache is cleared.
//
// A hit of {A, B} beside the passes of A and of B comes from a run that began
// before them and ended after: the upstream call of the pair is held while
// the other nodes pass the parts.
func TestStoredHitReachesANodeByBroadcastExpiryOrClear(t *testing.T) {
	base, calls, hold := newHeldPairMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	var clock atomic.Int64 // of the node that stores the hit
	p, h, fh := startDB(t, nil, cfg, withClock(&clock))
	openAIFlow(t, h, base)
	ttl := p.cfg.Load().cacheTTL
	// The first node is asked about A and B together; its upstream call is
	// under way and stays so.
	arrived, release := hold()
	pair := hookAsync(h, rawReq(3, "pair", protoAnthropic, pairWhole))
	within(t, "the upstream call for the pair", arrived)

	// Three more nodes, each with a clock of its own that only the test moves
	// (on the wall clock "not yet expired" would depend on how long the test
	// takes). All are asked about the two parts one by one: the first of them
	// moderates them, the others read its passes from the KV. The passes of A
	// and B are in the memory of all three, and the pair is a cached pass for
	// them.
	type other struct {
		p     *Plugin
		h     *pluginsdktest.Harness
		kv    *kvFake
		clock atomic.Int64 // ahead of the node's start, in nanoseconds
	}
	start := func() *other {
		o := &other{kv: &kvFake{}}
		o.p, o.h = secondNode(t, fh, cfg, withKV(o.kv), withClock(&o.clock))
		for i, body := range []string{pairFirst, pairLast} {
			if r := mustHook(t, o.h, rawReq(3, "", protoAnthropic, body)); denied(r) {
				t.Fatalf("part %d = %+v", i, r)
			}
		}
		if r := mustHook(t, o.h, rawReq(3, "", protoAnthropic, pairWhole)); r.GetNote() != cachedPass {
			t.Fatalf("the pair on a node that knows its parts passed = %+v", r)
		}
		return o
	}
	told, untold, cleared := start(), start(), start()
	if segs := segValues(t, fh); len(segs) != 3 || kvCount(t, fh, "h:") != 0 || calls.Load() != 3 {
		t.Fatalf("KV before the hit: %v, %d calls", segs, calls.Load())
	}

	// The upstream answers the first node an hour after the others passed the
	// parts: a hit, stored in the KV with a pointer on both segments - beside
	// their passes, which the write read there - and published.
	clock.Store(int64(time.Hour))
	release()
	if r := within(t, "the pair", pair); !denied(r) || replayed(r) || calls.Load() != 3 {
		t.Fatalf("the pair = %+v, calls %d", r, calls.Load())
	}
	written(t, p)
	if n := segCount(t, fh, passedAndPointed); n != 2 {
		t.Fatalf("%d segment keys with a pass and a pointer", n)
	}
	stored, keys := storedBroadcasts(t, fh)
	if len(stored) != 1 || len(keys) != 2 || !strings.HasPrefix(keys[0], "s:") || !strings.HasPrefix(keys[1], "s:") {
		t.Fatalf("%d broadcasts of the stored hit, keys %v", len(stored), keys)
	}

	// The node that gets the broadcast drops the two keys and replays the
	// hit with its next request.
	if err := told.h.Deliver(TopicVerdictChanged, stored[0].Payload, "node-1"); err != nil {
		t.Fatal(err)
	}
	if r := mustHook(t, told.h, rawReq(4, "", protoAnthropic, pairWhole)); !denied(r) || !replayed(r) {
		t.Fatalf("after the broadcast = %+v", r)
	}
	// Its own runs can still write to those keys: a stored hit tombstones
	// nothing.
	if told.p.cache.Load().tombstoned(keys[0], told.p.now()) {
		t.Fatal("a stored hit tombstoned the segment keys of the node that was told")
	}

	// The node the broadcast never reached decides by the passes in its
	// memory, without a call to the KV, as long as they have not expired.
	untold.kv.calls.Store(0)
	untold.clock.Store(int64(ttl - time.Minute))
	if r := mustHook(t, untold.h, rawReq(5, "", protoAnthropic, pairWhole)); r.GetNote() != cachedPass || untold.kv.calls.Load() != 0 {
		t.Fatalf("without the broadcast, before its passes expire = %+v (%d KV calls)", r, untold.kv.calls.Load())
	}
	// Once they have expired the node reads the keys from the KV, and finds
	// the hit (stored an hour later, so still live).
	untold.clock.Store(int64(ttl + time.Second))
	if r := mustHook(t, untold.h, rawReq(5, "", protoAnthropic, pairWhole)); !denied(r) || !replayed(r) {
		t.Fatalf("without the broadcast, after its passes expired = %+v", r)
	}

	// Clearing the cache of a node the broadcast never reached ends it too:
	// the pair is moderated again, and is a hit.
	if r := mustHook(t, cleared.h, rawReq(6, "", protoAnthropic, pairWhole)); r.GetNote() != cachedPass || calls.Load() != 3 {
		t.Fatalf("before the clear = %+v, calls %d", r, calls.Load())
	}
	if got := clearCache(t, cleared.h); got != 1 {
		t.Fatalf("clear = %d", got)
	}
	if r := mustHook(t, cleared.h, rawReq(6, "", protoAnthropic, pairWhole)); !denied(r) || replayed(r) || calls.Load() != 4 {
		t.Fatalf("after the clear = %+v, calls %d", r, calls.Load())
	}
}

// A review on one node does not reach a node its broadcast never got to
// while that node holds the values in its memory: it keeps replaying the
// hits the review removed. It follows the reviews once its values have
// expired.
func TestNodeWithoutReviewBroadcastReplaysUntilExpiry(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	var clock1 atomic.Int64 // of the node that hits and reviews
	p, h, fh := startDB(t, nil, cfg, withClock(&clock1))
	flow := openAIFlow(t, h, mod.srv.URL)
	calls := func() int64 { return mod.count("/v1/moderations") }
	ttl := p.cfg.Load().cacheTTL
	kv2 := &kvFake{}
	var clock atomic.Int64
	p2, h2 := secondNode(t, fh, cfg, withKV(kv2), withClock(&clock))
	scope := flowScope(p2, flow)
	// The first node hits the four texts, the second replays them: pointer
	// and hit entry are in its memory.
	texts := map[string]string{"fp": "MOD-HIT-sexual false positive", "pend": "MOD-HIT-sexual pending", "post": "MOD-HIT-sexual post timing", "gone": "MOD-HIT-sexual entry gone"}
	for rid, text := range texts {
		if r := mustHook(t, h, hookReqAs(3, rid, text)); !denied(r) || replayed(r) {
			t.Fatalf("%s = %+v", rid, r)
		}
	}
	ids, hits := map[string]int64{}, map[string]cachedHit{}
	for _, rec := range waitEvents(t, h, nil, len(texts)) {
		ids[rec.RequestID], hits[rec.RequestID] = rec.ID, hitOf(t, scope, rec)
	}
	for rid, text := range texts {
		if r := mustHook(t, h2, hookReq(text)); !replayed(r) {
			t.Fatalf("second node, %s = %+v", rid, r)
		}
	}
	// The reviews come two hours after the hits, so that what they store
	// outlives the hits.
	clock1.Store(int64(2 * time.Hour))
	for rid, status := range map[string]string{"fp": ReviewFalsePositive, "post": ReviewFalsePositive, "pend": ReviewPending} {
		if _, synced := review(t, h, status, ids[rid]); synced != 1 {
			t.Fatalf("review of %s: cache synced for %d", rid, synced)
		}
	}
	// The hit entry of the fourth is gone from the KV while a pointer still
	// names it (a review whose segment writes failed).
	kvDelete(t, fh, hits["gone"].hitKey)
	n := calls()

	// No broadcast is delivered. The second node decides by its memory, and
	// makes no call to the KV for it, as long as its values have not expired;
	// a lookup of memory alone (the hook under post timing) answers the same.
	kv2.calls.Store(0)
	clock.Store(int64(ttl - time.Hour))
	for rid, text := range texts {
		if r := mustHook(t, h2, hookReq(text)); !replayed(r) {
			t.Fatalf("second node before its values expire, %s = %+v", rid, r)
		}
	}
	if v := p2.lookupVerdicts(context.Background(), scope, hits["post"].segs, false); v.hit == nil {
		t.Fatalf("memory alone before the values expire = %+v", v)
	}
	if calls() != n || kv2.calls.Load() != 0 {
		t.Fatalf("%d upstream calls and %d KV calls while the second node decided by its memory", calls()-n, kv2.calls.Load())
	}

	// The values have expired: the node reads the KV and follows the reviews.
	// False positive: the pass of the review answers.
	clock.Store(int64(ttl + time.Hour))
	if v := p2.lookupVerdicts(context.Background(), scope, hits["post"].segs, false); v.hit != nil || len(v.passed) != 0 {
		t.Fatalf("memory alone after the values expired = %+v", v)
	}
	for _, rid := range []string{"fp", "post"} {
		if r := mustHook(t, h2, hookReq(texts[rid])); r.GetNote() != cachedPass || calls() != n {
			t.Fatalf("%s after the values expired = %+v (%d calls)", rid, r, calls()-n)
		}
	}
	// Pending: moderated again. The deleted entry: moderated again too.
	for _, rid := range []string{"pend", "gone"} {
		n = calls()
		if r := mustHook(t, h2, hookReq(texts[rid])); !denied(r) || replayed(r) || calls() != n+1 {
			t.Fatalf("%s after the values expired = %+v (%d calls)", rid, r, calls()-n)
		}
	}
}

// A status that is none of the three is no review: nothing is deleted from
// the cache and nothing is published. (The route refuses it first; the sync
// would otherwise write it as a deletion of the hits.)
func TestReviewSyncRefusesAnUnknownStatus(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	openAIFlow(t, h, mod.srv.URL)
	if r := mustHook(t, h, hookReqAs(3, "g", "MOD-HIT-sexual unknown status")); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	rec := recordOf(t, h, "g")
	if n := kvCount(t, fh, "h:"); n != 1 {
		t.Fatalf("%d hit entries", n)
	}
	published := len(fh.Published())
	synced := p.syncReviewed(context.Background(), []int64{rec.ID}, "bogus")
	if hits := kvCount(t, fh, "h:"); synced != 0 || hits != 1 || len(fh.Published()) != published {
		t.Fatalf("syncReviewed with an unknown status = %d, %d hit entries left, %d broadcasts", synced, hits, len(fh.Published())-published)
	}
}

// A review is synced by whichever node gets the request - here one that did
// not judge the hit: every record counts, also those whose hit never reached
// the cache. The node that judged goes on replaying from memory until the
// broadcast of the review reaches it, writes nothing back meanwhile, and
// answers by the admin's pass afterwards.
func TestReviewOnANodeThatDidNotJudge(t *testing.T) {
	base, calls := newPairMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	kv := &kvFake{}
	var clock atomic.Int64
	_, h, fh := startDB(t, nil, cfg, withKV(kv), withClock(&clock))
	openAIFlow(t, h, base)
	// Two hits whose write failed (cached nowhere), then one that is stored.
	kv.noWrite.Store(true)
	for _, rid := range []string{"pair", "pair again"} {
		if r := mustHook(t, h, rawReq(3, rid, protoAnthropic, pairWhole)); !denied(r) || replayed(r) {
			t.Fatalf("%s = %+v", rid, r)
		}
	}
	kv.noWrite.Store(false)
	clock.Store(int64(time.Hour))
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || replayed(r) {
		t.Fatalf("third = %+v", r)
	}
	n := calls.Load()
	_, h2 := secondNode(t, fh, cfg)
	if r := mustHook(t, h2, rawReq(5, "", protoAnthropic, pairWhole)); !denied(r) || !replayed(r) || calls.Load() != n {
		t.Fatalf("second node = %+v", r)
	}
	var ids []int64
	for _, ev := range waitEvents(t, h, map[string]string{"result": "block", "replayed": "false"}, 3) {
		ids = append(ids, ev.ID)
	}
	if _, synced := review(t, h2, ReviewFalsePositive, ids...); synced != 3 {
		t.Fatalf("a review on the node that did not judge: cache_synced = %d, want 3", synced)
	}
	// Without the broadcast the judging node replays, from memory alone.
	for _, ahead := range []time.Duration{3 * time.Hour, 4 * time.Hour} {
		kv.calls.Store(0)
		clock.Store(int64(ahead))
		if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || !replayed(r) || calls.Load() != n || kv.calls.Load() != 0 {
			t.Fatalf("%v after the hit, without the broadcast = %+v (%d upstream calls, %d KV calls)", ahead, r, calls.Load()-n, kv.calls.Load())
		}
		if c := kvCount(t, fh, "h:"); c != 0 {
			t.Fatalf("the reviewed hit is back in the KV: %d entries", c)
		}
	}
	deliverLastReview(t, fh, h)
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); r.GetNote() != cachedPass || calls.Load() != n || kvCount(t, fh, "h:") != 0 {
		t.Fatalf("after the broadcast = %+v (%d upstream calls, %d hit entries)", r, calls.Load()-n, kvCount(t, fh, "h:"))
	}
}

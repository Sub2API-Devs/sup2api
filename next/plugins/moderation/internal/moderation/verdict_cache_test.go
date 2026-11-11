package moderation

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"runtime"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// Verdict cache (CONTRACTS §72.4, DESIGN-2026-11-10 §5): hits are cached per
// set of segments and replayed, passes per segment.

// kvKeys lists the verdict cache keys in the KV with a prefix.
func kvKeys(t *testing.T, fh *pluginsdktest.FakeHost, prefix string) []string {
	t.Helper()
	out, err := fh.KVList(context.Background(), &pluginv1.KVListRequest{Namespace: kvNamespace, Prefix: prefix, Limit: 500})
	if err != nil {
		t.Fatal(err)
	}
	return out.GetKeys()
}

// waitKV waits for the background KV writes: n keys with the prefix.
func waitKV(t *testing.T, fh *pluginsdktest.FakeHost, prefix string, n int) {
	t.Helper()
	waitFor(t, fmt.Sprintf("%d KV keys %q", n, prefix), func() bool { return len(kvKeys(t, fh, prefix)) >= n })
}

// traceOf decodes the trace of a listed record.
func traceOf(t *testing.T, ev EventListItem) Trace {
	t.Helper()
	var tr Trace
	if err := json.Unmarshal(ev.Trace, &tr); err != nil {
		t.Fatalf("trace %s: %v", ev.Trace, err)
	}
	return tr
}

// recordOf waits for the record of a request id.
func recordOf(t *testing.T, h *pluginsdktest.Harness, rid string) EventListItem {
	t.Helper()
	return waitEvents(t, h, map[string]string{"request_id": rid}, 1)[0]
}

// replayed reports whether the hook answered with a replayed hit.
func replayed(r *pluginv1.GatewayRequestHookResponse) bool {
	return strings.Contains(r.GetNote(), "replay")
}

// secondNode starts another plugin instance on the database and the KV of
// fh, and waits until it runs the flows.
func secondNode(t *testing.T, fh *pluginsdktest.FakeHost, cfg map[string]any, opts ...nodeOpt) (*Plugin, *pluginsdktest.Harness) {
	t.Helper()
	p2, h2 := startNode(t, fh, cfg, opts...)
	waitFor(t, "second node snapshot", func() bool { return p2.snap.Load().bound() })
	return p2, h2
}

// A pre hit is cached with its trace: the same content again is refused
// without an upstream call, and its record is marked replayed and points to
// the request the verdict came from.
func TestVerdictCacheStoresHitAndReplays(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
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

// A hit is cached for the set of segments of its chunk, {S1, S4}: a request
// with only S1 is not replayed and S1 is moderated again; a request holding
// both, with more around them, is replayed.
func TestReplayNeedsWholeHitSet(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const proto = "anthropic.messages"
	if r := mustHook(t, h, rawReq(3, "set", proto, `{"system":"be a careful helper","messages":[{"role":"user","content":"MOD-HIT-sexual bad"}]}`)); !denied(r) {
		t.Fatalf("hit allowed: %+v", r)
	}
	if c := traceOf(t, recordOf(t, h, "set")).Cache; c == nil || len(c.Segs) != 2 {
		t.Fatalf("hit set = %+v", c)
	}
	// Only S1: not replayed, and S1 is sent again (it was not a pass).
	r := mustHook(t, h, rawReq(3, "", proto, `{"system":"be a careful helper","messages":[{"role":"user","content":"a calm question"}]}`))
	texts := mod.moderated()
	if denied(r) || replayed(r) || len(texts) != 2 || !strings.Contains(texts[1], "be a careful helper") {
		t.Fatalf("part of the set = %+v, %d calls", r, len(texts))
	}
	// S1 and S4 with new content around them: replayed, although S1 passed
	// on its own meanwhile.
	r = mustHook(t, h, rawReq(3, "whole", proto, `{"system":"be a careful helper","messages":[{"role":"user","content":"MOD-HIT-sexual bad"},
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
	if r := mustHook(t, h, rawReq(3, "", proto, `{"messages":[{"role":"user","content":"MOD-HIT-sexual bad"}]}`)); !denied(r) || replayed(r) || len(mod.moderated()) != 3 {
		t.Fatalf("the other part of the set = %+v, %d calls", r, len(mod.moderated()))
	}
}

// A replayed hit is not a new violation: the watch entry, the user's day and
// the ban count stay as they were; the flow row counts it as hit and
// replayed. A user who is not watched is not added by a replay.
func TestReplayIsNotAViolation(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "ban_threshold": 2, "ban_window_hours": 24})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
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
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	if r := mustHook(t, h, hookReqAs(3, "p1", "MOD-HIT-violence post")); r.GetNote() != notePrefix+"queued" {
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
	waitKV(t, fh, "h:", 1)
	waitKV(t, fh, "s:", 1)
	p.cache.Store(newLRU(1000))
	if r := mustHook(t, h, hookReqAs(6, "p3", "MOD-HIT-violence post")); r.GetNote() != notePrefix+"queued" {
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
		if r := send(9, "err1", "anthropic.messages", body); !denied(r) || replayed(r) {
			t.Fatalf("first = %+v", r)
		}
		before := calls()
		if r := send(9, "err2", "anthropic.messages", body); !denied(r) || replayed(r) || calls() != before+2 {
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
			if r := send(10, "", "anthropic.messages", image); denied(r) || r.GetNote() == notePrefix+"pass (cached)" || !strings.HasPrefix(r.GetNote(), notePrefix+"pass ") {
				t.Fatalf("skipped pass %d = %+v", i, r)
			}
		}
	})
	t.Run("one skipped auditor", func(t *testing.T) {
		// The stage judged (OpenAI read the image): the pass is cached.
		before := calls()
		if r := send(11, "", "anthropic.messages", image); denied(r) || r.GetNote() == notePrefix+"pass (cached)" || calls() != before+1 {
			t.Fatalf("first = %+v, calls %d -> %d", r, before, calls())
		}
		if r := send(11, "", "anthropic.messages", image); r.GetNote() != notePrefix+"pass (cached)" || calls() != before+1 {
			t.Fatalf("second = %+v, calls %d -> %d", r, before, calls())
		}
	})
	t.Run("url image", func(t *testing.T) {
		url := func(text string) string {
			return `{"messages":[{"role":"user","content":[{"type":"text","text":"` + text + `"},{"type":"image_url","image_url":{"url":"https://img.example/a.png"}}]}]}`
		}
		for i := range 2 {
			before := calls()
			if r := send(11, "", "openai.chat", url("a calm picture")); denied(r) || r.GetNote() == notePrefix+"pass (cached)" || calls() == before {
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

// The cache is per flow and per verdict fingerprint: another flow moderates
// the same content itself; changing an auditor's thresholds drops the
// flow's cached verdicts; the sample rate of the flow and a channel timeout
// do not.
func TestVerdictCacheScope(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flowA := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
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

// The fingerprint covers what decides a verdict and nothing else.
func TestFingerprint(t *testing.T) {
	spec := &Spec{SampleRate: 100, TotalTimeoutMs: 5000, Stages: []Stage{{Auditors: []int64{1, 2}, Combine: CombineAtLeast, N: 2}, {Auditors: []int64{3}, Combine: CombineAny, Fallback: true}}}
	auditors := map[int64]storedAuditor{
		1: {typ: AuditorOpenAI, channel: 1, config: []byte(`{"thresholds": {"sexual": 0.5}}`)},
		2: {typ: AuditorTypeSafe, channel: 2, config: []byte(`{}`), defaultSet: true},
	}
	channels := map[int64]*liveChannel{
		1: {ID: 1, Name: "a", Type: ChannelOpenAI, BaseURL: "https://a.example", Key: "k1", Timeout: time.Second},
		2: {ID: 2, Name: "b", Type: ChannelTypeSafe, BaseURL: "https://b.example", Model: "m", BillingModel: "bm"},
	}
	def := []byte(`{"preamble":"p","items":[]}`)
	base := fingerprint(spec, auditors, channels, def)
	if len(base) != 16 || base != fingerprint(spec, auditors, channels, def) {
		t.Fatalf("fingerprint = %q", base)
	}
	same := func(name string, got string) {
		t.Helper()
		if got != base {
			t.Errorf("%s changed the fingerprint", name)
		}
	}
	differs := func(name string, got string) {
		t.Helper()
		if got == base {
			t.Errorf("%s kept the fingerprint", name)
		}
	}
	s := *spec
	s.SampleRate, s.TotalTimeoutMs, s.ModelFilter = 10, 9000, ModelFilter{Type: FilterOnly, Models: []string{"x"}}
	same("sample rate, timeout and model filter", fingerprint(&s, auditors, channels, def))
	ch := map[int64]*liveChannel{1: {ID: 1, Name: "renamed", Type: ChannelOpenAI, BaseURL: "https://a.example", Key: "k2", Timeout: time.Minute, BillingModel: "x"}, 2: channels[2]}
	same("channel name, key, timeout and billing model", fingerprint(spec, auditors, ch, def))

	s = *spec
	s.Stages = []Stage{{Auditors: []int64{1, 2}, Combine: CombineAny}, spec.Stages[1]}
	differs("combine", fingerprint(&s, auditors, channels, def))
	s.Stages = []Stage{spec.Stages[0], {Auditors: []int64{3}, Combine: CombineAny}}
	differs("fallback", fingerprint(&s, auditors, channels, def))
	s.Stages = []Stage{{Auditors: []int64{2, 1}, Combine: CombineAtLeast, N: 2}, spec.Stages[1]}
	differs("auditor order", fingerprint(&s, auditors, channels, def))
	a := map[int64]storedAuditor{1: {typ: AuditorOpenAI, channel: 1, config: []byte(`{"thresholds": {"sexual": 0.6}}`)}, 2: auditors[2]}
	differs("auditor config", fingerprint(spec, a, channels, def))
	a = map[int64]storedAuditor{1: auditors[1], 2: auditors[2], 3: {typ: AuditorOpenAI, channel: 1, config: []byte(`{}`)}}
	differs("a missing auditor that exists", fingerprint(spec, a, channels, def))
	ch = map[int64]*liveChannel{1: channels[1], 2: {ID: 2, Type: ChannelTypeSafe, BaseURL: "https://b.example", Model: "m2"}}
	differs("channel model", fingerprint(spec, auditors, ch, def))
	ch = map[int64]*liveChannel{1: {ID: 1, Type: ChannelOpenAI, BaseURL: "https://c.example"}, 2: channels[2]}
	differs("channel base URL", fingerprint(spec, auditors, ch, def))
	differs("an unusable channel", fingerprint(spec, auditors, map[int64]*liveChannel{2: channels[2]}, def))
	differs("the default question set", fingerprint(spec, auditors, channels, []byte(`{"preamble":"q","items":[]}`)))
	// The default set only matters to the auditors that use it.
	own := map[int64]storedAuditor{1: auditors[1], 2: {typ: AuditorTypeSafe, channel: 2, config: []byte(`{"questions": {}}`)}}
	if fingerprint(spec, own, channels, def) != fingerprint(spec, own, channels, []byte(`{"preamble":"q","items":[]}`)) {
		t.Error("the default question set changed the fingerprint of a flow that does not use it")
	}
}

// Clearing the cache makes everything be moderated again, on this node at
// once and on another node after its next poll.
func TestClearVerdictCache(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	p, h, fh := startDB(t, nil, cfg)
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	calls := func() int64 { return mod.count("/v1/moderations") }
	const x, y = "MOD-HIT-sexual clear x", "MOD-HIT-sexual clear y"
	for _, text := range []string{x, y} {
		if r := mustHook(t, h, hookReq(text)); !denied(r) || replayed(r) {
			t.Fatalf("first %q = %+v", text, r)
		}
	}
	waitKV(t, fh, "h:", 2)
	waitKV(t, fh, "s:", 2)
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

	if r := h.Do("POST", "/verdict-cache/clear", nil, nil); r.GetStatus() != 200 || decodeData[map[string]int64](t, r)["epoch"] != 1 {
		t.Fatalf("clear = %d %s", r.GetStatus(), r.GetBody())
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
	if got := decodeData[map[string]int64](t, h.Do("POST", "/verdict-cache/clear", nil, nil))["epoch"]; got != 2 {
		t.Fatalf("second clear = %d", got)
	}
}

// The review of a record updates the cache: false positive stores passes,
// confirmed stores the hit again, pending forgets both; a hit judged under
// another fingerprint is not stored again.
func TestReviewSyncsVerdictCache(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	calls := func() int64 { return mod.count("/v1/moderations") }
	send := func() *pluginv1.GatewayRequestHookResponse {
		t.Helper()
		return mustHook(t, h, rawReq(3, "", "anthropic.messages", `{"system":"review the essay","messages":[{"role":"user","content":"MOD-HIT-sexual essay"}]}`))
	}
	first := rawReq(3, "rev", "anthropic.messages", `{"system":"review the essay","messages":[{"role":"user","content":"MOD-HIT-sexual essay"}]}`)
	if r := mustHook(t, h, first); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	rec := recordOf(t, h, "rev")
	review := func(status string, want int) {
		t.Helper()
		out := decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": status}))
		if out["updated"] != float64(1) || out["cache_synced"] != float64(want) {
			t.Fatalf("review %s = %v, want cache_synced %d", status, out, want)
		}
	}
	waitKV(t, fh, "h:", 1)

	// False positive: the content passes without being sent, here and (KV)
	// on other nodes; the hit is gone.
	review("false_positive", 1)
	if r := send(); denied(r) || r.GetNote() != notePrefix+"pass (cached)" || calls() != 1 {
		t.Fatalf("after false positive = %+v, calls %d", r, calls())
	}
	if hits := kvKeys(t, fh, "h:"); len(hits) != 0 {
		t.Fatalf("hit entries after false positive = %v", hits)
	}
	p.cache.Store(newLRU(1000))
	if r := send(); denied(r) || r.GetNote() != notePrefix+"pass (cached)" || calls() != 1 {
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
	review("confirmed", 1)
	r := send()
	if !denied(r) || !replayed(r) || calls() != 1 {
		t.Fatalf("after confirmed = %+v, calls %d", r, calls())
	}
	rep := waitEvents(t, h, map[string]string{"replayed": "true"}, 1)[0]
	if c := traceOf(t, rep).Cache; c == nil || c.SourceRequestID != "rev" {
		t.Fatalf("replay after confirmed = %s", rep.Trace)
	}
	p.cache.Store(newLRU(1000))
	if r := send(); !denied(r) || !replayed(r) || calls() != 1 {
		t.Fatalf("after confirmed, from the KV = %+v, calls %d", r, calls())
	}

	// Pending: moderated again.
	review("pending", 1)
	if n := len(kvKeys(t, fh, "")); n != 0 {
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
	review("confirmed", 0)
	if r := send(); !denied(r) || replayed(r) || calls() != 3 {
		t.Fatalf("confirmed under another fingerprint = %+v, calls %d", r, calls())
	}
	// Records that are not suspicious, or unknown, sync nothing.
	if n := p.syncReviewed(context.Background(), []int64{999999}, "confirmed"); n != 0 {
		t.Fatalf("unknown record synced %d", n)
	}
}

// A node that gets verdict.changed drops the keys from its memory: its next
// read takes the reviewed verdict from the KV.
func TestVerdictChangedBroadcastDropsMemory(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	_, h, fh := startDB(t, nil, cfg)
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	if r := mustHook(t, h, hookReqAs(3, "bc", "MOD-HIT-sexual broadcast")); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	rec := recordOf(t, h, "bc")
	waitKV(t, fh, "h:", 1)
	waitKV(t, fh, "s:", 1)
	p2, h2 := secondNode(t, fh, cfg)
	if r := mustHook(t, h2, hookReq("MOD-HIT-sexual broadcast")); !replayed(r) {
		t.Fatalf("second node = %+v", r)
	}
	if p2.cache.Load().len() != 2 {
		t.Fatalf("second node memory = %d entries", p2.cache.Load().len())
	}
	decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": "false_positive"}))
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
	if r := mustHook(t, h2, hookReq("MOD-HIT-sexual broadcast")); denied(r) || r.GetNote() != notePrefix+"pass (cached)" {
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

var errKVDown = errors.New("kv unavailable")

// kvFake stands between a node and the KV of its host (withKV): it counts
// the calls the node makes (calls) and the writes (Set, Delete) that reach
// it by key, makes every call take delay, fails every call while fail is
// set, the reads of some keys while noRead is and every write while noWrite
// is, keeps the TTL of the last Set of a key, and can hold writes back
// (hold).
type kvFake struct {
	calls   atomic.Int64 // Get, Set and Delete calls of the node so far
	delay   atomic.Int64 // nanoseconds a call takes before anything else happens
	fail    atomic.Bool
	noWrite atomic.Bool
	ttls    sync.Map               // key -> time.Duration of its last Set
	noRead  atomic.Pointer[string] // reads of the keys with this prefix fail
	mu      sync.Mutex
	writes  map[string]int
	held    func(key string) bool // the writes that wait; nil = none
	gate    chan struct{}         // closed to let the waiting writes go on
	entered chan string           // the key of every write that waits
}

// counts returns the writes per key so far and starts over.
func (k *kvFake) counts() map[string]int {
	k.mu.Lock()
	defer k.mu.Unlock()
	out := k.writes
	k.writes = nil
	return out
}

// hold makes the writes of the keys match takes wait before they reach the
// KV; the key of each write that waits is sent on entered. release lets the
// ones waiting go on, while later ones wait again; open ends the holding.
func (k *kvFake) hold(match func(key string) bool) (entered <-chan string) {
	k.mu.Lock()
	defer k.mu.Unlock()
	k.held, k.gate, k.entered = match, make(chan struct{}), make(chan string, 256)
	return k.entered
}

func (k *kvFake) release() {
	k.mu.Lock()
	defer k.mu.Unlock()
	if k.gate != nil {
		close(k.gate)
		k.gate = make(chan struct{})
	}
}

func (k *kvFake) open() {
	k.mu.Lock()
	defer k.mu.Unlock()
	if k.gate != nil {
		close(k.gate)
	}
	k.held, k.gate = nil, nil
}

// call starts every KV call of the node: it is counted and takes delay, or
// ends with ctx.
func (k *kvFake) call(ctx context.Context) error {
	k.calls.Add(1)
	if d := time.Duration(k.delay.Load()); d > 0 {
		select {
		case <-time.After(d):
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	return nil
}

// write is called before a write of key reaches the KV.
func (k *kvFake) write(key string) error {
	if k.fail.Load() || k.noWrite.Load() {
		return errKVDown
	}
	k.mu.Lock()
	if k.writes == nil {
		k.writes = map[string]int{}
	}
	k.writes[key]++
	var gate chan struct{}
	if k.held != nil && k.held(key) {
		gate = k.gate
	}
	entered := k.entered
	k.mu.Unlock()
	if gate != nil {
		entered <- key
		<-gate
	}
	return nil
}

type kvFakeHost struct {
	pluginsdk.Host
	kv *kvFake
}

func (h kvFakeHost) KV() pluginsdk.KV { return kvFakeKV{KV: h.Host.KV(), kv: h.kv} }

type kvFakeKV struct {
	pluginsdk.KV
	kv *kvFake
}

func (k kvFakeKV) Get(ctx context.Context, ns, key string) ([]byte, bool, error) {
	if err := k.kv.call(ctx); err != nil {
		return nil, false, err
	}
	if k.kv.fail.Load() {
		return nil, false, errKVDown
	}
	if prefix := k.kv.noRead.Load(); prefix != nil && strings.HasPrefix(key, *prefix) {
		return nil, false, errKVDown
	}
	return k.KV.Get(ctx, ns, key)
}

func (k kvFakeKV) Set(ctx context.Context, ns, key string, val []byte, ttl time.Duration) error {
	if err := k.kv.call(ctx); err != nil {
		return err
	}
	if err := k.kv.write(key); err != nil {
		return err
	}
	k.kv.ttls.Store(key, ttl)
	return k.KV.Set(ctx, ns, key, val, ttl)
}

func (k kvFakeKV) Delete(ctx context.Context, ns, key string) error {
	if err := k.kv.call(ctx); err != nil {
		return err
	}
	if err := k.kv.write(key); err != nil {
		return err
	}
	return k.KV.Delete(ctx, ns, key)
}

// reviewBroadcasts are the verdict.changed messages of reviews published on
// fh so far (not the ones of stored hits).
func reviewBroadcasts(t *testing.T, fh *pluginsdktest.FakeHost) (out []pluginsdktest.PublishedMessage) {
	t.Helper()
	for _, m := range fh.Published() {
		var msg verdictChanged
		if m.Topic != TopicVerdictChanged {
			continue
		}
		if err := json.Unmarshal(m.Payload, &msg); err != nil {
			t.Fatal(err)
		}
		if !msg.Stored {
			out = append(out, m)
		}
	}
	return out
}

// deliverLastReview hands the newest review broadcast of fh to the node h.
func deliverLastReview(t *testing.T, fh *pluginsdktest.FakeHost, h *pluginsdktest.Harness) {
	t.Helper()
	pub := reviewBroadcasts(t, fh)
	if len(pub) == 0 {
		t.Fatal("no review broadcast")
	}
	if err := h.Deliver(TopicVerdictChanged, pub[len(pub)-1].Payload, "node-1"); err != nil {
		t.Fatal(err)
	}
}

// While the KV fails, content is moderated again: a cached pass is not
// trusted and a cached hit is not replayed. The failures count as kv errors,
// not as timeouts.
func TestKVFailureAuditsAgain(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	fail := &kv.fail
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	calls := func() int64 { return mod.count("/v1/moderations") }
	const hit, clean = "MOD-HIT-sexual kv", "a clean text for the kv"
	if r := mustHook(t, h, hookReq(hit)); !denied(r) {
		t.Fatalf("hit = %+v", r)
	}
	if r := mustHook(t, h, hookReq(clean)); denied(r) {
		t.Fatalf("clean = %+v", r)
	}
	waitKV(t, fh, "h:", 1)
	waitKV(t, fh, "s:", 2)

	// Only the KV knows the verdicts, and it fails.
	p.cache.Store(newLRU(1000))
	fail.Store(true)
	errs, timeouts := p.stats.kvErrors.Load(), p.stats.kvTimeouts.Load()
	if r := mustHook(t, h, hookReq(hit)); !denied(r) || replayed(r) || calls() != 3 {
		t.Fatalf("hit while the KV fails = %+v, calls %d", r, calls())
	}
	if r := mustHook(t, h, hookReq(clean)); denied(r) || r.GetNote() == notePrefix+"pass (cached)" || calls() != 4 {
		t.Fatalf("clean while the KV fails = %+v, calls %d", r, calls())
	}
	if p.stats.kvErrors.Load() == errs || p.stats.kvTimeouts.Load() != timeouts {
		t.Fatalf("a failing KV counted %d kv errors and %d kv timeouts", p.stats.kvErrors.Load()-errs, p.stats.kvTimeouts.Load()-timeouts)
	}
	// Back up: the KV still holds both verdicts.
	fail.Store(false)
	p.cache.Store(newLRU(1000))
	if r := mustHook(t, h, hookReq(hit)); !denied(r) || !replayed(r) || calls() != 4 {
		t.Fatalf("hit after the KV is back = %+v, calls %d", r, calls())
	}
	if r := mustHook(t, h, hookReq(clean)); r.GetNote() != notePrefix+"pass (cached)" || calls() != 4 {
		t.Fatalf("clean after the KV is back = %+v, calls %d", r, calls())
	}
}

// A cached hit is not kept beyond the TTL of its write, an unreadable entry
// is unknown, and an entry too large for the KV is not stored.
func TestStoredHitLimits(t *testing.T) {
	now := time.Now()
	hit := storedHit{RequestID: "r", Keys: []string{strings.Repeat("ab", 32)}, Trace: Trace{Final: Hit, Decider: 0}, At: now.Add(-2 * time.Hour).Unix()}
	raw, _ := json.Marshal(hit)
	if decodeHit(raw, now, 3*time.Hour) == nil || decodeHit(raw, now, time.Hour) != nil {
		t.Fatal("expiry of a cached hit")
	}
	if decodeHit([]byte("{"), now, time.Hour) != nil || decodeHit([]byte(`{"k":["x"],"t":{"final":"pass"},"at":9999999999}`), now, time.Hour) != nil {
		t.Fatal("an unreadable or passing entry was accepted")
	}
	// A hit is written as its entry and, on every segment, a pointer to it
	// with the time of the write.
	id := hitIDOf(hit.Keys)
	var seg segValue
	pointTo(id, hit.At)(&seg)
	if got, body := encodeHit(&hit); got != id || !bytes.Equal(body, raw) || hitKeyOf("e0:1:fp", id) != "h:e0:1:fp:"+id ||
		segKeyHex("e0:1:fp", hit.Keys[0]) != "s:e0:1:fp:"+hit.Keys[0] || string(seg.encode()) != fmt.Sprintf("h%s@%d", id, hit.At) {
		t.Fatalf("entry %q = %s, pointer %s", got, body, seg.encode())
	}
	hit.Trace.Stages = []StageTrace{{Outcomes: []Outcome{{Reason: strings.Repeat("x", maxHitBytes)}}}}
	if got, body := encodeHit(&hit); got != "" || body != nil {
		t.Fatalf("an oversized hit was stored: %d bytes", len(body))
	}
	// The id does not depend on the order of the segments.
	a, b := [32]byte{1}, [32]byte{2}
	if hitID([][32]byte{a, b}) != hitID([][32]byte{b, a}) || hitID([][32]byte{a}) == hitID([][32]byte{a, b}) || hitIDOf([]string{"zz"}) != "" {
		t.Fatal("hit id")
	}
}

// segValues reads the segment keys of the KV.
func segValues(t *testing.T, fh *pluginsdktest.FakeHost) map[string]segValue {
	t.Helper()
	out := map[string]segValue{}
	for _, key := range kvKeys(t, fh, "s:") {
		r, err := fh.KVGet(context.Background(), &pluginv1.KVGetRequest{Namespace: kvNamespace, Key: key})
		if err != nil {
			t.Fatal(err)
		}
		out[key] = parseSeg(r.GetValue())
	}
	return out
}

// waitSegs waits for the background KV writes: n segment keys that cond
// holds for.
func waitSegs(t *testing.T, fh *pluginsdktest.FakeHost, what string, n int, cond func(segValue) bool) {
	t.Helper()
	waitFor(t, fmt.Sprintf("%d segment keys %s", n, what), func() bool {
		got := 0
		for _, v := range segValues(t, fh) {
			if cond(v) {
				got++
			}
		}
		return got >= n
	})
}

func pointed(v segValue) bool { return len(v.hits) > 0 }

// newPairMod serves /v1/moderations: "sexual" scores 0.99 only when the
// input holds both "alpha" and "beta".
func newPairMod(t *testing.T) (base string, calls *atomic.Int64) {
	calls = new(atomic.Int64)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		body, _ := io.ReadAll(r.Body)
		scores := map[string]float64{}
		for _, c := range OpenAICategories {
			scores[c] = 0.01
		}
		if strings.Contains(string(body), "alpha") && strings.Contains(string(body), "beta") {
			scores["sexual"] = 0.99
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"model": "omni-mock", "results": []any{map[string]any{"category_scores": scores}}})
	}))
	t.Cleanup(srv.Close)
	return srv.URL, calls
}

// Finding 1: the segments of a cached hit passing one by one in other
// requests do not turn the hit into a pass, in memory or in the KV.
func TestHitSurvivesPassesOfItsSegments(t *testing.T) {
	base, calls := newPairMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	_, h, fh := startDB(t, nil, cfg)
	setupFlow(t, h, base, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const (
		proto = "anthropic.messages"
		whole = `{"system":"alpha rule","messages":[{"role":"user","content":"beta ask"}]}`
		first = `{"system":"alpha rule","messages":[{"role":"user","content":"a harmless sentence"}]}`
		last  = `{"messages":[{"role":"user","content":"beta ask"}]}`
	)
	if r := mustHook(t, h, rawReq(3, "pair", proto, whole)); !denied(r) || replayed(r) {
		t.Fatalf("the pair = %+v", r)
	}
	if c := traceOf(t, recordOf(t, h, "pair")).Cache; c == nil || len(c.Segs) != 2 {
		t.Fatalf("hit set = %+v", c)
	}
	if r := mustHook(t, h, rawReq(3, "", proto, whole)); !denied(r) || !replayed(r) || calls.Load() != 1 {
		t.Fatalf("the pair again = %+v, calls %d", r, calls.Load())
	}
	// Each segment alone passes, and is then a cached pass.
	for i, body := range []string{first, last} {
		if r := mustHook(t, h, rawReq(3, "", proto, body)); denied(r) || r.GetNote() == notePrefix+"pass (cached)" || calls.Load() != int64(i+2) {
			t.Fatalf("part %d = %+v, calls %d", i, r, calls.Load())
		}
	}
	if r := mustHook(t, h, rawReq(3, "", proto, last)); r.GetNote() != notePrefix+"pass (cached)" || calls.Load() != 3 {
		t.Fatalf("the part again = %+v, calls %d", r, calls.Load())
	}
	// The pair is still the cached hit, for any user.
	for _, uid := range []int64{3, 4} {
		if r := mustHook(t, h, rawReq(uid, "", proto, whole)); !denied(r) || !replayed(r) || calls.Load() != 3 {
			t.Fatalf("the pair after its parts passed (user %d) = %+v, calls %d", uid, r, calls.Load())
		}
	}
	// In the KV both segments hold the pass and the pointer; another node
	// decides the same from it.
	waitKV(t, fh, "h:", 1)
	waitSegs(t, fh, "with a pass and a pointer", 2, func(v segValue) bool { return v.pass > 0 && len(v.hits) == 1 })
	_, h2 := secondNode(t, fh, cfg)
	if r := mustHook(t, h2, rawReq(5, "", proto, whole)); !denied(r) || !replayed(r) {
		t.Fatalf("the pair on a second node = %+v", r)
	}
	if r := mustHook(t, h2, rawReq(5, "", proto, last)); r.GetNote() != notePrefix+"pass (cached)" {
		t.Fatalf("the part on a second node = %+v", r)
	}
	if calls.Load() != 3 {
		t.Fatalf("calls = %d", calls.Load())
	}
}

// Finding 2: reviewing a hit and its replays at once writes every cache key
// once, and all the records count as synced.
func TestReviewSyncWritesEachKeyOnce(t *testing.T) {
	mod := newFakeMod(t)
	spy := &kvFake{}
	_, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(spy))
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const body = `{"system":"grade the essay","messages":[{"role":"user","content":"MOD-HIT-sexual essay"}]}`
	var ids []int64
	for i := range 4 {
		rid := fmt.Sprintf("bulk-%d", i)
		if r := mustHook(t, h, rawReq(3, rid, "anthropic.messages", body)); !denied(r) || replayed(r) != (i > 0) {
			t.Fatalf("request %d = %+v", i, r)
		}
		ids = append(ids, recordOf(t, h, rid).ID)
	}
	waitKV(t, fh, "h:", 1)
	waitSegs(t, fh, "pointing to the hit", 2, pointed)
	for _, status := range []string{"false_positive", "confirmed", "pending"} {
		spy.counts()
		out := decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": ids, "status": status}))
		if out["updated"] != float64(4) || out["cache_synced"] != float64(4) {
			t.Fatalf("review %s = %v", status, out)
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
	if n := len(kvKeys(t, fh, "")); n != 0 {
		t.Fatalf("%d keys left after pending", n)
	}
}

// Finding 2: when the KV cannot be written, no record counts as synced and
// every node keeps deciding by what the KV holds - not the reviewing node by
// its memory and the others by the KV.
func TestReviewSyncKVFailure(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	spy := &kvFake{}
	p, h, fh := startDB(t, nil, cfg, withKV(spy))
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const text = "MOD-HIT-sexual kv review"
	if r := mustHook(t, h, hookReqAs(3, "kvr", text)); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	rec := recordOf(t, h, "kvr")
	waitKV(t, fh, "h:", 1)
	waitSegs(t, fh, "pointing to the hit", 1, pointed)
	_, h2 := secondNode(t, fh, cfg)
	if r := mustHook(t, h2, hookReq(text)); !replayed(r) {
		t.Fatalf("second node = %+v", r)
	}
	calls := mod.count("/v1/moderations")

	spy.fail.Store(true)
	errs, timeouts := p.stats.kvErrors.Load(), p.stats.kvTimeouts.Load()
	out := decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": "false_positive"}))
	if out["updated"] != float64(1) || out["cache_synced"] != float64(0) {
		t.Fatalf("review while the KV fails = %v", out)
	}
	// One failed sync is one kv error, not one for every key, and no timeout.
	if n := p.stats.kvErrors.Load() - errs; n != 1 || p.stats.kvTimeouts.Load() != timeouts {
		t.Fatalf("the failed sync counted %d kv errors and %d kv timeouts", n, p.stats.kvTimeouts.Load()-timeouts)
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
	out = decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": "false_positive"}))
	if out["cache_synced"] != float64(1) {
		t.Fatalf("review after the KV is back = %v", out)
	}
	deliverLastReview(t, fh, h2)
	for name, node := range map[string]*pluginsdktest.Harness{"reviewing node": h, "second node": h2} {
		if r := mustHook(t, node, hookReq(text)); r.GetNote() != notePrefix+"pass (cached)" {
			t.Fatalf("%s after the sync = %+v", name, r)
		}
	}
}

// Finding 2: once the budget is over no more KV work is handed out. Such a
// run counts one kv timeout and no kv error (0.8.1; until then one kv error);
// a run in which a call failed while its time was running counts one kv
// error and no timeout.
func TestKVRunStopsWithItsContext(t *testing.T) {
	p := New()
	counted := func() [2]int64 { return [2]int64{p.stats.kvErrors.Load(), p.stats.kvTimeouts.Load()} }
	ctx, cancel := context.WithCancel(context.Background())
	var ran atomic.Int64
	ok := p.kvRun(ctx, 100, func(i int) error {
		if ran.Add(1) == 5 {
			cancel()
		}
		return nil
	})
	done := 0
	for _, o := range ok {
		if o {
			done++
		}
	}
	// What was handed out before the cancel ran; nothing after it.
	if n := ran.Load(); n < 5 || n > 5+kvLookupWorkers || int64(done) != n {
		t.Fatalf("%d calls ran, %d reported done", n, done)
	}
	if got := counted(); got != [2]int64{0, 1} {
		t.Fatalf("a run its context ended counted %v (kv errors, kv timeouts)", got)
	}
	if ok := p.kvRun(context.Background(), 20, func(int) error { return nil }); len(ok) != 20 || counted() != [2]int64{0, 1} {
		t.Fatalf("a complete run counted: %v", counted())
	}
	// A call that comes back with the end of the run's time is the timeout
	// again, whatever number of calls it ended: one per run.
	short, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	ok = p.kvRun(short, 4, func(int) error {
		<-short.Done()
		return short.Err()
	})
	if slices.Contains(ok, true) || counted() != [2]int64{0, 2} {
		t.Fatalf("a run that ran out of time reported %v and counted %v", ok, counted())
	}
	// A call that fails while the time is running is a kv error: one per
	// run, and the other calls of the run are made.
	ran.Store(0)
	ok = p.kvRun(context.Background(), 20, func(i int) error {
		ran.Add(1)
		if i%2 == 0 {
			return errKVDown
		}
		return nil
	})
	if ran.Load() != 20 || ok[0] || !ok[1] || counted() != [2]int64{1, 2} {
		t.Fatalf("a run with failing calls ran %d of them and counted %v", ran.Load(), counted())
	}
}

// Finding 3: a hit names only the segments that were sent (not an image the
// flow had no auditor for), and a false positive of a record judged under
// another fingerprint stores no pass.
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
		req := rawReq(3, rid, "anthropic.messages", body)
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
	out := decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": "false_positive"}))
	if out["updated"] != float64(1) {
		t.Fatalf("review = %v", out)
	}
	if r := send("", withImage); !denied(r) || replayed(r) || calls() != 2 {
		t.Fatalf("after a false positive under another fingerprint = %+v, calls %d", r, calls())
	}
}

// Finding 4: a value loaded from the KV keeps the time of its write in
// memory instead of a fresh TTL, and a part older than the TTL is not used.
func TestKVValueKeepsItsWriteTime(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	snap := p.snap.Load()
	scope, ttl := snap.scopeOf(snap.flows[flow]), p.cfg.Load().cacheTTL
	now := time.Now()
	set := func(key [32]byte, val string) {
		t.Helper()
		if _, err := fh.KVSet(context.Background(), &pluginv1.KVSetRequest{Namespace: kvNamespace, Key: segKeyOf(scope, key), Value: []byte(val)}); err != nil {
			t.Fatal(err)
		}
	}
	old, expired, legacyPass, legacyHit := [32]byte{1}, [32]byte{2}, [32]byte{3}, [32]byte{4}
	written := now.Add(time.Hour - ttl).Unix() // an hour left
	set(old, fmt.Sprintf("p%d", written))
	set(expired, fmt.Sprintf("p%d", now.Add(-ttl-time.Minute).Unix()))
	set(legacyPass, "p")
	set(legacyHit, "h"+strings.Repeat("ab", 32))
	keys := [][32]byte{old, expired, legacyPass, legacyHit}
	v := p.lookupVerdicts(scope, keys, true)
	if len(v.passed) != 1 || !v.passed[old] || v.hit != nil {
		t.Fatalf("verdicts = %+v", v)
	}
	cache := p.cache.Load()
	el := cache.items[segKeyOf(scope, old)]
	if el == nil || cache.len() != 1 {
		t.Fatalf("memory holds %d entries", cache.len())
	}
	if exp := el.Value.(*cacheEntry).expires; !exp.Equal(time.Unix(written, 0).Add(ttl)) {
		t.Fatalf("memory expiry = %v, want the write time %v plus the TTL (now %v)", exp, time.Unix(written, 0), now)
	}
	// From memory alone it is the same pass, and gone an hour later.
	if v := p.lookupVerdicts(scope, keys, false); len(v.passed) != 1 || !v.passed[old] {
		t.Fatalf("from memory = %+v", v)
	}
	if _, ok := cache.seg(segKeyOf(scope, old), now.Add(time.Hour+time.Second)); ok {
		t.Fatal("the pass outlived the TTL of its write")
	}
}

// Finding 5: a post job queued before the cache was cleared is not answered
// from the cleared cache, and its verdict is stored under the new counter.
func TestQueuedJobAfterClear(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const text = "MOD-HIT-violence epoch"
	mustHook(t, h, hookReqAs(3, "e0", text))
	recordOf(t, h, "e0")
	waitKV(t, fh, "h:", 1)
	waitSegs(t, fh, "pointing to the hit", 1, pointed)
	// A job as the hook queues it on a node whose memory does not know the
	// hit (the worker would find it in the KV).
	p.cache.Store(newLRU(1000))
	snap := p.snap.Load()
	queued := hookReqAs(6, "queued", text)
	m, early := p.admit(p.cfg.Load(), queued, snap, snap.flows[flow], requestModel(queued))
	if early != nil || m == nil || m.timing != TimingPost {
		t.Fatalf("admit = %+v, %+v", m, early)
	}
	m.queued = p.now()
	if got := decodeData[map[string]int64](t, h.Do("POST", "/verdict-cache/clear", nil, nil))["epoch"]; got != 1 {
		t.Fatalf("clear = %d", got)
	}
	calls := mod.count("/v1/moderations")
	p.runPost(m)
	if n := mod.count("/v1/moderations"); n != calls+1 {
		t.Fatalf("the queued job did not run after the clear: calls %d -> %d", calls, n)
	}
	if ev := recordOf(t, h, "queued"); ev.Replayed || ev.Result != ResultHit {
		t.Fatalf("record of the queued job = %+v", ev.Event)
	}
	// Its hit is cached under the counter of now.
	if r := mustHook(t, h, hookReqAs(7, "after", text)); r.GetNote() != notePrefix+"hit (replay)" || mod.count("/v1/moderations") != calls+1 {
		t.Fatalf("after the clear = %+v, calls %d", r, mod.count("/v1/moderations"))
	}
	waitKV(t, fh, "h:e1:", 1)
}

// Finding 6: a hit is decoded once and kept decoded in memory; the runtime
// figures show the bytes of the cache.
func TestHitKeptDecoded(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	if r := mustHook(t, h, hookReqAs(3, "dec", "MOD-HIT-sexual decoded")); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	waitKV(t, fh, "h:", 1)
	waitSegs(t, fh, "pointing to the hit", 1, pointed)
	c := traceOf(t, recordOf(t, h, "dec")).Cache
	key := hashOf(t, c.Segs[0])
	snap := p.snap.Load()
	scope := snap.scopeOf(snap.flows[flow])
	p.cache.Store(newLRU(1000))
	fromKV := p.lookupVerdicts(scope, [][32]byte{key}, true)
	if fromKV.hit == nil || fromKV.hitID != c.Key || fromKV.hit.RequestID != "dec" {
		t.Fatalf("from the KV = %+v", fromKV)
	}
	for range 2 {
		if again := p.lookupVerdicts(scope, [][32]byte{key}, false); again.hit != fromKV.hit {
			t.Fatal("the hit was decoded again")
		}
	}
	st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	if st.Runtime.CacheEntries != 2 || st.Runtime.CacheBytes != p.cache.Load().size() || st.Runtime.CacheBytes < 2*cacheEntryOverhead {
		t.Fatalf("runtime = %d entries, %d bytes", st.Runtime.CacheEntries, st.Runtime.CacheBytes)
	}
}

// hashOf reads a segment hash as a record's trace names it.
func hashOf(t *testing.T, s string) (key [32]byte) {
	t.Helper()
	if n, err := hex.Decode(key[:], []byte(s)); err != nil || n != len(key) {
		t.Fatalf("%q is not a hash", s)
	}
	return key
}

// kvValue reads a verdict cache key from the KV.
func kvValue(t *testing.T, fh *pluginsdktest.FakeHost, key string) ([]byte, bool) {
	t.Helper()
	r, err := fh.KVGet(context.Background(), &pluginv1.KVGetRequest{Namespace: kvNamespace, Key: key})
	if err != nil {
		t.Fatal(err)
	}
	return r.GetValue(), r.GetFound()
}

// written waits until the verdicts the node's runs stored so far are in the
// KV (or their writes have failed).
func written(t *testing.T, p *Plugin) {
	t.Helper()
	waitFor(t, "the verdict writes", func() bool { return p.stats.kvWriting.Load() == 0 })
}

// An image that no auditor received is not cached as passed - whatever kept
// it from being sent - while the text of its chunk is: the next request with
// the image has it moderated, on its own in these flows of one auditor (only
// a mixed flow keeps the cached text in the plan, makePlan).
func TestSkippedImageIsNotCachedAsPassed(t *testing.T) {
	// A Jev upstream that finds every picture violating and no text.
	var jevCalls, jevImages atomic.Int64
	jev := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Questions map[string]json.RawMessage `json:"questions"`
			Assets    map[string]json.RawMessage `json:"assets"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		jevCalls.Add(1)
		score := 0.01
		if len(req.Assets) > 0 {
			jevImages.Add(1)
			score = 0.99
		}
		answers := map[string]any{}
		for c := range req.Questions {
			answers[c] = map[string]any{"type": "noul", "noul": score}
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"model": "jev-mock", "answers": answers, "usage": map[string]int{"input_tokens": 10}})
	}))
	defer jev.Close()
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	setupFlow(t, h, jev.URL, []int64{9}, CombineAny, []string{AuditorTypeSafe})
	setupFlow(t, h, mod.srv.URL, []int64{10}, CombineAny, []string{AuditorOpenAI})
	// The Jev channel has 2 s: its redraws get one of them.
	for _, ch := range decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil)) {
		if ch.Type == ChannelTypeSafe {
			decodeData[ChannelView](t, h.Do("PUT", fmt.Sprintf("/channels/%d", ch.ID), nil, map[string]any{"type": ch.Type, "name": ch.Name,
				"base_url": ch.BaseURL, "timeout_ms": 2000}))
		}
	}
	body := func(text string, images ...string) string {
		content := []any{map[string]any{"type": "text", "text": text}}
		for _, data := range images {
			content = append(content, map[string]any{"type": "image", "source": map[string]any{"type": "base64", "media_type": "image/png", "data": data}})
		}
		b, _ := json.Marshal(map[string]any{"messages": []any{map[string]any{"role": "user", "content": content}}})
		return string(b)
	}
	send := func(group int64, rid, body string) *pluginv1.GatewayRequestHookResponse {
		t.Helper()
		req := rawReq(3, rid, "anthropic.messages", body)
		req.Meta.GroupId = group
		return mustHook(t, h, req)
	}
	passedFresh := func(r *pluginv1.GatewayRequestHookResponse) bool {
		return !denied(r) && strings.HasPrefix(r.GetNote(), notePrefix+"pass flow=")
	}
	const cachedPass = notePrefix + "pass (cached)"

	t.Run("no redraw slot in time", func(t *testing.T) {
		// Both redraw slots are busy (two large images of other requests):
		// the picture, which needs redrawing, is not ready within the
		// channel's redraw time and the call goes out with the text alone.
		for range cap(jevNormalizeSlots) {
			jevNormalizeSlots <- struct{}{}
		}
		free := sync.OnceFunc(func() {
			for range cap(jevNormalizeSlots) {
				<-jevNormalizeSlots
			}
		})
		defer free()
		request := body("a harmless caption", encodePNG(t, filled(100, 100, red)))
		if r := send(9, "busy", request); !passedFresh(r) || jevCalls.Load() != 1 || jevImages.Load() != 0 {
			t.Fatalf("with the slots busy = %+v (%d calls, %d with an image)", r, jevCalls.Load(), jevImages.Load())
		}
		tr := traceOf(t, recordOf(t, h, "busy"))
		if o := tr.Stages[0].Outcomes[0]; o.SentImages != 0 || o.SkippedImages != 1 || tr.Input.Images != 1 {
			t.Fatalf("trace of the run without the image = %+v, input %+v", o.EngineResult, tr.Input)
		}
		// The text is a cached pass, the picture is not: one segment key.
		written(t, p)
		if segs := segValues(t, fh); len(segs) != 1 {
			t.Fatalf("segment keys after the run without the image = %v", segs)
		}
		// With a slot the picture is sent - alone, the text has passed - and
		// refused. Before the second round, the request was answered "pass
		// (cached)" for verdict_cache_days on every node.
		free()
		r := send(9, "free", request)
		if !denied(r) || replayed(r) || jevCalls.Load() != 2 || jevImages.Load() != 1 {
			t.Fatalf("with a free slot = %+v (%d calls, %d with an image)", r, jevCalls.Load(), jevImages.Load())
		}
		tr = traceOf(t, recordOf(t, h, "free"))
		if tr.Input.Cached != 1 || tr.Cache == nil || len(tr.Cache.Segs) != 1 {
			t.Fatalf("trace of the run with the image: input %+v, hit set %+v", tr.Input, tr.Cache)
		}
		if r := send(9, "", request); !denied(r) || !replayed(r) || jevCalls.Load() != 2 {
			t.Fatalf("the picture again = %+v (%d calls)", r, jevCalls.Load())
		}
	})

	t.Run("undecodable", func(t *testing.T) {
		// Jev cannot read the image at all: it never becomes a pass, and
		// every request with it is a run (without a call: nothing to send -
		// the flow is not mixed, so the cached text is not sent again).
		request := body("another harmless caption", "iVBORw0KGgo=")
		calls := jevCalls.Load()
		if r := send(9, "", request); !passedFresh(r) || jevCalls.Load() != calls+1 {
			t.Fatalf("first = %+v (%d calls)", r, jevCalls.Load()-calls)
		}
		for i := range 2 {
			if r := send(9, "", request); !passedFresh(r) || r.GetNote() == cachedPass || jevCalls.Load() != calls+1 {
				t.Fatalf("again %d = %+v (%d calls)", i, r, jevCalls.Load()-calls)
			}
		}
	})

	t.Run("the image the OpenAI auditor drew stands for the others", func(t *testing.T) {
		// The moderation API takes one image per call and the auditor draws
		// one at random: that call judges both, so both are cached as passed
		// and the same request costs no second call.
		one, two := "iVBORw0KGgoAAAAB", "iVBORw0KGgoAAAAC"
		request := body("a harmless album", one, two)
		holds := func(body, image string) bool { return strings.Contains(body, "base64,"+image) }
		if r := send(10, "", request); !passedFresh(r) {
			t.Fatalf("first = %+v", r)
		}
		sent := mod.moderated()
		if len(sent) != 1 || holds(sent[0], one) == holds(sent[0], two) || !strings.Contains(sent[0], "a harmless album") {
			t.Fatalf("calls = %d: %.300s", len(sent), strings.Join(sent, "\n"))
		}
		if r := send(10, "", request); r.GetNote() != cachedPass || len(mod.moderated()) != 1 {
			t.Fatalf("second = %+v (%d calls)", r, len(mod.moderated()))
		}
	})
}

// A hit one node stores counts on the other nodes although their memory
// holds passes of its segments: at once for a node that gets the broadcast
// of the store. A node the broadcast does not reach keeps answering by the
// passes in its memory, which nothing reads from the KV again (0.8.1; a node
// of 0.8.0 followed 5 minutes after the store), until they expire or its
// cache is cleared.
func TestStoredHitReachesOtherNodes(t *testing.T) {
	base, calls := newPairMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	var clock atomic.Int64 // of the node that stores the hit
	p, h, fh := startDB(t, nil, cfg, withClock(&clock))
	flow := setupFlow(t, h, base, []int64{9}, CombineAny, []string{AuditorOpenAI})
	ttl := p.cfg.Load().cacheTTL
	const (
		proto      = "anthropic.messages"
		whole      = `{"system":"alpha rule","messages":[{"role":"user","content":"beta ask"}]}`
		first      = `{"system":"alpha rule","messages":[{"role":"user","content":"a harmless sentence"}]}`
		last       = `{"messages":[{"role":"user","content":"beta ask"}]}`
		cachedPass = notePrefix + "pass (cached)"
		// later is when a node of 0.8.0 had read its memory values again.
		later = 5*time.Minute + time.Second
	)
	// Three more nodes, each with a clock of its own that only the test moves
	// (a clock that ran with the wall clock made "not yet expired" depend on
	// how long the test took). All moderate the two parts one by one while
	// they cannot reach the KV: the passes of A and B are in their memory
	// only, as on a node whose writes were lost or that stored them before
	// the hit existed.
	type other struct {
		p     *Plugin
		h     *pluginsdktest.Harness
		kv    *kvFake
		clock atomic.Int64 // ahead of the node's start, in nanoseconds
	}
	start := func() *other {
		o := &other{kv: &kvFake{}}
		o.kv.fail.Store(true)
		o.p, o.h = secondNode(t, fh, cfg, withKV(o.kv), withClock(&o.clock))
		for i, body := range []string{first, last} {
			if r := mustHook(t, o.h, rawReq(3, "", proto, body)); denied(r) || r.GetNote() == cachedPass {
				t.Fatalf("part %d = %+v", i, r)
			}
		}
		written(t, o.p) // every write has failed
		o.kv.fail.Store(false)
		if r := mustHook(t, o.h, rawReq(3, "", proto, whole)); r.GetNote() != cachedPass {
			t.Fatalf("the pair on a node that passed its parts = %+v", r)
		}
		return o
	}
	told, untold, cleared := start(), start(), start()
	if n := len(kvKeys(t, fh, "")); n != 0 || calls.Load() != 6 {
		t.Fatalf("%d keys in the KV, %d calls", n, calls.Load())
	}

	// The first node moderates A and B together, an hour after the others
	// passed the parts: a hit, stored in the KV with a pointer on both
	// segments, and published.
	clock.Store(int64(time.Hour))
	if r := mustHook(t, h, rawReq(3, "pair", proto, whole)); !denied(r) || replayed(r) || calls.Load() != 7 {
		t.Fatalf("the pair = %+v, calls %d", r, calls.Load())
	}
	written(t, p)
	waitSegs(t, fh, "pointing to the hit", 2, pointed)
	var stored []pluginsdktest.PublishedMessage
	for _, m := range fh.Published() {
		var msg verdictChanged
		if m.Topic == TopicVerdictChanged && json.Unmarshal(m.Payload, &msg) == nil && msg.Stored {
			if len(msg.Keys) != 2 || !strings.HasPrefix(msg.Keys[0], "s:") || !strings.HasPrefix(msg.Keys[1], "s:") {
				t.Fatalf("broadcast of the stored hit = %s", m.Payload)
			}
			stored = append(stored, m)
		}
	}
	if len(stored) != 1 {
		t.Fatalf("%d broadcasts of stored hits", len(stored))
	}

	// The node that gets the broadcast drops the two keys and replays the
	// hit with its next request.
	if err := told.h.Deliver(TopicVerdictChanged, stored[0].Payload, "node-1"); err != nil {
		t.Fatal(err)
	}
	if r := mustHook(t, told.h, rawReq(4, "", proto, whole)); !denied(r) || !replayed(r) {
		t.Fatalf("after the broadcast = %+v", r)
	}
	// Its own runs can still write to those keys: a stored hit tombstones
	// nothing.
	if tomb := told.p.cache.Load().tombstoned(stored0Key(t, stored[0]), told.p.now()); tomb {
		t.Fatal("a stored hit tombstoned the segment keys of the node that was told")
	}

	// The node the broadcast never reached decides by the passes in its
	// memory, without a call to the KV: when a node of 0.8.0 had read them
	// again, and as long as they have not expired.
	untold.kv.calls.Store(0)
	for _, ahead := range []time.Duration{later, 2 * later, ttl - time.Minute} {
		untold.clock.Store(int64(ahead))
		if r := mustHook(t, untold.h, rawReq(5, "", proto, whole)); r.GetNote() != cachedPass || untold.kv.calls.Load() != 0 {
			t.Fatalf("without the broadcast, %v after its passes = %+v (%d KV calls)", ahead, r, untold.kv.calls.Load())
		}
	}
	// Once they have expired the node reads the keys from the KV, and finds
	// the hit (stored an hour later, so still live).
	untold.clock.Store(int64(ttl + time.Second))
	if r := mustHook(t, untold.h, rawReq(5, "", proto, whole)); !denied(r) || !replayed(r) {
		t.Fatalf("without the broadcast, after its passes expired = %+v", r)
	}

	// A lookup of memory alone (the hook under post timing) answers by the
	// passes too and has nothing read in the background: the next one is
	// answered the same, and so is a lookup with the KV.
	c := traceOf(t, recordOf(t, h, "pair")).Cache
	keys := [][32]byte{hashOf(t, c.Segs[0]), hashOf(t, c.Segs[1])}
	snap := cleared.p.snap.Load()
	scope := snap.scopeOf(snap.flows[flow])
	cleared.kv.calls.Store(0)
	for _, ahead := range []time.Duration{0, later, 2 * later} {
		cleared.clock.Store(int64(ahead))
		for range 2 {
			if v := cleared.p.lookupVerdicts(scope, keys, false); v.hit != nil || len(v.passed) != 2 {
				t.Fatalf("memory alone, %v after its passes = %+v", ahead, v)
			}
		}
	}
	if r := mustHook(t, cleared.h, rawReq(6, "", proto, whole)); r.GetNote() != cachedPass || cleared.kv.calls.Load() != 0 {
		t.Fatalf("after the lookups of memory alone = %+v (%d KV calls)", r, cleared.kv.calls.Load())
	}
	if calls.Load() != 7 {
		t.Fatalf("calls = %d", calls.Load())
	}
	// Clearing the cache ends it: the pair is moderated again, and is a hit.
	if got := decodeData[map[string]int64](t, cleared.h.Do("POST", "/verdict-cache/clear", nil, nil))["epoch"]; got != 1 {
		t.Fatalf("clear = %d", got)
	}
	if r := mustHook(t, cleared.h, rawReq(6, "", proto, whole)); !denied(r) || replayed(r) || calls.Load() != 8 {
		t.Fatalf("after the clear = %+v, calls %d", r, calls.Load())
	}
}

// withClock gives a node a clock that stands still at the time of the call
// plus ahead (nanoseconds): only the test moves it.
func withClock(ahead *atomic.Int64) nodeOpt {
	start := time.Now()
	return func(n *node) {
		n.now = func() time.Time { return start.Add(time.Duration(ahead.Load())) }
	}
}

// stored0Key is the first key of a verdict.changed message.
func stored0Key(t *testing.T, m pluginsdktest.PublishedMessage) string {
	t.Helper()
	var msg verdictChanged
	if err := json.Unmarshal(m.Payload, &msg); err != nil || len(msg.Keys) == 0 {
		t.Fatalf("broadcast %s: %v", m.Payload, err)
	}
	return msg.Keys[0]
}

// The fingerprint carries the version of the judging defaults in the code,
// and is the same on every node and in every build of a version: changing
// what it is made of without a new judgingVersion would leave the nodes of a
// rolling upgrade with different cache keys for the same configuration.
func TestFingerprintJudgingVersion(t *testing.T) {
	spec := &Spec{Stages: []Stage{{Auditors: []int64{1}, Combine: CombineAny}}}
	auditors := map[int64]storedAuditor{1: {typ: AuditorOpenAI, channel: 1, config: []byte(`{}`)}}
	channels := map[int64]*liveChannel{1: {ID: 1, Type: ChannelOpenAI, BaseURL: "https://a.example"}}
	base := fingerprint(spec, auditors, channels, nil)
	const version, want = 2, "8049a4172a7adeec"
	if judgingVersion != version || base != want {
		t.Fatalf("fingerprint of judging version %d = %s, want %s of version %d: a change of what the fingerprint covers needs a new judgingVersion, and both belong here",
			judgingVersion, base, want, version)
	}
	if base == fingerprintAt(judgingVersion+1, spec, auditors, channels, nil) {
		t.Fatal("another judging version kept the fingerprint")
	}
}

// otherHits makes n hits of other content (name tells the calls apart) whose
// entries are on KV lock
// stripes of their own - different from each other and from those of the
// keys in avoid - so that a write of all of them keeps n workers busy
// without waiting for any of those keys.
func otherHits(p *Plugin, scope, name string, n int, at int64, avoid ...string) (hits []storedHit, keys []string) {
	taken := map[*sync.Mutex]bool{}
	for _, key := range avoid {
		taken[p.kvLock(key)] = true
	}
	for i := 0; len(hits) < n; i++ {
		seg := sha256.Sum256(fmt.Appendf(nil, "other content %d of %s", i, name))
		hit := storedHit{RequestID: "other", Keys: hexKeys([][32]byte{seg}), Trace: Trace{Final: Hit, Decider: 0}, At: at}
		key, segKey := hitKeyOf(scope, hitIDOf(hit.Keys)), segKeyOf(scope, seg)
		if taken[p.kvLock(key)] || taken[p.kvLock(segKey)] || p.kvLock(key) == p.kvLock(segKey) {
			continue
		}
		taken[p.kvLock(key)], taken[p.kvLock(segKey)] = true, true
		hits, keys = append(hits, hit), append(keys, key)
	}
	return hits, keys
}

// A run that judged before a review and stores its verdicts after it does
// not undo the review, in memory or in the KV: not on the node that
// reviewed, and not on a node that was told. The interleaving is the real
// one: the write of the run holds its values while the review happens, and
// goes on after it.
func TestReviewIsNotUndoneByLateWrites(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	kv1, kv2 := &kvFake{}, &kvFake{}
	p, h, fh := startDB(t, nil, cfg, withKV(kv1))
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	p2, h2 := secondNode(t, fh, cfg, withKV(kv2))
	snap := p.snap.Load()
	scope := snap.scopeOf(snap.flows[flow])
	review := func(rec EventListItem, status string) {
		t.Helper()
		out := decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": status}))
		if out["cache_synced"] != float64(1) {
			t.Fatalf("review %s = %v", status, out)
		}
		deliverLastReview(t, fh, h2)
	}
	var text string
	var rec EventListItem
	for _, node := range []struct {
		name string
		p    *Plugin
		kv   *kvFake
	}{{"reviewing node", p, kv1}, {"node that was told", p2, kv2}} {
		// A hit both nodes know.
		text = "MOD-HIT-sexual late write on the " + node.name
		if r := mustHook(t, h, hookReqAs(3, node.name, text)); !denied(r) {
			t.Fatalf("%s: first = %+v", node.name, r)
		}
		rec = recordOf(t, h, node.name)
		written(t, p)
		if r := mustHook(t, h2, hookReq(text)); !replayed(r) {
			t.Fatalf("%s: second node = %+v", node.name, r)
		}
		c := traceOf(t, rec).Cache
		seg := hashOf(t, c.Segs[0])
		hitKey, segKey := hitKeyOf(scope, c.Key), segKeyOf(scope, seg)
		held := node.p.lookupVerdicts(scope, [][32]byte{seg}, true).hit
		if held == nil {
			t.Fatalf("%s: the hit is not cached", node.name)
		}
		// The run stores the hit again and a pass of its segment, after as
		// many other hits as the write has workers: they are held at the KV,
		// so the write has its values and has written none of the hit's.
		now := time.Now().Unix()
		late, others := otherHits(node.p, scope, node.name, kvLookupWorkers, now, hitKey, segKey)
		again := *held
		again.At = now
		entered := node.kv.hold(func(key string) bool { return slices.Contains(others, key) })
		node.p.storeVerdicts(node.p.cfg.Load(), scope, [][32]byte{seg}, append(late, again))
		for range kvLookupWorkers {
			within(t, "the held writes of the run", entered)
		}
		review(rec, ReviewPending)
		for _, key := range append([]string{hitKey, segKey}, others...) {
			if _, found := kvValue(t, fh, key); found {
				t.Fatalf("%s: %s is in the KV after the review, before the write went on", node.name, key)
			}
		}
		// The write goes on and ends: it wrote the other hits, and nothing
		// of the reviewed one.
		node.kv.open()
		written(t, node.p)
		for _, key := range others {
			if _, found := kvValue(t, fh, key); !found {
				t.Fatalf("%s: the late write did not go on (%s is missing)", node.name, key)
			}
		}
		if _, found := kvValue(t, fh, hitKey); found {
			t.Fatalf("%s: the late write restored the hit in the KV", node.name)
		}
		if val, found := kvValue(t, fh, segKey); found {
			t.Fatalf("%s: the late write restored the segment in the KV: %s", node.name, val)
		}
		if v := node.p.lookupVerdicts(scope, [][32]byte{seg}, true); v.hit != nil || len(v.passed) != 0 {
			t.Fatalf("%s: the late write restored %+v", node.name, v)
		}
	}

	// False positive: the passes are in the KV; a node that was told reads
	// them there and keeps them out of its memory while the tombstone lasts.
	review(rec, ReviewFalsePositive)
	before := p2.cache.Load().len()
	if r := mustHook(t, h2, hookReq(text)); r.GetNote() != notePrefix+"pass (cached)" {
		t.Fatalf("second node after the false positive = %+v", r)
	}
	if n := p2.cache.Load().len(); n != before {
		t.Fatalf("a lookup right after verdict.changed stored what it read: %d -> %d entries", before, n)
	}
}

// This node's changes of a cache key in the KV take turns: a change holds
// the key's lock from its read to its write, so the next one starts from
// what it wrote. A change whose time ended while it waited is not made.
func TestKVChangesOfAKeyTakeTurns(t *testing.T) {
	kv := &kvFake{}
	p, _, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	ctx := context.Background()
	ttl := p.cfg.Load().cacheTTL
	key := segKeyHex("e0:1:fp", strings.Repeat("ab", 32))
	id := strings.Repeat("cd", 32)
	at := time.Now().Unix()

	entered := kv.hold(func(k string) bool { return k == key })
	defer kv.open()
	first, second := make(chan error, 1), make(chan error, 1)
	go func() { first <- p.kvEditSeg(ctx, key, []segEdit{pointTo(id, at)}, ttl) }()
	within(t, "the write of the first change", entered) // it has read the key and is about to write it
	if mu := p.kvLock(key); mu.TryLock() {
		mu.Unlock()
		t.Fatal("a change does not hold the lock of its key while it writes")
	}
	go func() { second <- p.kvEditRunSeg(ctx, key, []segEdit{passAt(at)}, ttl) }()
	select {
	case err := <-second:
		t.Fatalf("the second change did not wait for the first (%v)", err)
	case <-time.After(100 * time.Millisecond): // it waits; a longer look would say no more
	}
	kv.release()
	if err := within(t, "the first change", first); err != nil {
		t.Fatal(err)
	}
	within(t, "the write of the second change", entered)
	kv.open()
	if err := within(t, "the second change", second); err != nil {
		t.Fatal(err)
	}
	// Both edits are there: the second read what the first wrote.
	if v := segValues(t, fh)[key]; v.pass != at || len(v.hits) != 1 || v.hits[0].id != id {
		t.Fatalf("value after both changes = %+v", v)
	}

	// The time of a change ends while it waits for its turn: no KV call.
	kv.counts()
	mu := p.kvLock(key)
	mu.Lock()
	waited, cancel := context.WithCancel(ctx)
	late := make(chan error, 1)
	go func() { late <- p.kvDeleteHit(waited, key) }()
	cancel()
	mu.Unlock()
	if err := within(t, "the change that waited", late); !errors.Is(err, context.Canceled) {
		t.Fatalf("a change after its time = %v", err)
	}
	if writes := kv.counts(); len(writes) != 0 {
		t.Fatalf("a change after its time reached the KV: %v", writes)
	}
}

// A review tombstones the keys it changes before it writes any of them, so a
// run that ends during the review cannot store over them; and it stops at
// its budget: what did not get its turn by then is not written, the record
// does not count as synced, and the sync counts one kv timeout (0.8.1; until
// then one kv error).
func TestReviewSyncOrderAndBudget(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	snap := p.snap.Load()
	scope := snap.scopeOf(snap.flows[flow])
	// cachedHit makes a hit of its own: its record, its keys in the cache
	// and the hit as memory holds it.
	cachedHit := func(rid string) (rec EventListItem, seg [32]byte, hitKey, segKey string, held *storedHit) {
		t.Helper()
		if r := mustHook(t, h, hookReqAs(3, rid, "MOD-HIT-sexual review of "+rid)); !denied(r) {
			t.Fatalf("%s = %+v", rid, r)
		}
		rec = recordOf(t, h, rid)
		written(t, p)
		c := traceOf(t, rec).Cache
		seg = hashOf(t, c.Segs[0])
		if held = p.lookupVerdicts(scope, [][32]byte{seg}, false).hit; held == nil {
			t.Fatalf("the hit of %s is not in memory", rid)
		}
		return rec, seg, hitKeyOf(scope, c.Key), segKeyOf(scope, seg), held
	}
	review := func(rec EventListItem) <-chan *pluginv1.HTTPResponse {
		out := make(chan *pluginv1.HTTPResponse, 1)
		go func() {
			out <- h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": ReviewPending})
		}()
		return out
	}
	synced := func(resp *pluginv1.HTTPResponse) any {
		t.Helper()
		return decodeData[map[string]any](t, resp)["cache_synced"]
	}

	// A review held at its first write: its keys are tombstoned by then, and
	// what a run stores now stays out.
	rec, seg, hitKey, segKey, held := cachedHit("order")
	entered := kv.hold(func(key string) bool { return key == hitKey })
	defer kv.open()
	out := review(rec)
	within(t, "the first write of the review", entered)
	cache := p.cache.Load()
	if now := time.Now(); !cache.tombstoned(hitKey, now) || !cache.tombstoned(segKey, now) {
		t.Fatal("the review writes before it tombstoned its keys")
	}
	again := *held
	again.At = time.Now().Unix()
	p.storeVerdicts(p.cfg.Load(), scope, [][32]byte{seg}, []storedHit{again})
	if v := p.lookupVerdicts(scope, [][32]byte{seg}, false); v.hit != nil || len(v.passed) != 0 {
		t.Fatalf("a run stored %+v during the review", v)
	}
	kv.open()
	if n := synced(within(t, "the review", out)); n != float64(1) {
		t.Fatalf("cache_synced = %v", n)
	}
	written(t, p)
	if keys := kvKeys(t, fh, ""); len(keys) != 0 {
		t.Fatalf("keys left after the review: %v", keys)
	}

	// The budget of a review ends while it waits for its turn at the hit
	// entry (a write of a run has it): nothing of the review reaches the KV.
	rec, _, hitKey, _, _ = cachedHit("budget")
	budget := kvSyncBudget
	kvSyncBudget = 50 * time.Millisecond
	defer func() { kvSyncBudget = budget }()
	kv.counts()
	errs, timeouts := p.stats.kvErrors.Load(), p.stats.kvTimeouts.Load()
	mu := p.kvLock(hitKey)
	mu.Lock()
	out = review(rec)
	// The review has tombstoned its keys: its budget runs from here.
	waitFor(t, "the review to reach the cache", func() bool { return p.cache.Load().tombstoned(hitKey, time.Now()) })
	time.Sleep(10 * kvSyncBudget) // the budget is over, whatever else happens
	mu.Unlock()
	if n := synced(within(t, "the review that ran out of time", out)); n != float64(0) {
		t.Fatalf("cache_synced of a review beyond its budget = %v", n)
	}
	if writes := kv.counts(); len(writes) != 0 || p.stats.kvErrors.Load() != errs || p.stats.kvTimeouts.Load() != timeouts+1 {
		t.Fatalf("a review beyond its budget wrote %v (%d kv errors, %d kv timeouts)", writes, p.stats.kvErrors.Load()-errs, p.stats.kvTimeouts.Load()-timeouts)
	}
	if _, found := kvValue(t, fh, hitKey); !found {
		t.Fatal("the hit is gone although the review was not synced")
	}
}

// imageMod is an upstream for both auditor types: the moderation API finds
// every image violating (and no text), Jev finds nothing; it counts the Jev
// calls that came with an image, and all calls.
func imageMod(t *testing.T) (base string, jevImages, calls *atomic.Int64) {
	base, jevImages, calls, _, _ = imageModSent(t)
	return base, jevImages, calls
}

// modOrder is the order in which imageModSent answers the two calls of one
// request, for a test whose requests come one after the other and call each
// API at most once: Jev answers after the moderation API has (answered) and
// settled reports true - the test says there when the plugin has taken that
// answer. With pair the moderation API in turn answers only when the Jev
// call has arrived, for a request that calls both at once.
//
// No clock is waited for, but the order is not strict either. What settled
// can see is that the call of the moderation API has returned inside the
// plugin (audit, which then leaves stats.inflight); its outcome reaches the
// stage (runStage) a few instructions later. Jev answers in that window at
// the earliest, and its answer has a way to go through the HTTP client, so
// the outcome of the moderation API is there first unless its goroutine is
// held up exactly there.
type modOrder struct {
	pair     bool
	settled  func() bool
	arrived  chan struct{} // closed when the Jev call has arrived
	answered chan struct{} // closed when the answer of the moderation API is on the wire
	// The requests of a test may repeat a call; each channel closes once.
	arrivedOnce, answeredOnce sync.Once
}

func newModOrder(pair bool, settled func() bool) *modOrder {
	return &modOrder{pair: pair, settled: settled, arrived: make(chan struct{}), answered: make(chan struct{})}
}

// imageModSent is imageMod with the request bodies it received, in order,
// and the order of its answers (modOrder; none at first: every call is
// answered at once).
func imageModSent(t *testing.T) (base string, jevImages, calls *atomic.Int64, sent func() []string, order *atomic.Pointer[modOrder]) {
	jevImages, calls, order = new(atomic.Int64), new(atomic.Int64), new(atomic.Pointer[modOrder])
	var mu sync.Mutex
	var bodies []string
	sent = func() []string {
		mu.Lock()
		defer mu.Unlock()
		return slices.Clone(bodies)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		bodies = append(bodies, string(body))
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		o := order.Load()
		if r.URL.Path == "/v1/moderations" {
			if o != nil && o.pair {
				select {
				case <-o.arrived:
				case <-r.Context().Done():
					return
				}
			}
			scores := map[string]float64{}
			for _, c := range OpenAICategories {
				scores[c] = 0.01
			}
			if strings.Contains(string(body), "image_url") {
				scores["sexual"] = 0.99
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"model": "omni-mock", "results": []any{map[string]any{"category_scores": scores}}})
			if o != nil {
				w.(http.Flusher).Flush()
				o.answeredOnce.Do(func() { close(o.answered) })
			}
			return
		}
		var req struct {
			Questions map[string]json.RawMessage `json:"questions"`
			Assets    map[string]json.RawMessage `json:"assets"`
		}
		_ = json.Unmarshal(body, &req)
		if len(req.Assets) > 0 {
			jevImages.Add(1)
		}
		if o != nil {
			o.arrivedOnce.Do(func() { close(o.arrived) })
			select {
			case <-o.answered:
			case <-r.Context().Done():
				return
			}
			for !o.settled() {
				if r.Context().Err() != nil {
					return
				}
				runtime.Gosched()
			}
		}
		answers := map[string]any{}
		for c := range req.Questions {
			answers[c] = map[string]any{"type": "noul", "noul": 0.01}
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"model": "jev-mock", "answers": answers, "usage": map[string]int{"input_tokens": 10}})
	}))
	t.Cleanup(srv.Close)
	return srv.URL, jevImages, calls, sent, order
}

// imageFlows sets up the two flows in which the OpenAI auditor gets an image
// and Jev, while its redraw slots are busy, does not. Group 9: OpenAI, then
// Jev reviews its hits. Group 10: both in one stage, a hit of both needed.
// It returns the flow ids by group.
func imageFlows(t *testing.T, h *pluginsdktest.Harness, base string) map[int64]int64 {
	t.Helper()
	flows := map[int64]int64{
		9:  setupFlow(t, h, base, []int64{9}, CombineAny, []string{AuditorOpenAI}, []string{AuditorTypeSafe}),
		10: setupFlow(t, h, base, []int64{10}, CombineAll, []string{AuditorOpenAI, AuditorTypeSafe}),
	}
	// The Jev channels have 2 s: their redraws get one of them.
	for _, ch := range decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil)) {
		if ch.Type == ChannelTypeSafe {
			decodeData[ChannelView](t, h.Do("PUT", fmt.Sprintf("/channels/%d", ch.ID), nil, map[string]any{"type": ch.Type, "name": ch.Name,
				"base_url": ch.BaseURL, "timeout_ms": 2000}))
		}
	}
	return flows
}

// jevWithoutImages switches the images of every Jev auditor off: with an
// OpenAI auditor beside them their flows are mixed (snapshot.mixedImages).
func jevWithoutImages(t *testing.T, h *pluginsdktest.Harness) {
	t.Helper()
	for _, a := range decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil)) {
		if a.Type == AuditorTypeSafe {
			decodeData[AuditorView](t, h.Do("PUT", fmt.Sprintf("/auditors/%d", a.ID), nil, map[string]any{"name": a.Name, "type": a.Type,
				"channel_id": a.ChannelID, "config": map[string]any{"review_images": false}}))
		}
	}
}

// A pass is stored for an image only when an auditor that itself passed had
// received it. Here the OpenAI auditor receives the image and hits, while Jev
// has no redraw slot, judges the text alone and passes: the run passes, and
// the image Jev never saw must not be answered "pass (cached)" afterwards.
func TestImagePassNeedsAPassingAuditor(t *testing.T) {
	base, jevImages, _ := imageMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	flows := imageFlows(t, h, base)
	const cachedPass = notePrefix + "pass (cached)"
	for _, tc := range []struct {
		name   string
		group  int64
		result string
	}{{"overturned by a stage that did not get the image", 9, ResultOverturned}, {"one stage, all", 10, ResultPass}} {
		t.Run(tc.name, func(t *testing.T) {
			b, _ := json.Marshal(map[string]any{"messages": []any{map[string]any{"role": "user", "content": []any{
				map[string]any{"type": "text", "text": "a harmless caption " + tc.name},
				map[string]any{"type": "image", "source": map[string]any{"type": "base64", "media_type": "image/png",
					"data": encodePNG(t, filled(100, 100+int(tc.group), red))}},
			}}}})
			send := func(rid string) *pluginv1.GatewayRequestHookResponse {
				t.Helper()
				req := rawReq(3, rid, "anthropic.messages", string(b))
				req.Meta.GroupId = tc.group
				return mustHook(t, h, req)
			}
			// Both redraw slots are busy: Jev sends the text alone.
			for range cap(jevNormalizeSlots) {
				jevNormalizeSlots <- struct{}{}
			}
			free := sync.OnceFunc(func() {
				for range cap(jevNormalizeSlots) {
					<-jevNormalizeSlots
				}
			})
			defer free()
			images := jevImages.Load()
			rid := fmt.Sprintf("busy-%d", tc.group)
			if r := send(rid); denied(r) || r.GetNote() == cachedPass || jevImages.Load() != images {
				t.Fatalf("with the slots busy = %+v (%d Jev calls with an image)", r, jevImages.Load()-images)
			}
			ev := waitEvents(t, h, map[string]string{"request_id": rid}, 1)[0]
			if ev.Result != tc.result {
				t.Fatalf("record with the slots busy = %s %s", ev.Result, ev.Trace)
			}
			// Nothing of the chunk is a cached pass: not the image, and not
			// the text beside an image only the hitting auditor received.
			written(t, p)
			if segs := flowSegs(t, fh, flows[tc.group]); segs != 0 {
				t.Fatalf("%d segment keys of the flow after the run without the image", segs)
			}
			// With a slot the image is sent to Jev too: the request is not
			// answered from the cache.
			free()
			if r := send(""); denied(r) || r.GetNote() == cachedPass || jevImages.Load() != images+1 {
				t.Fatalf("with a free slot = %+v (%d Jev calls with an image)", r, jevImages.Load()-images)
			}
			// Now a passing auditor has received it.
			written(t, p)
			if r := send(""); r.GetNote() != cachedPass || jevImages.Load() != images+1 {
				t.Fatalf("after Jev passed the image = %+v (%d Jev calls with an image)", r, jevImages.Load()-images)
			}
		})
	}
}

// flowSegs counts the segment keys of a flow in the KV.
func flowSegs(t *testing.T, fh *pluginsdktest.FakeHost, flow int64) (n int) {
	t.Helper()
	for key := range segValues(t, fh) {
		if strings.HasPrefix(key, fmt.Sprintf("s:e0:%d:", flow)) {
			n++
		}
	}
	return n
}

// Fourth round, F1: a request with an image only a hitting auditor received,
// which a reviewer that did not get the image lets through, is let through
// every time. Were its text stored as a pass, the second request would send
// the image alone: the auditor that got it hits, the reviewer has nothing to
// judge, and the request that was allowed is refused, counted as a violation
// and replayed as a hit from then on. So nothing of such a chunk is cached,
// and the same request is judged as a whole each time.
func TestImageOnlyAHittingAuditorSawGetsTheSameVerdict(t *testing.T) {
	base, jevImages, calls := imageMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	flows := imageFlows(t, h, base)
	// Both redraw slots stay busy: Jev always sends the text alone.
	for range cap(jevNormalizeSlots) {
		jevNormalizeSlots <- struct{}{}
	}
	defer func() {
		for range cap(jevNormalizeSlots) {
			<-jevNormalizeSlots
		}
	}()
	for _, tc := range []struct {
		name   string
		group  int64
		result string
	}{{"overturned by a stage that did not get the image", 9, ResultOverturned}, {"one stage, all", 10, ResultPass}} {
		t.Run(tc.name, func(t *testing.T) {
			b, _ := json.Marshal(map[string]any{"messages": []any{map[string]any{"role": "user", "content": []any{
				map[string]any{"type": "text", "text": "the same caption " + tc.name},
				map[string]any{"type": "image", "source": map[string]any{"type": "base64", "media_type": "image/png",
					"data": encodePNG(t, filled(100, 120+int(tc.group), red))}},
			}}}})
			var first string
			for i := range 3 {
				rid := fmt.Sprintf("same-%d-%d", tc.group, i)
				req := rawReq(3, rid, "anthropic.messages", string(b))
				req.Meta.GroupId = tc.group
				n := calls.Load()
				r := mustHook(t, h, req)
				if i == 0 {
					first = r.GetNote()
				}
				// Both auditors were called: the one with the image and the one
				// without.
				if denied(r) || r.GetNote() != first || !strings.HasPrefix(first, notePrefix+tc.result+" flow=") || calls.Load() != n+2 {
					t.Fatalf("request %d = %+v, first note %q (%d upstream calls)", i, r, first, calls.Load()-n)
				}
				if ev := recordOf(t, h, rid); ev.Result != tc.result || ev.Replayed {
					t.Fatalf("record %d = %s replayed %v %s", i, ev.Result, ev.Replayed, ev.Trace)
				}
				written(t, p)
			}
			// Nothing of the chunk was stored as a pass, the text neither.
			if segs := flowSegs(t, fh, flows[tc.group]); segs != 0 {
				t.Fatalf("%d segment keys of the flow", segs)
			}
		})
	}
	if jevImages.Load() != 0 {
		t.Fatalf("%d Jev calls with an image", jevImages.Load())
	}
	// No hit was stored or recorded, and no violation counted.
	if keys := kvKeys(t, fh, "h:"); len(keys) != 0 {
		t.Fatalf("cached hits: %v", keys)
	}
	ctx := context.Background()
	p.flushStats(ctx)
	db, _ := p.db(ctx)
	var records, suspicious, violations int64
	if err := db.QueryRow(ctx, `SELECT (SELECT count(*) FROM events), (SELECT count(*) FROM events WHERE `+suspiciousResult+`),
		(SELECT coalesce(sum(suspicious), 0) FROM user_daily)`).Scan(&records, &suspicious, &violations); err != nil || records != 6 || suspicious != 0 || violations != 0 {
		t.Fatalf("%d records, %d suspicious, %d violations counted (%v)", records, suspicious, violations, err)
	}
}

// Fifth round: the verdict of TestImageOnlyAHittingAuditorSawGetsTheSameVerdict
// does not depend on what other requests cached. The request X = text T and
// image I is let through (only the hitting auditor received I, the auditor
// that passed judged T alone) and stores nothing. Then a request with T alone
// passes, and T is a cached pass. Were T left out of the plan of the next X,
// I would be alone in its chunk: the auditor that gets it hits, the other one
// has nothing to judge and is skipped, X is refused, a violation is counted
// and {I} is replayed as a hit from then on. In a mixed flow an image that is
// not cached keeps the text of its request in the plan (makePlan), so X is
// judged as a whole and let through every time.
//
// The flows are mixed: the OpenAI auditor takes images, the Jev auditor has
// its image switch off. (A flow whose auditors all take images does not keep
// the text: TestLLMReviewerSeesTheImage.)
func TestImageVerdictDoesNotDependOnCachedText(t *testing.T) {
	base, jevImages, calls, sent, order := imageModSent(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	flows := imageFlows(t, h, base)
	jevWithoutImages(t, h)
	// Jev answers after the moderation API, as it did while it waited for a
	// redraw slot: in the stage of both, the hit is there before the pass
	// decides the stage (and ends the other call). The call of the moderation
	// API has returned with its answer when the Jev call is the only one left
	// in flight; the stage takes its outcome a few instructions after that,
	// which is as close as a test without a seam in the plugin gets
	// (modOrder). In the stage of both, the moderation API waits for the Jev
	// call to arrive, so that the call is counted when a pass ends it.
	ordered := func(group int64) {
		order.Store(newModOrder(group == 10, func() bool { return p.stats.inflight.Load() <= 1 }))
	}
	for group, id := range flows {
		if snap := p.snap.Load(); !snap.mixedImages(snap.flows[id]) {
			t.Fatalf("the flow of group %d is not mixed", group)
		}
	}
	const cachedPass = notePrefix + "pass (cached)"
	for _, tc := range []struct {
		name      string
		group     int64
		result    string
		textCalls int64 // upstream calls of the request with the text alone
	}{{"overturned by a stage that did not get the image", 9, ResultOverturned, 1}, {"one stage, all", 10, ResultPass, 2}} {
		t.Run(tc.name, func(t *testing.T) {
			caption := fmt.Sprintf("a caption other requests cache %d", tc.group)
			text := map[string]any{"type": "text", "text": caption}
			image := map[string]any{"type": "image", "source": map[string]any{"type": "base64", "media_type": "image/png",
				"data": encodePNG(t, filled(100, 140+int(tc.group), red))}}
			send := func(rid string, content ...any) *pluginv1.GatewayRequestHookResponse {
				t.Helper()
				b, _ := json.Marshal(map[string]any{"messages": []any{map[string]any{"role": "user", "content": content}}})
				req := rawReq(3, rid, "anthropic.messages", string(b))
				req.Meta.GroupId = tc.group
				ordered(tc.group)
				return mustHook(t, h, req)
			}
			// x sends X and checks that it was judged as a whole and let through.
			var first string
			x := func(i int) {
				t.Helper()
				rid := fmt.Sprintf("x-%d-%d", tc.group, i)
				n := calls.Load()
				r := send(rid, text, image)
				if first == "" {
					first = r.GetNote()
				}
				if denied(r) || r.GetNote() != first || !strings.HasPrefix(first, notePrefix+tc.result+" flow=") || calls.Load() != n+2 {
					t.Fatalf("request %d = %+v, first note %q (%d upstream calls)", i, r, first, calls.Load()-n)
				}
				// Both auditors got the text; the image came with it, once.
				bodies := sent()
				withImage := 0
				for _, body := range bodies[len(bodies)-2:] {
					if !strings.Contains(body, caption) {
						t.Fatalf("request %d: a call without the text: %.300s", i, body)
					}
					if strings.Contains(body, "image_url") {
						withImage++
					}
				}
				if withImage != 1 {
					t.Fatalf("request %d: %d calls with the image", i, withImage)
				}
				if ev := recordOf(t, h, rid); ev.Result != tc.result || ev.Replayed {
					t.Fatalf("record %d = %s replayed %v %s", i, ev.Result, ev.Replayed, ev.Trace)
				}
				written(t, p)
			}
			x(0)
			if segs := flowSegs(t, fh, flows[tc.group]); segs != 0 {
				t.Fatalf("%d segment keys of the flow after the first request", segs)
			}
			// Another request caches the text as passed.
			n := calls.Load()
			if r := send("", text); denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+"pass flow=") || calls.Load() != n+tc.textCalls {
				t.Fatalf("the text alone = %+v (%d upstream calls)", r, calls.Load()-n)
			}
			written(t, p)
			if r := send("", text); r.GetNote() != cachedPass || calls.Load() != n+tc.textCalls {
				t.Fatalf("the text alone again = %+v (%d upstream calls)", r, calls.Load()-n)
			}
			x(1)
			x(2)
			// Of the flow only the text is a cached pass (stored by the request
			// that held it alone), the image is not.
			if segs := flowSegs(t, fh, flows[tc.group]); segs != 1 {
				t.Fatalf("%d segment keys of the flow", segs)
			}
		})
	}
	if jevImages.Load() != 0 {
		t.Fatalf("%d Jev calls with an image", jevImages.Load())
	}
	// No hit was stored or recorded, and no violation counted.
	if keys := kvKeys(t, fh, "h:"); len(keys) != 0 {
		t.Fatalf("cached hits: %v", keys)
	}
	ctx := context.Background()
	p.flushStats(ctx)
	db, _ := p.db(ctx)
	var suspicious, replays, violations int64
	if err := db.QueryRow(ctx, `SELECT (SELECT count(*) FROM events WHERE `+suspiciousResult+`), (SELECT count(*) FROM events WHERE replayed),
		(SELECT coalesce(sum(suspicious), 0) FROM user_daily)`).Scan(&suspicious, &replays, &violations); err != nil || suspicious != 0 || replays != 0 || violations != 0 {
		t.Fatalf("%d suspicious records, %d replays, %d violations counted (%v)", suspicious, replays, violations, err)
	}
}

// Fourth round, F2: a hit whose write to the KV failed is written again. Its
// parts pass one by one on another node; the node that judged the hit keeps
// deciding by it, although the KV holds only the passes, and a lookup that
// replays it has it written to the KV again in the background - with the TTL
// of its first write, one write at a time, and not while the first write may
// still be under way.
// Once it has landed nothing is written again: a review that deletes it in
// the KV is not undone by this node, which follows the review with its
// broadcast.
func TestUnlandedHitIsWrittenAgain(t *testing.T) {
	base, calls := newPairMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	kv := &kvFake{}
	var clock atomic.Int64
	p, h, fh := startDB(t, nil, cfg, withKV(kv), withClock(&clock))
	flow := setupFlow(t, h, base, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const (
		proto      = "anthropic.messages"
		whole      = `{"system":"alpha rule","messages":[{"role":"user","content":"beta ask"}]}`
		first      = `{"system":"alpha rule","messages":[{"role":"user","content":"a harmless sentence"}]}`
		last       = `{"messages":[{"role":"user","content":"beta ask"}]}`
		cachedPass = notePrefix + "pass (cached)"
	)
	// The node judges the pair a hit while the KV takes no writes.
	kv.noWrite.Store(true)
	if r := mustHook(t, h, rawReq(3, "pair", proto, whole)); !denied(r) || replayed(r) {
		t.Fatalf("the pair = %+v", r)
	}
	rec := recordOf(t, h, "pair")
	c := traceOf(t, rec).Cache
	snap := p.snap.Load()
	hitKey := hitKeyOf(snap.scopeOf(snap.flows[flow]), c.Key)
	written(t, p)
	if keys := append(kvKeys(t, fh, "h:"), kvKeys(t, fh, "s:")...); len(keys) != 0 {
		t.Fatalf("KV after the failed write: %v", keys)
	}
	// Each part passes alone on another node: the KV holds two passes and no
	// pointer.
	p2, h2 := secondNode(t, fh, cfg)
	for _, body := range []string{first, last} {
		if r := mustHook(t, h2, rawReq(4, "", proto, body)); denied(r) {
			t.Fatalf("a part = %+v", r)
		}
	}
	written(t, p2)
	waitSegs(t, fh, "that passed", 2, func(v segValue) bool { return v.pass > 0 && !pointed(v) })
	n := calls.Load()
	// replayAt sends the pair at a time after the hit and waits for what the
	// lookup started in the background: the node decides by its hit, without
	// an upstream call.
	replayAt := func(ahead time.Duration, what string) {
		t.Helper()
		clock.Store(int64(ahead))
		if r := mustHook(t, h, rawReq(3, "", proto, whole)); !denied(r) || !replayed(r) || calls.Load() != n {
			t.Fatalf("the pair %v after the hit, %s = %+v (%d calls)", ahead, what, r, calls.Load()-n)
		}
		written(t, p)
	}
	counted := func() [2]int64 { return [2]int64{p.stats.kvErrors.Load(), p.stats.kvTimeouts.Load()} }

	// Right after the hit its first write may still be under way: the replay
	// starts no other, and asks the KV nothing.
	kv.calls.Store(0)
	replayAt(tombstoneTTL-time.Second, "its first write perhaps under way")
	if kv.calls.Load() != 0 {
		t.Fatalf("%d KV calls of a replay right after the hit", kv.calls.Load())
	}
	// Later a replay writes the hit again. The write fails once more: a kv
	// error, and nothing in the KV.
	before := counted()
	replayAt(tombstoneTTL+time.Second, "the KV without the hit")
	if keys := kvKeys(t, fh, "h:"); len(keys) != 0 || kv.calls.Load() != 1 || counted() != [2]int64{before[0] + 1, before[1]} {
		t.Fatalf("while the KV takes no writes: hit entries %v, %d KV calls, %v -> %v (kv errors, kv timeouts)", keys, kv.calls.Load(), before, counted())
	}
	// The KV takes writes again, and the write of the next replay is held at
	// the hit entry: the replays that come meanwhile start no second write
	// and count nothing.
	kv.noWrite.Store(false)
	kv.counts()
	before = counted()
	entered := kv.hold(func(key string) bool { return key == hitKey })
	defer kv.open()
	clock.Store(int64(time.Hour))
	for i := range 3 {
		if r := mustHook(t, h, rawReq(3, "", proto, whole)); !denied(r) || !replayed(r) || calls.Load() != n {
			t.Fatalf("replay %d while the hit is written again = %+v (%d calls)", i, r, calls.Load()-n)
		}
		if i == 0 {
			within(t, "the write of the hit entry", entered)
		}
	}
	if !p.rewriting.Load() || counted() != before {
		t.Fatalf("while the write is held: rewriting %v, %v -> %v (kv errors, kv timeouts)", p.rewriting.Load(), before, counted())
	}
	kv.open()
	written(t, p)
	// The KV has the hit and its pointers, written once, for what is left of
	// the TTL of the hit.
	waitSegs(t, fh, "with a pass and a pointer", 2, func(v segValue) bool { return v.pass > 0 && pointed(v) })
	if writes := kv.counts(); len(writes) != 3 || writes[hitKey] != 1 || counted() != before {
		t.Fatalf("writes of the hit that had not landed = %v, %v -> %v (kv errors, kv timeouts)", writes, before, counted())
	}
	ttl, _ := kv.ttls.Load(hitKey)
	if want := p.cfg.Load().cacheTTL - time.Hour; ttl != want {
		t.Fatalf("TTL of the hit entry written again = %v, want %v", ttl, want)
	}
	// A node that never knew the hit decides by it now.
	_, h3 := secondNode(t, fh, cfg)
	if r := mustHook(t, h3, rawReq(5, "", proto, whole)); !denied(r) || !replayed(r) || calls.Load() != n {
		t.Fatalf("the pair on a third node = %+v (%d calls)", r, calls.Load()-n)
	}
	// It has landed: the next replay writes nothing.
	kv.calls.Store(0)
	replayAt(2*time.Hour, "the hit landed")
	if writes := kv.counts(); len(writes) != 0 || kv.calls.Load() != 0 {
		t.Fatalf("writes of a replay of the landed hit = %v (%d KV calls)", writes, kv.calls.Load())
	}

	// A review on another node deletes the hit; its broadcast does not
	// arrive. The node that judged the hit keeps replaying it from its memory
	// and does not write it back.
	out := decodeData[map[string]any](t, h2.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": "false_positive"}))
	if out["cache_synced"] != float64(1) {
		t.Fatalf("review = %v", out)
	}
	for _, ahead := range []time.Duration{3 * time.Hour, 4 * time.Hour} {
		replayAt(ahead, "after the review, without its broadcast")
		if keys := kvKeys(t, fh, "h:"); len(keys) != 0 {
			t.Fatalf("the reviewed hit is back in the KV %v after the hit: %v", ahead, keys)
		}
		if writes := kv.counts(); len(writes) != 0 || kv.calls.Load() != 0 {
			t.Fatalf("writes %v after the hit, after the review = %v (%d KV calls)", ahead, writes, kv.calls.Load())
		}
	}
	// With the broadcast it follows the review.
	deliverLastReview(t, fh, h)
	if r := mustHook(t, h, rawReq(3, "", proto, whole)); r.GetNote() != cachedPass || calls.Load() != n {
		t.Fatalf("after the broadcast of the review = %+v (%d calls)", r, calls.Load()-n)
	}
	if keys := kvKeys(t, fh, "h:"); len(keys) != 0 {
		t.Fatalf("the reviewed hit is back in the KV: %v", keys)
	}
}

// Fourth round, F3: a pointer to a hit entry the KV says is not there does
// not make a lookup of memory alone (the hook under post timing) queue the
// request every time: the lookup with the KV that learns it removes the
// pointer from the values in memory.
func TestStalePointerLeavesMemory(t *testing.T) {
	base, calls := newPairMod(t)
	var clock atomic.Int64
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve}, withClock(&clock))
	flow := setupFlow(t, h, base, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const (
		proto      = "anthropic.messages"
		whole      = `{"system":"alpha rule","messages":[{"role":"user","content":"beta ask"}]}`
		last       = `{"messages":[{"role":"user","content":"beta ask"}]}`
		cachedPass = notePrefix + "pass (cached)"
		queued     = notePrefix + "queued"
	)
	// The pair is a cached hit, its last part a cached pass.
	if r := mustHook(t, h, rawReq(3, "pair", proto, whole)); r.GetNote() != queued {
		t.Fatalf("the pair = %+v", r)
	}
	c := traceOf(t, recordOf(t, h, "pair")).Cache
	written(t, p)
	if r := mustHook(t, h, rawReq(3, "", proto, last)); r.GetNote() != queued {
		t.Fatalf("the part = %+v", r)
	}
	waitSegs(t, fh, "with a pass and a pointer", 1, func(v segValue) bool { return v.pass > 0 && pointed(v) })
	if r := mustHook(t, h, rawReq(3, "", proto, last)); r.GetNote() != cachedPass {
		t.Fatalf("the part again = %+v", r)
	}
	// The hit entry is gone, from the KV and from memory, and the pointers
	// are no longer young.
	snap := p.snap.Load()
	hitKey := hitKeyOf(snap.scopeOf(snap.flows[flow]), c.Key)
	kvDelete(t, fh, hitKey)
	p.cache.Load().forget([]string{hitKey})
	clock.Store(int64(2 * tombstoneTTL))
	n, known := calls.Load(), p.stats.cacheHits.Load()
	// The first request cannot tell from memory: queued, and the worker asks
	// the KV. The second and the third are answered from memory.
	if r := mustHook(t, h, rawReq(3, "", proto, last)); r.GetNote() != queued {
		t.Fatalf("the part with a pointer to an entry that is not in memory = %+v", r)
	}
	waitFor(t, "the worker's lookup", func() bool { return p.stats.cacheHits.Load() == known+1 })
	for i := range 2 {
		if r := mustHook(t, h, rawReq(3, "", proto, last)); r.GetNote() != cachedPass {
			t.Fatalf("request %d after the KV said the entry is not there = %+v", i+2, r)
		}
	}
	if calls.Load() != n {
		t.Fatalf("%d upstream calls", calls.Load()-n)
	}
	// The KV was not written for it.
	if v := segValues(t, fh); len(v) != 2 {
		t.Fatalf("segment keys = %v", v)
	}
	for key, v := range segValues(t, fh) {
		if !pointed(v) {
			t.Fatalf("%s lost its pointer in the KV: %+v", key, v)
		}
	}
}

// kvDelete removes a verdict cache key from the KV behind the nodes' backs.
func kvDelete(t *testing.T, fh *pluginsdktest.FakeHost, key string) {
	t.Helper()
	if _, err := fh.KVDelete(context.Background(), &pluginv1.KVDeleteRequest{Namespace: kvNamespace, Key: key}); err != nil {
		t.Fatal(err)
	}
}

// A review on one node does not reach a node its broadcast never got to
// while that node holds the values in its memory: it keeps replaying the
// hits a review removed (0.8.1; on a node of 0.8.0 what the KV holds replaced
// the values 5 minutes after their last read, and the test was
// TestReviewReachesNodeWithoutBroadcast). It follows the reviews once its
// values have expired.
func TestNodeWithoutReviewBroadcastReplaysUntilExpiry(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	var clock1 atomic.Int64 // of the node that hits and reviews
	p, h, fh := startDB(t, nil, cfg, withClock(&clock1))
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	calls := func() int64 { return mod.count("/v1/moderations") }
	ttl := p.cfg.Load().cacheTTL
	kv2 := &kvFake{}
	var clock atomic.Int64
	p2, h2 := secondNode(t, fh, cfg, withKV(kv2), withClock(&clock))
	snap := p2.snap.Load()
	scope := snap.scopeOf(snap.flows[flow])
	const cachedPass = notePrefix + "pass (cached)"
	// The first node hits the four texts, the second replays them: pointer
	// and hit entry are in its memory.
	texts := map[string]string{"fp": "MOD-HIT-sexual false positive", "pend": "MOD-HIT-sexual pending", "post": "MOD-HIT-sexual post timing", "gone": "MOD-HIT-sexual entry gone"}
	ids := map[string]int64{}
	hitKeys := map[string]string{}
	segs := map[string][][32]byte{}
	for _, rid := range []string{"fp", "pend", "post", "gone"} {
		if r := mustHook(t, h, hookReqAs(3, rid, texts[rid])); !denied(r) || replayed(r) {
			t.Fatalf("%s = %+v", rid, r)
		}
		rec := recordOf(t, h, rid)
		c := traceOf(t, rec).Cache
		ids[rid], hitKeys[rid], segs[rid] = rec.ID, hitKeyOf(scope, c.Key), [][32]byte{hashOf(t, c.Segs[0])}
	}
	waitKV(t, fh, "h:", 4)
	waitSegs(t, fh, "pointing to a hit", 4, pointed)
	for rid, text := range texts {
		if r := mustHook(t, h2, hookReq(text)); !replayed(r) {
			t.Fatalf("second node, %s = %+v", rid, r)
		}
	}
	// The reviews come two hours after the hits, so that what they store
	// outlives the hits.
	clock1.Store(int64(2 * time.Hour))
	review := func(rid, status string) {
		t.Helper()
		out := decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{ids[rid]}, "status": status}))
		if out["cache_synced"] != float64(1) {
			t.Fatalf("review of %s = %v", rid, out)
		}
	}
	review("fp", "false_positive")
	review("post", "false_positive")
	review("pend", "pending")
	// The hit entry of the fourth is gone from the KV while a pointer still
	// names it (a review whose segment writes failed).
	kvDelete(t, fh, hitKeys["gone"])
	n := calls()

	// No broadcast is delivered. The second node decides by its memory, and
	// makes no call to the KV for it: before and after the time a node of
	// 0.8.0 read its values again, and as long as they have not expired.
	kv2.calls.Store(0)
	for _, ahead := range []time.Duration{5*time.Minute - 30*time.Second, 5*time.Minute + time.Second, 10*time.Minute + 2*time.Second, ttl - time.Hour} {
		clock.Store(int64(ahead))
		for rid, text := range texts {
			if r := mustHook(t, h2, hookReq(text)); !replayed(r) {
				t.Fatalf("second node %v after the hits, %s = %+v", ahead, rid, r)
			}
		}
		// Memory alone (the hook under post timing) is the same, every time.
		for range 2 {
			if v := p2.lookupVerdicts(scope, segs["post"], false); v.hit == nil {
				t.Fatalf("memory alone %v after the hits = %+v", ahead, v)
			}
		}
	}
	if calls() != n || kv2.calls.Load() != 0 {
		t.Fatalf("%d upstream calls and %d KV calls while the second node decided by its memory", calls()-n, kv2.calls.Load())
	}

	// The values have expired: the node reads the KV and follows the reviews.
	// False positive: the pass of the review answers.
	clock.Store(int64(ttl + time.Hour))
	if v := p2.lookupVerdicts(scope, segs["post"], false); v.hit != nil || len(v.passed) != 0 {
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

// A pointer whose hit entry cannot be read is not a stale pointer: the passes
// of its segments do not answer the request. The hit set {A, B} is cached,
// and A and B each passed in other requests.
func TestUnreadableHitEntryIsUnknown(t *testing.T) {
	base, calls := newPairMod(t)
	kv := &kvFake{}
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	flow := setupFlow(t, h, base, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const (
		proto = "anthropic.messages"
		whole = `{"system":"alpha rule","messages":[{"role":"user","content":"beta ask"}]}`
		first = `{"system":"alpha rule","messages":[{"role":"user","content":"a harmless sentence"}]}`
		last  = `{"messages":[{"role":"user","content":"beta ask"}]}`
	)
	if r := mustHook(t, h, rawReq(3, "pair", proto, whole)); !denied(r) || replayed(r) {
		t.Fatalf("the pair = %+v", r)
	}
	for _, body := range []string{first, last} {
		if r := mustHook(t, h, rawReq(3, "", proto, body)); denied(r) {
			t.Fatalf("a part = %+v", r)
		}
	}
	written(t, p)
	passedSeg := func(v segValue) bool { return v.pass > 0 && pointed(v) }
	waitSegs(t, fh, "with a pass and a pointer", 2, passedSeg)
	c := traceOf(t, recordOf(t, h, "pair")).Cache
	keys := [][32]byte{hashOf(t, c.Segs[0]), hashOf(t, c.Segs[1])}
	snap := p.snap.Load()
	scope := snap.scopeOf(snap.flows[flow])
	hitKey := hitKeyOf(scope, c.Key)

	// Memory alone, the hit entry evicted: unknown, not two passes. With the
	// KV the entry is found.
	p.cache.Load().forget([]string{hitKey})
	if v := p.lookupVerdicts(scope, keys, false); v.hit != nil || len(v.passed) != 0 {
		t.Fatalf("memory alone without the hit entry = %+v", v)
	}
	if v := p.lookupVerdicts(scope, keys, true); v.hit == nil {
		t.Fatalf("with the KV = %+v", v)
	}

	// Only the KV knows, and the reads of the hit entries fail: the pair is
	// moderated again (and refused), not answered by the passes.
	p.cache.Store(newLRU(1000))
	prefix := "h:"
	kv.noRead.Store(&prefix)
	n := calls.Load()
	if r := mustHook(t, h, rawReq(3, "", proto, whole)); !denied(r) || replayed(r) || calls.Load() != n+1 {
		t.Fatalf("while the hit entries cannot be read = %+v (%d calls)", r, calls.Load()-n)
	}
	// A part alone is unknown as well while its pointer cannot be followed.
	p.cache.Store(newLRU(1000))
	if r := mustHook(t, h, rawReq(3, "", proto, last)); denied(r) || r.GetNote() == notePrefix+"pass (cached)" || calls.Load() != n+2 {
		t.Fatalf("a part while the hit entries cannot be read = %+v (%d calls)", r, calls.Load()-n)
	}
	kv.noRead.Store(nil)
	written(t, p)

	// An entry the KV says is not there leaves a stale pointer: the passes
	// count, as before.
	kvDelete(t, fh, hitKey)
	p.cache.Store(newLRU(1000))
	if v := p.lookupVerdicts(scope, keys, true); v.hit != nil || len(v.passed) != 2 {
		t.Fatalf("with the entry deleted = %+v", v)
	}
}

// longRequest is an anthropic request of n messages, each a segment of its
// own; text(i) is the text of message i.
func longRequest(n int) (body string, text func(i int) string) {
	text = func(i int) string { return fmt.Sprintf("turn %03d of a long conversation", i) }
	msgs := make([]any, n)
	for i := range msgs {
		role := "user"
		if i%2 == 1 {
			role = "assistant"
		}
		msgs[i] = map[string]any{"role": role, "content": text(i)}
	}
	b, _ := json.Marshal(map[string]any{"messages": msgs})
	return string(b), text
}

// 0.8.1: a value in memory is not read from the KV again. A request of 150
// segments the node knows makes no KV call - on a node whose KV calls take
// 50 ms each, as on the node that serves the traffic - and counts neither a
// kv error nor a kv timeout, at any time before the values expire. (A node of
// 0.8.0 read the values again 5 minutes after their last read, 64 per lookup
// within half its budget: with a KV this slow every such lookup ran out of
// time and counted a kv error.)
func TestKnownSegmentsMakeNoKVCall(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	var clock atomic.Int64
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv), withClock(&clock))
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const (
		proto      = "anthropic.messages"
		segments   = 150
		cachedPass = notePrefix + "pass (cached)"
	)
	body, _ := longRequest(segments)
	if r := mustHook(t, h, rawReq(3, "", proto, body)); denied(r) || r.GetNote() == cachedPass {
		t.Fatalf("first = %+v", r)
	}
	written(t, p)
	// The node knows every segment of the request: its run stored them.
	snap := p.snap.Load()
	scope := snap.scopeOf(snap.flows[flow])
	var keys [][32]byte
	cache := p.cache.Load()
	cache.mu.Lock()
	for key := range cache.items {
		if seg, ok := strings.CutPrefix(key, "s:"+scope+":"); ok {
			keys = append(keys, hashOf(t, seg))
		}
	}
	cache.mu.Unlock()
	if len(keys) != segments {
		t.Fatalf("%d segments in memory, want %d", len(keys), segments)
	}

	kv.delay.Store(int64(50 * time.Millisecond))
	kv.calls.Store(0)
	errs, timeouts, upstream := p.stats.kvErrors.Load(), p.stats.kvTimeouts.Load(), len(mod.moderated())
	ttl := p.cfg.Load().cacheTTL
	for _, ahead := range []time.Duration{0, 5*time.Minute + time.Second, 10*time.Minute + 2*time.Second, time.Hour, ttl / 2, ttl - time.Minute} {
		clock.Store(int64(ahead))
		began := time.Now()
		if r := mustHook(t, h, rawReq(3, "", proto, body)); r.GetNote() != cachedPass {
			t.Fatalf("%v after the first = %+v", ahead, r)
		}
		for _, useKV := range []bool{true, false} {
			if v := p.lookupVerdicts(scope, keys, useKV); v.hit != nil || len(v.passed) != segments {
				t.Fatalf("%v after the first, lookup (KV %v): %d of %d segments passed", ahead, useKV, len(v.passed), segments)
			}
		}
		if n := kv.calls.Load(); n != 0 || p.stats.kvErrors.Load() != errs || p.stats.kvTimeouts.Load() != timeouts || len(mod.moderated()) != upstream {
			t.Fatalf("%v after the first (took %v): %d KV calls, %d kv errors, %d kv timeouts, %d upstream calls", ahead, time.Since(began), n,
				p.stats.kvErrors.Load()-errs, p.stats.kvTimeouts.Load()-timeouts, len(mod.moderated())-upstream)
		}
	}
	// Expired, they are unknown again.
	clock.Store(int64(ttl + time.Second))
	if v := p.lookupVerdicts(scope, keys, false); len(v.passed) != 0 {
		t.Fatalf("after the TTL: %d segments passed", len(v.passed))
	}
}

// The lookup of content a node sees for the first time is bounded: it asks
// the KV for the newest kvLookupMax segments, kvLookupWorkers at a time, and
// with a KV that takes 50 ms per call its budget ends after about half of
// them. What was not read is unknown and moderated. The lookup counts one kv
// timeout and no kv error (0.8.1; until then one kv error), in /status and in
// the health metrics.
func TestLookupOfMissesStopsAtItsBudget(t *testing.T) {
	kv := &kvFake{}
	// An upstream that passes everything and notes how many KV calls the
	// slow node had made when its call arrived: those of the lookup, the
	// writes of the run come after the answer.
	var lookupCalls atomic.Int64
	var mu sync.Mutex
	var bodies []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lookupCalls.Store(kv.calls.Load())
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		bodies = append(bodies, string(body))
		mu.Unlock()
		scores := map[string]float64{}
		for _, c := range OpenAICategories {
			scores[c] = 0.01
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"model": "omni-mock", "results": []any{map[string]any{"category_scores": scores}}})
	}))
	t.Cleanup(srv.Close)
	cfg := map[string]any{"mode": ModeEnforce}
	p1, h1, fh := startDB(t, nil, cfg)
	setupFlow(t, h1, srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const (
		proto      = "anthropic.messages"
		segments   = 150
		cachedPass = notePrefix + "pass (cached)"
	)
	body, text := longRequest(segments)
	// Another node moderated the request: the KV holds the passes of its
	// newest kvLookupMax segments, the ones a lookup asks for.
	if r := mustHook(t, h1, rawReq(3, "", proto, body)); denied(r) || r.GetNote() == cachedPass {
		t.Fatalf("on the first node = %+v", r)
	}
	written(t, p1)
	if n := len(segValues(t, fh)); n != kvLookupMax {
		t.Fatalf("%d segment keys in the KV, want %d", n, kvLookupMax)
	}

	// The slow node sees the request for the first time.
	p, h := secondNode(t, fh, cfg, withKV(kv))
	kv.delay.Store(int64(50 * time.Millisecond))
	kv.calls.Store(0)
	errs, timeouts := p.stats.kvErrors.Load(), p.stats.kvTimeouts.Load()
	r := mustHook(t, h, rawReq(4, "", proto, body))
	kv.delay.Store(0) // the writes of the run need not be slow
	written(t, p)
	mu.Lock()
	sent := slices.Clone(bodies)
	mu.Unlock()
	if denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+"pass flow=") || len(sent) != 2 {
		t.Fatalf("on the slow node = %+v (%d upstream calls)", r, len(sent))
	}
	// The budget is 200 ms: four rounds of 8 calls (one more may have been
	// handed out as it ended), not the 64 that were asked for.
	if n := lookupCalls.Load(); n < kvLookupWorkers || n > kvLookupBudget.Milliseconds()/50*kvLookupWorkers+kvLookupWorkers {
		t.Fatalf("the lookup made %d KV calls", n)
	}
	// Moderated: what the lookup did not ask for (the oldest segments) and
	// what it asked for too late (the newest); not what it read in time.
	first := segments - kvLookupMax // the first segment the lookup asks for
	if moderated := sent[1]; !strings.Contains(moderated, text(0)) || !strings.Contains(moderated, text(first-1)) ||
		!strings.Contains(moderated, text(segments-1)) || strings.Contains(moderated, text(first)) {
		t.Fatalf("the slow node sent the oldest segment %v, the last one not asked for %v, the newest %v, the first one read %v",
			strings.Contains(moderated, text(0)), strings.Contains(moderated, text(first-1)),
			strings.Contains(moderated, text(segments-1)), strings.Contains(moderated, text(first)))
	}
	if e, n := p.stats.kvErrors.Load()-errs, p.stats.kvTimeouts.Load()-timeouts; e != 0 || n != 1 {
		t.Fatalf("the lookup that ran out of time counted %d kv errors and %d kv timeouts", e, n)
	}
	status := h.Do("GET", "/status", nil, nil)
	if rt := decodeData[Status](t, status).Runtime; rt.KVErrors != errs || rt.KVTimeouts != timeouts+1 || !strings.Contains(string(status.GetBody()), `"kv_timeouts":`) {
		t.Fatalf("runtime = %d kv errors, %d kv timeouts: %s", rt.KVErrors, rt.KVTimeouts, status.GetBody())
	}
	health, err := p.Health(context.Background())
	if err != nil || health.GetMetrics()["kv_timeouts"] != float64(timeouts+1) || health.GetMetrics()["kv_errors"] != float64(errs) {
		t.Fatalf("health metrics = %v, %v", health.GetMetrics(), err)
	}
}

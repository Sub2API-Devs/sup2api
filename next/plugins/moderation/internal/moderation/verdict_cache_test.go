package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
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

// secondNode starts another plugin instance on the database and the KV of fh.
func secondNode(t *testing.T, fh *pluginsdktest.FakeHost, cfg map[string]any) (*Plugin, *pluginsdktest.Harness) {
	t.Helper()
	p2 := New()
	h2 := pluginsdktest.Start(t, p2, pluginsdktest.Options{Host: fh, SDK: sdkOpts(), Config: cfg})
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
	publish := func(name string, group int64, auditors ...int64) {
		t.Helper()
		spec := Spec{SampleRate: 100, Stages: []Stage{{Auditors: auditors, Combine: CombineAny}}}
		spec.ModelFilter.Type = FilterAll
		f := decodeData[FlowView](t, h.Do("POST", "/flows", nil, map[string]any{"name": name, "draft": spec}))
		decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d/groups", f.ID), nil, map[string]any{"groups": []int64{group}}))
		decodeData[FlowView](t, h.Do("POST", fmt.Sprintf("/flows/%d/publish", f.ID), nil, map[string]any{"expected_version": 0}))
	}
	publish("skipped stage", 10, blind)
	publish("one skipped auditor", 11, oai, blind)
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
	spec := Spec{SampleRate: 100, Stages: []Stage{{Auditors: []int64{auditor.ID}, Combine: CombineAny}}}
	spec.ModelFilter.Type = FilterAll
	fb := decodeData[FlowView](t, h.Do("POST", "/flows", nil, map[string]any{"name": "b", "draft": spec}))
	decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d/groups", fb.ID), nil, map[string]any{"groups": []int64{10}}))
	decodeData[FlowView](t, h.Do("POST", fmt.Sprintf("/flows/%d/publish", fb.ID), nil, map[string]any{"expected_version": 0}))
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
	if a, b := fpA(), p.snap.Load().flows[fb.ID].fp; a != b {
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
	for _, m := range fh.Published() {
		if m.Topic == TopicVerdictChanged {
			if err := json.Unmarshal(m.Payload, &told); err != nil {
				t.Fatal(err)
			}
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
	for _, m := range fh.Published() {
		if m.Topic == TopicVerdictChanged {
			if err := h2.Deliver(m.Topic, m.Payload, "node-1"); err != nil {
				t.Fatal(err)
			}
			delivered++
		}
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

// kvFailPlugin gives the plugin a host whose KV fails while fail is set.
type kvFailPlugin struct {
	*Plugin
	fail *atomic.Bool
}

func (w kvFailPlugin) Init(ctx context.Context, h pluginsdk.Host) error {
	return w.Plugin.Init(ctx, kvFailHost{Host: h, fail: w.fail})
}

type kvFailHost struct {
	pluginsdk.Host
	fail *atomic.Bool
}

func (h kvFailHost) KV() pluginsdk.KV { return kvFail{KV: h.Host.KV(), fail: h.fail} }

type kvFail struct {
	pluginsdk.KV
	fail *atomic.Bool
}

var errKVDown = errors.New("kv unavailable")

func (k kvFail) Get(ctx context.Context, ns, key string) ([]byte, bool, error) {
	if k.fail.Load() {
		return nil, false, errKVDown
	}
	return k.KV.Get(ctx, ns, key)
}

func (k kvFail) Set(ctx context.Context, ns, key string, val []byte, ttl time.Duration) error {
	if k.fail.Load() {
		return errKVDown
	}
	return k.KV.Set(ctx, ns, key, val, ttl)
}

// While the KV fails, content is moderated again: a cached pass is not
// trusted and a cached hit is not replayed.
func TestKVFailureAuditsAgain(t *testing.T) {
	mod := newFakeMod(t)
	dsn, schema := pluginsdktest.NewSchema(t, "plg_moderation_t")
	pluginsdktest.ApplyMigrations(t, dsn, schema, "../../migrations")
	fh := pluginsdktest.NewFakeHost()
	fh.SetDSN(dsn, schema)
	fh.Authz = func(int64, string) bool { return false }
	var fail atomic.Bool
	p := New()
	h := pluginsdktest.Start(t, kvFailPlugin{Plugin: p, fail: &fail}, pluginsdktest.Options{Host: fh, SDK: sdkOpts(), Config: map[string]any{"mode": ModeEnforce}})
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
	errs := p.stats.kvErrors.Load()
	if r := mustHook(t, h, hookReq(hit)); !denied(r) || replayed(r) || calls() != 3 {
		t.Fatalf("hit while the KV fails = %+v, calls %d", r, calls())
	}
	if r := mustHook(t, h, hookReq(clean)); denied(r) || r.GetNote() == notePrefix+"pass (cached)" || calls() != 4 {
		t.Fatalf("clean while the KV fails = %+v, calls %d", r, calls())
	}
	if p.stats.kvErrors.Load() == errs {
		t.Fatal("no kv error counted")
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
	id := hitIDOf(hit.Keys)
	if w := hitWrites("e0:1:fp", id, &hit, 0); len(w) != 2 || w[0].key != "h:e0:1:fp:"+id || w[1].key != "s:e0:1:fp:"+hit.Keys[0] || string(w[1].val) != "h"+id {
		t.Fatalf("writes = %+v", w)
	}
	hit.Trace.Stages = []StageTrace{{Outcomes: []Outcome{{Reason: strings.Repeat("x", maxHitBytes)}}}}
	if w := hitWrites("e0:1:fp", id, &hit, 0); w != nil {
		t.Fatalf("an oversized hit was stored: %d writes", len(w))
	}
	// The id does not depend on the order of the segments.
	a, b := [32]byte{1}, [32]byte{2}
	if hitID([][32]byte{a, b}) != hitID([][32]byte{b, a}) || hitID([][32]byte{a}) == hitID([][32]byte{a, b}) || hitIDOf([]string{"zz"}) != "" {
		t.Fatal("hit id")
	}
}

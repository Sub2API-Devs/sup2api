package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"slices"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// A trace holds only the stages that ran, so the deciding stage is an index
// in it and every stage carries its number in the spec.
func TestFallbackDeciderIndexesTheTrace(t *testing.T) {
	pass, fail := Outcome{}, Outcome{Err: fmt.Errorf("boom")}
	one := func(id int64) Stage { return Stage{Auditors: []int64{id}, Combine: CombineAny} }
	spec := &Spec{Stages: []Stage{one(1), one(2), {Auditors: []int64{3}, Combine: CombineAny, Fallback: true}}}
	numbers := func(tr Trace) []int {
		var out []int
		for _, st := range tr.Stages {
			out = append(out, st.Stage)
		}
		return out
	}

	// Stage 1 passes, so stage 2 never runs; the fallback stage (stage 3 of
	// the spec) hits as the second stage of the trace.
	var log auditLog
	tr := runFlow(context.Background(), spec, 5*time.Second, log.wrap(scripted(map[int64]Outcome{1: pass, 2: pass, 3: hit("a", 0.95)}, nil)))
	if tr.Final != Hit || tr.Decider != 1 || stagesOf(tr) != "pass hit+fallback" || !slices.Equal(numbers(tr), []int{1, 3}) ||
		!slices.Equal(log.called(), []int64{1, 3}) {
		t.Fatalf("trace = %+v, called %v", tr, log.called())
	}
	want := []HitCategory{{Category: "a", Score: 0.95, Threshold: 0.5, Stage: 3, Auditor: 3}}
	if got := tr.HitCategories(); !slices.Equal(got, want) {
		t.Fatalf("hit categories = %+v, want %+v", got, want)
	}
	var rec eventRec
	rec.fillFromTrace(tr, true)
	if rec.Result != ResultBlock || rec.HighestCategory != "a" || rec.Severity != "high" {
		t.Fatalf("record = %+v", rec)
	}
	// The stored trace carries the numbers and reads back the same.
	if !strings.Contains(string(rec.Trace), `"stage":3`) || !strings.Contains(string(rec.Trace), `"decider":1`) {
		t.Fatalf("stored trace = %s", rec.Trace)
	}
	var back Trace
	if err := json.Unmarshal(rec.Trace, &back); err != nil || !slices.Equal(back.HitCategories(), want) {
		t.Fatalf("read back: %+v %v", back.HitCategories(), err)
	}

	// Stage 1 hits and stage 2 fails: the hit stands, the fallback stage
	// does not run, and the hits are stage 1's.
	log = auditLog{}
	tr = runFlow(context.Background(), spec, 5*time.Second, log.wrap(scripted(map[int64]Outcome{1: hit("b", 0.8), 2: fail, 3: hit("a", 1)}, nil)))
	if tr.Final != Hit || tr.Decider != 0 || !tr.Errored || stagesOf(tr) != "hit failed" || !slices.Equal(numbers(tr), []int{1, 2}) ||
		!slices.Equal(log.called(), []int64{1, 2}) {
		t.Fatalf("trace = %+v, called %v", tr, log.called())
	}
	if got := tr.HitCategories(); len(got) != 1 || got[0].Stage != 1 || got[0].Category != "b" {
		t.Fatalf("hit categories = %+v", got)
	}
	// When every stage of the chain ran (and failed), the fallback stage is
	// the third stage of the trace as well.
	tr = runFlow(context.Background(), spec, 5*time.Second, scripted(map[int64]Outcome{1: fail, 2: fail, 3: hit("a", 1)}, nil))
	if tr.Final != Hit || tr.Decider != 2 || !slices.Equal(numbers(tr), []int{1, 2, 3}) || tr.HitCategories()[0].Stage != 3 {
		t.Fatalf("trace = %+v", tr)
	}

	// Traces written before stages had a number: the position is the number.
	old := Trace{Final: Hit, Decider: 1, Stages: []StageTrace{{Result: Hit, Outcomes: []Outcome{hit("x", 0.6)}}, {Result: Hit, Outcomes: []Outcome{hit("y", 0.7)}}}}
	if got := old.HitCategories(); len(got) != 1 || got[0].Stage != 2 || got[0].Category != "y" {
		t.Fatalf("old trace: %+v", got)
	}
	// A decider outside the stages (a trace of the first 0.8.0 builds, whose
	// fallback decider was the spec index) never panics: the last stage
	// that hit is shown.
	broken := Trace{Final: Hit, Decider: 2, Stages: []StageTrace{{Result: Pass, Stage: 1}, {Result: Hit, Stage: 3, Fallback: true, Outcomes: []Outcome{hit("a", 0.95)}}}}
	if got := broken.HitCategories(); len(got) != 1 || got[0].Stage != 3 {
		t.Fatalf("out-of-range decider: %+v", got)
	}
	rec = eventRec{}
	rec.fillFromTrace(broken, false)
	if rec.Result != ResultHit || rec.HighestCategory != "a" {
		t.Fatalf("out-of-range decider record = %+v", rec)
	}
	none := Trace{Final: Hit, Decider: 7}
	if got := none.HitCategories(); got != nil {
		t.Fatalf("decider without stages: %+v", got)
	}
}

// flowBuilder creates channels, auditors and flows through the API; one
// channel per type is shared by the flows of a test.
type flowBuilder struct {
	t        *testing.T
	h        *pluginsdktest.Harness
	base     string
	channels map[string]int64
}

func (b *flowBuilder) auditor(typ string) int64 {
	b.t.Helper()
	if b.channels == nil {
		b.channels = map[string]int64{}
	}
	chType := channelTypeOf[typ]
	if b.channels[chType] == 0 {
		ch := decodeData[ChannelView](b.t, b.h.Do("POST", "/channels", nil, map[string]any{"type": chType, "name": chType, "base_url": b.base, "api_key": "key-" + chType}))
		b.channels[chType] = ch.ID
	}
	a := decodeData[AuditorView](b.t, b.h.Do("POST", "/auditors", nil, map[string]any{"name": typ, "type": typ, "channel_id": b.channels[chType]}))
	return a.ID
}

// publish creates the flow of spec, binds it to groups and publishes it.
func (b *flowBuilder) publish(spec Spec, groups ...int64) int64 {
	b.t.Helper()
	if spec.ModelFilter.Type == "" {
		spec.ModelFilter.Type = FilterAll
	}
	spec.SampleRate = 100
	f := decodeData[FlowView](b.t, b.h.Do("POST", "/flows", nil, map[string]any{"name": fmt.Sprintf("f%v", groups), "draft": spec}))
	decodeData[FlowView](b.t, b.h.Do("PUT", fmt.Sprintf("/flows/%d/groups", f.ID), nil, map[string]any{"groups": groups}))
	decodeData[FlowView](b.t, b.h.Do("POST", fmt.Sprintf("/flows/%d/publish", f.ID), nil, map[string]any{"expected_version": 0}))
	return f.ID
}

func stageOf(fallback bool, ids ...int64) Stage {
	return Stage{Auditors: ids, Combine: CombineAny, Fallback: fallback}
}

// A fallback stage that hits after the chain ended early: the request is
// refused (no panic), the record shows the spec stage, and the statistics
// count the stages by their number in the spec.
func TestFallbackStageHitEndToEnd(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	b := &flowBuilder{t: t, h: h, base: mod.srv.URL}
	// Group 9: Jev, Jev, then OpenAI as a fallback stage. "hate" is an
	// OpenAI category only: stage 1 passes (stage 2 never runs) and the
	// fallback stage hits.
	jev1, jev2, oai := b.auditor(AuditorTypeSafe), b.auditor(AuditorTypeSafe), b.auditor(AuditorOpenAI)
	first := b.publish(Spec{Stages: []Stage{stageOf(false, jev1), stageOf(false, jev2), stageOf(true, oai)}}, 9)
	// Group 10: OpenAI, Jev, then OpenAI as a fallback stage. Stage 1 hits,
	// stage 2 fails (JEV-500): the hit stands and the fallback does not run.
	oai1, jev3, oai2 := b.auditor(AuditorOpenAI), b.auditor(AuditorTypeSafe), b.auditor(AuditorOpenAI)
	second := b.publish(Spec{Stages: []Stage{stageOf(false, oai1), stageOf(false, jev3), stageOf(true, oai2)}}, 10)

	r := mustHook(t, h, requestReq("fallback-hit", 9, "MOD-HIT-hate fallback words"))
	if !denied(r) || r.GetDenyCode() != DenyBlocked || !strings.Contains(r.GetNote(), "[hate]") {
		t.Fatalf("fallback hit = %+v", r)
	}
	r = mustHook(t, h, requestReq("failed-review", 10, "MOD-HIT-sexual JEV-500 words"))
	if !denied(r) || r.GetDenyCode() != DenyBlocked {
		t.Fatalf("hit with a failed review stage = %+v", r)
	}

	ev := recordOf(t, h, "fallback-hit")
	tr := traceOf(t, ev)
	if ev.Result != ResultBlock || tr.Decider != 1 || len(tr.Stages) != 2 || tr.Stages[0].Stage != 1 || tr.Stages[1].Stage != 3 || !tr.Stages[1].Fallback {
		t.Fatalf("record %s, trace %s", ev.Result, ev.Trace)
	}
	// The analysis tools show the stage of the spec as well.
	tc := &toolCtx{p: p, snap: p.snap.Load()}
	rec := tc.recordOf(&toolRow{ID: ev.ID, Trace: ev.Trace}, 100, true)
	if len(rec.Stages) != 2 || rec.Stages[0].Stage != 1 || rec.Stages[1].Stage != 3 || rec.Stages[1].Role != stageRoleNames[RoleFallback] ||
		len(rec.Stages[1].Hits) != 1 || rec.Stages[1].Hits[0].Stage != 3 || len(rec.HitCategories) != 1 || rec.HitCategories[0].Stage != 3 {
		t.Fatalf("tool record = %+v", rec)
	}
	ev = recordOf(t, h, "failed-review")
	tr = traceOf(t, ev)
	if ev.Result != ResultBlock || tr.Decider != 0 || !tr.Errored || len(tr.Stages) != 2 || tr.Stages[1].Stage != 2 || !tr.Stages[1].Failed {
		t.Fatalf("record %s, trace %s", ev.Result, ev.Trace)
	}

	// The test route runs the same flow without a panic.
	res := decodeData[TestResult](t, h.Do("POST", "/test", nil, map[string]any{"text": "MOD-HIT-hate once more", "flow_id": first}))
	if res.Result != ResultHit || len(res.Categories) != 1 || res.Categories[0].Stage != 3 || res.Categories[0].Auditor != oai {
		t.Fatalf("test result = %+v", res)
	}

	// Funnel rows by spec stage: flow 1 has stages 1 and 3 (2 never ran),
	// flow 2 has stages 1 and 2.
	st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	funnel := map[int64]map[int]FunnelStage{}
	for _, f := range st.Funnels {
		funnel[f.FlowID] = map[int]FunnelStage{}
		for _, fs := range f.Stages {
			funnel[f.FlowID][fs.Stage] = fs
		}
	}
	if f := funnel[first]; len(f) != 2 || f[1].Received != 1 || f[1].Hit != 0 || f[3].Received != 1 || f[3].Hit != 1 {
		t.Fatalf("funnel of the fallback flow = %+v", f)
	}
	if f := funnel[second]; len(f) != 2 || f[1].Received != 1 || f[1].Hit != 1 || f[2].Received != 1 || f[2].Hit != 0 {
		t.Fatalf("funnel of the failed-review flow = %+v", f)
	}
	// The auditor rows are on the same stages: the fallback auditor on 3.
	trend := decodeData[TrendResult](t, h.Do("GET", "/stats/trend", map[string]string{"granularity": "hour"}, nil))
	stages := map[int64]int{}
	for _, at := range trend.Auditors {
		stages[at.AuditorID] = at.Stage
	}
	if stages[jev1] != 1 || stages[oai] != 3 || stages[oai1] != 1 || stages[jev3] != 2 || stages[jev2] != 0 || stages[oai2] != 0 {
		t.Fatalf("auditor rows by stage = %v", stages)
	}
}

// A panic while a queued job runs or is recorded does not end the plugin
// process: the job is recorded as an error and the workers go on.
func TestPostWorkerSurvivesPanic(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "record_pass": true, "record_errors": true})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	snap := p.snap.Load()
	m := &moderation{cfg: p.cfg.Load(), flow: snap.flows[flow], snap: snap, timing: TimingPost, queued: p.now(),
		chunks: []*chunk{nil}, // running it panics outside the flow's own recover
		rec: eventRec{At: p.now().UTC(), RequestID: "panics", UserID: 3, GroupID: 9, Timing: TimingPost, FlowID: flow, FlowVersion: 1,
			Protocol: "anthropic.messages", Mode: ModeObserve}}
	if !p.enqueue(m) {
		t.Fatal("job not queued")
	}
	ev := recordOf(t, h, "panics")
	if tr := traceOf(t, ev); ev.Result != ResultError || !tr.Errored || tr.Final != Pass {
		t.Fatalf("record of the panicked job = %s %s", ev.Result, ev.Trace)
	}
	// The workers still moderate, and the run was counted once.
	mustHook(t, h, hookReqAs(3, "after", "MOD-HIT-sexual after the panic"))
	if ev := recordOf(t, h, "after"); ev.Result != ResultHit {
		t.Fatalf("record after the panic = %s", ev.Result)
	}
	st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	if st.Today.Errors != 1 || st.Today.Audited != 2 {
		t.Fatalf("today = %+v", st.Today)
	}
	// A background task that panics is contained as well.
	done := make(chan struct{})
	p.goTracked(func() {
		defer close(done)
		panic("boom")
	})
	<-done
	mustHook(t, h, hookReqAs(3, "after-task", "clean text after the task"))
	recordOf(t, h, "after-task")
}

// GET /bindings reports a binding as inactive when this node does not run
// its flow, also for a published and enabled flow whose spec it cannot read.
func TestBindingInactiveFollowsSnapshot(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	inactive := func() bool {
		t.Helper()
		v := decodeData[BindingsView](t, h.Do("GET", "/bindings", nil, nil))
		if len(v.Bindings) != 1 || v.Bindings[0].FlowID != flow || v.Bindings[0].GroupID != 9 {
			t.Fatalf("bindings = %+v", v.Bindings)
		}
		return v.Bindings[0].Inactive
	}
	if inactive() {
		t.Fatal("binding to a running flow is inactive")
	}
	if r := mustHook(t, h, hookReq("MOD-HIT-sexual words")); !denied(r) {
		t.Fatalf("not moderated: %+v", r)
	}
	// The published spec has a field this version does not know: the flow
	// is dropped from the snapshot (still published and enabled in the
	// table), the request is not moderated and the binding says so.
	ctx := context.Background()
	db, _ := p.db(ctx)
	if _, err := db.Exec(ctx, `UPDATE flows SET published = published || '{"from_a_later_version": 1}'::jsonb WHERE id = $1`, flow); err != nil {
		t.Fatal(err)
	}
	if err := p.reloadConfig(ctx); err != nil {
		t.Fatal(err)
	}
	if p.snap.Load().flows[flow] != nil {
		t.Fatal("the flow with an unreadable spec is still in the snapshot")
	}
	if r := mustHook(t, h, hookReq("MOD-HIT-sexual words again")); denied(r) {
		t.Fatalf("moderated by a flow that is not running: %+v", r)
	}
	if !inactive() {
		t.Fatal("binding to a flow the node does not run is reported active")
	}
}

// For a day after the conversion, automatic observe entries added since (by
// nodes still on 0.7.x) are converted too; after it never again.
func TestParityConversionWindow(t *testing.T) {
	ctx := context.Background()
	var offset atomic.Int64
	clock := func() time.Time { return time.Now().Add(time.Duration(offset.Load())) }
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce}, func(p *Plugin) { p.now = clock })
	waitFor(t, "conversion at start", p.parityDone.Load)
	db, _ := p.db(ctx)
	var at *time.Time
	if err := db.QueryRow(ctx, `SELECT parity_converted_at FROM config_state WHERE id = 1 AND parity_converted`).Scan(&at); err != nil || at == nil ||
		time.Since(*at) > time.Minute {
		t.Fatalf("conversion time = %v (%v)", at, err)
	}
	levels := func() string {
		t.Helper()
		rows, err := db.Query(ctx, `SELECT user_id || ':' || level FROM watchlist ORDER BY user_id`)
		if err != nil {
			t.Fatal(err)
		}
		list, err := pgx.CollectRows(rows, pgx.RowTo[string])
		if err != nil {
			t.Fatal(err)
		}
		return strings.Join(list, " ")
	}
	add := func(rows string) {
		t.Helper()
		if _, err := db.Exec(ctx, `INSERT INTO watchlist (user_id, level, source, since_at, expires_at) VALUES `+rows); err != nil {
			t.Fatal(err)
		}
	}
	// What a 0.7.x node adds after the conversion (31), an administrator's
	// observe entry (32), an automatic entry from before the conversion
	// (33, left alone by a first run under mode = observe) and an expired
	// one (34).
	add(`(31, 'observe', 'auto', now(), now() + interval '5 days'),
		(32, 'observe', 'manual', now(), now() + interval '5 days'),
		(33, 'observe', 'auto', now() - interval '1 hour', now() + interval '5 days'),
		(34, 'observe', 'auto', now(), now() - interval '1 second')`)
	// Under mode = observe nothing is converted.
	if errs := h.Configure(map[string]any{"mode": ModeObserve}, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	p.convertParityOnce(ctx)
	if got := levels(); got != "31:observe 32:observe 33:observe 34:observe" {
		t.Fatalf("mode observe converted: %s", got)
	}
	if errs := h.Configure(map[string]any{"mode": ModeEnforce}, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	// The loop converts it without a restart (parityDone stays set).
	if !p.parityDone.Load() {
		t.Fatal("parityDone cleared")
	}
	p.convertParityOnce(ctx)
	p.convertParityOnce(ctx)
	if got := levels(); got != "31:enforce 32:observe 33:observe 34:observe" {
		t.Fatalf("in the window: %s", got)
	}
	ev := decodeData[[]WatchEvent](t, h.Do("GET", "/watchlist/31/events", nil, nil))
	if len(ev) != 1 || ev[0].Action != "set_level" || ev[0].ToLevel != LevelEnforce || ev[0].Reason != parityReason || ev[0].OperatorID != nil {
		t.Fatalf("history of user 31 = %+v", ev)
	}
	waitFor(t, "the new level in the hook", func() bool { return p.watchLevel(31) == LevelEnforce })
	// Still inside the day, 23 hours later.
	offset.Store(int64(23 * time.Hour))
	add(`(35, 'observe', 'auto', now() + interval '23 hours', now() + interval '5 days')`)
	p.convertParityOnce(ctx)
	if got := levels(); !strings.Contains(got, "35:enforce") {
		t.Fatalf("after 23 hours: %s", got)
	}
	// After the day: nothing more, on this run or after a restart, and the
	// loop no longer asks the database.
	offset.Store(int64(25 * time.Hour))
	add(`(36, 'observe', 'auto', now() + interval '25 hours', now() + interval '5 days')`)
	p.convertParityOnce(ctx)
	p.parityDone.Store(false)
	p.convertParityOnce(ctx)
	if got := levels(); !strings.Contains(got, "36:observe") || !p.parityDone.Load() {
		t.Fatalf("after 25 hours: %s", got)
	}
	if _, err := db.Exec(ctx, `UPDATE config_state SET parity_converted_at = now() + interval '30 hours' WHERE id = 1`); err != nil {
		t.Fatal(err)
	}
	p.convertParityOnce(ctx) // would convert 36 if it read the new time
	if got := levels(); !strings.Contains(got, "36:observe") {
		t.Fatalf("the finished conversion ran again: %s", got)
	}
}

// The conversion takes its locks in the order of every other watch change
// (the user's lock and entry, then config_state): a change in progress on an
// entry it wants is waited for, not deadlocked with.
func TestParityConversionLockOrder(t *testing.T) {
	ctx := context.Background()
	p, _, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	waitFor(t, "conversion at start", p.parityDone.Load)
	db, _ := p.db(ctx)
	if _, err := db.Exec(ctx, `INSERT INTO watchlist (user_id, level, source, expires_at) VALUES (41, 'observe', 'auto', now() + interval '5 days')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `UPDATE config_state SET parity_converted = false, parity_converted_at = NULL WHERE id = 1`); err != nil {
		t.Fatal(err)
	}
	// A watch change of user 41 in progress, as writeWatch does it: the
	// user's lock, the entry, and config_state last.
	tx, err := db.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := lockBlockSubject(ctx, tx, 41); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `UPDATE watchlist SET note = 'in progress' WHERE user_id = 41`); err != nil {
		t.Fatal(err)
	}
	p.parityDone.Store(false)
	converted := make(chan struct{})
	go func() {
		defer close(converted)
		p.convertParityOnce(ctx)
	}()
	select {
	case <-converted:
		t.Fatal("the conversion did not wait for the change in progress")
	case <-time.After(500 * time.Millisecond):
	}
	// The change reaches config_state at once: the conversion does not hold
	// it while it waits for the entry.
	bctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	begin := time.Now()
	if err := bumpWatch(bctx, tx); err != nil {
		t.Fatalf("the watch change could not finish: %v", err)
	}
	if took := time.Since(begin); took > 700*time.Millisecond {
		t.Fatalf("the watch change waited %s for config_state", took)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	select {
	case <-converted:
	case <-time.After(10 * time.Second):
		t.Fatal("the conversion did not finish")
	}
	var level, note string
	var done bool
	if err := db.QueryRow(ctx, `SELECT w.level, w.note, s.parity_converted FROM watchlist w, config_state s WHERE w.user_id = 41 AND s.id = 1`).Scan(&level, &note, &done); err != nil ||
		level != LevelEnforce || note != "in progress" || !done || !p.parityDone.Load() {
		t.Fatalf("entry = %s %q, converted = %v (%v)", level, note, done, err)
	}
}

// The raw input message of a request is built only for a record that is
// written: a pass without a record costs none of it.
func TestFinishBuildsInputMessageOnlyForRecords(t *testing.T) {
	mod := newFakeMod(t)
	settings := func(recordPass bool) map[string]any {
		return map[string]any{"mode": ModeEnforce, "store_text": true, "record_pass_input_message": true, "record_pass": recordPass}
	}
	p, h, _ := startDB(t, nil, settings(false))
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	// One user message with a 3 MiB inline image, different for each request
	// (the first one's pass is cached).
	const imgSize = 4 << 20 // of base64
	admit := func(rid string) *moderation {
		t.Helper()
		data := make([]byte, imgSize/4*3)
		copy(data, rid)
		img := b64(data)
		msgs, _ := json.Marshal([]any{map[string]any{"role": "user", "content": []any{
			map[string]any{"type": "text", "text": "a harmless picture for " + rid},
			map[string]any{"type": "image", "source": map[string]any{"type": "base64", "media_type": "image/png", "data": img}},
		}}})
		in := hookReqAs(3, rid, "")
		in.Fields[FieldMessages] = string(msgs)
		snap := p.snap.Load()
		m, early := p.admit(p.cfg.Load(), in, snap, snap.flows[flow])
		if early != nil || len(m.chunks) != 1 || len(m.chunks[0].in.Images) != 1 {
			t.Fatalf("admit = %+v, %+v", m, early)
		}
		if got := len(m.chunks[0].messages()); got < imgSize {
			t.Fatalf("input message of %d bytes for an image of %d", got, imgSize)
		}
		return m
	}
	pass := Trace{Final: Pass, Decider: -1, Stages: []StageTrace{{Stage: 1, Result: Pass}}}
	allocated := func(fn func()) uint64 {
		var before, after runtime.MemStats
		runtime.GC()
		runtime.ReadMemStats(&before)
		fn()
		runtime.ReadMemStats(&after)
		return after.TotalAlloc - before.TotalAlloc
	}
	m := admit("no-record")
	if got := allocated(func() { p.finish(m, pass, []Trace{pass}, false) }); got > imgSize/4 {
		t.Fatalf("finishing a pass without a record allocated %d KiB (the image is %d KiB)", got>>10, imgSize>>10)
	}
	// With the record on, the same pass keeps its input message.
	if errs := h.Configure(settings(true), nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	m = admit("with-record")
	p.finish(m, pass, []Trace{pass}, false)
	ev := recordOf(t, h, "with-record")
	if ev.Result != ResultPass || ev.InputMessageSize < imgSize {
		t.Fatalf("record = %s with an input message of %d bytes", ev.Result, ev.InputMessageSize)
	}
	if list := decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"request_id": "no-record"}, nil)); len(list) != 0 {
		t.Fatalf("a pass was recorded with record_pass off: %+v", list)
	}
}

// The user id lists take ids of up to 18 digits in the form, and the decoder
// reports what it drops.
func TestUserIDListsPatternAndDrops(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "forms", "settings.schema.json"))
	if err != nil {
		t.Fatal(err)
	}
	var schema struct {
		Properties map[string]struct {
			Items struct {
				Pattern string `json:"pattern"`
			} `json:"items"`
		} `json:"properties"`
	}
	if err := json.Unmarshal(raw, &schema); err != nil {
		t.Fatal(err)
	}
	const long = "12345678901234567890" // 20 digits: no int64
	for _, key := range []string{"allowlist_user_ids", "blocklist_user_ids", "exempt_user_ids"} {
		pattern := schema.Properties[key].Items.Pattern
		re, err := regexp.Compile(pattern)
		if err != nil || pattern == "" {
			t.Fatalf("%s: pattern %q: %v", key, pattern, err)
		}
		if re.MatchString(long) || re.MatchString("1234567890123456789") || !re.MatchString("123456789012345678") || !re.MatchString("7") ||
			re.MatchString("") || re.MatchString("-7") {
			t.Errorf("%s: pattern %q does not take exactly 1 to 18 digits", key, pattern)
		}
	}
	// Whatever reaches the decoder all the same is dropped and counted.
	s, err := DecodeSettings([]byte(`{"allowlist_user_ids": ["8", "` + long + `", "x"], "blocklist_user_ids": ["` + long + `", "9"], "exempt_user_ids": ["` + long + `"]}`))
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(s.AllowlistUserIDs, []string{"8"}) || !slices.Equal(s.BlocklistUserIDs, []string{"9"}) ||
		fmt.Sprint(s.droppedIDs) != fmt.Sprint(map[string]int{"allowlist_user_ids": 2, "blocklist_user_ids": 1}) {
		t.Fatalf("lists = %v %v, dropped = %v", s.AllowlistUserIDs, s.BlocklistUserIDs, s.droppedIDs)
	}
	// The retired list counts while it is the allowlist.
	s, err = DecodeSettings([]byte(`{"exempt_user_ids": ["8", "` + long + `"]}`))
	if err != nil || !slices.Equal(s.AllowlistUserIDs, []string{"8"}) || s.droppedIDs["exempt_user_ids"] != 1 {
		t.Fatalf("retired list: %v, dropped = %v (%v)", s.AllowlistUserIDs, s.droppedIDs, err)
	}
	if s, err = DecodeSettings([]byte(`{"allowlist_user_ids": ["8"], "blocklist_user_ids": []}`)); err != nil || s.droppedIDs != nil {
		t.Fatalf("clean lists: dropped = %v (%v)", s.droppedIDs, err)
	}
}

// The status counts enforce-level entries with new hits: under the default
// level enforce that is where users with new hits are.
func TestStatusBlockingWithNew(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 5, "level": LevelObserve}))
	decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 6, "level": LevelEnforce}))
	waitFor(t, "watch entries in the hook", func() bool { return p.watchLevel(5) == LevelObserve && p.watchLevel(6) == LevelEnforce })
	counts := func() WatchCounts {
		t.Helper()
		return decodeData[Status](t, h.Do("GET", "/status", nil, nil)).Watch
	}
	if got := counts(); got != (WatchCounts{Watching: 1, Blocking: 1}) {
		t.Fatalf("before the hits: %+v", got)
	}
	// User 3 joins at enforce with the hit, user 6 is refused, user 5 hits
	// at the observe level.
	for _, uid := range []int64{3, 6, 5} {
		mustHook(t, h, hookReqAs(uid, "", fmt.Sprintf("MOD-HIT-sexual by user %d", uid)))
	}
	want := WatchCounts{Watching: 1, WatchingWithNew: 1, Blocking: 2, BlockingWithNew: 2}
	waitFor(t, "the hits on the watch list", func() bool { return counts() == want })
	// Seen entries leave the count.
	if resp := h.Do("POST", "/watchlist/3/seen", nil, nil); resp.GetStatus() != http.StatusOK {
		t.Fatalf("mark seen: %d %s", resp.GetStatus(), resp.GetBody())
	}
	want.BlockingWithNew = 1
	if got := counts(); got != want {
		t.Fatalf("after marking user 3 seen: %+v, want %+v", got, want)
	}
	var raw struct {
		Data struct {
			Watch map[string]int64 `json:"watch"`
		} `json:"data"`
	}
	if err := json.Unmarshal(h.Do("GET", "/status", nil, nil).GetBody(), &raw); err != nil || raw.Data.Watch["blocking_with_new"] != 1 {
		t.Fatalf("status JSON watch = %v (%v)", raw.Data.Watch, err)
	}
}

// The alert state of a flow stays in the KV namespace 0.7.x used, so an
// alert that is going on during an upgrade does not fire again.
func TestAlertStateKeepsItsNamespace(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	ctx := context.Background()
	if alertNamespace != "pass" || alertNamespace == kvNamespace {
		t.Fatalf("alert namespace %q (verdict cache: %q)", alertNamespace, kvNamespace)
	}
	// A 0.7.x node alerted for the flow.
	if err := p.host.KV().Set(ctx, "pass", alertKey(flow), []byte{1}, time.Hour); err != nil {
		t.Fatal(err)
	}
	if was, err := p.alerted(ctx, flow); err != nil || !was {
		t.Fatalf("alert state of 0.7.x not seen: %v %v", was, err)
	}
	// Still over the threshold after the upgrade: no second notice.
	for i := range minAlertSamples {
		mustHook(t, h, hookReqAs(3, "", fmt.Sprintf("MOD-500 %d", i)))
	}
	waitFor(t, "errors counted", func() bool {
		return decodeData[Status](t, h.Do("GET", "/status", nil, nil)).Today.Errors == minAlertSamples
	})
	resp, err := p.RunJob(ctx, &pluginv1.RunJobRequest{JobId: JobAlerts})
	if err != nil || !strings.Contains(resp.GetMessage(), " 0 alerts") {
		t.Fatalf("alert job = %q %v", resp.GetMessage(), err)
	}
	// The state is written where the other versions read it.
	p.setAlerted(ctx, flow, false)
	if _, found, err := p.host.KV().Get(ctx, "pass", alertKey(flow)); err != nil || found {
		t.Fatalf("alert state not cleared in the shared namespace: %v %v", found, err)
	}
	p.setAlerted(ctx, flow, true)
	if _, found, _ := p.host.KV().Get(ctx, "pass", alertKey(flow)); !found {
		t.Fatal("alert state not written to the shared namespace")
	}
	if _, found, _ := p.host.KV().Get(ctx, kvNamespace, alertKey(flow)); found {
		t.Fatal("alert state written to the verdict cache namespace")
	}
}

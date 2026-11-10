package moderation

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"image"
	"image/png"
	"maps"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestSampled(t *testing.T) {
	var h [32]byte
	if !sampled(h, 100) || sampled(h, 0) {
		t.Fatal("bounds")
	}
	n := 0
	for i := 0; i < 1000; i++ {
		h[0], h[1] = byte(i), byte(i>>8)
		h[7] = byte(i * 31)
		if sampled(h, 30) {
			n++
		}
	}
	if n < 200 || n > 400 {
		t.Fatalf("30%% sampled %d of 1000", n)
	}
}

// outcomes scripts a flow run: auditor id -> outcome (with optional delay).
func scripted(out map[int64]Outcome, delay map[int64]time.Duration) auditFunc {
	return func(ctx context.Context, id int64, _ []HitCategory) Outcome {
		if d := delay[id]; d > 0 {
			select {
			case <-time.After(d):
			case <-ctx.Done():
				return Outcome{AuditorID: id, Err: context.Canceled}
			}
		}
		o := out[id]
		o.AuditorID = id
		return o
	}
}

// auditLog records the auditors a run called and the prior hits each got.
type auditLog struct {
	mu    sync.Mutex
	prior map[int64][]HitCategory
}

func (l *auditLog) wrap(audit auditFunc) auditFunc {
	return func(ctx context.Context, id int64, prior []HitCategory) Outcome {
		l.mu.Lock()
		if l.prior == nil {
			l.prior = map[int64][]HitCategory{}
		}
		l.prior[id] = prior
		l.mu.Unlock()
		return audit(ctx, id, prior)
	}
}

// called lists the auditors that were called, in id order.
func (l *auditLog) called() []int64 {
	l.mu.Lock()
	defer l.mu.Unlock()
	return slices.Sorted(maps.Keys(l.prior))
}

func hit(cat string, score float64) Outcome {
	return Outcome{Hit: true, Hits: []HitCategory{{Category: cat, Score: score, Threshold: 0.5}}}
}

// stagesOf renders the executed stages: "hit failed pass+fallback".
func stagesOf(tr Trace) string {
	parts := make([]string, 0, len(tr.Stages))
	for _, st := range tr.Stages {
		s := st.Result
		switch {
		case st.Failed && (st.Result != Skip || !st.Errored || st.Skipped):
			s = "bad-failed"
		case st.Failed:
			s = "failed"
		}
		if st.Fallback {
			s += "+fallback"
		}
		parts = append(parts, s)
	}
	return strings.Join(parts, " ")
}

func TestRunFlow(t *testing.T) {
	pass, skip, fail := Outcome{}, Outcome{Skipped: true}, Outcome{Err: errors.New("boom")}
	spec := func(stages ...Stage) *Spec { return &Spec{Stages: stages} }
	st := func(combine string, n int, ids ...int64) Stage { return Stage{Auditors: ids, Combine: combine, N: n} }
	fb := func(ids ...int64) Stage { return Stage{Auditors: ids, Combine: CombineAny, Fallback: true} }
	one := func(id int64) Stage { return st("any", 0, id) }
	for _, tc := range []struct {
		name       string
		spec       *Spec
		out        map[int64]Outcome
		final      string
		decider    int
		overturned bool
		errored    bool
		skipped    bool
		stages     string // stagesOf
		verdict    string
		called     []int64
	}{
		{"any hit", spec(st("any", 0, 1, 2)), map[int64]Outcome{1: pass, 2: hit("sexual", 0.95)}, Hit, 0, false, false, false, "hit", ResultHit, nil},
		{"all needs both", spec(st("all", 0, 1, 2)), map[int64]Outcome{1: pass, 2: hit("sexual", 0.95)}, Pass, -1, false, false, false, "pass", ResultPass, nil},
		{"at_least 2 of 3", spec(st("at_least", 2, 1, 2, 3)), map[int64]Outcome{1: hit("a", 0.8), 2: pass, 3: hit("b", 0.9)}, Hit, 0, false, false, false, "hit", ResultHit, nil},
		{"second stage overturns", spec(one(1), one(2)), map[int64]Outcome{1: hit("a", 0.8), 2: pass}, Pass, -1, true, false, false, "hit pass", ResultOverturned, nil},
		{"both stages hit", spec(one(1), one(2)), map[int64]Outcome{1: hit("a", 0.8), 2: hit("a", 0.99)}, Hit, 1, false, false, false, "hit hit", ResultHit, nil},
		{"first stage skipped", spec(one(1), one(2)), map[int64]Outcome{1: skip, 2: hit("a", 1)}, Pass, -1, false, false, true, "skipped", ResultPass, []int64{1}},
		{"later skip keeps hit", spec(one(1), one(2)), map[int64]Outcome{1: hit("a", 0.7), 2: skip}, Hit, 0, false, false, false, "hit skipped", ResultHit, nil},
		{"all ignores skipped", spec(st("all", 0, 1, 2)), map[int64]Outcome{1: hit("a", 0.7), 2: skip}, Hit, 0, false, false, false, "hit", ResultHit, nil},
		// A stage that is skipped by some auditors and errors in the others
		// has no decision: it failed, it is not skipped.
		{"errors and skips fail the stage", spec(st("any", 0, 1, 2)), map[int64]Outcome{1: skip, 2: fail}, Pass, -1, false, true, false, "failed", ResultError, nil},

		{"failed stage is passed over, earlier hit stands", spec(one(1), st("any", 0, 2, 3)), map[int64]Outcome{1: hit("a", 0.8), 2: fail, 3: fail}, Hit, 0, false, true, false, "hit failed", ResultHit, nil},
		{"failed first stage, second reviews as first", spec(one(1), one(2)), map[int64]Outcome{1: fail, 2: pass}, Pass, -1, false, true, false, "failed pass", ResultPass, nil},
		{"failed first stage, second hits", spec(one(1), one(2)), map[int64]Outcome{1: fail, 2: hit("a", 0.8)}, Hit, 1, false, true, false, "failed hit", ResultHit, nil},
		{"every stage failed is an error", spec(one(1), one(2)), map[int64]Outcome{1: fail, 2: fail}, Pass, -1, false, true, false, "failed failed", ResultError, []int64{1, 2}},
		{"errored auditor leaves the denominator", spec(st("all", 0, 1, 2)), map[int64]Outcome{1: fail, 2: hit("a", 0.8)}, Hit, 0, false, true, false, "hit", ResultHit, nil},
		{"at_least 2 of 3, one errors one hits one passes", spec(st("at_least", 2, 1, 2, 3)), map[int64]Outcome{1: fail, 2: hit("a", 0.8), 3: pass}, Pass, -1, false, true, false, "pass", ResultPass, nil},

		{"fallback runs after a pass", spec(one(1), fb(2)), map[int64]Outcome{1: pass, 2: hit("a", 0.8)}, Hit, 1, false, false, false, "pass hit+fallback", ResultHit, []int64{1, 2}},
		{"fallback that passes keeps the pass", spec(one(1), fb(2)), map[int64]Outcome{1: pass, 2: pass}, Pass, -1, false, false, false, "pass pass+fallback", ResultPass, []int64{1, 2}},
		{"fallback does not run after an overturn", spec(one(1), one(2), fb(3)), map[int64]Outcome{1: hit("a", 0.8), 2: pass, 3: hit("a", 1)}, Pass, -1, true, false, false, "hit pass", ResultOverturned, []int64{1, 2}},
		{"fallback does not run after a hit", spec(one(1), fb(2)), map[int64]Outcome{1: hit("a", 0.8), 2: pass}, Hit, 0, false, false, false, "hit", ResultHit, []int64{1}},
		{"fallback runs when nothing judged", spec(one(1), fb(2)), map[int64]Outcome{1: fail, 2: hit("a", 0.8)}, Hit, 1, false, true, false, "failed hit+fallback", ResultHit, []int64{1, 2}},
		{"first fallback hit ends the run", spec(one(1), fb(2), fb(3)), map[int64]Outcome{1: pass, 2: hit("a", 0.8), 3: hit("b", 1)}, Hit, 1, false, false, false, "pass hit+fallback", ResultHit, []int64{1, 2}},
		{"failed fallback is passed over", spec(one(1), fb(2), fb(3)), map[int64]Outcome{1: pass, 2: fail, 3: hit("b", 1)}, Hit, 2, false, true, false, "pass failed+fallback hit+fallback", ResultHit, []int64{1, 2, 3}},
		{"skipped first stage skips the fallback too", spec(one(1), fb(2)), map[int64]Outcome{1: skip, 2: hit("a", 1)}, Pass, -1, false, false, true, "skipped", ResultPass, []int64{1}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var log auditLog
			tr := runFlow(context.Background(), tc.spec, 5*time.Second, log.wrap(scripted(tc.out, nil)))
			if tr.Final != tc.final || tr.Decider != tc.decider || tr.Overturned != tc.overturned || tr.Errored != tc.errored || tr.Skipped != tc.skipped {
				t.Fatalf("trace = %+v", tr)
			}
			if got := stagesOf(tr); got != tc.stages {
				t.Fatalf("stages = %q, want %q", got, tc.stages)
			}
			if got := tr.verdict(); got != tc.verdict {
				t.Fatalf("verdict = %s, want %s", got, tc.verdict)
			}
			if tc.called != nil && !slices.Equal(log.called(), tc.called) {
				t.Fatalf("called = %v, want %v", log.called(), tc.called)
			}
		})
	}
	// The deciding stage's hits, best first; severity from the top score.
	tr := runFlow(context.Background(), spec(st("any", 0, 1), st("all", 0, 2, 3)),
		5*time.Second, scripted(map[int64]Outcome{1: hit("a", 0.6), 2: hit("b", 0.75), 3: hit("c", 0.95)}, nil))
	var rec eventRec
	rec.fillFromTrace(tr, true)
	if rec.Result != ResultBlock || rec.HighestCategory != "c" || rec.Severity != "high" || strings.Join(rec.HitCategories, ",") != "c,b" {
		t.Fatalf("rec = %+v", rec)
	}
	// A later stage that errors after a hit leaves the hit standing: the
	// record is the first stage's hit, not an error or an overturn.
	tr = runFlow(context.Background(), spec(one(1), one(2)), 5*time.Second, scripted(map[int64]Outcome{1: hit("a", 0.8), 2: fail}, nil))
	rec = eventRec{}
	rec.fillFromTrace(tr, false)
	if rec.Result != ResultHit || rec.HighestCategory != "a" || !tr.Errored || !tr.keepsMessage() {
		t.Fatalf("errored second stage = %s (%+v)", rec.Result, tr)
	}
	// Timeout: the slow auditor never decides, the stage fails and the run
	// is an error that passes.
	start := time.Now()
	tr = runFlow(context.Background(), spec(one(1)), 100*time.Millisecond, scripted(map[int64]Outcome{1: hit("a", 1)}, map[int64]time.Duration{1: time.Second}))
	if tr.Final != Pass || !tr.Errored || stagesOf(tr) != "failed" || tr.verdict() != ResultError || time.Since(start) > 900*time.Millisecond {
		t.Fatalf("timeout trace = %+v", tr)
	}
	// any decides at the first hit without waiting for the slow one.
	start = time.Now()
	tr = runFlow(context.Background(), spec(st("any", 0, 1, 2)), 5*time.Second, scripted(map[int64]Outcome{1: hit("a", 1), 2: pass}, map[int64]time.Duration{2: 2 * time.Second}))
	if tr.Final != Hit || time.Since(start) > time.Second {
		t.Fatalf("early decision trace = %+v", tr)
	}

	t.Run("total timeout keeps the hit", func(t *testing.T) {
		// Stage 1 hits, the total timeout expires in stage 2: stage 2 fails,
		// stage 3 and the fallback stage are never started, the hit stands.
		var log auditLog
		start := time.Now()
		tr := runFlow(context.Background(), spec(one(1), one(2), one(3), fb(4)), 100*time.Millisecond,
			log.wrap(scripted(map[int64]Outcome{1: hit("a", 0.8), 2: pass, 3: pass, 4: pass}, map[int64]time.Duration{2: 5 * time.Second})))
		if tr.Final != Hit || tr.Decider != 0 || tr.Overturned || !tr.Errored || stagesOf(tr) != "hit failed" || tr.verdict() != ResultHit {
			t.Fatalf("trace = %+v", tr)
		}
		if !slices.Equal(log.called(), []int64{1, 2}) || time.Since(start) > 2*time.Second {
			t.Fatalf("called = %v after %s", log.called(), time.Since(start))
		}
	})
	t.Run("a run canceled between stages keeps the hit", func(t *testing.T) {
		// The context ends while stage 1 returns its hit: whichever the
		// stage sees first, stage 2 is never started.
		for range 20 {
			ctx, cancel := context.WithCancel(context.Background())
			var log auditLog
			tr := runFlow(ctx, spec(one(1), one(2)), 5*time.Second, log.wrap(func(_ context.Context, id int64, _ []HitCategory) Outcome {
				cancel()
				o := hit("a", 0.8)
				o.AuditorID = id
				return o
			}))
			if !slices.Equal(log.called(), []int64{1}) || !tr.Errored || tr.Overturned {
				t.Fatalf("called = %v, trace = %+v", log.called(), tr)
			}
			// Either the hit was seen (and stands) or the stage failed.
			if got := stagesOf(tr); (got != "hit" || tr.Final != Hit || tr.Decider != 0) && (got != "failed" || tr.verdict() != ResultError) {
				t.Fatalf("trace = %+v", tr)
			}
		}
	})
	t.Run("a canceled run starts nothing", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		var log auditLog
		tr := runFlow(ctx, spec(one(1), fb(2)), 5*time.Second, log.wrap(scripted(map[int64]Outcome{1: hit("a", 1), 2: hit("a", 1)}, nil)))
		if tr.Final != Pass || !tr.Errored || len(tr.Stages) != 0 || tr.verdict() != ResultError || len(log.called()) != 0 {
			t.Fatalf("trace = %+v, called = %v", tr, log.called())
		}
	})
	t.Run("prior hits reach later stages only", func(t *testing.T) {
		// Stage 1 hits a and b, stage 2 hits c, stage 3 passes: an overturn,
		// so the fallback stage does not run.
		var log auditLog
		out := map[int64]Outcome{
			1: {Hit: true, Hits: []HitCategory{{Category: "a", Score: 0.6, Threshold: 0.5}, {Category: "b", Score: 0.9, Threshold: 0.5}}},
			2: hit("a", 0.7), 3: hit("c", 0.8), 4: pass,
		}
		tr := runFlow(context.Background(), spec(one(1), one(3), one(4), fb(5)), 5*time.Second, log.wrap(scripted(out, nil)))
		if tr.verdict() != ResultOverturned || !slices.Equal(log.called(), []int64{1, 3, 4}) {
			t.Fatalf("trace = %+v, called = %v", tr, log.called())
		}
		if prior, called := log.prior[1]; !called || prior != nil {
			t.Fatalf("first stage prior = %+v", prior)
		}
		// The second stage gets the first stage's hits: category, score and
		// stage 1, best first.
		want := []HitCategory{{Category: "b", Score: 0.9, Threshold: 0.5, Stage: 1, Auditor: 1}, {Category: "a", Score: 0.6, Threshold: 0.5, Stage: 1, Auditor: 1}}
		if !slices.Equal(log.prior[3], want) {
			t.Fatalf("second stage prior = %+v, want %+v", log.prior[3], want)
		}
		// The third stage gets the hits of the stage that decided last.
		want = []HitCategory{{Category: "c", Score: 0.8, Threshold: 0.5, Stage: 2, Auditor: 3}}
		if !slices.Equal(log.prior[4], want) {
			t.Fatalf("third stage prior = %+v, want %+v", log.prior[4], want)
		}

		// Best score per category, best first, from every auditor of the
		// deciding stage.
		log = auditLog{}
		tr = runFlow(context.Background(), spec(st("all", 0, 1, 2), one(3)), 5*time.Second, log.wrap(scripted(out, nil)))
		want = []HitCategory{{Category: "b", Score: 0.9, Threshold: 0.5, Stage: 1, Auditor: 1}, {Category: "a", Score: 0.7, Threshold: 0.5, Stage: 1, Auditor: 2}}
		if tr.Final != Hit || !slices.Equal(log.prior[3], want) {
			t.Fatalf("prior = %+v, want %+v (%+v)", log.prior[3], want, tr)
		}

		// A failed first stage hands nothing on, and the fallback stages
		// get nothing either.
		log = auditLog{}
		tr = runFlow(context.Background(), spec(one(1), one(2), fb(3)), 5*time.Second, log.wrap(scripted(map[int64]Outcome{1: fail, 2: pass, 3: hit("a", 1)}, nil)))
		if tr.Final != Hit || tr.Decider != 2 || !slices.Equal(log.called(), []int64{1, 2, 3}) {
			t.Fatalf("trace = %+v, called = %v", tr, log.called())
		}
		for id, prior := range log.prior {
			if prior != nil {
				t.Fatalf("auditor %d prior = %+v", id, prior)
			}
		}
	})
}

// The record result of a trace (new-api result.go Verdict): a hit, then an
// overturn; an error only when no stage judged.
func TestRecordResultOfTrace(t *testing.T) {
	hitSt := StageTrace{Result: Hit, Outcomes: []Outcome{hit("a", 0.95)}}
	passSt := StageTrace{Result: Pass}
	failedSt := StageTrace{Result: Skip, Errored: true, Failed: true}
	skippedSt := StageTrace{Result: Skip, Skipped: true}
	for _, tc := range []struct {
		name     string
		tr       Trace
		refused  bool
		result   string
		severity string
		keeps    bool // keepsMessage
	}{
		{"hit", Trace{Final: Hit, Decider: 0, Stages: []StageTrace{hitSt}}, false, ResultHit, "high", true},
		{"pre hit is a block", Trace{Final: Hit, Decider: 0, Stages: []StageTrace{hitSt}}, true, ResultBlock, "high", true},
		{"hit with a failed review stage", Trace{Final: Hit, Decider: 0, Errored: true, Stages: []StageTrace{hitSt, failedSt}}, false, ResultHit, "high", true},
		{"pre hit with a failed review stage", Trace{Final: Hit, Decider: 0, Errored: true, Stages: []StageTrace{hitSt, failedSt}}, true, ResultBlock, "high", true},
		{"fallback hit", Trace{Final: Hit, Decider: 1, Stages: []StageTrace{passSt, {Result: Hit, Fallback: true, Outcomes: []Outcome{hit("a", 0.75)}}}}, false, ResultHit, "medium", true},
		{"overturned", Trace{Final: Pass, Decider: -1, Overturned: true, Stages: []StageTrace{hitSt, passSt}}, false, ResultOverturned, "", true},
		{"overturned with a failed stage", Trace{Final: Pass, Decider: -1, Overturned: true, Errored: true, Stages: []StageTrace{hitSt, failedSt, passSt}}, false, ResultOverturned, "", true},
		{"error: nothing judged", Trace{Final: Pass, Decider: -1, Errored: true, Stages: []StageTrace{failedSt, failedSt}}, false, ResultError, "", false},
		{"error: cut off before the first stage", Trace{Final: Pass, Decider: -1, Errored: true}, false, ResultError, "", false},
		{"error is never a block", Trace{Final: Pass, Decider: -1, Errored: true, Stages: []StageTrace{failedSt}}, true, ResultError, "", false},
		{"pass after a failed stage", Trace{Final: Pass, Decider: -1, Errored: true, Stages: []StageTrace{failedSt, passSt}}, false, ResultPass, "", false},
		{"pass with an errored auditor", Trace{Final: Pass, Decider: -1, Errored: true, Stages: []StageTrace{{Result: Pass, Errored: true}}}, false, ResultPass, "", false},
		{"pass", Trace{Final: Pass, Decider: -1, Stages: []StageTrace{passSt}}, false, ResultPass, "", false},
		{"skipped pass", Trace{Final: Pass, Decider: -1, Skipped: true, Stages: []StageTrace{skippedSt}}, false, ResultPass, "", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var rec eventRec
			rec.fillFromTrace(tc.tr, tc.refused)
			if rec.Result != tc.result || rec.Severity != tc.severity {
				t.Fatalf("result = %s severity = %q, want %s %q", rec.Result, rec.Severity, tc.result, tc.severity)
			}
			if got := tc.tr.keepsMessage(); got != tc.keeps {
				t.Fatalf("keepsMessage = %v", got)
			}
			wantCats := 0
			if tc.keeps {
				wantCats = 1
			}
			if len(rec.HitCategories) != wantCats {
				t.Fatalf("hit categories = %v", rec.HitCategories)
			}
		})
	}
	// Several chunks: the shown chunk's own stages decide between pass and
	// error, the top-level Errored covers every chunk.
	judged := Trace{Final: Pass, Decider: -1, Errored: true, Stages: []StageTrace{failedSt, passSt}}
	nothing := Trace{Final: Pass, Decider: -1, Errored: true, Stages: []StageTrace{failedSt}}
	clean := Trace{Final: Pass, Decider: -1, Stages: []StageTrace{passSt}}
	for _, tc := range []struct {
		name   string
		trs    []Trace
		chunk  int
		result string
	}{
		{"first errored chunk judged nothing", []Trace{clean, nothing, judged}, 2, ResultError},
		{"first errored chunk was judged", []Trace{clean, judged, nothing}, 2, ResultPass},
	} {
		tr := combineTraces(tc.trs)
		var rec eventRec
		rec.fillFromTrace(tr, false)
		if tr.Chunk != tc.chunk || !tr.Errored || rec.Result != tc.result {
			t.Fatalf("%s: chunk %d result %s (%+v)", tc.name, tr.Chunk, rec.Result, tr)
		}
	}
}

func TestSpecValidate(t *testing.T) {
	exists := func(id int64) bool { return id < 10 }
	good := []byte(`{"model_filter":{"type":"only","models":["claude-*"]},"sample_rate":50,"total_timeout_ms":0,"stages":[{"auditors":[1,2],"combine":"at_least","n":2}]}`)
	s, err := ParseSpec(good)
	if err != nil || s.Validate(exists) != nil {
		t.Fatalf("good spec: %v", err)
	}
	if _, err := ParseSpec([]byte(`{"stages":[],"enabled":true}`)); err == nil {
		t.Fatal("unknown field accepted")
	}
	// Fallback stages: accepted by ParseSpec, after every review stage only.
	for raw, want := range map[string]string{
		`{"stages":[{"auditors":[1]},{"auditors":[2],"fallback":true}]}`:                                                   "",
		`{"stages":[{"auditors":[1]},{"auditors":[2]},{"auditors":[3],"fallback":true},{"auditors":[1],"fallback":true}]}`: "",
		`{"stages":[{"auditors":[1],"fallback":true}]}`:                                                                    "the first stage cannot be a fallback stage",
		`{"stages":[{"auditors":[1],"fallback":true},{"auditors":[2]}]}`:                                                   "the first stage cannot be a fallback stage",
		`{"stages":[{"auditors":[1]},{"auditors":[2],"fallback":true},{"auditors":[3]}]}`:                                  "stage 3: fallback stages must come after every review stage",
	} {
		s, err := ParseSpec([]byte(raw))
		if err != nil {
			t.Fatalf("ParseSpec(%s): %v", raw, err)
		}
		got := ""
		if err := s.Validate(exists); err != nil {
			got = err.Error()
		}
		if got != want {
			t.Errorf("Validate(%s) = %q, want %q", raw, got, want)
		}
	}
	fbSpec, err := ParseSpec([]byte(`{"stages":[{"auditors":[1]},{"auditors":[2],"fallback":true}]}`))
	if err != nil || fbSpec.Stages[0].Fallback || !fbSpec.Stages[1].Fallback || fbSpec.chainLength() != 1 || s.chainLength() != 1 {
		t.Fatalf("fallback spec = %+v (%v)", fbSpec, err)
	}
	// A spec without fallback stages is written exactly as before 0.8.0.
	if raw, _ := json.Marshal(Stage{Auditors: []int64{1}, Combine: CombineAny}); string(raw) != `{"auditors":[1],"combine":"any"}` {
		t.Fatalf("stage json = %s", raw)
	}
	// The stage limit counts the fallback stages.
	long := &Spec{}
	for i := range maxStages + 1 {
		long.Stages = append(long.Stages, Stage{Auditors: []int64{1}, Fallback: i >= maxStages-1})
	}
	if err := long.Validate(exists); err == nil || !strings.Contains(err.Error(), "at most") {
		t.Fatalf("too many stages: %v", err)
	}
	for _, raw := range []string{
		`{"stages":[]}`,
		`{"stages":[{"auditors":[1,1]}]}`,
		`{"stages":[{"auditors":[1],"combine":"most"}]}`,
		`{"stages":[{"auditors":[1],"combine":"at_least"}]}`,
		`{"sample_rate":101,"stages":[{"auditors":[1]}]}`,
		`{"total_timeout_ms":50,"stages":[{"auditors":[1]}]}`,
		`{"model_filter":{"type":"only","models":[]},"stages":[{"auditors":[1]}]}`,
	} {
		s, err := ParseSpec([]byte(raw))
		if err == nil && s.Validate(exists) == nil {
			t.Errorf("accepted %s", raw)
		}
	}
	s, _ = ParseSpec([]byte(`{"stages":[{"auditors":[1,12,13]}]}`))
	var missing *MissingAuditorsError
	if err := s.Validate(exists); !errors.As(err, &missing) || len(missing.IDs) != 2 {
		t.Fatalf("missing auditors: %v", err)
	}
	s, _ = ParseSpec([]byte(`{"stages":[{"auditors":[1,2]},{"auditors":[3]}]}`))
	if got := s.DefaultTotalTimeoutMs(func(id int64) int { return int(id) * 1000 }); got != 5000 {
		t.Fatalf("default total = %d", got)
	}
	f := ModelFilter{Type: FilterExclude, Models: []string{"gpt-*"}}
	if f.Allows("GPT-5") || !f.Allows("claude-opus") || !(ModelFilter{}).Allows("x") {
		t.Fatal("model filter")
	}
}

func TestDecodeSettings(t *testing.T) {
	s, err := DecodeSettings([]byte(`{"mode":"OBSERVE","block_status":500,"retention_days":400,"pass_retention_days":9,"exempt_user_ids":["7",8,"x"],"watch_days":0}`))
	if err != nil {
		t.Fatal(err)
	}
	if s.Mode != ModeObserve || s.BlockStatus != 500 || s.HitRetentionDays != 400 || s.PassRetentionDays != 3 ||
		strings.Join(s.ExemptUserIDs, ",") != "7,8" || s.WatchDays != 1 || s.InputMaxChars != 12000 || !s.AutoWatch {
		t.Fatalf("settings = %+v", s)
	}
	// exempt_user_ids is the retired name of the allowlist; a missing
	// record_pass_input_message is on.
	c := compile(s)
	if !c.enabled || !c.allowlisted(7) || !c.allowlisted(8) || c.allowlisted(9) || c.blocklisted(7) || c.defaultLevel != LevelObserve ||
		c.retention[ResultPass] != 3*24*time.Hour || c.legacyReady || !s.RecordPassInputMessage {
		t.Fatalf("config = %+v", c)
	}
	if s, _ := DecodeSettings([]byte(`{"record_pass_input_message":false}`)); s.RecordPassInputMessage {
		t.Fatal("record_pass_input_message false ignored")
	}
	for mode, want := range map[string]string{ModeOff: LevelObserve, ModeObserve: LevelObserve, ModeEnforce: LevelEnforce} {
		s := DefaultSettings()
		s.Mode = mode
		if c := compile(s); c.defaultLevel != want || c.enabled != (mode != ModeOff) {
			t.Fatalf("mode %s: default level %q, enabled %v", mode, c.defaultLevel, c.enabled)
		}
	}
	if _, err := DecodeSettings([]byte(`[1]`)); err == nil {
		t.Fatal("array accepted")
	}
	s, _ = DecodeSettings([]byte(`{"block_status":451,"jev_default_set":{"items":[{"category":"custom/x","question":"q"}]}}`))
	if s.BlockStatus != 451 || s.JevDefaultSet != nil {
		t.Fatal("an invalid jev_default_set (no label, no threshold) must be ignored")
	}
}

// verdict_cache_days is the cache TTL; settings saved before 0.8.0 only have
// cache_ttl_seconds, which is read until the new key is saved.
func TestVerdictCacheTTLSettings(t *testing.T) {
	day := 24 * time.Hour
	for _, tc := range []struct {
		raw  string
		days int
	}{
		{`{"cache_ttl_seconds":0}`, 0}, // the cache stays off
		{`{"cache_ttl_seconds":86400}`, 1},
		{`{"cache_ttl_seconds":200000}`, 3}, // rounded up
		{`{"cache_ttl_seconds":1}`, 1},
		{`{"cache_ttl_seconds":604800}`, 7},
		{`{}`, 7},
		{`{"verdict_cache_days":40}`, 30},
		{`{"verdict_cache_days":0}`, 1},
		{`{"verdict_cache_days":3}`, 3},
		// The new key wins over the retired one, also over its 0.
		{`{"verdict_cache_days":5,"cache_ttl_seconds":0}`, 5},
		{`{"verdict_cache_days":5,"cache_ttl_seconds":86400}`, 5},
		// Values of the wrong type are ignored like everywhere else.
		{`{"verdict_cache_days":"x","cache_ttl_seconds":172800}`, 2},
		{`{"cache_ttl_seconds":"x"}`, 7},
	} {
		s, err := DecodeSettings([]byte(tc.raw))
		if err != nil {
			t.Fatal(err)
		}
		if c := compile(s); s.VerdictCacheDays != tc.days || c.cacheTTL != time.Duration(tc.days)*day {
			t.Errorf("%s: days = %d, ttl = %s, want %d days", tc.raw, s.VerdictCacheDays, c.cacheTTL, tc.days)
		}
	}
}

func TestAuditorJudge(t *testing.T) {
	def, _ := DefaultQuestions(nil)
	a, err := compileAuditor(1, "o", AuditorOpenAI, 1, AuditorConfig{Thresholds: map[string]float64{"sexual": 0.5}}, nil, &def)
	if err != nil {
		t.Fatal(err)
	}
	scores := map[string]float64{}
	for _, c := range OpenAICategories {
		scores[c] = 0.1
	}
	scores["sexual"] = 0.6
	hits, err := a.judge(EngineResult{Scores: scores})
	if err != nil || len(hits) != 1 || hits[0].Category != "sexual" {
		t.Fatalf("hits %v %v", hits, err)
	}
	delete(scores, "hate")
	if _, err := a.judge(EngineResult{Scores: scores}); !errors.Is(err, errBadScores) {
		t.Fatalf("missing score: %v", err)
	}
	if _, err := compileAuditor(1, "o", AuditorOpenAI, 1, AuditorConfig{Thresholds: map[string]float64{"sexual": 0}}, nil, &def); err == nil {
		t.Fatal("threshold 0 accepted")
	}
	j, err := compileAuditor(2, "j", AuditorTypeSafe, 1, AuditorConfig{}, nil, &def)
	if err != nil || len(j.order) != 10 || j.questions.RulesVersion != RulesVersionZH || !j.images {
		t.Fatalf("jev default: %+v %v", j, err)
	}
	if j.labels["custom/jailbreak"] != "越狱与恶意预填充" || j.thresholds["sexual"] != 0.90 {
		t.Fatal("jev rows")
	}
	custom := def
	custom.Items = append(custom.Items[:1:1], JevQuestion{Category: "custom/x", Label: "X", Question: "q?", Threshold: 0.5})
	if v := RulesVersionOf(&custom); !strings.HasPrefix(v, "custom-") {
		t.Fatalf("custom version %s", v)
	}
	// llm_questions: the default set when it has none, every threshold 1; a
	// yes (1) is a hit with score 1 and threshold 1, an unanswered question
	// is a bad response, thresholds and the image switch are refused.
	q, err := compileAuditor(4, "q", AuditorLLMQuestions, 1, AuditorConfig{}, nil, &def)
	if err != nil || len(q.order) != 10 || q.questions.RulesVersion != RulesVersionZH || q.images || channelTypeOf[AuditorLLMQuestions] != ChannelLLM {
		t.Fatalf("llm_questions default: %+v %v", q, err)
	}
	answers := map[string]float64{}
	for _, c := range q.order {
		answers[c] = 0
	}
	if hits, err := q.judge(EngineResult{Scores: answers}); err != nil || len(hits) != 0 {
		t.Fatalf("all no: %v %v", hits, err)
	}
	answers["custom/jailbreak"] = 1
	hits, err = q.judge(EngineResult{Scores: answers})
	if err != nil || len(hits) != 1 || hits[0] != (HitCategory{Category: "custom/jailbreak", Label: "越狱与恶意预填充", Score: 1, Threshold: 1}) {
		t.Fatalf("one yes: %+v %v", hits, err)
	}
	delete(answers, "sexual")
	if _, err := q.judge(EngineResult{Scores: answers}); !errors.Is(err, errBadScores) || ErrType(err) != ErrTypeBadResponse {
		t.Fatalf("unanswered question: %v", err)
	}
	own := JevQuestions{Items: []JevQuestion{{Category: "custom/x", Label: "X", Question: "q?", Threshold: 0.3}}}
	if q, err := compileAuditor(4, "q", AuditorLLMQuestions, 1, AuditorConfig{Questions: &own}, nil, &def); err != nil || q.thresholds["custom/x"] != 1 ||
		!strings.HasPrefix(q.questions.RulesVersion, "custom-") {
		t.Fatalf("llm_questions own table: %+v %v", q, err)
	}
	on := true
	for name, cfg := range map[string]AuditorConfig{"thresholds": {Thresholds: map[string]float64{"sexual": 0.5}}, "review_images": {ReviewImages: &on},
		"bad table": {Questions: &JevQuestions{}}} {
		if _, err := compileAuditor(4, "q", AuditorLLMQuestions, 1, cfg, nil, &def); err == nil {
			t.Fatalf("llm_questions with %s accepted", name)
		}
	}
	l, _ := compileAuditor(3, "l", AuditorLLMVerdict, 1, AuditorConfig{}, nil, &def)
	if h := l.judgeLLM(EngineResult{Scores: map[string]float64{"sexual": llmFlagScore}}); len(h) != 0 {
		t.Fatal("flag is not a hit by default")
	}
	l.flagAsHit = true
	if h := l.judgeLLM(EngineResult{Scores: map[string]float64{"sexual": llmFlagScore}}); len(h) != 1 {
		t.Fatal("flag_as_hit")
	}
}

func pngBase64(t *testing.T, w, h int) string {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewGray(image.Rect(0, 0, w, h))); err != nil {
		t.Fatal(err)
	}
	return base64.StdEncoding.EncodeToString(buf.Bytes())
}

func TestJevAssetsAndOpenAIImages(t *testing.T) {
	ok, small := pngBase64(t, 300, 300), pngBase64(t, 100, 100)
	in := &Input{Text: "t", Images: []Image{{MediaType: "image/png", Data: ok}, {MediaType: "image/png", Data: small}, {URL: "https://x/y.png"}}}
	// The in-limits PNG goes as it is, the one too small is redrawn onto a
	// 280 px canvas, the URL image is never sent.
	a := jevAssets(context.Background(), in)
	if len(a) != 2 || a[0].Format != "png" || a[0].DataBase64 != ok || a[1].Format != "png" || a[1].DataBase64 == small ||
		a[1].tokens != jevImageTokens(280, 280) {
		t.Fatalf("assets = %d", len(a))
	}
	if cfg, _, err := image.DecodeConfig(base64.NewDecoder(base64.StdEncoding, strings.NewReader(a[1].DataBase64))); err != nil || cfg.Width != 280 || cfg.Height != 280 {
		t.Fatalf("redrawn image = %+v %v", cfg, err)
	}
	urls := []string{}
	for _, img := range openAIUsableImages([]Image{{Data: ok}, {URL: "https://x/y.png"}, {Data: "bm90IGFuIGltYWdl"}}) {
		urls = append(urls, openAIImageURL(img))
	}
	if len(urls) != 2 || !strings.HasPrefix(urls[0], "data:image/png;base64,") || urls[1] != "https://x/y.png" {
		t.Fatalf("urls = %v", urls)
	}
}

func TestGlobMatchAndJoinURL(t *testing.T) {
	if !globMatch("claude-*", "claude-opus-5") || globMatch("claude-?", "claude-12") || !globMatch("*", "") {
		t.Fatal("glob")
	}
	if joinURL("https://a/v1/", "/v1/moderations") != "https://a/v1/moderations" || joinURL("https://a", "/v1/x") != "https://a/v1/x" {
		t.Fatal("joinURL")
	}
	if !hostChanged("https://a.com/v1", "https://b.com/v1") || hostChanged("https://a.com/v1", "https://A.com/other") {
		t.Fatal("hostChanged")
	}
}

func TestSelfMarker(t *testing.T) {
	k := markerKey("sk-1")
	wrapped := wrapUserContent(k, "hello moderation-content")
	if !isSelfRequest(k, wrapped) || isSelfRequest(markerKey("sk-2"), wrapped) || isSelfRequest(k, "hello") {
		t.Fatal("marker")
	}
	s := &snapshot{markers: [][]byte{markerKey("other"), k}}
	if !s.isSelf(wrapped) {
		t.Fatal("snapshot markers")
	}
	if !s.isSelf("analysis kickoff\n"+selfMarker(k)) || s.isSelf(selfMarker(markerKey("sk-x"))) {
		t.Fatal("bare self marker")
	}
}

func TestLRU(t *testing.T) {
	c := newLRU(2)
	now := time.Now()
	c.put("a", now.Add(time.Minute))
	c.put("b", now.Add(time.Minute))
	c.get("a", now)
	c.put("c", now.Add(time.Minute))
	if !c.get("a", now) || c.get("b", now) || !c.get("c", now) || c.len() != 2 {
		t.Fatal("eviction")
	}
	c.put("d", now)
	if c.get("d", now) {
		t.Fatal("expired entry returned")
	}
}

func TestParseVerdict(t *testing.T) {
	known := map[string]bool{"illegal": true}
	v, err := parseVerdict(`{"verdict":"BLOCK","categories":["illegal","nope"],"severity":"high","reason":"r"}`, known)
	if err != nil || v.Verdict != VerdictBlock || len(v.Categories) != 1 {
		t.Fatalf("%+v %v", v, err)
	}
	if _, err := parseVerdict(`{"verdict":"maybe"}`, known); err == nil {
		t.Fatal("bad verdict accepted")
	}
}

// Fallback stages have their own role in the views, the prompt text and the
// records the analysis tools return; a failed stage is marked on its
// auditors there.
func TestFallbackAndFailedStageViews(t *testing.T) {
	if stageRole(0, false, true) != RoleFirst || stageRole(1, false, true) != RoleBehavior || stageRole(1, false, false) != RoleReview ||
		stageRole(2, true, true) != RoleFallback || stageRoleNames[RoleFallback] != "补审" {
		t.Fatal("stage roles")
	}
	auditors := map[int64]*liveAuditor{1: {ID: 1, Name: "oai", Type: AuditorOpenAI}, 2: {ID: 2, Name: "jev", Type: AuditorTypeSafe}}
	spec := &Spec{Stages: []Stage{{Auditors: []int64{1}}, {Auditors: []int64{2}}, {Auditors: []int64{2}, Fallback: true}}}
	views := stageStructure(spec, auditors)
	if len(views) != 3 || views[1].Role != RoleBehavior || views[1].Fallback || views[2].Role != RoleFallback || !views[2].Fallback {
		t.Fatalf("structure = %+v", views)
	}
	cur := currentFlowView(&liveFlow{ID: 1, Spec: spec}, auditors, nil)
	if cur.Stages[2].Role != RoleFallback || !cur.Stages[2].Fallback || cur.Stages[0].Fallback {
		t.Fatalf("current view = %+v", cur.Stages)
	}
	lines := strings.Split(flowPromptText(cur), "\n")
	if len(lines) != 3 || !strings.HasPrefix(lines[1], "第 2 级 行为审查：") || !strings.HasSuffix(lines[1], "上一级命中才进入，通过即放行") ||
		!strings.HasPrefix(lines[2], "第 3 级 补审：") || !strings.HasSuffix(lines[2], "前面各级放行（未命中）才进入，命中即判定命中") {
		t.Fatalf("prompt = %q", lines)
	}

	// A question-table LLM auditor is described with its questions: the
	// dictionary defines each row with the question text, the view carries
	// the table and the prompt line says how it judges (no thresholds: a
	// yes is a hit).
	def, _ := DefaultQuestions(nil)
	llmq, err := compileAuditor(3, "llmq", AuditorLLMQuestions, 9, AuditorConfig{Questions: &JevQuestions{Items: []JevQuestion{
		{Category: "custom/spam", Label: "垃圾广告", Question: "是否是垃圾广告？", Threshold: 0.5},
		{Category: "sexual", Question: "是否露骨色情？", Threshold: 0.9}}}}, &liveChannel{ID: 9, Type: ChannelLLM, Name: "llm", Model: "judge-1"}, &def)
	if err != nil {
		t.Fatal(err)
	}
	qAuditors := map[int64]*liveAuditor{1: auditors[1], 3: llmq}
	qFlow := &liveFlow{ID: 2, Name: "q", Version: 1, Spec: &Spec{Stages: []Stage{{Auditors: []int64{1}}, {Auditors: []int64{3}}}}}
	qv := currentFlowView(qFlow, qAuditors, nil)
	if av := qv.Stages[1].Auditors[0]; av.Type != AuditorLLMQuestions || av.Questions == nil || len(av.Questions.Items) != 2 || av.Thresholds != nil ||
		av.Model != "judge-1" || qv.Stages[1].Role != RoleReview {
		t.Fatalf("llm_questions view = %+v", qv.Stages[1])
	}
	if line := strings.Split(flowPromptText(qv), "\n")[1]; line != "第 2 级 复核：llmq（LLM 题表，judge-1；问题 2 个，逐题回答是或否，答是即命中）；上一级命中才进入，通过即放行" {
		t.Fatalf("llm_questions prompt line = %q", line)
	}
	var spam, sexual *CategoryDef
	for i := range qv.Dict.Items {
		switch d := &qv.Dict.Items[i]; d.Code {
		case "custom/spam":
			spam = d
		case "sexual":
			sexual = d
		}
	}
	if spam == nil || spam.Name != "垃圾广告" || spam.Def != "是否是垃圾广告？" || spam.Source != AuditorLLMQuestions || spam.Stage != 2 ||
		spam.Auditor != "llmq" || spam.From != "第 2 级 · 复核 · llmq（问题原文）" {
		t.Fatalf("llm_questions definition = %+v", spam)
	}
	// A row with a built-in code replaces the built-in definition in place.
	if sexual == nil || sexual.Def != "是否露骨色情？" || sexual.Name != openAICategoryNames["sexual"] || sexual.Source != AuditorLLMQuestions ||
		len(qv.Dict.Items) != len(OpenAICategories)+1 {
		t.Fatalf("llm_questions built-in row = %+v (%d items)", sexual, len(qv.Dict.Items))
	}
	if prompt := buildAnalysisPrompt("", nil, qv, *qv.Dict); !strings.Contains(prompt, "- custom/spam（垃圾广告）：是否是垃圾广告？") ||
		!strings.Contains(prompt, "LLM 题表") {
		t.Fatalf("analysis prompt = %s", prompt)
	}

	fail := Outcome{Err: errors.New("boom")}
	tr := runFlow(context.Background(), spec, 5*time.Second, scripted(map[int64]Outcome{1: fail, 2: fail}, nil))
	raw, _ := json.Marshal(tr)
	if !strings.Contains(string(raw), `"failed":true`) || !strings.Contains(string(raw), `"fallback":true`) {
		t.Fatalf("trace json = %s", raw)
	}
	tc := &toolCtx{snap: &snapshot{auditors: auditors}}
	rec := tc.recordOf(&toolRow{Trace: raw}, 10, false)
	if len(rec.Stages) != 3 || rec.Stages[0].Role != "初审" || rec.Stages[2].Role != "补审" {
		t.Fatalf("tool stages = %+v", rec.Stages)
	}
	for _, s := range rec.Stages {
		if !s.StageFailed || s.Error == "" {
			t.Fatalf("tool stage = %+v", s)
		}
	}
	// A stage that decided is not marked, also with an errored auditor.
	tr = runFlow(context.Background(), &Spec{Stages: []Stage{{Auditors: []int64{1, 2}, Combine: CombineAll}}}, 5*time.Second,
		scripted(map[int64]Outcome{1: fail, 2: hit("a", 0.9)}, nil))
	raw, _ = json.Marshal(tr)
	out, _ := json.Marshal(tc.recordOf(&toolRow{Trace: raw}, 10, false))
	if strings.Contains(string(raw), `"failed"`) || strings.Contains(string(raw), `"fallback"`) || strings.Contains(string(out), "stage_failed") {
		t.Fatalf("trace = %s, tool record = %s", raw, out)
	}
}

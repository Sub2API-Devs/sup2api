package moderation

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/png"
	"io"
	"maps"
	"net/http"
	"net/http/httptest"
	"slices"
	"strconv"
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

// verdict_cache_days is the cache TTL, 0 = off (P11); settings saved before
// 0.8.0 only have cache_ttl_seconds, which is read until the new key is
// saved.
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
		{`{"verdict_cache_days":0}`, 0}, // the cache is off
		{`{"verdict_cache_days":-2}`, 0},
		{`{"verdict_cache_days":3}`, 3},
		// The new key wins over the retired one, also with its 0.
		{`{"verdict_cache_days":5,"cache_ttl_seconds":0}`, 5},
		{`{"verdict_cache_days":5,"cache_ttl_seconds":86400}`, 5},
		{`{"verdict_cache_days":0,"cache_ttl_seconds":86400}`, 0},
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
	// is a bad response, thresholds are refused. It sends images unless its
	// image switch is off.
	q, err := compileAuditor(4, "q", AuditorLLMQuestions, 1, AuditorConfig{}, nil, &def)
	if err != nil || len(q.order) != 10 || q.questions.RulesVersion != RulesVersionZH || !q.images || channelTypeOf[AuditorLLMQuestions] != ChannelLLM {
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
	for name, cfg := range map[string]AuditorConfig{"thresholds": {Thresholds: map[string]float64{"sexual": 0.5}}, "bad table": {Questions: &JevQuestions{}}} {
		if _, err := compileAuditor(4, "q", AuditorLLMQuestions, 1, cfg, nil, &def); err == nil {
			t.Fatalf("llm_questions with %s accepted", name)
		}
	}
	// The image switch of both LLM types: on unless review_images is false.
	// The OpenAI auditor has none and always takes images.
	on, off := true, false
	for _, typ := range []string{AuditorLLMQuestions, AuditorLLMVerdict} {
		for sw, want := range map[*bool]bool{nil: true, &on: true, &off: false} {
			if a, err := compileAuditor(4, "a", typ, 1, AuditorConfig{ReviewImages: sw}, nil, &def); err != nil || a.images != want {
				t.Fatalf("%s with review_images %v: images %v, %v", typ, sw, a != nil && a.images, err)
			}
		}
	}
	if _, err := compileAuditor(1, "o", AuditorOpenAI, 1, AuditorConfig{ReviewImages: &off}, nil, &def); err == nil {
		t.Fatal("an OpenAI auditor with an image switch accepted")
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
	var from []int
	for _, img := range openAIUsableImages([]Image{{Data: "bm90IGFuIGltYWdl"}, {Data: ok}, {URL: "https://x/y.png"}}) {
		urls = append(urls, openAIImageURL(img.Image))
		from = append(from, img.index)
	}
	if len(urls) != 2 || !strings.HasPrefix(urls[0], "data:image/png;base64,") || urls[1] != "https://x/y.png" || !slices.Equal(from, []int{1, 2}) {
		t.Fatalf("urls = %v, of the images %v", urls, from)
	}
	// Every asset names the image it was made of.
	if !slices.Equal(a[0].from, []int{0}) || !slices.Equal(a[1].from, []int{1}) {
		t.Fatalf("assets of the images %v and %v", a[0].from, a[1].from)
	}
}

// An engine names the images its upstream took in the call the scores come
// from: after a retry without them, none (OpenAI) or the first (Jev).
func TestEnginesNameReceivedImages(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Questions map[string]json.RawMessage `json:"questions"`
			Assets    map[string]json.RawMessage `json:"assets"`
		}
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &req)
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.URL.Path == "/v1/moderations" && strings.Contains(string(body), "refuse-images") && strings.Contains(string(body), "image_url"):
			w.WriteHeader(http.StatusBadRequest)
		case r.URL.Path == "/v1/moderations":
			scores := map[string]float64{}
			for _, c := range OpenAICategories {
				scores[c] = 0.01
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"model": "m", "results": []any{map[string]any{"category_scores": scores}}})
		case len(req.Assets) > 1:
			w.WriteHeader(http.StatusRequestEntityTooLarge)
		default:
			answers := map[string]any{}
			for c := range req.Questions {
				answers[c] = map[string]any{"type": "noul", "noul": 0.01}
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"model": "m", "answers": answers})
		}
	}))
	defer srv.Close()
	ctx := context.Background()
	one, two := pngBase64(t, 300, 300), pngBase64(t, 320, 320)
	images := []Image{{Data: "bm90IGFuIGltYWdl"}, {MediaType: "image/png", Data: one}, {MediaType: "image/png", Data: two}}

	oai := &liveChannel{Type: ChannelOpenAI, BaseURL: srv.URL, Key: "k", Model: "m"}
	res, err := openAIAudit(ctx, oai, &Input{Text: "t", Images: images})
	if err != nil || res.Calls != 1 || res.SentImages != 1 || res.SkippedImages != 2 || !slices.Equal(res.received, []int{1, 2}) {
		t.Fatalf("openai = %+v (received %v), %v", res, res.received, err)
	}
	// The image is refused (400): the scores are of the text alone.
	res, err = openAIAudit(ctx, oai, &Input{Text: "refuse-images", Images: images})
	if err != nil || res.Calls != 2 || res.SentImages != 0 || res.SkippedImages != 3 || len(res.received) != 0 {
		t.Fatalf("openai after the retry without the image = %+v (received %v), %v", res, res.received, err)
	}

	def, _ := DefaultQuestions(nil)
	a, err := compileAuditor(1, "j", AuditorTypeSafe, 1, AuditorConfig{}, nil, &def)
	if err != nil {
		t.Fatal(err)
	}
	jev := &liveChannel{Type: ChannelTypeSafe, BaseURL: srv.URL, Key: "k", Model: "m"}
	// The first image cannot be read; the request with the other two is too
	// large and goes again with the first of them (and its duplicate).
	res, err = typesafeAudit(ctx, jev, a.questions, true, &Input{Text: "t", Images: append(images, Image{Data: one})})
	if err != nil || res.Calls != 2 || res.SentImages != 1 || res.SkippedImages != 3 || !slices.Equal(res.received, []int{1, 3}) {
		t.Fatalf("jev after the retry with one image = %+v (received %v), %v", res, res.received, err)
	}
	res, err = typesafeAudit(ctx, jev, a.questions, true, &Input{Text: "t", Images: images[:2]})
	if err != nil || res.Calls != 1 || res.SentImages != 1 || res.SkippedImages != 1 || !slices.Equal(res.received, []int{1}) {
		t.Fatalf("jev = %+v (received %v), %v", res, res.received, err)
	}
	// With the image switch off nothing is received.
	if res, err = typesafeAudit(ctx, jev, a.questions, false, &Input{Text: "t", Images: images}); err != nil || len(res.received) != 0 {
		t.Fatalf("jev without images = %+v (received %v), %v", res, res.received, err)
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
	if !s.isSelf("questions\n"+selfMarker(k)) || s.isSelf(selfMarker(markerKey("sk-x"))) {
		t.Fatal("bare self marker")
	}
}

// tombstoned reports whether key is tombstoned at now.
func (c *lru) tombstoned(key string, now time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.hasTombstone(key, now)
}

func TestLRU(t *testing.T) {
	c := newLRU(2)
	now := time.Unix(1_700_000_000, 0)
	const ttl = time.Minute
	at := now.Unix()
	has := func(key string) bool {
		_, ok := c.getSeg(key, now)
		return ok
	}
	pass := func(key string, at int64) { c.editSeg(key, passAt(at), now, ttl) }
	pass("a", at)
	pass("b", at)
	c.getSeg("a", now)
	pass("c", at)
	if !has("a") || has("b") || !has("c") || c.len() != 2 {
		t.Fatal("eviction")
	}
	// A value written longer ago than the TTL is not kept.
	pass("d", now.Add(-ttl).Unix())
	if has("d") || c.len() != 2 {
		t.Fatal("expired value stored")
	}
	// A value is edited in place, and a forgotten key is gone.
	id := strings.Repeat("ab", 32)
	c.editSeg("a", pointTo(id, at), now, ttl)
	if v, ok := c.getSeg("a", now); !ok || v.pass != at || len(v.hits) != 1 || v.hits[0].id != id {
		t.Fatalf("edited value = %+v %v", v, ok)
	}
	c.forget([]string{"a", "missing"})
	if has("a") || c.len() != 1 {
		t.Fatalf("after forget: len %d", c.len())
	}
	// What a lookup read from the KV is added to what came into memory since
	// (a run on this node wrote the key); neither replaces the other.
	later := now.Add(10 * time.Second)
	read := c.reading(later)
	c.putSeg("c", fmt.Appendf(nil, "p%d h%s@%d", at, id, at), later, ttl, read)
	got := c.mergeSeg("c", parseSeg([]byte("p"+strconv.FormatInt(at+5, 10))), later, ttl, read)
	if v, _ := c.getSeg("c", later); got.pass != at+5 || len(got.hits) != 1 || v.pass != at+5 || len(v.hits) != 1 {
		t.Fatalf("after reading the KV: %+v, returned %+v", v, got)
	}
	// What a run wrote to the KV replaces what memory held: memory has what
	// the KV has. A value without a live part removes the key.
	c.putSeg("c", fmt.Appendf(nil, "p%d", at+5), later, ttl, read)
	if v, _ := c.getSeg("c", later); v.pass != at+5 || len(v.hits) != 0 {
		t.Fatalf("after the write of a run: %+v", v)
	}
	c.putSeg("a", fmt.Appendf(nil, "p%d", now.Add(-ttl).Unix()), later, ttl, read)
	if _, ok := c.getSeg("a", later); ok || c.len() != 1 {
		t.Fatalf("an expired value was put: %d entries", c.len())
	}
	// A value is gone the TTL after its newest write.
	if _, ok := c.getSeg("c", time.Unix(at+5, 0).Add(ttl)); ok || c.len() != 0 {
		t.Fatal("a value outlived the TTL of its write")
	}
}

// The memory cache is bounded by bytes as well as entries.
func TestLRUByteBudget(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	const ttl = time.Hour
	at, exp := now.Unix(), now.Add(ttl)
	c := newLRU(1000)
	if c.maxBytes != cacheMaxBytes {
		t.Fatalf("default budget = %d", c.maxBytes)
	}
	pass := func(key string) { c.editSeg(key, passAt(at), now, ttl) }
	one := int64(1 + len("p1700000000") + cacheEntryOverhead) // a one-letter key with a pass
	c.maxBytes = 3 * one
	for _, k := range []string{"a", "b", "c"} {
		pass(k)
	}
	if c.len() != 3 || c.size() != 3*one {
		t.Fatalf("%d entries, %d bytes", c.len(), c.size())
	}
	c.getSeg("a", now)
	pass("d") // over the budget: the least recently used goes
	if _, ok := c.getSeg("b", now); ok || c.len() != 3 || c.size() != 3*one {
		t.Fatalf("after the fourth: %d entries, %d bytes", c.len(), c.size())
	}
	// A value that grows is charged its new size.
	id := strings.Repeat("ab", 32)
	pointer := int64(len(" h" + id + "@1700000000"))
	c.editSeg("a", pointTo(id, at), now, ttl)
	if _, ok := c.getSeg("c", now); ok || c.len() != 2 || c.size() != 2*one+pointer {
		t.Fatalf("after growing a: %d entries, %d bytes", c.len(), c.size())
	}
	// A decoded hit is charged hitDecodedFactor times its JSON; forgetting
	// and expiring free.
	hit := &storedHit{Keys: []string{"k"}, At: at}
	c.maxBytes = 1 << 20
	if !c.putHit("h", hit, 1000, now, ttl, c.reading(now)) || c.getHit("h", now) != hit || c.size() != 2*one+pointer+1+hitDecodedFactor*1000+cacheEntryOverhead {
		t.Fatalf("with a hit: %d bytes", c.size())
	}
	if _, ok := c.getSeg("h", now); ok || c.getHit("a", now) != nil {
		t.Fatal("a hit read as a segment value, or a segment value as a hit")
	}
	c.forget([]string{"h"})
	c.getSeg("a", exp)
	c.getSeg("d", exp)
	if c.len() != 0 || c.size() != 0 {
		t.Fatalf("emptied: %d entries, %d bytes", c.len(), c.size())
	}
	// An entry larger than the whole budget is not kept.
	c.maxBytes = one
	c.putHit("big", hit, int(one), now, ttl, c.reading(now))
	if c.len() != 0 || c.size() != 0 {
		t.Fatalf("an entry beyond the budget: %d entries, %d bytes", c.len(), c.size())
	}
}

// A key a review changed is tombstoned for a while - nothing a lookup read
// or a run decided before the review is stored under it. The tombstones are
// charged to the byte budget and go when their time is over, with the next
// look at them and without another review.
func TestLRUTombstone(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	const ttl = time.Hour
	at := now.Unix()
	stone := int64(1 + tombstoneOverhead) // of a one-letter key
	c := newLRU(10)
	before := c.reading(now)
	c.editSeg("s", passAt(at), now, ttl)
	c.putHit("h", &storedHit{At: at}, 10, now, ttl, before)
	c.tombstone([]string{"s", "h"}, now)
	if c.len() != 0 || c.size() != 2*stone || !c.tombstoned("s", now) || c.tombstoned("other", now) {
		t.Fatalf("tombstoned: %d entries, %d bytes", c.len(), c.size())
	}
	c.editSeg("s", passAt(at), now, ttl)
	c.putSeg("s", []byte("p1700000000"), now, ttl, before)
	if c.putHit("h", &storedHit{At: at}, 10, now, ttl, before) || c.len() != 0 {
		t.Fatal("a tombstoned key was stored")
	}
	// What the KV holds for a tombstoned key decides the lookup that read it
	// and stays out of memory.
	if got := c.mergeSeg("s", parseSeg([]byte("p1700000000")), now, ttl, before); got.pass != at || c.len() != 0 {
		t.Fatalf("a tombstoned key read from the KV: %+v, %d entries", got, c.len())
	}
	// Tombstoned again, a key is charged once.
	c.tombstone([]string{"s"}, now)
	if c.size() != 2*stone {
		t.Fatalf("a key tombstoned twice: %d bytes", c.size())
	}
	later := now.Add(tombstoneTTL)
	if c.tombstoned("s", later) || len(c.tombs) != 0 || c.size() != 0 {
		t.Fatalf("tombstones after their time: %v, %d bytes", c.tombs, c.size())
	}
	c.editSeg("s", passAt(at), later, ttl)
	if !c.putHit("h", &storedHit{At: at}, 10, later, ttl, c.reading(later)) || c.len() != 2 {
		t.Fatal("a key could not be stored after its tombstone")
	}
	// Each tombstone goes at its own time: x is set at later, y two seconds
	// after it.
	c.tombstone([]string{"x"}, later)
	c.tombstone([]string{"y"}, later.Add(2*time.Second))
	if !c.tombstoned("y", later.Add(tombstoneTTL+time.Second)) || len(c.tombs) != 1 {
		t.Fatalf("tombstones after the first is over = %v", c.tombs)
	}
	if c.tombstoned("y", later.Add(tombstoneTTL+2*time.Second)) || len(c.tombs) != 0 {
		t.Fatalf("tombstones after both are over = %v", c.tombs)
	}
	// Tombstones take room in the byte budget: entries make way for them.
	c.maxBytes = c.size() + stone
	c.tombstone([]string{"p", "q"}, later)
	if c.len() != 1 || c.size() > c.maxBytes {
		t.Fatalf("with two more tombstones: %d entries, %d of %d bytes", c.len(), c.size(), c.maxBytes)
	}
}

// A review holds its keys without an end while it writes them, and gives the
// tombstones their time when it is done. And what was read from the KV before
// a review is kept out of memory however long the read took: also when the
// tombstone of its key has come and gone meanwhile.
func TestLRUTombstoneOfAReviewInProgress(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	const ttl = time.Hour
	at := now.Unix()
	val := fmt.Appendf(nil, "p%d", at)
	c := newLRU(10)
	read := c.reading(now) // a lookup, or the write of a run, reads the KV
	c.tombstoneOpen([]string{"s", "h"}, now)
	// However long the review writes: the keys stay tombstoned.
	for _, after := range []time.Duration{0, tombstoneTTL, time.Hour, 30 * 24 * time.Hour} {
		if at := now.Add(after); !c.tombstoned("s", at) || !c.tombstoned("h", at) || len(c.tombs) != 2 {
			t.Fatalf("%v into the review: tombstones %v", after, c.tombs)
		}
	}
	// The review is over an hour later: the tombstones last tombstoneTTL from
	// then, and go.
	done := now.Add(time.Hour)
	c.tombstone([]string{"s", "h"}, done)
	if last := done.Add(tombstoneTTL - time.Nanosecond); !c.tombstoned("s", last) || c.tombstoned("s", last.Add(time.Nanosecond)) || len(c.tombs) != 0 || c.size() != 0 {
		t.Fatalf("tombstones after the review: %v, %d bytes", c.tombs, c.size())
	}
	// The read from before the review comes back only now, with what the KV
	// held then. Nothing of it goes into memory, under the reviewed keys or
	// any other: which keys were tombstoned meanwhile is no longer known.
	late := done.Add(tombstoneTTL + time.Minute)
	c.putSeg("s", val, late, ttl, read)
	if got := c.mergeSeg("s", parseSeg(val), late, ttl, read); got.pass != at || c.putHit("h", &storedHit{At: at}, 10, late, ttl, read) || c.len() != 0 {
		t.Fatalf("a read from before the review came into memory: %d entries (returned %+v)", c.len(), got)
	}
	if c.mergeSeg("other", parseSeg(val), late, ttl, read); c.len() != 0 {
		t.Fatal("a read that outlasted a tombstone came into memory")
	}
	// A read that began after the review is not held back, however long it
	// takes; neither is a long read during which nothing was reviewed.
	fresh, back := c.reading(late), late.Add(ttl/2)
	c.putSeg("s", fmt.Appendf(nil, "p%d", late.Unix()), back, ttl, fresh)
	if !c.putHit("h", &storedHit{At: back.Unix()}, 10, back, ttl, fresh) || c.len() != 2 {
		t.Fatalf("a read after the review stayed out: %d entries", c.len())
	}
	// A read during which a review happened, and that is back while the
	// tombstones still stand, fills the keys the review did not change.
	short := c.reading(late)
	c.tombstone([]string{"x"}, late)
	soon := late.Add(tombstoneTTL / 2)
	c.putSeg("x", fmt.Appendf(nil, "p%d", late.Unix()), soon, ttl, short)
	c.putSeg("y", fmt.Appendf(nil, "p%d", late.Unix()), soon, ttl, short)
	if _, ok := c.getSeg("x", soon); ok {
		t.Fatal("a reviewed key came into memory")
	}
	if _, ok := c.getSeg("y", soon); !ok {
		t.Fatal("a key no review changed stayed out of memory")
	}
}

// A reading taken on a memory cache that was replaced since (cleared,
// cache_entries changed) tells nothing on the new one, whose tombstones began
// anew: every key counts as reviewed since, at once. A reading of the cache
// itself lapses when tombstones were set since and it is older than a
// tombstone lasts - not before, and not without tombstones.
func TestReadingLapses(t *testing.T) {
	now := time.Now()
	late := now.Add(tombstoneTTL + time.Second)
	old, c := newLRU(10), newLRU(10)
	if r := old.reading(now); !c.lapsedSince(r, now) || !c.reviewedSince("k", r, now) {
		t.Fatal("a reading of a replaced cache is taken for one of the new cache")
	}
	r := c.reading(now)
	if c.lapsedSince(r, late) || c.reviewedSince("k", r, late) {
		t.Fatal("lapsed without a tombstone since")
	}
	c.tombstone([]string{"other"}, now.Add(time.Second))
	if c.lapsedSince(r, now.Add(2*time.Second)) || c.reviewedSince("k", r, now.Add(2*time.Second)) {
		t.Fatal("lapsed while a tombstone of the key would still be there")
	}
	if !c.reviewedSince("other", r, now.Add(2*time.Second)) {
		t.Fatal("a tombstoned key is not reviewed")
	}
	if !c.lapsedSince(r, late) || !c.reviewedSince("k", r, late) {
		t.Fatal("not lapsed after a tombstone, with a reading older than a tombstone lasts")
	}
	if fresh := c.reading(late); c.lapsedSince(fresh, late.Add(time.Hour)) {
		t.Fatal("a reading taken after the tombstones lapsed")
	}
}

// A segment key holds a pass and the newest pointers, each with the time of
// its write.
func TestSegValue(t *testing.T) {
	id := func(i int) string { return fmt.Sprintf("%064x", i) }
	var v segValue
	passAt(100)(&v)
	pointTo(id(1), 90)(&v)
	pointTo(id(2), 120)(&v)
	passAt(80)(&v) // an older pass does not replace a newer one
	if got, want := string(v.encode()), fmt.Sprintf("p100 h%s@120 h%s@90", id(2), id(1)); got != want {
		t.Fatalf("value = %q, want %q", got, want)
	}
	if back := parseSeg(v.encode()); back.pass != 100 || len(back.hits) != 2 || back.hits[0] != (hitRef{id(2), 120}) || back.hits[1] != (hitRef{id(1), 90}) {
		t.Fatalf("read back = %+v", back)
	}
	// A pass leaves the pointers alone; dropping a pointer leaves the rest.
	unpoint(id(2))(&v)
	dropPass(&v)
	if string(v.encode()) != fmt.Sprintf("h%s@90", id(1)) || v.empty() {
		t.Fatalf("after the drops = %q", v.encode())
	}
	// unpointRef removes the pointer it names and no other: not a pointer to
	// the same hit written at another time.
	unpointRef(hitRef{id(1), 89})(&v)
	unpointRef(hitRef{id(2), 90})(&v)
	if string(v.encode()) != fmt.Sprintf("h%s@90", id(1)) {
		t.Fatalf("after dropping other pointers = %q", v.encode())
	}
	if unpointRef(hitRef{id(1), 90})(&v); !v.empty() {
		t.Fatalf("after dropping the pointer = %q", v.encode())
	}
	// The newest maxSegHits pointers are kept; a pointer written again moves up.
	v = segValue{}
	for i := 1; i <= maxSegHits+3; i++ {
		pointTo(id(i), int64(1000+i))(&v)
	}
	pointTo(id(4), 2000)(&v)
	if len(v.hits) != maxSegHits || v.hits[0].id != id(4) || v.hits[1].id != id(maxSegHits+3) || v.hits[maxSegHits-1].id != id(5) {
		t.Fatalf("kept pointers = %+v", v.hits)
	}
	// Merging keeps the newer of each part.
	a, b := parseSeg([]byte("p50 h"+id(1)+"@60")), parseSeg([]byte("p70 h"+id(1)+"@40 h"+id(2)+"@55"))
	a.merge(b)
	if string(a.encode()) != fmt.Sprintf("p70 h%s@60 h%s@55", id(1), id(2)) {
		t.Fatalf("merged = %q", a.encode())
	}
	// Every part expires on its own, the TTL after its write.
	now := time.Unix(1000, 0)
	a.prune(now, 942*time.Second) // kept: written after 58
	if string(a.encode()) != fmt.Sprintf("p70 h%s@60", id(1)) || !a.expires(942*time.Second).Equal(time.Unix(70+942, 0)) {
		t.Fatalf("pruned = %q, expires %v", a.encode(), a.expires(942*time.Second))
	}
	// Values without a write time (the first builds of 0.8.0) and anything
	// else that does not read are unknown.
	for _, raw := range []string{"", "p", "h" + id(1), "px", "h" + id(1) + "@", "hzz@5", "x9", "p-4"} {
		if got := parseSeg([]byte(raw)); !got.empty() {
			t.Errorf("%q read as %+v", raw, got)
		}
	}
}

// A cached hit is not kept beyond the TTL of its write, an unreadable entry
// is unknown, and an entry too large for the KV is not stored; the keys of
// the entry and of its pointers, and the id of a hit set.
func TestStoredHitCodecAndKeys(t *testing.T) {
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
	if body := encodeHit(&hit); !bytes.Equal(body, raw) || hitKeyOf("e0:1:fp", id) != "h:e0:1:fp:"+id ||
		segKeyHex("e0:1:fp", hit.Keys[0]) != "s:e0:1:fp:"+hit.Keys[0] || string(seg.encode()) != fmt.Sprintf("h%s@%d", id, hit.At) {
		t.Fatalf("entry %q = %s, pointer %s", id, body, seg.encode())
	}
	hit.Trace.Stages = []StageTrace{{Outcomes: []Outcome{{Reason: strings.Repeat("x", maxHitBytes)}}}}
	if body := encodeHit(&hit); body != nil {
		t.Fatalf("an oversized hit was stored: %d bytes", len(body))
	}
	// The id does not depend on the order of the segments.
	a, b := [32]byte{1}, [32]byte{2}
	if hitID([][32]byte{a, b}) != hitID([][32]byte{b, a}) || hitID([][32]byte{a}) == hitID([][32]byte{a, b}) || hitIDOf([]string{"zz"}) != "" || hitIDOf(nil) != "" {
		t.Fatal("hit id")
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

// Fallback stages have their own role in the flow views; a failed stage is
// marked in the trace.
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

	// A question-table LLM auditor is described with its questions: the
	// dictionary defines each row with the question text, the view carries
	// the table (no thresholds: a yes is a hit).
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

	fail := Outcome{Err: errors.New("boom")}
	tr := runFlow(context.Background(), spec, 5*time.Second, scripted(map[int64]Outcome{1: fail, 2: fail}, nil))
	raw, _ := json.Marshal(tr)
	if !strings.Contains(string(raw), `"failed":true`) || !strings.Contains(string(raw), `"fallback":true`) {
		t.Fatalf("trace json = %s", raw)
	}
	// A stage that decided is not marked, also with an errored auditor.
	tr = runFlow(context.Background(), &Spec{Stages: []Stage{{Auditors: []int64{1, 2}, Combine: CombineAll}}}, 5*time.Second,
		scripted(map[int64]Outcome{1: fail, 2: hit("a", 0.9)}, nil))
	raw, _ = json.Marshal(tr)
	if strings.Contains(string(raw), `"failed"`) || strings.Contains(string(raw), `"fallback"`) {
		t.Fatalf("trace = %s", raw)
	}
}

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

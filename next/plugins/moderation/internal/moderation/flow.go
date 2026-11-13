package moderation

import (
	"bytes"
	"cmp"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strings"
	"time"
)

// Spec is the publish unit of a flow (CONTRACTS §72.7). Groups live in
// flow_groups and the switch in flows.enabled, so neither is versioned.
type Spec struct {
	ModelFilter    ModelFilter `json:"model_filter"`
	SampleRate     float64     `json:"sample_rate"` // post only; pre is always moderated
	TotalTimeoutMs int         `json:"total_timeout_ms"`
	Stages         []Stage     `json:"stages"`
}

// Stage: a hit hands over to the next stage, a pass ends the review chain.
// Fallback stages come after every review stage and run only when the chain
// ended without a hit that was not overturned: a hit there is the final hit.
type Stage struct {
	Auditors []int64 `json:"auditors"`
	Combine  string  `json:"combine"` // any | all | at_least
	N        int     `json:"n,omitempty"`
	Fallback bool    `json:"fallback,omitempty"`
}

// ModelFilter selects the client models a flow moderates (glob patterns).
type ModelFilter struct {
	Type   string   `json:"type"` // all | only | exclude
	Models []string `json:"models"`
}

const (
	CombineAny     = "any"
	CombineAll     = "all"
	CombineAtLeast = "at_least"

	FilterAll     = "all"
	FilterOnly    = "only"
	FilterExclude = "exclude"

	minTotalTimeoutMs = 1000
	maxTotalTimeoutMs = 120_000
	maxStages         = 8
	maxStageAuditors  = 8
)

// ParseSpec decodes a spec; unknown fields are rejected.
func ParseSpec(raw []byte) (*Spec, error) {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	var s Spec
	if err := dec.Decode(&s); err != nil {
		return nil, fmt.Errorf("invalid flow spec: %w", err)
	}
	if s.ModelFilter.Type == "" {
		s.ModelFilter.Type = FilterAll
	}
	return &s, nil
}

// MissingAuditorsError lists auditors a spec references that do not exist.
type MissingAuditorsError struct{ IDs []int64 }

func (e *MissingAuditorsError) Error() string {
	return fmt.Sprintf("flow references missing auditors %v", e.IDs)
}

// Validate checks a spec against the existing auditors. total_timeout_ms may
// be 0 in a draft (publishing fills it).
func (s *Spec) Validate(auditorExists func(int64) bool) error {
	switch s.ModelFilter.Type {
	case FilterAll, "":
	case FilterOnly, FilterExclude:
		if len(s.ModelFilter.Models) == 0 {
			return errors.New("model_filter.models must not be empty")
		}
	default:
		return fmt.Errorf("unknown model_filter.type %q", s.ModelFilter.Type)
	}
	if s.SampleRate < 0 || s.SampleRate > 100 {
		return errors.New("sample_rate must be between 0 and 100")
	}
	if s.TotalTimeoutMs != 0 && (s.TotalTimeoutMs < minTotalTimeoutMs || s.TotalTimeoutMs > maxTotalTimeoutMs) {
		return fmt.Errorf("total_timeout_ms must be between %d and %d", minTotalTimeoutMs, maxTotalTimeoutMs)
	}
	if len(s.Stages) == 0 {
		return errors.New("a flow needs at least one stage")
	}
	if len(s.Stages) > maxStages {
		return fmt.Errorf("a flow has at most %d stages", maxStages)
	}
	if s.Stages[0].Fallback {
		return errors.New("the first stage cannot be a fallback stage")
	}
	var missing []int64
	for i, st := range s.Stages {
		if i > 0 && s.Stages[i-1].Fallback && !st.Fallback {
			return fmt.Errorf("stage %d: fallback stages must come after every review stage", i+1)
		}
		if len(st.Auditors) == 0 || len(st.Auditors) > maxStageAuditors {
			return fmt.Errorf("stage %d needs 1 to %d auditors", i+1, maxStageAuditors)
		}
		switch st.Combine {
		case CombineAny, CombineAll, "":
		case CombineAtLeast:
			if st.N < 1 {
				return fmt.Errorf("stage %d: n must be at least 1", i+1)
			}
		default:
			return fmt.Errorf("stage %d: unknown combine %q", i+1, st.Combine)
		}
		seen := map[int64]bool{}
		for _, id := range st.Auditors {
			if seen[id] {
				return fmt.Errorf("stage %d lists auditor %d twice", i+1, id)
			}
			seen[id] = true
			if !auditorExists(id) && !slices.Contains(missing, id) {
				missing = append(missing, id)
			}
		}
	}
	if len(missing) > 0 {
		return &MissingAuditorsError{IDs: missing}
	}
	return nil
}

// chainLength is the number of review stages before the first fallback stage.
func (s *Spec) chainLength() int {
	for i, st := range s.Stages {
		if st.Fallback {
			return i
		}
	}
	return len(s.Stages)
}

// need is how many hits decide a stage among its judging auditors (skipped
// and errored ones excluded).
func (st Stage) need(judging int) int {
	switch st.Combine {
	case CombineAll:
		return max(judging, 1)
	case CombineAtLeast:
		return max(min(st.N, judging), 1)
	}
	return 1
}

// DefaultTotalTimeoutMs = Σ per stage of its largest channel timeout, capped.
func (s *Spec) DefaultTotalTimeoutMs(timeoutOf func(int64) int) int {
	total := 0
	for _, st := range s.Stages {
		m := 0
		for _, id := range st.Auditors {
			m = max(m, timeoutOf(id))
		}
		total += m
	}
	return max(min(total, maxTotalTimeoutMs), minTotalTimeoutMs)
}

// Allows reports whether the flow moderates the client model.
func (f ModelFilter) Allows(model string) bool {
	if f.Type != FilterOnly && f.Type != FilterExclude {
		return true
	}
	matched := false
	for _, p := range f.Models {
		if globMatch(strings.ToLower(p), strings.ToLower(model)) {
			matched = true
			break
		}
	}
	return matched == (f.Type == FilterOnly)
}

// ---------------------------------------------------------------- run

// Verdicts of a stage or a whole flow. Skip: the stage decided nothing,
// because every auditor was skipped (StageTrace.Skipped) or because of
// auditor errors or the total timeout (StageTrace.Failed); the run keeps the
// result of the stage before it.
const (
	Hit  = "hit"
	Pass = "pass"
	Skip = "skipped"
)

// StageTrace is one executed stage.
type StageTrace struct {
	// Stage is the 1-based number of the stage in the flow's spec. A trace
	// holds only the stages that ran, so a fallback stage's number is not
	// its position in Trace.Stages plus one. Traces before 0.8.0 have no
	// number: there the position is the number (Trace.stageNo).
	Stage    int       `json:"stage,omitempty"`
	Outcomes []Outcome `json:"outcomes"`
	Result   string    `json:"result"`
	Errored  bool      `json:"errored,omitempty"` // an auditor errored, or the stage was cut off
	Skipped  bool      `json:"skipped,omitempty"` // every auditor skipped (Result = Skip)
	// Failed: no decision because of errors (every auditor errored or
	// skipped, at least one errored), the total timeout or a cancel;
	// Result = Skip and Errored is set.
	Failed   bool `json:"failed,omitempty"`
	Fallback bool `json:"fallback,omitempty"` // a fallback stage (Stage.Fallback)
}

// Trace is one run: events.trace and the source of result, categories and
// severity. A request moderated in several chunks (CONTRACTS §72.4) has one
// run per chunk: the trace is the deciding chunk's run (Chunk is its
// 1-based index) with the other runs in Chunks, and Errored / Skipped /
// LatencyMs cover them all.
type Trace struct {
	Stages []StageTrace `json:"stages"`
	Final  string       `json:"final"`
	// Decider is the index in Stages (not the spec stage number, see
	// StageTrace.Stage) of the last stage that decided hit; -1 = none.
	Decider    int  `json:"decider"`
	Overturned bool `json:"overturned,omitempty"`
	// Errored: some auditor errored or a stage failed (or the run panicked).
	// A failed stage is passed over, so the run may still end in a hit; it
	// is an error only when no stage judged at all (verdict).
	Errored bool `json:"errored,omitempty"`
	Skipped bool `json:"skipped,omitempty"`
	// TruncatedRun is only found in records before 0.6.0 (16 trailing user
	// messages).
	TruncatedRun bool  `json:"truncated_run,omitempty"`
	LatencyMs    int64 `json:"latency_ms"`
	// InputMessageDropped says why the record has no input message although
	// a stage hit: save_failed (the batch was written again without).
	InputMessageDropped string `json:"input_message_dropped,omitempty"`

	Chunk  int         `json:"chunk,omitempty"`
	Chunks []Trace     `json:"chunks,omitempty"`
	Input  *InputTrace `json:"input,omitempty"`
	// Cache: the hit set of the verdict chunk of a hit (cache.go), and on a
	// replayed record where the hit came from.
	Cache *CacheInfo `json:"cache,omitempty"`
}

// CacheInfo ties a hit record to the verdict cache. Key, Segs and FP name
// the cached hit of the verdict chunk: its id, the segment hashes it holds
// and the flow fingerprint it was judged under (the review of the record
// updates the cache with them, syncReviewed). Hit marks a replayed cached
// hit: no auditor ran, the trace is the one of SourceRequestID.
type CacheInfo struct {
	Hit             bool     `json:"hit,omitempty"`
	SourceRequestID string   `json:"source_request_id,omitempty"`
	Key             string   `json:"key,omitempty"`
	Segs            []string `json:"segs,omitempty"`
	FP              string   `json:"fp,omitempty"`
}

// ownRun is the run of the trace's chunk alone, without what belongs to the
// request it was part of: the form a cached hit keeps (storedHit).
func (t Trace) ownRun() Trace {
	t.Chunk, t.Chunks, t.Input, t.Cache, t.InputMessageDropped = 0, nil, nil, nil, ""
	return t
}

// receivedImages are the images of the run's input (indexes in Input.Images)
// that an auditor received in a call that judged (EngineResult.received): the
// images the run decided something about, whatever it decided. It is the
// image part of the set of a hit (sentKeys).
func (t *Trace) receivedImages() map[int]bool {
	out := map[int]bool{}
	for _, st := range t.Stages {
		for _, o := range st.Outcomes {
			if o.Err != nil || o.Skipped {
				continue
			}
			for _, i := range o.received {
				out[i] = true
			}
		}
	}
	return out
}

// passedImages are the images of the run's input a pass of the run may be
// stored for. The rule: an image counts when it was received
// (EngineResult.received) by an auditor whose own outcome is a pass (it
// judged, and did not hit), in a stage whose result is Pass. An auditor that
// hit says nothing in favour of what it received, and an auditor that passed
// without the image said nothing about it.
//
// In a run that ends in a pass the stages with the result Pass are exactly
// the stages the pass rests on (runFlow):
//
//   - one stage, any: every judging auditor passed, each counts;
//   - one stage, all / at_least: the stage passed although some auditors
//     hit; only the ones that passed count, so an image only the hitting
//     auditors received is not stored;
//   - an overturned run (hit, ..., pass): the one stage that overturned. The
//     stages that hit do not count: the image the first stage received and
//     hit, and the overturning stage did not get, is not stored;
//   - a chain that passed in its first judging stage, then the fallback
//     stages: every one of them ended in Pass (a hit there is the final
//     hit), each counts - the image needs a passing auditor in one of them;
//   - a stage that failed or was skipped has no result Pass and adds
//     nothing (settleVerdicts stores nothing at all for such a run: it is
//     errored, or has a skipped stage).
func (t *Trace) passedImages() map[int]bool {
	out := map[int]bool{}
	for _, st := range t.Stages {
		if st.Result != Pass {
			continue
		}
		for _, o := range st.Outcomes {
			if o.Err != nil || o.Skipped || o.Hit {
				continue
			}
			for _, i := range o.received {
				out[i] = true
			}
		}
	}
	return out
}

// judgedUnpassedImage reports whether the run's input holds an image some
// auditor received in a call that judged (receivedImages) and no passing
// auditor did (passedImages): in a run that ends in a pass, an image a hit
// was decided about while the pass rests on auditors that never got it
// (settleVerdicts).
func (t *Trace) judgedUnpassedImage() bool {
	passed := t.passedImages()
	for i := range t.receivedImages() {
		if !passed[i] {
			return true
		}
	}
	return false
}

// runs returns the trace's own run and the other chunks' runs.
func (t *Trace) runs() []*Trace {
	out := []*Trace{t}
	for i := range t.Chunks {
		out = append(out, &t.Chunks[i])
	}
	return out
}

// combineTraces makes one trace of the chunk runs (trs[i] is chunk i+1): the
// first chunk that hit decides; without a hit the first errored, then the
// first overturned, then the last chunk is shown (new-api gate.go). The
// result is judged from the shown chunk's own stages (verdict).
func combineTraces(trs []Trace) Trace {
	if len(trs) == 1 {
		return trs[0]
	}
	pick := -1
	for _, cond := range []func(*Trace) bool{
		func(t *Trace) bool { return t.Final == Hit },
		func(t *Trace) bool { return t.Errored },
		func(t *Trace) bool { return t.Overturned },
	} {
		for i := range trs {
			if pick < 0 && cond(&trs[i]) {
				pick = i
			}
		}
	}
	if pick < 0 {
		pick = len(trs) - 1
	}
	out := trs[pick]
	out.Chunk = pick + 1
	out.Chunks = nil
	skipped := true
	for i := range trs {
		t := trs[i]
		t.Chunk = i + 1
		out.Errored = out.Errored || t.Errored
		skipped = skipped && t.Skipped
		out.LatencyMs = max(out.LatencyMs, t.LatencyMs)
		if i != pick {
			out.Chunks = append(out.Chunks, t)
		}
	}
	out.Skipped = skipped
	return out
}

// auditFunc runs one auditor of the flow. prior is the hits of the stage that
// decided so far (Trace.HitCategories): nil until a stage decided hit (the
// first stage that judges, also when the stages before it failed) and in
// the fallback stages.
type auditFunc func(ctx context.Context, auditorID int64, prior []HitCategory) Outcome

// runFlow executes the spec by sequential review (new-api flow.go Run): a
// passing stage ends the review chain with Pass, a hit hands over, only a
// hit in every stage that judged is a Hit. A stage that failed (auditor
// errors, the total timeout, a cancel) is passed over with Errored: an
// earlier hit stands, and when no stage has decided yet the next stage
// reviews as the first one. A fully skipped first stage ends with a skipped
// Pass; a later one keeps the earlier hit. The fallback stages run when the
// chain ended without any stage deciding hit - it passed (an overturn does
// not count) or every stage failed: the first of them that hits makes the
// final Hit.
func runFlow(ctx context.Context, spec *Spec, timeout time.Duration, audit auditFunc) (tr Trace) {
	tr = Trace{Final: Pass, Decider: -1}
	start := time.Now()
	defer func() {
		if r := recover(); r != nil {
			tr.Final, tr.Decider, tr.Overturned, tr.Errored = Pass, -1, false, true
		}
		tr.LatencyMs = time.Since(start).Milliseconds()
	}()
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	chain := spec.chainLength()
	for i, st := range spec.Stages[:chain] {
		if ctx.Err() != nil {
			// The total timeout expired or the run was canceled: the stages
			// left are not run, and an earlier hit stands.
			tr.Errored = true
			break
		}
		stage := runStage(ctx, st, audit, tr.HitCategories())
		stage.Stage = i + 1
		tr.Stages = append(tr.Stages, stage)
		tr.Errored = tr.Errored || stage.Errored
		switch {
		case stage.Skipped && i == 0:
			tr.Skipped = true
			return tr
		case stage.Skipped || stage.Failed:
			continue
		case stage.Result == Pass:
			tr.Overturned = tr.Decider >= 0
			tr.Decider = -1
			if !tr.Overturned {
				runFallback(ctx, spec.Stages[chain:], chain, audit, &tr)
			}
			return tr
		}
		tr.Decider = len(tr.Stages) - 1
	}
	if tr.Decider >= 0 {
		tr.Final = Hit
		return tr
	}
	// Every stage of the chain failed or was skipped: nothing judged.
	runFallback(ctx, spec.Stages[chain:], chain, audit, &tr)
	return tr
}

// runFallback runs the fallback stages (stages[j] is stage base+j of the
// spec) after a chain that passed or judged nothing. A failed one is passed
// over; the first that hits decides the final Hit and ends the run. No
// stage decided hit before them, so they get no prior hits. After the total
// timeout or a cancel nothing more runs. Decider is the position of the
// stage in tr.Stages, which holds only the stages that ran.
func runFallback(ctx context.Context, stages []Stage, base int, audit auditFunc, tr *Trace) {
	for j, st := range stages {
		if ctx.Err() != nil {
			tr.Errored = true
			return
		}
		stage := runStage(ctx, st, audit, nil)
		stage.Stage, stage.Fallback = base+j+1, true
		tr.Stages = append(tr.Stages, stage)
		tr.Errored = tr.Errored || stage.Errored
		if stage.Result == Hit {
			tr.Final, tr.Decider = Hit, len(tr.Stages)-1
			return
		}
	}
}

// runStage calls the stage's auditors concurrently and stops as soon as the
// stage is decided. A skipped or errored auditor votes neither way: the hits
// needed count only the auditors that judged. A stage that ends without a
// decision fails (Failed, Result = Skip) unless every auditor was skipped;
// the total timeout or a cancel fails it too. prior is handed to every
// auditor as it is.
func runStage(ctx context.Context, st Stage, audit auditFunc, prior []HitCategory) StageTrace {
	failed := StageTrace{Result: Skip, Errored: true, Failed: true}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	results := make(chan Outcome, len(st.Auditors))
	for _, id := range st.Auditors {
		go func() { results <- auditSafely(ctx, audit, id, prior) }()
	}
	tr := StageTrace{Result: Pass}
	var hits, passes, skipped, errored int
	for pending := len(st.Auditors); pending > 0; pending-- {
		var o Outcome
		select {
		case <-ctx.Done():
			failed.Outcomes = tr.Outcomes
			return failed
		case o = <-results:
		}
		if errors.Is(o.Err, context.Canceled) {
			if ctx.Err() != nil {
				// The run was canceled: the stage has no decision, even
				// when this call reached the loop before ctx.Done.
				failed.Outcomes = tr.Outcomes
				return failed
			}
			continue
		}
		switch {
		case o.Err != nil:
			o.describeErr()
			tr.Errored = true
			errored++
		case o.Skipped:
			skipped++
		case o.Hit:
			hits++
		default:
			passes++
		}
		tr.Outcomes = append(tr.Outcomes, o)
		if v, ok := decide(hits, passes, pending-1, st.need(len(st.Auditors)-skipped-errored)); ok {
			tr.Result = v
			return tr
		}
	}
	if skipped == len(st.Auditors) {
		tr.Result, tr.Skipped = Skip, true
		return tr
	}
	failed.Outcomes = tr.Outcomes
	return failed
}

func auditSafely(ctx context.Context, audit auditFunc, id int64, prior []HitCategory) (o Outcome) {
	defer func() {
		if r := recover(); r != nil {
			o = Outcome{AuditorID: id, Err: errAuditorPanic}
		}
	}()
	return audit(ctx, id, prior)
}

// decide: enough hits → Hit; a pass seen and the rest cannot reach need → Pass.
func decide(hits, passes, pending, need int) (string, bool) {
	if hits >= need {
		return Hit, true
	}
	if passes > 0 && hits+pending < need {
		return Pass, true
	}
	return "", false
}

// stageSkipped reports whether a whole stage of the run was skipped
// (StageTrace.Skipped): that stage judged nothing.
func (t *Trace) stageSkipped() bool {
	return slices.ContainsFunc(t.Stages, func(st StageTrace) bool { return st.Skipped })
}

// judged reports whether some stage reached a decision (hit or pass): a run
// that passes after a failed stage was still judged, so it is a pass or an
// overturn, not an error.
func (t *Trace) judged() bool {
	return slices.ContainsFunc(t.Stages, func(st StageTrace) bool { return st.Result == Hit || st.Result == Pass })
}

// keepsMessage reports whether the record keeps the raw messages: the run
// ended in a hit (also a fallback stage catching what the chain let
// through), or some stage decided hit and a later stage overturned it.
func (t *Trace) keepsMessage() bool {
	return t.Final == Hit || slices.ContainsFunc(t.Stages, func(st StageTrace) bool { return st.Result == Hit })
}

// verdict is the timing-independent result of a trace (new-api result.go):
// a final hit is hit (also when a failed later stage left an earlier hit
// standing), then overturned; a pass is error only when no stage judged,
// otherwise pass, also when a failed stage was passed over.
func (t *Trace) verdict() string {
	switch {
	case t.Final == Hit:
		return ResultHit
	case t.Overturned:
		return ResultOverturned
	case t.Errored && !t.judged():
		return ResultError
	}
	return ResultPass
}

// decidingStage is the stage whose hits the record shows: the deciding stage
// of a hit, the last hit stage of an overturn. It is an index in Stages,
// or -1; a Decider outside Stages (a damaged or foreign trace) is ignored.
func (t *Trace) decidingStage() int {
	if t.Decider >= 0 && t.Decider < len(t.Stages) {
		return t.Decider
	}
	for i := len(t.Stages) - 1; i >= 0; i-- {
		if t.Stages[i].Result == Hit {
			return i
		}
	}
	return -1
}

// stageNo is the spec stage number (1-based) of Stages[i]: the stored number,
// or the position in traces written before stages carried one.
func (t *Trace) stageNo(i int) int {
	if n := t.Stages[i].Stage; n > 0 {
		return n
	}
	return i + 1
}

// HitCategories collects the deciding stage's hits, best score per category.
func (t *Trace) HitCategories() []HitCategory {
	d := t.decidingStage()
	if d < 0 {
		return nil
	}
	best := map[string]HitCategory{}
	for _, o := range t.Stages[d].Outcomes {
		for _, h := range o.Hits {
			if cur, ok := best[h.Category]; ok && cur.Score >= h.Score {
				continue
			}
			h.Stage, h.Auditor = t.stageNo(d), o.AuditorID
			best[h.Category] = h
		}
	}
	return slices.SortedFunc(maps.Values(best), func(a, b HitCategory) int {
		return cmp.Or(cmp.Compare(b.Score, a.Score), cmp.Compare(a.Category, b.Category))
	})
}

// Severity of a hit from the deciding stage's highest score.
func severityOf(score float64) string {
	switch {
	case score >= 0.9:
		return "high"
	case score >= 0.7:
		return "medium"
	}
	return "low"
}

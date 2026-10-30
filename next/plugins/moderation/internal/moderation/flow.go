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

// Stage: a hit hands over to the next stage, a pass ends the flow.
type Stage struct {
	Auditors []int64 `json:"auditors"`
	Combine  string  `json:"combine"` // any | all | at_least
	N        int     `json:"n,omitempty"`
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
	var missing []int64
	for i, st := range s.Stages {
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

// need is how many hits decide a stage among its judging auditors.
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

// Verdicts of a stage or a whole flow.
const (
	Hit  = "hit"
	Pass = "pass"
	Skip = "skipped"
)

// StageTrace is one executed stage.
type StageTrace struct {
	Outcomes []Outcome `json:"outcomes"`
	Result   string    `json:"result"`
	Errored  bool      `json:"errored,omitempty"`
	Skipped  bool      `json:"skipped,omitempty"`
}

// Trace is one run: events.trace and the source of result, categories and
// severity.
type Trace struct {
	Stages       []StageTrace `json:"stages"`
	Final        string       `json:"final"`
	Decider      int          `json:"decider"` // last stage that decided hit; -1 = none
	Overturned   bool         `json:"overturned,omitempty"`
	Errored      bool         `json:"errored,omitempty"`
	Skipped      bool         `json:"skipped,omitempty"`
	TruncatedRun bool         `json:"truncated_run,omitempty"`
	LatencyMs    int64        `json:"latency_ms"`
	// InputMessageDropped says why the record has no input message although
	// the first stage hit: save_failed (the batch was written again without).
	InputMessageDropped string `json:"input_message_dropped,omitempty"`
}

// auditFunc runs one auditor of the flow.
type auditFunc func(ctx context.Context, auditorID int64) Outcome

// runFlow executes the spec by sequential review (new-api flow.go Run): a
// passing stage ends the flow with Pass, a hit hands over, only a hit in
// every stage is a Hit. A stage without a decision (errors, timeout) passes
// with Errored. A fully skipped first stage ends with a skipped Pass; a later
// one keeps the earlier hit.
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
	for i, st := range spec.Stages {
		stage := runStage(ctx, st, audit)
		tr.Stages = append(tr.Stages, stage)
		tr.Errored = tr.Errored || stage.Errored
		switch {
		case stage.Skipped && i == 0:
			tr.Skipped = true
			return tr
		case stage.Skipped:
			continue
		case stage.Result == Pass:
			tr.Overturned = tr.Decider >= 0
			tr.Decider = -1
			return tr
		}
		tr.Decider = i
	}
	if tr.Decider >= 0 {
		tr.Final = Hit
	}
	return tr
}

// runStage calls the stage's auditors concurrently and stops as soon as the
// stage is decided.
func runStage(ctx context.Context, st Stage, audit auditFunc) StageTrace {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	results := make(chan Outcome, len(st.Auditors))
	for _, id := range st.Auditors {
		go func() { results <- auditSafely(ctx, audit, id) }()
	}
	tr := StageTrace{Result: Pass}
	var hits, passes, skipped int
	for pending := len(st.Auditors); pending > 0; pending-- {
		var o Outcome
		select {
		case <-ctx.Done():
			tr.Errored = true
			return tr
		case o = <-results:
		}
		if errors.Is(o.Err, context.Canceled) {
			continue
		}
		switch {
		case o.Err != nil:
			o.ErrType, o.Status = ErrType(o.Err), upstreamStatus(o.Err)
			tr.Errored = true
		case o.Skipped:
			skipped++
		case o.Hit:
			hits++
		default:
			passes++
		}
		tr.Outcomes = append(tr.Outcomes, o)
		if v, ok := decide(hits, passes, pending-1, st.need(len(st.Auditors)-skipped)); ok {
			tr.Result = v
			return tr
		}
	}
	if skipped == len(st.Auditors) {
		tr.Result, tr.Skipped = Skip, true
	}
	return tr
}

func auditSafely(ctx context.Context, audit auditFunc, id int64) (o Outcome) {
	defer func() {
		if r := recover(); r != nil {
			o = Outcome{AuditorID: id, Err: errAuditorPanic}
		}
	}()
	return audit(ctx, id)
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

func (t *Trace) anySkipped() bool {
	for _, st := range t.Stages {
		if slices.ContainsFunc(st.Outcomes, func(o Outcome) bool { return o.Skipped }) {
			return true
		}
	}
	return false
}

// firstStageHit: the raw messages of such a record are kept, also when a
// later stage overturned it.
func (t *Trace) firstStageHit() bool { return len(t.Stages) > 0 && t.Stages[0].Result == Hit }

// decidingStage is the stage whose hits the record shows: the deciding stage
// of a hit, the last hit stage of an overturn.
func (t *Trace) decidingStage() int {
	if t.Decider >= 0 {
		return t.Decider
	}
	for i := len(t.Stages) - 1; i >= 0; i-- {
		if t.Stages[i].Result == Hit {
			return i
		}
	}
	return -1
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
			h.Stage, h.Auditor = d+1, o.AuditorID
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

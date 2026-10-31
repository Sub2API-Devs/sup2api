package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"math/rand/v2"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/tidwall/gjson"
	"golang.org/x/text/unicode/norm"
)

// AI analysis of a watched user (CONTRACTS §72.13.4, new-api analysis.go):
// an agent with read-only tools reviews the user's suspicious records and
// submits a trend, a suggestion and per-record verdicts.

const (
	AnalysisSourceAuto   = "auto"
	AnalysisSourceManual = "manual"

	AnalysisStatusOK     = "ok"
	AnalysisStatusFailed = "failed"

	maxAnalysisTraceBytes = 32 << 10
	maxSummaryRunes       = 500
	maxProblems           = 5
	maxProblemRunes       = 60
	maxEvidenceRunes      = 240
	maxReasonRunes        = 200
	maxArgsDigestRunes    = 200

	// Failure codes of user_analyses.error (besides the upstream error types).
	analysisErrNoSubmit  = "no_submit"
	analysisErrBadSubmit = "bad_submit"
	analysisErrDisabled  = "disabled"
	analysisErrNoChannel = "no_channel"
	analysisErrStale     = "stale"

	maxNudges      = 2
	nudgeText      = "请用工具查看记录，最后必须调用 submit_analysis 提交结论；不要只回复文字。"
	maxBadSubmits  = 2
	badSubmitReply = `{"error":"submit_analysis 的参数不是符合 schema 的 JSON（或被截断了）。请重新调用 submit_analysis，只传合法的 JSON；summary 和 reason 写短一些。","required":{"trend":"occasional | persistent | escalating | likely_false_positive","suggestion":"release | observe | block","summary":"字符串","record_verdicts":[{"record_id":"整数","verdict":"violation | false_positive | unsure","severity":"high | medium | low","category":"字符串，可选","evidence":"字符串，可选","reason":"字符串"}]}}`
)

// Trends, suggestions and AI verdicts of submit_analysis.
const (
	TrendOccasional          = "occasional"
	TrendPersistent          = "persistent"
	TrendEscalating          = "escalating"
	TrendLikelyFalsePositive = "likely_false_positive"

	SuggestRelease = "release"
	SuggestObserve = "observe"
	SuggestBlock   = "block"

	AIViolation     = "violation"
	AIFalsePositive = "false_positive"
	AIUnsure        = "unsure"
)

var (
	trends         = []string{TrendOccasional, TrendPersistent, TrendEscalating, TrendLikelyFalsePositive}
	suggestions    = []string{SuggestRelease, SuggestObserve, SuggestBlock}
	aiVerdicts     = []string{AIViolation, AIFalsePositive, AIUnsure}
	aiSeverities   = []string{"high", "medium", "low"}
	errNoSubmit    = errors.New("analysis model stopped without calling submit_analysis")
	errBadSubmit   = errors.New("submit_analysis arguments are invalid")
	errSwitchedOff = errors.New("moderation was turned off during the analysis")
)

// RecordVerdict is one validated item of record_verdicts.
type RecordVerdict struct {
	RecordID int64  `json:"record_id"`
	Verdict  string `json:"verdict"`
	Severity string `json:"severity"`
	Category string `json:"category,omitempty"`
	Evidence string `json:"evidence,omitempty"`
	Reason   string `json:"reason"`
}

// VerdictTally counts records by AI verdict.
type VerdictTally struct {
	Violation     int64 `json:"violation"`
	FalsePositive int64 `json:"false_positive"`
	Unsure        int64 `json:"unsure"`
}

// VerdictCounts sums record verdicts; High/Medium/Low count violations.
type VerdictCounts struct {
	VerdictTally
	High   int64 `json:"high"`
	Medium int64 `json:"medium"`
	Low    int64 `json:"low"`
}

// FlowRef is one flow an analysis relied on.
type FlowRef struct {
	FlowID     int64  `json:"flow_id"`
	Name       string `json:"name,omitempty"`
	Version    int    `json:"version"`
	Via        string `json:"via"` // prompt | get_flow
	Group      *int64 `json:"group,omitempty"`
	Historical bool   `json:"historical,omitempty"`
	Deleted    bool   `json:"deleted,omitempty"`
}

// AnalysisStep is one entry of the analysis trace.
type AnalysisStep struct {
	Step        int           `json:"step"`
	Tool        string        `json:"tool,omitempty"`
	Args        string        `json:"args,omitempty"`
	LatencyMs   int64         `json:"latency_ms"`
	TokensIn    int64         `json:"tokens_in,omitempty"`
	TokensOut   int64         `json:"tokens_out,omitempty"`
	Cost        string        `json:"cost,omitempty"`
	ResultBytes int           `json:"result_bytes,omitempty"`
	Truncated   bool          `json:"truncated,omitempty"`
	Error       string        `json:"error,omitempty"`
	Flow        *FlowRef      `json:"flow,omitempty"`
	FlowStages  int           `json:"flow_stages,omitempty"`
	DictItems   int           `json:"dict_items,omitempty"`
	Notes       []VerdictNote `json:"notes,omitempty"`
}

// VerdictNote records what submit validation changed: verdict_dropped,
// verdict_invalid, evidence_invalid, category_unknown, truncated.
type VerdictNote struct {
	Kind     string `json:"kind"`
	RecordID int64  `json:"record_id,omitempty"`
}

// Analysis is one run before it is stored as a user_analyses row.
type Analysis struct {
	Source         string
	Status         string
	Error          string
	Trend          string
	Suggestion     string
	Summary        string
	MainProblems   []string
	RecordVerdicts []RecordVerdict
	VerdictCounts  VerdictCounts
	FlowsSeen      []FlowRef
	Model          string
	Steps          int
	TokensIn       int64
	TokensOut      int64
	costUnits      int64
	priced         bool
	UnpricedCalls  int
	Trace          []AnalysisStep
	DurationMs     int64
}

// Cost is the summed price of the priced steps (nil when none was priced).
func (a *Analysis) Cost() *string {
	if !a.priced {
		return nil
	}
	s := formatCost(a.costUnits)
	return &s
}

func (a *Analysis) addCost(c *CallCost) string {
	if c == nil {
		return ""
	}
	if c.Mode != PricePriced {
		a.UnpricedCalls++
		return ""
	}
	a.priced = true
	a.costUnits += c.units
	return c.Cost
}

// addStep appends a trace entry, dropping the earliest ones above 32 KB.
func (a *Analysis) addStep(s AnalysisStep) {
	a.Trace = append(a.Trace, s)
	for len(a.Trace) > 1 {
		data, _ := json.Marshal(a.Trace)
		if len(data) <= maxAnalysisTraceBytes {
			return
		}
		a.Trace = a.Trace[1:]
	}
}

// note attaches a validation note to the last (submit) step.
func (a *Analysis) note(kind string, recordID int64) {
	if len(a.Trace) == 0 {
		a.Trace = append(a.Trace, AnalysisStep{})
	}
	last := &a.Trace[len(a.Trace)-1]
	last.Notes = append(last.Notes, VerdictNote{Kind: kind, RecordID: recordID})
}

func argsDigest(args []byte) string { return truncateRunes(string(args), maxArgsDigestRunes) }

// analyzeUser runs one analysis with the analysis channel of the snapshot
// under analysis_timeout_ms.
func (p *Plugin) analyzeUser(ctx context.Context, job analysisJob) *Analysis {
	a := &Analysis{Source: job.Source, Status: AnalysisStatusFailed}
	c := p.cfg.Load()
	s := p.snap.Load()
	ch := s.channels[c.AnalysisChannelID]
	if ch == nil || ch.Type != ChannelLLM {
		a.Error = analysisErrNoChannel
		return a
	}
	a.Model = ch.Model
	ctx, cancel := context.WithTimeout(ctx, job.Timeout)
	defer cancel()
	tc := p.newToolCtx(ctx, job.UserID, s)
	system, view, dict := analysisPrompt(c.AnalysisGuidelines, s, tc.group)
	tc.notePrompt(view, dict)
	err := p.runAgent(ctx, ch, system, tc, c, a)
	a.FlowsSeen = tc.flowsSeen
	if err != nil {
		a.Status, a.Error = AnalysisStatusFailed, analysisErrType(err)
		a.RecordVerdicts, a.VerdictCounts = nil, VerdictCounts{}
		return a
	}
	a.Status, a.Error = AnalysisStatusOK, ""
	return a
}

func analysisErrType(err error) string {
	switch {
	case errors.Is(err, errNoSubmit):
		return analysisErrNoSubmit
	case errors.Is(err, errBadSubmit):
		return analysisErrBadSubmit
	case errors.Is(err, errSwitchedOff):
		return analysisErrDisabled
	}
	return ErrType(err)
}

// retryableStepError: 429, 5xx, a network error, an error event in the
// stream or a cut stream is worth one more try.
func retryableStepError(err error) bool {
	if errors.Is(err, errStreamCut) || errors.Is(err, errStreamError) {
		return true
	}
	var ne *networkError
	if errors.As(err, &ne) {
		return true
	}
	st := upstreamStatus(err)
	return st == http.StatusTooManyRequests || st >= 500
}

// waitStepRetry waits Retry-After (or 1–2 s) unless that would pass the
// analysis deadline.
func waitStepRetry(ctx context.Context, err error) bool {
	wait := time.Second + rand.N(time.Second)
	var up *UpstreamError
	if errors.As(err, &up) && up.retryAfter > 0 {
		wait = up.retryAfter
	}
	if dl, ok := ctx.Deadline(); ok && time.Until(dl) <= wait {
		return false
	}
	t := time.NewTimer(wait)
	defer t.Stop()
	select {
	case <-t.C:
		return true
	case <-ctx.Done():
		return false
	}
}

// runAgent is the agent loop: one streaming call per step until the model
// calls submit_analysis or ctx ends. A step without tool calls is answered
// with a reminder at most maxNudges times; the context budget only forces
// submission.
func (p *Plugin) runAgent(ctx context.Context, ch *liveChannel, system string, tc *toolCtx, c *config, a *Analysis) error {
	proto := protocolOf(ch)
	kickoff := "请分析用户 #" + strconv.FormatInt(tc.userID, 10) + " 的近期可疑记录：用工具查看，逐条复核，最后调用 submit_analysis 提交结论。信息够了就提交。"
	conv := conversation{proto: proto, kickoff: llmUserMessage(kickoff)}
	tools := llmTools()
	budgetLimit := c.AnalysisContextKB << 10
	badSubmits, nudges := 0, 0
	for step := 1; ; step++ {
		if !p.cfg.Load().enabled {
			return errSwitchedOff
		}
		final := conv.budgetSpent
		req := llmRequest{System: system, Messages: conv.messages(), Tools: tools, Stream: true}
		if final {
			req.ForceTool = submitAnalysisTool
		}
		var turn llmTurn
		var entry AnalysisStep
		var err error
		for attempt := 0; ; attempt++ {
			start := p.now()
			turn, err = proto.call(ctx, ch, req)
			latency := p.now().Sub(start)
			p.countCall(SourceAnalysis, ch, 1, err, latency.Milliseconds())
			cost := p.priceNow(ctx, SourceAnalysis, ch, EngineResult{Usage: engineUsage(turn.Usage), Calls: 1}, err)
			a.Steps = step
			a.TokensIn += turn.Usage.Input
			a.TokensOut += turn.Usage.Output
			if turn.Model != "" {
				a.Model = turn.Model
			}
			entry = AnalysisStep{Step: step, LatencyMs: latency.Milliseconds(), TokensIn: turn.Usage.Input, TokensOut: turn.Usage.Output, Cost: a.addCost(cost)}
			if err == nil || attempt == 1 || !retryableStepError(err) {
				break
			}
			entry.Error = ErrType(err)
			a.addStep(entry)
			if !waitStepRetry(ctx, err) {
				return err
			}
		}
		if err != nil {
			entry.Error = ErrType(err)
			a.addStep(entry)
			return err
		}
		submit := slices.IndexFunc(turn.ToolCalls, func(t llmToolCall) bool { return t.Name == submitAnalysisTool })
		if submit >= 0 {
			args := turn.ToolCalls[submit].Args
			entry.Tool, entry.Args = submitAnalysisTool, argsDigest(args)
			a.addStep(entry)
			err := a.finish(args, tc)
			if !errors.Is(err, errBadSubmit) || badSubmits == maxBadSubmits {
				return err
			}
			badSubmits++
			a.Trace[len(a.Trace)-1].Error = analysisErrBadSubmit
			if !gjson.ValidBytes(args) {
				turn.ToolCalls[submit].Args = []byte("{}")
			}
		}
		if submit < 0 && (final || len(turn.ToolCalls) == 0 && nudges == maxNudges) {
			entry.Error = analysisErrNoSubmit
			a.addStep(entry)
			return errNoSubmit
		}
		if len(turn.ToolCalls) == 0 {
			nudges++
			a.addStep(entry)
			conv.addNudge(turn)
			continue
		}
		if submit < 0 {
			a.addStep(entry)
		}
		results := make([]toolResult, 0, len(turn.ToolCalls))
		budget := budgetLimit - conv.size()
		for _, call := range turn.ToolCalls {
			if call.Name == submitAnalysisTool {
				results = append(results, toolResult{CallID: call.ID, Content: badSubmitReply})
				continue
			}
			res, st := tc.exec(ctx, call, &budget)
			results = append(results, res)
			st.Step = entry.Step
			a.addStep(st)
		}
		conv.add(turn, results)
		conv.fit(budgetLimit)
	}
}

// conversation keeps the turns and tool results so they can be re-rendered
// each step, the earliest results replaced when over budget.
type conversation struct {
	proto       *llmProtocol
	kickoff     any
	turns       []convTurn
	budgetSpent bool
}

type convTurn struct {
	turn    llmTurn
	results []toolResult
	nudge   bool
}

const removedResult = `{"truncated":true,"note":"为了不超出上下文预算，较早的结果已删除"}`

func (c *conversation) add(turn llmTurn, results []toolResult) {
	c.turns = append(c.turns, convTurn{turn: turn, results: results})
}

func (c *conversation) addNudge(turn llmTurn) {
	c.turns = append(c.turns, convTurn{turn: turn, nudge: true})
}

func (c *conversation) messages() []any {
	out := []any{c.kickoff}
	for _, t := range c.turns {
		if t.turn.Text != "" || len(t.turn.ToolCalls) > 0 {
			out = append(out, c.proto.assistant(t.turn)...)
		}
		if t.nudge {
			out = append(out, llmUserMessage(nudgeText))
			continue
		}
		out = append(out, c.proto.toolResults(t.results)...)
	}
	return out
}

// fit replaces the earliest tool results until the messages fit; the
// latest turn's results are never replaced, so when nothing else is left
// the next step must submit.
func (c *conversation) fit(limit int) {
	for c.size() > limit {
		if !c.removeEarliest() {
			c.budgetSpent = true
			return
		}
	}
}

func (c *conversation) size() int {
	data, _ := json.Marshal(c.messages())
	return len(data)
}

func (c *conversation) removeEarliest() bool {
	for i := range len(c.turns) - 1 {
		for j := range c.turns[i].results {
			r := &c.turns[i].results[j]
			if r.Content != removedResult {
				r.Content = removedResult
				return true
			}
		}
	}
	return false
}

// finish validates submit_analysis. Invalid JSON, an unknown trend or
// suggestion, or a missing record_verdicts array fail (bad_submit). A
// verdict naming a record no tool returned, or with bad enums, is dropped;
// evidence that is not a substring of what the model read is cleared.
func (a *Analysis) finish(args []byte, tc *toolCtx) error {
	var s struct {
		Trend        string   `json:"trend"`
		Suggestion   string   `json:"suggestion"`
		Summary      string   `json:"summary"`
		MainProblems []string `json:"main_problems"`
	}
	if json.Unmarshal(args, &s) != nil || !slices.Contains(trends, s.Trend) || !slices.Contains(suggestions, s.Suggestion) {
		return errBadSubmit
	}
	items := gjson.GetBytes(args, "record_verdicts")
	if !items.IsArray() {
		return errBadSubmit
	}
	a.Trend, a.Suggestion = s.Trend, s.Suggestion
	a.Summary = truncateRunes(s.Summary, maxSummaryRunes)
	if len(s.MainProblems) > maxProblems || utf8.RuneCountInString(s.Summary) > maxSummaryRunes {
		a.note("truncated", 0)
	}
	a.MainProblems = make([]string, 0, maxProblems)
	for _, pr := range s.MainProblems[:min(len(s.MainProblems), maxProblems)] {
		a.MainProblems = append(a.MainProblems, truncateRunes(pr, maxProblemRunes))
	}
	byRecord := map[int64]int{}
	a.RecordVerdicts = []RecordVerdict{}
	for _, item := range items.Array() {
		v, ok := a.checkVerdict(item, tc)
		if !ok {
			continue
		}
		if i, seen := byRecord[v.RecordID]; seen {
			a.RecordVerdicts[i] = v
			continue
		}
		byRecord[v.RecordID] = len(a.RecordVerdicts)
		a.RecordVerdicts = append(a.RecordVerdicts, v)
	}
	a.VerdictCounts = countVerdicts(a.RecordVerdicts)
	return nil
}

func (a *Analysis) checkVerdict(item gjson.Result, tc *toolCtx) (RecordVerdict, bool) {
	var v RecordVerdict
	if json.Unmarshal([]byte(item.Raw), &v) != nil || !slices.Contains(aiVerdicts, v.Verdict) || !slices.Contains(aiSeverities, v.Severity) {
		a.note("verdict_invalid", item.Get("record_id").Int())
		return v, false
	}
	excerpt, ok := tc.records[v.RecordID]
	if !ok {
		a.note("verdict_dropped", v.RecordID)
		return v, false
	}
	v.Evidence = truncateRunes(v.Evidence, maxEvidenceRunes)
	if v.Evidence != "" && !strings.Contains(normalizeForMatch(excerpt), normalizeForMatch(v.Evidence)) {
		v.Evidence = ""
		a.note("evidence_invalid", v.RecordID)
	}
	v.Category = truncateRunes(v.Category, 64)
	if v.Category != "" && !tc.codes[v.Category] {
		a.note("category_unknown", v.RecordID)
	}
	v.Reason = truncateRunes(v.Reason, maxReasonRunes)
	return v, true
}

// normalizeForMatch: NFKC, whitespace runs collapsed to one space, trimmed.
func normalizeForMatch(s string) string {
	return strings.Join(strings.FieldsFunc(norm.NFKC.String(s), unicode.IsSpace), " ")
}

func countVerdicts(vs []RecordVerdict) VerdictCounts {
	var c VerdictCounts
	for _, v := range vs {
		switch v.Verdict {
		case AIViolation:
			c.Violation++
			switch v.Severity {
			case "high":
				c.High++
			case "medium":
				c.Medium++
			case "low":
				c.Low++
			}
		case AIFalsePositive:
			c.FalsePositive++
		case AIUnsure:
			c.Unsure++
		}
	}
	return c
}

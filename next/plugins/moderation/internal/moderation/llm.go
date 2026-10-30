package moderation

import (
	"context"
	"math"
	"slices"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/textutil"
)

// llmJudge is the compiled §20 agent of an llm_verdict auditor.
type llmJudge struct {
	channel     *liveChannel
	proto       *llmProtocol
	model       string
	prompt      string
	categories  []Category
	categorySet map[string]bool
	tool        LLMTool
	choice      string
	maxTurns    int
	temperature float64
	maxTokens   int
	markerKey   []byte
}

// LLM verdict scores: block = 1, flag = 0.5 (CONTRACTS §72.6).
const (
	llmBlockScore = 1.0
	llmFlagScore  = 0.5
	llmNoCategory = "other"
)

// compileJudge fills the §20.3 defaults; ch may be nil (the auditor then
// fails with errNoChannel before the judge is used).
func compileJudge(cfg AuditorConfig, ch *liveChannel) *llmJudge {
	j := &llmJudge{
		maxTurns: clampInt(cfg.MaxTurns, 1, 5), maxTokens: clampInt(cfg.MaxTokens, 64, 4096),
		temperature: math.Max(0, math.Min(2, cfg.Temperature)),
	}
	if cfg.MaxTurns == 0 {
		j.maxTurns = 3
	}
	if cfg.MaxTokens == 0 {
		j.maxTokens = 512
	}
	j.categories = cfg.Categories
	if len(j.categories) == 0 {
		j.categories = DefaultCategories()
	}
	j.categorySet = map[string]bool{}
	for _, c := range j.categories {
		j.categorySet[c.ID] = true
	}
	j.prompt = expandPrompt(textutil.TruncateRunes(cfg.SystemPrompt, 20000), j.categories)
	j.tool = verdictTool(j.categories)
	j.choice = strings.ToLower(strings.TrimSpace(cfg.ToolChoice))
	if j.choice != ChoiceFunction && j.choice != ChoiceAuto {
		j.choice = ChoiceRequired
	}
	if ch != nil {
		j.channel, j.proto = ch, protocolOf(ch)
		j.model, j.markerKey = ch.Model, ch.markerKey
	}
	return j
}

// llmAudit runs the agent on the text (images are not sent).
func (p *Plugin) llmAudit(ctx context.Context, a *liveAuditor, in *Input) (EngineResult, error) {
	res := EngineResult{SkippedImages: len(in.Images)}
	if in.Text == "" {
		return res, ErrNoInput
	}
	r, err := p.agent.run(ctx, a.llm, in.Text, false)
	if r != nil {
		res.Calls, res.Model = r.Turns, r.LLMModel
		res.Usage = engineUsage(r.Billing)
	}
	if err != nil {
		return res, ctxErr(ctx, err)
	}
	res.Reason = r.Verdict.Reason
	res.Scores = map[string]float64{}
	score := 0.0
	switch r.Verdict.Verdict {
	case VerdictBlock:
		score = llmBlockScore
	case VerdictFlag:
		score = llmFlagScore
	}
	if score > 0 {
		cats := r.Verdict.Categories
		if len(cats) == 0 {
			cats = []string{llmNoCategory}
		}
		for _, c := range cats {
			res.Scores[c] = score
		}
	}
	return res, nil
}

// judgeLLM: block is a hit; flag only with flag_as_hit.
func (a *liveAuditor) judgeLLM(r EngineResult) []HitCategory {
	var hits []HitCategory
	for c, s := range r.Scores {
		if s >= llmBlockScore || (a.flagAsHit && s >= llmFlagScore) {
			th := llmBlockScore
			if a.flagAsHit {
				th = llmFlagScore
			}
			hits = append(hits, HitCategory{Category: c, Score: s, Threshold: th})
		}
	}
	slices.SortFunc(hits, func(x, y HitCategory) int { return strings.Compare(x.Category, y.Category) })
	return hits
}

package convert

import (
	"slices"
	"strings"
)

// Reasoning between OpenAI efforts and Gemini thinkingConfig
// (CONVERT-MATRIX §9.4). Models before Gemini 3 take a thinking budget,
// later ones a thinking level.

// geminiModel returns a model name without the "models/" resource prefix.
func geminiModel(model string) string { return strings.TrimPrefix(model, "models/") }

// geminiLegacy reports a model before Gemini 3: it takes thinkingBudget
// rather than thinkingLevel, and no media in function responses.
func geminiLegacy(model string) bool {
	m := geminiModel(model)
	return strings.HasPrefix(m, "gemini-1.") || strings.HasPrefix(m, "gemini-2.")
}

// geminiPro reports a Pro model: Gemini 2.5 Pro cannot turn thinking off
// (its smallest budget is 128) and Gemini 3 Pro takes the levels low and
// high only.
func geminiPro(model string) bool { return strings.Contains(geminiModel(model), "-pro") }

// geminiBudgets are the thinking budgets of the OpenAI efforts; -1 asks for
// a dynamic budget.
var geminiBudgets = map[string]int64{"none": 0, "minimal": 0, "low": 1024, "medium": 8192, "high": 24576, "xhigh": -1}

const geminiProMinBudget = 128

// geminiLevels are the thinking levels from the lowest; geminiProLevels
// those Gemini 3 Pro takes.
var (
	geminiLevels    = []string{"minimal", "low", "medium", "high"}
	geminiProLevels = []string{"low", "high"}
)

// geminiThinking returns the thinkingConfig of a requested reasoning effort
// (nil: the model default) whose thoughts the client sees when visible; nil
// when there is nothing to configure. An effort Gemini has no counterpart
// for is a reasoning loss.
func geminiThinking(model string, r *canonReasoning, visible bool, l *losses) jobject {
	cfg := jobject{}
	if r != nil {
		budget, known := geminiBudgets[r.effort]
		switch {
		case !known:
			l.add(LossReasoning, r.path)
		case geminiLegacy(model):
			if budget == 0 && geminiPro(model) {
				budget = geminiProMinBudget
			}
			cfg["thinkingBudget"] = budget
		default:
			cfg["thinkingLevel"] = geminiLevel(model, r.effort)
		}
		visible = visible && r.effort != "none"
	}
	if visible {
		cfg["includeThoughts"] = true
	}
	if len(cfg) == 0 {
		return nil
	}
	return cfg
}

// geminiLevel returns the thinking level the model takes nearest to an
// effort, rounding up: reasoning asked for is not cut.
func geminiLevel(model, effort string) string {
	levels := geminiLevels
	if geminiPro(model) {
		levels = geminiProLevels
	}
	want := slices.Index(geminiLevels, effort) // none: -1, xhigh: -1 too
	if effort == "xhigh" {
		want = len(geminiLevels) - 1
	}
	for _, lv := range levels {
		if slices.Index(geminiLevels, lv) >= want {
			return lv
		}
	}
	return levels[len(levels)-1]
}

// readGeminiThinking reads a Gemini client's thinkingConfig as an OpenAI
// effort: the level as is, a budget by size (0 turns thinking off and
// writes nothing, -1 is dynamic: medium). nil when no effort is given.
func readGeminiThinking(v any, path string, l *losses) (*canonReasoning, error) {
	o, err := jobj(v, path)
	if err != nil {
		return nil, err
	}
	camelize(o)
	keepOther(o, path, l, "thinkingBudget", "thinkingLevel", "includeThoughts")
	if x, ok := o["includeThoughts"]; ok {
		if _, err := jbool(x, path+".includeThoughts"); err != nil {
			return nil, err
		}
	}
	if x, ok := o["thinkingLevel"]; ok {
		p := path + ".thinkingLevel"
		s, err := jnonempty(x, p)
		if err != nil {
			return nil, err
		}
		if level := strings.ToLower(s); slices.Contains(geminiLevels, level) {
			return &canonReasoning{path: p, effort: level}, nil
		}
		return nil, cfail(p, "expected MINIMAL, LOW, MEDIUM or HIGH")
	}
	x, ok := o["thinkingBudget"]
	if !ok {
		return nil, nil
	}
	p := path + ".thinkingBudget"
	n, err := jint(x, p, -1, 1<<31-1)
	if err != nil || n == 0 {
		return nil, err
	}
	effort := "medium"
	if n > 0 {
		effort = geminiBudgetEffort(n)
	}
	return &canonReasoning{path: p, effort: effort}, nil
}

// geminiBudgetEffort maps a positive thinking budget to an effort.
func geminiBudgetEffort(n int64) string {
	switch {
	case n <= 1024:
		return "low"
	case n <= 8192:
		return "medium"
	}
	return "high"
}

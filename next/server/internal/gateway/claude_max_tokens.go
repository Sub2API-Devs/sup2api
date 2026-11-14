package gateway

import (
	"encoding/json"
	"fmt"
	"maps"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// claudeMaxTokensProtocol is the upstream protocol the rule applies to.
const claudeMaxTokensProtocol = "anthropic.messages"

// ClaudeMaxTokensRule is the gateway setting claude_max_tokens: a built-in
// request parameter override (CONTRACTS §84) of the attempts sent to
// anthropic.messages, off by default. On, a body without max_tokens gets the
// value of its client model, else the one under "default"; a model without
// either is left alone. It runs before the account's own override, which may
// change its result. A request converted to Anthropic gets the same value
// from the converter, which has to write the required field (CONVERT-MATRIX
// D5).
type ClaudeMaxTokensRule struct {
	Enabled bool           `json:"enabled"`
	Models  map[string]int `json:"models"`

	// override is the rule compiled by normalized; nil when off or empty.
	override *core.ParamOverride
}

// normalized bounds the values, drops the ones that set nothing, and
// compiles the rule. Models absent from the stored row (nil, not {}) start
// with "default" at its suggested value, which applies only when enabled.
func (r ClaudeMaxTokensRule) normalized() ClaudeMaxTokensRule {
	if r.Models == nil {
		r.Models = map[string]int{claudeDefaultKey: defaultClaudeMaxTokens}
	}
	models := make(map[string]int, len(r.Models))
	for k, v := range r.Models {
		if v > 0 {
			models[k] = min(v, maxClaudeMaxTokens)
		}
	}
	r.Models, r.override = models, nil
	if r.Enabled && len(models) > 0 {
		r.override = core.LoadParamOverride(r.operations())
	}
	return r
}

// operations is the rule in the override format: one keep_origin set of
// max_tokens per model, matched on the client model, then the fallback.
func (r ClaudeMaxTokensRule) operations() []byte {
	type cond struct {
		Path  string `json:"path"`
		Mode  string `json:"mode"`
		Value string `json:"value"`
	}
	type op struct {
		Mode       string `json:"mode"`
		Path       string `json:"path"`
		Value      int    `json:"value"`
		KeepOrigin bool   `json:"keep_origin"`
		Conditions []cond `json:"conditions,omitempty"`
	}
	set := func(v int, conds ...cond) op {
		return op{Mode: "set", Path: "max_tokens", Value: v, KeepOrigin: true, Conditions: conds}
	}
	ops := make([]op, 0, len(r.Models))
	for _, m := range slices.Sorted(maps.Keys(r.Models)) {
		if m != claudeDefaultKey {
			ops = append(ops, set(r.Models[m], cond{Path: "original_model", Mode: "full", Value: m}))
		}
	}
	if v, ok := r.Models[claudeDefaultKey]; ok {
		ops = append(ops, set(v))
	}
	raw, _ := json.Marshal(map[string]any{"operations": ops})
	return raw
}

// overrideFor is the rule's override for an upstream protocol; nil when the
// rule is off or does not apply to it.
func (r ClaudeMaxTokensRule) overrideFor(protocol string) *core.ParamOverride {
	if protocol != claudeMaxTokensProtocol {
		return nil
	}
	return r.override
}

// maxTokens is the max_tokens the rule gives a request of the client model,
// 0 when it gives none: the converter then uses its own fallback.
func (r ClaudeMaxTokensRule) maxTokens(model string) int {
	if !r.Enabled {
		return 0
	}
	if v, ok := r.Models[model]; ok {
		return v
	}
	return r.Models[claudeDefaultKey]
}

// validate checks an input rule: at most maxClaudeMaxTokensModels model
// names of 1 to maxClaudeMaxTokensName characters without surrounding
// spaces, values 1 to maxClaudeMaxTokens, and a compiled override within the
// engine's size cap (an override over it would fail every request).
func (r ClaudeMaxTokensRule) validate(zh bool) []core.FieldError {
	const field = "claude_max_tokens"
	fail := func(code, en, cn string) []core.FieldError {
		if zh {
			en = cn
		}
		return []core.FieldError{{Field: field, Code: code, Message: en}}
	}
	if len(r.Models) > maxClaudeMaxTokensModels {
		return fail("too_many", fmt.Sprintf("at most %d models", maxClaudeMaxTokensModels), fmt.Sprintf("最多 %d 个模型", maxClaudeMaxTokensModels))
	}
	for k, v := range r.Models {
		if strings.TrimSpace(k) != k || k == "" || utf8.RuneCountInString(k) > maxClaudeMaxTokensName {
			return fail("invalid_model", fmt.Sprintf("model names must be 1-%d characters without surrounding spaces", maxClaudeMaxTokensName),
				fmt.Sprintf("模型名须为 1-%d 个字符且首尾无空格", maxClaudeMaxTokensName))
		}
		if v < 1 || v > maxClaudeMaxTokens {
			return fail("out_of_range", fmt.Sprintf("values must be between 1 and %d", maxClaudeMaxTokens), fmt.Sprintf("取值范围为 1 到 %d", maxClaudeMaxTokens))
		}
	}
	if len(r.operations()) > core.MaxParamOverrideBytes {
		return fail("too_large", "the model names are too long in total", "模型名总长度过长")
	}
	return nil
}

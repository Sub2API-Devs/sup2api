package engine

import "fmt"

// thinkingDisabledUnsupported lists the models whose API answers
// thinking.type "disabled" with 400 "thinking.type.disabled is not supported
// for this model" (verified against the upstream on 2026-10-10). Claude Code
// sends disabled when it believes the model accepts it: a client whose
// local alias (claude-opus-5) a proxy such as cc-switch rewrites to
// claude-opus-5-5 sends it on its auto-mode classifier and side requests.
var thinkingDisabledUnsupported = map[string]bool{"claude-opus-5-5": true, "claude-fable-5-1": true}

// validThinkingDisabledCompat: "pass" (default) forwards disabled as sent, so
// the upstream answers 400 as the official API does; "omit" drops it.
func validThinkingDisabledCompat(value string) bool { return value == "pass" || value == "omit" }

// applyThinkingDisabledCompat drops thinking "disabled" for a listed model
// when the policy says omit. The request then goes upstream without thinking,
// as the official CLI sends it for these models: the inner CLI gets no
// --thinking, the outbound request no thinking field (apiGeneration removes
// what the client did not set), and nothing is turned into adaptive. A
// thinking block the model may still return is passed through unchanged.
func (p RequestPolicy) applyThinkingDisabledCompat(req *Request) {
	if p.ThinkingDisabledCompat != "omit" || str(req.Thinking, "type") != "disabled" || !thinkingDisabledUnsupported[req.Model] {
		return
	}
	req.Thinking = nil
	if req.Plan != nil {
		req.Plan.thinkingCompat = req.Model
	}
}

func thinkingCompatDecision(model string) Object {
	return Object{"field": "thinking", "action": "omit_unsupported_disabled", "stage": "admission", "policy": "thinking_disabled_compat", "model": model,
		"reason": fmt.Sprintf("%s rejects thinking.type disabled", model)}
}

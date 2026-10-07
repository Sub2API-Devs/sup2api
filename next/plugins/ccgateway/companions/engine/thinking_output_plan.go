package engine

import (
	"encoding/json"
	"fmt"
	"strings"
)

// configureThinkingOutput runs after policy admission. This policy has an
// allow-effort switch, but no administrator default effort value: absence means
// the API default, not the CLI's implicit medium or adaptive/display settings.
func (p *RequestPlan) configureThinkingOutput(req *Request, format any, headers []string) error {
	p.apiGeneration = true
	hasBeta := func(want string) bool { return hasBetaHeader(headers, want) }
	if str(req.Thinking, "display") == "updates" && !hasBeta("thinking-display-updates-2026-08-18") {
		return fmt.Errorf("thinking.display updates requires thinking-display-updates-2026-08-18")
	}
	if _, ok := req.Thinking["block_binding"]; ok && !hasBeta("thinking-binding-controls-2026-08-01") {
		return fmt.Errorf("thinking.block_binding requires thinking-binding-controls-2026-08-01")
	}
	if str(req.Thinking, "type") == "between_tools" && (req.Effort == "xhigh" || req.Effort == "max") {
		return fmt.Errorf("thinking between_tools requires effort high or below")
	}
	original, _ := decodeObject(p.raw)
	if _, old := original["output_format"]; old && !hasBeta("structured-outputs-2025-11-13") {
		return fmt.Errorf("output_format requires structured-outputs-2025-11-13; use output_config.format")
	}
	if req.Thinking != nil {
		p.fields["thinking"], _ = json.Marshal(req.Thinking)
	}
	output := Object{}
	if req.Effort != "" {
		output["effort"] = req.Effort
	}
	if format != nil {
		output["format"] = format
	}
	p.addTaskBudget(output)
	if len(output) > 0 {
		p.fields["output_config"], _ = json.Marshal(output)
	}
	return nil
}

func hasBetaHeader(headers []string, want string) bool {
	for _, header := range headers {
		for _, value := range strings.Split(header, ",") {
			if strings.TrimSpace(value) == want {
				return true
			}
		}
	}
	return false
}

package engine

import (
	"encoding/json"
	"fmt"
	"time"
)

func checkAdvisorTool(tool Object) error {
	if err := keys(tool, "type", "name", "model", "allowed_callers", "cache_control", "caching", "defer_loading", "max_tokens", "max_uses", "strict"); err != nil {
		return err
	}
	if str(tool, "model") == "" || len(str(tool, "model")) > 200 {
		return fmt.Errorf("advisor requires a model")
	}
	for _, field := range []string{"max_tokens", "max_uses"} {
		value := tool[field]
		if value == nil {
			continue
		}
		n, ok := value.(json.Number)
		if !ok {
			return fmt.Errorf("advisor %s must be an integer or null", field)
		}
		v, err := n.Int64()
		if err != nil || v < 0 || field == "max_tokens" && v < 1024 {
			return fmt.Errorf("invalid advisor %s", field)
		}
	}
	if value, exists := tool["defer_loading"]; exists {
		if _, ok := value.(bool); !ok {
			return fmt.Errorf("advisor defer_loading must be boolean")
		}
	}
	// Advisor-side caching is not an executor cache breakpoint or local TTL.
	ttl := 5 * time.Minute
	return cacheTTL(tool["caching"], &ttl)
}

func checkAdvisorResult(block Object) error {
	if err := keys(block, "type", "tool_use_id", "content", "cache_control"); err != nil {
		return err
	}
	if str(block, "tool_use_id") == "" {
		return fmt.Errorf("advisor result requires tool_use_id")
	}
	content, ok := block["content"].(map[string]any)
	if !ok {
		return fmt.Errorf("advisor result requires typed content")
	}
	switch str(content, "type") {
	case "advisor_result":
		if _, ok := content["text"].(string); !ok {
			return fmt.Errorf("advisor_result requires text")
		}
	case "advisor_redacted_result":
		if str(content, "encrypted_content") == "" {
			return fmt.Errorf("advisor_redacted_result requires encrypted_content")
		}
	case "advisor_tool_result_error":
		if str(content, "error_code") == "" {
			return fmt.Errorf("advisor error requires error_code")
		}
	default:
		return fmt.Errorf("unsupported advisor result type")
	}
	// Opaque ciphertext, stop reason and additional upstream result metadata
	// are preserved. The gateway never tries to decrypt or re-run the advisor.
	return nil
}

func (r *Request) validateAdvisorBeta() error {
	needed := r.hasServerSearch("advisor")
	for _, message := range r.Messages {
		for _, block := range message.Content {
			needed = needed || str(block, "type") == "advisor_tool_result" || str(block, "type") == "server_tool_use" && str(block, "name") == "advisor"
		}
	}
	if !needed {
		return nil
	}
	for _, beta := range r.Betas {
		if beta == "advisor-tool-2026-03-01" {
			return nil
		}
	}
	return fmt.Errorf("advisor tools and history require anthropic-beta: advisor-tool-2026-03-01")
}

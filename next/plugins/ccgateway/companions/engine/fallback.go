package engine

import "fmt"

// Fallback boundaries are history protocol markers, not prompts or local
// routing instructions. Preserve their original position, including between
// signed thinking spans. Requesting a fallback chain has separate admission.
func checkFallbackBlock(block Object, role string) error {
	if role != "assistant" {
		return fmt.Errorf("fallback blocks must be assistant content")
	}
	if err := keys(block, "type", "from", "to", "trigger"); err != nil {
		return err
	}
	for _, field := range []string{"from", "to"} {
		value, exists := block[field]
		if field == "from" && !exists {
			continue
		}
		info, ok := value.(map[string]any)
		if !ok || str(info, "model") == "" {
			return fmt.Errorf("fallback.%s requires a model", field)
		}
		if err := keys(info, "model"); err != nil {
			return err
		}
	}
	if value, exists := block["trigger"]; exists && value != nil {
		if _, ok := value.(map[string]any); !ok {
			return fmt.Errorf("fallback.trigger must be an object or null")
		}
	}
	return nil
}

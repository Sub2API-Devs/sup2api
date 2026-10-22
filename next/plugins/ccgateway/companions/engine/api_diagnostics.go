package engine

import (
	"encoding/json"
	"fmt"
)

func parseAPIDiagnostics(p *RequestPlan, o Object) error {
	value, exists := o["diagnostics"]
	if !exists {
		return nil
	}
	if value != nil {
		cfg, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("diagnostics must be an object or null")
		}
		if err := keys(cfg, "previous_message_id"); err != nil {
			return err
		}
		if id, exists := cfg["previous_message_id"]; exists && id != nil {
			text, ok := id.(string)
			if !ok || text == "" {
				return fmt.Errorf("diagnostics.previous_message_id must be a nonempty string or null")
			}
		}
	}
	p.fields["diagnostics"], _ = json.Marshal(value)
	delete(o, "diagnostics")
	return nil
}

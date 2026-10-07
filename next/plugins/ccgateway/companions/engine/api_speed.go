package engine

import (
	"encoding/json"
	"fmt"
)

// API speed is applied at the attributed model boundary; CLI eligibility and
// automatic downgrade decisions must not rewrite the client's explicit value.
func (p *RequestPlan) configureAPISpeed(r *Request) error {
	var original map[string]json.RawMessage
	if err := json.Unmarshal(p.raw, &original); err != nil {
		return err
	}
	raw, exists := original["speed"]
	if !exists {
		return nil
	}
	if r.Fast != nil && *r.Fast && !hasBetaHeader(r.Betas, "fast-mode-2026-02-01") {
		return fmt.Errorf("speed fast requires fast-mode-2026-02-01")
	}
	p.fields["speed"] = append(json.RawMessage(nil), raw...)
	return nil
}

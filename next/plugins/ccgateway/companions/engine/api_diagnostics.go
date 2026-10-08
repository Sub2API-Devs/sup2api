package engine

import (
	"encoding/json"
	"fmt"
	"time"
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

func (x *exchange) validateDiagnosticsOwnership() error {
	if x.req.Plan == nil {
		return nil
	}
	raw, exists := x.req.Plan.fields["diagnostics"]
	if !exists {
		if x.r.Header.Get("X-CCGateway-Diagnostics-Track") != "" || x.r.Header.Get("X-CCGateway-Diagnostics-Previous") != "" {
			return fmt.Errorf("diagnostics capability without request")
		}
		return nil
	}
	var cfg Object
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return err
	}
	if cfg == nil && (x.r.Header.Get("X-CCGateway-Diagnostics-Track") != "" || x.r.Header.Get("X-CCGateway-Diagnostics-Previous") != "") {
		return fmt.Errorf("diagnostics capability requires opt-in object")
	}
	id := str(cfg, "previous_message_id")
	if trusted, err := x.trustedDiagnostics(id); trusted || err != nil {
		return err
	}
	if id == "" {
		return nil
	}
	if !x.g.ownershipIndex().owns(id, x.ownershipScope(), time.Now()) {
		return fmt.Errorf("diagnostics.previous_message_id is unknown, expired or belongs to another client/Worker account; use an ID issued to this client by the same Worker within one hour")
	}
	return nil
}

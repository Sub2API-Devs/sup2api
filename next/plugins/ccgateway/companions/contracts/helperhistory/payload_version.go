package helperhistory

import (
	"encoding/json"
	"fmt"
	"strings"
)

func validPayloadSelection(v int) bool { return v == 0 || v == PayloadVersion1 || v == PayloadVersion2 }
func effectivePayloadVersion(v int) int {
	if v == 0 {
		return PayloadVersion1
	}
	return v
}
func (e RequestEnvelope) EffectivePayloadVersion() int {
	return effectivePayloadVersion(e.PayloadVersion)
}
func (e ResponseEnvelope) EffectivePayloadVersion() int {
	return effectivePayloadVersion(e.PayloadVersion)
}

func validateExplicitPayloadVersion(raw []byte) error {
	if len(raw) == 0 || len(raw) > MaxEnvelopeBytes {
		return fmt.Errorf("helper envelope size invalid")
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		return err
	}
	for key := range fields {
		if strings.EqualFold(key, "payload_version") && key != "payload_version" {
			return fmt.Errorf("noncanonical helper payload version field")
		}
	}
	if value, ok := fields["payload_version"]; ok {
		var version int
		if json.Unmarshal(value, &version) != nil || version != PayloadVersion1 && version != PayloadVersion2 {
			return fmt.Errorf("invalid explicit helper payload version")
		}
	}
	return nil
}

// Selection 2 can import immutable version-1 receipts without rewriting them.
// Omission never grants permission to consume or produce version 2.
func ValidatePayloadSelection(raw []byte, selected int) error {
	if selected != PayloadVersion1 && selected != PayloadVersion2 {
		return fmt.Errorf("unsupported helper payload selection")
	}
	if err := Validate(raw); err != nil {
		return err
	}
	var p struct {
		Version int `json:"version"`
	}
	_ = json.Unmarshal(raw, &p)
	if p.Version > selected {
		return fmt.Errorf("helper payload exceeds negotiated version")
	}
	return nil
}

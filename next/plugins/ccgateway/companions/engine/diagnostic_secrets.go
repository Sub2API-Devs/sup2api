package engine

import (
	"bytes"
	"encoding/json"
	"strings"
)

// prepareSecrets runs before the first client body is captured, even when
// admission later fails. Invalid JSON is never safe to retain as a raw body.
func (d *requestDiagnostic) prepareSecrets(body []byte) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	var value any
	if json.Unmarshal(body, &value) != nil {
		d.secretCapture = true
	} else {
		var visit func(any)
		visit = func(v any) {
			switch v := v.(type) {
			case map[string]any:
				for key, child := range v {
					if strings.EqualFold(key, "authorization_token") {
						d.secretCapture = true
						if text, ok := child.(string); ok && text != "" {
							d.secretTokens = append(d.secretTokens, text)
						}
					}
					visit(child)
				}
			case []any:
				for _, child := range v {
					visit(child)
				}
			}
		}
		visit(value)
	}
	if d.secretCapture {
		d.fields["capture_policy"] = "structured_redacted_only"
		d.fields["raw_capture_omitted_reason"] = "credential-bearing or malformed request; unframed chunks cannot be safely sanitized"
	}
}

// redactCaptureLocked changes diagnostic copies only. Whole scalar values are
// redacted; request/response execution never receives this representation.
func (d *requestDiagnostic) redactCaptureLocked(raw []byte) []byte {
	if !d.secretCapture {
		return raw
	}
	var value any
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	if !json.Valid(raw) || decoder.Decode(&value) != nil {
		return []byte("[RAW CAPTURE OMITTED: credential-safe structured capture only]\n")
	}
	var redact func(any) any
	redact = func(v any) any {
		switch v := v.(type) {
		case map[string]any:
			for key, child := range v {
				if strings.EqualFold(key, "authorization_token") {
					v[key] = "[REDACTED]"
				} else {
					v[key] = redact(child)
				}
			}
		case []any:
			for i, child := range v {
				v[i] = redact(child)
			}
		case string:
			for _, secret := range d.secretTokens {
				if strings.Contains(v, secret) {
					return "[REDACTED]"
				}
			}
		}
		return v
	}
	out, _ := json.Marshal(redact(value))
	return append(out, '\n')
}

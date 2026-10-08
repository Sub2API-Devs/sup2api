package engine

import (
	"encoding/json"
	"fmt"
)

// The whole public user turn includes trailing system directives. The anchor
// stays after those directives, never before their tool/schema changes.
func helperPublicTurnBoundary(messages []json.RawMessage, after int) error {
	for i := after; i >= 0; i-- {
		message, err := decodeObject(messages[i])
		if err != nil {
			return err
		}
		switch str(message, "role") {
		case "user":
			return nil
		case "system":
			continue
		default:
			return fmt.Errorf("helper history requires a complete public user turn")
		}
	}
	return fmt.Errorf("helper history system boundary has no public user turn")
}

func (r *Request) validateHelperInline() error {
	if r.InlineTools == nil {
		return nil
	}
	if err := r.validateInlineInternalSearch(); err != nil {
		return err
	}
	if len(r.ServerTools) > 0 || len(r.APIClientTools) > 0 || r.Plan != nil && len(r.Plan.fields["safeguards"]) > 0 {
		return fmt.Errorf("helper inline history requires ordinary custom client tools")
	}
	for name, definition := range r.InlineTools.Known {
		if definitionFamily(definition) != "custom" || r.Native[name] {
			return fmt.Errorf("helper inline history cannot grant native or provider execution identities")
		}
	}
	return nil
}

// Replay checks the historical discovery against its own public prefix. Never
// let old discovered results populate the current request's searchable set.
func (r *Request) helperInlineHistoryView(after int) (*Request, error) {
	if r.InlineTools == nil {
		return r, nil
	}
	if after < 0 || after >= len(r.Messages) {
		return nil, fmt.Errorf("helper inline boundary missing")
	}
	view := *r
	// compileInlineTools writes only Message.toolCarrier, so own the slice;
	// protocol block objects remain read-only in the existing compiler.
	view.Messages = append([]Message(nil), r.Messages[:after+1]...)
	view.InlineTools = nil
	view.internalCache = nil
	base := make([]any, len(r.InlineTools.Base))
	for i, tool := range r.InlineTools.Base {
		base[i] = tool
	}
	tools, err := parseTools(base, &view.TTL)
	if err != nil {
		return nil, err
	}
	view.Tools = tools
	if err = view.compileInlineTools(r.InlineTools.Base); err != nil {
		return nil, err
	}
	return &view, nil
}

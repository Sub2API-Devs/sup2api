package engine

import "encoding/json"

// Envelope extensions carry observations, not permission to execute new block
// types. Preserving these fields does not enable their corresponding request
// features or change the server's safeguard verdicts.
var responseEnvelopeExtensions = []string{
	"safeguard_results", "input_transformations", "stop_details",
	"context_management", "container", "diagnostics",
}

// copyResponseExtensions snapshots registered fields at either SSE location.
// RawMessage preserves the complete JSON value (including unknown nested keys),
// without sharing mutable maps with events subsequently forwarded to clients.
// A later value replaces the earlier value, including explicit null; the
// protocol does not define these values as patches to concatenate locally.
func copyResponseExtensions(dst, src Object) bool {
	found := false
	for _, name := range responseEnvelopeExtensions {
		if value, exists := src[name]; exists {
			if raw, err := json.Marshal(value); err == nil {
				dst[name] = json.RawMessage(raw)
				found = true
			}
		}
	}
	return found
}

func (p *Prepared) recordFinalResponseStop(event Object) {
	stop := Object{"type": "message_stop"}
	copyResponseExtensions(stop, event)
	p.FinalResponseStop, _ = json.Marshal(stop)
}

func (p *Prepared) finalResponseStop() Object {
	if p != nil && len(p.FinalResponseStop) != 0 {
		if stop, err := decodeObject(p.FinalResponseStop); err == nil {
			return stop
		}
	}
	return Object{"type": "message_stop"}
}

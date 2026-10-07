package engine

import (
	"encoding/json"
	"fmt"
)

// ResponseCheckpoint preserves the final client-visible message independently
// of CLI JSONL. Its envelope fields are observations, not replayable messages.
// ClientHash associates it with an assistant boundary in Snapshot.Hashes;
// NativeAnchor identifies that boundary in the derived CLI transcript.
type ResponseCheckpoint struct {
	ClientHash   string          `json:"client_hash"`
	NativeAnchor string          `json:"native_anchor"`
	MessageID    string          `json:"message_id"`
	Response     json.RawMessage `json:"response"`
}

func cloneResponseCheckpoints(records []ResponseCheckpoint) []ResponseCheckpoint {
	if records == nil {
		return nil
	}
	out := make([]ResponseCheckpoint, len(records))
	for i, record := range records {
		out[i] = record
		out[i].Response = append(json.RawMessage(nil), record.Response...)
	}
	return out
}

func completedResponse(answer Object) error {
	if str(answer, "id") == "" || str(answer, "role") != "assistant" || str(answer, "stop_reason") == "" {
		return fmt.Errorf("cannot commit an incomplete assistant response")
	}
	if str(answer, "stop_reason") == "refusal" || answer["error"] != nil {
		return fmt.Errorf("cannot commit a refused or failed response")
	}
	return nil
}

// Format-2 snapshots without this optional field remain readable. Corrupt or
// misassociated envelopes invalidate a snapshot rather than cross-link history.
func validResponseCheckpoints(s *Snapshot) bool {
	positions := make(map[string]int, len(s.Hashes))
	for i, hash := range s.Hashes {
		positions[hash] = i
	}
	previous := -1
	for _, record := range s.Responses {
		position, exists := positions[record.ClientHash]
		if !exists || position <= previous || (!s.ResponseOnly && record.NativeAnchor == "") || record.MessageID == "" {
			return false
		}
		message, err := decodeObject(record.Response)
		if err != nil || (!s.ResponseOnly && completedResponse(message) != nil) || str(message, "id") != record.MessageID || str(message, "role") != "assistant" || str(message, "stop_reason") == "" || message["error"] != nil {
			return false
		}
		if _, ok := message["content"].([]any); !ok {
			return false
		}
		previous = position
	}
	return true
}

package credits

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

// errCreditStream is the single failure reply for every malformed or
// unsupported stream. Callers never see which check failed.
var errCreditStream = errors.New("invalid or unsupported credit response stream")

// deltaTextFields maps a string delta type to the block field that carries its
// text. deltaBlockTypes maps the same type to the block type it may extend.
var (
	deltaTextFields = map[string]string{
		"text_delta":       "text",
		"thinking_delta":   "thinking",
		"signature_delta":  "signature",
		"compaction_delta": "content",
	}
	deltaBlockTypes = map[string]string{
		"text_delta":       "text",
		"thinking_delta":   "thinking",
		"signature_delta":  "thinking",
		"compaction_delta": "compaction",
	}
)

// creditStream is the incremental state of one Messages response assembled
// from SSE events.
type creditStream struct {
	message  map[string]any
	blocks   []any
	open     int
	input    string
	hasInput bool
	ended    bool
	stopped  bool
}

// MessageFromEvents assembles one completed Messages response for custody
// matching. Inputs may be JSON event payloads or complete SSE frames. It never
// repairs an incomplete stream or discards an unknown content delta.
func MessageFromEvents(events [][]byte) ([]byte, error) {
	stream := &creditStream{open: -1}
	total := 0
	for _, raw := range events {
		total += len(raw)
		if total > MaxBodyBytes {
			return nil, errCreditStream
		}
		payload := bytes.TrimSpace(raw)
		if !bytes.HasPrefix(payload, []byte("{")) {
			var data [][]byte
			for _, line := range bytes.Split(bytes.ReplaceAll(raw, []byte("\r\n"), []byte("\n")), []byte("\n")) {
				if value, ok := bytes.CutPrefix(line, []byte("data:")); ok {
					data = append(data, bytes.TrimSpace(value))
				}
			}
			if len(data) == 0 {
				continue
			}
			payload = bytes.Join(data, []byte("\n"))
		}
		event, err := Object(payload)
		if err != nil {
			return nil, errCreditStream
		}
		if err := stream.apply(event); err != nil {
			return nil, errCreditStream
		}
	}
	if !stream.ended {
		return nil, errCreditStream
	}
	stream.message["content"] = stream.blocks
	return json.Marshal(stream.message)
}

// apply dispatches one decoded event to its handler. Ping frames are ignored;
// any event after message_stop, and any unknown type, fails the stream.
func (s *creditStream) apply(event map[string]any) error {
	typ, _ := event["type"].(string)
	if typ == "ping" {
		return nil
	}
	if s.ended {
		return errCreditStream
	}
	switch typ {
	case "message_start":
		return s.onMessageStart(event)
	case "content_block_start":
		return s.onContentBlockStart(event)
	case "content_block_delta":
		return s.onContentBlockDelta(event)
	case "content_block_stop":
		return s.onContentBlockStop(event)
	case "message_delta":
		return s.onMessageDelta(event)
	case "message_stop":
		return s.onMessageStop(event)
	default:
		return errCreditStream
	}
}

func (s *creditStream) onMessageStart(event map[string]any) error {
	if s.message != nil {
		return errCreditStream
	}
	s.message, _ = event["message"].(map[string]any)
	if s.message == nil || s.message["type"] != "message" || s.message["role"] != "assistant" {
		return errCreditStream
	}
	if id, ok := s.message["id"].(string); !ok || id == "" {
		return errCreditStream
	}
	initial, ok := s.message["content"].([]any)
	if !ok || len(initial) != 0 {
		return errCreditStream
	}
	return nil
}

func (s *creditStream) onContentBlockStart(event map[string]any) error {
	if s.message == nil || s.open != -1 || s.stopped {
		return errCreditStream
	}
	index, ok := eventIndex(event)
	if !ok || index != len(s.blocks) {
		return errCreditStream
	}
	block, ok := event["content_block"].(map[string]any)
	if !ok {
		return errCreditStream
	}
	if name, ok := block["type"].(string); !ok || name == "" {
		return errCreditStream
	}
	if block["type"] == "tool_use" || block["type"] == "server_tool_use" || block["type"] == "mcp_tool_use" {
		if input, ok := block["input"].(map[string]any); !ok || input == nil {
			return errCreditStream
		}
	}
	s.blocks = append(s.blocks, block)
	s.open = index
	s.input = ""
	s.hasInput = false
	return nil
}

func (s *creditStream) onContentBlockDelta(event map[string]any) error {
	index, ok := eventIndex(event)
	if !ok || index != s.open || s.open < 0 || s.stopped {
		return errCreditStream
	}
	delta, ok := event["delta"].(map[string]any)
	if !ok {
		return errCreditStream
	}
	block := s.blocks[s.open].(map[string]any)
	kind, _ := delta["type"].(string)
	switch kind {
	case "text_delta", "thinking_delta", "signature_delta", "compaction_delta":
		return s.onStringDelta(block, delta, kind)
	case "citations_delta":
		return s.onCitationDelta(block, delta)
	case "input_json_delta":
		return s.onInputJSONDelta(block, delta)
	default:
		return errCreditStream
	}
}

// onStringDelta appends a text-like delta to the open block. signature_delta
// replaces the signature instead of appending.
func (s *creditStream) onStringDelta(block, delta map[string]any, kind string) error {
	key, expected := deltaTextFields[kind], deltaBlockTypes[kind]
	if block["type"] != expected || !validStringDeltaFields(delta, kind, key) {
		return errCreditStream
	}
	part, ok := delta[key].(string)
	if !ok {
		return errCreditStream
	}
	previous := ""
	if value, exists := block[key]; exists {
		previous, ok = value.(string)
		if !ok {
			return errCreditStream
		}
	}
	if kind == "compaction_delta" {
		if sig, exists := block["signature"]; exists && sig != "" {
			return errCreditStream
		}
	}
	if kind == "signature_delta" {
		block[key] = part
	} else {
		block[key] = previous + part
	}
	return nil
}

func (s *creditStream) onCitationDelta(block, delta map[string]any) error {
	if block["type"] != "text" || len(delta) != 2 {
		return errCreditStream
	}
	citation, ok := delta["citation"].(map[string]any)
	if !ok {
		return errCreditStream
	}
	citations := []any{}
	if value, exists := block["citations"]; exists {
		citations, ok = value.([]any)
		if !ok {
			return errCreditStream
		}
	}
	block["citations"] = append(citations, citation)
	return nil
}

func (s *creditStream) onInputJSONDelta(block, delta map[string]any) error {
	if block["type"] != "tool_use" && block["type"] != "server_tool_use" && block["type"] != "mcp_tool_use" {
		return errCreditStream
	}
	part, ok := delta["partial_json"].(string)
	if !ok || len(delta) != 2 {
		return errCreditStream
	}
	s.input += part
	s.hasInput = s.hasInput || part != ""
	return nil
}

func (s *creditStream) onContentBlockStop(event map[string]any) error {
	index, ok := eventIndex(event)
	if !ok || index != s.open || s.open < 0 {
		return errCreditStream
	}
	if s.hasInput {
		parsed, err := Object([]byte(s.input))
		if err != nil {
			return errCreditStream
		}
		s.blocks[s.open].(map[string]any)["input"] = parsed
	}
	s.open = -1
	return nil
}

func (s *creditStream) onMessageDelta(event map[string]any) error {
	if s.message == nil || s.open != -1 {
		return errCreditStream
	}
	delta, ok := event["delta"].(map[string]any)
	if !ok {
		return errCreditStream
	}
	if reason, exists := delta["stop_reason"]; exists && reason != nil && reason != "" {
		if s.stopped {
			return errCreditStream
		}
		if _, ok := reason.(string); !ok {
			return errCreditStream
		}
		s.stopped = true
	}
	if err := mergeCreditFacts(s.message, delta); err != nil {
		return errCreditStream
	}
	if usage, exists := event["usage"]; exists {
		incoming, ok := usage.(map[string]any)
		if !ok {
			return errCreditStream
		}
		current, _ := s.message["usage"].(map[string]any)
		if current == nil {
			current = map[string]any{}
		}
		for key, value := range incoming {
			current[key] = value
		}
		s.message["usage"] = current
	}
	for key, value := range event {
		if key != "type" && key != "delta" && key != "usage" {
			if err := mergeCreditFacts(s.message, map[string]any{key: value}); err != nil {
				return errCreditStream
			}
		}
	}
	return nil
}

func (s *creditStream) onMessageStop(event map[string]any) error {
	if s.message == nil || s.open != -1 || !s.stopped {
		return errCreditStream
	}
	s.ended = true
	for key, value := range event {
		if key != "type" {
			if err := mergeCreditFacts(s.message, map[string]any{key: value}); err != nil {
				return errCreditStream
			}
		}
	}
	return nil
}

// estimated_tokens is a per-frame display hint, never response content or
// billable usage. Retain a closed field set for every other delta variant.
func validStringDeltaFields(delta map[string]any, kind, key string) bool {
	for field, value := range delta {
		if field == "type" || field == key {
			continue
		}
		if field != "estimated_tokens" || kind != "thinking_delta" {
			return false
		}
		if value == nil {
			continue
		}
		n, ok := value.(json.Number)
		if !ok || !nonnegativeInteger(n.String()) {
			return false
		}
	}
	return true
}

func nonnegativeInteger(value string) bool {
	if value == "-0" {
		return true
	}
	if value == "" {
		return false
	}
	for _, c := range value {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
func eventIndex(event map[string]any) (int, bool) {
	value, ok := event["index"].(json.Number)
	if !ok {
		return 0, false
	}
	n, err := value.Int64()
	return int(n), err == nil && n >= 0 && n <= 1<<20
}
func mergeCreditFacts(message, delta map[string]any) error {
	for key, value := range delta {
		switch key {
		case "id", "type", "model", "role", "content", "usage":
			return fmt.Errorf("response identity overwrite")
		}
		if strings.HasPrefix(key, "stop_") && value == nil {
			if message[key] != nil {
				continue
			}
		}
		message[key] = value
	}
	return nil
}

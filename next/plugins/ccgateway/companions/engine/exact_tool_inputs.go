package engine

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"
)

// jsNumberView models JSON.parse/stringify only inside tool JSON values. It is
// never used to rewrite client fingerprints, text, IDs, names, or signatures.
func jsNumberView(value any) any {
	switch v := value.(type) {
	case json.Number:
		f, _ := strconv.ParseFloat(string(v), 64)
		if math.IsInf(f, 0) || math.IsNaN(f) {
			return nil
		}
		if f == 0 {
			return float64(0)
		}
		return f
	case map[string]any:
		out := Object{}
		for k, x := range v {
			out[k] = jsNumberView(x)
		}
		return out
	case []any:
		out := make([]any, len(v))
		for i, x := range v {
			out[i] = jsNumberView(x)
		}
		return out
	default:
		return value
	}
}

type exactToolCapture struct{ block Object }

func (o *apiTerminalObserver) observeExactToolInput(event Object) {
	if str(event, "type") == "message_start" {
		message, _ := event["message"].(Object)
		o.exactToolMessageID = str(message, "id")
		return
	}
	if o.exactToolMessageID == "" || str(event, "type") != "content_block_start" {
		return
	}
	block, _ := event["content_block"].(Object)
	if exactNumericField(block) == "" {
		return
	}
	index, ok := integer(event["index"])
	if !ok {
		return
	}
	copy, err := jsonCopyObject(block)
	if err != nil {
		return
	}
	o.relay.mu.Lock()
	defer o.relay.mu.Unlock()
	if o.relay.exactToolInputs == nil {
		o.relay.exactToolInputs = map[string]map[int]exactToolCapture{}
	}
	if o.relay.exactToolInputs[o.exactToolMessageID] == nil {
		o.relay.exactToolInputs[o.exactToolMessageID] = map[int]exactToolCapture{}
	}
	o.relay.exactToolInputs[o.exactToolMessageID][index] = exactToolCapture{block: copy}
}

func (s *cliSession) restoreExactToolStart(event Object) error {
	if s.relay == nil || s.acc.Message == nil || str(event, "type") != "content_block_start" {
		return nil
	}
	block, _ := event["content_block"].(Object)
	field := exactNumericField(block)
	if field == "" {
		return nil
	}
	index, ok := integer(event["index"])
	if !ok {
		return fmt.Errorf("invalid exact tool event index")
	}
	s.relay.mu.Lock()
	byIndex := s.relay.exactToolInputs[str(s.acc.Message, "id")]
	capture, found := byIndex[index]
	if found {
		delete(byIndex, index)
	}
	if len(byIndex) == 0 {
		delete(s.relay.exactToolInputs, str(s.acc.Message, "id"))
	}
	s.relay.mu.Unlock()
	if !found {
		return nil
	}
	// Match the entire block except the one known JS numeric projection. This
	// binds source input to the authenticated message/index/ID/name boundary.
	expected, _ := jsonCopyObject(capture.block)
	actual, _ := jsonCopyObject(block)
	expected[field] = jsNumberView(expected[field])
	actual[field] = jsNumberView(actual[field])
	if digest(expected) != digest(actual) {
		return fmt.Errorf("CLI tool start changed beyond JSON numeric representation")
	}
	block[field] = capture.block[field]
	if field == "tools" {
		s.p.APIResponseComplete = true
	}
	if input, ok := capture.block["input"].(Object); ok && len(input) > 0 {
		// CLI can preserve the event but omit initial input from its native
		// assistant row. Reuse the terminal checkpoint content verification;
		// never resume a native row that disagrees with the returned answer.
		s.p.APIResponseComplete = true
	}
	return nil
}

// Stage authoritative client tool inputs before other narrowly defined history
// repairs. The caller MUST verify the complete history after all those repairs;
// no partly aligned body is allowed to leave the relay.
func (r *Request) restoreExactToolHistoryInputs(body Object) (bool, error) {
	expected := map[string]Object{}
	listings := map[string][]Object{}
	listingAt := map[string]int{}
	for _, message := range r.Messages {
		for _, block := range r.wireMessage(message).Content {
			if str(block, "type") == "mcp_tool_listing" {
				name := str(block, "mcp_server_name")
				listings[name] = append(listings[name], block)
				continue
			}
			if exactToolBlock(block) {
				id := str(block, "id")
				if expected[id] != nil {
					return false, fmt.Errorf("ambiguous historical tool ID")
				}
				expected[id] = block
			}
		}
	}
	// Listings have no call ID. Their per-server ordinal is only a candidate;
	// always require the caller's full history alignment, even with exact numbers.
	changed := len(listings) > 0
	messages, _ := body["messages"].([]any)
	for _, value := range messages {
		message, _ := value.(Object)
		if str(message, "role") != "assistant" {
			continue
		}
		blocks, err := historyContent(message["content"])
		if err != nil {
			return false, err
		}
		for _, block := range blocks {
			field := exactNumericField(block)
			if field == "" {
				continue
			}
			want := expected[str(block, "id")]
			if field == "tools" {
				name := str(block, "mcp_server_name")
				candidates := listings[name]
				if len(candidates) == 0 {
					return false, fmt.Errorf("MCP listing server is absent from client history")
				}
				at := listingAt[name]
				if at >= len(candidates) {
					return false, fmt.Errorf("unexpected repeated MCP listing")
				}
				want = candidates[at]
				listingAt[name]++
			}
			if want == nil || str(want, "type") != str(block, "type") || str(want, "name") != str(block, "name") {
				continue
			}
			if digest(want[field]) == digest(block[field]) {
				continue
			}
			if digest(jsNumberView(want[field])) != digest(jsNumberView(block[field])) {
				return false, fmt.Errorf("historical tool input changed beyond JSON numeric representation")
			}
			copied, err := jsonCopyObject(want)
			if err != nil {
				return false, err
			}
			block[field] = copied[field]
			changed = true
		}
	}
	return changed, nil
}

func (r *Request) hasExactToolSchema() bool {
	for _, tool := range r.Tools {
		if digest(tool.Schema) != digest(jsNumberView(tool.Schema)) {
			return true
		}
	}
	return false
}

// These protocol calls all carry JSON input through the same CLI numeric boundary.
func exactToolBlock(block Object) bool {
	switch str(block, "type") {
	case "tool_use", "server_tool_use", "mcp_tool_use":
		return true
	default:
		return false
	}
}

// Only registered protocol JSON payloads get a numeric projection. Control
// fields, server identity, names, descriptions and schema strings stay exact.
func exactNumericField(block Object) string {
	if exactToolBlock(block) {
		return "input"
	}
	if str(block, "type") == "mcp_tool_listing" {
		return "tools"
	}
	return ""
}

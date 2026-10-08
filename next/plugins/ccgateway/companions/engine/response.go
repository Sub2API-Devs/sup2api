package engine

import (
	"encoding/json"
	"fmt"
)

type Accumulator struct {
	Message               Object
	Blocks                []Object
	Inputs                map[int]string
	Closed                map[int]bool
	Stopped               bool
	Done                  bool
	Bytes                 int
	Structured            map[int]bool
	HasClientTool         bool
	serverCalls           *serverToolLedger
	discoveredInlineTools map[string]bool
}

func integer(v any) (int, bool) {
	switch n := v.(type) {
	case json.Number:
		i, e := n.Int64()
		return int(i), e == nil && i >= 0 && i < 100000
	case int:
		return n, n >= 0 && n < 100000
	case float64:
		return int(n), n >= 0 && n < 100000 && n == float64(int(n))
	}
	return 0, false
}
func (a *Accumulator) push(e Object, r *Request) error {
	b, _ := json.Marshal(e)
	a.Bytes += len(b)
	if a.Bytes > 64<<20 {
		return fmt.Errorf("model response exceeds 64 MiB")
	}
	if a.Done {
		return fmt.Errorf("event after message_stop")
	}
	typ := str(e, "type")
	if typ == "ping" {
		return nil
	}
	if typ == "error" {
		return fmt.Errorf("upstream stream error")
	}
	if typ == "message_start" {
		var err error
		a.serverCalls, err = r.serverHistoryLedger()
		if err != nil {
			return err
		}
		return a.start(e)
	}
	if a.Message == nil {
		return fmt.Errorf("event before message_start")
	}
	switch typ {
	case "content_block_start":
		return a.blockStart(e, r)
	case "content_block_delta":
		return a.blockDelta(e)
	case "content_block_stop":
		return a.blockStop(e)
	case "message_delta":
		return a.messageDelta(e)
	case "message_stop":
		if !a.Stopped || len(a.Closed) != len(a.Blocks) {
			return fmt.Errorf("incomplete model message")
		}
		if r.verifiedCreditRefusal(a.Message) {
			a.serverCalls.abandonCurrentTurn()
		}
		if err := a.serverCalls.complete(str(a.Message, "stop_reason"), a.HasClientTool); err != nil {
			return err
		}
		copyResponseExtensions(a.Message, e)
		a.Message["content"] = a.Blocks
		a.Done = true
		return nil
	}
	return fmt.Errorf("unsupported stream event %q", typ)
}
func (a *Accumulator) start(e Object) error {
	if a.Message != nil {
		return fmt.Errorf("multiple model messages")
	}
	m, ok := e["message"].(map[string]any)
	if !ok || str(m, "id") == "" || str(m, "role") != "assistant" {
		return fmt.Errorf("invalid message_start")
	}
	a.Message = Object{}
	for k, v := range m {
		a.Message[k] = v
	}
	copyResponseExtensions(a.Message, m)
	copyResponseExtensions(a.Message, e)
	a.Inputs = map[int]string{}
	a.Structured = map[int]bool{}
	a.Closed = map[int]bool{}
	a.Blocks = []Object{}
	return nil
}

// blockStart turns the CLI's StructuredOutput tool into a text block and a
// client tool's wire name back into its client name.
func (a *Accumulator) blockStart(e Object, r *Request) error {
	if a.serverCalls == nil {
		var err error
		a.serverCalls, err = r.serverHistoryLedger()
		if err != nil {
			return err
		}
	}
	i, ok := integer(e["index"])
	block, ok2 := e["content_block"].(map[string]any)
	if !ok || !ok2 || i != len(a.Blocks) || a.Stopped {
		return fmt.Errorf("invalid block start")
	}
	if i > 0 && !a.Closed[i-1] {
		return fmt.Errorf("overlapping blocks")
	}
	if str(block, "type") == "tool_use" && structuredBlock(str(block, "name"), r) {
		a.Structured[i] = true
		block = Object{"type": "text", "text": ""}
		e["content_block"] = block
	}
	switch str(block, "type") {
	case "mcp_tool_use", "mcp_tool_result", "mcp_tool_listing":
		if err := checkMCPBlock(block, "assistant"); err != nil {
			return err
		}
		if err := a.serverCalls.accept(block, r); err != nil {
			return err
		}
	case "fallback":
		if err := checkFallbackBlock(block, "assistant"); err != nil {
			return err
		}
		if err := a.serverCalls.accept(block, r); err != nil {
			return err
		}
	case "text":
		if err := checkCitations(block["citations"]); err != nil {
			return err
		}
	case "compaction":
		if err := checkCompactionBlock(block, "assistant", true); err != nil {
			return err
		}
	case "thinking", "redacted_thinking":
	case "server_tool_use":
		view := a.inlineResponseView(r)
		if view.NoTools || !view.hasServerSearch(str(block, "name")) || str(block, "id") == "" {
			return fmt.Errorf("model requested an undeclared server search tool")
		}
		if err := a.serverCalls.accept(block, view); err != nil {
			return err
		}
	case "tool_search_tool_result", "web_search_tool_result", "web_fetch_tool_result", "advisor_tool_result", "code_execution_tool_result", "bash_code_execution_tool_result", "text_editor_code_execution_tool_result":
		if err := checkServerSearchBlock(block, "assistant"); err != nil {
			return err
		}
		if err := a.serverCalls.accept(block, r); err != nil {
			return err
		}
		if str(block, "type") == "tool_search_tool_result" {
			var err error
			block, err = mapSearchReferences(block, func(name string) string {
				return r.searchReferenceNameAt(name, true, a.serverCalls.mcpSearchTimeline(r))
			})
			if err != nil {
				return err
			}
			if err := r.validateInlineSearchDiscovery(block); err != nil {
				return err
			}
			a.rememberInlineSearch(block)
		}
		e["content_block"] = block
	case "tool_use":
		if err := checkToolUse(block, "assistant"); err != nil {
			return err
		}
		if err := a.serverCalls.accept(block, r); err != nil {
			return err
		}
		name := a.inlineResponseView(r).apiResponseToolName(block)
		if name == "" {
			return fmt.Errorf("model requested an undeclared tool")
		}
		block["name"] = name
		a.HasClientTool = true
	default:
		return fmt.Errorf("unsupported response block")
	}
	copy := Object{}
	for k, v := range block {
		copy[k] = v
	}
	a.Blocks = append(a.Blocks, copy)
	return nil
}

// clientToolName is the declared tool with this wire name, or "".
func clientToolName(r *Request, wire string) string {
	if r.NoTools {
		return ""
	}
	for _, t := range r.Tools {
		if r.wireName(t.Name) == wire {
			return t.Name
		}
	}
	return ""
}
func (a *Accumulator) blockDelta(e Object) error {
	i, ok := integer(e["index"])
	d, ok2 := e["delta"].(map[string]any)
	if !ok || !ok2 || i >= len(a.Blocks) || a.Closed[i] || a.Stopped {
		return fmt.Errorf("invalid block delta")
	}
	block := a.Blocks[i]
	if str(d, "type") == "input_json_delta" {
		if _, ok := d["partial_json"].(string); !ok {
			return fmt.Errorf("invalid tool input delta")
		}
	}
	if a.Structured[i] && str(d, "type") == "input_json_delta" {
		d = Object{"type": "text_delta", "text": str(d, "partial_json")}
		e["delta"] = d
	}
	switch str(d, "type") {
	case "citations_delta":
		if str(block, "type") != "text" {
			return fmt.Errorf("citation delta on nontext block")
		}
		if err := checkCitation(d["citation"]); err != nil {
			return err
		}
		citations, _ := block["citations"].([]any)
		block["citations"] = append(citations, d["citation"])
	case "text_delta":
		if str(block, "type") != "text" {
			return fmt.Errorf("text delta on nontext block")
		}
		block["text"] = str(block, "text") + str(d, "text")
	case "compaction_delta":
		if str(block, "type") != "compaction" || str(block, "signature") != "" {
			return fmt.Errorf("compaction delta on wrong or signed block")
		}
		value, ok := d["content"].(string)
		if !ok {
			return fmt.Errorf("invalid compaction delta")
		}
		block["content"] = str(block, "content") + value
	case "thinking_delta":
		if str(block, "type") != "thinking" {
			return fmt.Errorf("thinking delta on wrong block")
		}
		block["thinking"] = str(block, "thinking") + str(d, "thinking")
	case "signature_delta":
		if str(block, "type") != "thinking" {
			return fmt.Errorf("signature on wrong block")
		}
		signature, ok := d["signature"].(string)
		if !ok {
			return fmt.Errorf("invalid signature delta")
		}
		block["signature"] = signature
	case "input_json_delta":
		if str(block, "type") != "tool_use" && str(block, "type") != "server_tool_use" && str(block, "type") != "mcp_tool_use" {
			return fmt.Errorf("input delta on wrong block")
		}
		part, ok := d["partial_json"].(string)
		if !ok {
			return fmt.Errorf("invalid tool input delta")
		}
		if part != "" {
			a.Inputs[i] += part
		}
	default:
		return fmt.Errorf("unsupported response delta")
	}
	return nil
}
func (a *Accumulator) blockStop(e Object) error {
	i, ok := integer(e["index"])
	if !ok || i >= len(a.Blocks) || a.Closed[i] || a.Stopped {
		return fmt.Errorf("invalid block stop")
	}
	if s, exists := a.Inputs[i]; exists {
		input, err := decodeObject([]byte(s))
		if err != nil {
			return fmt.Errorf("invalid tool input JSON")
		}
		a.Blocks[i]["input"] = input
	}
	if str(a.Blocks[i], "type") == "server_tool_use" {
		if err := checkServerSearchBlock(a.Blocks[i], "assistant"); err != nil {
			return err
		}
	}
	a.Closed[i] = true
	return nil
}
func (a *Accumulator) messageDelta(e Object) error {
	if len(a.Closed) != len(a.Blocks) {
		return fmt.Errorf("message delta before blocks closed")
	}
	d, ok := e["delta"].(map[string]any)
	if !ok {
		return fmt.Errorf("invalid message delta")
	}
	stop := str(d, "stop_reason")
	if a.Stopped && stop != "" {
		return fmt.Errorf("multiple terminal message deltas")
	}
	// Some response observations arrive before or after the terminal stop
	// reason. Keep them until message_stop instead of cutting off verdicts.
	extensions := Object{}
	hasExtensions := copyResponseExtensions(extensions, d)
	hasExtensions = copyResponseExtensions(extensions, e) || hasExtensions
	_, hasUsage := e["usage"].(map[string]any)
	if stop == "" && !hasExtensions && !hasUsage {
		return fmt.Errorf("message delta has no stop reason, usage or registered extension")
	}
	if len(a.Structured) > 0 && !a.HasClientTool && str(d, "stop_reason") == "tool_use" {
		d["stop_reason"] = "end_turn"
	}
	for k, v := range d {
		if stop == "" && (k == "stop_reason" || k == "stop_sequence") {
			continue
		}
		a.Message[k] = v
	}
	for k, v := range extensions {
		a.Message[k] = v
	}
	if u, ok := e["usage"].(map[string]any); ok {
		usage, _ := a.Message["usage"].(map[string]any)
		if usage == nil {
			usage = Object{}
		}
		for k, v := range u {
			usage[k] = v
		}
		a.Message["usage"] = usage
	}
	if stop != "" {
		a.Stopped = true
	}
	return nil
}

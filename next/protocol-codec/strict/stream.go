package strict

import (
	"encoding/json"
	"fmt"
	"time"
)

type streamBlock struct {
	block     object
	open      bool
	args      string
	hasArgs   bool
	toolIndex int
}
type Stream struct {
	p            *Plan
	m            object
	blocks       []*streamBlock
	created      int64
	seq, tools   int
	done, failed bool
	reason       string
	pending      []Event
	buffered     int
}

// Converted streams are buffered until the terminal reason is known, because
// Anthropic may classify already-emitted text as refusal only at message_delta.
// Native Anthropic streaming does not use this adapter.
const MaxStreamBufferBytes = 32 << 20

func (p *Plan) NewStream() *Stream { return &Stream{p: p, created: time.Now().Unix()} }
func (s *Stream) emit(name string, o object) []Event {
	if s.p.protocol == "openai.responses" {
		o["sequence_number"] = s.seq
		s.seq++
	}
	b, _ := json.Marshal(o)
	return []Event{{Name: name, Data: b}}
}
func (s *Stream) chat(delta object, finish, usage any) []Event {
	choices := []any{}
	if delta != nil {
		choices = append(choices, object{"index": 0, "delta": delta, "finish_reason": finish})
	}
	o := object{"id": s.m["id"], "object": "chat.completion.chunk", "created": s.created, "model": s.m["model"], "choices": choices}
	if usage != nil {
		o["usage"] = usage
	}
	return s.emit("", o)
}

// streamItemID is the single definition of the Responses item id this adapter
// mints for output index i of the message id. Both the streamed events and the
// buffered response use it so a client can correlate them.
func streamItemID(id any, index int) string { return fmt.Sprintf("%s_item_%d", id, index) }

func (s *Stream) itemID(i int) string { return streamItemID(s.m["id"], i) }
func (s *Stream) partEvent(name string, i int, fields object) []Event {
	o := object{"type": name, "item_id": s.itemID(i), "output_index": i}
	for k, v := range fields {
		o[k] = v
	}
	return s.emit(name, o)
}
func (s *Stream) Event(ev Event) (events []Event, err error) {
	if s.failed || s.done {
		return nil, fail("stream", "event after failure or terminal")
	}
	s.buffered += len(ev.Data)
	if s.buffered > MaxStreamBufferBytes {
		s.failed = true
		s.pending = nil
		return nil, fail("stream", "conversion buffer exceeds 32 MiB")
	}
	events, err = s.process(ev)
	if err != nil {
		s.pending = nil
		return nil, err
	}
	if s.failed {
		s.pending = nil
		return events, nil
	}
	for _, e := range events {
		s.buffered += len(e.Data) + len(e.Name)
	}
	if s.buffered > MaxStreamBufferBytes {
		s.failed = true
		s.pending = nil
		return nil, fail("stream", "conversion buffer exceeds 32 MiB")
	}
	s.pending = append(s.pending, events...)
	if !s.done {
		return nil, nil
	}
	if s.reason == "refusal" {
		s.pending = nil
		return s.refusalEvents()
	}
	out := s.pending
	s.pending = nil
	return out, nil
}

// process validates one upstream SSE event and dispatches it to the handler for
// its type. Handlers own their event's conversion; process keeps the terminal
// guards and the single place that marks the stream failed on error.
func (s *Stream) process(ev Event) (events []Event, err error) {
	if s.failed || s.done {
		return nil, fail("stream", "event after failure or terminal")
	}
	defer func() {
		if err != nil {
			s.failed = true
		}
	}()
	o, e := decodeObject(ev.Data, "stream")
	if e != nil {
		return nil, e
	}
	typ, e := requiredString(o, "type", "stream")
	if e != nil {
		return nil, e
	}
	if ev.Name != "" && ev.Name != typ {
		return nil, fail("stream", "event name/type mismatch")
	}
	switch typ {
	case "ping":
		return nil, keys(o, "ping", "type")
	case "error":
		return s.handleError(o)
	case "message_start":
		return s.handleMessageStart(o)
	case "content_block_start":
		return s.handleContentBlockStart(o)
	case "content_block_delta":
		return s.handleContentBlockDelta(o)
	case "content_block_stop":
		return s.handleContentBlockStop(o)
	case "message_delta":
		return s.handleMessageDelta(o)
	case "message_stop":
		return s.handleMessageStop(o)
	default:
		return nil, fail("stream.type", "unsupported event")
	}
}

func (s *Stream) handleError(o object) ([]Event, error) {
	s.failed = true
	details, err := asObject(o["error"], "stream.error")
	if err != nil {
		return nil, err
	}
	if _, err = requiredString(details, "type", "stream.error"); err != nil {
		return nil, err
	}
	if _, err = requiredString(details, "message", "stream.error"); err != nil {
		return nil, err
	}
	return s.emit("error", object{"type": "error", "error": o["error"]}), nil
}

func (s *Stream) handleMessageStart(o object) ([]Event, error) {
	if s.m != nil {
		return nil, fail("stream", "duplicate start")
	}
	if err := keys(o, "start", "type", "message"); err != nil {
		return nil, err
	}
	m, err := asObject(o["message"], "start.message")
	if err != nil {
		return nil, err
	}
	if m["type"] != "message" || m["role"] != "assistant" {
		return nil, fail("start.message", "expected assistant message")
	}
	for _, key := range []string{"id", "model"} {
		if _, err = requiredString(m, key, "start.message"); err != nil {
			return nil, err
		}
	}
	a, err := list(m["content"], "start.content")
	if err != nil || len(a) != 0 {
		return nil, fail("start.content", "expected empty content")
	}
	if _, err = validatedUsage(m["usage"]); err != nil {
		return nil, err
	}
	s.m = m
	if s.p.protocol == "openai.chat" {
		return s.chat(object{"role": "assistant"}, nil, nil), nil
	}
	return s.emit("response.created", object{"type": "response.created", "response": object{"id": m["id"], "object": "response", "created_at": s.created, "model": m["model"], "status": "in_progress", "output": []any{}}}), nil
}

func (s *Stream) handleContentBlockStart(o object) ([]Event, error) {
	if s.m == nil || s.reason != "" {
		return nil, fail("stream", "block outside message")
	}
	if err := keys(o, "block_start", "type", "index", "content_block"); err != nil {
		return nil, err
	}
	i, err := integer(o["index"], "index", 0, 100000)
	if err != nil || int(i) != len(s.blocks) {
		return nil, fail("index", "nonsequential block")
	}
	b, err := asObject(o["content_block"], "block")
	if err != nil {
		return nil, err
	}
	if b["type"] == "thinking" {
		if err = keys(b, "block", "type", "thinking", "signature"); err != nil {
			return nil, err
		}
		if _, ok := b["thinking"].(string); !ok {
			return nil, fail("block.thinking", "expected string")
		}
		if _, err = optionalString(b, "signature", "block"); err != nil {
			return nil, err
		}
	} else if err = validateOutputBlock(b, "block"); err != nil {
		return nil, err
	}
	if s.p.protocol == "openai.chat" && (b["type"] == "thinking" || b["type"] == "redacted_thinking") {
		return nil, fail("block", "Chat cannot preserve signed reasoning; use Responses")
	}
	sb := &streamBlock{block: b, open: true, toolIndex: s.tools}
	if b["type"] == "tool_use" {
		s.tools++
	}
	s.blocks = append(s.blocks, sb)
	return s.start(int(i), sb), nil
}

func (s *Stream) handleContentBlockDelta(o object) ([]Event, error) {
	if err := keys(o, "block_delta", "type", "index", "delta"); err != nil {
		return nil, err
	}
	i, b, err := s.open(o)
	if err != nil {
		return nil, err
	}
	d, err := asObject(o["delta"], "delta")
	if err != nil {
		return nil, err
	}
	return s.delta(i, b, d)
}

func (s *Stream) handleContentBlockStop(o object) ([]Event, error) {
	if err := keys(o, "block_stop", "type", "index"); err != nil {
		return nil, err
	}
	i, b, err := s.open(o)
	if err != nil {
		return nil, err
	}
	if b.hasArgs {
		a, err := decodeObject([]byte(b.args), "tool.arguments")
		if err != nil {
			return nil, err
		}
		b.block["input"] = a
	}
	if err = validateOutputBlock(b.block, "block"); err != nil {
		return nil, err
	}
	b.open = false
	return s.stop(i, b)
}

func (s *Stream) handleMessageDelta(o object) ([]Event, error) {
	if s.m == nil || s.reason != "" {
		return nil, fail("message_delta", "unexpected delta")
	}
	for _, b := range s.blocks {
		if b.open {
			return nil, fail("message_delta", "open block")
		}
	}
	d, err := asObject(o["delta"], "message_delta.delta")
	if err != nil {
		return nil, err
	}
	s.reason, err = requiredString(d, "stop_reason", "message_delta.delta")
	if err != nil {
		return nil, err
	}
	s.m["stop_reason"] = s.reason
	if err = s.mergeFacts(d); err != nil {
		return nil, err
	}
	for k, v := range o {
		if k != "type" && k != "delta" && k != "usage" {
			if err = s.mergeFacts(object{k: v}); err != nil {
				return nil, err
			}
		}
	}
	if v, ok := d["stop_sequence"]; ok {
		s.m["stop_sequence"] = v
	}
	u, err := asObject(o["usage"], "message_delta.usage")
	if err != nil {
		return nil, err
	}
	prior := s.m["usage"].(object)
	for k, v := range u {
		prior[k] = v
	}
	if _, err = validatedUsage(prior); err != nil {
		return nil, err
	}
	return nil, nil
}

func (s *Stream) handleMessageStop(o object) ([]Event, error) {
	if s.m == nil || s.reason == "" {
		return nil, fail("message_stop", "missing terminal reason")
	}
	for k, v := range o {
		if k != "type" {
			if err := s.mergeFacts(object{k: v}); err != nil {
				return nil, err
			}
		}
	}
	a := []any{}
	for _, b := range s.blocks {
		if b.open {
			return nil, fail("message_stop", "open block")
		}
		a = append(a, b.block)
	}
	s.m["content"] = a
	result, err := s.p.response(s.m, s.created)
	if err != nil {
		return nil, err
	}
	s.done = true
	if s.p.protocol == "openai.chat" {
		finish := result["choices"].([]any)[0].(object)["finish_reason"]
		out := s.chatFinal(finish, result["provider_details"])
		if s.p.includeUsage {
			out = append(out, s.chat(nil, nil, result["usage"])...)
		}
		return append(out, Event{Data: []byte("[DONE]")}), nil
	}
	name := "response.completed"
	if result["status"] == "incomplete" {
		name = "response.incomplete"
	}
	return s.emit(name, object{"type": name, "response": result}), nil
}
func (s *Stream) Flush() ([]Event, error) {
	if s.failed || !s.done {
		return nil, fail("stream", "upstream ended without successful message_stop")
	}
	return nil, nil
}
func (s *Stream) open(o object) (int, *streamBlock, error) {
	if s.m == nil || s.reason != "" {
		return 0, nil, fail("stream", "no active message")
	}
	i, e := integer(o["index"], "index", 0, int64(len(s.blocks)-1))
	if e != nil {
		return 0, nil, e
	}
	b := s.blocks[int(i)]
	if !b.open {
		return 0, nil, fail("block", "already closed")
	}
	return int(i), b, nil
}
func (s *Stream) start(i int, b *streamBlock) []Event {
	typ := b.block["type"]
	if s.p.protocol == "openai.chat" {
		if typ == "text" {
			return s.chat(object{"content": b.block["text"]}, nil, nil)
		}
		return s.chat(object{"tool_calls": []any{object{"index": b.toolIndex, "id": b.block["id"], "type": "function", "function": object{"name": b.block["name"], "arguments": ""}}}}, nil, nil)
	}
	item := object{"id": s.itemID(i), "type": "reasoning", "summary": []any{}}
	switch typ {
	case "text":
		item = object{"id": s.itemID(i), "type": "message", "role": "assistant", "status": "in_progress", "content": []any{}}
	case "tool_use":
		item = object{"id": s.itemID(i), "type": "function_call", "call_id": b.block["id"], "name": b.block["name"], "arguments": "", "status": "in_progress"}
	}
	out := s.emit("response.output_item.added", object{"type": "response.output_item.added", "output_index": i, "item": item})
	if typ == "text" {
		out = append(out, s.partEvent("response.content_part.added", i, object{"content_index": 0, "part": object{"type": "output_text", "text": "", "annotations": []any{}}})...)
		if t := b.block["text"].(string); t != "" {
			out = append(out, s.partEvent("response.output_text.delta", i, object{"content_index": 0, "delta": t})...)
		}
	}
	if typ == "thinking" {
		out = append(out, s.partEvent("response.reasoning_summary_part.added", i, object{"summary_index": 0, "part": object{"type": "summary_text", "text": ""}})...)
		if t := b.block["thinking"].(string); t != "" {
			out = append(out, s.partEvent("response.reasoning_summary_text.delta", i, object{"summary_index": 0, "delta": t})...)
		}
	}
	return out
}
func (s *Stream) delta(i int, b *streamBlock, d object) ([]Event, error) {
	field, block, event := "", "", ""
	switch d["type"] {
	case "text_delta":
		field = "text"
		block = "text"
		event = "response.output_text.delta"
	case "input_json_delta":
		field = "partial_json"
		block = "tool_use"
		event = "response.function_call_arguments.delta"
	case "thinking_delta":
		field = "thinking"
		block = "thinking"
		event = "response.reasoning_summary_text.delta"
	case "signature_delta":
		field = "signature"
		block = "thinking"
	default:
		return nil, fail("delta.type", "unsupported delta")
	}
	if b.block["type"] != block {
		return nil, fail("delta", "wrong block type")
	}
	fields := []string{"type", field}
	if field == "thinking" {
		fields = append(fields, "estimated_tokens")
		if !validThinkingEstimate(d["estimated_tokens"]) {
			return nil, fail("delta.estimated_tokens", "expected null or non-negative integer")
		}
	}
	if e := keys(d, "delta", fields...); e != nil {
		return nil, e
	}
	value, ok := d[field].(string)
	if !ok {
		return nil, fail("delta."+field, "expected string")
	}
	if field == "partial_json" {
		if value == "" {
			return nil, nil
		}
		if !b.hasArgs && len(b.block["input"].(object)) > 0 {
			return nil, fail("tool.input", "initial input conflicts with deltas")
		}
		b.hasArgs = true
		b.args += value
	} else if field == "signature" {
		b.block[field] = value
	} else {
		prior, _ := b.block[field].(string)
		b.block[field] = prior + value
	}
	if field == "signature" {
		return nil, nil
	}
	if s.p.protocol == "openai.chat" {
		if field == "text" {
			return s.chat(object{"content": value}, nil, nil), nil
		}
		return s.chat(object{"tool_calls": []any{object{"index": b.toolIndex, "function": object{"arguments": value}}}}, nil, nil), nil
	}
	f := object{"delta": value}
	if field == "text" {
		f["content_index"] = 0
	}
	if field == "thinking" {
		f["summary_index"] = 0
	}
	return s.partEvent(event, i, f), nil
}

// This optional Anthropic progress hint has no target-protocol usage meaning.
// Validate it without converting to a machine integer or retaining it in output.
func validThinkingEstimate(value any) bool {
	if value == nil {
		return true
	}
	n, ok := value.(json.Number)
	if !ok || n == "" {
		return false
	}
	if n == "-0" {
		return true
	}
	for _, c := range n.String() {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func (s *Stream) stop(i int, b *streamBlock) ([]Event, error) {
	if s.p.protocol == "openai.chat" {
		if b.block["type"] == "tool_use" && !b.hasArgs {
			v, _ := json.Marshal(b.block["input"])
			return s.chat(object{"tool_calls": []any{object{"index": b.toolIndex, "function": object{"arguments": string(v)}}}}, nil, nil), nil
		}
		return nil, nil
	}
	item, e := s.p.outputItem(b.block, s.m["model"].(string), s.m["id"].(string), i, "end_turn")
	if e != nil {
		return nil, e
	}
	out := []Event{}
	switch b.block["type"] {
	case "text":
		out = append(out, s.partEvent("response.output_text.done", i, object{"content_index": 0, "text": b.block["text"]})...)
		out = append(out, s.partEvent("response.content_part.done", i, object{"content_index": 0, "part": item["content"].([]any)[0]})...)
	case "tool_use":
		v, _ := json.Marshal(b.block["input"])
		if !b.hasArgs {
			out = append(out, s.partEvent("response.function_call_arguments.delta", i, object{"delta": string(v)})...)
		}
		out = append(out, s.partEvent("response.function_call_arguments.done", i, object{"arguments": string(v)})...)
	case "thinking":
		if t, ok := b.block["thinking"].(string); ok {
			out = append(out, s.partEvent("response.reasoning_summary_text.done", i, object{"summary_index": 0, "text": t})...)
			out = append(out, s.partEvent("response.reasoning_summary_part.done", i, object{"summary_index": 0, "part": object{"type": "summary_text", "text": t}})...)
		}
	}
	return append(out, s.emit("response.output_item.done", object{"type": "response.output_item.done", "output_index": i, "item": item})...), nil
}

func (s *Stream) refusalEvents() ([]Event, error) {
	result, e := s.p.response(s.m, s.created)
	if e != nil {
		return nil, e
	}
	s.seq = 0
	if s.p.protocol == "openai.chat" {
		message := result["choices"].([]any)[0].(object)["message"].(object)
		out := s.chat(object{"role": "assistant"}, nil, nil)
		out = append(out, s.chat(object{"refusal": message["refusal"]}, nil, nil)...)
		if calls, ok := message["tool_calls"]; ok {
			for i, x := range calls.([]any) {
				call := x.(object)
				call["index"] = i
				out = append(out, s.chat(object{"tool_calls": []any{call}}, nil, nil)...)
			}
		}
		out = append(out, s.chatFinal("stop", result["provider_details"])...)
		if s.p.includeUsage {
			out = append(out, s.chat(nil, nil, result["usage"])...)
		}
		return append(out, Event{Data: []byte("[DONE]")}), nil
	}
	out := s.emit("response.created", object{"type": "response.created", "response": object{"id": s.m["id"], "object": "response", "created_at": s.created, "model": s.m["model"], "status": "in_progress", "output": []any{}}})
	for i, x := range result["output"].([]any) {
		item := x.(object)
		if item["type"] != "message" {
			out = append(out, s.start(i, s.blocks[i])...)
			stopped, err := s.stop(i, s.blocks[i])
			if err != nil {
				return nil, err
			}
			out = append(out, stopped...)
			continue
		}
		start := object{"id": item["id"], "type": "message", "role": "assistant", "status": "in_progress", "content": []any{}}
		out = append(out, s.emit("response.output_item.added", object{"type": "response.output_item.added", "output_index": i, "item": start})...)
		part := item["content"].([]any)[0].(object)
		text := part["refusal"]
		out = append(out, s.partEvent("response.content_part.added", i, object{"content_index": 0, "part": object{"type": "refusal", "refusal": ""}})...)
		out = append(out, s.partEvent("response.refusal.delta", i, object{"content_index": 0, "delta": text})...)
		out = append(out, s.partEvent("response.refusal.done", i, object{"content_index": 0, "refusal": text})...)
		out = append(out, s.partEvent("response.content_part.done", i, object{"content_index": 0, "part": part})...)
		out = append(out, s.emit("response.output_item.done", object{"type": "response.output_item.done", "output_index": i, "item": item})...)
	}
	return append(out, s.emit("response.completed", object{"type": "response.completed", "response": result})...), nil
}

func (s *Stream) chatFinal(finish, details any) []Event {
	events := s.chat(object{}, finish, nil)
	o, _ := decodeObject(events[0].Data, "chunk")
	o["provider_details"] = details
	events[0].Data, _ = json.Marshal(o)
	return events
}

func (s *Stream) mergeFacts(facts object) error {
	for k, v := range facts {
		switch k {
		case "id", "model", "role", "type", "content", "usage":
			return fail("stream."+k, "terminal metadata cannot replace message identity/content/usage")
		}
		s.m[k] = v
	}
	return nil
}

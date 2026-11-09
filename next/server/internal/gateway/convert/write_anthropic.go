package convert

import (
	"encoding/json"
	"strings"
)

// anthropicWriter writes Messages replies (CONVERT-MATRIX §9.8): thinking
// blocks never carry a signature (D8), refusals are text, a custom tool's
// input is wrapped as {"input": ...} and sent whole when its block stops.
type anthropicWriter struct {
	writerBase
	idx map[int]int // content index per written block
}

func newAnthropicWriter(o respOpts) Writer {
	w := &anthropicWriter{idx: map[int]int{}}
	w.init(w, writerCaps{citations: true}, o)
	return w
}

func anthropicID(m *Msg) string {
	if strings.HasPrefix(m.ID, "msg_") {
		return m.ID
	}
	return "msg_" + m.ID
}

func anthropicWritten(b *Block) bool { return b.Kind != BlockImage && b.Kind != BlockOpaque }

func anthropicUsage(u Usage) jmap {
	write := u.CacheWrite5m + u.CacheWrite1h
	out := jmap{"input_tokens": max(0, u.Input-u.CacheRead-write), "output_tokens": u.Output,
		"cache_read_input_tokens": u.CacheRead, "cache_creation_input_tokens": write}
	if write > 0 {
		out["cache_creation"] = jmap{"ephemeral_5m_input_tokens": u.CacheWrite5m, "ephemeral_1h_input_tokens": u.CacheWrite1h}
	}
	return out
}

func anthropicStop(f Finish) (reason string, seq any) {
	switch f.Reason {
	case FinishToolUse:
		return "tool_use", nil
	case FinishLength:
		return "max_tokens", nil
	case FinishFilter:
		return "refusal", nil
	case FinishPause:
		return "pause_turn", nil
	}
	if f.StopSequence != "" {
		return "stop_sequence", f.StopSequence
	}
	return "end_turn", nil
}

// anthropicCitation is a url citation; cited_text is the cited range of
// the block text, when the upstream gave one.
func anthropicCitation(c Citation, text string) jmap {
	cited := ""
	if r := []rune(text); c.Start < c.End && c.End <= len(r) {
		cited = string(r[c.Start:c.End])
	}
	return jmap{"type": "web_search_result_location", "url": c.URL, "title": c.Title, "cited_text": cited}
}

// contentBlock is the content block of b: empty unless done.
func (w *anthropicWriter) contentBlock(i int, b *Block, done bool) jmap {
	text := ""
	if done {
		text = b.Text
	}
	switch b.Kind {
	case BlockReasoning:
		return jmap{"type": "thinking", "thinking": text}
	case BlockToolCall:
		input := json.RawMessage("{}")
		if done {
			var ok bool
			if input, ok = toolObject(b); !ok {
				w.lost.add(LossTool, w.src(i, b))
			}
		}
		return jmap{"type": "tool_use", "id": b.ToolID, "name": b.ToolName, "input": input}
	}
	out := jmap{"type": "text", "text": text}
	if done && len(b.Annotations) > 0 {
		cs := make([]any, 0, len(b.Annotations))
		for _, c := range b.Annotations {
			cs = append(cs, anthropicCitation(c, b.Text))
		}
		out["citations"] = cs
	}
	return out
}

func (w *anthropicWriter) json(m *Msg) ([]byte, error) {
	content := []any{}
	for i := range m.Blocks {
		if b := &m.Blocks[i]; anthropicWritten(b) {
			content = append(content, w.contentBlock(i, b, true))
		}
	}
	reason, seq := anthropicStop(m.Finish)
	return json.Marshal(jmap{"id": anthropicID(m), "type": "message", "role": "assistant", "model": m.Model,
		"content": content, "stop_reason": reason, "stop_sequence": seq, "usage": anthropicUsage(m.Usage)})
}

func (w *anthropicWriter) start(m *Msg) []Event {
	return []Event{jsonEvent("message_start", jmap{"type": "message_start", "message": jmap{"id": anthropicID(m),
		"type": "message", "role": "assistant", "model": m.Model, "content": []any{}, "stop_reason": nil,
		"stop_sequence": nil, "usage": anthropicUsage(m.Usage)}})}
}

func (w *anthropicWriter) blockStart(i int, b *Block) []Event {
	if !anthropicWritten(b) {
		return nil
	}
	w.idx[i] = len(w.idx)
	return []Event{jsonEvent("content_block_start", jmap{"type": "content_block_start", "index": w.idx[i],
		"content_block": w.contentBlock(i, b, false)})}
}

func (w *anthropicWriter) delta(i int, d jmap) []Event {
	return []Event{jsonEvent("content_block_delta", jmap{"type": "content_block_delta", "index": w.idx[i], "delta": d})}
}

func (w *anthropicWriter) content(d Delta, b *Block) []Event {
	switch {
	case !anthropicWritten(b):
		return nil
	case d.Op == DeltaCitation:
		return w.delta(d.Index, jmap{"type": "citations_delta", "citation": anthropicCitation(*d.Cite, b.Text)})
	case d.Op == DeltaArgs && b.ToolKind == ToolCustom:
		return nil // sent whole at the block stop
	case d.Op == DeltaArgs:
		return w.delta(d.Index, jmap{"type": "input_json_delta", "partial_json": d.Text})
	case b.Kind == BlockReasoning:
		return w.delta(d.Index, jmap{"type": "thinking_delta", "thinking": d.Text})
	}
	return w.delta(d.Index, jmap{"type": "text_delta", "text": d.Text})
}

func (w *anthropicWriter) blockStop(i int, b *Block) []Event {
	if !anthropicWritten(b) {
		return nil
	}
	var out []Event
	if b.Kind == BlockToolCall {
		input, ok := toolObject(b)
		switch {
		case b.ToolKind == ToolCustom:
			out = w.delta(i, jmap{"type": "input_json_delta", "partial_json": string(input)})
		case !ok:
			w.lost.add(LossTool, w.src(i, b))
		}
	}
	return append(out, jsonEvent("content_block_stop", jmap{"type": "content_block_stop", "index": w.idx[i]}))
}

func (w *anthropicWriter) finish(m *Msg) []Event {
	reason, seq := anthropicStop(m.Finish)
	return []Event{
		jsonEvent("message_delta", jmap{"type": "message_delta", "delta": jmap{"stop_reason": reason, "stop_sequence": seq},
			"usage": anthropicUsage(m.Usage)}),
		jsonEvent("message_stop", jmap{"type": "message_stop"}),
	}
}

var anthropicErrorTypes = map[string]bool{
	"invalid_request_error": true, "authentication_error": true, "permission_error": true, "not_found_error": true,
	"request_too_large": true, "rate_limit_error": true, "api_error": true, "overloaded_error": true,
}

func (w *anthropicWriter) fail(e *UpstreamError) []Event {
	typ := e.Type
	if !anthropicErrorTypes[typ] {
		typ = errorKind(e.Status, 0, "api_error")
	}
	return []Event{jsonEvent("error", jmap{"type": "error", "error": jmap{"type": typ, "message": e.Message}})}
}

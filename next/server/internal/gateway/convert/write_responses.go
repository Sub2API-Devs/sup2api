package convert

import (
	"encoding/json"
	"fmt"
	"strings"
)

type jmap = map[string]any

// responsesWriter writes Responses replies (CONVERT-MATRIX §9.8): every
// text or refusal block is a message item with one part, a reasoning block
// a reasoning item with one summary part (never encrypted_content), a tool
// block a function_call or custom_tool_call item. Item ids derive from the
// response id and block index, so the stream and the final response agree.
type responsesWriter struct {
	writerBase
	seq int
	out map[int]int // output_index per written block
}

func newResponsesWriter(o respOpts) Writer {
	w := &responsesWriter{out: map[int]int{}}
	w.init(w, writerCaps{citations: true}, o)
	return w
}

func responseID(m *Msg) string {
	if strings.HasPrefix(m.ID, "resp_") {
		return m.ID
	}
	return "resp_" + m.ID
}

var responsesItemPrefix = map[BlockKind]string{BlockText: "msg", BlockRefusal: "msg", BlockReasoning: "rs", BlockToolCall: "fc"}

func itemID(m *Msg, i int, b *Block) string {
	return fmt.Sprintf("%s_%s_%d", responsesItemPrefix[b.Kind], strings.TrimPrefix(responseID(m), "resp_"), i)
}

// written reports whether a block becomes an output item.
func responsesWritten(b *Block) bool { _, ok := responsesItemPrefix[b.Kind]; return ok }

// item is the output item of block i: empty and in progress unless done.
func responsesItem(m *Msg, i int, b *Block, done bool) jmap {
	status := "in_progress"
	if done {
		status = "completed"
	}
	it := jmap{"id": itemID(m, i, b)}
	switch b.Kind {
	case BlockText, BlockRefusal:
		content := []any{}
		if done {
			content = append(content, responsesPart(b, true))
		}
		it["type"], it["status"], it["role"], it["content"] = "message", status, "assistant", content
	case BlockReasoning:
		summary := []any{}
		if done && b.Text != "" {
			summary = append(summary, jmap{"type": "summary_text", "text": b.Text})
		}
		it["type"], it["summary"] = "reasoning", summary
	case BlockToolCall:
		args := ""
		if done {
			args = b.Args
		}
		it["status"], it["call_id"], it["name"] = status, b.ToolID, b.ToolName
		if b.ToolKind == ToolCustom {
			it["type"], it["input"] = "custom_tool_call", args
		} else {
			it["type"], it["arguments"] = "function_call", args
		}
	}
	return it
}

// part is the content part of a text or refusal block.
func responsesPart(b *Block, done bool) jmap {
	text := ""
	if done {
		text = b.Text
	}
	if b.Kind == BlockRefusal {
		return jmap{"type": "refusal", "refusal": text}
	}
	anns := []any{}
	if done {
		for _, c := range b.Annotations {
			anns = append(anns, responsesAnnotation(c))
		}
	}
	return jmap{"type": "output_text", "text": text, "annotations": anns}
}

func responsesAnnotation(c Citation) jmap {
	return jmap{"type": "url_citation", "url": c.URL, "title": c.Title, "start_index": c.Start, "end_index": c.End}
}

// object is the response object of m.
func responsesObject(m *Msg, status string) jmap {
	output := []any{}
	for i := range m.Blocks {
		if b := &m.Blocks[i]; responsesWritten(b) {
			output = append(output, responsesItem(m, i, b, true))
		}
	}
	o := jmap{"id": responseID(m), "object": "response", "created_at": m.Created, "status": status, "model": m.Model,
		"output": output, "error": nil, "incomplete_details": nil, "usage": nil}
	if m.Usage.Set && status != "in_progress" {
		var u responsesUsageJSON
		u.InputTokens, u.InputTokensDetails.CachedTokens = m.Usage.Input, m.Usage.CacheRead
		u.OutputTokens, u.OutputTokensDetails.ReasoningTokens = m.Usage.Output, m.Usage.Reasoning
		u.TotalTokens = m.Usage.Input + m.Usage.Output
		o["usage"] = u
	}
	return o
}

// responsesStatus is the status of a finished reply and its incomplete
// details.
func responsesStatus(o jmap, f Finish) string {
	reason := map[FinishReason]string{FinishLength: "max_output_tokens", FinishFilter: "content_filter"}[f.Reason]
	if reason == "" {
		return "completed"
	}
	o["status"], o["incomplete_details"] = "incomplete", jmap{"reason": reason}
	return "incomplete"
}

func (w *responsesWriter) json(m *Msg) ([]byte, error) {
	o := responsesObject(m, "completed")
	responsesStatus(o, m.Finish)
	return json.Marshal(o)
}

// ev is a stream event of type typ with a sequence number.
func (w *responsesWriter) ev(typ string, fields jmap) Event {
	fields["type"], fields["sequence_number"] = typ, w.seq
	w.seq++
	return jsonEvent(typ, fields)
}

func (w *responsesWriter) start(m *Msg) []Event {
	return []Event{
		w.ev("response.created", jmap{"response": responsesObject(m, "in_progress")}),
		w.ev("response.in_progress", jmap{"response": responsesObject(m, "in_progress")}),
	}
}

// at returns the item id and output index fields of block i.
func (w *responsesWriter) at(i int, b *Block, extra jmap) jmap {
	extra["item_id"], extra["output_index"] = itemID(&w.b.m, i, b), w.out[i]
	return extra
}

func (w *responsesWriter) blockStart(i int, b *Block) []Event {
	if !responsesWritten(b) {
		return nil
	}
	w.out[i] = len(w.out)
	out := []Event{w.ev("response.output_item.added", jmap{"output_index": w.out[i], "item": responsesItem(&w.b.m, i, b, false)})}
	switch b.Kind {
	case BlockText, BlockRefusal:
		out = append(out, w.ev("response.content_part.added", w.at(i, b, jmap{"content_index": 0, "part": responsesPart(b, false)})))
	case BlockReasoning:
		out = append(out, w.ev("response.reasoning_summary_part.added",
			w.at(i, b, jmap{"summary_index": 0, "part": jmap{"type": "summary_text", "text": ""}})))
	}
	return out
}

func (w *responsesWriter) content(d Delta, b *Block) []Event {
	if !responsesWritten(b) {
		return nil
	}
	i := d.Index
	switch {
	case d.Op == DeltaCitation:
		return []Event{w.ev("response.output_text.annotation.added", w.at(i, b, jmap{"content_index": 0,
			"annotation_index": len(b.Annotations) - 1, "annotation": responsesAnnotation(*d.Cite)}))}
	case d.Op == DeltaArgs && b.ToolKind == ToolCustom:
		return []Event{w.ev("response.custom_tool_call_input.delta", w.at(i, b, jmap{"delta": d.Text}))}
	case d.Op == DeltaArgs:
		return []Event{w.ev("response.function_call_arguments.delta", w.at(i, b, jmap{"delta": d.Text}))}
	case b.Kind == BlockText:
		return []Event{w.ev("response.output_text.delta", w.at(i, b, jmap{"content_index": 0, "delta": d.Text, "logprobs": []any{}}))}
	case b.Kind == BlockRefusal:
		return []Event{w.ev("response.refusal.delta", w.at(i, b, jmap{"content_index": 0, "delta": d.Text}))}
	case b.Kind == BlockReasoning:
		return []Event{w.ev("response.reasoning_summary_text.delta", w.at(i, b, jmap{"summary_index": 0, "delta": d.Text}))}
	}
	return nil
}

func (w *responsesWriter) blockStop(i int, b *Block) []Event {
	if !responsesWritten(b) {
		return nil
	}
	var out []Event
	switch {
	case b.Kind == BlockText:
		out = append(out, w.ev("response.output_text.done", w.at(i, b, jmap{"content_index": 0, "text": b.Text, "logprobs": []any{}})))
	case b.Kind == BlockRefusal:
		out = append(out, w.ev("response.refusal.done", w.at(i, b, jmap{"content_index": 0, "refusal": b.Text})))
	case b.Kind == BlockReasoning:
		out = append(out,
			w.ev("response.reasoning_summary_text.done", w.at(i, b, jmap{"summary_index": 0, "text": b.Text})),
			w.ev("response.reasoning_summary_part.done", w.at(i, b, jmap{"summary_index": 0,
				"part": jmap{"type": "summary_text", "text": b.Text}})))
	case b.ToolKind == ToolCustom:
		out = append(out, w.ev("response.custom_tool_call_input.done", w.at(i, b, jmap{"input": b.Args})))
	default:
		out = append(out, w.ev("response.function_call_arguments.done", w.at(i, b, jmap{"arguments": b.Args})))
	}
	if b.Kind == BlockText || b.Kind == BlockRefusal {
		out = append(out, w.ev("response.content_part.done", w.at(i, b, jmap{"content_index": 0, "part": responsesPart(b, true)})))
	}
	return append(out, w.ev("response.output_item.done", jmap{"output_index": w.out[i], "item": responsesItem(&w.b.m, i, b, true)}))
}

func (w *responsesWriter) finish(m *Msg) []Event {
	o := responsesObject(m, "completed")
	return []Event{w.ev("response."+responsesStatus(o, m.Finish), jmap{"response": o})}
}

func (w *responsesWriter) fail(e *UpstreamError) []Event {
	w.header(&w.b.m)
	o := responsesObject(&w.b.m, "failed")
	code := e.Type
	if code == "" {
		code = "server_error"
	}
	o["error"] = jmap{"code": code, "message": e.Message}
	return []Event{w.ev("response.failed", jmap{"response": o})}
}

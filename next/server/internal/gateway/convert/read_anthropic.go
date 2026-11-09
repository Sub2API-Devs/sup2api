package convert

import (
	"encoding/json"
	"fmt"
)

// Anthropic Messages wire shapes read by the anthropic reader.

type anthropicMessageJSON struct {
	ID           string              `json:"id"`
	Model        string              `json:"model"`
	Content      []json.RawMessage   `json:"content"`
	StopReason   string              `json:"stop_reason"`
	StopSequence string              `json:"stop_sequence"`
	Usage        *anthropicUsageJSON `json:"usage"`
}

type anthropicBlockJSON struct {
	Type      string                  `json:"type"`
	Text      string                  `json:"text"`
	Thinking  string                  `json:"thinking"`
	Signature string                  `json:"signature"`
	ID        string                  `json:"id"`
	Name      string                  `json:"name"`
	Input     json.RawMessage         `json:"input"`
	Citations []anthropicCitationJSON `json:"citations"`
}

type anthropicCitationJSON struct {
	Type  string `json:"type"`
	URL   string `json:"url"`
	Title string `json:"title"`
}

// anthropicUsageJSON has pointers so message_delta usage only replaces the
// members it carries.
type anthropicUsageJSON struct {
	InputTokens   *int64 `json:"input_tokens"`
	OutputTokens  *int64 `json:"output_tokens"`
	CacheRead     *int64 `json:"cache_read_input_tokens"`
	CacheCreation *int64 `json:"cache_creation_input_tokens"`
	CacheDetail   *struct {
		Ephemeral5m int64 `json:"ephemeral_5m_input_tokens"`
		Ephemeral1h int64 `json:"ephemeral_1h_input_tokens"`
	} `json:"cache_creation"`
}

// merge replaces the members v carries.
func (u *anthropicUsageJSON) merge(v *anthropicUsageJSON) {
	if v == nil {
		return
	}
	for _, f := range []struct{ dst, src **int64 }{
		{&u.InputTokens, &v.InputTokens}, {&u.OutputTokens, &v.OutputTokens},
		{&u.CacheRead, &v.CacheRead}, {&u.CacheCreation, &v.CacheCreation},
	} {
		if *f.src != nil {
			*f.dst = *f.src
		}
	}
	if v.CacheDetail != nil {
		u.CacheDetail = v.CacheDetail
	}
}

func derefInt(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}

// ir converts to OpenAI terms: Input includes cache reads and writes.
func (u *anthropicUsageJSON) ir() Usage {
	out := Usage{CacheRead: derefInt(u.CacheRead), Output: derefInt(u.OutputTokens)}
	if d := u.CacheDetail; d != nil {
		out.CacheWrite5m, out.CacheWrite1h = d.Ephemeral5m, d.Ephemeral1h
	} else {
		out.CacheWrite5m = derefInt(u.CacheCreation)
	}
	out.Input = derefInt(u.InputTokens) + out.CacheRead + max(derefInt(u.CacheCreation), out.CacheWrite5m+out.CacheWrite1h)
	return out
}

var anthropicStopReasons = map[string]FinishReason{
	"end_turn": FinishStop, "stop_sequence": FinishStop, "tool_use": FinishToolUse,
	"max_tokens": FinishLength, "model_context_window_exceeded": FinishLength,
	"refusal": FinishFilter, "pause_turn": FinishPause,
}

// anthropicReader reads Messages replies (CONVERT-MATRIX §9.7). Blocks are
// keyed "c<index>".
type anthropicReader struct {
	readerBase
	usageAcc anthropicUsageJSON
	// startInput is the input of the tool blocks given at their start,
	// until their arguments stream.
	startInput map[string]string
}

func newAnthropicReader(respOpts) Reader {
	return &anthropicReader{startInput: map[string]string{}}
}

func (r *anthropicReader) JSON(body []byte) (*Msg, error) {
	var m anthropicMessageJSON
	if err := decodeUpstream(body, &m, "anthropic message"); err != nil {
		return nil, err
	}
	out := &Msg{ID: m.ID, Model: m.Model, Finish: r.finishOf(m.StopReason, m.StopSequence)}
	for i, raw := range m.Content {
		var b anthropicBlockJSON
		if err := decodeUpstream(raw, &b, "anthropic content block"); err != nil {
			return nil, err
		}
		blk := r.blockOf(&b, raw, fmt.Sprintf("content[%d]", i))
		if blk.Kind == BlockToolCall {
			blk.Args = compactJSON(b.Input)
		}
		out.Blocks = append(out.Blocks, blk)
	}
	if m.Usage != nil {
		out.Usage = m.Usage.ir()
		out.Usage.Set = true
	}
	return out, nil
}

// blockOf maps a content block, without tool input.
func (r *anthropicReader) blockOf(b *anthropicBlockJSON, raw json.RawMessage, src string) Block {
	switch b.Type {
	case "text":
		return Block{Kind: BlockText, Text: b.Text, Annotations: r.citations(b.Citations, src), Src: src}
	case "thinking":
		return Block{Kind: BlockReasoning, Text: b.Thinking, HasState: b.Signature != "", Src: src}
	case "redacted_thinking":
		return Block{Kind: BlockReasoning, HasState: true, Src: src}
	case "tool_use":
		return Block{Kind: BlockToolCall, ToolID: b.ID, ToolName: b.Name, ToolKind: ToolFunction, Src: src}
	}
	return Block{Kind: BlockOpaque, Raw: append(json.RawMessage(nil), raw...), Src: src}
}

func (r *anthropicReader) citations(cs []anthropicCitationJSON, src string) []Citation {
	var out []Citation
	for _, c := range cs {
		if c, ok := r.citation(c, src); ok {
			out = append(out, c)
		}
	}
	return out
}

func (r *anthropicReader) citation(c anthropicCitationJSON, src string) (Citation, bool) {
	if c.Type != "web_search_result_location" {
		r.lost.add(LossOther, "response."+src+".citations")
		return Citation{}, false
	}
	return Citation{URL: c.URL, Title: c.Title}, true
}

func (r *anthropicReader) finishOf(raw, seq string) Finish {
	reason, ok := anthropicStopReasons[raw]
	if !ok {
		r.lost.add(LossOther, "response.stop_reason")
	}
	return Finish{Reason: reason, Raw: raw, StopSequence: seq}
}

func (r *anthropicReader) End() ([]Delta, error) { return nil, nil }

// anthropicEvent is any Messages stream event.
type anthropicEvent struct {
	Type         string                `json:"type"`
	Message      *anthropicMessageJSON `json:"message"`
	Index        int                   `json:"index"`
	ContentBlock json.RawMessage       `json:"content_block"`
	Delta        struct {
		Type         string                 `json:"type"`
		Text         string                 `json:"text"`
		Thinking     string                 `json:"thinking"`
		PartialJSON  string                 `json:"partial_json"`
		Citation     *anthropicCitationJSON `json:"citation"`
		StopReason   string                 `json:"stop_reason"`
		StopSequence string                 `json:"stop_sequence"`
	} `json:"delta"`
	Usage *anthropicUsageJSON `json:"usage"`
}

func (r *anthropicReader) Event(ev Event) ([]Delta, error) {
	d, ok := eventData(ev)
	if r.done || !ok {
		return nil, nil
	}
	var e anthropicEvent
	if err := decodeUpstream(d, &e, "anthropic event"); err != nil {
		return nil, err
	}
	if e.Type == "" {
		e.Type = ev.Name
	}
	if err := r.event(&e, d); err != nil {
		return nil, err
	}
	return r.take(), nil
}

func (r *anthropicReader) event(e *anthropicEvent, data []byte) error {
	key := fmt.Sprintf("c%d", e.Index)
	switch e.Type {
	case "message_start":
		if m := e.Message; m != nil {
			r.start(m.ID, m.Model, 0)
			r.addUsage(m.Usage)
		}
	case "content_block_start":
		return r.blockStart(key, e)
	case "content_block_delta":
		if r.open == key {
			r.delta(key, e)
		}
	case "content_block_stop":
		if r.open == key {
			if input, ok := r.startInput[key]; ok {
				r.add(key, Block{}, DeltaArgs, input)
			}
			r.stop()
		}
	case "message_delta":
		r.addUsage(e.Usage)
		if e.Delta.StopReason != "" {
			r.finish(r.finishOf(e.Delta.StopReason, e.Delta.StopSequence))
		}
	case "message_stop":
		r.finish(Finish{Reason: FinishStop})
	case "error":
		ue, _ := errorPayload(data)
		r.fail(ue)
	}
	return nil
}

func (r *anthropicReader) addUsage(u *anthropicUsageJSON) {
	if u == nil {
		return
	}
	r.usageAcc.merge(u)
	r.usage(r.usageAcc.ir())
}

func (r *anthropicReader) blockStart(key string, e *anthropicEvent) error {
	var b anthropicBlockJSON
	if err := decodeUpstream(e.ContentBlock, &b, "anthropic content block"); err != nil {
		return err
	}
	blk := r.blockOf(&b, e.ContentBlock, fmt.Sprintf("content[%d]", e.Index))
	if blk.Kind == BlockOpaque {
		r.emitBlock(key, blk)
		return nil
	}
	text, state := blk.Text, blk.HasState
	blk.Text, blk.HasState = "", false
	op := DeltaText
	if blk.Kind == BlockReasoning {
		op = DeltaReasoning
	}
	r.add(key, blk, op, text)
	if state {
		r.state(key)
	}
	if blk.Kind == BlockToolCall {
		r.startInput[key] = compactJSON(b.Input)
	}
	return nil
}

func (r *anthropicReader) delta(key string, e *anthropicEvent) {
	switch e.Delta.Type {
	case "text_delta":
		r.add(key, Block{}, DeltaText, e.Delta.Text)
	case "thinking_delta":
		r.add(key, Block{}, DeltaReasoning, e.Delta.Thinking)
	case "signature_delta":
		r.state(key)
	case "input_json_delta":
		if e.Delta.PartialJSON != "" {
			delete(r.startInput, key)
		}
		r.add(key, Block{}, DeltaArgs, e.Delta.PartialJSON)
	case "citations_delta":
		if e.Delta.Citation == nil {
			return
		}
		if c, ok := r.citation(*e.Delta.Citation, fmt.Sprintf("content[%d]", e.Index)); ok {
			r.emit(Delta{Op: DeltaCitation, Index: r.keys[key], Cite: &c})
		}
	}
}

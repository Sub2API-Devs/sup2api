package convert

import (
	"encoding/json"
	"fmt"
	"strconv"
	"unicode/utf8"
)

// Chat Completions wire shapes, shared by the chat reader and writer.

type chatChunk struct {
	ID      string          `json:"id"`
	Object  string          `json:"object"`
	Created int64           `json:"created"`
	Model   string          `json:"model"`
	Choices []chatChoice    `json:"choices"`
	Usage   json.RawMessage `json:"usage,omitempty"` // null in chunks of a stream with usage
}

type chatChoice struct {
	Index        int        `json:"index"`
	Delta        *chatDelta `json:"delta,omitempty"`
	Message      *chatDelta `json:"message,omitempty"`
	FinishReason *string    `json:"finish_reason"`
	Logprobs     any        `json:"logprobs"`
}

// chatDelta is a stream delta or, read the same way, a complete message.
type chatDelta struct {
	Role             string               `json:"role,omitempty"`
	Content          json.RawMessage      `json:"content,omitempty"`
	ReasoningContent string               `json:"reasoning_content,omitempty"`
	Reasoning        json.RawMessage      `json:"reasoning,omitempty"`
	Refusal          *string              `json:"refusal,omitempty"`
	ToolCalls        []chatToolCallJSON   `json:"tool_calls,omitempty"`
	FunctionCall     *chatFunctionJSON    `json:"function_call,omitempty"`
	Annotations      []chatAnnotationJSON `json:"annotations,omitempty"`
}

type chatToolCallJSON struct {
	Index    *int              `json:"index,omitempty"`
	ID       string            `json:"id,omitempty"`
	Type     string            `json:"type,omitempty"`
	Function *chatFunctionJSON `json:"function,omitempty"`
	Custom   *chatCustomJSON   `json:"custom,omitempty"`
}

type chatFunctionJSON struct {
	Name      string `json:"name,omitempty"`
	Arguments string `json:"arguments"`
}

type chatCustomJSON struct {
	Name  string `json:"name,omitempty"`
	Input string `json:"input"`
}

type chatAnnotationJSON struct {
	Type        string           `json:"type"`
	URLCitation *chatURLCitation `json:"url_citation,omitempty"`
}

type chatURLCitation struct {
	URL        string `json:"url"`
	Title      string `json:"title,omitempty"`
	StartIndex int    `json:"start_index"`
	EndIndex   int    `json:"end_index"`
}

type chatUsageJSON struct {
	PromptTokens            int64             `json:"prompt_tokens"`
	CompletionTokens        int64             `json:"completion_tokens"`
	TotalTokens             int64             `json:"total_tokens"`
	PromptTokensDetails     *chatTokenDetails `json:"prompt_tokens_details,omitempty"`
	CompletionTokensDetails *chatTokenDetails `json:"completion_tokens_details,omitempty"`
}

type chatTokenDetails struct {
	CachedTokens    int64 `json:"cached_tokens,omitempty"`
	ReasoningTokens int64 `json:"reasoning_tokens,omitempty"`
}

func (u *chatUsageJSON) ir() Usage {
	out := Usage{Input: u.PromptTokens, Output: u.CompletionTokens}
	if d := u.PromptTokensDetails; d != nil {
		out.CacheRead = d.CachedTokens
	}
	if d := u.CompletionTokensDetails; d != nil {
		out.Reasoning = d.ReasoningTokens
	}
	return out
}

var chatFinishReasons = map[string]FinishReason{
	"stop": FinishStop, "tool_calls": FinishToolUse, "function_call": FinishToolUse,
	"length": FinishLength, "content_filter": FinishFilter,
}

const chatSrc = "choices[0].message."

// chatReader reads Chat Completions replies (CONVERT-MATRIX §9.7): a
// complete completion is read as one chunk whose delta is the message.
type chatReader struct {
	readerBase
	finishSeen *Finish
	id         string
	textLen    int // characters of content so far
	textBase   int // textLen when the open text block started
}

func newChatReader(respOpts) Reader { return &chatReader{} }

func (r *chatReader) Event(ev Event) ([]Delta, error) {
	if r.done {
		return nil, nil
	}
	d, ok := eventData(ev)
	switch {
	case string(d) == "[DONE]":
		r.end(true)
	case ok:
		if err := r.chunk(d); err != nil {
			return nil, err
		}
	}
	return r.take(), nil
}

func (r *chatReader) End() ([]Delta, error) {
	r.end(false)
	return r.take(), nil
}

func (r *chatReader) JSON(body []byte) (*Msg, error) {
	ds, err := r.Event(Event{Data: body})
	if err != nil {
		return nil, err
	}
	r.end(true)
	return collect(append(ds, r.take()...))
}

// end finishes the reply at the end of the stream: always on [DONE] or a
// complete body, otherwise only when a finish_reason was seen.
func (r *chatReader) end(terminal bool) {
	switch {
	case r.done:
	case r.finishSeen != nil:
		r.finish(*r.finishSeen)
	case terminal:
		r.finish(Finish{Reason: FinishStop})
	}
}

func (r *chatReader) chunk(d []byte) error {
	if e, ok := errorPayload(d); ok {
		r.fail(e)
		return nil
	}
	var c chatChunk
	if err := decodeUpstream(d, &c, "chat completion chunk"); err != nil {
		return err
	}
	if r.id == "" {
		r.id = c.ID
	}
	r.start(c.ID, c.Model, c.Created)
	if len(c.Choices) > 0 {
		ch := c.Choices[0]
		delta := ch.Delta
		if delta == nil {
			delta = ch.Message
		}
		if delta != nil {
			if err := r.delta(delta); err != nil {
				return err
			}
		}
		if ch.FinishReason != nil && *ch.FinishReason != "" {
			r.finishSeen = r.finishOf(*ch.FinishReason)
		}
	}
	var u *chatUsageJSON
	if err := json.Unmarshal(c.Usage, &u); err == nil && u != nil {
		r.usage(u.ir())
	}
	return nil
}

func (r *chatReader) finishOf(raw string) *Finish {
	reason, ok := chatFinishReasons[raw]
	if !ok {
		r.lost.add(LossOther, "response.choices[0].finish_reason")
	}
	return &Finish{Reason: reason, Raw: raw}
}

func (r *chatReader) delta(d *chatDelta) error {
	reasoning := d.ReasoningContent
	if reasoning == "" {
		reasoning = jsonText(d.Reasoning)
	}
	if reasoning != "" {
		r.add("reasoning", Block{Kind: BlockReasoning, Src: chatSrc + "reasoning_content"}, DeltaReasoning, reasoning)
	}
	if text := jsonText(d.Content); text != "" {
		r.text(text)
	}
	for _, a := range d.Annotations {
		r.citation(a)
	}
	if d.Refusal != nil && *d.Refusal != "" {
		r.add("refusal", Block{Kind: BlockRefusal, Src: chatSrc + "refusal"}, DeltaText, *d.Refusal)
	}
	if fc := d.FunctionCall; fc != nil {
		d.ToolCalls = append(d.ToolCalls, chatToolCallJSON{Function: fc})
	}
	for i, tc := range d.ToolCalls {
		if err := r.toolCall(i, tc); err != nil {
			return err
		}
	}
	return nil
}

func (r *chatReader) text(s string) {
	if r.open != "text" {
		r.textBase = r.textLen
	}
	r.add("text", Block{Kind: BlockText, Src: chatSrc + "content"}, DeltaText, s)
	r.textLen += utf8.RuneCountInString(s)
}

// citation adds a url citation to the text block; chat offsets count from
// the start of the content, IR offsets from the start of the block.
func (r *chatReader) citation(a chatAnnotationJSON) {
	u := a.URLCitation
	if a.Type != "url_citation" || u == nil {
		r.lost.add(LossOther, chatSrc+"annotations")
		return
	}
	if r.open != "text" {
		r.textBase = r.textLen
	}
	i := r.ensure("text", Block{Kind: BlockText, Src: chatSrc + "content"})
	c := Citation{URL: u.URL, Title: u.Title, Start: max(0, u.StartIndex-r.textBase), End: max(0, u.EndIndex-r.textBase)}
	r.emit(Delta{Op: DeltaCitation, Index: i, Cite: &c})
}

func (r *chatReader) toolCall(pos int, tc chatToolCallJSON) error {
	idx := pos
	if tc.Index != nil {
		idx = *tc.Index
	}
	key := "tool:" + strconv.Itoa(idx)
	if _, started := r.block(key); started && r.open != key {
		return fmt.Errorf("convert: chat tool call %d continued after a later block started", idx)
	}
	b := Block{Kind: BlockToolCall, ToolID: tc.ID, ToolKind: ToolFunction, Src: fmt.Sprintf("%stool_calls[%d]", chatSrc, idx)}
	var args string
	switch {
	case tc.Custom != nil:
		b.ToolKind, b.ToolName, args = ToolCustom, tc.Custom.Name, tc.Custom.Input
	case tc.Function != nil:
		b.ToolName, args = tc.Function.Name, tc.Function.Arguments
	}
	if b.ToolID == "" {
		b.ToolID = synthCallID(r.id, idx)
	}
	r.add(key, b, DeltaArgs, args)
	return nil
}

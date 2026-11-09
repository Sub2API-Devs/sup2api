package convert

import (
	"encoding/json"
	"strings"
	"unicode/utf8"
)

// chatWriter writes Chat Completions replies (CONVERT-MATRIX §9.8):
// reasoning as reasoning_content (D4), one choice, tool calls numbered in
// order; a client that used legacy functions gets the first call as
// function_call.
type chatWriter struct {
	writerBase
	tools    map[int]int // tool_calls index per tool block, -1 when dropped
	textLen  int         // characters of content written
	textBase map[int]int // content offset where each text block started
}

func newChatWriter(o respOpts) Writer {
	w := &chatWriter{tools: map[int]int{}, textBase: map[int]int{}}
	w.init(w, writerCaps{citations: true}, o)
	return w
}

func jsonString(s string) json.RawMessage {
	raw, _ := json.Marshal(s)
	return raw
}

func (w *chatWriter) chunk(m *Msg, delta *chatDelta, finish *string) Event {
	c := chatChunk{ID: m.ID, Object: "chat.completion.chunk", Created: m.Created, Model: m.Model,
		Choices: []chatChoice{{Delta: delta, FinishReason: finish}}}
	if w.opts.includeUsage {
		c.Usage = json.RawMessage("null")
	}
	return jsonEvent("", c)
}

func (w *chatWriter) start(m *Msg) []Event {
	return []Event{w.chunk(m, &chatDelta{Role: "assistant", Content: jsonString("")}, nil)}
}

func (w *chatWriter) blockStart(i int, b *Block) []Event {
	switch b.Kind {
	case BlockText:
		w.textBase[i] = w.textLen
	case BlockToolCall:
		return w.toolStart(i, b)
	}
	return nil
}

func (w *chatWriter) toolStart(i int, b *Block) []Event {
	n := len(w.tools)
	if w.opts.legacyFunctions && n > 0 {
		w.tools[i] = -1
		w.lost.add(LossTool, w.src(i, b))
		return nil
	}
	w.tools[i] = n
	d := &chatDelta{}
	if w.opts.legacyFunctions {
		d.FunctionCall = &chatFunctionJSON{Name: b.ToolName}
	} else {
		d.ToolCalls = []chatToolCallJSON{chatCall(n, b, "")}
	}
	return []Event{w.chunk(&w.b.m, d, nil)}
}

// chatCall is the tool call of block b at index n with arguments args.
func chatCall(n int, b *Block, args string) chatToolCallJSON {
	c := chatToolCallJSON{Index: &n, ID: b.ToolID, Type: "function"}
	if b.ToolKind == ToolCustom {
		c.Type, c.Custom = "custom", &chatCustomJSON{Name: b.ToolName, Input: args}
	} else {
		c.Function = &chatFunctionJSON{Name: b.ToolName, Arguments: args}
	}
	return c
}

func (w *chatWriter) content(d Delta, b *Block) []Event {
	var cd chatDelta
	switch {
	case d.Op == DeltaCitation:
		cd.Annotations = []chatAnnotationJSON{chatCitation(*d.Cite, w.textBase[d.Index])}
	case d.Op == DeltaArgs:
		n := w.tools[d.Index]
		switch {
		case n < 0:
			return nil
		case w.opts.legacyFunctions:
			cd.FunctionCall = &chatFunctionJSON{Arguments: d.Text}
		case b.ToolKind == ToolCustom:
			cd.ToolCalls = []chatToolCallJSON{{Index: &n, Custom: &chatCustomJSON{Input: d.Text}}}
		default:
			cd.ToolCalls = []chatToolCallJSON{{Index: &n, Function: &chatFunctionJSON{Arguments: d.Text}}}
		}
	case b.Kind == BlockText:
		cd.Content = jsonString(d.Text)
		w.textLen += utf8.RuneCountInString(d.Text)
	case b.Kind == BlockReasoning:
		cd.ReasoningContent = d.Text
	case b.Kind == BlockRefusal:
		cd.Refusal = &d.Text
	default:
		return nil
	}
	return []Event{w.chunk(&w.b.m, &cd, nil)}
}

func (w *chatWriter) blockStop(int, *Block) []Event { return nil }

func (w *chatWriter) finish(m *Msg) []Event {
	reason := chatFinishReason(m.Finish, w.opts.legacyFunctions)
	out := []Event{w.chunk(m, &chatDelta{}, &reason)}
	if w.opts.includeUsage && m.Usage.Set {
		out = append(out, jsonEvent("", chatUsageChunk{ID: m.ID, Object: "chat.completion.chunk", Created: m.Created,
			Model: m.Model, Choices: []chatChoice{}, Usage: chatUsageOf(m.Usage)}))
	}
	return append(out, Event{Data: []byte("[DONE]")})
}

type chatUsageChunk struct {
	ID      string         `json:"id"`
	Object  string         `json:"object"`
	Created int64          `json:"created"`
	Model   string         `json:"model"`
	Choices []chatChoice   `json:"choices"`
	Usage   *chatUsageJSON `json:"usage"`
}

func (w *chatWriter) fail(e *UpstreamError) []Event {
	return []Event{jsonEvent("", map[string]any{"error": openAIError(e)})}
}

// openAIError is the OpenAI error object of an upstream error.
func openAIError(e *UpstreamError) map[string]any {
	typ := e.Type
	if typ == "" {
		typ = "upstream_error"
	}
	out := map[string]any{"message": e.Message, "type": typ, "code": nil}
	if e.Status != 0 {
		out["code"] = e.Status
	}
	return out
}

func (w *chatWriter) json(m *Msg) ([]byte, error) {
	msg := chatDelta{Role: "assistant", Content: json.RawMessage("null")}
	var text, reasoning, refusal strings.Builder
	textLen, calls := 0, 0
	for i := range m.Blocks {
		b := &m.Blocks[i]
		switch b.Kind {
		case BlockText:
			for _, c := range b.Annotations {
				msg.Annotations = append(msg.Annotations, chatCitation(c, textLen))
			}
			text.WriteString(b.Text)
			textLen += utf8.RuneCountInString(b.Text)
			msg.Content = jsonString(text.String())
		case BlockReasoning:
			reasoning.WriteString(b.Text)
		case BlockRefusal:
			refusal.WriteString(b.Text)
		case BlockToolCall:
			switch {
			case w.opts.legacyFunctions && calls > 0:
				w.lost.add(LossTool, w.src(i, b))
			case w.opts.legacyFunctions:
				msg.FunctionCall = &chatFunctionJSON{Name: b.ToolName, Arguments: b.Args}
			default:
				c := chatCall(calls, b, b.Args)
				c.Index = nil
				msg.ToolCalls = append(msg.ToolCalls, c)
			}
			calls++
		}
	}
	msg.ReasoningContent = reasoning.String()
	if refusal.Len() > 0 {
		s := refusal.String()
		msg.Refusal = &s
	}
	reason := chatFinishReason(m.Finish, w.opts.legacyFunctions)
	out := chatUsageChunk{ID: m.ID, Object: "chat.completion", Created: m.Created, Model: m.Model,
		Choices: []chatChoice{{Message: &msg, FinishReason: &reason}}}
	if m.Usage.Set {
		out.Usage = chatUsageOf(m.Usage)
	}
	return json.Marshal(out)
}

// chatAnnotation is a url citation with offsets moved by base, the
// characters of content before its block.
func chatCitation(c Citation, base int) chatAnnotationJSON {
	return chatAnnotationJSON{Type: "url_citation", URLCitation: &chatURLCitation{URL: c.URL, Title: c.Title,
		StartIndex: c.Start + base, EndIndex: c.End + base}}
}

func chatUsageOf(u Usage) *chatUsageJSON {
	out := &chatUsageJSON{PromptTokens: u.Input, CompletionTokens: u.Output, TotalTokens: u.Input + u.Output}
	if u.CacheRead > 0 {
		out.PromptTokensDetails = &chatTokenDetails{CachedTokens: u.CacheRead}
	}
	if u.Reasoning > 0 {
		out.CompletionTokensDetails = &chatTokenDetails{ReasoningTokens: u.Reasoning}
	}
	return out
}

func chatFinishReason(f Finish, legacy bool) string {
	switch f.Reason {
	case FinishToolUse:
		if legacy {
			return "function_call"
		}
		return "tool_calls"
	case FinishLength:
		return "length"
	case FinishFilter:
		return "content_filter"
	}
	return "stop"
}

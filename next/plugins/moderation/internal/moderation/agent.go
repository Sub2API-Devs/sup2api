package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/textutil"
)

// Verdict is the submit_verdict tool call payload after normalisation.
type Verdict struct {
	Verdict    string   `json:"verdict"`
	Categories []string `json:"categories"`
	Severity   string   `json:"severity"`
	Reason     string   `json:"reason"`
}

// Usage is the token usage summed over all turns.
type Usage struct {
	PromptTokens     int64 `json:"prompt_tokens"`
	CompletionTokens int64 `json:"completion_tokens"`
}

// Result is the outcome of one agent run.
type Result struct {
	Verdict
	Turns      int
	Usage      Usage
	Billing    llmUsage // the summed usage in the shape the core prices
	Latency    time.Duration
	LLMModel   string
	Transcript []json.RawMessage // only when requested (/test)
}

// ErrNoVerdict is returned when the LLM gave no valid verdict within
// max_turns.
var ErrNoVerdict = errors.New("no_verdict: the model did not submit a valid verdict")

// agent runs the submit_verdict tool loop (CONTRACTS §20.5) over the
// channel protocol (openai_chat, openai_responses or anthropic; §72.13.2),
// one non-streaming call per turn.
type agent struct{}

func newAgent() *agent { return &agent{} }

func rawJSON(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

// run moderates text (already truncated). keepTranscript records every
// message exchanged, including the final assistant message.
func (a *agent) run(ctx context.Context, c *llmJudge, text string, keepTranscript bool) (*Result, error) {
	start := time.Now()
	res := &Result{LLMModel: c.model}
	if c.channel == nil || c.proto == nil {
		return res, errNoChannel
	}
	messages := []any{llmUserMessage(wrapUserContent(c.markerKey, text))}
	finish := func(err error) (*Result, error) {
		res.Latency = time.Since(start)
		if keepTranscript {
			res.Transcript = append([]json.RawMessage{rawJSON(map[string]any{"role": "system", "content": c.prompt})}, rawList(messages)...)
		}
		return res, err
	}
	temp := c.temperature
	for turn := 1; turn <= c.maxTurns; turn++ {
		res.Turns = turn
		t, err := c.proto.call(ctx, c.channel, llmRequest{
			System: c.prompt, Messages: messages, Tools: []LLMTool{c.tool}, ToolChoice: c.choice,
			Temperature: &temp, MaxTokens: c.maxTokens,
		})
		res.Billing.add(t.Usage)
		res.Usage.PromptTokens += t.Usage.Input
		res.Usage.CompletionTokens += t.Usage.Output
		if t.Model != "" {
			res.LLMModel = t.Model
		}
		if err != nil {
			if ctx.Err() != nil {
				return finish(fmt.Errorf("timeout: %w", ctx.Err()))
			}
			return finish(err)
		}
		messages = append(messages, c.proto.assistant(t)...)
		if len(t.ToolCalls) > 0 {
			var feedback []toolResult
			for _, tc := range t.ToolCalls {
				if tc.Name != ToolName {
					feedback = append(feedback, toolResult{CallID: tc.ID, Content: "未知工具，只能调用 " + ToolName})
					continue
				}
				v, perr := parseVerdict(toolArguments(tc.Args), c.categorySet)
				if perr == nil {
					res.Verdict = v
					return finish(nil)
				}
				feedback = append(feedback, toolResult{CallID: tc.ID, Content: "参数不合法：" + perr.Error() + "，请重新调用 " + ToolName})
			}
			messages = append(messages, c.proto.toolResults(feedback)...)
			continue
		}
		if v, perr := parseVerdict(jsonFromContent(t.Text), c.categorySet); perr == nil {
			res.Verdict = v
			return finish(nil)
		}
		messages = append(messages, llmUserMessage("请调用 "+ToolName+" 工具提交审核结论。"))
	}
	return finish(ErrNoVerdict)
}

func rawList(xs []any) []json.RawMessage {
	out := make([]json.RawMessage, 0, len(xs))
	for _, x := range xs {
		out = append(out, rawJSON(x))
	}
	return out
}

// scrubURL keeps error messages free of query strings.
func scrubURL(s string) string { return textutil.TruncateBytes(s, 500) }

func snippet(b []byte, n int) string {
	s := strings.TrimSpace(string(b))
	s = strings.Join(strings.Fields(s), " ")
	return textutil.TruncateBytes(s, n)
}

// contentString reads message.content: a string, null, or an array of
// {type:"text", text} parts.
func contentString(raw json.RawMessage) string {
	raw = trimJSON(raw)
	if len(raw) == 0 {
		return ""
	}
	switch raw[0] {
	case '"':
		var s string
		_ = json.Unmarshal(raw, &s)
		return s
	case '[':
		var parts []contentBlock
		_ = json.Unmarshal(raw, &parts)
		var b strings.Builder
		for _, p := range parts {
			if p.Text != "" {
				b.WriteString(p.Text)
			}
		}
		return b.String()
	}
	return ""
}

// toolArguments returns the arguments JSON (a JSON string holding JSON, or
// an object some providers send directly).
func toolArguments(raw json.RawMessage) string {
	raw = trimJSON(raw)
	if len(raw) > 0 && raw[0] == '"' {
		var s string
		_ = json.Unmarshal(raw, &s)
		return s
	}
	return string(raw)
}

// jsonFromContent extracts a JSON object from a text answer, also inside a
// ```json fenced block.
func jsonFromContent(s string) string {
	s = strings.TrimSpace(s)
	if i := strings.Index(s, "```"); i >= 0 {
		rest := s[i+3:]
		if nl := strings.IndexByte(rest, '\n'); nl >= 0 && !strings.Contains(rest[:nl], "{") {
			rest = rest[nl+1:]
		}
		if j := strings.Index(rest, "```"); j >= 0 {
			rest = rest[:j]
		}
		s = strings.TrimSpace(rest)
	}
	if i, j := strings.IndexByte(s, '{'), strings.LastIndexByte(s, '}'); i >= 0 && j > i {
		return s[i : j+1]
	}
	return s
}

// parseVerdict validates submit_verdict arguments. Unknown category ids are
// dropped; a pass verdict has no categories.
func parseVerdict(args string, known map[string]bool) (Verdict, error) {
	var raw struct {
		Verdict    *string          `json:"verdict"`
		Categories *json.RawMessage `json:"categories"`
		Severity   *string          `json:"severity"`
		Reason     *json.RawMessage `json:"reason"`
	}
	if strings.TrimSpace(args) == "" {
		return Verdict{}, errors.New("参数为空")
	}
	if err := json.Unmarshal([]byte(args), &raw); err != nil {
		return Verdict{}, errors.New("不是合法的 JSON 对象")
	}
	var v Verdict
	if raw.Verdict == nil {
		return v, errors.New("缺少 verdict")
	}
	v.Verdict = strings.ToLower(strings.TrimSpace(*raw.Verdict))
	switch v.Verdict {
	case VerdictPass, VerdictFlag, VerdictBlock:
	default:
		return Verdict{}, fmt.Errorf("verdict 必须是 pass、flag 或 block，收到 %q", textutil.TruncateRunes(*raw.Verdict, 20))
	}
	v.Categories = []string{}
	if raw.Categories != nil && string(trimJSON(*raw.Categories)) != "null" {
		var cats []string
		if json.Unmarshal(*raw.Categories, &cats) != nil {
			return Verdict{}, errors.New("categories 必须是字符串数组")
		}
		seen := map[string]bool{}
		for _, c := range cats {
			c = strings.ToLower(strings.TrimSpace(c))
			if known[c] && !seen[c] {
				seen[c] = true
				v.Categories = append(v.Categories, c)
			}
		}
	}
	if raw.Severity != nil {
		s := strings.ToLower(strings.TrimSpace(*raw.Severity))
		for _, allowed := range severities {
			if s == allowed {
				v.Severity = s
			}
		}
	}
	if raw.Reason != nil && string(trimJSON(*raw.Reason)) != "null" {
		var r string
		if json.Unmarshal(*raw.Reason, &r) != nil {
			return Verdict{}, errors.New("reason 必须是字符串")
		}
		v.Reason = textutil.TruncateRunes(strings.TrimSpace(r), 500)
	}
	if v.Verdict == VerdictPass {
		v.Categories = []string{}
	}
	return v, nil
}

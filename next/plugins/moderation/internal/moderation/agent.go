package moderation

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// maxResponseBytes caps the upstream response body read (1 MiB).
const maxResponseBytes = 1 << 20

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
	Latency    time.Duration
	LLMModel   string
	Transcript []json.RawMessage // only when requested (/test)
}

// ErrNoVerdict is returned when the LLM gave no valid verdict within
// max_turns.
var ErrNoVerdict = errors.New("no_verdict: the model did not submit a valid verdict")

// agent runs the submit_verdict tool loop (CONTRACTS §20.5).
type agent struct {
	client *http.Client
}

// newAgent uses http.DefaultTransport, which the SDK routes through the
// egress tunnel in strict network mode.
func newAgent() *agent { return &agent{client: &http.Client{}} }

type chatRequest struct {
	Model       string            `json:"model"`
	Messages    []json.RawMessage `json:"messages"`
	Tools       []json.RawMessage `json:"tools"`
	ToolChoice  json.RawMessage   `json:"tool_choice"`
	Temperature float64           `json:"temperature"`
	MaxTokens   int               `json:"max_tokens"`
	Stream      bool              `json:"stream"`
}

type toolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string          `json:"name"`
		Arguments json.RawMessage `json:"arguments"`
	} `json:"function"`
}

type chatMessage struct {
	Role      string          `json:"role"`
	Content   json.RawMessage `json:"content"`
	ToolCalls []toolCall      `json:"tool_calls"`
}

type chatResponse struct {
	Model   string `json:"model"`
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int64 `json:"prompt_tokens"`
		CompletionTokens int64 `json:"completion_tokens"`
	} `json:"usage"`
}

func rawJSON(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

// run moderates text (already truncated). keepTranscript records every
// message exchanged, including the final assistant message.
func (a *agent) run(ctx context.Context, c *config, text string, keepTranscript bool) (*Result, error) {
	start := time.Now()
	res := &Result{LLMModel: c.Model}
	messages := []json.RawMessage{
		rawJSON(map[string]any{"role": "system", "content": c.prompt}),
		rawJSON(map[string]any{"role": "user", "content": wrapUserContent(c.markerKey, text)}),
	}
	finish := func(err error) (*Result, error) {
		res.Latency = time.Since(start)
		if keepTranscript {
			res.Transcript = messages
		}
		return res, err
	}
	for turn := 1; turn <= c.MaxTurns; turn++ {
		res.Turns = turn
		resp, err := a.call(ctx, c, messages)
		if err != nil {
			return finish(err)
		}
		res.Usage.PromptTokens += resp.Usage.PromptTokens
		res.Usage.CompletionTokens += resp.Usage.CompletionTokens
		if resp.Model != "" {
			res.LLMModel = resp.Model
		}
		if len(resp.Choices) == 0 {
			return finish(errors.New("upstream response has no choices"))
		}
		msg := resp.Choices[0].Message
		content := contentString(msg.Content)
		assistant := map[string]any{"role": "assistant", "content": nullableContent(content)}
		if len(msg.ToolCalls) > 0 {
			for i := range msg.ToolCalls {
				if msg.ToolCalls[i].Type == "" {
					msg.ToolCalls[i].Type = "function"
				}
				if len(msg.ToolCalls[i].Function.Arguments) == 0 {
					msg.ToolCalls[i].Function.Arguments = json.RawMessage(`""`)
				}
			}
			assistant["tool_calls"] = msg.ToolCalls
			messages = append(messages, rawJSON(assistant))
			var feedback []json.RawMessage
			for _, tc := range msg.ToolCalls {
				if tc.Function.Name != ToolName {
					feedback = append(feedback, toolMessage(tc.ID, "未知工具，只能调用 "+ToolName))
					continue
				}
				v, perr := parseVerdict(toolArguments(tc.Function.Arguments), c.categorySet)
				if perr == nil {
					res.Verdict = v
					return finish(nil)
				}
				feedback = append(feedback, toolMessage(tc.ID, "参数不合法："+perr.Error()+"，请重新调用 "+ToolName))
			}
			messages = append(messages, feedback...)
			continue
		}
		messages = append(messages, rawJSON(assistant))
		if v, perr := parseVerdict(jsonFromContent(content), c.categorySet); perr == nil {
			res.Verdict = v
			return finish(nil)
		}
		messages = append(messages, rawJSON(map[string]any{"role": "user", "content": "请调用 " + ToolName + " 工具提交审核结论。"}))
	}
	return finish(ErrNoVerdict)
}

func toolMessage(id, content string) json.RawMessage {
	return rawJSON(map[string]any{"role": "tool", "tool_call_id": id, "content": content})
}

func nullableContent(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// call sends one chat completion request.
func (a *agent) call(ctx context.Context, c *config, messages []json.RawMessage) (*chatResponse, error) {
	body, err := json.Marshal(chatRequest{
		Model: c.Model, Messages: messages, Tools: []json.RawMessage{c.toolJSON}, ToolChoice: c.choiceJSON,
		Temperature: c.Temperature, MaxTokens: c.MaxTokens, Stream: false,
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	resp, err := a.client.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("timeout: %w", ctx.Err())
		}
		return nil, fmt.Errorf("upstream request failed: %s", scrubURL(err.Error()))
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes+1))
	if err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("timeout: %w", ctx.Err())
		}
		return nil, fmt.Errorf("read upstream response: %v", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return nil, fmt.Errorf("upstream HTTP %d: %s", resp.StatusCode, snippet(data, 300))
	}
	if len(data) > maxResponseBytes {
		return nil, errors.New("upstream response exceeds 1 MiB")
	}
	var out chatResponse
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, fmt.Errorf("invalid upstream JSON: %s", snippet(data, 200))
	}
	return &out, nil
}

// scrubURL keeps error messages free of query strings.
func scrubURL(s string) string { return truncateBytes(s, 500) }

func snippet(b []byte, n int) string {
	s := strings.TrimSpace(string(b))
	s = strings.Join(strings.Fields(s), " ")
	return truncateBytes(s, n)
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
		return Verdict{}, fmt.Errorf("verdict 必须是 pass、flag 或 block，收到 %q", truncateRunes(*raw.Verdict, 20))
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
		v.Reason = truncateRunes(strings.TrimSpace(r), 500)
	}
	if v.Verdict == VerdictPass {
		v.Categories = []string{}
	}
	return v, nil
}

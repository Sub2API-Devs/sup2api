package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/tokenizer"
)

// Local count_tokens estimates (CONVERT-MATRIX §8, D9): an account picked
// on a local route answers a count_tokens request without an upstream. The
// text of the request is counted with the core tokenizer; media count
// fixed amounts, those of an image of 1024×1024 that is not downloaded. The
// reply is only the count in the client protocol's shape, without further
// headers.

// Fixed token counts of media.
const (
	anthropicImageTokens = 1373 // resized into 1568 px, 28 px tiles + 4
	geminiImageTokens    = 1290 // 768 px tiles
	fileTokens           = 4096 // PDFs and other documents
	audioTokens          = 256
	videoTokens          = 8192
)

// countLocally answers a count_tokens request on a local route.
func (c *call) countLocally(ctx context.Context) attemptResult {
	n, err := estimateTokens(ctx, c.ep.Protocol, c.body)
	if err != nil {
		return attemptResult{kind: attemptReturn, err: &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code,
			Message: "request cannot be counted: " + err.Error(), RecordType: errTypeInvalidRequest}}
	}
	c.rec.StatusCode, c.rec.Success, c.rec.ErrorType, c.rec.ErrorMessage = http.StatusOK, true, "", ""
	w := c.c.Writer
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(countReply(c.ep.Protocol, n)); err != nil {
		c.rec.Success, c.rec.ErrorType, c.rec.StatusCode = false, errTypeClientCanceled, statusClientClosed
	}
	return attemptResult{kind: attemptDone}
}

// countReply is the client protocol's count_tokens reply.
func countReply(protocol string, n int64) []byte {
	if protocol == "gemini.count_tokens" {
		return fmt.Appendf(nil, `{"totalTokens":%d}`, n)
	}
	return fmt.Appendf(nil, `{"input_tokens":%d}`, n)
}

// estimateTokens estimates the input tokens of a count_tokens request.
func estimateTokens(ctx context.Context, protocol string, body []byte) (int64, error) {
	if !gjson.ValidBytes(body) {
		return 0, errors.New("body is not valid JSON")
	}
	req := gjson.ParseBytes(body)
	var t countText
	switch protocol {
	case "anthropic.count_tokens":
		t.anthropic(req)
	case "gemini.count_tokens":
		t.gemini(req)
	default:
		return 0, fmt.Errorf("no local estimate for %s", protocol)
	}
	n, _, err := tokenizer.Count(ctx, t.text(), "o200k_base")
	return n + t.media, err
}

// countText collects the text of a request, in order, and its media tokens.
type countText struct {
	parts []string
	media int64
}

func (t *countText) add(s string) {
	if s != "" {
		t.parts = append(t.parts, s)
	}
}

// addJSON adds a JSON value compacted.
func (t *countText) addJSON(v gjson.Result) {
	if !v.Exists() || v.Type == gjson.Null {
		return
	}
	var buf bytes.Buffer
	if json.Compact(&buf, []byte(v.Raw)) == nil {
		t.add(buf.String())
	}
}

// text joins the collected text, cut to what the tokenizer counts.
func (t *countText) text() string {
	s := strings.Join(t.parts, "\n")
	if len(s) > tokenizer.MaxTextBytes {
		s = strings.ToValidUTF8(s[:tokenizer.MaxTextBytes], "")
	}
	return s
}

// anthropic collects the system prompt, each message's role and content,
// and the tool definitions.
func (t *countText) anthropic(req gjson.Result) {
	t.anthropicContent(req.Get("system"))
	for _, m := range req.Get("messages").Array() {
		t.add(m.Get("role").String())
		t.anthropicContent(m.Get("content"))
	}
	for _, tool := range req.Get("tools").Array() {
		t.add(tool.Get("name").String())
		t.add(tool.Get("description").String())
		t.addJSON(tool.Get("input_schema"))
		t.addJSON(tool.Get("user_location"))
	}
}

// anthropicContent collects a string or content blocks.
func (t *countText) anthropicContent(c gjson.Result) {
	if c.Type == gjson.String {
		t.add(c.String())
		return
	}
	for _, b := range c.Array() {
		switch b.Get("type").String() {
		case "text":
			t.add(b.Get("text").String())
		case "tool_use", "server_tool_use":
			t.add(b.Get("name").String())
			t.addJSON(b.Get("input"))
		case "tool_result":
			t.anthropicContent(b.Get("content"))
		case "image":
			t.media += anthropicImageTokens
		case "document":
			t.media += fileTokens
		}
	}
}

// gemini collects a generateContent request ({contents, systemInstruction,
// tools}, or wrapped in generateContentRequest), camelCase or snake_case.
func (t *countText) gemini(req gjson.Result) {
	if inner := geminiField(req, "generateContentRequest"); inner.Exists() {
		req = inner
	}
	for _, p := range geminiField(req, "systemInstruction").Get("parts").Array() {
		t.geminiPart(p)
	}
	for _, c := range req.Get("contents").Array() {
		t.add(c.Get("role").String())
		for _, p := range c.Get("parts").Array() {
			t.geminiPart(p)
		}
	}
	for _, tool := range req.Get("tools").Array() {
		t.addJSON(geminiField(tool, "functionDeclarations"))
	}
}

func (t *countText) geminiPart(p gjson.Result) {
	t.add(p.Get("text").String())
	if fc := geminiField(p, "functionCall"); fc.Exists() {
		t.add(fc.Get("name").String())
		t.addJSON(fc.Get("args"))
	}
	t.addJSON(geminiField(p, "functionResponse"))
	for _, k := range []string{"inlineData", "fileData"} {
		if m := geminiField(p, k); m.Exists() {
			t.media += geminiMediaTokens(geminiField(m, "mimeType").String())
		}
	}
}

// geminiMediaTokens is the fixed count of Gemini media of a type.
func geminiMediaTokens(mt string) int64 {
	switch {
	case strings.HasPrefix(mt, "image/"):
		return geminiImageTokens
	case strings.HasPrefix(mt, "audio/"):
		return audioTokens
	case strings.HasPrefix(mt, "video/"):
		return videoTokens
	}
	return fileTokens
}

// geminiField returns the member of o named in camelCase, else its
// snake_case form.
func geminiField(o gjson.Result, camel string) gjson.Result {
	if v := o.Get(camel); v.Exists() {
		return v
	}
	var snake strings.Builder
	for _, r := range camel {
		if r >= 'A' && r <= 'Z' {
			snake.WriteByte('_')
			r += 'a' - 'A'
		}
		snake.WriteRune(r)
	}
	return o.Get(snake.String())
}

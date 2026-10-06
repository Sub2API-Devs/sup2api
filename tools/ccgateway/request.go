package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"time"
)

type Object = map[string]any
type Message struct {
	Role    string   `json:"role"`
	Content []Object `json:"content"`
}
type Tool struct {
	Name         string `json:"name"`
	Description  string `json:"description,omitempty"`
	Schema       Object `json:"input_schema"`
	DeferLoading *bool  `json:"defer_loading,omitempty"`
}
type Request struct {
	diagnostic       *requestDiagnostic
	Model            string
	MaxTokens        int
	Stream           bool
	System           []string
	Messages         []Message
	Tools            []Tool
	NoTools          bool
	Thinking         Object
	Fast             *bool
	Effort           string
	JSONSchema       Object
	PromptCacheTTL   string
	ToolSearch       string
	Betas            []string
	FineGrainedTools bool
	TTL              time.Duration
	Native           map[string]bool
	// Set from the request policy; see outboundRelay.
	PassUpstreamErrors bool
	origin             []int // client array index of each parsed message
}

var toolName = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,64}$`)

func decodeObject(data []byte) (Object, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	var o Object
	if err := dec.Decode(&o); err != nil {
		return nil, err
	}
	if o == nil {
		return nil, fmt.Errorf("expected a JSON object")
	}
	var rest any
	if err := dec.Decode(&rest); err != io.EOF {
		return nil, fmt.Errorf("expected exactly one JSON object")
	}
	return o, nil
}
func keys(o Object, names ...string) error {
	for k := range o {
		found := false
		for _, n := range names {
			if k == n {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("unsupported field %q", k)
		}
	}
	return nil
}
func str(o Object, k string) string { s, _ := o[k].(string); return s }
func positive(v any) int {
	n, ok := v.(json.Number)
	if !ok {
		return 0
	}
	i, e := n.Int64()
	if e != nil || i <= 0 || i > int64(1<<31-1) {
		return 0
	}
	return int(i)
}
func cacheTTL(v any, ttl *time.Duration) error {
	if v == nil {
		return nil
	}
	o, ok := v.(map[string]any)
	if !ok {
		return fmt.Errorf("cache_control must be an object")
	}
	if e := keys(o, "type", "ttl"); e != nil {
		return e
	}
	if str(o, "type") != "ephemeral" {
		return fmt.Errorf("only ephemeral cache_control is supported")
	}
	t := 5 * time.Minute
	if x, exists := o["ttl"]; exists {
		if x == "1h" {
			t = time.Hour
		} else if x != "5m" {
			return fmt.Errorf("cache ttl must be 5m or 1h")
		}
	}
	if t > *ttl {
		*ttl = t
	}
	return nil
}
func blocks(v any, role string, ttl *time.Duration) ([]Object, error) {
	if s, ok := v.(string); ok {
		if s == "" {
			return nil, fmt.Errorf("empty message")
		}
		return []Object{{"type": "text", "text": s}}, nil
	}
	a, ok := v.([]any)
	if !ok || len(a) == 0 {
		return nil, fmt.Errorf("content must be text or a nonempty block array")
	}
	out := make([]Object, 0, len(a))
	for _, v := range a {
		b, ok := v.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("invalid content block")
		}
		if e := cacheTTL(b["cache_control"], ttl); e != nil {
			return nil, e
		}
		delete(b, "cache_control")
		if e := checkBlock(b, role, ttl); e != nil {
			return nil, e
		}
		out = append(out, b)
	}
	return out, nil
}

// checkBlock validates one content block (cache_control already removed);
// tool_result content is normalized in place.
func checkBlock(b Object, role string, ttl *time.Duration) error {
	switch str(b, "type") {
	case "text":
		if e := keys(b, "type", "text"); e != nil {
			return e
		}
		if _, ok := b["text"].(string); !ok {
			return fmt.Errorf("text must be a string")
		}
	case "tool_use":
		return checkToolUse(b, role)
	case "tool_result":
		return checkToolResult(b, role, ttl)
	case "image":
		return checkImage(b, role)
	case "thinking":
		if e := keys(b, "type", "thinking", "signature"); e != nil {
			return e
		}
		if role != "assistant" || str(b, "signature") == "" {
			return fmt.Errorf("invalid thinking block")
		}
		if _, ok := b["thinking"].(string); !ok {
			return fmt.Errorf("invalid thinking text")
		}
	case "redacted_thinking":
		if e := keys(b, "type", "data"); e != nil {
			return e
		}
		if role != "assistant" || str(b, "data") == "" {
			return fmt.Errorf("invalid redacted_thinking")
		}
	default:
		return fmt.Errorf("unsupported content block %q", str(b, "type"))
	}
	return nil
}
func checkToolUse(b Object, role string) error {
	if e := keys(b, "type", "id", "name", "input", "caller"); e != nil {
		return e
	}
	if v, exists := b["caller"]; exists {
		caller, ok := v.(map[string]any)
		if !ok || str(caller, "type") != "direct" {
			return fmt.Errorf("only direct tool callers are supported")
		}
		if e := keys(caller, "type"); e != nil {
			return e
		}
	}
	if role != "assistant" || str(b, "id") == "" || !toolName.MatchString(str(b, "name")) {
		return fmt.Errorf("invalid tool_use")
	}
	if _, ok := b["input"].(map[string]any); !ok {
		return fmt.Errorf("tool input must be an object")
	}
	return nil
}
func checkToolResult(b Object, role string, ttl *time.Duration) error {
	if e := keys(b, "type", "tool_use_id", "content", "is_error"); e != nil {
		return e
	}
	if role != "user" || str(b, "tool_use_id") == "" {
		return fmt.Errorf("invalid tool_result")
	}
	if x, ok := b["is_error"]; ok {
		if _, ok := x.(bool); !ok {
			return fmt.Errorf("is_error must be boolean")
		}
	}
	x, exists := b["content"]
	if !exists {
		return nil
	}
	if _, ok := x.(string); ok {
		return nil
	}
	a, ok := x.([]any)
	if !ok {
		return fmt.Errorf("invalid tool_result content")
	}
	if len(a) == 0 {
		return nil
	}
	bs, e := blocks(a, "user", ttl)
	if e != nil {
		return e
	}
	for _, z := range bs {
		if str(z, "type") != "text" && str(z, "type") != "image" {
			return fmt.Errorf("tool_result supports text/image only")
		}
	}
	b["content"] = bs
	return nil
}
func checkImage(b Object, role string) error {
	if e := keys(b, "type", "source"); e != nil {
		return e
	}
	s, ok := b["source"].(map[string]any)
	if role != "user" || !ok {
		return fmt.Errorf("image must be user content")
	}
	if e := keys(s, "type", "media_type", "data"); e != nil {
		return e
	}
	if str(s, "type") != "base64" || str(s, "data") == "" {
		return fmt.Errorf("only base64 images are supported")
	}
	switch str(s, "media_type") {
	case "image/png", "image/jpeg", "image/gif", "image/webp":
		return nil
	}
	return fmt.Errorf("unsupported image media_type")
}
func parseRequest(data []byte) (*Request, error) {
	o, e := decodeObject(data)
	if e != nil {
		return nil, e
	}
	if e = keys(o, "model", "max_tokens", "stream", "system", "messages", "tools", "tool_choice", "thinking", "cache_control"); e != nil {
		return nil, e
	}
	r := &Request{Model: str(o, "model"), MaxTokens: positive(o["max_tokens"]), TTL: 5 * time.Minute, Native: map[string]bool{}}
	if r.Model == "" || len(r.Model) > 200 || r.MaxTokens == 0 {
		return nil, fmt.Errorf("model and positive integer max_tokens required")
	}
	if v, ok := o["stream"]; ok {
		b, ok := v.(bool)
		if !ok {
			return nil, fmt.Errorf("stream must be boolean")
		}
		r.Stream = b
	}
	if e = cacheTTL(o["cache_control"], &r.TTL); e != nil {
		return nil, e
	}
	if r.System, e = parseSystem(o["system"], &r.TTL); e != nil {
		return nil, e
	}
	if ts, exists := o["tools"]; exists {
		if r.Tools, e = parseTools(ts, &r.TTL); e != nil {
			return nil, e
		}
	}
	if v, ok := o["tool_choice"]; ok {
		if r.NoTools, e = parseToolChoice(v); e != nil {
			return nil, e
		}
	}
	if v, ok := o["thinking"]; ok {
		if r.Thinking, e = parseThinking(v, r.MaxTokens); e != nil {
			return nil, e
		}
	}
	if r.Messages, r.origin, e = parseMessages(o["messages"], &r.TTL); e != nil {
		return nil, e
	}
	if e = validateConversation(r.Messages, r.origin); e != nil {
		return nil, e
	}
	if err := validatePendingSystems(r); err != nil {
		return nil, err
	}
	return r, nil
}

// parseSystem returns the top-level system text blocks; none is one empty block.
func parseSystem(v any, ttl *time.Duration) ([]string, error) {
	switch s := v.(type) {
	case nil:
		return []string{""}, nil
	case string:
		return []string{s}, nil
	case []any:
		var out []string
		for _, v := range s {
			b, ok := v.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("invalid system block")
			}
			if e := keys(b, "type", "text", "cache_control"); e != nil {
				return nil, e
			}
			if str(b, "type") != "text" {
				return nil, fmt.Errorf("system supports text only")
			}
			s, ok := b["text"].(string)
			if !ok {
				return nil, fmt.Errorf("invalid system text")
			}
			if e := cacheTTL(b["cache_control"], ttl); e != nil {
				return nil, e
			}
			out = append(out, s)
		}
		if len(out) == 0 {
			out = []string{""}
		}
		return out, nil
	}
	return nil, fmt.Errorf("system must be a string or text blocks")
}
func parseTools(v any, ttl *time.Duration) ([]Tool, error) {
	a, ok := v.([]any)
	if !ok {
		return nil, fmt.Errorf("tools must be an array")
	}
	var tools []Tool
	seen := map[string]bool{}
	for _, v := range a {
		tool, e := parseTool(v, seen, ttl)
		if e != nil {
			return nil, e
		}
		tools = append(tools, tool)
	}
	return tools, nil
}
func parseTool(v any, seen map[string]bool, ttl *time.Duration) (Tool, error) {
	t, ok := v.(map[string]any)
	if !ok {
		return Tool{}, fmt.Errorf("invalid tool")
	}
	if e := keys(t, "name", "description", "input_schema", "cache_control", "defer_loading"); e != nil {
		return Tool{}, e
	}
	n := str(t, "name")
	s, ok := t["input_schema"].(map[string]any)
	if !toolName.MatchString(n) || seen[n] || !ok || str(s, "type") != "object" {
		return Tool{}, fmt.Errorf("invalid or duplicate tool definition")
	}
	if d, exists := t["description"]; exists {
		if _, ok := d.(string); !ok {
			return Tool{}, fmt.Errorf("tool description must be text")
		}
	}
	seen[n] = true
	if e := cacheTTL(t["cache_control"], ttl); e != nil {
		return Tool{}, e
	}
	var deferLoading *bool
	if value, exists := t["defer_loading"]; exists {
		b, ok := value.(bool)
		if !ok {
			return Tool{}, fmt.Errorf("tools.defer_loading must be boolean")
		}
		deferLoading = &b
	}
	return Tool{Name: n, Description: str(t, "description"), Schema: s, DeferLoading: deferLoading}, nil
}

// parseToolChoice reports whether the client disabled tools.
func parseToolChoice(v any) (bool, error) {
	t, ok := v.(map[string]any)
	if !ok {
		return false, fmt.Errorf("invalid tool_choice")
	}
	if e := keys(t, "type"); e != nil {
		return false, e
	}
	switch str(t, "type") {
	case "auto":
		return false, nil
	case "none":
		return true, nil
	}
	return false, fmt.Errorf("tool_choice supports auto/none only")
}
func parseThinking(v any, maxTokens int) (Object, error) {
	t, ok := v.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid thinking")
	}
	if e := keys(t, "type", "budget_tokens", "display"); e != nil {
		return nil, e
	}
	if display, exists := t["display"]; exists {
		if display != "omitted" && display != "summarized" {
			return nil, fmt.Errorf("thinking.display supports omitted/summarized only")
		}
	}
	switch str(t, "type") {
	case "disabled", "adaptive":
		if _, ok := t["budget_tokens"]; ok {
			return nil, fmt.Errorf("unexpected thinking budget")
		}
	case "enabled":
		b := positive(t["budget_tokens"])
		if b < 1024 || b >= maxTokens {
			return nil, fmt.Errorf("thinking budget must be >=1024 and <max_tokens")
		}
	default:
		return nil, fmt.Errorf("unsupported thinking type")
	}
	return t, nil
}

// parseMessages merges consecutive user or assistant messages, as the API
// does, and returns the client array index of each parsed message.
func parseMessages(v any, ttl *time.Duration) ([]Message, []int, error) {
	a, ok := v.([]any)
	if !ok || len(a) == 0 || len(a) > 100000 {
		return nil, nil, fmt.Errorf("messages must contain 1..100000 messages")
	}
	var messages []Message
	origin := []int{}
	for i, v := range a {
		m, ok := v.(map[string]any)
		if !ok {
			return nil, nil, fmt.Errorf("invalid message")
		}
		role := str(m, "role")
		if role == "system" {
			b, err := parseSystemMessage(m, i, ttl)
			if err != nil {
				return nil, nil, err
			}
			messages = append(messages, Message{Role: role, Content: b})
			origin = append(origin, i)
			continue
		}
		if e := keys(m, "role", "content"); e != nil {
			return nil, nil, e
		}
		if role != "user" && role != "assistant" {
			return nil, nil, fmt.Errorf("messages[%d].role: unsupported role %q; expected user, assistant or system", i, role)
		}
		b, e := blocks(m["content"], role, ttl)
		if e != nil {
			return nil, nil, e
		}
		n := len(messages)
		if n > 0 && messages[n-1].Role == role {
			messages[n-1].Content = append(messages[n-1].Content, b...)
		} else {
			messages = append(messages, Message{role, b})
			origin = append(origin, i)
		}
	}
	return messages, origin, nil
}

// validateConversation checks message positions and tool pairing.
func validateConversation(messages []Message, origin []int) error {
	if err := validateSystemPositions(messages, origin); err != nil {
		return err
	}
	first, last := -1, -1
	for i, m := range messages {
		if m.Role != "system" {
			if first < 0 {
				first = i
			}
			last = i
		}
	}
	if first < 0 || messages[first].Role != "user" || messages[last].Role != "user" {
		return fmt.Errorf("first and last message must be user; assistant prefill unsupported")
	}
	return validateToolPairing(messages)
}

// validateToolPairing requires every tool_use to be answered by the next user
// message, with tool results before any other content.
func validateToolPairing(messages []Message) error {
	pending, seen := map[string]bool{}, map[string]bool{}
	for _, m := range messages {
		if m.Role == "system" {
			continue
		}
		if m.Role == "assistant" && len(pending) > 0 {
			return fmt.Errorf("missing tool results")
		}
		other := false
		for _, b := range m.Content {
			switch str(b, "type") {
			case "tool_use":
				id := str(b, "id")
				if seen[id] {
					return fmt.Errorf("duplicate tool_use id")
				}
				seen[id] = true
				pending[id] = true
			case "tool_result":
				id := str(b, "tool_use_id")
				if other || !pending[id] {
					return fmt.Errorf("unpaired or misplaced tool_result")
				}
				delete(pending, id)
			default:
				other = true
			}
		}
		if m.Role == "user" && len(pending) > 0 {
			return fmt.Errorf("all parallel tool results must be supplied")
		}
	}
	return nil
}
func digest(v any) string {
	b, _ := json.Marshal(v)
	s := sha256.Sum256(b)
	return hex.EncodeToString(s[:])
}
func fingerprints(ms []Message) []string {
	out := make([]string, len(ms))
	prev := "ccgateway-v1"
	for i, m := range ms {
		prev = digest([]any{prev, m})
		out[i] = prev
	}
	return out
}
func (r *Request) configKey() string {
	return digest([]any{r.Model, r.System, r.Tools, r.NoTools, r.Thinking, r.Native, r.Fast, r.Effort, r.Betas, r.FineGrainedTools, r.JSONSchema, r.PromptCacheTTL, r.ToolSearch})
}
func (r *Request) wireName(name string) string {
	if r.Native[name] {
		return name
	}
	if _, _, ok := splitMCPToolName(name); ok {
		return name
	}
	return "mcp__ccgateway__" + name
}
func (r *Request) wireMessage(m Message) Message {
	out := Message{Role: m.Role}
	for _, b := range m.Content {
		c := Object{}
		for k, v := range b {
			c[k] = v
		}
		if str(c, "type") == "tool_use" {
			c["name"] = r.wireName(str(c, "name"))
		}
		out.Content = append(out.Content, c)
	}
	return out
}

package engine

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
	toolCarrier  string
	Role         string          `json:"role"`
	Content      []Object        `json:"content"`
	ClearAt      json.RawMessage `json:"clear_at,omitempty"`
	OutputConfig json.RawMessage `json:"output_config,omitempty"`
}
type Tool struct {
	Name         string `json:"name"`
	Description  string `json:"description,omitempty"`
	Schema       Object `json:"input_schema"`
	DeferLoading *bool  `json:"defer_loading,omitempty"`
	Metadata     Object `json:"-"`
}
type Request struct {
	completedClientHistory  map[string]string
	internalCache           *internalCacheRounds
	helperHistory           *helperHistoryExecution
	credit                  *creditExecution
	creditPTCDeferred       bool
	resource                *resourceExchange
	resources               *resourceAdmission
	MCP                     *MCPConnectorPlan
	imageCarriers           map[string]*imageCarrier
	responseFacts           *providerResponseFacts
	continuation            string
	Plan                    *RequestPlan
	EnvironmentFields       map[string]string
	ClientEnvironmentFields map[string]bool
	diagnostic              *requestDiagnostic
	Model                   string
	MaxTokens               int
	CacheWarmup             bool
	CountTokens             bool
	Stream                  bool
	System                  []string
	Messages                []Message
	Tools                   []Tool
	ServerTools             []Object
	APIClientTools          []Object
	APIToolCatalog          []Object
	InlineTools             *inlineToolTimeline
	NoTools                 bool
	Thinking                Object
	Fast                    *bool
	Effort                  string
	JSONSchema              Object
	APIOutputFormat         bool
	PromptCacheTTL          string
	ToolSearch              string
	Betas                   []string
	FineGrainedTools        bool
	TTL                     time.Duration
	Native                  map[string]bool
	CustomToolPrefix        string
	// Set from the request policy; see outboundRelay.
	PassUpstreamErrors       bool
	AttachmentSources        map[string]string
	AttachmentDecisions      []Object
	UnknownClientAttachment  string
	UnknownGatewayAttachment string
	AttachmentSource         string // "client", "gateway", or "both"
	origin                   []int  // client array index of each parsed message
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
func blocks(v any, role string, ttl *time.Duration, access ...*resourceAdmission) ([]Object, error) {
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
		if doc := webFetchedDocument(b); doc != nil {
			if err := visitProtocolBlocks([]Object{doc}, func(block Object) error { return cacheTTL(block["cache_control"], ttl) }); err != nil {
				return nil, err
			}
		}
		cache, hasCache := b["cache_control"]
		delete(b, "cache_control")
		if e := checkBlock(b, role, ttl, access...); e != nil {
			return nil, e
		}
		if hasCache {
			b["cache_control"] = cache
		}
		out = append(out, b)
	}
	return out, nil
}

// checkBlock validates one content block (cache_control already removed);
// tool_result content is normalized in place.
func checkBlock(b Object, role string, ttl *time.Duration, access ...*resourceAdmission) error {
	switch str(b, "type") {
	case "container_upload":
		if role != "user" {
			return fmt.Errorf("container_upload must be user content")
		}
		if err := keys(b, "type", "file_id"); err != nil {
			return err
		}
		return checkAdmittedFile(str(b, "file_id"), access...)
	case "fallback":
		return checkFallbackBlock(b, role)
	case "text":
		if e := keys(b, "type", "text", "citations"); e != nil {
			return e
		}
		if e := checkCitations(b["citations"]); e != nil {
			return e
		}
		if _, ok := b["text"].(string); !ok {
			return fmt.Errorf("text must be a string")
		}
	case "tool_use":
		return checkToolUse(b, role)
	case "server_tool_use", "tool_search_tool_result", "web_search_tool_result", "web_fetch_tool_result", "advisor_tool_result", "code_execution_tool_result", "bash_code_execution_tool_result", "text_editor_code_execution_tool_result":
		return checkServerSearchBlock(b, role)
	case "mcp_tool_use", "mcp_tool_result", "mcp_tool_listing":
		return checkMCPBlock(b, role)
	case "tool_result":
		return checkToolResult(b, role, ttl, access...)
	case "image":
		return checkImage(b, role, access...)
	case "document":
		return checkDocument(b, role, ttl, access...)
	case "search_result":
		return checkSearchResult(b, role, ttl)
	case "compaction":
		return checkCompactionBlock(b, role, false)
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
	if e := keys(b, "type", "id", "name", "input", "caller", "toolset_name"); e != nil {
		return e
	}
	if v, exists := b["caller"]; exists {
		if e := checkProviderCaller(v); e != nil {
			return e
		}
	}
	if err := validateToolsetIdentityField(b); err != nil {
		return err
	}
	if role != "assistant" || str(b, "id") == "" || !toolName.MatchString(str(b, "name")) {
		return fmt.Errorf("invalid tool_use")
	}
	if _, ok := b["input"].(map[string]any); !ok {
		return fmt.Errorf("tool input must be an object")
	}
	return nil
}
func checkToolResult(b Object, role string, ttl *time.Duration, access ...*resourceAdmission) error {
	if e := keys(b, "type", "tool_use_id", "content", "is_error", "toolset_name"); e != nil {
		return e
	}
	if err := validateToolsetIdentityField(b); err != nil {
		return err
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
	bs, e := parseToolResultBlocks(a, b, ttl, access...)
	if e != nil {
		return e
	}
	b["content"] = bs
	return nil
}
func checkImage(b Object, role string, access ...*resourceAdmission) error {
	if e := keys(b, "type", "source", "transformations"); e != nil {
		return e
	}
	s, ok := b["source"].(map[string]any)
	if role != "user" || !ok {
		return fmt.Errorf("image must be user content")
	}
	if err := checkImageTransformations(b["transformations"]); err != nil {
		return err
	}
	return checkImageSource(s, access...)
}
func parseRequest(data []byte, interleaved ...bool) (*Request, error) {
	return parseRequestWithMCP(data, nil, interleaved...)
}

func parseRequestWithMCP(data []byte, mcp *MCPConnectorPlan, interleaved ...bool) (*Request, error) {
	return parseRequestWithResources(data, mcp, nil, interleaved...)
}
func parseRequestWithResources(data []byte, mcp *MCPConnectorPlan, access *resourceAdmission, interleaved ...bool) (*Request, error) {
	return parseRequestCreditCandidate(data, mcp, access, false, interleaved...)
}

// creditCandidate defers only the final unfinished tool turn. It grants no
// execution: main admission must subsequently prove the exact stored claim.
func parseRequestCreditCandidate(data []byte, mcp *MCPConnectorPlan, access *resourceAdmission, creditCandidate bool, interleaved ...bool) (*Request, error) {
	o, e := decodeObject(data)
	if e != nil {
		return nil, e
	}
	if e = keys(o, "model", "max_tokens", "stream", "system", "messages", "tools", "tool_choice", "thinking", "cache_control"); e != nil {
		return nil, e
	}
	r := &Request{MCP: mcp, resources: access, Model: str(o, "model"), MaxTokens: positive(o["max_tokens"]), TTL: 5 * time.Minute, Native: map[string]bool{}}
	r.creditPTCDeferred = creditCandidate
	if n, ok := o["max_tokens"].(json.Number); ok {
		i, err := n.Int64()
		r.CacheWarmup = err == nil && i == 0
	}
	if r.Model == "" || len(r.Model) > 200 || r.MaxTokens == 0 && !r.CacheWarmup {
		return nil, fmt.Errorf("model and nonnegative integer max_tokens required")
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
	var baseTools []Object
	if ts, exists := o["tools"]; exists {
		if items, ok := ts.([]any); ok {
			for _, item := range items {
				if tool, ok := item.(map[string]any); ok {
					copy, err := jsonCopyObject(tool)
					if err != nil {
						return nil, err
					}
					baseTools = append(baseTools, copy)
				}
			}
		}
		var clientTools any
		if ts, r.APIClientTools, r.APIToolCatalog, e = splitAPIClientTools(ts, &r.TTL); e != nil {
			return nil, e
		}
		if clientTools, r.ServerTools, e = splitServerSearchTools(ts, &r.TTL); e != nil {
			return nil, e
		}
		if r.Tools, e = parseTools(clientTools, &r.TTL); e != nil {
			return nil, e
		}
	}
	if v, ok := o["tool_choice"]; ok {
		if r.NoTools, e = parseToolChoice(v); e != nil {
			return nil, e
		}
	}
	if v, ok := o["thinking"]; ok {
		if r.Thinking, e = parseThinking(v, r.MaxTokens, len(interleaved) > 0 && interleaved[0]); e != nil {
			return nil, e
		}
	}
	if r.Messages, r.origin, e = parseMessages(o["messages"], &r.TTL, access); e != nil {
		return nil, e
	}
	if e = r.compileInlineTools(baseTools); e != nil {
		return nil, e
	}
	if e = r.compileMCPTimeline(); e != nil {
		return nil, e
	}
	if e = r.validateExecutionAdmission(); e != nil {
		return nil, e
	}
	if e = r.validateSearchResultCitations(); e != nil {
		return nil, e
	}
	r.prepareImageCarriers()
	if e = validateConversation(r.Messages, r.origin, creditCandidate); e != nil {
		return nil, e
	}
	if e = r.compileCompletedClientHistory(); e != nil {
		return nil, e
	}
	r.configureContinuation()
	if e = r.validateServerSearchHistory(); e != nil {
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
	if e := keys(t, "name", "description", "input_schema", "cache_control", "defer_loading", "type", "strict", "eager_input_streaming", "input_examples", "allowed_callers"); e != nil {
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
	metadata, e := parseToolMetadata(t, true)
	if e != nil {
		return Tool{}, e
	}
	return Tool{Name: n, Description: str(t, "description"), Schema: s, DeferLoading: deferLoading, Metadata: metadata}, nil
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
func parseThinking(v any, maxTokens int, interleaved ...bool) (Object, error) {
	t, ok := v.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid thinking")
	}
	if e := keys(t, "type", "budget_tokens", "display", "block_binding"); e != nil {
		return nil, e
	}
	if display, exists := t["display"]; exists {
		if display != "omitted" && display != "summarized" && display != "updates" {
			return nil, fmt.Errorf("thinking.display supports omitted, summarized or updates")
		}
	}
	switch str(t, "type") {
	case "between_tools":
		if len(t) != 1 {
			return nil, fmt.Errorf("thinking between_tools accepts only type")
		}
	case "disabled", "adaptive":
		if _, ok := t["budget_tokens"]; ok {
			return nil, fmt.Errorf("unexpected thinking budget")
		}
	case "enabled":
		b := positive(t["budget_tokens"])
		if b < 1024 || (b >= maxTokens && (len(interleaved) == 0 || !interleaved[0])) {
			return nil, fmt.Errorf("thinking budget must be >=1024 and <max_tokens")
		}
	default:
		return nil, fmt.Errorf("unsupported thinking type")
	}
	if str(t, "type") == "disabled" && len(t) != 1 {
		return nil, fmt.Errorf("disabled thinking accepts only type")
	}
	if binding, exists := t["block_binding"]; exists {
		b, ok := binding.(map[string]any)
		if !ok || len(b) != 1 || (str(b, "prefix_mismatch_behavior") != "error" && str(b, "prefix_mismatch_behavior") != "drop_block") {
			return nil, fmt.Errorf("invalid thinking.block_binding")
		}
	}
	return t, nil
}

// parseMessages merges consecutive user or assistant messages, as the API
// does, and returns the client array index of each parsed message.
func parseMessages(v any, ttl *time.Duration, access ...*resourceAdmission) ([]Message, []int, error) {
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
			message := Message{Role: role, Content: b}
			if value, exists := m["clear_at"]; exists {
				message.ClearAt, _ = json.Marshal(value)
			}
			if value, exists := m["output_config"]; exists {
				message.OutputConfig, _ = json.Marshal(value)
			}
			messages = append(messages, message)
			origin = append(origin, i)
			continue
		}
		if e := keys(m, "role", "content"); e != nil {
			return nil, nil, e
		}
		if role != "user" && role != "assistant" {
			return nil, nil, fmt.Errorf("messages[%d].role: unsupported role %q; expected user, assistant or system", i, role)
		}
		b, e := blocks(m["content"], role, ttl, access...)
		if e != nil {
			return nil, nil, e
		}
		n := len(messages)
		if n > 0 && messages[n-1].Role == role {
			messages[n-1].Content = append(messages[n-1].Content, b...)
		} else {
			messages = append(messages, Message{Role: role, Content: b})
			origin = append(origin, i)
		}
	}
	return messages, origin, nil
}

// validateConversation checks message positions and tool pairing.
func validateConversation(messages []Message, origin []int, creditCandidate ...bool) error {
	if err := validateSystemPositions(messages, origin); err != nil {
		return err
	}
	first := -1
	for i, m := range messages {
		if m.Role != "system" {
			if first < 0 {
				first = i
			}
		}
	}
	if first < 0 || (messages[first].Role != "user" && (len(messages[first].Content) == 0 || str(messages[first].Content[0], "type") != "compaction")) {
		return fmt.Errorf("first message must be user")
	}
	return validateToolPairing(messages, creditCandidate...)
}

// validateToolPairing requires every tool_use to be answered by the next user
// message, with tool results before any other content.
func validateToolPairing(messages []Message, creditCandidate ...bool) error {
	pending, seen := map[string]ToolIdentity{}, map[string]bool{}
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
				pending[id] = ToolIdentity{Toolset: str(b, "toolset_name"), Name: str(b, "name")}
			case "tool_result":
				id := str(b, "tool_use_id")
				identity, exists := pending[id]
				if other || !exists || identity.Toolset != str(b, "toolset_name") {
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
	if len(pending) > 0 && !(len(creditCandidate) > 0 && creditCandidate[0]) {
		return fmt.Errorf("missing client tool results before assistant continuation")
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
		m.Content = withoutProtocolCache(m.Content)
		prev = digest([]any{prev, m})
		out[i] = prev
	}
	return out
}
func (r *Request) configKey() string {
	parts := []any{r.Model, r.System, r.Tools, r.NoTools, r.Thinking, r.Native, r.Fast, r.Effort, r.Betas, r.FineGrainedTools, r.JSONSchema, r.PromptCacheTTL, r.ToolSearch, r.customToolServer()}
	if r.MCP != nil {
		parts = append(parts, r.MCP.servers, r.MCP.toolsets)
	}
	if len(r.APIClientTools) > 0 {
		parts = append(parts, r.APIToolCatalog)
	}
	if len(r.ServerTools) > 0 {
		parts = append(parts, r.ServerTools)
	}
	if metadata := r.toolMetadataKey(); len(metadata) > 0 {
		parts = append(parts, metadata)
	}
	return digest(parts)
}
func (r *Request) wireName(name string) string {
	if r.acceptsAPIClientIdentity(ToolIdentity{Name: name}) {
		return name
	}
	if r.declaresServerTool(name) {
		return name
	}
	if r.Native[name] {
		return name
	}
	if _, _, ok := splitMCPToolName(name); ok {
		return name
	}
	return "mcp__" + r.customToolServer() + "__" + name
}
func (r *Request) wireMessage(m Message) Message {
	out := Message{Role: m.Role, ClearAt: append(json.RawMessage(nil), m.ClearAt...), OutputConfig: append(json.RawMessage(nil), m.OutputConfig...)}
	if m.directiveOnly() {
		out.Content = []Object{}
	}
	for _, b := range withoutProtocolCache(m.Content) {
		c := Object{}
		for k, v := range b {
			c[k] = v
		}
		if inlineToolBlock(c) {
			c = r.wireInlineToolBlock(c)
		}
		if str(c, "type") == "tool_use" && str(c, "toolset_name") == "" && !r.completedClientHistoryBlock(b) {
			c["name"] = r.wireName(str(c, "name"))
		}
		if str(c, "type") == "tool_search_tool_result" {
			c, _ = mapSearchReferences(c, r.wireSearchReferenceName)
		}
		out.Content = append(out.Content, c)
	}
	return out
}

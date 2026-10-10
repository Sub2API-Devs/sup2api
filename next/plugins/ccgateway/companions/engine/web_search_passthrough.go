package engine

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// web_search in relay passthrough (PASSTHROUGH-DESIGN.md section 8). The
// client's server tool becomes Claude Code's own WebSearch: the main CLI
// offers it, and when the model calls it the Mod asks the Worker, which runs
// the search in a one-shot CLI process of the same account (a search Mod
// calls WebSearch there and ends the turn; upstream sees one search request).
// The result goes back into the main CLI's turn, which continues. The client
// receives server_tool_use and web_search_tool_result blocks; each result's
// encrypted_content is issued by the gateway and carries what the model read,
// so any account's Worker can put the search back into a native transcript.
// A request of the Claude Code client's own WebSearch tool (its side query)
// is answered by the one-shot process alone.

// webSearchPlan is the client's web_search tool and the run's searches.
type webSearchPlan struct {
	allowed, blocked []any
	maxUses          int // 0: no limit
	mu               sync.Mutex
	used             int
	records          map[string]*webSearchRecord // by the main CLI's tool_use ID
	usage            Object                      // tokens of the one-shot processes
}

// webSearchRecord is one search: the input the model gave WebSearch, its
// output, the text the model read, or the error code the client receives.
type webSearchRecord struct {
	Input  Object
	Result Object
	Text   string
	Error  string
}

const (
	webSearchContentPrefix = "ccgws1."
	webSearchFastPrompt    = "Perform a web search for the query: "
	webSearchMaxRounds     = 8
)

// The key only marks the gateway's own result format: a client can write any
// history it likes, so this is not a secret, and every Worker shares it.
var webSearchContentKey = []byte("ccgateway-web-search-result-v1")

// configureWebSearch takes the client's web_search tool out of ServerTools.
func (r *Request) configureWebSearch() error {
	var servers []Object
	for _, tool := range r.ServerTools {
		if serverToolName(str(tool, "type")) != "web_search" {
			servers = append(servers, tool)
			continue
		}
		for _, field := range []string{"user_location", "response_inclusion", "allowed_callers"} {
			if _, exists := tool[field]; exists {
				return passthroughRefusal("web_search "+field, "Claude Code's WebSearch has no such option")
			}
		}
		if tool["defer_loading"] == true {
			return passthroughRefusal("a deferred web_search", "Claude Code's WebSearch is always loaded")
		}
		plan := &webSearchPlan{records: map[string]*webSearchRecord{}, usage: Object{}}
		plan.allowed, _ = tool["allowed_domains"].([]any)
		plan.blocked, _ = tool["blocked_domains"].([]any)
		if n, ok := tool["max_uses"].(json.Number); ok {
			value, _ := n.Int64()
			plan.maxUses = int(value)
		}
		r.webSearch = plan
	}
	r.ServerTools = servers
	if r.webSearch == nil {
		return nil
	}
	for _, tool := range r.Tools {
		if tool.Name == "WebSearch" {
			return passthroughRefusal("a web_search server tool beside a client WebSearch tool", "both would be Claude Code's WebSearch")
		}
	}
	return nil
}

// webSearchFastQuery is the query of a Claude Code client's own WebSearch side
// query: one web_search tool, one user message with the CLI's prompt.
func (r *Request) webSearchFastQuery() (string, bool) {
	if r.webSearch == nil || len(r.Tools) > 0 || len(r.Messages) != 1 || r.Messages[0].Role != "user" || len(r.Messages[0].Content) != 1 {
		return "", false
	}
	block := r.Messages[0].Content[0]
	query, ok := strings.CutPrefix(str(block, "text"), webSearchFastPrompt)
	return query, ok && str(block, "type") == "text" && query != ""
}

// searchInput is the WebSearch input with the client tool's domain limits.
func (w *webSearchPlan) searchInput(input Object) Object {
	out := Object{"query": str(input, "query")}
	for _, key := range []string{"allowed_domains", "blocked_domains"} {
		if value, exists := input[key]; exists {
			out[key] = value
		}
	}
	if len(w.allowed) > 0 {
		out["allowed_domains"] = w.allowed
	}
	if len(w.blocked) > 0 {
		out["blocked_domains"] = w.blocked
	}
	return out
}

// search runs one search for the main CLI's tool_use id and answers the Mod:
// {"result": output} or {"error": text the model reads}.
func (w *webSearchPlan) search(ctx context.Context, run func(context.Context, Object) (*webSearchRecord, error), id string, input Object) Object {
	w.mu.Lock()
	if w.maxUses > 0 && w.used >= w.maxUses {
		w.records[id] = &webSearchRecord{Input: input, Error: "max_uses_exceeded"}
		w.mu.Unlock()
		return Object{"error": "Web search error: max_uses_exceeded"}
	}
	w.used++
	w.mu.Unlock()
	record, err := run(ctx, w.searchInput(input))
	if err != nil || record == nil {
		record = &webSearchRecord{Error: "unavailable"}
	}
	record.Input = input
	w.mu.Lock()
	w.records[id] = record
	w.mu.Unlock()
	if record.Error != "" {
		return Object{"error": "Web search error: " + record.Error}
	}
	return Object{"result": record.Result}
}

func (w *webSearchPlan) record(id string) *webSearchRecord {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.records[id]
}

// searches counts the searches that ran, for usage.server_tool_use.
func (w *webSearchPlan) searches() int {
	w.mu.Lock()
	defer w.mu.Unlock()
	n := 0
	for _, record := range w.records {
		if record.Error == "" {
			n++
		}
	}
	return n
}

func serverToolUseID(native string) string {
	return "srvtoolu_" + strings.TrimPrefix(native, "toolu_")
}
func nativeToolUseID(server string) string {
	return "toolu_" + strings.TrimPrefix(server, "srvtoolu_")
}

// webSearchPayload is what the first result's encrypted_content carries.
type webSearchPayload struct {
	Version int    `json:"v"`
	Input   Object `json:"input,omitempty"`
	Text    string `json:"text,omitempty"`
	Title   string `json:"title,omitempty"`
	URL     string `json:"url,omitempty"`
}

func signWebSearchContent(payload webSearchPayload) string {
	payload.Version = 1
	raw, _ := marshalPlain(payload)
	mac := hmac.New(sha256.New, webSearchContentKey)
	mac.Write(raw)
	return webSearchContentPrefix + base64.RawURLEncoding.EncodeToString(raw) + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)[:16])
}

// openWebSearchContent reads a gateway-issued encrypted_content.
func openWebSearchContent(content string) (webSearchPayload, bool) {
	var payload webSearchPayload
	body, ok := strings.CutPrefix(content, webSearchContentPrefix)
	encoded, signature, found := strings.Cut(body, ".")
	if !ok || !found {
		return payload, false
	}
	raw, err1 := base64.RawURLEncoding.DecodeString(encoded)
	sum, err2 := base64.RawURLEncoding.DecodeString(signature)
	mac := hmac.New(sha256.New, webSearchContentKey)
	mac.Write(raw)
	if err1 != nil || err2 != nil || !hmac.Equal(sum, mac.Sum(nil)[:16]) || json.Unmarshal(raw, &payload) != nil || payload.Version != 1 {
		return payload, false
	}
	return payload, true
}

// webSearchLinks are the {title, url} entries of a WebSearch output.
func webSearchLinks(result Object) []Object {
	var links []Object
	items, _ := result["results"].([]any)
	for _, item := range items {
		entry, _ := item.(map[string]any)
		content, _ := entry["content"].([]any)
		for _, value := range content {
			if link, ok := value.(map[string]any); ok {
				links = append(links, link)
			}
		}
	}
	return links
}

// resultBlock is the client's web_search_tool_result for a search.
func (record *webSearchRecord) resultBlock(id string) Object {
	if record == nil || record.Error != "" {
		code := "unavailable"
		if record != nil {
			code = record.Error
		}
		return Object{"type": "web_search_tool_result", "tool_use_id": id, "content": Object{"type": "web_search_tool_result_error", "error_code": code}}
	}
	content := []any{}
	for i, link := range webSearchLinks(record.Result) {
		payload := webSearchPayload{Title: str(link, "title"), URL: str(link, "url")}
		if i == 0 {
			payload.Input, payload.Text = record.Input, record.Text
		}
		content = append(content, Object{"type": "web_search_result", "title": str(link, "title"), "url": str(link, "url"), "encrypted_content": signWebSearchContent(payload), "page_age": nil})
	}
	return Object{"type": "web_search_tool_result", "tool_use_id": id, "content": content}
}

// convertBlocks turns a round's WebSearch calls into the client's
// server_tool_use and web_search_tool_result pairs. internal reports a round
// whose calls were all searches the Worker ran, which the CLI continues.
func (w *webSearchPlan) convertBlocks(blocks []Object, stopReason string) (out []Object, internal bool) {
	searched, answered, client := false, true, false
	for _, block := range blocks {
		if str(block, "type") != "tool_use" || str(block, "name") != "WebSearch" {
			client = client || str(block, "type") == "tool_use"
			out = append(out, block)
			continue
		}
		input, _ := block["input"].(map[string]any)
		id := serverToolUseID(str(block, "id"))
		record := w.record(str(block, "id"))
		searched, answered = true, answered && record != nil
		out = append(out, Object{"type": "server_tool_use", "id": id, "name": "web_search", "input": Object{"query": str(input, "query")}}, record.resultBlock(id))
	}
	return out, searched && answered && !client && stopReason == "tool_use"
}

// nativeWebSearchTurns is an assistant message of client history as the
// native transcript holds it: each run of server_tool_use and its results
// becomes Claude Code's WebSearch call and its tool result.
func nativeWebSearchTurns(m Message) ([]Message, error) {
	var out []Message
	assistant := Message{Role: "assistant"}
	var results []Object
	inputs := map[string]Object{}
	for _, block := range m.Content {
		switch {
		case str(block, "type") == "server_tool_use" && str(block, "name") == "web_search":
			if len(results) > 0 {
				out = append(out, assistant, Message{Role: "user", Content: results})
				assistant, results = Message{Role: "assistant"}, nil
			}
			input, _ := block["input"].(map[string]any)
			inputs[str(block, "id")] = input
			assistant.Content = append(assistant.Content, Object{"type": "tool_use", "id": nativeToolUseID(str(block, "id")), "name": "WebSearch", "input": input})
		case str(block, "type") == "web_search_tool_result":
			text, input, isError := webSearchHistoryText(block, inputs[str(block, "tool_use_id")])
			for i, item := range assistant.Content {
				if str(item, "type") == "tool_use" && str(item, "id") == nativeToolUseID(str(block, "tool_use_id")) && input != nil {
					assistant.Content[i]["input"] = input
				}
			}
			result := Object{"type": "tool_result", "tool_use_id": nativeToolUseID(str(block, "tool_use_id")), "content": text}
			if isError {
				result["is_error"] = true
			}
			results = append(results, result)
		default:
			if len(results) > 0 {
				out = append(out, assistant, Message{Role: "user", Content: results})
				assistant, results = Message{Role: "assistant"}, nil
			}
			assistant.Content = append(assistant.Content, block)
		}
	}
	if len(results) > 0 {
		return nil, passthroughRefusal("an assistant turn ending with a web search result", "Claude Code continues a search in the same turn")
	}
	if len(assistant.Content) > 0 {
		out = append(out, assistant)
	}
	return out, nil
}

// webSearchHistoryText is the tool result the model read for a search of
// client history, and the WebSearch input it had.
func webSearchHistoryText(block Object, fallback Object) (string, Object, bool) {
	if content, ok := block["content"].(map[string]any); ok {
		return "Web search error: " + str(content, "error_code"), nil, true
	}
	items, _ := block["content"].([]any)
	var links []Object
	for i, item := range items {
		entry, _ := item.(map[string]any)
		payload, _ := openWebSearchContent(str(entry, "encrypted_content"))
		if i == 0 && payload.Text != "" {
			return payload.Text, payload.Input, false
		}
		links = append(links, Object{"title": str(entry, "title"), "url": str(entry, "url")})
	}
	// No recorded text: the format of Claude Code's WebSearch for these links.
	query := str(fallback, "query")
	text := "Web search results for query: \"" + query + "\"\n\n"
	if len(links) > 0 {
		raw, _ := marshalPlain(links)
		text += "Links: " + string(raw) + "\n\n"
	}
	text += "\nREMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks."
	return strings.TrimSpace(text), nil, false
}

// checkWebSearchHistory admits search blocks of client history only when
// this gateway issued them.
func checkWebSearchHistory(block Object) error {
	if str(block, "type") == "server_tool_use" {
		if str(block, "name") != "web_search" {
			return passthroughRefusal(fmt.Sprintf("history server tool %q", str(block, "name")), "Claude Code cannot replay it")
		}
		return nil
	}
	if _, isError := block["content"].(map[string]any); isError {
		return nil
	}
	items, _ := block["content"].([]any)
	for _, item := range items {
		entry, _ := item.(map[string]any)
		if _, ok := openWebSearchContent(str(entry, "encrypted_content")); !ok {
			return passthroughRefusal("a web_search_tool_result not issued by this gateway", "its encrypted_content cannot be read")
		}
	}
	return nil
}

// runWebSearch runs WebSearch once in a one-shot CLI process of this account
// and reads the output and the text the model reads from the search Mod. An
// error of the API itself comes back as sent: the account's own state (a
// rate limit, an expired login) is the gateway's to act on.
func (r *Runner) runWebSearch(ctx context.Context, req *Request, dir string, input Object) (*webSearchRecord, *upstreamError, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Minute)
	defer cancel()
	work, err := os.MkdirTemp(dir, "search-")
	if err != nil {
		return nil, nil, err
	}
	defer os.RemoveAll(work)
	search := &Request{Passthrough: true, Model: req.Model, diagnostic: req.diagnostic, responseFacts: &providerResponseFacts{}}
	base := r.baseEnv()
	relay, err := startOutboundRelay(search, base, r.InternalBaseURL)
	if err != nil {
		return nil, nil, err
	}
	defer relay.Close()
	usage := Object{}
	var mu sync.Mutex
	relay.observeEvent = func(event Object) {
		mu.Lock()
		defer mu.Unlock()
		addStreamUsage(usage, event)
	}
	relay.setAbort(cancel)
	control, err := startModControl(&runConfig{diagnostic: req.diagnostic, attachments: Object{}, tools: Object{}}, r.InternalBaseURL)
	if err != nil {
		return nil, nil, err
	}
	defer control.Close()
	control.searchOnly = true
	raw, _ := marshalPlain(input)
	env := map[string]string{"CCGATEWAY_MOD_URL": control.URL, "CCGATEWAY_MOD_TOKEN": control.token, "CCGATEWAY_SEARCH_INPUT": string(raw),
		"DISABLE_AUTOUPDATER": "1", "DISABLE_AUTO_COMPACT": "1", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "CLAUDE_CODE_DISABLE_CLAUDE_MDS": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "CLAUDE_CODE_MAX_RETRIES": "0", "ENABLE_TOOL_SEARCH": "false"}
	for k, v := range relayEnv(base, relay) {
		env[k] = v
	}
	args := []string{"-p", "web search", "--output-format", "stream-json", "--verbose", "--tools", "WebSearch", "--allowedTools", "WebSearch", "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", `{"disableAllHooks":false}`, "--no-chrome", "--disable-slash-commands", "--no-session-persistence", "--max-turns", "1", "--model=" + req.Model, "--plugin-dir", filepath.Join(r.Plugin, "search")}
	cmd := exec.CommandContext(ctx, r.CLI, args...)
	cmd.Dir = work
	cmd.Env = envWith(base, env, inheritedCLIEnv...)
	cmd.Stdin = bytes.NewReader(nil)
	cmd.Stdout = io.Discard
	cmd.Stderr = io.Discard
	if r.Stderr != nil {
		cmd.Stderr = r.Stderr
	}
	req.diagnostic.trace("web_search_started", Object{"query_bytes": len(str(input, "query"))})
	_ = cmd.Run()
	answer := control.searchAnswer()
	mu.Lock()
	defer mu.Unlock()
	req.diagnostic.trace("web_search_finished", Object{"answered": answer != nil, "usage": usage})
	if upstream := relay.UpstreamError(); upstream != nil {
		code := "unavailable"
		if upstream.Status == 429 {
			code = "too_many_requests"
		}
		return &webSearchRecord{Error: code}, upstream, nil
	}
	if answer == nil {
		return nil, nil, fmt.Errorf("web search process gave no answer")
	}
	if text := str(answer, "error"); text != "" {
		return &webSearchRecord{Error: "unavailable"}, nil, nil
	}
	result, _ := answer["result"].(map[string]any)
	if result == nil {
		return nil, nil, fmt.Errorf("web search process gave no result")
	}
	if req.webSearch != nil {
		req.webSearch.mu.Lock()
		addUsageTotals(req.webSearch.usage, usage)
		req.webSearch.mu.Unlock()
	}
	return &webSearchRecord{Result: result, Text: str(answer, "text")}, nil, nil
}

// serveWebSearchFast answers a Claude Code client's WebSearch side query with
// the one-shot process alone: one upstream search request.
func (x *exchange) serveWebSearchFast(ctx context.Context, dir, query string) {
	req := x.req
	x.diagnostic.setStage("web_search")
	input := req.webSearch.searchInput(Object{"query": query})
	record, upstream, err := x.g.Runner.runWebSearch(ctx, req, dir, input)
	if upstream != nil && ctx.Err() == nil {
		x.passUpstream(upstream, Object{"type": "api_error", "message": upstream.Error()})
		return
	}
	if err == nil && ctx.Err() != nil {
		err = ctx.Err()
	}
	if err != nil {
		x.runFailed(ctx, err)
		return
	}
	record.Input = input
	req.webSearch.mu.Lock()
	req.webSearch.used++
	req.webSearch.records["fast"] = record
	req.webSearch.mu.Unlock()
	answer := webSearchAnswer(req, record, query)
	x.diagnostic.setStage("completed")
	if !req.Stream {
		x.rememberMessageID(answer)
		x.w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(x.w).Encode(answer)
		return
	}
	for _, event := range append(messageEvents(answer), Object{"type": "message_stop"}) {
		if x.send(event) != nil {
			return
		}
	}
}

// addStreamUsage adds one model stream's usage: message_start carries the
// input side, message_delta the final output count.
func addStreamUsage(total, event Object) {
	switch str(event, "type") {
	case "message_start":
		message, _ := event["message"].(map[string]any)
		usage, _ := message["usage"].(map[string]any)
		for _, key := range []string{"input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"} {
			addNumber(total, key, usage[key])
		}
		addCacheCreation(total, usage)
	case "message_delta":
		usage, _ := event["usage"].(map[string]any)
		addNumber(total, "output_tokens", usage["output_tokens"])
	}
}

func addUsageTotals(total, usage Object) {
	for _, key := range []string{"input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"} {
		addNumber(total, key, usage[key])
	}
	addCacheCreation(total, usage)
}

// addCacheCreation adds the split of cache writes by lifetime, which prices
// them.
func addCacheCreation(total, usage Object) {
	split, _ := usage["cache_creation"].(Object)
	if split == nil {
		return
	}
	sum, _ := total["cache_creation"].(Object)
	if sum == nil {
		sum = Object{}
		total["cache_creation"] = sum
	}
	for key, value := range split {
		addNumber(sum, key, value)
	}
}

func addNumber(total Object, key string, value any) {
	n, ok := usageInt(value)
	if !ok {
		return
	}
	prior, _ := usageInt(total[key])
	total[key] = prior + n
}

func usageInt(value any) (int64, bool) {
	switch v := value.(type) {
	case json.Number:
		n, err := v.Int64()
		return n, err == nil
	case float64:
		return int64(v), true
	case int64:
		return v, true
	case int:
		return int64(v), true
	}
	return 0, false
}

// webSearchUsage is the response usage: the CLI rounds' tokens, the one-shot
// processes' tokens and the number of searches.
func (w *webSearchPlan) webSearchUsage(rounds Object) Object {
	out := copySearchUsage(rounds)
	w.mu.Lock()
	addUsageTotals(out, w.usage)
	w.mu.Unlock()
	server, _ := out["server_tool_use"].(Object)
	if server == nil {
		server = Object{}
	}
	server["web_search_requests"] = w.searches()
	out["server_tool_use"] = server
	return out
}

// webSearchAnswer is the API answer of the fast path: the one-shot process's
// side query rebuilt as the model's search calls, results and commentary.
func webSearchAnswer(req *Request, record *webSearchRecord, query string) Object {
	content := []Object{}
	if record.Error != "" {
		id := "srvtoolu_" + strings.ReplaceAll(uuid(), "-", "")
		content = append(content, Object{"type": "server_tool_use", "id": id, "name": "web_search", "input": Object{"query": query}}, record.resultBlock(id))
	} else {
		items, _ := record.Result["results"].([]any)
		first := true
		for _, item := range items {
			if text, ok := item.(string); ok {
				content = append(content, Object{"type": "text", "text": text})
				continue
			}
			entry, _ := item.(map[string]any)
			id := str(entry, "tool_use_id")
			if !strings.HasPrefix(id, "srvtoolu_") {
				id = "srvtoolu_" + strings.ReplaceAll(uuid(), "-", "")
			}
			part := &webSearchRecord{Input: Object{"query": query}, Result: Object{"results": []any{entry}}}
			if first {
				// The whole output rides in the first result, as in the main path.
				part.Text, part.Input = record.Text, record.Input
				first = false
			}
			content = append(content, Object{"type": "server_tool_use", "id": id, "name": "web_search", "input": Object{"query": query}}, part.resultBlock(id))
		}
	}
	usage := req.webSearch.webSearchUsage(Object{"input_tokens": 0, "output_tokens": 0})
	return Object{"id": "msg_" + strings.ReplaceAll(uuid(), "-", ""), "type": "message", "role": "assistant", "model": req.Model, "content": content, "stop_reason": "end_turn", "stop_sequence": nil, "usage": usage}
}

// messageEvents is a complete message as the Messages API streams it.
func messageEvents(message Object) []Object {
	start := Object{}
	for key, value := range message {
		start[key] = value
	}
	for _, field := range responseEnvelopeExtensions {
		delete(start, field)
	}
	start["content"], start["stop_reason"], start["stop_sequence"] = []Object{}, nil, nil
	events := []Object{{"type": "message_start", "message": start}}
	blocks, _ := message["content"].([]Object)
	for index, block := range blocks {
		initial := Object{}
		for key, value := range block {
			initial[key] = value
		}
		var deltas []Object
		switch str(block, "type") {
		case "text":
			initial["text"] = ""
			delete(initial, "citations")
			deltas = append(deltas, Object{"type": "text_delta", "text": str(block, "text")})
			if citations, ok := block["citations"].([]any); ok {
				initial["citations"] = []any{}
				for _, citation := range citations {
					deltas = append(deltas, Object{"type": "citations_delta", "citation": citation})
				}
			}
		case "thinking":
			initial["thinking"], initial["signature"] = "", ""
			deltas = append(deltas, Object{"type": "thinking_delta", "thinking": str(block, "thinking")}, Object{"type": "signature_delta", "signature": str(block, "signature")})
		case "tool_use", "server_tool_use":
			initial["input"] = Object{}
			raw, _ := marshalPlain(block["input"])
			deltas = append(deltas, Object{"type": "input_json_delta", "partial_json": string(raw)})
		}
		events = append(events, Object{"type": "content_block_start", "index": index, "content_block": initial})
		for _, delta := range deltas {
			events = append(events, Object{"type": "content_block_delta", "index": index, "delta": delta})
		}
		events = append(events, Object{"type": "content_block_stop", "index": index})
	}
	delta := Object{"type": "message_delta", "delta": Object{"stop_reason": message["stop_reason"], "stop_sequence": message["stop_sequence"]}, "usage": message["usage"]}
	copyResponseExtensions(delta, message)
	return append(events, delta)
}

package engine

import (
	"bufio"
	"context"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"
)

func (r *Runner) runNativeWebSearch(ctx context.Context, req *Request, dir string, input Object) (*webSearchRecord, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Minute)
	defer cancel()
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	base := r.baseEnv()
	if err := req.validateRoutingProvider(base); err != nil {
		return nil, err
	}
	if raw := environmentValue(base, "ANTHROPIC_BASE_URL"); raw != "" {
		target, err := url.Parse(raw)
		if err != nil || (target.Scheme != "http" && target.Scheme != "https") || target.Host == "" || target.User != nil || target.RawQuery != "" || target.Fragment != "" {
			return nil, fmt.Errorf("invalid Anthropic base URL")
		}
	}
	work, err := os.MkdirTemp(dir, "search-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(work)
	tool := Object{"type": "web_search_20250305", "name": "web_search", "max_uses": 8}
	for _, key := range []string{"allowed_domains", "blocked_domains"} {
		if value, ok := input[key]; ok {
			tool[key] = value
		}
	}
	fields := Object{"tools": []Object{tool}, "tool_choice": Object{"type": "auto"}}
	if req.Plan != nil {
		if _, fast := req.webSearchFastQuery(); fast && len(req.Plan.fields["tool_choice"]) != 0 {
			choice, err := decodePlannedValue(req.Plan.fields["tool_choice"])
			if err != nil {
				return nil, err
			}
			fields["tool_choice"] = choice
		}
		for _, name := range []string{"service_tier", "speed"} {
			raw, present := req.Plan.fields[name]
			if !present || name == "speed" && string(compactRaw(raw)) == "null" {
				continue
			}
			value, err := decodePlannedValue(raw)
			if err != nil {
				return nil, err
			}
			fields[name] = value
		}
	}
	extra, err := marshalPlain(fields)
	if err != nil {
		return nil, err
	}
	extra, err = req.applyInferenceGeo(extra)
	if err != nil {
		return nil, err
	}
	cfg := &runConfig{diagnostic: req.diagnostic, attachments: Object{}, tools: Object{}, env: map[string]string{
		"DISABLE_PROMPT_CACHING": "1",
		"DISABLE_AUTOUPDATER":    "1", "DISABLE_AUTO_COMPACT": "1", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "CLAUDE_CODE_DISABLE_CLAUDE_MDS": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "CLAUDE_CODE_MAX_RETRIES": "0", "ENABLE_TOOL_SEARCH": "false", "CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS": "1", "CLAUDE_CODE_EXTRA_BODY": string(extra),
		"CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK": "1", "CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL": "1", "ANTHROPIC_BETAS": strings.Join(req.Betas, ","),
	}}
	control, err := startModControl(cfg, r.InternalBaseURL)
	if err != nil {
		return nil, err
	}
	defer control.Close()
	cfg.env["CCGATEWAY_MOD_URL"], cfg.env["CCGATEWAY_MOD_TOKEN"] = control.URL, control.token
	settings := Object{"disableAllHooks": false}
	if req.Fast != nil {
		settings["fastMode"] = *req.Fast
	}
	settingsJSON, err := marshalPlain(settings)
	if err != nil {
		return nil, err
	}
	args := []string{"-p", "--input-format", "stream-json", "--output-format", "stream-json", "--include-partial-messages", "--verbose", "--permission-prompt-tool", "stdio", "--tools", "", "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", string(settingsJSON), "--no-chrome", "--disable-slash-commands", "--no-session-persistence", "--max-turns", "1", "--model=" + req.Model, "--plugin-dir", r.Plugin, "--system-prompt-snapshot", "off"}
	if req.Effort != "" {
		args = append(args, "--effort", req.Effort)
	}
	proc, err := startCLI(ctx, r.CLI, args, work, cfg.processEnv(base), r.Stderr)
	if err != nil {
		return nil, err
	}
	proc.diagnostic = req.diagnostic
	defer func() {
		cancel()
		_ = proc.stdin.Close()
		_ = proc.stdout.Close()
		_ = proc.cmd.Wait()
	}()
	stopRead := context.AfterFunc(ctx, func() { _ = proc.stdout.Close() })
	defer stopRead()
	initID := uuid()
	if err := proc.write(Object{"type": "control_request", "request_id": initID, "request": Object{"subtype": "initialize", "systemPrompt": []string{"You are an assistant for performing a web search tool use"}, "systemPromptSnapshot": false, "sdkMcpServers": []any{}, "hooks": Object{}, "supportedDialogKinds": []string{}, "promptSuggestions": false, "excludeDynamicSections": true}}); err != nil {
		return nil, err
	}
	search := &Request{Model: req.Model, ServerTools: []Object{tool}}
	acc := &Accumulator{}
	state := &nativeRunState{}
	initialized := false
	outputObserved := false
	started := time.Now()
	scan := bufio.NewScanner(proc.stdout)
	scan.Buffer(make([]byte, 64*1024), 32<<20)
	for scan.Scan() {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		frame, err := decodeObject(scan.Bytes())
		if err != nil {
			return nil, fmt.Errorf("invalid native WebSearch CLI frame")
		}
		req.diagnostic.trace("web_search_output", frame)
		state.observe(frame)
		switch str(frame, "type") {
		case "control_request":
			if err := proc.write(controlReply(frame, search)); err != nil {
				return nil, err
			}
		case "control_response":
			response, _ := frame["response"].(Object)
			if str(response, "request_id") != initID || initialized {
				continue
			}
			if str(response, "subtype") != "success" {
				return nil, fmt.Errorf("native WebSearch CLI rejected initialize")
			}
			if err := control.waitReady(ctx); err != nil {
				return nil, err
			}
			if err := ctx.Err(); err != nil {
				return nil, err
			}
			initialized = true
			if err := proc.write(Object{"type": "user", "message": Object{"role": "user", "content": webSearchFastPrompt + str(input, "query")}}); err != nil {
				return nil, err
			}
		case "stream_event":
			if frame["parent_tool_use_id"] != nil || frame["agent_id"] != nil {
				return nil, fmt.Errorf("native WebSearch emitted an unexpected child response")
			}
			if !initialized {
				return nil, fmt.Errorf("native WebSearch emitted output before Mod readiness")
			}
			event, _ := frame["event"].(Object)
			if str(event, "type") == "message_delta" {
				usage, _ := event["usage"].(Object)
				if _, ok := usage["output_tokens"]; ok {
					outputObserved = true
				}
				if err := mergeHiddenSearchCurrentUsage(event, acc.Message); err != nil {
					return nil, err
				}
			}
			if err := acc.push(event, search); err != nil {
				return nil, err
			}
		case "result":
			if err := state.failure(); err != nil {
				return nil, err
			}
			if !initialized || !acc.Done || str(frame, "subtype") != "success" {
				return nil, fmt.Errorf("native WebSearch ended without a complete response")
			}
			if !outputObserved {
				return nil, fmt.Errorf("native WebSearch accounting missing final output_tokens")
			}
			usage, _ := acc.Message["usage"].(Object)
			if err := validateNativeWebSearchUsage(usage); err != nil {
				return nil, err
			}
			if req.Fast != nil && *req.Fast && usage["speed"] == nil {
				return nil, fmt.Errorf("native WebSearch accounting missing requested speed category")
			}
			if req.Plan != nil {
				for _, key := range []string{"service_tier", "inference_geo"} {
					if _, requested := req.Plan.fields[key]; requested && usage[key] == nil {
						return nil, fmt.Errorf("native WebSearch accounting missing requested %s category", key)
					}
				}
			}
			record, err := nativeWebSearchRecord(input, acc.Blocks, usage, time.Since(started).Seconds())
			if err != nil {
				return nil, err
			}
			if err := ctx.Err(); err != nil {
				return nil, err
			}
			if req.webSearch != nil {
				req.webSearch.mu.Lock()
				err = addNativeWebSearchUsage(req.webSearch.usage, usage)
				req.webSearch.mu.Unlock()
				if err != nil {
					return nil, err
				}
			}
			if err := ctx.Err(); err != nil {
				return nil, err
			}
			return record, nil
		}
	}
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}
	if err := state.failure(); err != nil {
		return nil, err
	}
	if scan.Err() != nil {
		return nil, fmt.Errorf("native WebSearch stdout: %w", scan.Err())
	}
	return nil, fmt.Errorf("native WebSearch exited before its terminal result")
}

func validateNativeWebSearchUsage(usage Object) error {
	if err := validateNativeSearchUsageFacts(usage); err != nil {
		return err
	}
	server, _ := usage["server_tool_use"].(Object)
	if _, ok := nativeInteger(server["web_search_requests"], 8); !ok {
		return fmt.Errorf("native WebSearch accounting missing or invalid web_search_requests")
	}
	for key, value := range server {
		if key != "web_search_requests" && tokenCount(value) != 0 {
			return fmt.Errorf("native WebSearch accounting reports undeclared %s", key)
		}
	}
	return nil
}

func validateNativeSearchUsageFacts(usage Object) error {
	if err := validateSearchUsage(usage, true); err != nil {
		return fmt.Errorf("native WebSearch accounting: %w", err)
	}
	for _, key := range []string{"input_tokens", "output_tokens"} {
		if !searchUsageInteger(usage[key]) {
			return fmt.Errorf("native WebSearch accounting missing or invalid %s", key)
		}
	}
	if err := addSearchCategories(Object{}, usage); err != nil {
		return err
	}
	for _, key := range []string{"cache_read_input_tokens", "cache_creation_input_tokens"} {
		if value, exists := usage[key]; exists && value == nil {
			return fmt.Errorf("native WebSearch accounting cannot aggregate unknown %s", key)
		}
	}
	for _, group := range []string{"cache_creation", "server_tool_use", "output_tokens_details"} {
		if raw, present := usage[group]; present && raw == nil {
			return fmt.Errorf("native WebSearch accounting cannot aggregate unknown %s", group)
		}
	}
	created := tokenCount(usage["cache_creation_input_tokens"])
	split, exists := usage["cache_creation"]
	if created > 0 || exists && split != nil {
		parts, _ := split.(Object)
		short, shortOK := nativeInteger(parts["ephemeral_5m_input_tokens"], 1<<31-1)
		long, longOK := nativeInteger(parts["ephemeral_1h_input_tokens"], 1<<31-1)
		if !shortOK || !longOK || short+long != int64(created) {
			return fmt.Errorf("native WebSearch accounting missing or inconsistent 5m/1h cache creation tokens")
		}
	}
	if details, ok := usage["output_tokens_details"].(Object); ok && tokenCount(details["thinking_tokens"]) > tokenCount(usage["output_tokens"]) {
		return fmt.Errorf("native WebSearch thinking_tokens exceeds output_tokens")
	}
	if raw, present := usage["iterations"]; present {
		iterations, ok := raw.([]any)
		if !ok || len(iterations) != 0 {
			return fmt.Errorf("native WebSearch accounting cannot aggregate nonempty or unknown iterations")
		}
	}
	return nil
}

func addNativeWebSearchUsage(total, usage Object) (err error) {
	defer func() {
		if err != nil {
			err = &requestRefusal{err}
		}
	}()
	if total == nil {
		return fmt.Errorf("native WebSearch accounting ledger is not initialized")
	}
	if err = validateNativeSearchUsageFacts(usage); err != nil {
		return err
	}
	if len(total) != 0 {
		if err = verifySearchCategories(total, usage); err != nil {
			return err
		}
	}
	next := copySearchUsage(total)
	if err = addSearchUsage(next, Object{"usage": usage}); err != nil {
		return err
	}
	if _, present := next["iterations"]; present {
		next["iterations"] = []any{}
	}
	if err = validateNativeSearchUsageFacts(nativeWebSearchPublicUsage(next)); err != nil {
		return err
	}
	for key, value := range next {
		total[key] = value
	}
	return nil
}

func nativeWebSearchPublicUsage(total Object) Object {
	usage := copySearchUsage(total)
	for _, key := range []string{"cache_read_input_tokens", "cache_creation_input_tokens"} {
		if usage["_null_"+key] == true {
			usage[key] = nil
		}
		delete(usage, "_null_"+key)
	}
	for _, key := range searchUsageCategories {
		delete(usage, "_missing_"+key)
	}
	return usage
}

func nativeWebSearchRecord(input Object, blocks []Object, usage Object, duration float64) (*webSearchRecord, error) {
	server, _ := usage["server_tool_use"].(Object)
	results := []any{}
	var parts []string
	searched, succeeded := false, false
	failureCode := ""
	for _, block := range blocks {
		switch str(block, "type") {
		case "server_tool_use", "thinking", "redacted_thinking":
		case "web_search_tool_result":
			searched = true
			if failure, ok := block["content"].(Object); ok {
				failureCode = str(failure, "error_code")
				text := "Web search error: " + failureCode
				results = append(results, text)
				parts = append(parts, text)
				continue
			}
			if tokenCount(server["web_search_requests"]) == 0 {
				return nil, fmt.Errorf("native WebSearch accounting reports zero requests despite a search result")
			}
			succeeded = true
			links := []any{}
			for _, item := range block["content"].([]any) {
				entry := item.(Object)
				links = append(links, Object{"title": entry["title"], "url": entry["url"]})
			}
			encoded, err := marshalPlain(links)
			if err != nil {
				return nil, err
			}
			results = append(results, Object{"tool_use_id": block["tool_use_id"], "content": links})
			parts = append(parts, "Links: "+string(encoded))
		case "text":
			results = append(results, str(block, "text"))
			parts = append(parts, str(block, "text"))
		default:
			return nil, fmt.Errorf("native WebSearch returned an unexpected %s block", str(block, "type"))
		}
	}
	if !searched {
		return &webSearchRecord{Input: input, Error: "unavailable", Text: "Web search was not performed.", Usage: usage}, nil
	}
	if succeeded {
		failureCode = ""
	}
	text := "Web search results for query: \"" + str(input, "query") + "\"\n\n" + strings.Join(parts, "\n\n") + "\n\n\nREMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks."
	first := true
	for _, block := range blocks {
		if str(block, "type") != "web_search_tool_result" {
			continue
		}
		entries, _ := block["content"].([]any)
		for _, item := range entries {
			entry := item.(Object)
			payload := webSearchPayload{Title: str(entry, "title"), URL: str(entry, "url")}
			if first {
				payload.Input, payload.Text = input, text
				first = false
			}
			entry["encrypted_content"] = signWebSearchContent(payload)
		}
	}
	return &webSearchRecord{Input: input, Error: failureCode, Text: text, Usage: usage, NativeBlocks: blocks, Result: Object{"query": str(input, "query"), "results": results, "durationSeconds": duration, "searchCount": server["web_search_requests"]}}, nil
}

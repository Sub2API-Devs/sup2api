package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Relay passthrough (relay_mode "passthrough", PASSTHROUGH-DESIGN.md): every
// upstream request is the one the inner Claude Code CLI built, and the
// outbound relay forwards it unchanged. The client's fields reach the CLI as
// options (model, --thinking, --effort, ANTHROPIC_BETAS, fastMode, system,
// tools, the native session file) or, per model request, through
// CLAUDE_CODE_EXTRA_BODY, which the Mod sets before each round. Features the
// CLI cannot express are refused at admission.

// Top-level fields refused in passthrough, with the reason the client reads.
var passthroughRefusedFields = []struct{ name, reason string }{
	{"fallback_credit_token", "redeeming a fallback credit replaces the whole request"},
	{"container", "containers belong to code execution, which Claude Code cannot declare"},
	{"mcp_servers", "the MCP connector is not enabled"},
}

// The client's fields sent with every model request of the run, exactly as
// the client wrote them. tool_choice joins them in the first round only.
// context_management, compaction and cache_control breakpoints stay Claude
// Code's; metadata only selects the session.
var passthroughBodyFields = []string{"max_tokens", "thinking", "temperature", "top_p", "top_k", "stop_sequences", "service_tier", "inference_geo", "output_config", "output_format", "safeguards", "diagnostics"}

func passthroughRefusal(feature, reason string) error {
	return fmt.Errorf("%s is not supported by this gateway: %s", feature, reason)
}

// parsePassthroughRequest admits a request for relay passthrough. It builds
// the same Request the legacy path does (history, tools, session), but leaves
// every judgement on the generation fields to the upstream API.
func parsePassthroughRequest(body []byte, h http.Header, p RequestPolicy, access *resourceAdmission) (*Request, error) {
	o, err := decodeObject(body)
	if err != nil {
		return nil, err
	}
	for _, field := range passthroughRefusedFields {
		if _, exists := o[field.name]; exists {
			return nil, passthroughRefusal(field.name, field.reason)
		}
	}
	cacheRequested := hasRequestCacheControl(o)
	plan, err := parseRequestPlan(body, o)
	if err != nil {
		return nil, err
	}
	// Generation fields travel in CLAUDE_CODE_EXTRA_BODY as sent; only the
	// effort becomes a CLI option and must be one it accepts.
	effort := ""
	if config, ok := o["output_config"].(map[string]any); ok {
		if value, exists := config["effort"]; exists {
			effort, _ = value.(string)
			switch effort {
			case "low", "medium", "high", "xhigh", "max":
			default:
				return nil, fmt.Errorf("invalid output_config.effort")
			}
		}
	} else if _, exists := o["output_config"]; exists {
		return nil, fmt.Errorf("output_config must be an object")
	}
	delete(o, "output_config")
	delete(o, "output_format")
	if err = p.filterFields(o); err != nil {
		return nil, err
	}
	fast, err := p.speed(o)
	if err != nil {
		return nil, err
	}
	data, _ := json.Marshal(o)
	req, err := parseRequestCreditCandidate(data, nil, access, false, hasBetaHeader(h.Values("anthropic-beta"), "interleaved-thinking-2025-05-14"))
	if err != nil {
		return nil, err
	}
	req.Plan = plan
	req.Passthrough = true
	// tool_choice none still offers the tools: the choice itself goes upstream.
	req.NoTools = false
	if err := req.configureWebSearch(); err != nil {
		return nil, err
	}
	if err := req.refusePassthroughUnsupported(); err != nil {
		return nil, err
	}
	req.Fast = fast
	req.Effort = effort
	req.AttachmentSource = p.AttachmentSource
	req.AttachmentSources = p.AttachmentSources
	req.EnvironmentFields = p.EnvironmentFields
	req.UnknownClientAttachment = p.UnknownClientAttachment
	req.UnknownGatewayAttachment = p.UnknownGatewayAttachment
	req.filterClientAttachments()
	req.CustomToolPrefix = p.CustomToolPrefix
	req.ToolSearch = p.toolSearch(req)
	if cacheRequested {
		// The client's breakpoints are Claude Code's to place; its TTL is kept.
		req.PromptCacheTTL = "5m"
		if req.TTL == time.Hour {
			req.PromptCacheTTL = "1h"
		}
	}
	// The beta rules only decide the CLI's own settings (tool search,
	// fine-grained tool streaming); every client beta goes upstream as sent.
	unknown := p.UnknownBeta
	p.UnknownBeta = "ignore"
	err = p.applyBetas(req, h.Values("anthropic-beta"))
	p.UnknownBeta = unknown
	if err != nil {
		return nil, err
	}
	req.Betas = clientBetas(h.Values("anthropic-beta"))
	if err := req.configureFallbacks(h); err != nil {
		return nil, err
	}
	return req, nil
}

// clientBetas is the client's anthropic-beta list, in order, without repeats.
func clientBetas(values []string) []string {
	var out []string
	seen := map[string]bool{}
	for _, value := range values {
		for _, name := range strings.Split(value, ",") {
			name = strings.TrimSpace(name)
			if name != "" && !seen[name] {
				seen[name] = true
				out = append(out, name)
			}
		}
	}
	return out
}

// refusePassthroughUnsupported refuses what Claude Code cannot express
// (PASSTHROUGH-DESIGN.md section 9): tool definitions only the API declares,
// their history blocks, inline tools, image transformations and an assistant
// prefill.
func (r *Request) refusePassthroughUnsupported() error {
	if r.InlineTools != nil {
		return passthroughRefusal("inline tool definitions", "Claude Code takes one tool list per request")
	}
	if len(r.APIClientTools) > 0 {
		return passthroughRefusal(fmt.Sprintf("tool type %q", str(r.APIClientTools[0], "type")), "Claude Code cannot declare typed tool sets")
	}
	for _, tool := range r.ServerTools {
		return passthroughRefusal(fmt.Sprintf("server tool %q", str(tool, "type")), "Claude Code cannot declare this tool")
	}
	if len(r.imageCarriers) > 0 {
		return passthroughRefusal("image transformations", "Claude Code re-encodes images without them")
	}
	if r.continuation != "" {
		return passthroughRefusal("an assistant prefill (a final assistant message)", "Claude Code always sends a user turn last")
	}
	if r.hasFallbacks() {
		var entries []Object
		_ = json.Unmarshal(r.Plan.fallbacks, &entries)
		for _, entry := range entries {
			if _, exists := entry["speed"]; exists {
				return passthroughRefusal("fallbacks[].speed", "fast mode is fixed for the whole run")
			}
		}
	}
	for _, message := range r.Messages {
		if message.Role == "assistant" {
			if _, err := nativeWebSearchTurns(message); err != nil {
				return err
			}
		}
		for _, block := range message.Content {
			switch kind := str(block, "type"); kind {
			case "server_tool_use", "web_search_tool_result":
				if err := checkWebSearchHistory(block); err != nil {
					return err
				}
			case "tool_search_tool_result", "web_fetch_tool_result", "advisor_tool_result", "code_execution_tool_result", "bash_code_execution_tool_result", "text_editor_code_execution_tool_result", "mcp_tool_use", "mcp_tool_result", "mcp_tool_listing", "container_upload", "fallback", "compaction":
				return passthroughRefusal(fmt.Sprintf("history block %q", kind), "Claude Code cannot replay it")
			case "tool_use":
				if _, exists := block["caller"]; exists {
					return passthroughRefusal("programmatic tool calls (tool_use.caller)", "they need code execution")
				}
				if _, exists := block["toolset_name"]; exists {
					return passthroughRefusal("tool_use.toolset_name", "Claude Code cannot declare typed tool sets")
				}
			case "tool_result":
				if _, exists := block["toolset_name"]; exists {
					return passthroughRefusal("tool_result.toolset_name", "Claude Code cannot declare typed tool sets")
				}
			}
		}
	}
	return nil
}

// passthroughImageSplit divides a pending user turn that holds a base64 image
// and ends with text: the leading blocks, seeded as a native record
// (withImageSeed), and the final text, which is the CLI's input. A turn
// ending otherwise (only images, a tool result) is the CLI's input whole.
func (r *Request) passthroughImageSplit() (seed, input Message, ok bool) {
	if !r.Passthrough || r.continuation != "" {
		return Message{}, Message{}, false
	}
	pending := Message{Role: "user"}
	for _, message := range r.Messages[r.pendingStart():] {
		if message.Role == "user" {
			pending.Content = append(pending.Content, r.cliWireMessage(message).Content...)
		}
	}
	n := len(pending.Content)
	if n < 2 || str(pending.Content[n-1], "type") != "text" {
		return Message{}, Message{}, false
	}
	image := false
	for _, block := range pending.Content[:n-1] {
		source, _ := block["source"].(map[string]any)
		image = image || str(block, "type") == "image" && str(source, "type") == "base64"
	}
	if !image {
		return Message{}, Message{}, false
	}
	return Message{Role: "user", Content: pending.Content[:n-1]}, Message{Role: "user", Content: pending.Content[n-1:]}, true
}

// passthroughAttempt is one model of the run's fallback chain: the Mod sends
// its overrides (max_tokens, thinking, output_config) with the round's fields.
type passthroughAttempt struct {
	Model string                     `json:"model"`
	Body  map[string]json.RawMessage `json:"body,omitempty"`
}

// passthroughConfig is what the Mod needs to set CLAUDE_CODE_EXTRA_BODY before
// each model request: the first round's fields, every later round's, and the
// fallback models after the requested one.
type passthroughConfig struct {
	First     map[string]json.RawMessage `json:"first"`
	Rest      map[string]json.RawMessage `json:"rest"`
	Fallbacks []passthroughAttempt       `json:"fallbacks,omitempty"`
}

// passthroughBodies takes the client's fields from the request as sent, so
// numbers, key order inside objects and unknown keys stay byte-for-byte. The
// only change is a forced tool's name, which becomes the inner CLI's name for
// it (mcp__<prefix>__X for a custom tool); the answer maps it back.
func (r *Request) passthroughBodies() (*passthroughConfig, error) {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(r.Plan.RawRequest(), &fields); err != nil {
		return nil, fmt.Errorf("cannot read the request fields")
	}
	cfg := &passthroughConfig{First: map[string]json.RawMessage{}, Rest: map[string]json.RawMessage{}}
	for _, name := range passthroughBodyFields {
		if raw, exists := fields[name]; exists {
			cfg.First[name] = compactRaw(raw)
			cfg.Rest[name] = cfg.First[name]
		}
	}
	if raw, exists := fields["tool_choice"]; exists {
		choice, err := decodeObject(raw)
		if err != nil {
			return nil, fmt.Errorf("tool_choice must be an object")
		}
		if str(choice, "type") == "tool" && r.wireName(str(choice, "name")) != str(choice, "name") {
			choice["name"] = r.wireName(str(choice, "name"))
			raw, _ = marshalPlain(choice)
		}
		cfg.First["tool_choice"] = compactRaw(raw)
	}
	if r.hasFallbacks() {
		var entries []map[string]json.RawMessage
		if err := json.Unmarshal(r.Plan.fallbacks, &entries); err != nil {
			return nil, fmt.Errorf("cannot read fallbacks")
		}
		for _, entry := range entries {
			var model string
			_ = json.Unmarshal(entry["model"], &model)
			attempt := passthroughAttempt{Model: model, Body: map[string]json.RawMessage{}}
			for name, raw := range entry {
				if name != "model" && string(raw) != "null" {
					attempt.Body[name] = compactRaw(raw)
				}
			}
			cfg.Fallbacks = append(cfg.Fallbacks, attempt)
		}
	}
	return cfg, nil
}

func compactRaw(raw json.RawMessage) json.RawMessage {
	var out bytes.Buffer
	if json.Compact(&out, raw) != nil {
		return raw
	}
	return out.Bytes()
}

// marshalPlain encodes without HTML escaping, as the client's JSON would be.
func marshalPlain(v any) ([]byte, error) {
	var out bytes.Buffer
	encoder := json.NewEncoder(&out)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(out.Bytes(), []byte("\n")), nil
}

// passthroughThinkingArgs are the thinking options: a client without thinking
// gets --thinking disabled (the CLI then sends nothing for models that take no
// disabled, and disabled for the others, as the API's default); a client
// thinking object goes upstream whole through CLAUDE_CODE_EXTRA_BODY, and the
// options only keep the CLI's own thinking-dependent behaviour in step.
func (r *Request) passthroughThinkingArgs() []string {
	switch str(r.Thinking, "type") {
	case "", "disabled":
		return []string{"--thinking", "disabled"}
	case "enabled":
		return []string{"--max-thinking-tokens", fmt.Sprint(r.Thinking["budget_tokens"])}
	}
	return []string{"--thinking", "adaptive"}
}

// passthroughEffort is the --effort option: the client's, or the API default
// "high" (the CLI would otherwise choose its own per model).
func (r *Request) passthroughEffort() string {
	if r.Effort != "" {
		return r.Effort
	}
	return "high"
}

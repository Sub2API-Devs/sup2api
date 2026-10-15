package engine

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// Policy replace_client_attachments puts Claude Code's own rendering on this
// Worker in place of the client's attachment (CONTRACTS §53.15). The text
// comes from the Mod, which sees what Claude Code renders (prompt.attachment)
// but never the client's history: a rendering run, against a loopback
// endpoint and never upstream, reports it before the request is parsed. The
// text depends on the CLI version, the model and the CLI options that change
// it (additional directories, the 1M context, and the day for a date); the
// first rendering of a key is kept for the Worker's life, so every turn gets
// the same text and the prompt cache prefix stays stable. A selected type the
// Worker's Claude Code does not render is removed from the client's request.

const gatewayRenderPrefix = "/ccg-attachment-render/"

var (
	gatewayRenderEndpoints sync.Map // id -> *gatewayRenderCapture
	gatewayAttachmentCache sync.Map // key -> map[string]string
	gatewayRenderLocks     sync.Map // key -> *sync.Mutex
)

type gatewayAttachmentKey struct {
	Version     string   `json:"version"`
	Model       string   `json:"model"`
	Directories []string `json:"directories"`
	Context1M   bool     `json:"context_1m"`
	// Date is the Worker's day when a date or a session context (which may
	// carry one) is replaced: the next day renders again.
	Date string `json:"date,omitempty"`
}

// gatewayRenderCapture keeps the rendering run's first model request: Claude
// Code puts the date there itself, not through an attachment the Mod sees.
type gatewayRenderCapture struct {
	mu   sync.Mutex
	body []byte
}

func (k gatewayAttachmentKey) String() string {
	b, _ := json.Marshal(k)
	return string(b)
}

// gatewayAttachmentRequest is what decides Claude Code's rendering, read from
// the request before it is parsed; the caller adds the CLI version.
func gatewayAttachmentRequest(body []byte, h http.Header) (gatewayAttachmentKey, []string, error) {
	p, err := requestPolicy(h)
	if err != nil || len(p.ReplaceClientAttachments) == 0 {
		return gatewayAttachmentKey{}, nil, err
	}
	var peek struct {
		Model       string   `json:"model"`
		Directories []string `json:"additional_directories"`
	}
	if json.Unmarshal(body, &peek) != nil || peek.Model == "" {
		// The parser reports the malformed request.
		return gatewayAttachmentKey{}, nil, nil
	}
	key := gatewayAttachmentKey{Model: peek.Model, Directories: peek.Directories}
	for _, value := range h.Values("anthropic-beta") {
		for _, beta := range strings.Split(value, ",") {
			key.Context1M = key.Context1M || strings.TrimSpace(beta) == "context-1m-2025-08-07"
		}
	}
	for _, typ := range p.ReplaceClientAttachments {
		if typ == "date" || typ == "session_context" {
			key.Date = time.Now().Format("2006-01-02")
		}
	}
	return key, p.ReplaceClientAttachments, nil
}

// gatewayAttachments returns Claude Code's rendering of each type for the
// key ("" for a type it does not render), rendering once when unknown. A
// failed rendering is not kept: the request keeps the client's text and a
// later request tries again.
func (g *Gateway) gatewayAttachments(ctx context.Context, key gatewayAttachmentKey, types []string, diagnostic *requestDiagnostic) map[string]string {
	texts := g.renderedAttachments(ctx, key, diagnostic)
	if texts == nil {
		return nil
	}
	out := make(map[string]string, len(types))
	for _, typ := range types {
		out[typ], _ = attachmentRendering(texts, typ)
	}
	return out
}

func (g *Gateway) renderedAttachments(ctx context.Context, key gatewayAttachmentKey, diagnostic *requestDiagnostic) map[string]string {
	id := key.String()
	if cached, ok := gatewayAttachmentCache.Load(id); ok {
		return cached.(map[string]string)
	}
	lock, _ := gatewayRenderLocks.LoadOrStore(id, &sync.Mutex{})
	lock.(*sync.Mutex).Lock()
	defer lock.(*sync.Mutex).Unlock()
	if cached, ok := gatewayAttachmentCache.Load(id); ok {
		return cached.(map[string]string)
	}
	started := time.Now()
	texts, err := g.runner(ctx).renderGatewayAttachments(ctx, key, filepath.Join(g.Cache.dir, "workspace"))
	if err != nil {
		diagnostic.trace("gateway_attachments_unavailable", Object{"error": err.Error()})
		return nil
	}
	diagnostic.trace("gateway_attachments_rendered", Object{"types": len(texts), "ms": time.Since(started).Milliseconds()})
	gatewayAttachmentCache.Store(id, texts)
	return texts
}

// serveGatewayRender answers the rendering run's model requests with a short
// text: the run exists only for Claude Code to render its attachments.
func serveGatewayRender(w http.ResponseWriter, r *http.Request) bool {
	if !strings.HasPrefix(r.URL.Path, gatewayRenderPrefix) {
		return false
	}
	id, _, _ := strings.Cut(strings.TrimPrefix(r.URL.Path, gatewayRenderPrefix), "/")
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	value, ok := gatewayRenderEndpoints.Load(id)
	if !ok || !net.ParseIP(host).IsLoopback() {
		http.NotFound(w, r)
		return true
	}
	body, _ := io.ReadAll(http.MaxBytesReader(w, r.Body, 32<<20))
	if capture := value.(*gatewayRenderCapture); r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/messages") {
		capture.mu.Lock()
		if capture.body == nil {
			capture.body = body
		}
		capture.mu.Unlock()
	}
	if r.Method != http.MethodPost || !strings.HasSuffix(r.URL.Path, "/messages") {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{}`))
		return true
	}
	w.Header().Set("Content-Type", "text/event-stream")
	for _, event := range []Object{
		{"type": "message_start", "message": Object{"id": "msg_ccg_render", "type": "message", "role": "assistant", "model": "render", "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 1, "output_tokens": 0}}},
		{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}},
		{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": "rendered"}},
		{"type": "content_block_stop", "index": 0},
		{"type": "message_delta", "delta": Object{"stop_reason": "end_turn", "stop_sequence": nil}, "usage": Object{"output_tokens": 1}},
		{"type": "message_stop"},
	} {
		data, _ := json.Marshal(event)
		_, _ = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), data)
	}
	return true
}

// renderGatewayAttachments runs Claude Code once with the options of a real
// run that shape its attachments (working directory, model, additional
// directories, 1M context, the Worker's environment) against the loopback
// endpoint, and returns what the Mod reported.
func (r *Runner) renderGatewayAttachments(ctx context.Context, key gatewayAttachmentKey, work string) (map[string]string, error) {
	ctx, cancel := context.WithTimeout(ctx, time.Minute)
	defer cancel()
	if err := os.MkdirAll(work, 0700); err != nil {
		return nil, err
	}
	id := uuid()
	capture := &gatewayRenderCapture{}
	gatewayRenderEndpoints.Store(id, capture)
	defer gatewayRenderEndpoints.Delete(id)
	base := r.InternalBaseURL
	if base == "" {
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return nil, err
		}
		server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !serveGatewayRender(w, r) {
				http.NotFound(w, r)
			}
		}), ReadHeaderTimeout: 5 * time.Second}
		go func() { _ = server.Serve(listener) }()
		defer server.Close()
		base = "http://" + listener.Addr().String()
	}
	env := map[string]string{"ANTHROPIC_BASE_URL": strings.TrimRight(base, "/") + gatewayRenderPrefix + id,
		"DISABLE_AUTOUPDATER": "1", "DISABLE_AUTO_COMPACT": "1", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "CLAUDE_CODE_DISABLE_CLAUDE_MDS": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "ENABLE_TOOL_SEARCH": "false", "CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION": "0",
		"CLAUDE_CODE_MAX_RETRIES": "0", "CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK": "1", "CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL": "1", "CCGATEWAY_ATTACHMENT_SOURCE": "client", "CCGATEWAY_STRUCTURED_OUTPUT": "0", "CCGATEWAY_TOOL_SEARCH": "0"}
	if key.Context1M {
		env["ANTHROPIC_BETAS"] = "context-1m-2025-08-07"
		env["CLAUDE_CODE_DISABLE_1M_CONTEXT"] = "0"
		env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"] = "1000000"
	}
	cfg := &runConfig{attachments: Object{"default_source": "client", "unknown_client": "pass", "unknown_gateway": "ignore"}, tools: Object{}, env: env, reportAttachments: true}
	control, err := startModControl(cfg, r.InternalBaseURL)
	if err != nil {
		return nil, err
	}
	defer control.Close()
	cfg.env["CCGATEWAY_MOD_URL"], cfg.env["CCGATEWAY_MOD_TOKEN"] = control.URL, control.token
	args := []string{"-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--permission-prompt-tool", "stdio", "--tools", "", "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", `{"disableAllHooks":false}`, "--no-chrome", "--disable-slash-commands", "--no-session-persistence", "--max-turns", "1", "--model=" + key.Model, "--plugin-dir", r.Plugin, "--system-prompt-snapshot", "off"}
	for _, dir := range key.Directories {
		args = append(args, "--add-dir", dir)
	}
	proc, err := startCLI(ctx, r.CLI, args, work, cfg.processEnv(r.baseEnv()), r.Stderr)
	if err != nil {
		return nil, err
	}
	defer func() {
		cancel()
		_ = proc.stdin.Close()
		_ = proc.stdout.Close()
		_ = proc.cmd.Wait()
	}()
	stopRead := context.AfterFunc(ctx, func() { _ = proc.stdout.Close() })
	defer stopRead()
	initID := uuid()
	if err := proc.write(Object{"type": "control_request", "request_id": initID, "request": Object{"subtype": "initialize", "systemPrompt": []string{"Attachment rendering"}, "systemPromptSnapshot": false, "sdkMcpServers": []any{}, "hooks": Object{}, "supportedDialogKinds": []string{}, "promptSuggestions": false, "excludeDynamicSections": true}}); err != nil {
		return nil, err
	}
	render := &Request{Model: key.Model}
	scan := bufio.NewScanner(proc.stdout)
	scan.Buffer(make([]byte, 64*1024), 32<<20)
	for scan.Scan() {
		frame, err := decodeObject(scan.Bytes())
		if err != nil {
			return nil, fmt.Errorf("invalid attachment rendering CLI frame")
		}
		switch str(frame, "type") {
		case "control_request":
			if err := proc.write(controlReply(frame, render)); err != nil {
				return nil, err
			}
		case "control_response":
			response, _ := frame["response"].(Object)
			if str(response, "request_id") != initID {
				continue
			}
			if str(response, "subtype") != "success" {
				return nil, fmt.Errorf("attachment rendering CLI rejected initialize")
			}
			if err := control.waitReady(ctx); err != nil {
				return nil, err
			}
			if err := proc.write(Object{"type": "user", "session_id": uuid(), "uuid": uuid(), "parent_tool_use_id": nil, "message": Object{"role": "user", "content": "Render."}}); err != nil {
				return nil, err
			}
		case "result":
			control.mu.Lock()
			defer control.mu.Unlock()
			texts := map[string]string{}
			for typ, text := range control.gatewayAttachments {
				if slices.Contains(features.ReplaceableClientAttachments, typ) {
					texts[typ] = text
				}
			}
			capture.mu.Lock()
			if date := renderedDate(capture.body); date != "" && texts["date"] == "" {
				texts["date"] = date
			}
			capture.mu.Unlock()
			if len(texts) == 0 {
				return nil, fmt.Errorf("Claude Code rendered no replaceable attachment")
			}
			return texts, nil
		}
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return nil, fmt.Errorf("attachment rendering CLI exited before its result")
}

// renderedDate is the date line Claude Code put into its model request, ""
// without one.
func renderedDate(body []byte) string {
	o, err := decodeObject(body)
	if err != nil {
		return ""
	}
	var texts []string
	collect := func(v any) {
		switch v := v.(type) {
		case string:
			texts = append(texts, v)
		case []any:
			for _, b := range v {
				if block, ok := b.(map[string]any); ok && str(block, "type") == "text" {
					texts = append(texts, str(block, "text"))
				}
			}
		}
	}
	collect(o["system"])
	messages, _ := o["messages"].([]any)
	for _, m := range messages {
		if message, ok := m.(map[string]any); ok {
			collect(message["content"])
		}
	}
	for _, text := range texts {
		if date := clientAttachmentPatterns["date"][0].FindString(text); date != "" {
			return date
		}
	}
	return ""
}

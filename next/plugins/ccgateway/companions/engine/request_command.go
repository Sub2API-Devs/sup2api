package engine

// The opt-in request transport does not enter the SDK agent loop. Model tool
// calls are returned to the caller; only the CLI owns upstream authentication.
import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func validateRequestMode(mode string) error {
	if mode != "" && mode != "direct" && mode != "build" {
		return fmt.Errorf("request mode must be direct or build")
	}
	return nil
}

// messagesBuildComponents preserves message blocks, including reminder text,
// in their original positions. Tags alone cannot recover native attachment
// types. Explicit typed attachments remain a CLI component-level API.
func messagesBuildComponents(raw []byte) ([]byte, error) {
	if err := validateBuildNumbers(raw); err != nil {
		return nil, err
	}
	var body map[string]json.RawMessage
	if err := json.Unmarshal(raw, &body); err != nil || body == nil {
		return nil, fmt.Errorf("expected a Messages JSON object")
	}
	var model string
	if json.Unmarshal(body["model"], &model) != nil || strings.TrimSpace(model) == "" {
		return nil, fmt.Errorf("model must be a non-empty string")
	}
	var messages []json.RawMessage
	if json.Unmarshal(body["messages"], &messages) != nil || len(messages) == 0 {
		return nil, fmt.Errorf("messages must be a non-empty array")
	}
	system := json.RawMessage(`[]`)
	if rawSystem, ok := body["system"]; ok {
		if bytes.Equal(bytes.TrimSpace(rawSystem), []byte("null")) {
			return nil, fmt.Errorf("system cannot be null")
		}
		var text string
		if json.Unmarshal(rawSystem, &text) == nil {
			system = rawSystem
		} else {
			var blocks []map[string]json.RawMessage
			if json.Unmarshal(rawSystem, &blocks) != nil {
				return nil, fmt.Errorf("build mode requires text system blocks")
			}
			for _, block := range blocks {
				var kind string
				if json.Unmarshal(block["type"], &kind) != nil || kind != "text" || json.Unmarshal(block["text"], &text) != nil {
					return nil, fmt.Errorf("build mode requires text system blocks")
				}
				for key := range block {
					if key != "type" && key != "text" && key != "cache_control" {
						return nil, fmt.Errorf("build mode cannot represent system block field %s", key)
					}
				}
			}
			system = rawSystem
		}
	}
	tools := []map[string]json.RawMessage{}
	if rawTools, ok := body["tools"]; ok {
		if json.Unmarshal(rawTools, &tools) != nil || tools == nil {
			return nil, fmt.Errorf("tools must be an array")
		}
		for _, tool := range tools {
			var name string
			if tool == nil || json.Unmarshal(tool["name"], &name) != nil || strings.TrimSpace(name) == "" {
				return nil, fmt.Errorf("tool definition requires a name")
			}
			var kind string
			if rawType, ok := tool["type"]; ok && json.Unmarshal(rawType, &kind) != nil {
				return nil, fmt.Errorf("tool type must be a string")
			}
			if kind == "" || kind == "custom" {
				if _, collision := tool["inputSchema"]; collision {
					return nil, fmt.Errorf("HTTP tools must use input_schema")
				}
				var schema map[string]json.RawMessage
				if json.Unmarshal(tool["input_schema"], &schema) != nil || schema == nil {
					return nil, fmt.Errorf("custom tool requires input_schema object")
				}
				tool["inputSchema"] = tool["input_schema"]
				delete(tool, "input_schema")
			}
		}
	}
	stream := json.RawMessage("false")
	if value, ok := body["stream"]; ok {
		stream = value
	}
	for _, key := range []string{"model", "system", "messages", "tools", "stream"} {
		delete(body, key)
	}
	extracted, attachments, err := extractSystemComponents(messages)
	if err != nil {
		return nil, err
	}
	return json.Marshal(map[string]any{"model": model, "systemPrompt": system, "messages": extracted, "attachments": attachments, "tools": tools, "parameters": body, "stream": stream})
}

func (g *Gateway) serveRequestCommand(w http.ResponseWriter, r *http.Request, d *requestDiagnostic) {
	fail := func(status int, kind, message string) {
		d.fail(status, kind, message)
		apiError(w, status, kind, message)
	}
	if !g.authorized(r) {
		fail(401, "authentication_error", "Invalid gateway API key")
		return
	}
	if r.URL.Path != "/v1/messages" {
		fail(404, "not_found_error", "Request mode supports /v1/messages only")
		return
	}
	if r.Method != http.MethodPost {
		fail(405, "invalid_request_error", "Use POST")
		return
	}
	if v := r.Header.Get("anthropic-version"); v != "" && v != "2023-06-01" {
		fail(400, "invalid_request_error", "Unsupported anthropic-version")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 32<<20))
	if err != nil {
		var large *http.MaxBytesError
		if errors.As(err, &large) {
			fail(413, "request_too_large", "Request exceeds 32 MiB")
		} else {
			fail(400, "invalid_request_error", "Cannot read body")
		}
		return
	}
	d.prepareSecrets(raw, r.Header.Values("anthropic-beta")...)
	d.request(raw, r.Header)
	input := raw
	if g.RequestMode == "build" {
		input, err = messagesBuildComponents(raw)
	} else {
		var body map[string]json.RawMessage
		err = json.Unmarshal(raw, &body)
		if err == nil && body == nil {
			err = errors.New("expected a Messages JSON object")
		}
		if err == nil {
			var model string
			if json.Unmarshal(body["model"], &model) != nil || strings.TrimSpace(model) == "" {
				err = errors.New("model must be a non-empty string")
			}
		}
	}
	if err != nil {
		fail(400, "invalid_request_error", err.Error())
		return
	}
	select {
	case g.Slots <- struct{}{}:
		defer func() { <-g.Slots }()
	default:
		w.Header().Set("Retry-After", "1")
		fail(429, "rate_limit_error", "Gateway concurrency limit reached")
		return
	}
	timeout := g.Timeout
	if timeout <= 0 {
		timeout = 10 * time.Minute
	}
	ctx, cancel := context.WithTimeout(r.Context(), timeout)
	defer cancel()
	runner := g.runner(ctx)
	dir, err := os.MkdirTemp(runner.Work, "request-")
	if err != nil {
		fail(500, "api_error", "Cannot prepare CLI request")
		return
	}
	defer os.RemoveAll(dir)
	meta := filepath.Join(dir, "response-meta.json")
	args := []string{"request", "--" + g.RequestMode, "--response-meta", meta, "--timeout-ms", strconv.FormatInt(min(timeout.Milliseconds(), 2147483647), 10)}
	// Inbound gateway credentials must never become upstream credentials.
	for _, name := range []string{"anthropic-version", "anthropic-beta"} {
		if values := r.Header.Values(name); len(values) > 0 {
			if name == "anthropic-beta" {
				args = append(args, "--betas", strings.Join(values, ","))
			} else {
				args = append(args, "--header", name+":"+strings.Join(values, ","))
			}
		}
	}
	cmd := exec.CommandContext(ctx, runner.CLI, args...)
	cmd.Env, cmd.Dir, cmd.Stdin = runner.baseEnv(), dir, bytes.NewReader(input)
	cmd.WaitDelay = 2 * time.Second
	output := &requestCommandOutput{writer: w, meta: meta}
	cmd.Stdout = output
	// Do not expose CLI stderr: transport failures can contain credentials.
	cmd.Stderr = io.Discard
	d.trace("request_command", Object{"mode": g.RequestMode, "cli_version": runner.Version})
	if g.RequestMode == "build" {
		d.save("build-components.json", input)
	}
	d.setStage("request_command")
	deadlineSet := make(chan struct{})
	stop := context.AfterFunc(ctx, func() {
		_ = http.NewResponseController(w).SetWriteDeadline(time.Now())
		close(deadlineSet)
	})
	err = cmd.Run()
	if !stop() {
		<-deadlineSet
	}
	_ = http.NewResponseController(w).SetWriteDeadline(time.Time{})
	if err != nil {
		d.trace("request_command_failed", Object{"response_started": output.started, "cancelled": ctx.Err() != nil})
	}
	if output.started {
		return
	} // Preserve upstream bytes; never append a JSON error to a partial SSE stream.
	if err == nil || cmd.ProcessState != nil && cmd.ProcessState.ExitCode() == 2 {
		if output.start() == nil {
			return
		}
	}
	if ctx.Err() != nil {
		fail(504, "timeout_error", "CLI request cancelled or timed out")
		return
	}
	fail(502, "api_error", "CLI request failed before receiving an upstream response")
}

type requestCommandOutput struct {
	writer  http.ResponseWriter
	meta    string
	started bool
}

func (o *requestCommandOutput) start() error {
	if o.started {
		return nil
	}
	raw, err := os.ReadFile(o.meta)
	if err != nil {
		return err
	}
	var meta struct {
		Status  int               `json:"status"`
		Headers map[string]string `json:"headers"`
	}
	if err = json.Unmarshal(raw, &meta); err != nil {
		return err
	}
	if meta.Status < 200 || meta.Status > 599 {
		return errors.New("invalid upstream status")
	}
	for key, value := range meta.Headers {
		// The CLI decodes the body. Do not forward compression or framing headers.
		name := http.CanonicalHeaderKey(key)
		if name == "Content-Type" || name == "Retry-After" || name == "Request-Id" || strings.HasPrefix(name, "Anthropic-Ratelimit-") {
			o.writer.Header().Set(name, value)
		}
	}
	o.writer.WriteHeader(meta.Status)
	o.started = true
	return nil
}

func (o *requestCommandOutput) Write(p []byte) (int, error) {
	if err := o.start(); err != nil {
		return 0, err
	}
	n, err := o.writer.Write(p)
	if err == nil {
		_ = http.NewResponseController(o.writer).Flush()
	}
	return n, err
}

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
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
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
	return messagesBuildComponentsPolicy(raw, nil, "")
}

type buildRequestPolicy struct {
	ContractVersion int                             `json:"contract_version"`
	Sources         features.BuildAttachmentSources `json:"build_attachment_sources,omitempty"`
	Billing         features.BuildBillingSources    `json:"build_billing_sources,omitempty"`
	Entrypoint      string                          `json:"build_billing_entrypoint,omitempty"`
	IdentityLines   features.BuildIdentityLines     `json:"build_identity_lines,omitempty"`
	Identity        features.RequestIdentitySources `json:"request_identity_sources,omitempty"`
	RelayMode       string                          `json:"relay_mode,omitempty"`
	CLIVersion      string                          `json:"cli_version,omitempty"`
}

func messagesBuildComponentsPolicy(raw []byte, policy *buildRequestPolicy, workingDirectory string) ([]byte, error) {
	if err := validateBuildNumbers(raw); err != nil {
		return nil, err
	}
	if err := validateBuildContent(raw); err != nil {
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
				if json.Unmarshal(block["type"], &kind) != nil || kind != "text" || !isJSONString(block["text"]) || json.Unmarshal(block["text"], &text) != nil {
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
	// The CLI receives each tool with its keys in the client's order (only
	// input_schema renamed in place): the wire tools it sends are the client's.
	wireTools := []json.RawMessage{}
	rawTools, hasTools := body["tools"]
	if hasTools {
		if json.Unmarshal(rawTools, &tools) != nil || tools == nil || json.Unmarshal(rawTools, &wireTools) != nil {
			return nil, fmt.Errorf("tools must be an array")
		}
		for index, tool := range tools {
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
				renamed, err := renameJSONKey(wireTools[index], "input_schema", "inputSchema")
				if err != nil {
					return nil, fmt.Errorf("tool definition must be a JSON object")
				}
				wireTools[index] = renamed
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
	components := map[string]any{
		"model": model, "systemPrompt": system, "messages": messages, "attachments": []any{}, "parameters": body, "stream": stream,
	}
	// An absent tool catalog differs from an explicit empty catalog. Retain
	// that distinction through both legacy and preserving CLI build paths.
	if hasTools {
		components["tools"] = wireTools
	}
	if policy != nil {
		components["requestPolicy"] = policy
		components["runtimeContext"] = map[string]any{"workingDirectory": workingDirectory, "additionalWorkingDirectories": []string{}}
		return json.Marshal(components)
	}
	extracted, attachments, err := extractSystemComponents(messages)
	if err != nil {
		return nil, err
	}
	components["messages"], components["attachments"] = extracted, attachments
	return json.Marshal(components)
}

// renameJSONKey renames one key of a JSON object in place: every other key,
// the order and each value's bytes stay as they were.
func renameJSONKey(raw json.RawMessage, from, to string) (json.RawMessage, error) {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	if token, err := decoder.Token(); err != nil || token != json.Delim('{') {
		return nil, errors.New("expected a JSON object")
	}
	var out bytes.Buffer
	out.WriteByte('{')
	for first := true; decoder.More(); first = false {
		token, err := decoder.Token()
		if err != nil {
			return nil, err
		}
		key, _ := token.(string)
		var value json.RawMessage
		if err = decoder.Decode(&value); err != nil {
			return nil, err
		}
		if key == from {
			key = to
		}
		encoded, _ := json.Marshal(key)
		if !first {
			out.WriteByte(',')
		}
		out.Write(encoded)
		out.WriteByte(':')
		out.Write(value)
	}
	if _, err := decoder.Token(); err != nil {
		return nil, err
	}
	out.WriteByte('}')
	return out.Bytes(), nil
}

func (g *Gateway) serveRequestCommand(w http.ResponseWriter, r *http.Request, d *requestDiagnostic) {
	requestMode := g.RequestMode
	fail := func(status int, kind, message string) {
		d.fail(status, kind, message)
		apiError(w, status, kind, message)
	}
	if !g.authorized(r) {
		fail(401, "authentication_error", "Invalid gateway API key")
		return
	}
	var policy buildRequestPolicy
	if value := r.Header.Get(policyHeader); value != "" {
		if len(value) > 16384 || features.ValidatePolicySchemaJSON([]byte(value)) != nil || json.Unmarshal([]byte(value), &policy) != nil {
			fail(400, "invalid_request_error", "Invalid gateway request policy")
			return
		}
		if policy.RelayMode != "" {
			requestMode = policy.RelayMode
		}
	}
	probe := r.URL.Path == "/v1/ccgateway/probe"
	if r.URL.Path != "/v1/messages" && !probe {
		fail(404, "not_found_error", "Request mode supports /v1/messages only")
		return
	}
	if probe {
		requestMode = "build"
		w.Header().Set("X-CCGateway-Test-Mode", "native_build")
		d.setField("test_mode", "native_build")
	}
	if g.CLIInfo.Version != "" && !g.CLIInfo.supports("request_"+requestMode) {
		fail(409, "configuration_error", "Loaded CLI does not support the requested mode")
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
	if err := policy.Identity.Validate(); err != nil {
		fail(400, "invalid_request_error", err.Error())
		return
	}
	// An explicitly configured source must be honoured or refused. The default
	// is never sent by the host, so it simply stays unapplied on a CLI that
	// cannot express it and an old runtime keeps serving requests.
	identityMode := policy.Identity.Mode()
	if identityMode != "client" && !g.CLIInfo.supports(features.RequestIdentityCapability) {
		if policy.Identity.Explicit() {
			fail(409, "configuration_error", "Loaded CLI does not support the requested identity source")
			return
		}
		identityMode = "client"
	}
	var identity *requestIdentity
	// Direct is a pure passthrough (2026-10-21 decision): the identity, like the
	// rest of the body, goes upstream exactly as the client sent it.
	if g.requestIdentityEnabled && requestMode == "build" {
		mapped, mapErr := g.resolveRequestIdentity(g.runner(r.Context()).baseEnv(), raw, identityMode)
		if mapErr != nil {
			fail(400, "invalid_request_error", mapErr.Error())
			return
		}
		identity = &mapped
	}
	// A CLI that rebuilds the client's kind of request (main thread, subagent,
	// compaction) gets the client's agent context. Direct then also adopts the
	// client's session, so the session header agrees with the metadata the body
	// carries unchanged. Console tests are the gateway's own requests and keep
	// the CLI's native context.
	var agent *requestAgent
	if !probe && g.CLIInfo.supports(features.RequestAgentContextCapability) {
		resolved, agentErr := g.resolveRequestAgent(g.runner(r.Context()).baseEnv(), raw, r.Header, requestMode)
		if agentErr != nil {
			fail(400, "invalid_request_error", agentErr.Error())
			return
		}
		agent = &resolved
		headers := make([]string, 0, len(resolved.Client))
		for name := range resolved.Client {
			headers = append(headers, name)
		}
		slices.Sort(headers)
		d.trace("request_agent", Object{"client_headers": headers, "map": resolved.Map, "keyed": resolved.Key != ""})
		if requestMode == "direct" && g.requestIdentityEnabled {
			if mapped, _ := mapRequestIdentity(nil, raw, "client"); mapped.Session != "" {
				identity = &mapped
			}
		}
	}
	d.request(raw, r.Header)
	input := raw
	if err := features.ValidateBillingEntrypoint(policy.Entrypoint); err != nil {
		fail(400, "invalid_request_error", err.Error())
		return
	}
	if err := policy.IdentityLines.Validate(); err != nil {
		fail(400, "invalid_request_error", err.Error())
		return
	}
	identityLines := policy.Entrypoint != "" || len(policy.IdentityLines) > 0
	// Direct fills only a missing billing header or field and the identity
	// line chosen for its entrypoint; the rest of the body goes byte for byte.
	// The CLI does this only when the Worker hands it this context, so a CLI
	// without the capability stays a pure passthrough unless a choice must be
	// honoured.
	var directPolicy []byte
	if requestMode == "direct" {
		if g.CLIInfo.supports(features.DirectBillingCapability) {
			directPolicy, _ = json.Marshal(struct {
				Entrypoint    string                      `json:"build_billing_entrypoint,omitempty"`
				IdentityLines features.BuildIdentityLines `json:"build_identity_lines,omitempty"`
			}{policy.Entrypoint, policy.IdentityLines})
		} else if identityLines {
			fail(409, "configuration_error", "Loaded CLI does not support the requested direct policy")
			return
		}
	}
	if requestMode == "build" {
		if err := policy.Sources.Validate(); err != nil {
			fail(400, "invalid_request_error", err.Error())
			return
		}
		if err := policy.Billing.Validate(); err != nil {
			fail(400, "invalid_request_error", err.Error())
			return
		}
		v2 := g.CLIInfo.supports(features.BuildContentPreservationCapability)
		if (policy.Sources.RequiresV2() || v2 && policy.Sources.UsesWorker()) && !g.CLIInfo.supports(features.BuildAttachmentCapabilityV2) || policy.Billing.UsesWorker() && !g.CLIInfo.supports(features.BuildBillingCapability) ||
			identityLines && !g.CLIInfo.supports(features.BuildIdentityCapability) {
			fail(409, "configuration_error", "Loaded CLI does not support the requested content policy")
			return
		}
		if (policy.Sources.RequiresV2() || policy.Billing.UsesWorker() || identityLines) && !v2 {
			fail(409, "configuration_error", "Loaded CLI lacks build content preservation")
			return
		}
		if !v2 && policy.Sources.UsesWorker() {
			// Reject invalid content before v1 host fact collection; v2
			// validates once while constructing its preserved envelope.
			if err = validateBuildContent(raw); err != nil {
				fail(400, "invalid_request_error", err.Error())
				return
			}
			legacySources := features.BuildAttachmentSources{}
			for _, field := range []string{"platform_name", "os_version"} {
				if source, ok := policy.Sources[field]; ok {
					legacySources[field] = source
				}
			}
			facts, factErr := buildAttachmentEnvironment(legacySources)
			if factErr != nil {
				fail(503, "configuration_error", factErr.Error())
				return
			}
			var decisions []Object
			input, decisions, err = transformBuildAttachments(raw, legacySources, facts)
			d.trace("build_attachment_transform", Object{"sources": policy.Sources, "changed": len(decisions), "decisions": decisions})
		}
		if err == nil {
			if v2 {
				// The CLI envelope carries content sources only: the identity
				// context travels in its own environment variable.
				policy.ContractVersion = 2
				policy.RelayMode, policy.CLIVersion, policy.Identity = "", "", nil
				input, err = messagesBuildComponentsPolicy(input, &policy, g.Runner.WorkingDirectory)
			} else {
				input, err = messagesBuildComponents(input)
			}
		}
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
	// The host tracks the response's message ID for diagnostics only when this
	// account's identity is the one it bound (before the request slot: the
	// verification takes a slot of its own).
	if !probe {
		if status, grantErr := g.requestDiagnosticsGrant(r.Context(), w, r.Header, raw); grantErr != nil {
			kind := "invalid_request_error"
			if status >= 500 {
				kind = "api_error"
			}
			d.trace("diagnostics_grant_failed", Object{"status": status})
			fail(status, kind, grantErr.Error())
			return
		}
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
	args := []string{"request", "--" + requestMode, "--response-meta", meta, "--timeout-ms", strconv.FormatInt(min(timeout.Milliseconds(), 2147483647), 10)}
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
	// Build always needs the identity context: the native builder invents
	// metadata, and only the context makes the CLI keep the client's own value,
	// a mapped one, or none.
	if identity != nil {
		mapped, _ := json.Marshal(identity)
		cmd.Env = envWith(cmd.Env, map[string]string{
			requestIdentityEnv: string(mapped),
		}, "CLAUDE_CODE_REMOTE_SESSION_ID")
	}
	if directPolicy != nil {
		cmd.Env = envWith(cmd.Env, map[string]string{directPolicyEnv: string(directPolicy)})
	}
	if agent != nil {
		// Claude Code writes its request-class, agent-type and prompt-id
		// headers only for Anthropic's own API; an account whose upstream is
		// another base URL (an API key through a relay) would drop the agent
		// context. The CLI sends them as Claude Code does to Anthropic.
		cmd.Env = envWith(cmd.Env, map[string]string{requestAgentEnv: agent.env(), "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL": "1"})
	}
	// The patched request command runs before the interactive CLI initializer.
	// Apply its non-interactive entrypoint default at process startup; an
	// explicitly configured SDK/editor entrypoint remains unchanged.
	entrypoint := "sdk-cli"
	for _, item := range cmd.Env {
		key, value, _ := strings.Cut(item, "=")
		if strings.EqualFold(key, "CLAUDE_CODE_ENTRYPOINT") && value != "" && value != "cli" {
			entrypoint = value
		}
	}
	cmd.Env = envWith(cmd.Env, map[string]string{"CLAUDE_CODE_ENTRYPOINT": entrypoint})
	if requestMode == "build" && g.CLIInfo.supports(features.BuildContentPreservationCapability) {
		cmd.Dir = runner.WorkingDirectory
	}
	cmd.WaitDelay = 2 * time.Second
	output := &requestCommandOutput{writer: w, meta: meta, diagnostic: d}
	cmd.Stdout = output
	stderr := &requestErrorReader{diagnostic: d}
	cmd.Stderr = stderr
	d.trace("request_command", Object{"mode": requestMode, "configured_mode": g.RequestMode, "probe": probe, "cli_version": runner.Version})
	if requestMode == "build" {
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
	// A caller ending its request is not a Worker deadline or a CLI failure.
	// Check this before interpreting stdout/stderr: a killed process may leave
	// a partial frame, or exit successfully while its output pipe is closing.
	clientCanceled := r.Context().Err() != nil || errors.Is(ctx.Err(), context.Canceled)
	if err != nil {
		d.trace("request_command_failed", Object{"response_started": output.started, "cancelled": clientCanceled, "timed_out": !clientCanceled && errors.Is(ctx.Err(), context.DeadlineExceeded)})
	}
	if clientCanceled {
		d.clientCanceled(output.started)
		// Do not fabricate a response to a vanished caller, including an empty
		// implicit 200. Committed status and bytes remain unchanged.
		panic(http.ErrAbortHandler)
	}
	frame := stderr.result()
	if frame != nil {
		body, bodyErr := frame.openBody(meta)
		if bodyErr != nil {
			frame = localRequestError(502, "api_error", "cli_error_protocol", "CLI returned an incomplete HTTP error body")
		} else if body != nil {
			defer body.Close()
		}
	}
	if frame == nil && errors.Is(ctx.Err(), context.DeadlineExceeded) {
		frame = localRequestError(504, "timeout_error", "cli_timeout", "CLI request timed out")
		frame.Source = "timeout"
		frame.record(d, output.started)
		if output.started {
			panic(http.ErrAbortHandler)
		}
		frame.write(w)
		return
	}
	if output.started {
		// Compatibility with the old CLI's meta + stdout HTTP-error contract.
		legacyHTTPError := frame == nil && output.status >= 400 && cmd.ProcessState != nil && cmd.ProcessState.ExitCode() == 2
		if err != nil && !legacyHTTPError || frame != nil {
			if frame == nil {
				frame = localRequestError(502, "api_error", "cli_stream_interrupted", "CC response stream was interrupted")
			}
			frame.record(d, true)
			// Status/bytes are already committed. Abort framing instead of sending
			// a clean EOF or appending JSON to an incomplete JSON/SSE response.
			panic(http.ErrAbortHandler)
		}
		return
	}
	if frame != nil && err != nil {
		frame.record(d, false)
		frame.write(w)
		return
	}
	if frame != nil || stderr.invalid {
		frame = localRequestError(502, "api_error", "cli_error_protocol", "CLI returned an invalid error protocol result")
		frame.record(d, false)
		frame.write(w)
		return
	}
	if err == nil || cmd.ProcessState != nil && cmd.ProcessState.ExitCode() == 2 {
		if output.start() == nil {
			return
		}
	}
	frame = localRequestError(502, "api_error", "cli_process_error", "CLI request failed without a valid structured error")
	frame.record(d, false)
	frame.write(w)
}

type requestCommandOutput struct {
	writer     http.ResponseWriter
	meta       string
	started    bool
	status     int
	diagnostic *requestDiagnostic
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
	h := http.Header{}
	for key, value := range meta.Headers {
		h.Set(key, value)
	}
	httpfacts.Apply(o.writer.Header(), h)
	if ct := h.Get("Content-Type"); ct != "" {
		o.writer.Header().Set("Content-Type", ct)
	}
	o.writer.WriteHeader(meta.Status)
	o.status = meta.Status
	if o.diagnostic != nil {
		o.diagnostic.setHTTPStatus(meta.Status)
	}
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

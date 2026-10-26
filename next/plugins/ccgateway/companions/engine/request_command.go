package engine

// The CLI's request command answers each request with one upstream call:
// model tool calls are returned to the caller, and only the CLI owns upstream
// authentication.
//
// One request goes through these steps, each refusing with its own answer:
// admitRequest (from the headers: parseRequestPolicy, checkCapabilities — one
// table for build and direct —, method, version) → a slot → prepareRequest
// (readRequestBody, resolveRequestContext: identity and agent, prepareInput:
// the CLI's stdin) → runCLI → writeOutcome.
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
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/requestfailure"
)

func validateRequestMode(mode string) error {
	if mode != "direct" && mode != "build" {
		return fmt.Errorf("request mode must be direct or build")
	}
	return nil
}

// requestPlan is what one request runs with, decided before the CLI starts.
type requestPlan struct {
	mode  string // build or direct
	probe bool   // the console's own test request
	// fromCore: the request carries the core's policy (features.PolicyHeader);
	// without one (the CLI run by hand) the container's own mode applies.
	fromCore bool
	cli      features.CLIPolicy
	env      []string // the CLI process environment, read once
	input    []byte   // the CLI's stdin: the body (direct) or the build envelope
	identity *requestIdentity
	agent    *requestAgent
	// mapping: the account's identity key, read once for identity and agent.
	mapping requestKey
	direct  []byte         // CCG_DIRECT_POLICY; nil leaves direct a passthrough
	credit  *requestCredit // the core tracks this request's fallback credit
	// capture: the prefix the CLI writes the request it sent under ("" for
	// none), and captureBody whether it writes the body too
	// (request_log_upstream.go).
	capture     string
	captureBody bool
}

// requestRefusal is the Worker's own answer before the CLI runs.
type requestRefusal struct {
	status        int
	kind, message string
}

func refuse(status int, kind, message string) *requestRefusal {
	return &requestRefusal{status: status, kind: kind, message: message}
}

func (f *requestRefusal) write(w http.ResponseWriter, d *requestDiagnostic) {
	d.fail(f.status, f.kind, f.message)
	apiError(w, f.status, f.kind, f.message)
}

// serveRequestCommand serves an authenticated request (Gateway.ServeHTTP).
func (g *Gateway) serveRequestCommand(w http.ResponseWriter, r *http.Request, d *requestDiagnostic) {
	plan, refusal := g.admitRequest(w, r, d)
	if refusal != nil {
		refusal.write(w, d)
		return
	}
	// A tracked request shares the resource authority until the provider
	// answers (the issuer the core bound it to cannot change before the CLI
	// sent it) and answers with that issuer. Its identity step takes its own
	// slot, before the request's.
	credit, refusal := g.admitCredit(w, r)
	if refusal != nil {
		refusal.write(w, d)
		return
	}
	if credit != nil {
		defer credit.release()
		plan.credit = credit
	}
	// The slot is taken before the body is read or transformed (audit C3): a
	// Worker at its limit refuses at once instead of after up to 32 MiB. What
	// the headers alone refuse (path, mode, CLI, method) keeps its own answer.
	select {
	case g.Slots <- struct{}{}:
		defer func() { <-g.Slots }()
	default:
		w.Header().Set("Retry-After", "1")
		refuse(429, "rate_limit_error", "Gateway concurrency limit reached").write(w, d)
		return
	}
	if refusal = g.prepareRequest(w, r, d, plan); refusal != nil {
		refusal.write(w, d)
		return
	}
	g.runCLI(w, r, d, plan)
}

// admitRequest decides from the headers alone whether this Worker serves the
// request: its policy, path, CLI capabilities, method and API version.
func (g *Gateway) admitRequest(w http.ResponseWriter, r *http.Request, d *requestDiagnostic) (*requestPlan, *requestRefusal) {
	plan, refusal := g.parseRequestPolicy(r)
	if refusal != nil {
		return nil, refusal
	}
	// Every request the Worker can name a mode for is logged with it.
	d.setField("mode", plan.mode)
	if plan.probe {
		w.Header().Set("X-CCGateway-Test-Mode", "native_build")
		d.setField("test_mode", "native_build")
	}
	if refusal = g.checkCapabilities(plan); refusal != nil {
		return nil, refusal
	}
	if r.Method != http.MethodPost {
		return nil, refuse(405, "invalid_request_error", "Use POST")
	}
	if v := r.Header.Get("anthropic-version"); v != "" && v != "2023-06-01" {
		return nil, refuse(400, "invalid_request_error", "Unsupported anthropic-version")
	}
	return plan, nil
}

// prepareRequest reads the body and decides everything the CLI is started
// with. The body is parsed once (requestBody); the credential scan, the
// identity carrier, the log's summary and the build envelope all read that
// parse.
func (g *Gateway) prepareRequest(w http.ResponseWriter, r *http.Request, d *requestDiagnostic, plan *requestPlan) *requestRefusal {
	raw, refusal := readRequestBody(w, r)
	if refusal != nil {
		return refusal
	}
	body := parseRequestBody(raw)
	d.prepareSecrets(body, r.Header.Values("anthropic-beta")...)
	// The redemption the client sent is bound to the headers the core admitted
	// (request_credit.go); the client's own body is kept for its claim.
	if refusal = plan.admitCreditBody(body, r.Header); refusal != nil {
		return refusal
	}
	plan.env = g.Runner.baseEnv()
	if refusal = g.resolveRequestContext(plan, body, r.Header, d); refusal != nil {
		return refusal
	}
	d.request(body, r.Header)
	return g.prepareInput(plan, body)
}

// parseRequestPolicy reads the mode and the core's policy. The wire policy is
// exactly what this Worker reads (features.WorkerPolicy); the request runs on
// the CLI the core chose or not at all.
func (g *Gateway) parseRequestPolicy(r *http.Request) (*requestPlan, *requestRefusal) {
	plan := &requestPlan{mode: g.RequestMode}
	var policy features.WorkerPolicy
	if value := r.Header.Get(features.PolicyHeader); value != "" {
		parsed, err := features.ParseWorkerPolicy([]byte(value))
		if err != nil {
			return nil, refuse(400, "invalid_request_error", "Invalid gateway request policy")
		}
		policy, plan.fromCore = parsed, true
		if policy.RelayMode != "" {
			plan.mode = policy.RelayMode
		}
		if policy.CLIVersion != "" && policy.CLIVersion != g.Runner.Version {
			return nil, refuse(409, "configuration_error", "Worker CLI version differs from gateway configuration; reconcile the runtime")
		}
	}
	plan.probe = r.URL.Path == "/v1/ccgateway/probe"
	if r.URL.Path != "/v1/messages" && !plan.probe {
		return nil, refuse(404, "not_found_error", "Request mode supports /v1/messages only")
	}
	if plan.probe {
		plan.mode = "build"
	}
	// The CLI's part of the policy: the content and billing choices, the
	// injection reduced to what is added.
	plan.cli = policy.CLI()
	return plan, nil
}

// capabilityGate is one thing a request needs the loaded CLI to declare.
type capabilityGate struct {
	when       func(g *Gateway, p *requestPlan) bool
	capability string
	message    string
}

const (
	unsupportedMode    = "Loaded CLI does not support the requested mode"
	unsupportedContent = "Loaded CLI does not support the requested content policy"
	unsupportedDirect  = "Loaded CLI does not support the requested direct policy"
)

func building(p *requestPlan) bool  { return p.mode == "build" }
func directing(p *requestPlan) bool { return p.mode == "direct" }

// otherMode: the container's own mode was checked when the Worker started;
// another one needs the CLI to declare it.
func otherMode(g *Gateway, p *requestPlan) bool {
	return g.CLIInfo.Version != "" || p.mode != g.RequestMode
}

// requestCapabilityGates are the capabilities build and direct need, in the
// order their refusals are reported. They mirror the core's own preflight
// (requestPolicyCapabilities): every policy the core sends carries a request
// level, so a CLI that does not follow the levels is refused in either mode
// (2026-10-23 audit C11).
var requestCapabilityGates = []capabilityGate{
	{func(g *Gateway, p *requestPlan) bool { return building(p) && otherMode(g, p) }, "request_build", unsupportedMode},
	{func(g *Gateway, p *requestPlan) bool { return directing(p) && otherMode(g, p) }, "request_direct", unsupportedMode},
	// The CLI assembles the request from the client's own blocks; the Worker
	// never rewrites them.
	{func(_ *Gateway, p *requestPlan) bool { return building(p) }, features.BuildContentPreservationCapability, "Loaded CLI lacks build content preservation"},
	{func(_ *Gateway, p *requestPlan) bool { return p.fromCore }, features.RequestLevelsCapability, "Loaded CLI does not follow the request levels"},
	{func(_ *Gateway, p *requestPlan) bool {
		return building(p) && (p.cli.BuildAttachmentSources.RequiresV2() || p.cli.BuildAttachmentSources.UsesWorker())
	}, features.BuildAttachmentCapabilityV2, unsupportedContent},
	{func(_ *Gateway, p *requestPlan) bool { return building(p) && p.cli.BuildBillingSources.UsesWorker() }, features.BuildBillingCapability, unsupportedContent},
	// The identity line follows the entrypoint in the CLI.
	{func(_ *Gateway, p *requestPlan) bool { return building(p) && p.cli.BuildBillingEntrypoint != "" }, features.BuildIdentityCapability, unsupportedContent},
	{func(_ *Gateway, p *requestPlan) bool { return building(p) && p.cli.BuildInjection != nil }, features.BuildInjectionCapability, unsupportedContent},
	// Direct is the billing header alone (request levels): the CLI fills it
	// for the entrypoint and converts its fields by their sources only with
	// the Worker's direct context.
	{func(_ *Gateway, p *requestPlan) bool {
		return directing(p) && (p.cli.BuildBillingEntrypoint != "" || len(p.cli.BuildBillingSources) > 0)
	}, features.DirectBillingCapability, unsupportedDirect},
}

func (g *Gateway) checkCapabilities(p *requestPlan) *requestRefusal {
	for _, gate := range requestCapabilityGates {
		if gate.when(g, p) && !g.CLIInfo.supports(gate.capability) {
			return refuse(409, "configuration_error", gate.message)
		}
	}
	return nil
}

// readRequestBody reads at most 32 MiB.
func readRequestBody(w http.ResponseWriter, r *http.Request) ([]byte, *requestRefusal) {
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 32<<20))
	var large *http.MaxBytesError
	switch {
	case errors.As(err, &large):
		return nil, refuse(413, "request_too_large", "Request exceeds 32 MiB")
	case err != nil:
		return nil, refuse(400, "invalid_request_error", "Cannot read body")
	}
	return raw, nil
}

// resolveRequestContext is the identity and agent context the CLI gets, from
// the client's metadata.user_id read once.
func (g *Gateway) resolveRequestContext(p *requestPlan, body *requestBody, h http.Header, d *requestDiagnostic) *requestRefusal {
	// A CLI that rebuilds the client's kind of request (main thread, subagent,
	// compaction) gets the client's agent context. Console tests are the
	// gateway's own requests and keep the CLI's native context.
	agent := !p.probe && g.CLIInfo.supports(features.RequestAgentContextCapability)
	needed := g.requestIdentityEnabled || agent
	// The log keeps the client's session (request_log_upstream.go) from the
	// same read of metadata.user_id.
	logged := d.enabled()
	if !needed && !logged {
		return nil
	}
	client := body.clientIdentity()
	if logged {
		d.clientSession(client, h)
	}
	if !needed {
		return nil
	}
	// Build owns metadata: a metadata.user_id it cannot read is given the
	// account's identity like a missing one (2026-10-25), never refused.
	if client.err != nil && building(p) {
		d.trace("request_identity_unreadable", Object{"error": client.err.Error(), "replaced": true})
		client = clientIdentity{}
	}
	if refusal := g.resolveIdentity(p, client, body, agent); refusal != nil || !agent {
		return refusal
	}
	return g.resolveAgent(p, client, h, d)
}

// resolveIdentity is the identity context. It is not configurable (2026-10-21
// decision): build maps a client metadata.user_id with the account key and
// gives a request without one the account's own (2026-10-25); the mapping is on only for a CLI that carries it (configureRequestIdentity),
// and without it the CLI keeps the native metadata and gets no context.
// Direct is a pure passthrough: the identity, like the rest of the body, goes
// upstream as the client sent it. A CLI that rebuilds the client's kind of
// request (agent) writes Claude Code's session header in direct too, so it
// adopts the client's session and the header agrees with the body's metadata.
func (g *Gateway) resolveIdentity(p *requestPlan, client clientIdentity, body *requestBody, agent bool) *requestRefusal {
	switch {
	case !g.requestIdentityEnabled:
	case building(p):
		mapped, err := g.resolveRequestIdentity(p, client, body)
		if err != nil {
			return refuse(400, "invalid_request_error", err.Error())
		}
		p.identity = &mapped
	case agent:
		if mapped, _ := mapRequestIdentity(nil, client, "client"); mapped.Session != "" {
			p.identity = &mapped
		}
	}
	return nil
}

// resolveAgent is the agent context. Direct sends the body as the client
// wrote it, so a metadata.user_id the Worker cannot read is the upstream's to
// judge, not a Worker refusal (audit C9), and the CLI gets the session-less
// context (build replaced such a value, resolveRequestContext).
func (g *Gateway) resolveAgent(p *requestPlan, client clientIdentity, h http.Header, d *requestDiagnostic) *requestRefusal {
	if client.err != nil {
		d.trace("request_identity_unreadable", Object{"error": client.err.Error()})
	}
	agent := g.resolveRequestAgent(p, client, h)
	p.agent = &agent
	headers := make([]string, 0, len(agent.Client))
	for name := range agent.Client {
		headers = append(headers, name)
	}
	slices.Sort(headers)
	d.trace("request_agent", Object{"client_headers": headers, "map": agent.Map, "keyed": agent.Key != ""})
	return nil
}

// prepareInput writes the CLI's stdin and its direct context.
func (g *Gateway) prepareInput(p *requestPlan, body *requestBody) *requestRefusal {
	if building(p) {
		// The CLI envelope carries the content and billing choices only: the
		// identity context travels in its own environment variable.
		input, err := messagesBuildComponentsFrom(body, &p.cli, g.Runner.WorkingDirectory)
		if err != nil {
			return refuse(400, "invalid_request_error", err.Error())
		}
		p.input = input
		return nil
	}
	// Direct is the billing header alone (request levels, 2026-10-23): the CLI
	// fills a missing header or field for the entrypoint and converts the two
	// billing fields by their sources; the rest of the body goes byte for byte.
	// The CLI does this only when the Worker hands it this context, so a CLI
	// without the capability stays a pure passthrough.
	if g.CLIInfo.supports(features.DirectBillingCapability) {
		p.direct, _ = json.Marshal(struct {
			Entrypoint string                       `json:"build_billing_entrypoint,omitempty"`
			Billing    features.BuildBillingSources `json:"build_billing_sources,omitempty"`
		}{p.cli.BuildBillingEntrypoint, p.cli.BuildBillingSources})
	}
	// The CLI needs a Messages object with a model (checkModelRequest); the
	// rest is the upstream's to judge.
	if _, err := body.model(); err != nil {
		return refuse(400, "invalid_request_error", err.Error())
	}
	p.input = body.raw
	return nil
}

// cliRun is one started request command and what it wrote.
type cliRun struct {
	meta    string
	output  *requestCommandOutput
	stderr  *requestErrorReader
	err     error
	ctx     context.Context // the Worker's deadline over the caller's context
	request context.Context // the caller's context
}

func (g *Gateway) runCLI(w http.ResponseWriter, r *http.Request, d *requestDiagnostic, p *requestPlan) {
	timeout := g.Timeout
	if timeout <= 0 {
		timeout = features.RequestTimeout
	}
	ctx, cancel := context.WithTimeout(r.Context(), timeout)
	defer cancel()
	runner := g.Runner
	dir, err := os.MkdirTemp(runner.Work, "request-")
	if err != nil {
		refuse(500, "api_error", "Cannot prepare CLI request").write(w, d)
		return
	}
	defer os.RemoveAll(dir)
	run := &cliRun{meta: filepath.Join(dir, "response-meta.json"), ctx: ctx, request: r.Context()}
	p.capture, p.captureBody = g.upstreamCapture(d, dir)
	cmd := g.requestCommand(ctx, p, run.meta, timeout, r.Header)
	cmd.Dir = dir
	if building(p) {
		cmd.Dir = runner.WorkingDirectory
	}
	run.output = &requestCommandOutput{writer: w, meta: run.meta, diagnostic: d, credit: p.credit}
	run.stderr = &requestErrorReader{diagnostic: d}
	cmd.Stdout, cmd.Stderr = run.output, run.stderr
	d.trace("request_command", Object{"mode": p.mode, "configured_mode": g.RequestMode, "probe": p.probe, "cli_version": runner.Version})
	if building(p) {
		d.save("build-components.json", p.input)
	}
	d.setStage("request_command")
	// A deadline must also end a write blocked on a slow caller.
	deadlineSet := make(chan struct{})
	stop := context.AfterFunc(ctx, func() {
		_ = http.NewResponseController(w).SetWriteDeadline(time.Now())
		close(deadlineSet)
	})
	run.err = cmd.Run()
	if !stop() {
		<-deadlineSet
	}
	_ = http.NewResponseController(w).SetWriteDeadline(time.Time{})
	// The request the CLI sent goes into the log after the answer, and before
	// the temporary directory is removed, even when the answer aborts.
	defer d.keepUpstreamRequest(p.capture, p.captureBody, run.reachedUpstream())
	run.writeOutcome(w, d, p.env)
}

// requestCommand is the CLI's request command for p: its arguments and the
// environment that carries the request's context.
func (g *Gateway) requestCommand(ctx context.Context, p *requestPlan, meta string, timeout time.Duration, h http.Header) *exec.Cmd {
	args := []string{"request", "--" + p.mode, "--response-meta", meta, "--timeout-ms", strconv.FormatInt(min(timeout.Milliseconds(), 2147483647), 10)}
	// Inbound gateway credentials must never become upstream credentials.
	if values := h.Values("anthropic-version"); len(values) > 0 {
		args = append(args, "--header", "anthropic-version:"+strings.Join(values, ","))
	}
	if values := h.Values("anthropic-beta"); len(values) > 0 {
		args = append(args, "--betas", strings.Join(values, ","))
	}
	// Only a CLI with the capability is asked (an older one refuses unknown
	// arguments), and only while the request is logged (upstreamCapture).
	if p.capture != "" {
		args = append(args, "--capture-request", p.capture)
		if p.captureBody {
			args = append(args, "--capture-body")
		}
	}
	cmd := exec.CommandContext(ctx, g.Runner.CLI, args...)
	cmd.Env, cmd.Stdin, cmd.WaitDelay = p.env, bytes.NewReader(p.input), 2*time.Second
	// Build always needs the identity context: the native builder invents
	// metadata, and only the context makes the CLI keep the client's own value,
	// a mapped one, or none.
	if p.identity != nil {
		mapped, _ := json.Marshal(p.identity)
		cmd.Env = envWith(cmd.Env, map[string]string{requestIdentityEnv: string(mapped)}, "CLAUDE_CODE_REMOTE_SESSION_ID")
	}
	if p.direct != nil {
		cmd.Env = envWith(cmd.Env, map[string]string{directPolicyEnv: string(p.direct)})
	}
	if p.agent != nil {
		// Claude Code writes its request-class, agent-type and prompt-id
		// headers only for Anthropic's own API; an account whose upstream is
		// another base URL (an API key through a relay) would drop the agent
		// context. The CLI sends them as Claude Code does to Anthropic.
		cmd.Env = envWith(cmd.Env, map[string]string{requestAgentEnv: p.agent.env(), "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL": "1"})
	}
	// The patched request command runs before the interactive CLI initializer.
	// Apply its non-interactive entrypoint default at process startup; an
	// explicitly configured SDK/editor entrypoint remains unchanged. This is
	// the process default only: the CLI names the request's own entrypoint
	// (the one its billing header carries) for the header and the User-Agent
	// alike (ClientUserAgentCapability).
	entrypoint := "sdk-cli"
	if value, _ := environmentEntry(cmd.Env, "CLAUDE_CODE_ENTRYPOINT"); value != "" && value != "cli" {
		entrypoint = value
	}
	cmd.Env = envWith(cmd.Env, map[string]string{"CLAUDE_CODE_ENTRYPOINT": entrypoint})
	return cmd
}

// writeOutcome answers with what the CLI did: its response, its structured
// error, or the Worker's own error when it did neither.
func (c *cliRun) writeOutcome(w http.ResponseWriter, d *requestDiagnostic, env []string) {
	// A caller ending its request is not a Worker deadline or a CLI failure.
	// Check this before interpreting stdout/stderr: a killed process may leave
	// a partial frame, or exit successfully while its output pipe is closing.
	clientCanceled := c.request.Err() != nil || errors.Is(c.ctx.Err(), context.Canceled)
	timedOut := !clientCanceled && errors.Is(c.ctx.Err(), context.DeadlineExceeded)
	if c.err != nil {
		d.trace("request_command_failed", Object{"response_started": c.output.started, "cancelled": clientCanceled, "timed_out": timedOut})
	}
	if clientCanceled {
		d.clientCanceled(c.output.started)
		// Do not fabricate a response to a vanished caller, including an empty
		// implicit 200. Committed status and bytes remain unchanged.
		panic(http.ErrAbortHandler)
	}
	frame := c.stderr.result()
	if frame != nil {
		body, bodyErr := frame.openBody(c.meta)
		if bodyErr != nil {
			frame = localRequestError(502, "api_error", "cli_error_protocol", "CLI returned an incomplete HTTP error body")
		} else if body != nil {
			defer body.Close()
		}
	}
	switch {
	case frame == nil && errors.Is(c.ctx.Err(), context.DeadlineExceeded):
		frame = localRequestError(504, "timeout_error", "cli_timeout", "CLI request timed out")
		frame.Source = requestfailure.SourceTimeout
		c.fail(w, d, frame)
	case c.output.started:
		if c.err == nil && frame == nil && c.output.answer() == nil {
			return
		}
		if frame == nil {
			frame = localRequestError(502, "api_error", "cli_stream_interrupted", "CC response stream was interrupted")
		}
		c.fail(w, d, frame)
	case frame != nil && c.err != nil:
		if frame.Source == requestfailure.SourceHTTP && frame.Status == http.StatusUnauthorized {
			// The usage query reports the stored token unusable until it
			// changes (usage.go).
			noteAuthenticationRefused(env)
		}
		c.fail(w, d, frame)
	case frame != nil || c.stderr.invalid:
		c.fail(w, d, localRequestError(502, "api_error", "cli_error_protocol", "CLI returned an invalid error protocol result"))
	case c.err == nil && c.output.answer() == nil:
	default:
		c.fail(w, d, localRequestError(502, "api_error", "cli_process_error", "CLI request failed without a valid structured error"))
	}
}

// answer completes the CLI's successful response: a tracked one with its credit
// receipt, an untracked one by committing it if no byte did.
func (o *requestCommandOutput) answer() error {
	if o.credit != nil {
		return o.finish()
	}
	return o.start()
}

// fail records frame and answers with it, or aborts a response already
// committed: its status and bytes stand, and a clean EOF or JSON appended to
// an incomplete JSON/SSE response would misreport it.
func (c *cliRun) fail(w http.ResponseWriter, d *requestDiagnostic, frame *requestErrorFrame) {
	frame.record(d, c.output.started)
	if c.output.started {
		panic(http.ErrAbortHandler)
	}
	frame.write(w)
}

type requestCommandOutput struct {
	writer      http.ResponseWriter
	meta        string
	started     bool
	status      int
	diagnostic  *requestDiagnostic
	contentType string
	// A tracked response keeps a copy for its credit claim (request_credit.go).
	credit         *requestCredit
	creditCopy     bytes.Buffer
	creditOverflow bool
}

// response is the upstream answer the CLI recorded: its status and headers.
func (o *requestCommandOutput) response() (int, http.Header, error) {
	raw, err := os.ReadFile(o.meta)
	if err != nil {
		return 0, nil, err
	}
	var meta struct {
		Status  int               `json:"status"`
		Headers map[string]string `json:"headers"`
	}
	if err = json.Unmarshal(raw, &meta); err != nil {
		return 0, nil, err
	}
	if meta.Status < 200 || meta.Status > 599 {
		return 0, nil, errors.New("invalid upstream status")
	}
	h := http.Header{}
	for key, value := range meta.Headers {
		h.Set(key, value)
	}
	return meta.Status, h, nil
}

func (o *requestCommandOutput) start() error {
	if o.started {
		return nil
	}
	status, h, err := o.response()
	if err != nil {
		return err
	}
	o.commit(status, h)
	return nil
}

// commit answers with status and the provider's own headers. The issuer the
// credit admission put on the answer stays on it. The provider has answered, so
// a tracked request hands its shared authority back.
func (o *requestCommandOutput) commit(status int, h http.Header) {
	if o.credit != nil {
		o.credit.release()
	}
	o.contentType = h.Get("Content-Type")
	httpfacts.Apply(o.writer.Header(), h)
	if ct := h.Get("Content-Type"); ct != "" {
		o.writer.Header().Set("Content-Type", ct)
	}
	o.writer.WriteHeader(status)
	o.status = status
	if o.diagnostic != nil {
		o.diagnostic.setHTTPStatus(status)
	}
	o.started = true
}

func (o *requestCommandOutput) Write(p []byte) (int, error) {
	if err := o.start(); err != nil {
		return 0, err
	}
	if o.credit != nil {
		o.keepCredit(p)
	}
	n, err := o.writer.Write(p)
	if err == nil {
		_ = http.NewResponseController(o.writer).Flush()
	}
	return n, err
}

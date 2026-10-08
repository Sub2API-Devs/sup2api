package engine

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
)

// cliProcess is a started Claude Code process and its stream-json pipes.
type cliProcess struct {
	diagnostic *requestDiagnostic
	cmd        *exec.Cmd
	stdin      io.WriteCloser
	stdout     io.ReadCloser
}

func startCLI(ctx context.Context, cli string, args []string, work string, env []string, stderr io.Writer) (*cliProcess, error) {
	cmd := exec.CommandContext(ctx, cli, args...)
	cmd.Dir = work
	cmd.Env = env
	stdin, e := cmd.StdinPipe()
	if e != nil {
		return nil, e
	}
	stdout, e := cmd.StdoutPipe()
	if e != nil {
		return nil, e
	}
	cmd.Stderr = io.Discard
	if stderr != nil {
		cmd.Stderr = stderr
	}
	if e = cmd.Start(); e != nil {
		return nil, fmt.Errorf("cannot start Claude Code")
	}
	return &cliProcess{cmd: cmd, stdin: stdin, stdout: stdout}, nil
}

func (c *cliProcess) write(v any) error {
	b, e := json.Marshal(v)
	if e != nil {
		return e
	}
	b = append(b, '\n')
	c.diagnostic.trace("cli_input", v)
	_, e = c.stdin.Write(b)
	return e
}

// cliSession is one stream-json conversation with the CLI: the initialize
// handshake, callbacks, model events and the terminal result frame.
type cliSession struct {
	ctx          context.Context // the request's context, not the run's
	req          *Request
	responseReq  *Request
	p            *Prepared
	cfg          *runConfig
	proc         *cliProcess
	relay        *outboundRelay
	emit         func(Object) error
	initID       string
	initialized  bool
	acc          *Accumulator
	buffered     []Object // events held until the result frame
	searchUsage  Object
	searchRounds int
}

func newCLISession(ctx context.Context, req *Request, p *Prepared, cfg *runConfig, proc *cliProcess, relay *outboundRelay, emit func(Object) error) *cliSession {
	p.FinalResponseStop = nil
	return &cliSession{ctx: ctx, req: req, responseReq: req.responseView(), p: p, cfg: cfg, proc: proc, relay: relay, emit: emit, initID: uuid(), acc: &Accumulator{}, searchUsage: Object{}}
}

// run initializes the CLI and reads frames until the result frame or the end
// of output. Each frame type has its own handler; only result ends the run.
func (s *cliSession) run() (Object, error) {
	systemPrompt := s.req.System

	if e := s.proc.write(Object{"type": "control_request", "request_id": s.initID, "request": Object{"subtype": "initialize", "systemPrompt": systemPrompt, "systemPromptSnapshot": s.p.SnapshotEnabled && s.cfg.scope == nil, "sdkMcpServers": s.req.sdkMCPServers(), "hooks": Object{}, "supportedDialogKinds": []string{}, "promptSuggestions": false, "excludeDynamicSections": true}}); e != nil {
		return nil, fmt.Errorf("cannot initialize CLI")
	}
	scan := bufio.NewScanner(s.proc.stdout)
	scan.Buffer(make([]byte, 64*1024), 32<<20)
	for scan.Scan() {
		line := scan.Bytes()
		if len(line) == 0 {
			continue
		}
		f, e := decodeObject(line)
		if e != nil {
			return nil, fmt.Errorf("invalid CLI protocol frame")
		}
		s.req.diagnostic.trace("cli_output", f)
		switch str(f, "type") {
		case "control_request":
			e = s.onControlRequest(f)
		case "control_response":
			e = s.onControlResponse(f)
		case "stream_event":
			e = s.onStreamEvent(f)
		case "result":
			return s.onResult(f)
		}
		if e != nil {
			return nil, e
		}
		if s.acc.Done && s.req.fallbackJSON() {
			answer, err := s.relay.completedJSONGeneration()
			if err != nil {
				return nil, err
			}
			if err = s.checkMod(); err != nil {
				return nil, err
			}
			s.p.APIResponseComplete = true
			return answer, s.flush()
		}
		if s.acc.Done && s.req.stopsAtAPITerminal(str(s.acc.Message, "stop_reason")) {
			return s.completeAPIOutput()
		}
		// A complete upstream refusal is terminal even when the CLI would
		// retry internally or omit it from native history. The runner closes
		// the process; the HTTP layer emits the single final message_stop.
		if s.acc.Done && str(s.acc.Message, "stop_reason") == "refusal" {
			return s.acc.Message, s.flush()
		}
		if s.acc.Done && s.req.CacheWarmup {
			answer, err := s.relay.completedWarmup()
			if err != nil {
				return nil, err
			}
			return answer, s.flush()
		}
	}
	if s.ctx.Err() != nil {
		return nil, s.ctx.Err()
	}
	if scan.Err() != nil {
		return nil, fmt.Errorf("CLI frame read failed or exceeded size limit")
	}
	return nil, fmt.Errorf("CLI exited before a complete response; check CLI version and authentication")
}

func (s *cliSession) onControlRequest(f Object) error {
	if e := s.proc.write(controlReply(f, s.req)); e != nil {
		return fmt.Errorf("cannot answer CLI callback")
	}
	return nil
}

// onControlResponse submits the client's turn once initialize succeeded.
func (s *cliSession) onControlResponse(f Object) error {
	resp, _ := f["response"].(map[string]any)
	if str(resp, "request_id") != s.initID || s.initialized {
		return nil
	}
	if str(resp, "subtype") != "success" {
		return fmt.Errorf("CLI rejected initialize")
	}
	s.initialized = true
	if e := s.proc.write(Object{"type": "user", "session_id": s.p.SessionID, "uuid": s.p.InputUUID, "parent_tool_use_id": nil, "message": s.req.pendingWireMessage()}); e != nil {
		return fmt.Errorf("cannot submit input")
	}
	return nil
}

func (s *cliSession) onStreamEvent(f Object) error {
	if f["parent_tool_use_id"] != nil {
		return nil
	}
	if !s.initialized {
		return fmt.Errorf("model event before initialization")
	}
	if e := s.checkMod(); e != nil {
		return e
	}
	event, ok := f["event"].(map[string]any)
	if !ok {
		return fmt.Errorf("missing model event")
	}
	if s.acc.Done {
		if s.req.structuredOutput() && !s.acc.HasClientTool && str(event, "type") == "message_start" {
			s.acc = &Accumulator{}
			s.buffered = nil
			s.p.FinalResponseStop = nil
		} else {
			return fmt.Errorf("unexpected post-completion CLI event: %s", str(event, "type"))
		}
	}
	searchMessage := internalHistoryAssistant(s.req, Object{"content": s.acc.Blocks})
	if err := s.restoreExactToolStart(event); err != nil {
		return err
	}
	if err := s.restoreFallbackEvents(event); err != nil {
		return err
	}
	if str(event, "type") == "message_delta" && s.searchRounds > 0 && !searchMessage {
		mergeSearchUsage(event, s.searchUsage, s.acc.Message)
	}
	if e := s.acc.push(event, s.responseReq); e != nil {
		return e
	}
	if s.acc.Done {
		// Wait for native persistence; discovery rounds remain bounded.
		if !internalHistoryAssistant(s.req, s.acc.Message) {
			s.p.recordFinalResponseStop(event)
		}
		return s.endSearchRound()
	}
	if s.req.bufferedResponse() {
		s.buffered = append(s.buffered, event)
		return nil
	}
	return s.emit(event)
}

// checkMod fails closed unless the explicitly injected Mod ran and attached
// the pending system messages, and the relay restored the client's system
// messages. Permission callbacks independently deny execution, even if mod
// loading fails.
func (s *cliSession) checkMod() error {
	if s.cfg.control == nil {
		return fmt.Errorf("ccgateway Mod control is unavailable")
	}
	if err := s.cfg.control.verify(); err != nil {
		return err
	}
	if err := s.cfg.scope.verify(); err != nil {
		return err
	}
	// Any model response must come from a request that went through the
	// relay with the client's system messages restored.
	if len(s.cfg.groups) > 0 && s.relay.Restored() == 0 {
		return fmt.Errorf("model request bypassed the system message relay")
	}
	return nil
}

// endSearchRound discards a completed tool discovery message, keeping its
// usage for the final answer.
func (s *cliSession) endSearchRound() error {
	if !internalHistoryAssistant(s.req, s.acc.Message) {
		return nil
	}
	for _, block := range s.acc.Blocks {
		if str(block, "type") == "tool_use" && str(block, "name") != "ToolSearch" {
			return fmt.Errorf("tool discovery cannot execute client tools in the same response")
		}
	}
	s.searchRounds++
	if s.searchRounds > 3 {
		return fmt.Errorf("tool discovery exceeded 3 rounds")
	}
	addSearchUsage(s.searchUsage, s.acc.Message)
	s.acc = &Accumulator{}
	s.buffered = nil
	return nil
}

func (s *cliSession) onResult(f Object) (Object, error) {
	if err := s.checkMod(); err != nil {
		return nil, err
	}
	if s.acc.Done && str(s.acc.Message, "stop_reason") == "refusal" {
		return s.acc.Message, s.flush()
	}
	if failed, _ := f["is_error"].(bool); failed && !s.acc.Done {
		if detail := str(f, "result"); detail != "" {
			return nil, fmt.Errorf("Claude Code: %s", detail)
		}
		if errors, ok := f["errors"].([]any); ok && len(errors) > 0 {
			return nil, fmt.Errorf("Claude Code: %v", errors)
		}
	}
	if s.req.structuredOutput() && !s.acc.HasClientTool {
		if e := s.acc.finishStructured(f, s.req); e != nil {
			return nil, e
		}
	}
	if !s.acc.Done {
		return nil, fmt.Errorf("CLI ended without a complete model message (%s)", str(f, "subtype"))
	}
	if e := s.flush(); e != nil {
		return nil, e
	}
	return s.finish(f)
}

// flush sends the held-back response: validated structured output, or the
// final answer after tool discovery.
func (s *cliSession) flush() error {
	if !s.req.bufferedResponse() {
		return nil
	}
	if s.req.structuredOutput() && !s.acc.HasClientTool && str(s.acc.Message, "stop_reason") != "refusal" {
		return emitStructuredMessage(s.acc.Message, s.emit, s.buffered)
	}
	for _, event := range s.buffered {
		if e := s.emit(event); e != nil {
			return e
		}
	}
	return nil
}

// finish lets the CLI exit, then reads and checks its native transcript.
func (s *cliSession) finish(f Object) (Object, error) {
	if sid := str(f, "session_id"); sid != "" && s.p.Mode == "rebuild" {
		// Importing an external JSONL may assign a fresh native session ID.
		s.p.SessionID = sid
	}
	_ = s.proc.stdin.Close()
	// result is terminal, but the CLI can still flush notifications to
	// stdout before exiting. Drain the pipe before Wait, otherwise a
	// full pipe blocks both the child writer and our process wait.
	_, _ = io.Copy(io.Discard, s.proc.stdout)
	// A tool handoff reaches max-turns and exits nonzero despite a complete response.
	_ = s.proc.cmd.Wait()
	if s.ctx.Err() != nil {
		return nil, s.ctx.Err()
	}
	if err := s.checkMod(); err != nil {
		return nil, err
	}
	if e := s.p.captureNative(s.proc.cmd.Env, str(s.acc.Message, "id")); e != nil {
		return nil, e
	}
	if len(s.cfg.systems) > 0 && !nativeSystemRecorded(s.p.Rows, s.p.NativeRows, s.cfg.systems) {
		return nil, fmt.Errorf("native transcript is missing the system messages")
	}
	return s.acc.Message, nil
}

func controlReply(f Object, r *Request) Object {
	id := f["request_id"]
	q, _ := f["request"].(map[string]any)
	payload := any(nil)
	switch str(q, "subtype") {
	case "can_use_tool":
		payload = Object{"behavior": "deny", "message": "Tools are executed by the API client", "toolUseID": q["tool_use_id"]}
		if structuredBlock(str(q, "tool_name"), r) || internalHistoryAssistant(r, Object{"content": []Object{{"type": "tool_use", "name": str(q, "tool_name")}}}) {
			payload = Object{"behavior": "allow", "updatedInput": q["input"]}
		}
	case "mcp_message":
		payload = Object{"mcp_response": sdkMCPReply(q, r)}
	case "request_user_dialog":
		payload = Object{"behavior": "cancelled"}
	case "elicitation":
		payload = Object{"action": "decline"}
	default:
		return Object{"type": "control_response", "response": Object{"subtype": "error", "request_id": id, "error": "Unsupported callback"}}
	}
	return Object{"type": "control_response", "response": Object{"subtype": "success", "request_id": id, "response": payload}}
}

package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Runtime-only, never accepted from the API or persisted in the history cache.
// This CLI run is a transcript writer, not an inference attempt.
type continuationBootstrap struct {
	mu    sync.Mutex
	seen  bool
	ready chan struct{}
}

func (r *Request) needsContinuationBootstrap(p *Prepared) bool {
	if r.Model != "claude-sonnet-4-6" || r.continuation == "" || p.Mode != "rebuild" || len(r.Messages) < 2 || r.Messages[0].Role != "user" {
		return false
	}
	if r.resource != nil || r.resources != nil || r.credit != nil || r.MCP != nil || r.InlineTools != nil || r.JSONSchema != nil || r.hasContextControls() || r.hasCompactionHistory() || r.hasFallbacks() || r.toolSearchEnabled() || r.hasInlineSystemMetadata() {
		return false
	}
	if r.Plan != nil && len(r.Plan.fields["safeguards"]) > 0 {
		return false
	}
	for _, block := range r.Messages[0].Content {
		if str(block, "type") != "text" {
			return false
		}
	}
	if len(r.Messages[0].Content) == 0 {
		return false
	}
	ledger, err := r.serverHistoryLedger()
	if err != nil || len(ledger.pending) == 0 {
		return false
	}
	if !plainServerContinuationHistory(r.Messages, ledger.pending) {
		return false
	}
	return !nativeHasAutoMode(p.Rows)
}

// No signatures, inline instructions or client-tool execution are reconstructed
// here. The normal server ledger has already validated all result identities.
func plainServerContinuationHistory(messages []Message, pending map[string]string) bool {
	for _, m := range messages {
		if m.Role != "user" && m.Role != "assistant" {
			return false
		}
		for _, b := range m.Content {
			kind := str(b, "type")
			if kind == "text" {
				continue
			}
			if m.Role != "assistant" || kind != "server_tool_use" && !serverResultTypeForBlock(kind) {
				return false
			}
		}
	}
	finalCalls := map[string]bool{}
	for _, b := range messages[len(messages)-1].Content {
		if str(b, "type") == "server_tool_use" {
			finalCalls[str(b, "id")] = true
		}
	}
	for id := range pending {
		if !finalCalls[id] {
			return false
		}
	}
	return true
}

func nativeHasAutoMode(rows []json.RawMessage) bool {
	for _, raw := range rows {
		row, _ := decodeObject(raw)
		a, _ := row["attachment"].(Object)
		if str(row, "type") == "attachment" && str(a, "type") == "auto_mode" {
			return true
		}
	}
	return false
}

// No route in this relay can reach forward.ServeHTTP, including auxiliaries.
func (b *continuationBootstrap) handle(relay *outboundRelay, w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" || !strings.HasSuffix(r.URL.Path, "/messages") {
		apiError(w, 400, "invalid_request_error", "Bootstrap transport is local only")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4<<20))
	if err == nil && (relay.scope == nil || relay.control == nil) {
		err = fmt.Errorf("missing bootstrap attribution")
	}
	if err == nil {
		err = relay.control.verify()
	}
	if err == nil {
		var body Object
		body, err = decodeObject(raw)
		if err == nil {
			var main bool
			main, err = relay.scope.identify(body, false)
			if err == nil && !main {
				err = fmt.Errorf("auxiliary bootstrap generation")
			}
		}
	}
	b.mu.Lock()
	if err == nil && b.seen {
		err = fmt.Errorf("duplicate bootstrap generation")
	}
	if err == nil {
		b.seen = true
		close(b.ready)
	}
	b.mu.Unlock()
	if err != nil {
		relay.mu.Lock()
		if relay.failure == nil {
			relay.failure = err
		}
		relay.mu.Unlock()
		relay.stop(r)
		return
	}
	// Never return an invented model response; cancellation ends this transport.
	<-r.Context().Done()
}

func (r *Runner) bootstrapContinuation(ctx context.Context, req *Request, p *Prepared) error {
	bootstrapCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	dir, err := os.MkdirTemp(r.Work, "continuation-bootstrap-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(dir)
	state := &continuationBootstrap{ready: make(chan struct{})}
	runner := *r
	runner.bootstrap = state
	first := *req
	first.Messages = append([]Message(nil), req.Messages[:1]...)
	first.continuation = ""
	first.diagnostic = nil
	boot := &Prepared{SessionID: uuid(), InputUUID: uuid(), Mode: "rebuild", Work: p.Work}
	// Each boot owns a fresh UUID. Cleanup runs only after its process joins.
	defer func() {
		paths, _ := filepath.Glob(filepath.Join(cliConfigDir(r.baseEnv()), "projects", "*", boot.SessionID+".jsonl"))
		for _, path := range paths {
			_ = os.Remove(path)
		}
	}()
	done := make(chan error, 1)
	go func() {
		_, err := runner.run(bootstrapCtx, &first, boot, dir, func(Object) error { return fmt.Errorf("bootstrap unexpectedly produced a model event") })
		done <- err
	}()
	joined := false
	defer func() {
		cancel()
		if !joined {
			<-done
		}
	}()
	select {
	case <-state.ready:
	case err := <-done:
		joined = true
		return fmt.Errorf("bootstrap CLI ended before local attribution: %v", err)
	case <-bootstrapCtx.Done():
		return bootstrapCtx.Err()
	}
	path, err := waitBootstrapPrefix(bootstrapCtx, cliConfigDir(r.baseEnv()), boot, &first, r.Version)
	cancel()
	runErr := <-done
	joined = true
	if err != nil {
		return err
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if !errors.Is(runErr, context.Canceled) {
		return fmt.Errorf("bootstrap ended unexpectedly: %v", runErr)
	}
	// The process is now waited for. Re-read final flushed rows and validate again.
	rows, err := readBootstrapPrefix(path, boot, &first, r.Version)
	if err != nil {
		return err
	}
	defer os.Remove(path)
	return installBootstrapPrefix(p, rows, boot.SessionID, req, r.Version)
}

func waitBootstrapPrefix(ctx context.Context, config string, p *Prepared, req *Request, version string) (string, error) {
	ticker := time.NewTicker(25 * time.Millisecond)
	defer ticker.Stop()
	for {
		paths, err := filepath.Glob(filepath.Join(config, "projects", "*", p.SessionID+".jsonl"))
		if err != nil {
			return "", err
		}
		if len(paths) > 1 {
			return "", fmt.Errorf("ambiguous bootstrap transcript")
		}
		if len(paths) == 1 {
			if rows, err := readBootstrapPrefix(paths[0], p, req, version); err == nil && nativeHasAutoMode(rows) {
				return paths[0], nil
			}
		}
		select {
		case <-ctx.Done():
			return "", fmt.Errorf("bootstrap native prefix was not completed: %w", ctx.Err())
		case <-ticker.C:
		}
	}
}

func readBootstrapPrefix(path string, p *Prepared, req *Request, version string) ([]json.RawMessage, error) {
	info, err := os.Lstat(path)
	if err != nil {
		return nil, err
	}
	if !info.Mode().IsRegular() {
		return nil, fmt.Errorf("bootstrap transcript is not a regular file")
	}
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	raw, err := io.ReadAll(io.LimitReader(f, (4<<20)+1))
	if err != nil || len(raw) > 4<<20 {
		return nil, fmt.Errorf("bootstrap native prefix exceeds limit")
	}
	var rows []json.RawMessage
	users := 0
	seen := map[string]bool{}
	for _, line := range strings.Split(string(raw), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		if len(rows) >= 128 {
			return nil, fmt.Errorf("bootstrap record limit")
		}
		row, err := decodeObject([]byte(line))
		if err != nil {
			return nil, err
		}
		kind := str(row, "type")
		switch kind {
		case "queue-operation", "atis-latch":
		case "user", "attachment":
			id := str(row, "uuid")
			if id == "" || seen[id] || str(row, "sessionId") != p.SessionID || str(row, "cwd") != p.Work || str(row, "version") != version {
				return nil, fmt.Errorf("bootstrap native identity mismatch")
			}
			parent := str(row, "parentUuid")
			if kind == "user" && (users != 0 || parent != "") {
				return nil, fmt.Errorf("bootstrap first user has an unexpected parent")
			}
			if kind == "attachment" && (users != 1 || parent == "" || !seen[parent]) {
				return nil, fmt.Errorf("bootstrap attachment parent mismatch")
			}
			seen[id] = true
			if kind == "user" {
				users++
				m, _ := row["message"].(Object)
				blocks, err := historyContent(m["content"])
				if err != nil || id != p.InputUUID || str(m, "role") != "user" || digest(historySkeleton(blocks)) != digest(historySkeleton(req.cliWireMessage(req.Messages[0]).Content)) {
					return nil, fmt.Errorf("bootstrap first user changed")
				}
			}
		default:
			return nil, fmt.Errorf("unexpected bootstrap native record")
		}
		rows = append(rows, append(json.RawMessage(nil), line...))
	}
	if users != 1 || !nativeHasAutoMode(rows) {
		return nil, fmt.Errorf("bootstrap prefix incomplete")
	}
	return rows, nil
}

func installBootstrapPrefix(p *Prepared, prefix []json.RawMessage, sid string, req *Request, version string) error {
	// Recreate only the imported client suffix with the normal transcript writer.
	// Preserve generated prefix rows byte-for-byte; original Request is untouched.
	next := *p
	next.SessionID = sid
	next.Rows = append([]json.RawMessage(nil), prefix...)
	next.Anchor = ""
	next.Fork = false
	parent := ""
	for _, raw := range prefix {
		row, _ := decodeObject(raw)
		if id := str(row, "uuid"); id != "" {
			parent = id
		}
	}
	next.LastUUID = next.seedRows(req, 1, req.pendingStart(), parent, version)
	if next.Path == "" || next.Anchor == "" {
		return fmt.Errorf("bootstrap import missing assistant anchor")
	}
	if err := writeNative(next.Path, next.Rows); err != nil {
		return err
	}
	*p = next
	return nil
}

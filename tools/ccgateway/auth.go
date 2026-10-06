package main

import (
	"bufio"
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// Management error codes (CCGATEWAY-DRAFT-RUNTIMES §2). The console translates
// the code; the message is an English fallback.
const (
	codeInvalidRequest     = "invalid_request"
	codeSessionNotFound    = "session_not_found"
	codeInvalidCode        = "invalid_code"
	codeAuthRejected       = "auth_rejected"
	codeAuthProcessFailed  = "auth_process_failed"
	codeInvalidAuthURL     = "invalid_auth_url"
	codeStatusUnavailable  = "status_unavailable"
	codeLogoutFailed       = "logout_failed"
	authSessionLifetime    = 10 * time.Minute
	authRequestBodyMaxSize = 8192
)

type authError struct{ code, message string }

func (e *authError) Error() string { return e.message }

func authFail(code, message string) error { return &authError{code, message} }

// One isolated CLI process owns the PKCE verifier for the entire login flow.
type authSession struct {
	id, state, url string
	expires        time.Time
	cancel         context.CancelFunc
	input          io.WriteCloser
	frames         chan Object
	done           chan struct{} // closed when the login process has exited; nil in tests
}
type authManager struct {
	requestLogs *requestLogStore
	mu          sync.Mutex
	session     *authSession
	cli, key    string
	proxy       *ProxyConfigStore
	// version is the CLI version (usage request user agent); usageURL
	// overrides the Anthropic usage endpoint in tests.
	version, usageURL string
}

// alive reports whether the login can still be completed.
func (s *authSession) alive(now time.Time) bool {
	if !now.Before(s.expires) {
		return false
	}
	select {
	case <-s.done:
		return false
	default:
		return true
	}
}

func (s *authSession) public() Object {
	return Object{"session_id": s.id, "url": s.url, "expires_at": s.expires}
}

func (s *authSession) call(ctx context.Context, request Object) (Object, error) {
	id := uuid()
	b, _ := json.Marshal(Object{"type": "control_request", "request_id": id, "request": request})
	if _, err := s.input.Write(append(b, '\n')); err != nil {
		return nil, authFail(codeAuthProcessFailed, "The login process is closed.")
	}
	for {
		select {
		case <-ctx.Done():
			return nil, authFail(codeAuthProcessFailed, "The login process did not answer in time.")
		case frame, ok := <-s.frames:
			if !ok {
				return nil, authFail(codeAuthProcessFailed, "The login process exited.")
			}
			res, _ := frame["response"].(map[string]any)
			if str(res, "request_id") != id {
				continue
			}
			if str(res, "subtype") != "success" {
				return nil, authFail(codeAuthRejected, "Claude Code rejected the authorization code. Start the authorization again.")
			}
			value, _ := res["response"].(map[string]any)
			return value, nil
		}
	}
}

// pending returns the live session, ending a dead or expired one. Caller holds a.mu.
func (a *authManager) pending() *authSession {
	if a.session == nil {
		return nil
	}
	if !a.session.alive(time.Now()) {
		a.end()
		return nil
	}
	return a.session
}

// end stops the login process and forgets the session. Caller holds a.mu.
func (a *authManager) end() {
	if a.session != nil {
		a.session.cancel()
		a.session = nil
	}
}

func (a *authManager) start(ctx context.Context) (Object, error) {
	if s := a.pending(); s != nil {
		return s.public(), nil // idempotent: the pending login keeps its link
	}
	life, cancel := context.WithTimeout(context.Background(), authSessionLifetime)
	cmd := exec.CommandContext(life, a.cli, "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--tools", "", "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", `{"disableAllHooks":true}`, "--no-session-persistence", "--no-chrome", "--disable-slash-commands")
	cmd.Env = envWith(a.proxy.Environment(os.Environ()), nil, "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_BASE_URL")
	processFailed := authFail(codeAuthProcessFailed, "The login process could not be started.")
	input, err := cmd.StdinPipe()
	if err != nil {
		cancel()
		return nil, processFailed
	}
	output, err := cmd.StdoutPipe()
	if err != nil {
		cancel()
		input.Close()
		return nil, processFailed
	}
	cmd.Stderr = io.Discard
	if err = cmd.Start(); err != nil {
		cancel()
		input.Close()
		return nil, processFailed
	}
	s := &authSession{id: uuid(), expires: time.Now().Add(authSessionLifetime), cancel: cancel, input: input, frames: make(chan Object, 16), done: make(chan struct{})}
	go func() {
		defer close(s.done)
		defer close(s.frames)
		defer cancel()
		defer input.Close()
		scanner := bufio.NewScanner(output)
		scanner.Buffer(make([]byte, 4096), 1<<20)
		for scanner.Scan() {
			var f Object
			if json.Unmarshal(scanner.Bytes(), &f) == nil && str(f, "type") == "control_response" {
				select {
				case s.frames <- f:
				case <-life.Done():
				}
			}
		}
		cancel()
		_ = cmd.Wait()
	}()
	// A rejected initialize/authenticate request is a broken login process,
	// not a rejected authorization code.
	if _, err = s.call(ctx, Object{"subtype": "initialize", "hooks": Object{}, "sdkMcpServers": []any{}, "supportedDialogKinds": []any{}, "promptSuggestions": false}); err != nil {
		cancel()
		return nil, authFail(codeAuthProcessFailed, "The login process failed to initialize.")
	}
	res, err := s.call(ctx, Object{"subtype": "claude_authenticate", "loginWithClaudeAi": true})
	if err != nil {
		cancel()
		return nil, authFail(codeAuthProcessFailed, "The login process did not return an authorization link.")
	}
	u, err := url.Parse(str(res, "manualUrl"))
	if err != nil || u.Scheme != "https" || u.User != nil || (u.Host != "claude.com" && u.Host != "claude.ai" && u.Host != "platform.claude.com" && u.Host != "console.anthropic.com") || u.Query().Get("state") == "" || u.Query().Get("code_challenge") == "" || u.Query().Get("code_challenge_method") != "S256" {
		cancel()
		return nil, authFail(codeInvalidAuthURL, "The authorization link failed validation.")
	}
	s.state = u.Query().Get("state")
	s.url = u.String()
	a.session = s
	return s.public(), nil
}

// decodeBody reads an optional JSON object; an empty body is allowed when optional.
func decodeBody(w http.ResponseWriter, r *http.Request, optional bool, v any) error {
	err := json.NewDecoder(http.MaxBytesReader(w, r.Body, authRequestBodyMaxSize)).Decode(v)
	if err == nil || (optional && errors.Is(err, io.EOF)) {
		return nil
	}
	return authFail(codeInvalidRequest, "The request body is not valid JSON.")
}

func (a *authManager) complete(ctx context.Context, w http.ResponseWriter, r *http.Request) (Object, error) {
	var body struct {
		SessionID string `json:"session_id"`
		Code      string `json:"code"`
	}
	if err := decodeBody(w, r, false, &body); err != nil {
		return nil, err
	}
	pasted := strings.TrimSpace(body.Code)
	if pasted == "" {
		return nil, authFail(codeInvalidRequest, "The authorization code is missing.")
	}
	s := a.pending()
	// A different session_id leaves the pending login alone: it belongs to
	// whoever started it last.
	if s == nil || (body.SessionID != "" && body.SessionID != s.id) {
		return nil, authFail(codeSessionNotFound, "No pending authorization matches this request. Start the authorization again.")
	}
	code, state, ok := strings.Cut(pasted, "#")
	if !ok || code == "" || subtle.ConstantTimeCompare([]byte(state), []byte(s.state)) != 1 {
		return nil, authFail(codeInvalidCode, "Paste the complete code#state from this authorization.")
	}
	_, err := s.call(ctx, Object{"subtype": "claude_oauth_callback", "authorizationCode": code, "state": state})
	a.end()
	if err != nil {
		return nil, err
	}
	return Object{"success": true}, nil
}

func (a *authManager) cancelSession(w http.ResponseWriter, r *http.Request) (Object, error) {
	var body struct {
		SessionID string `json:"session_id"`
	}
	if err := decodeBody(w, r, true, &body); err != nil {
		return nil, err
	}
	// Idempotent: an absent, expired or already replaced session is cancelled.
	if s := a.pending(); s != nil && (body.SessionID == "" || body.SessionID == s.id) {
		a.end()
	}
	return Object{"success": true}, nil
}

func (a *authManager) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if a.key == "" || subtle.ConstantTimeCompare([]byte(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")), []byte(a.key)) != 1 {
		apiError(w, 401, "authentication_error", "Invalid management key")
		return
	}
	if r.URL.Path == "/admin/proxy" {
		a.proxy.serve(w, r)
		return
	}
	if r.URL.Path == "/admin/request-logs" {
		a.requestLogs.serve(w, r)
		return
	}
	if r.URL.Path == "/admin/usage" {
		a.usage(w, r)
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	var result Object
	var err error
	switch r.Method + " " + r.URL.Path {
	case "GET /admin/status":
		cmd := exec.CommandContext(ctx, a.cli, "auth", "status", "--json")
		cmd.Env = a.proxy.Environment(os.Environ())
		b, runErr := cmd.Output()
		var status struct {
			LoggedIn   bool   `json:"loggedIn"`
			AuthMethod string `json:"authMethod"`
		}
		if json.Unmarshal(b, &status) != nil {
			err = authFail(codeStatusUnavailable, "The Claude Code authorization status could not be read.")
		} else {
			result = Object{"healthy": true, "logged_in": status.LoggedIn && runErr == nil, "auth_method": status.AuthMethod}
		}
	case "GET /admin/auth/session":
		result = Object{"session": nil}
		if s := a.pending(); s != nil {
			result["session"] = s.public()
		}
	case "POST /admin/auth/start":
		result, err = a.start(ctx)
	case "POST /admin/auth/complete":
		result, err = a.complete(ctx, w, r)
	case "POST /admin/auth/cancel":
		result, err = a.cancelSession(w, r)
	case "POST /admin/auth/logout":
		a.end()
		cmd := exec.CommandContext(ctx, a.cli, "auth", "logout")
		cmd.Env = a.proxy.Environment(os.Environ())
		if cmd.Run() != nil {
			err = authFail(codeLogoutFailed, "Claude Code logout failed.")
		} else {
			result = Object{"success": true}
		}
	default:
		apiError(w, 404, "not_found_error", "Unknown management endpoint")
		return
	}
	if err != nil {
		var e *authError
		if !errors.As(err, &e) {
			e = &authError{codeInvalidRequest, "The request could not be processed."}
		}
		apiError(w, 400, e.code, e.message)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

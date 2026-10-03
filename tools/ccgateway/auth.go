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

// One isolated CLI process owns the PKCE verifier for the entire login flow.
type authSession struct {
	id, state string
	expires   time.Time
	cancel    context.CancelFunc
	input     io.WriteCloser
	frames    chan Object
}
type authManager struct {
	mu       sync.Mutex
	session  *authSession
	cli, key string
	proxy    *ProxyConfigStore
}

func (s *authSession) call(ctx context.Context, request Object) (Object, error) {
	id := uuid()
	b, _ := json.Marshal(Object{"type": "control_request", "request_id": id, "request": request})
	if _, err := s.input.Write(append(b, '\n')); err != nil {
		return nil, errors.New("授权进程已关闭")
	}
	for {
		select {
		case <-ctx.Done():
			return nil, errors.New("授权请求超时")
		case frame, ok := <-s.frames:
			if !ok {
				return nil, errors.New("授权进程已退出")
			}
			res, _ := frame["response"].(map[string]any)
			if str(res, "request_id") != id {
				continue
			}
			if str(res, "subtype") != "success" {
				return nil, errors.New("Claude Code 拒绝授权请求，请重新授权")
			}
			value, _ := res["response"].(map[string]any)
			return value, nil
		}
	}
}

func (a *authManager) start(ctx context.Context) (Object, error) {
	if a.session != nil && time.Now().Before(a.session.expires) {
		return nil, errors.New("已有待完成的授权，请先取消或等待过期")
	}
	if a.session != nil {
		a.session.cancel()
		a.session = nil
	}
	life, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	cmd := exec.CommandContext(life, a.cli, "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--tools", "", "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", `{"disableAllHooks":true}`, "--no-session-persistence", "--no-chrome", "--disable-slash-commands")
	cmd.Env = envWith(a.proxy.Environment(os.Environ()), nil, "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_BASE_URL")
	input, err := cmd.StdinPipe()
	if err != nil {
		cancel()
		return nil, err
	}
	output, err := cmd.StdoutPipe()
	if err != nil {
		cancel()
		input.Close()
		return nil, err
	}
	cmd.Stderr = io.Discard
	if err = cmd.Start(); err != nil {
		cancel()
		input.Close()
		return nil, errors.New("无法启动授权进程")
	}
	s := &authSession{id: uuid(), expires: time.Now().Add(10 * time.Minute), cancel: cancel, input: input, frames: make(chan Object, 16)}
	go func() {
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
	if _, err = s.call(ctx, Object{"subtype": "initialize", "hooks": Object{}, "sdkMcpServers": []any{}, "supportedDialogKinds": []any{}, "promptSuggestions": false}); err != nil {
		cancel()
		return nil, err
	}
	res, err := s.call(ctx, Object{"subtype": "claude_authenticate", "loginWithClaudeAi": true})
	if err != nil {
		cancel()
		return nil, err
	}
	u, err := url.Parse(str(res, "manualUrl"))
	if err != nil || u.Scheme != "https" || u.User != nil || (u.Host != "claude.com" && u.Host != "claude.ai" && u.Host != "platform.claude.com" && u.Host != "console.anthropic.com") || u.Query().Get("state") == "" || u.Query().Get("code_challenge") == "" || u.Query().Get("code_challenge_method") != "S256" {
		cancel()
		return nil, errors.New("授权链接校验失败")
	}
	s.state = u.Query().Get("state")
	a.session = s
	return Object{"session_id": s.id, "url": u.String(), "expires_at": s.expires}, nil
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
			err = errors.New("无法读取 Claude Code 授权状态")
		} else {
			result = Object{"healthy": true, "logged_in": status.LoggedIn && runErr == nil, "auth_method": status.AuthMethod}
		}
	case "POST /admin/auth/start":
		result, err = a.start(ctx)
	case "POST /admin/auth/complete", "POST /admin/auth/cancel":
		var body struct {
			SessionID string `json:"session_id"`
			Code      string `json:"code"`
		}
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192)).Decode(&body) != nil {
			err = errors.New("授权参数无效")
			break
		}
		s := a.session
		if s == nil && strings.HasSuffix(r.URL.Path, "/cancel") {
			result = Object{"success": true}
			break
		}
		if s == nil || s.id != body.SessionID {
			err = errors.New("授权会话不存在或已过期")
			break
		}
		if strings.HasSuffix(r.URL.Path, "/cancel") {
			s.cancel()
			a.session = nil
			result = Object{"success": true}
			break
		}
		if time.Now().After(s.expires) {
			err = errors.New("授权会话不存在或已过期")
			break
		}
		code, state, ok := strings.Cut(strings.TrimSpace(body.Code), "#")
		if !ok || code == "" || subtle.ConstantTimeCompare([]byte(state), []byte(s.state)) != 1 {
			err = errors.New("请粘贴完整的 code#state，且必须属于本次授权")
			break
		}
		_, err = s.call(ctx, Object{"subtype": "claude_oauth_callback", "authorizationCode": code, "state": state})
		s.cancel()
		a.session = nil
		if err == nil {
			result = Object{"success": true}
		}
	case "POST /admin/auth/logout":
		if a.session != nil {
			a.session.cancel()
			a.session = nil
		}
		cmd := exec.CommandContext(ctx, a.cli, "auth", "logout")
		cmd.Env = a.proxy.Environment(os.Environ())
		if cmd.Run() != nil {
			err = errors.New("退出授权失败")
		} else {
			result = Object{"success": true}
		}
	default:
		apiError(w, 404, "not_found_error", "Unknown management endpoint")
		return
	}
	if err != nil {
		apiError(w, 400, "invalid_request_error", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

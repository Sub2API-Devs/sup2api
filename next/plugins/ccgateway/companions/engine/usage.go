package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// GET /admin/usage (CONTRACTS §49 container interface): the subscription
// usage of the signed-in Claude account, read from Anthropic's OAuth usage
// endpoint with the access token Claude Code stored in this container. The
// core cannot see that token nor the rate-limit headers of the CLI's own
// requests, so it asks the container (§44, CCGateway quota provider).
//
// 200: Anthropic's JSON object, verbatim (five_hour, seven_day,
// seven_day_sonnet, seven_day_overage_included, ...). The core parses it.
// 400 not_logged_in: no OAuth token stored (signed out, or an API key runtime).
// 400 token_expired: Anthropic rejected the token (401). The CLI refreshes
// its token on its next model request; the container does not refresh it
// itself (a second refresher would race the CLI's refresh-token rotation).
// 502 upstream_error: anything else (transport, non-200, not a JSON object).

const (
	codeNotLoggedIn   = "not_logged_in"
	codeTokenExpired  = "token_expired"
	codeUpstreamError = "upstream_error"

	// defaultUsageURL is Anthropic's OAuth usage endpoint (as queried by the
	// claude-oauth plugin and sub2api).
	defaultUsageURL     = "https://api.anthropic.com/api/oauth/usage"
	usageTimeout        = 20 * time.Second
	usageMaxBody        = 64 << 10
	maxCredentialsBytes = 1 << 20
)

// oauthCredentials is the part of Claude Code's .credentials.json we read.
type oauthCredentials struct {
	ClaudeAiOauth *struct {
		AccessToken string `json:"accessToken"`
		ExpiresAt   int64  `json:"expiresAt"` // Unix milliseconds
	} `json:"claudeAiOauth"`
}

// credentialsPath is where Claude Code keeps its OAuth tokens on Linux: the
// secure-storage directory (the image sets it to $CLAUDE_CONFIG_DIR), else the
// configuration directory, else ~/.claude.
func credentialsPath() string {
	return credentialsPathIn(os.Environ())
}

func credentialsPathIn(env []string) string {
	for _, k := range []string{"CLAUDE_SECURESTORAGE_CONFIG_DIR", "CLAUDE_CONFIG_DIR"} {
		if d := environmentValue(env, k); d != "" {
			return filepath.Join(d, ".credentials.json")
		}
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".claude", ".credentials.json")
}

// storedAccessToken reads the OAuth access token Claude Code stored; "" when
// there is none (not signed in with a Claude account).
func storedAccessToken() string {
	return storedAccessTokenIn(os.Environ())
}

func storedAccessTokenIn(env []string) string {
	f, err := os.Open(credentialsPathIn(env))
	if err != nil {
		return ""
	}
	defer f.Close()
	raw, err := io.ReadAll(io.LimitReader(f, maxCredentialsBytes))
	if err != nil {
		return ""
	}
	var c oauthCredentials
	if json.Unmarshal(raw, &c) != nil || c.ClaudeAiOauth == nil {
		return ""
	}
	return strings.TrimSpace(c.ClaudeAiOauth.AccessToken)
}

// envProxy returns the HTTPS proxy of a process environment (what the CLI
// would use), nil for a direct connection. With CCG_EXTERNAL_EGRESS the
// environment has no proxy: the account egress controller forces the route.
func envProxy(env []string) func(*http.Request) (*url.URL, error) {
	var raw string
	for _, item := range env {
		k, v, _ := strings.Cut(item, "=")
		switch k {
		case "HTTPS_PROXY", "https_proxy":
			if v != "" {
				raw = v
			}
		}
	}
	if raw == "" {
		return nil
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return nil
	}
	return http.ProxyURL(u)
}

// usage serves GET /admin/usage. It does not hold the login lock: a usage
// query must not wait for (or block) an authorization in progress.
func (a *authManager) usage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		apiError(w, 405, "invalid_request_error", "Method not allowed")
		return
	}
	token := storedAccessTokenIn(a.environment())
	if token == "" {
		apiError(w, 400, codeNotLoggedIn, "Claude Code is not signed in with a Claude account.")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), usageTimeout)
	defer cancel()
	target := a.usageURL
	if target == "" {
		target = defaultUsageURL
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		apiError(w, 502, codeUpstreamError, "The usage request could not be built.")
		return
	}
	ua := "claude-code/2.1.7"
	if a.version != "" {
		ua = "claude-code/" + a.version
	}
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("anthropic-beta", "oauth-2025-04-20")
	req.Header.Set("User-Agent", ua)
	tr := &http.Transport{Proxy: envProxy(a.environment()), MaxResponseHeaderBytes: 64 << 10,
		TLSHandshakeTimeout: 10 * time.Second, ResponseHeaderTimeout: usageTimeout}
	defer tr.CloseIdleConnections()
	client := &http.Client{Transport: tr, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	res, err := client.Do(req)
	if err != nil {
		apiError(w, 502, codeUpstreamError, "The Anthropic usage API could not be reached.")
		return
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, usageMaxBody+1))
	if err != nil {
		apiError(w, 502, codeUpstreamError, "The Anthropic usage API answer could not be read.")
		return
	}
	if len(raw) > usageMaxBody {
		apiError(w, 502, codeUpstreamError, "The Anthropic usage API answer is too large.")
		return
	}
	switch {
	case res.StatusCode == http.StatusUnauthorized:
		apiError(w, 400, codeTokenExpired, "Anthropic rejected the stored OAuth token: "+asciiSnippet(raw))
		return
	case res.StatusCode != http.StatusOK:
		apiError(w, 502, codeUpstreamError, fmt.Sprintf("The Anthropic usage API returned %d: %s", res.StatusCode, asciiSnippet(raw)))
		return
	}
	var obj map[string]json.RawMessage
	if json.Unmarshal(raw, &obj) != nil || obj == nil {
		apiError(w, 502, codeUpstreamError, "The Anthropic usage API answer is not a JSON object.")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(raw)
}

// asciiSnippet is the start of an upstream body for an English error
// message: printable ASCII only, at most 200 bytes.
func asciiSnippet(b []byte) string {
	var sb strings.Builder
	for _, c := range b {
		if sb.Len() >= 200 {
			sb.WriteString("...")
			break
		}
		switch {
		case c >= 32 && c < 127:
			sb.WriteByte(c)
		case c == '\n' || c == '\r' || c == '\t':
			sb.WriteByte(' ')
		}
	}
	s := strings.TrimSpace(sb.String())
	if s == "" {
		return "(empty body)"
	}
	return s
}

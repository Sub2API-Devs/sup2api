package engine

import (
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
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
// 400 token_expired: Anthropic refused the token because its access token
// expired and a refresh token is stored. The CLI refreshes it on its next
// model request; the container does not refresh it itself (a second refresher
// would race the CLI's refresh-token rotation).
// 400 token_revoked: the authorization cannot be used without signing in
// again: Anthropic refused a token that had not expired (or said it was
// revoked), no refresh token is stored, or a model request was already
// refused with this very token (the CLI could not renew it).
// 502 upstream_error: anything else (transport, non-200, not a JSON object).

const (
	codeNotLoggedIn   = "not_logged_in"
	codeTokenExpired  = "token_expired"
	codeTokenRevoked  = "token_revoked"
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
		AccessToken  string `json:"accessToken"`
		RefreshToken string `json:"refreshToken"`
		ExpiresAt    int64  `json:"expiresAt"` // Unix milliseconds
	} `json:"claudeAiOauth"`
}

// storedOAuth is the stored authorization: access token ("" when not signed
// in with a Claude account), its expiry (Unix ms, 0 unknown) and whether a
// refresh token can renew it.
type storedOAuth struct {
	access      string
	expiresAt   int64
	refreshable bool
}

// refusedTokens remembers, per credentials file, the digest of the access
// token a model request was refused with. While the file still holds that
// token the CLI could not renew it: the refresh token is no good either.
var refusedTokens sync.Map

func tokenDigest(token string) [32]byte { return sha256.Sum256([]byte(token)) }

// noteAuthenticationRefused records that a model request of this process
// environment ended with Anthropic refusing its credentials.
func noteAuthenticationRefused(env []string) {
	if c := storedOAuthIn(env); c.access != "" {
		refusedTokens.Store(credentialsPathIn(env), tokenDigest(c.access))
	}
}

func refusedWith(env []string, token string) bool {
	digest, ok := refusedTokens.Load(credentialsPathIn(env))
	return ok && digest.([32]byte) == tokenDigest(token)
}

// credentialsPath is where Claude Code keeps its OAuth tokens on Linux: the
// secure-storage directory (the image sets it to $CLAUDE_CONFIG_DIR), else the
// configuration directory, else ~/.claude.
func credentialsPath() string {
	return credentialsPathIn(os.Environ())
}

func credentialsPathIn(env []string) string {
	if value, present := environmentEntry(env, "CLAUDE_SECURESTORAGE_CONFIG_DIR"); present {
		if value != "" {
			return filepath.Join(value, ".credentials.json")
		}
		env = envWith(env, nil, "CLAUDE_CONFIG_DIR", "CLAUDE_SECURESTORAGE_CONFIG_DIR")
	}
	return filepath.Join(snapshotConfigDirectory(env), ".credentials.json")
}

// storedAccessToken reads the OAuth access token Claude Code stored; "" when
// there is none (not signed in with a Claude account).
func storedAccessToken() string {
	return storedAccessTokenIn(os.Environ())
}

func storedAccessTokenIn(env []string) string {
	return storedOAuthIn(env).access
}

func storedOAuthIn(env []string) storedOAuth {
	f, err := os.Open(credentialsPathIn(env))
	if err != nil {
		return storedOAuth{}
	}
	defer f.Close()
	raw, err := io.ReadAll(io.LimitReader(f, maxCredentialsBytes))
	if err != nil {
		return storedOAuth{}
	}
	var c oauthCredentials
	if json.Unmarshal(raw, &c) != nil || c.ClaudeAiOauth == nil {
		return storedOAuth{}
	}
	o := c.ClaudeAiOauth
	return storedOAuth{access: strings.TrimSpace(o.AccessToken), expiresAt: o.ExpiresAt, refreshable: strings.TrimSpace(o.RefreshToken) != ""}
}

// envProxy returns the HTTPS proxy of a process environment (what the CLI
// would use), nil for a direct connection. With CCG_EXTERNAL_EGRESS the
// environment has no proxy: the account egress controller forces the route.
func envProxy(env []string) func(*http.Request) (*url.URL, error) {
	invalid := func(*http.Request) (*url.URL, error) {
		// Never include a proxy URL: it may contain a password.
		return nil, fmt.Errorf("invalid management HTTPS proxy configuration")
	}
	parseProxy := func(raw string) (*url.URL, bool) {
		u, err := url.Parse(raw)
		if err != nil || u.Hostname() == "" || u.Opaque != "" || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") {
			return nil, false
		}
		switch u.Scheme {
		case "http", "https", "socks5", "socks5h":
		default:
			return nil, false
		}
		if port := u.Port(); port != "" {
			n, err := strconv.Atoi(port)
			if err != nil || n < 1 || n > 65535 {
				return nil, false
			}
		} else if strings.HasSuffix(u.Host, ":") {
			return nil, false
		}
		return u, true
	}
	var raw string
	for _, item := range env {
		k, v, _ := strings.Cut(item, "=")
		if strings.EqualFold(k, "HTTP_PROXY") && v != "" {
			// HTTP_PROXY is not used for these HTTPS calls, but a malformed
			// configured proxy must never silently result in direct egress.
			if _, ok := parseProxy(v); !ok {
				return invalid
			}
		}
		if strings.EqualFold(k, "ALL_PROXY") && v != "" {
			// This management transport has no verified ALL_PROXY semantics.
			return invalid
		}
		if strings.EqualFold(k, "HTTPS_PROXY") && v != "" {
			if raw != "" && raw != v {
				return invalid
			}
			raw = v
		}
	}
	if raw == "" {
		return nil
	}
	u, ok := parseProxy(raw)
	if !ok {
		return invalid
	}
	return http.ProxyURL(u)
}

// managementHTTPClient is only for non-model endpoints. It never follows a
// redirect (including same-origin redirects), disables transparent gzip so file
// bytes remain exact, and uses normal certificate/hostname verification.
func managementHTTPClient(env []string) (*http.Client, *http.Transport) {
	tr := &http.Transport{Proxy: envProxy(env), DisableCompression: true,
		TLSClientConfig:        &tls.Config{MinVersion: tls.VersionTLS12},
		MaxResponseHeaderBytes: 64 << 10, TLSHandshakeTimeout: 10 * time.Second,
		ResponseHeaderTimeout: usageTimeout}
	return &http.Client{Transport: tr, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}, tr
}

// usage serves GET /admin/usage. It does not hold the login lock: a usage
// query must not wait for (or block) an authorization in progress.
func (a *authManager) usage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		apiError(w, 405, "invalid_request_error", "Method not allowed")
		return
	}
	env := a.environment()
	stored := storedOAuthIn(env)
	token := stored.access
	if token == "" {
		apiError(w, 400, codeNotLoggedIn, "Claude Code is not signed in with a Claude account.")
		return
	}
	if refusedWith(env, token) {
		apiError(w, 400, codeTokenRevoked, "A model request was refused with the stored OAuth token and Claude Code could not renew it.")
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
	client, tr := managementHTTPClient(env)
	defer tr.CloseIdleConnections()
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
		answer := strings.ToLower(string(raw))
		expired := (stored.expiresAt > 0 && stored.expiresAt <= time.Now().UnixMilli()) || strings.Contains(answer, "expired")
		if expired && stored.refreshable && !strings.Contains(answer, "revoked") {
			apiError(w, 400, codeTokenExpired, "The stored OAuth access token expired; Claude Code renews it on its next model request: "+asciiSnippet(raw))
			return
		}
		apiError(w, 400, codeTokenRevoked, "Anthropic refused the stored OAuth token and it cannot be renewed: "+asciiSnippet(raw))
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

// refreshToken serves POST /admin/auth/refresh (CONTRACTS §49.21): Claude Code
// renews its own stored OAuth token. The CLI is started without a model
// request (the stream-json initialization of resource management) and renews
// a token that expired or expires within five minutes; a token further from
// its expiry is left alone. The gateway never calls the token endpoint itself
// (a second refresher would race the CLI's refresh-token rotation).
//
// 200 {"refreshed": bool, "expires_at": time}; 400 not_logged_in,
// token_revoked (no refresh token), auth_in_progress, refresh_failed.
func (a *authManager) refreshToken(ctx context.Context) (Object, error) {
	if a.pending() != nil {
		return nil, authFail(codeAuthInProgress, "An authorization is in progress.")
	}
	env := a.environment()
	stored := storedOAuthIn(env)
	if stored.access == "" {
		return nil, authFail(codeNotLoggedIn, "Claude Code is not signed in with a Claude account.")
	}
	if !stored.refreshable {
		return nil, authFail(codeTokenRevoked, "No refresh token is stored; authorize the account again.")
	}
	before, err := resourceAuthorizationSource(env)
	if err != nil || before.source != "stored_oauth" {
		return nil, authFail(codeRefreshFailed, "The stored Claude Code authorization could not be verified.")
	}
	// Version is left empty: the CLI may have been updated since start-up.
	runner := &Runner{CLI: a.cli, Work: a.work}
	after, err := runner.initializeResourceAuthorization(ctx, env, before)
	if err != nil {
		return nil, authFail(codeRefreshFailed, "Claude Code could not renew the stored OAuth token: "+err.Error())
	}
	a.recordSubscription(ctx)
	return Object{"refreshed": after.fingerprint != before.fingerprint, "expires_at": time.UnixMilli(int64(after.expiresAt)).UTC()}, nil
}

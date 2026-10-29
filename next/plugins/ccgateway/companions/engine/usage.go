package engine

import (
	"bytes"
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// GET /admin/usage (CONTRACTS §49 container interface): the subscription
// usage of the signed-in Claude account. The core cannot see the account's
// token nor the rate-limit headers of the CLI's own requests, so it asks the
// container (§44, CCGateway quota provider).
//
// The read is Claude Code's own /usage command (`claude -p /usage`). Claude
// Code asks the OAuth usage endpoint the way it does for its users: it renews
// an access token that expired or is about to, and after a 401 renews it and
// sends the read once more. It stores the endpoint's answer verbatim in its
// global config (cachedUsageUtilization, with the time it was fetched); that
// stored object is what this endpoint returns. Go neither sends nor reads the
// token for transport.
//
// 200: Anthropic's JSON object, verbatim (five_hour, seven_day,
// seven_day_sonnet, limits, ...). The core parses it.
// 400 not_logged_in: no OAuth token stored (signed out, or an API key runtime).
// 400 token_revoked: the authorization cannot be used without signing in
// again: a model request was already refused with this very token, or Claude
// Code dropped the stored login because Anthropic refused it and it could not
// be renewed.
// 502 upstream_error: no fresh answer otherwise (transport, non-200, the
// command failed).

const (
	codeNotLoggedIn   = "not_logged_in"
	codeTokenRevoked  = "token_revoked"
	codeUpstreamError = "upstream_error"

	// usageCommandTimeout bounds the /usage process: start-up, a token renewal
	// and the read with its one retry (Claude Code's own read timeout is 5 s).
	// The core gives the whole query 20 s.
	usageCommandTimeout = 15 * time.Second
	// usageSnapshotWindow is how long Claude Code answers /usage from its own
	// stored read without asking the endpoint again: a stored read that recent
	// is as fresh as the command's own answer.
	usageSnapshotWindow = time.Minute
	// usageOutputLimit bounds what is kept of the command's JSON result;
	// usageConfigLimit the global config read for the stored answer.
	usageOutputLimit = 256 << 10
	usageConfigLimit = 16 << 20
	// profileTimeout is the official profile read timeout, passed to the CLI
	// as --timeout-ms, so a stalled call fails the way Claude Code's own does.
	profileTimeout = 10 * time.Second
	// profileCLIMaxBytes is the profile read's body limit passed to the CLI.
	profileCLIMaxBytes = 1 << 20
	// managementHeaderTimeout bounds the Go management client's non-API
	// release check (cli_management.go); it is not a provider API call.
	managementHeaderTimeout = 20 * time.Second
	usageMaxBody            = 64 << 10
	maxCredentialsBytes     = 1 << 20
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

func credentialsPathIn(env []string) string {
	if value, present := environmentEntry(env, "CLAUDE_SECURESTORAGE_CONFIG_DIR"); present {
		if value != "" {
			return filepath.Join(value, ".credentials.json")
		}
		env = envWith(env, nil, "CLAUDE_CONFIG_DIR", "CLAUDE_SECURESTORAGE_CONFIG_DIR")
	}
	return filepath.Join(snapshotConfigDirectory(env), ".credentials.json")
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

// parseProxyURL parses one proxy URL of the shapes the management transport
// accepts. It never reports the URL itself: it may contain a password.
func parseProxyURL(raw string) (*url.URL, bool) {
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

// scanProxyEnv returns the single HTTPS proxy configured in the environment.
// invalid reports a configuration the management transport must refuse rather
// than silently use direct egress: a malformed proxy, conflicting HTTPS_PROXY
// values, or any ALL_PROXY.
func scanProxyEnv(env []string) (raw string, invalid bool) {
	for _, item := range env {
		k, v, _ := strings.Cut(item, "=")
		if strings.EqualFold(k, "HTTP_PROXY") && v != "" {
			// HTTP_PROXY is not used for these HTTPS calls, but a malformed
			// configured proxy must never silently result in direct egress.
			if _, ok := parseProxyURL(v); !ok {
				return "", true
			}
		}
		if strings.EqualFold(k, "ALL_PROXY") && v != "" {
			// This management transport has no verified ALL_PROXY semantics.
			return "", true
		}
		if strings.EqualFold(k, "HTTPS_PROXY") && v != "" {
			if raw != "" && raw != v {
				return "", true
			}
			raw = v
		}
	}
	return raw, false
}

// envProxy returns the HTTPS proxy of a process environment (what the CLI
// would use), nil for a direct connection. With CCG_EXTERNAL_EGRESS the
// environment has no proxy: the account egress controller forces the route.
func envProxy(env []string) func(*http.Request) (*url.URL, error) {
	invalid := func(*http.Request) (*url.URL, error) {
		// Never include a proxy URL: it may contain a password.
		return nil, fmt.Errorf("invalid management HTTPS proxy configuration")
	}
	raw, bad := scanProxyEnv(env)
	if bad {
		return invalid
	}
	if raw == "" {
		return nil
	}
	u, ok := parseProxyURL(raw)
	if !ok {
		return invalid
	}
	return http.ProxyURL(u)
}

// validManagementProxy reports whether the proxy environment a management CLI
// process will inherit fails closed: no conflicting, malformed or unsupported
// proxy configuration. The CLI performs the call, so Go validates the
// environment it hands over rather than building the transport itself.
func validManagementProxy(env []string) bool {
	raw, invalid := scanProxyEnv(env)
	if invalid {
		return false
	}
	if raw == "" {
		return true
	}
	_, ok := parseProxyURL(raw)
	return ok
}

// managementHTTPClient is only for non-model endpoints. It never follows a
// redirect (including same-origin redirects), disables transparent gzip so file
// bytes remain exact, and uses normal certificate/hostname verification.
func managementHTTPClient(env []string) (*http.Client, *http.Transport) {
	tr := &http.Transport{Proxy: envProxy(env), DisableCompression: true,
		TLSClientConfig:        &tls.Config{MinVersion: tls.VersionTLS12},
		MaxResponseHeaderBytes: 64 << 10, TLSHandshakeTimeout: 10 * time.Second,
		ResponseHeaderTimeout: managementHeaderTimeout}
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
	token := storedOAuthIn(env).access
	if token == "" {
		apiError(w, 400, codeNotLoggedIn, "Claude Code is not signed in with a Claude account.")
		return
	}
	if refusedWith(env, token) {
		apiError(w, 400, codeTokenRevoked, "A model request was refused with the stored OAuth token and Claude Code could not renew it.")
		return
	}
	// The CLI makes the call with this environment. A malformed or conflicting
	// proxy must never let the call silently go direct.
	if !validManagementProxy(env) {
		apiError(w, 502, codeUpstreamError, "The Anthropic usage API could not be reached.")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), usageCommandTimeout)
	defer cancel()
	started := time.Now()
	result, err := runUsageCommand(ctx, a.cli, a.work, env)
	if raw, ok := storedUsage(env, started); ok {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(raw)
		return
	}
	// Claude Code drops a stored login that Anthropic refused and that it
	// could not renew.
	if storedOAuthIn(env).access == "" {
		apiError(w, 400, codeTokenRevoked, "Anthropic refused the stored OAuth token and Claude Code could not renew it.")
		return
	}
	if err != nil {
		apiError(w, 502, codeUpstreamError, "Claude Code's /usage command failed: "+err.Error())
		return
	}
	apiError(w, 502, codeUpstreamError, "The Anthropic usage API could not be read: "+asciiSnippet([]byte(result)))
}

// usageCommandArgs runs /usage alone: no tools, MCP servers, hooks, claude.ai
// connectors, settings files or session transcript.
func usageCommandArgs() []string {
	return []string{"-p", "/usage", "--output-format", "json", "--tools", "", "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`,
		"--setting-sources", "", "--settings", `{"disableAllHooks":true,"disableClaudeAiConnectors":true}`, "--no-session-persistence", "--no-chrome"}
}

// runUsageCommand runs Claude Code's /usage and returns the text it printed.
// Claude Code counts the usage read as nonessential traffic, so this process
// alone runs without CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC; the telemetry
// switches stay on.
func runUsageCommand(ctx context.Context, cli, dir string, env []string) (string, error) {
	cmd := exec.CommandContext(ctx, cli, usageCommandArgs()...)
	cmd.Env = envWith(env, nil, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC")
	cmd.Dir, cmd.WaitDelay = dir, time.Second
	out := &limitedBuffer{limit: usageOutputLimit}
	cmd.Stdout = out
	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			return "", errors.New("timed out")
		}
		return "", errors.New("the process failed")
	}
	var answer struct {
		IsError bool   `json:"is_error"`
		Result  string `json:"result"`
	}
	if json.Unmarshal(out.Bytes(), &answer) != nil {
		return "", errors.New("the output is not a JSON result")
	}
	if answer.IsError {
		return "", errors.New(asciiSnippet([]byte(answer.Result)))
	}
	return answer.Result, nil
}

// storedUsage returns the usage answer Claude Code stored in its global
// config, when it belongs to the signed-in account and was fetched by this
// command (or recently enough that the command answered from it).
func storedUsage(env []string, started time.Time) ([]byte, bool) {
	f, err := os.Open(snapshotGlobalConfigPath(env))
	if err != nil {
		return nil, false
	}
	defer f.Close()
	raw, err := io.ReadAll(io.LimitReader(f, usageConfigLimit+1))
	if err != nil || len(raw) > usageConfigLimit {
		return nil, false
	}
	var config struct {
		Account *struct {
			UUID string `json:"accountUuid"`
		} `json:"oauthAccount"`
		Usage *struct {
			FetchedAtMs int64           `json:"fetchedAtMs"`
			AccountUUID string          `json:"accountUuid"`
			Utilization json.RawMessage `json:"utilization"`
		} `json:"cachedUsageUtilization"`
	}
	if json.Unmarshal(raw, &config) != nil || config.Usage == nil {
		return nil, false
	}
	u := config.Usage
	if u.AccountUUID != "" && (config.Account == nil || config.Account.UUID != u.AccountUUID) {
		return nil, false
	}
	fetched := time.UnixMilli(u.FetchedAtMs)
	if fetched.Before(started.Add(-usageSnapshotWindow)) || fetched.After(time.Now().Add(time.Minute)) {
		return nil, false
	}
	var obj map[string]json.RawMessage
	if json.Unmarshal(u.Utilization, &obj) != nil || obj == nil {
		return nil, false
	}
	var compact bytes.Buffer
	if json.Compact(&compact, u.Utilization) != nil || compact.Len() > usageMaxBody {
		return nil, false
	}
	return compact.Bytes(), true
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
	runner := &Runner{CLI: a.cli, Work: a.work}
	after, err := runner.initializeResourceAuthorization(ctx, env, before)
	if err != nil {
		return nil, authFail(codeRefreshFailed, "Claude Code could not renew the stored OAuth token: "+err.Error())
	}
	return Object{"refreshed": after.fingerprint != before.fingerprint, "expires_at": time.UnixMilli(int64(after.expiresAt)).UTC()}, nil
}

package engine

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

// resourceIdentityProbe holds one management operation's selected credential.
// It is never serialized, logged, or persisted.
type resourceIdentityProbe struct {
	issuer, epoch string
	local         *resources.Identity
	auth          *resourceAuthorization
}

type resourceAuthorization struct {
	header         http.Header
	method         string
	fingerprint    string
	config         string
	source         string
	sourceIdentity string
	expiresAt      float64
	refreshable    bool
}

type resourceAuthorizationKey struct{}
type resourceAuthorizationBinding struct{ auth *resourceAuthorization }

// withResourceAuthorization must wrap the broker context BEFORE identity().
// This pins the profile and subsequent resource IO to one verified credential.
func withResourceAuthorization(ctx context.Context) context.Context {
	return context.WithValue(ctx, resourceAuthorizationKey{}, &resourceAuthorizationBinding{})
}

func bindResourceAuthorization(ctx context.Context, auth *resourceAuthorization) {
	if binding, ok := ctx.Value(resourceAuthorizationKey{}).(*resourceAuthorizationBinding); ok {
		binding.auth = auth
	}
}

func resourceAuthorizationCandidate(env []string) (*resourceAuthorization, error) {
	auth, err := resourceAuthorizationSource(env)
	if err != nil {
		return nil, err
	}
	if auth.source == "stored_oauth" {
		pending, err := resourceOAuthRefreshPending(auth)
		if err != nil || pending || auth.expiresAt <= float64(time.Now().Add(30*time.Second).UnixMilli()) {
			return nil, fmt.Errorf("resource OAuth token is not ready after CLI verification; CLI refresh or reauthorization is required")
		}
	}
	return auth, nil
}

// errUnverifiedResourceSource is the single failure reply for a credential
// source this Worker cannot prove: missing, ambiguous, or unsupported.
var errUnverifiedResourceSource = errors.New("resource credential source is missing, ambiguous, or unsupported; CLI selection is unverified")

func resourceAuthorizationSource(env []string) (*resourceAuthorization, error) {
	sources, err := credentialSources(env)
	if err != nil {
		return nil, err
	}
	auth, token, refresh, err := readCredential(env, sources[0])
	if err != nil {
		return nil, err
	}
	auth.sourceIdentity, auth.fingerprint = resourceSourceIdentity(env, auth, token, refresh)
	return auth, nil
}

// credentialSources validates the environment and returns its single supported
// credential source. Any override the snapshot cannot reason about, a
// duplicate environment spelling, or settings-level injection is rejected:
// Go and the CLI must never pick different identities.
func credentialSources(env []string) ([]string, error) {
	if !resourceBackendSupported(env) {
		return nil, errUnverifiedResourceSource
	}
	// These may override auth/transport outside the snapshot's supported set.
	for _, key := range []string{"ANTHROPIC_CUSTOM_HEADERS", "CLAUDE_CODE_API_KEY_HELPER", "CLAUDE_CODE_API_KEY_HELPER_TTL_MS", "CLAUDE_CODE_MANAGED_SETTINGS", "CLAUDE_CODE_MANAGED_SETTINGS_FILE"} {
		if environmentValue(env, key) != "" {
			return nil, errUnverifiedResourceSource
		}
	}
	// Duplicate environment spellings must not cause Go and the CLI to select
	// different identities. This also rejects conflicting proxy definitions.
	seen := map[string]string{}
	for _, entry := range env {
		name, value, ok := strings.Cut(entry, "=")
		if !ok {
			continue
		}
		name = strings.ToUpper(name)
		if old, exists := seen[name]; exists && old != value {
			return nil, errUnverifiedResourceSource
		}
		seen[name] = value
	}
	snapshot, err := localAuthSnapshot(env)
	if err != nil {
		return nil, errUnverifiedResourceSource
	}
	// The snapshot reports presence, not every way CLI settings can override
	// process env. Reject settings-level env injection and opaque helpers too.
	config := snapshotConfigDirectory(env)
	for _, path := range []string{filepath.Join(config, "settings.json"), filepath.Join(config, "settings.local.json"), snapshotGlobalConfigPath(env)} {
		settings, err := readSnapshotObject(path)
		if err != nil {
			return nil, errUnverifiedResourceSource
		}
		for _, key := range []string{"apiKeyHelper", "env"} {
			if value, exists := settings[key]; exists && value != nil {
				return nil, errUnverifiedResourceSource
			}
		}
	}
	sources, _ := snapshot["credential_sources"].([]string)
	if len(sources) != 1 || snapshot["credential_source_unresolved"] != false {
		return nil, errUnverifiedResourceSource
	}
	return sources, nil
}

// readCredential builds the authorization for the single supported source. The
// raw token material is returned only so the caller can fingerprint it.
func readCredential(env []string, source string) (*resourceAuthorization, string, string, error) {
	auth := &resourceAuthorization{header: http.Header{}, config: snapshotConfigDirectory(env), source: source}
	var token, refresh string
	switch source {
	case "api_key_env":
		auth.method = "api_key"
		token = environmentValue(env, "ANTHROPIC_API_KEY")
		auth.header.Set("X-Api-Key", token)
	case "oauth_token_env":
		auth.method = "oauth_token"
		token = environmentValue(env, "CLAUDE_CODE_OAUTH_TOKEN")
	case "stored_oauth":
		// Only explicit file-backed managed storage is supported here. A CLI
		// keychain or helper cannot be inferred from a nearby JSON file.
		config := environmentValue(env, "CLAUDE_CONFIG_DIR")
		storage := environmentValue(env, "CLAUDE_SECURESTORAGE_CONFIG_DIR")
		if runtime.GOOS == "darwin" || config == "" || storage == "" || filepath.Clean(config) != filepath.Clean(storage) {
			return nil, "", "", errUnverifiedResourceSource
		}
		credentials, err := readSnapshotObject(credentialsPathIn(env))
		if err != nil {
			return nil, "", "", errUnverifiedResourceSource
		}
		oauth, _ := credentials["claudeAiOauth"].(map[string]any)
		expiry, ok := oauth["expiresAt"].(float64)
		if !ok {
			return nil, "", "", errUnverifiedResourceSource
		}
		auth.expiresAt = expiry
		token, refresh = str(oauth, "accessToken"), str(oauth, "refreshToken")
		auth.refreshable = refresh != ""
		auth.method = "claude.ai"
	default:
		return nil, "", "", errUnverifiedResourceSource
	}
	if token == "" || strings.TrimSpace(token) != token || strings.ContainsAny(token, " \t\r\n") || !validResourceHeader(token) {
		return nil, "", "", errUnverifiedResourceSource
	}
	if auth.method != "api_key" {
		// OAuth credentials are only sent to the first-party API origin.
		if base := environmentValue(env, "ANTHROPIC_BASE_URL"); base != "" {
			target, err := url.Parse(base)
			if err != nil || !firstPartyOrigin(target, strings.TrimRight(target.Path, "/")) {
				return nil, "", "", errUnverifiedResourceSource
			}
		}
		auth.header.Set("Authorization", "Bearer "+token)
		auth.header.Set("Anthropic-Beta", "oauth-2025-04-20")
	}
	return auth, token, refresh, nil
}

// resourceSourceIdentity fingerprints the environment the credential came from
// and the credential itself (source identity and full fingerprint).
func resourceSourceIdentity(env []string, auth *resourceAuthorization, token, refresh string) (string, string) {
	source := []string{auth.source, auth.method, filepath.Clean(auth.config), filepath.Clean(credentialsPathIn(env)), filepath.Clean(snapshotGlobalConfigPath(env))}
	for _, key := range []string{"CCG_RESOURCE_ISSUER_ID", "CCG_RESOURCE_ISSUER_GENERATION", "ANTHROPIC_BASE_URL", "HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy", "NO_PROXY", "no_proxy"} {
		source = append(source, key, environmentValue(env, key))
	}
	sourceIdentity := digest(source)
	return sourceIdentity, digest([]any{sourceIdentity, token, refresh, auth.expiresAt})
}

// auth status is a documented non-model CLI command. It verifies the method
// only; the single supported candidate and before/after snapshot checks are
// also required. Stored OAuth instead retains the native initialization process.
func (runner *Runner) selectResourceAuthorization(ctx context.Context, env []string) (*resourceAuthorization, error) {
	auth, err := resourceAuthorizationSource(env)
	if err != nil {
		return nil, err
	}
	if auth.source == "stored_oauth" {
		return runner.initializeResourceAuthorization(ctx, env, auth)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, runner.CLI, "auth", "status", "--json")
	cmd.Env, cmd.Dir = env, runner.Work
	cmd.WaitDelay = time.Second
	output := &resourceStatusOutput{}
	cmd.Stdout = output
	// CLI stderr can contain credential/helper details. Never expose it.
	if cmd.Run() != nil || ctx.Err() != nil {
		return nil, fmt.Errorf("resource credential selection could not be verified by CLI auth status")
	}
	after, err := resourceAuthorizationCandidate(env)
	if err != nil {
		return nil, err
	}
	if err := validateResourceAuthorizationTransition(auth, after); err != nil {
		return nil, err
	}
	if validateResourceCLISelection(output.Bytes(), after) != nil {
		return nil, fmt.Errorf("resource credential selection could not be verified by CLI auth status")
	}
	return after, nil
}

// verificationCLI is one short-lived CLI process whose only purpose is to
// verify (or refresh) a stored credential. frames carries the decoded stdout
// frames; done closes after the process exited and the scanner stopped.
type verificationCLI struct {
	input      io.WriteCloser
	output     *io.PipeReader
	writer     *io.PipeWriter
	cancel     context.CancelFunc
	frames     chan Object
	done       chan struct{}
	processErr error
	readErr    error
}

// startVerificationCLI starts the native initialization process. cancel is the
// caller's context canceller: a read failure cancels the whole verification,
// so the state machine observes ctx.Done with the stage it had reached.
func startVerificationCLI(ctx context.Context, cancel context.CancelFunc, cli string, env []string, dir string) (*verificationCLI, error) {
	cmd := exec.CommandContext(ctx, cli, interactiveCLIArgs()...)
	cmd.Env, cmd.Dir, cmd.WaitDelay = env, dir, time.Second
	input, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	output, writer := io.Pipe()
	cmd.Stdout = writer
	if err = cmd.Start(); err != nil {
		input.Close()
		output.Close()
		writer.Close()
		return nil, err
	}
	c := &verificationCLI{input: input, output: output, writer: writer, cancel: cancel, frames: make(chan Object), done: make(chan struct{})}
	drained := make(chan struct{})
	go func() {
		defer close(drained)
		scan := bufio.NewScanner(output)
		scan.Buffer(make([]byte, 4096), 1<<20)
		total := 0
		for scan.Scan() {
			total += len(scan.Bytes())
			frame, err := decodeObject(scan.Bytes())
			if err != nil || total > 1<<20 {
				c.readErr = fmt.Errorf("invalid CLI initialization output")
				cancel()
				output.CloseWithError(c.readErr)
				break
			}
			select {
			case c.frames <- frame:
			case <-ctx.Done():
			}
		}
		if scan.Err() != nil {
			c.readErr = fmt.Errorf("CLI initialization output unavailable")
			cancel()
			output.CloseWithError(c.readErr)
		}
	}()
	go func() {
		c.processErr = cmd.Wait()
		writer.Close()
		<-drained
		close(c.done)
	}()
	return c, nil
}

// stop tears the process down in the original defer order (last registered
// first): stdin, cancel, output, wait for the process, then the writer. The
// extra closes of the original nested defers are no-ops here.
func (c *verificationCLI) stop() {
	c.input.Close()
	c.cancel()
	c.output.Close()
	<-c.done
	c.writer.Close()
}

func (runner *Runner) initializeResourceAuthorization(ctx context.Context, env []string, before *resourceAuthorization) (*resourceAuthorization, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	// No version gate: the initialization below accepts only a successful
	// handshake from a claude.ai source and a stable or properly rotated
	// credential, whatever the Claude Code version (2026-10-22 user decision).
	failure := func() (*resourceAuthorization, error) {
		return nil, resourceInitializationFailure("process")
	}
	refreshing, err := resourceOAuthRefreshPending(before)
	if err != nil {
		return failure()
	}
	refreshing = refreshing || (before.refreshable && before.expiresAt <= float64(time.Now().Add(5*time.Minute).UnixMilli()))
	cli, err := startVerificationCLI(ctx, cancel, runner.CLI, env, runner.Work)
	if err != nil {
		return failure()
	}
	defer cli.stop()
	id := uuid()
	if json.NewEncoder(cli.input).Encode(Object{"type": "control_request", "request_id": id, "request": Object{"subtype": "initialize", "hooks": Object{}, "sdkMcpServers": []any{}, "supportedDialogKinds": []any{}, "promptSuggestions": false}}) != nil {
		return failure()
	}
	return awaitResourceInitialization(ctx, cli, before, env, id, refreshing)
}

// resourceInitializationFailure names the stage the initialization reached.
func resourceInitializationFailure(stage string) error {
	return fmt.Errorf("resource CLI initialization did not establish a ready, persistent credential (%s)", stage)
}

// awaitResourceInitialization drives the initialization state machine until the
// credential is ready and the process has exited. The stage name in the failure
// message is the last stage the machine reached.
func awaitResourceInitialization(ctx context.Context, cli *verificationCLI, before *resourceAuthorization, env []string, id string, refreshing bool) (*resourceAuthorization, error) {
	stage := "process"
	failure := func() (*resourceAuthorization, error) {
		return nil, resourceInitializationFailure(stage)
	}
	initialized, closing := false, false
	var ready *resourceAuthorization
	tick := time.NewTicker(25 * time.Millisecond)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return failure()
		case frame := <-cli.frames:
			stage = "protocol"
			switch str(frame, "type") {
			case "control_response":
				stage = "control response"
				response, _ := frame["response"].(map[string]any)
				metadata, _ := response["response"].(map[string]any)
				if initialized || str(response, "request_id") != id || str(response, "subtype") != "success" {
					return failure()
				}
				stage = "source"
				if validateResourceInitialization(metadata, before) != nil {
					return failure()
				}
				initialized, stage = true, "persistence"
			case "auth_status":
				stage = "authentication status"
				if str(frame, "error") != "" || frame["isAuthenticating"] != false {
					return failure()
				}
			case "system":
				stage = "system notification"
				if str(frame, "subtype") != "ui_invalidate" {
					return failure()
				}
			case "result":
				stage = "result"
				return failure()
			default:
				return failure()
			}
		case <-tick.C:
			pending, err := resourceOAuthRefreshPending(before)
			if err != nil {
				return failure()
			}
			refreshing = refreshing || pending
			if initialized && !closing && !pending {
				after, err := resourceAuthorizationCandidate(env)
				if err == nil {
					if validateResourceAuthorizationTransition(before, after) != nil {
						return failure()
					}
					if refreshing && after.fingerprint == before.fingerprint {
						continue
					}
					if cli.input.Close() != nil {
						return failure()
					}
					ready, closing = after, true
				}
			}
		case <-cli.done:
			stage = "exit"
			if !initialized || !closing || cli.processErr != nil || cli.readErr != nil || ctx.Err() != nil {
				return failure()
			}
			after, err := resourceAuthorizationCandidate(env)
			if err != nil || validateResourceAuthorizationTransition(before, after) != nil || after.fingerprint != ready.fingerprint || (refreshing && after.fingerprint == before.fingerprint) {
				return failure()
			}
			return after, nil
		}
	}
}

func resourceOAuthRefreshPending(auth *resourceAuthorization) (bool, error) {
	for _, name := range []string{".oauth_refresh.lock", ".oauth_refresh.lock.owner"} {
		_, err := os.Lstat(filepath.Join(auth.config, name))
		if err == nil {
			return true, nil
		}
		if !os.IsNotExist(err) {
			return false, fmt.Errorf("resource CLI refresh state is unavailable")
		}
	}
	return false, nil
}

func validateResourceInitialization(metadata Object, auth *resourceAuthorization) error {
	account, _ := metadata["account"].(map[string]any)
	if auth.source != "stored_oauth" || auth.method != "claude.ai" || !filepath.IsAbs(auth.config) || str(account, "apiProvider") != "firstParty" || filepath.Clean(str(metadata, "user_output_styles_dir")) != filepath.Join(auth.config, "output-styles") {
		return fmt.Errorf("CLI initialization identity source is unverified")
	}
	for key, allowed := range map[string]string{"apiKeySource": "none", "tokenSource": "claude.ai"} {
		if value, exists := account[key]; exists {
			text, ok := value.(string)
			if !ok || (text != "" && text != allowed) {
				return fmt.Errorf("CLI initialization identity source is unverified")
			}
		}
	}
	return nil
}

func validateResourceAuthorizationTransition(before, after *resourceAuthorization) error {
	if before.sourceIdentity == "" || before.sourceIdentity != after.sourceIdentity || before.source != after.source || before.method != after.method || before.config != after.config || (before.source != "stored_oauth" && before.fingerprint != after.fingerprint) {
		return fmt.Errorf("resource authorization changed during verification; retry with a stable CLI identity")
	}
	return nil
}

type resourceStatusOutput struct{ buffer bytes.Buffer }

func (b *resourceStatusOutput) Bytes() []byte { return b.buffer.Bytes() }
func (b *resourceStatusOutput) Write(p []byte) (int, error) {
	if b.buffer.Len()+len(p) > 64<<10 {
		return 0, fmt.Errorf("CLI authorization status exceeds limit")
	}
	return b.buffer.Write(p)
}

func validateResourceCLISelection(raw []byte, auth *resourceAuthorization) error {
	var status struct {
		LoggedIn        bool   `json:"loggedIn"`
		AuthMethod      string `json:"authMethod"`
		APIProvider     string `json:"apiProvider"`
		APIKeySource    string `json:"apiKeySource"`
		ConfigDirectory string `json:"configDirectory"`
	}
	if json.Unmarshal(raw, &status) != nil || !status.LoggedIn || status.AuthMethod != auth.method || status.APIProvider != "firstParty" || (auth.method == "api_key" && status.APIKeySource != "ANTHROPIC_API_KEY") || (auth.method != "api_key" && status.APIKeySource != "") || status.ConfigDirectory == "" || filepath.Clean(status.ConfigDirectory) != filepath.Clean(auth.config) {
		return fmt.Errorf("CLI authorization selection differs from management credential")
	}
	return nil
}

func (p *resourceIdentityProbe) classify(h http.Header) (bool, error) {
	bearer, key := h.Values("Authorization"), h.Values("X-Api-Key")
	if len(bearer) > 1 || len(key) > 1 || len(bearer)+len(key) != 1 {
		return false, fmt.Errorf("resource carrier authentication is missing or ambiguous")
	}
	if len(key) == 1 {
		if strings.TrimSpace(key[0]) == "" {
			return false, fmt.Errorf("resource carrier API key is empty")
		}
		if p.issuer == "" || p.epoch == "" {
			return false, errManagedResourceIssuerMissing
		}
		p.local = &resources.Identity{AuthType: "api_key", PrincipalID: digest([]string{"resource-api-issuer-v1", p.issuer})}
		return true, nil
	}
	if !strings.HasPrefix(bearer[0], "Bearer ") || strings.TrimSpace(strings.TrimPrefix(bearer[0], "Bearer ")) == "" {
		return false, fmt.Errorf("resource carrier OAuth authentication is unavailable")
	}
	for _, line := range h.Values("Anthropic-Beta") {
		for _, beta := range strings.Split(line, ",") {
			if strings.TrimSpace(beta) == "oauth-2025-04-20" {
				return false, nil
			}
		}
	}
	return false, fmt.Errorf("resource carrier is not native Anthropic OAuth")
}

func resourceBackendSupported(env []string) bool {
	for _, key := range []string{"CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CODE_USE_FOUNDRY", "CLAUDE_CODE_USE_ANTHROPIC_AWS", "CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD", "CLAUDE_CODE_USE_MANTLE", "CLAUDE_CODE_USE_GATEWAY"} {
		value := strings.ToLower(environmentValue(env, key))
		if value != "" && value != "0" && value != "false" {
			return false
		}
	}
	return true
}

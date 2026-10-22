package engine

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"slices"
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

func resourceAuthorizationSource(env []string) (*resourceAuthorization, error) {
	unverified := func() (*resourceAuthorization, error) {
		return nil, fmt.Errorf("resource credential source is missing, ambiguous, or unsupported; CLI selection is unverified")
	}
	if !resourceBackendSupported(env) {
		return unverified()
	}
	// These may override auth/transport outside the snapshot's supported set.
	for _, key := range []string{"ANTHROPIC_CUSTOM_HEADERS", "CLAUDE_CODE_API_KEY_HELPER", "CLAUDE_CODE_API_KEY_HELPER_TTL_MS", "CLAUDE_CODE_MANAGED_SETTINGS", "CLAUDE_CODE_MANAGED_SETTINGS_FILE"} {
		if resourceEnv(env, key) != "" {
			return unverified()
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
			return unverified()
		}
		seen[name] = value
	}
	snapshot, err := localAuthSnapshot(env)
	if err != nil {
		return unverified()
	}
	// The snapshot reports presence, not every way CLI settings can override
	// process env. Reject settings-level env injection and opaque helpers too.
	config := snapshotConfigDirectory(env)
	for _, path := range []string{filepath.Join(config, "settings.json"), filepath.Join(config, "settings.local.json"), snapshotGlobalConfigPath(env)} {
		settings, err := readSnapshotObject(path)
		if err != nil {
			return unverified()
		}
		for _, key := range []string{"apiKeyHelper", "env"} {
			if value, exists := settings[key]; exists && value != nil {
				return unverified()
			}
		}
	}
	sources, _ := snapshot["credential_sources"].([]string)
	if len(sources) != 1 || snapshot["credential_source_unresolved"] != false {
		return unverified()
	}
	auth := &resourceAuthorization{header: http.Header{}, config: snapshotConfigDirectory(env), source: sources[0]}
	var token, refresh string
	switch sources[0] {
	case "api_key_env":
		auth.method = "api_key"
		token = resourceEnv(env, "ANTHROPIC_API_KEY")
		auth.header.Set("X-Api-Key", token)
	case "oauth_token_env":
		auth.method = "oauth_token"
		token = resourceEnv(env, "CLAUDE_CODE_OAUTH_TOKEN")
	case "stored_oauth":
		// Only explicit file-backed managed storage is supported here. A CLI
		// keychain or helper cannot be inferred from a nearby JSON file.
		config := resourceEnv(env, "CLAUDE_CONFIG_DIR")
		storage := resourceEnv(env, "CLAUDE_SECURESTORAGE_CONFIG_DIR")
		if runtime.GOOS == "darwin" || config == "" || storage == "" || filepath.Clean(config) != filepath.Clean(storage) {
			return unverified()
		}
		credentials, e := readSnapshotObject(credentialsPathIn(env))
		if e != nil {
			return unverified()
		}
		oauth, _ := credentials["claudeAiOauth"].(map[string]any)
		expiry, ok := oauth["expiresAt"].(float64)
		if !ok {
			return unverified()
		}
		auth.expiresAt = expiry
		token, refresh = str(oauth, "accessToken"), str(oauth, "refreshToken")
		auth.refreshable = refresh != ""
		auth.method = "claude.ai"
	default:
		return unverified()
	}
	if token == "" || strings.TrimSpace(token) != token || strings.ContainsAny(token, " \t\r\n") || !validResourceHeader(token) {
		return unverified()
	}
	if auth.method != "api_key" {
		if base := resourceEnv(env, "ANTHROPIC_BASE_URL"); base != "" {
			target, err := url.Parse(base)
			if err != nil || target.Scheme != "https" || target.Hostname() != "api.anthropic.com" || (target.Port() != "" && target.Port() != "443") || target.User != nil || strings.TrimRight(target.Path, "/") != "" || target.RawPath != "" || target.RawQuery != "" || target.Fragment != "" || target.Opaque != "" {
				return unverified()
			}
		}
		auth.header.Set("Authorization", "Bearer "+token)
		auth.header.Set("Anthropic-Beta", "oauth-2025-04-20")
	}
	source := []string{auth.source, auth.method, filepath.Clean(auth.config), filepath.Clean(credentialsPathIn(env)), filepath.Clean(snapshotGlobalConfigPath(env))}
	for _, key := range []string{"CCG_RESOURCE_ISSUER_ID", "CCG_RESOURCE_ISSUER_GENERATION", "ANTHROPIC_BASE_URL", "HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy", "NO_PROXY", "no_proxy"} {
		source = append(source, key, resourceEnv(env, key))
	}
	auth.sourceIdentity = digest(source)
	auth.fingerprint = digest([]any{auth.sourceIdentity, token, refresh, auth.expiresAt})
	return auth, nil
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

func (runner *Runner) verifyResourceInitializationVersion(ctx context.Context, env []string) error {
	version := runner.Version
	if version == "" {
		ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()
		cmd := exec.CommandContext(ctx, runner.CLI, "--version")
		cmd.Env, cmd.Dir, cmd.WaitDelay = env, runner.Work, time.Second
		output := &resourceStatusOutput{}
		cmd.Stdout = output
		if cmd.Run() != nil || ctx.Err() != nil {
			return fmt.Errorf("resource CLI initialization version could not be verified")
		}
		var ok bool
		version, ok = strings.CutSuffix(strings.TrimSpace(string(output.Bytes())), " (Claude Code)")
		if !ok {
			return fmt.Errorf("resource CLI initialization version could not be verified")
		}
	}
	if !slices.Contains(verifiedResourceInitializationVersions, version) {
		return fmt.Errorf("resource stored OAuth requires verified Claude Code %s", strings.Join(verifiedResourceInitializationVersions, " or "))
	}
	return nil
}

// verifiedResourceInitializationVersions are the Claude Code versions whose
// stream-json initialization was verified to refresh and persist a stored
// OAuth credential without a prompt or model request
// (TestResourceManagementLinuxOfflineNetNone against each real CLI).
var verifiedResourceInitializationVersions = []string{"2.1.292", "2.1.296", "2.1.304"}

func (runner *Runner) initializeResourceAuthorization(ctx context.Context, env []string, before *resourceAuthorization) (*resourceAuthorization, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	if err := runner.verifyResourceInitializationVersion(ctx, env); err != nil {
		return nil, err
	}
	stage := "process"
	failure := func() (*resourceAuthorization, error) {
		return nil, fmt.Errorf("resource CLI initialization did not establish a ready, persistent credential (%s)", stage)
	}
	refreshing, err := resourceOAuthRefreshPending(before)
	if err != nil {
		return failure()
	}
	refreshing = refreshing || (before.refreshable && before.expiresAt <= float64(time.Now().Add(5*time.Minute).UnixMilli()))
	cmd := exec.CommandContext(ctx, runner.CLI, "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--tools", "", "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", `{"disableAllHooks":true}`, "--no-session-persistence", "--no-chrome", "--disable-slash-commands")
	cmd.Env, cmd.Dir, cmd.WaitDelay = env, runner.Work, time.Second
	input, err := cmd.StdinPipe()
	if err != nil {
		return failure()
	}
	defer input.Close()
	output, writer := io.Pipe()
	defer output.Close()
	defer writer.Close()
	cmd.Stdout = writer
	if cmd.Start() != nil {
		return failure()
	}
	frames := make(chan Object)
	done, drained := make(chan struct{}), make(chan struct{})
	var processErr, readErr error
	go func() {
		defer close(drained)
		scan := bufio.NewScanner(output)
		scan.Buffer(make([]byte, 4096), 1<<20)
		total := 0
		for scan.Scan() {
			total += len(scan.Bytes())
			frame, err := decodeObject(scan.Bytes())
			if err != nil || total > 1<<20 {
				readErr = fmt.Errorf("invalid CLI initialization output")
				cancel()
				output.CloseWithError(readErr)
				break
			}
			select {
			case frames <- frame:
			case <-ctx.Done():
			}
		}
		if scan.Err() != nil {
			readErr = fmt.Errorf("CLI initialization output unavailable")
			cancel()
			output.CloseWithError(readErr)
		}
	}()
	go func() {
		processErr = cmd.Wait()
		writer.Close()
		<-drained
		close(done)
	}()
	defer func() {
		input.Close()
		cancel()
		output.Close()
		<-done
	}()
	id := uuid()
	if json.NewEncoder(input).Encode(Object{"type": "control_request", "request_id": id, "request": Object{"subtype": "initialize", "hooks": Object{}, "sdkMcpServers": []any{}, "supportedDialogKinds": []any{}, "promptSuggestions": false}}) != nil {
		return failure()
	}
	initialized, closing := false, false
	var ready *resourceAuthorization
	tick := time.NewTicker(25 * time.Millisecond)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return failure()
		case frame := <-frames:
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
					if input.Close() != nil {
						return failure()
					}
					ready, closing = after, true
				}
			}
		case <-done:
			stage = "exit"
			if !initialized || !closing || processErr != nil || readErr != nil || ctx.Err() != nil {
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
		value := strings.ToLower(resourceEnv(env, key))
		if value != "" && value != "0" && value != "false" {
			return false
		}
	}
	return true
}

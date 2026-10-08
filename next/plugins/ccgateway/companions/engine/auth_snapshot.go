package engine

import (
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func environmentEntry(env []string, key string) (string, bool) {
	for i := len(env) - 1; i >= 0; i-- {
		k, v, ok := strings.Cut(env[i], "=")
		if ok && strings.EqualFold(k, key) {
			return v, true
		}
	}
	return "", false
}

func snapshotConfigDirectory(env []string) string {
	if value := environmentValue(env, "CLAUDE_CONFIG_DIR"); value != "" {
		return value
	}
	return filepath.Join(snapshotHomeDirectory(env), ".claude")
}

func snapshotGlobalConfigPath(env []string) string {
	if value := environmentValue(env, "CLAUDE_CONFIG_DIR"); value != "" {
		return filepath.Join(value, ".claude.json")
	}
	return filepath.Join(snapshotHomeDirectory(env), ".claude.json")
}

func snapshotHomeDirectory(env []string) string {
	home := environmentValue(env, "HOME")
	if home == "" {
		home = environmentValue(env, "USERPROFILE")
	}
	if home == "" {
		home, _ = os.UserHomeDir()
	}
	return home
}

func readSnapshotObject(path string) (Object, error) {
	f, err := os.Open(path)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()
	raw, err := io.ReadAll(io.LimitReader(f, maxCredentialsBytes+1))
	if err != nil {
		return nil, err
	}
	if len(raw) > maxCredentialsBytes {
		return nil, authFail(codeStatusUnavailable, "Local authorization metadata exceeds the size limit.")
	}
	var value Object
	if json.Unmarshal(raw, &value) != nil || value == nil {
		return nil, authFail(codeStatusUnavailable, "Local authorization metadata is invalid.")
	}
	return value, nil
}

// localAuthSnapshot never invokes the CLI or a credential helper. Presence is
// not a claim about the CLI's eventual credential selection or online validity.
func localAuthSnapshot(env []string) (Object, error) {
	result := Object{"healthy": true, "status_source": "local_snapshot", "online_verified": false, "selection_verified": false}
	sources := []string{}
	methods := []string{}
	seen := map[string]bool{}
	add := func(source, method string) {
		if seen[source] {
			return
		}
		seen[source] = true
		sources = append(sources, source)
		if method != "" {
			methods = append(methods, method)
		}
	}
	for _, item := range []struct{ key, source, method string }{
		{"ANTHROPIC_API_KEY", "api_key_env", "api_key"},
		{"ANTHROPIC_AUTH_TOKEN", "bearer_env", "unresolved"},
		{"CLAUDE_CODE_OAUTH_TOKEN", "oauth_token_env", "oauth_token"},
	} {
		if environmentValue(env, item.key) != "" {
			add(item.source, item.method)
		}
	}
	credentials, err := readSnapshotObject(credentialsPathIn(env))
	if err != nil {
		return nil, authFail(codeStatusUnavailable, "Local authorization metadata could not be read.")
	}
	oauth, _ := credentials["claudeAiOauth"].(map[string]any)
	if strings.TrimSpace(str(oauth, "accessToken")) != "" {
		add("stored_oauth", "claude.ai")
		if expiry, ok := oauth["expiresAt"].(float64); ok && expiry > 0 {
			result["access_token_expired"] = float64(time.Now().UnixMilli()) >= expiry
		}
	}
	present := len(sources) > 0
	unresolved := false
	for _, key := range []string{"CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR", "CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR", "CLAUDE_CODE_HOST_CREDS_FILE", "ANTHROPIC_IDENTITY_TOKEN", "ANTHROPIC_IDENTITY_TOKEN_FILE", "ANTHROPIC_PROFILE"} {
		if environmentValue(env, key) != "" {
			add("external_credential_source", "")
			unresolved = true
		}
	}
	config := snapshotConfigDirectory(env)
	for _, path := range []string{filepath.Join(config, "settings.json"), filepath.Join(config, "settings.local.json"), snapshotGlobalConfigPath(env)} {
		settings, e := readSnapshotObject(path)
		if e != nil {
			return nil, authFail(codeStatusUnavailable, "Local authorization settings could not be read.")
		}
		if str(settings, "apiKeyHelper") != "" {
			add("credential_helper_configured", "")
			unresolved = true
		}
		if str(settings, "primaryApiKey") != "" {
			add("managed_api_key", "api_key")
			present = true
		}
	}
	method := "none"
	if len(methods) == 1 && !unresolved {
		method = methods[0]
	} else if len(methods) > 1 || unresolved {
		method = "unresolved"
	}
	if !resourceBackendSupported(env) {
		method = "third_party"
		unresolved = true
	}
	result["logged_in"], result["credential_present"] = present, present
	result["auth_method"], result["credential_sources"], result["credential_source_unresolved"] = method, sources, unresolved || len(methods) > 1
	return result, nil
}

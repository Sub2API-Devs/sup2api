package engine

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

// usagePeerAccount is the account the peer's global config is signed in as.
const usagePeerAccount = "acct-usage"

// usagePeer is a Claude Code answering `claude -p /usage`. It records its
// arguments and environment (CCG_TEST_USAGE_LOG), stores CCG_TEST_USAGE_STORE
// as Claude Code's own usage read in its global config (fetched
// CCG_TEST_USAGE_AGE_MS ago, for CCG_TEST_USAGE_ACCOUNT), drops the stored
// login like Claude Code does after a refused, unrenewable token
// (CCG_TEST_USAGE_DROP_LOGIN), then prints its JSON result and exits with
// CCG_TEST_USAGE_EXIT.
func usagePeer() {
	if log := os.Getenv("CCG_TEST_USAGE_LOG"); log != "" {
		record, _ := json.Marshal(map[string]any{"args": os.Args[1:], "env": os.Environ()})
		f, _ := os.OpenFile(log, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
		fmt.Fprintln(f, string(record))
		f.Close()
	}
	dir := os.Getenv("CLAUDE_CONFIG_DIR")
	if store := os.Getenv("CCG_TEST_USAGE_STORE"); store != "" {
		age, _ := strconv.ParseInt(os.Getenv("CCG_TEST_USAGE_AGE_MS"), 10, 64)
		account, ok := os.LookupEnv("CCG_TEST_USAGE_ACCOUNT")
		if !ok {
			account = usagePeerAccount
		}
		config := map[string]any{
			"oauthAccount": map[string]any{"accountUuid": usagePeerAccount},
			"cachedUsageUtilization": map[string]any{"fetchedAtMs": time.Now().UnixMilli() - age, "accountUuid": account,
				"utilization": json.RawMessage(store)},
		}
		raw, _ := json.MarshalIndent(config, "", "  ")
		_ = os.WriteFile(filepath.Join(dir, ".claude.json"), raw, 0600)
	}
	if os.Getenv("CCG_TEST_USAGE_DROP_LOGIN") != "" {
		_ = os.WriteFile(filepath.Join(dir, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"","refreshToken":"","expiresAt":0}}`), 0600)
	}
	result := os.Getenv("CCG_TEST_USAGE_RESULT")
	if result == "" {
		result = "You are currently using your subscription to power your Claude Code usage"
	}
	out, _ := json.Marshal(map[string]any{"type": "result", "subtype": "success", "is_error": os.Getenv("CCG_TEST_USAGE_IS_ERROR") != "", "result": result, "local_command": "usage"})
	fmt.Println(string(out))
	code, _ := strconv.Atoi(os.Getenv("CCG_TEST_USAGE_EXIT"))
	os.Exit(code)
}

// usageEnv points Claude Code's config and credential storage at a temp dir
// and returns the credentials path; it also clears proxy variables so the
// usage process's environment is valid.
func usageEnv(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("CLAUDE_SECURESTORAGE_CONFIG_DIR", dir)
	t.Setenv("CLAUDE_CONFIG_DIR", dir)
	for _, k := range []string{"HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy", "CCG_EXTERNAL_EGRESS"} {
		t.Setenv(k, "")
	}
	return filepath.Join(dir, ".credentials.json")
}

// usageAuth is an authManager whose CLI is the usage peer.
func usageAuth(t *testing.T, values map[string]string) (*authManager, string) {
	t.Helper()
	exe, err := lifecycleTestExecutable()
	if err != nil {
		t.Fatal(err)
	}
	log := filepath.Join(t.TempDir(), "usage.jsonl")
	base := map[string]string{"CCG_TEST_USAGE_PEER": "1", "CCG_TEST_USAGE_LOG": log}
	for key, value := range values {
		base[key] = value
	}
	env := envWith(os.Environ(), base, "ANTHROPIC_BASE_URL", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN")
	return &authManager{key: "admin-key", cli: exe, work: t.TempDir(), env: env}, log
}

// usageRuns returns the processes the peer recorded.
func usageRuns(t *testing.T, log string) []struct {
	Args []string `json:"args"`
	Env  []string `json:"env"`
} {
	t.Helper()
	var runs []struct {
		Args []string `json:"args"`
		Env  []string `json:"env"`
	}
	raw, err := os.ReadFile(log)
	if os.IsNotExist(err) {
		return runs
	}
	if err != nil {
		t.Fatal(err)
	}
	for _, line := range strings.Split(strings.TrimSpace(string(raw)), "\n") {
		var run struct {
			Args []string `json:"args"`
			Env  []string `json:"env"`
		}
		if err := json.Unmarshal([]byte(line), &run); err != nil {
			t.Fatal(err)
		}
		runs = append(runs, run)
	}
	return runs
}

func writeUsageLogin(t *testing.T, path, creds string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(creds), 0o600); err != nil {
		t.Fatal(err)
	}
}

const usageLogin = `{"claudeAiOauth":{"accessToken":"sk-ant-oat01-test","refreshToken":"r","expiresAt":1}}`

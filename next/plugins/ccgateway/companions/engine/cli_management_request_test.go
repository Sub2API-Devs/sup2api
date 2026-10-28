package engine

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// managementPeer is the fake `claude ccgateway-mgmt` used by the tests. It is
// the test binary itself (TestMain dispatches on CCG_TEST_MGMT_PEER), so it
// needs no shell and behaves the same on every platform. It records its
// arguments and body, and answers with the configured exit code, meta and
// body. CCG_TEST_MGMT_SLEEP_MS lets a test run into the context deadline.
func managementPeer() {
	args := os.Args[1:]
	if len(args) > 0 && args[0] == cliManagementSubcommand {
		args = args[1:]
	}
	var path, method, body, output, meta string
	var headers []string
	timeoutMS, maxBytes := 0, int64(-1)
	for i := 0; i < len(args); i++ {
		if i+1 >= len(args) || !strings.HasPrefix(args[i], "--") {
			os.Exit(cliManagementExitRejected)
		}
		value := args[i+1]
		i++
		switch args[i-1] {
		case "--path":
			path = value
		case "--method":
			method = value
		case "--header":
			headers = append(headers, value)
		case "--body":
			body = value
		case "--output":
			output = value
		case "--meta":
			meta = value
		case "--timeout-ms":
			timeoutMS, _ = strconv.Atoi(value)
		case "--max-bytes":
			n, err := strconv.ParseInt(value, 10, 64)
			if err != nil {
				os.Exit(cliManagementExitRejected)
			}
			maxBytes = n
		default:
			os.Exit(cliManagementExitRejected)
		}
	}
	if path == "" || output == "" || meta == "" || maxBytes < 0 {
		os.Exit(cliManagementExitRejected)
	}
	record := struct {
		Path      string   `json:"path"`
		Method    string   `json:"method"`
		Headers   []string `json:"headers"`
		Body      string   `json:"body,omitempty"`
		BodyBytes []byte   `json:"body_bytes,omitempty"`
		TimeoutMS int      `json:"timeout_ms"`
		MaxBytes  int64    `json:"max_bytes"`
	}{Path: path, Method: method, Headers: headers, Body: body, TimeoutMS: timeoutMS, MaxBytes: maxBytes}
	if body != "" {
		if raw, err := os.ReadFile(body); err == nil {
			record.BodyBytes = raw
		}
	}
	if log := os.Getenv("CCG_TEST_MGMT_ARGS"); log != "" {
		raw, _ := json.Marshal(record)
		appendManagementLine(log, string(raw))
	}
	if log := os.Getenv("CCG_TEST_MGMT_ENV"); log != "" {
		appendManagementLine(log, strings.Join(os.Environ(), "\n"))
	}
	if ready := os.Getenv("CCG_TEST_MGMT_READY"); ready != "" {
		_ = os.WriteFile(ready, []byte("ready"), 0600)
	}
	if ms := managementEnvInt("CCG_TEST_MGMT_SLEEP_MS", 0); ms > 0 {
		time.Sleep(time.Duration(ms) * time.Millisecond)
	}
	if frameCode := os.Getenv("CCG_TEST_MGMT_ERROR_FRAME"); frameCode != "" {
		fmt.Fprintf(os.Stderr, "CCG_REQUEST_ERROR {\"protocol\":\"ccgateway.request.error.v1\",\"source\":\"input\",\"status\":400,\"error\":{\"type\":\"invalid_request_error\",\"code\":%q,\"message\":\"fixture\"}}\n", frameCode)
	}
	if code := managementEnvInt("CCG_TEST_MGMT_EXIT", 0); code != 0 {
		os.Exit(code)
	}
	headerValues := os.Getenv("CCG_TEST_MGMT_META_HEADERS")
	if headerValues == "" {
		headerValues = `{"Content-Type":"application/json"}`
	}
	status := managementEnvInt("CCG_TEST_MGMT_STATUS", http.StatusOK)
	metaJSON := fmt.Sprintf(`{"status":%d,"headers":%s}`, status, headerValues)
	if os.Getenv("CCG_TEST_MGMT_OMIT_STATUS") != "" {
		metaJSON = fmt.Sprintf(`{"headers":%s}`, headerValues)
	}
	_ = os.WriteFile(meta, []byte(metaJSON), 0600)
	if os.Getenv("CCG_TEST_MGMT_SKIP_OUTPUT") != "" {
		return
	}
	payload := []byte(os.Getenv("CCG_TEST_MGMT_BODY"))
	if file := os.Getenv("CCG_TEST_MGMT_BODY_FILE"); file != "" {
		payload, _ = os.ReadFile(file)
	}
	if n := managementEnvInt("CCG_TEST_MGMT_BODY_BYTES", 0); n > 0 {
		payload = bytes.Repeat([]byte("x"), n)
	}
	_ = os.WriteFile(output, payload, 0600)
}

func appendManagementLine(path, line string) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return
	}
	fmt.Fprintln(f, line)
	f.Close()
}

func managementEnvInt(name string, fallback int) int {
	n, err := strconv.Atoi(os.Getenv(name))
	if err != nil {
		return fallback
	}
	return n
}

// managementTestRunner is a Runner whose CLI is the fake management peer.
func managementTestRunner(t *testing.T, values map[string]string) (*Runner, string) {
	t.Helper()
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	argsLog := filepath.Join(t.TempDir(), "args.jsonl")
	base := map[string]string{"CCG_TEST_MGMT_PEER": "1", "CCG_TEST_MGMT_ARGS": argsLog}
	for key, value := range values {
		base[key] = value
	}
	// The test process may itself run under a gateway (ANTHROPIC_BASE_URL) or
	// carry credentials; a management call under test must see neither.
	env := envWith(os.Environ(), base, "ANTHROPIC_BASE_URL", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_CUSTOM_HEADERS", "CLAUDE_CODE_OAUTH_TOKEN")
	return &Runner{CLI: exe, Work: t.TempDir(), Env: env, SupportsManagement: true}, argsLog
}

// managementRecords returns the calls the peer saw.
func managementRecords(t *testing.T, path string) []map[string]any {
	t.Helper()
	raw, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil
	}
	require.NoError(t, err)
	var records []map[string]any
	for _, line := range strings.Split(strings.TrimSpace(string(raw)), "\n") {
		if line == "" {
			continue
		}
		var record map[string]any
		require.NoError(t, json.Unmarshal([]byte(line), &record))
		records = append(records, record)
	}
	return records
}

// managementBody decodes the body the peer read from --body.
func managementBody(t *testing.T, record map[string]any) []byte {
	t.Helper()
	encoded, _ := record["body_bytes"].(string)
	raw, err := base64.StdEncoding.DecodeString(encoded)
	require.NoError(t, err)
	return raw
}

func TestCLIManagementRequestAnswer(t *testing.T) {
	runner, argsLog := managementTestRunner(t, map[string]string{
		"CCG_TEST_MGMT_STATUS":       "429",
		"CCG_TEST_MGMT_META_HEADERS": `{"Content-Type":"application/json","Retry-After":["3"]}`,
		"CCG_TEST_MGMT_BODY":         `{"error":"rate limited"}`,
	})
	payload := filepath.Join(t.TempDir(), "upload.bin")
	require.NoError(t, os.WriteFile(payload, []byte("\x00upload\xff"), 0600))
	header := http.Header{}
	header.Set("Content-Type", "multipart/form-data; boundary=fixture")
	header.Set("Anthropic-Version", "2023-06-01")
	header.Add("Anthropic-Beta", "skills-2025-10-02")
	ctx, cancel := context.WithTimeout(t.Context(), 15*time.Second)
	defer cancel()
	answer, err := cliManagementRequest(ctx, runner, runner.Env, cliManagementCall{
		Method: "POST", Path: "/v1/files?beta=true", Header: header, Body: payload, Timeout: 30 * time.Second, MaxBytes: 4096,
	})
	require.NoError(t, err)
	defer answer.Close()
	body, err := readLimitedFile(answer.body, 1024)
	require.NoError(t, err)
	assert.Equal(t, `{"error":"rate limited"}`, string(body))
	assert.Equal(t, 429, answer.status)
	assert.Equal(t, "3", answer.header.Get("Retry-After"))
	assert.Equal(t, int64(len(body)), answer.size)

	records := managementRecords(t, argsLog)
	require.Len(t, records, 1)
	assert.Equal(t, "/v1/files?beta=true", records[0]["path"])
	assert.Equal(t, "POST", records[0]["method"])
	assert.Equal(t, []byte("\x00upload\xff"), managementBody(t, records[0]))
	assert.Equal(t, payload, records[0]["body"])
	headers := fmt.Sprint(records[0]["headers"])
	assert.Contains(t, headers, "Content-Type:multipart/form-data; boundary=fixture")
	assert.Contains(t, headers, "Anthropic-Version:2023-06-01")
	assert.Contains(t, headers, "Anthropic-Beta:skills-2025-10-02")
	assert.NotContains(t, headers, "authorization")
	assert.EqualValues(t, 4096, records[0]["max_bytes"], "the caller's response limit reaches the CLI")
	// The call's own timeout is bounded by the context deadline.
	assert.LessOrEqual(t, records[0]["timeout_ms"], float64(30*time.Second/time.Millisecond))
	assert.Greater(t, records[0]["timeout_ms"], float64(0))
	// The temporary answer directory is removed with the answer.
	require.NoError(t, answer.Close())
	_, err = os.Stat(filepath.Dir(answer.body))
	assert.True(t, os.IsNotExist(err), "answer directory leaked")
}

func TestCLIManagementRequestExitCodes(t *testing.T) {
	for _, tc := range []struct {
		name string
		exit int
		want error
	}{
		{"rejected", cliManagementExitRejected, errCLIManagementRejected},
		{"transport", cliManagementExitTransport, errCLIManagementTransport},
		{"crash", 9, errCLIManagementTransport},
		{"too-large", cliManagementExitTooLarge, errCLIManagementTooLarge},
		{"not-logged-in", cliManagementExitNotLoggedIn, errCLIManagementNotLoggedIn},
	} {
		t.Run(tc.name, func(t *testing.T) {
			runner, argsLog := managementTestRunner(t, map[string]string{"CCG_TEST_MGMT_EXIT": strconv.Itoa(tc.exit)})
			answer, err := cliManagementRequest(context.Background(), runner, runner.Env, cliManagementCall{Method: "GET", Path: "/api/oauth/usage"})
			assert.ErrorIs(t, err, tc.want)
			assert.Nil(t, answer)
			assert.Len(t, managementRecords(t, argsLog), 1, "the peer must have rejected, not Go")
		})
	}
}

// The error frame's code is authoritative for a condition Go knows, whichever
// exit code carried it; otherwise the exit code decides.
func TestCLIManagementRequestFrameCodes(t *testing.T) {
	for _, tc := range []struct {
		name  string
		exit  int
		frame string
		want  error
	}{
		{"too-large-frame", cliManagementExitTooLarge, "response_too_large", errCLIManagementTooLarge},
		{"too-large-frame-over-rejected-exit", cliManagementExitRejected, "response_too_large", errCLIManagementTooLarge},
		{"not-logged-in-frame", cliManagementExitNotLoggedIn, "not_logged_in", errCLIManagementNotLoggedIn},
		{"not-logged-in-frame-over-transport-exit", cliManagementExitTransport, "not_logged_in", errCLIManagementNotLoggedIn},
		{"legacy-credentials-frame", cliManagementExitRejected, "cli_credentials_unavailable", errCLIManagementNotLoggedIn},
		{"unknown-frame-falls-back", cliManagementExitTransport, "cli_transport_error", errCLIManagementTransport},
	} {
		t.Run(tc.name, func(t *testing.T) {
			runner, _ := managementTestRunner(t, map[string]string{
				"CCG_TEST_MGMT_EXIT":        strconv.Itoa(tc.exit),
				"CCG_TEST_MGMT_ERROR_FRAME": tc.frame,
			})
			_, err := cliManagementRequest(context.Background(), runner, runner.Env, cliManagementCall{Method: "GET", Path: "/api/oauth/usage", MaxBytes: 1024})
			assert.ErrorIs(t, err, tc.want)
		})
	}
}

func TestCLIManagementRequestTimeout(t *testing.T) {
	runner, _ := managementTestRunner(t, map[string]string{"CCG_TEST_MGMT_SLEEP_MS": "5000"})
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()
	started := time.Now()
	answer, err := cliManagementRequest(ctx, runner, runner.Env, cliManagementCall{Method: "GET", Path: "/api/oauth/usage"})
	assert.ErrorIs(t, err, errCLIManagementTransport)
	assert.Nil(t, answer)
	assert.Less(t, time.Since(started), 3*time.Second, "context deadline did not end the process")
}

func TestCLIManagementRequestRejectsCredentials(t *testing.T) {
	for _, name := range []string{"Authorization", "X-Api-Key", "Proxy-Authorization", "Cookie"} {
		t.Run(name, func(t *testing.T) {
			runner, argsLog := managementTestRunner(t, nil)
			header := http.Header{}
			header.Set(name, "secret")
			answer, err := cliManagementRequest(context.Background(), runner, runner.Env, cliManagementCall{Method: "GET", Path: "/v1/files", Header: header})
			assert.ErrorIs(t, err, errCLIManagementRejected)
			assert.Nil(t, answer)
			assert.Empty(t, managementRecords(t, argsLog), "the CLI must not start with a credential header")
		})
	}
}

func TestCLIManagementRequestRejectsInvalidMeta(t *testing.T) {
	for _, tc := range []struct {
		name, status, headers string
	}{
		{"missing-status", "", `{"Content-Type":"application/json"}`},
		{"status-range", "700", `{}`},
		{"header-object", "200", `{"Content-Type":{"nested":true}}`},
		{"header-control", "200", `{"Content-Type":"bad\r\nvalue"}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			values := map[string]string{"CCG_TEST_MGMT_STATUS": tc.status, "CCG_TEST_MGMT_META_HEADERS": tc.headers, "CCG_TEST_MGMT_BODY": "answer"}
			if tc.status == "" {
				values["CCG_TEST_MGMT_OMIT_STATUS"] = "1"
			}
			runner, _ := managementTestRunner(t, values)
			answer, err := cliManagementRequest(context.Background(), runner, runner.Env, cliManagementCall{Method: "GET", Path: "/v1/files"})
			assert.ErrorIs(t, err, errCLIManagementTransport)
			assert.Nil(t, answer)
		})
	}
}

func TestCLIManagementRequestRejectsOversizeMeta(t *testing.T) {
	runner, _ := managementTestRunner(t, map[string]string{
		"CCG_TEST_MGMT_META_HEADERS": `{"X-Pad":"` + strings.Repeat("x", cliManagementMetaLimit) + `"}`,
	})
	_, err := cliManagementRequest(context.Background(), runner, runner.Env, cliManagementCall{Method: "GET", Path: "/v1/files"})
	assert.ErrorIs(t, err, errCLIManagementTransport)
}

func TestCLIManagementRequestMissingOutputFile(t *testing.T) {
	runner, _ := managementTestRunner(t, map[string]string{"CCG_TEST_MGMT_SKIP_OUTPUT": "1"})
	answer, err := cliManagementRequest(context.Background(), runner, runner.Env, cliManagementCall{Method: "GET", Path: "/v1/files"})
	assert.ErrorIs(t, err, errCLIManagementTransport)
	assert.Nil(t, answer)
}

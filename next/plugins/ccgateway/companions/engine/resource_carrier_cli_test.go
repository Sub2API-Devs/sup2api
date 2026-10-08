package engine

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"
)

func resourceTestRunner(t *testing.T, handler http.HandlerFunc) *Runner {
	t.Helper()
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	up := httptest.NewServer(handler)
	t.Cleanup(up.Close)
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if v := os.Getenv(key); v != "" {
			base = append(base, key+"="+v)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-resource-fixture", "ANTHROPIC_BASE_URL": up.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1"})
	return &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
}

func TestRealCLIResourceCarrierNeverGenerates(t *testing.T) {
	for _, method := range []string{"GET", "POST", "DELETE"} {
		t.Run(method, func(t *testing.T) {
			var calls atomic.Int32
			payload := []byte("\x00binary\xffresource")
			requestBody := []byte("--fixture\r\nContent-Disposition: form-data; name=\"file\"; filename=\"hello.txt\"\r\n\r\nhello\r\n--fixture--\r\n")
			runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				if r.URL.Path != "/v1/files" || r.Method != method {
					t.Errorf("unexpected paid model or path: %s %s", r.Method, r.URL.Path)
				}
				if r.Header.Get("X-Api-Key") != "dummy-resource-fixture" {
					t.Error("CLI credential not preserved")
				}
				if r.Header.Get("Anthropic-Version") != "fixture-version-to-preserve" {
					t.Error("explicit resource API version replaced by CLI default")
				}
				if r.Header.Get("Anthropic-Beta") != "files-api-2025-04-14" {
					t.Error("resource product beta changed or inherited CLI inference beta", r.Header.Get("Anthropic-Beta"))
				}
				body, _ := io.ReadAll(r.Body)
				if method == "POST" && !bytes.Equal(body, requestBody) {
					t.Error("multipart body changed")
				}
				if method != "POST" && len(body) != 0 {
					t.Error("CLI model body leaked")
				}
				w.Header().Set("Content-Type", "application/octet-stream")
				w.Header().Set("Request-Id", "request_resource_test")
				w.Header().Set("Set-Cookie", "do-not-copy")
				w.Write(payload)
			})
			incoming := httptest.NewRequest("GET", resourcePrefix+"/v1/files", nil)
			incoming.Header.Set("Anthropic-Version", "fixture-version-to-preserve")
			incoming.Header.Set("Anthropic-Beta", "files-api-2025-04-14")
			route, err := parseResourceRoute(incoming)
			if err != nil {
				t.Fatal(err)
			}
			// Method is overwritten here so all carrier methods share the same
			// raw header assertion; route method validation is tested separately.
			route.method = method
			op := &resourceExchange{route: route, dir: t.TempDir(), limit: 1 << 20, budget: &resourceSpoolBudget{limit: 2 << 20}}
			if method == "POST" {
				var err error
				op.input, err = spoolResource(context.Background(), op.dir, io.NopCloser(bytes.NewReader(requestBody)), int64(len(requestBody)), op.limit, op.budget)
				if err != nil {
					t.Fatal(err)
				}
				defer op.input.Close()
				op.route.contentType = "multipart/form-data; boundary=fixture"
			}
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()
			resp, err := runner.runResource(ctx, op)
			if err != nil {
				t.Fatal(err)
			}
			defer resp.body.Close()
			got, _ := io.ReadAll(resp.body)
			if !bytes.Equal(got, payload) || resp.status != 200 || calls.Load() != 1 {
				t.Fatal("resource response mismatch", resp.status, calls.Load())
			}
			if resp.header.Get("Set-Cookie") != "" || resp.header.Get("Request-Id") == "" {
				t.Fatal("unsafe or missing response headers")
			}
		})
	}
}

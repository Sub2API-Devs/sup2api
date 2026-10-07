package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"
)

// Direct CLI research only. EXTRA_BODY is not a production mapping mechanism.
// All IDs/credentials are synthetic and the only upstream is loopback; no file,
// code execution container, skill or remote MCP resource is actually created.
func TestRealCLIResourceSurfaceTransportProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	scenarios := map[string]Object{
		"file-reference":   {"messages": []any{Object{"role": "user", "content": []any{Object{"type": "document", "source": Object{"type": "file", "file_id": "file_fixture_no_real_resource"}}}}}},
		"skills-container": {"container": Object{"skills": []any{Object{"type": "anthropic", "skill_id": "pptx", "version": "latest"}}}, "tools": []any{Object{"type": "code_execution_20260521", "name": "code_execution"}}},
		"ptc":              {"container": "container_fixture_no_real_resource", "tools": []any{Object{"type": "code_execution_20260521", "name": "code_execution"}, Object{"name": "query_fixture", "input_schema": Object{"type": "object"}, "allowed_callers": []any{"code_execution_20260120"}}}},
		"mcp-connector":    {"mcp_servers": []any{Object{"type": "url", "name": "fixture", "url": "https://example.invalid/mcp", "authorization_token": "dummy-mcp-fixture"}}, "tools": []any{Object{"type": "mcp_toolset", "mcp_server_name": "fixture"}}},
	}
	for name, extra := range scenarios {
		for _, auth := range []string{"apikey", "oauth"} {
			t.Run(name+"/"+auth, func(t *testing.T) {
				root := t.TempDir()
				calls := make(chan Object, 4)
				server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/messages") {
						t.Errorf("unexpected resource endpoint %s", r.URL.Path)
						http.Error(w, "no resources", 400)
						return
					}
					raw, _ := io.ReadAll(r.Body)
					body, _ := decodeObject(raw)
					calls <- body
					if auth == "oauth" && r.Header.Get("Authorization") != "Bearer dummy-resource-oauth" {
						t.Error("mock OAuth missing")
					}
					generationFixtureEvents(w, str(body, "model"), "end_turn", "RESOURCE_TRANSPORT_ONLY", false)
				}))
				defer server.Close()
				ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
				defer cancel()
				cmd := exec.CommandContext(ctx, cli, "-p", "transport fixture", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--tools", "", "--max-turns", "1", "--setting-sources", "", "--settings", `{"disableAllHooks":true}`)
				cmd.Dir = root
				raw, _ := json.Marshal(extra)
				overrides := map[string]string{"CLAUDE_CODE_EXTRA_BODY": string(raw)}
				if auth == "oauth" {
					overrides["ANTHROPIC_API_KEY"] = ""
					overrides["CLAUDE_CODE_OAUTH_TOKEN"] = "dummy-resource-oauth"
				}
				cmd.Env = envWith(messageProbeEnv(root, server.URL), overrides)
				out, err := cmd.CombinedOutput()
				if err != nil {
					t.Fatalf("CLI %s exit=%v output-bytes=%d", version, err, len(out))
				}
				if len(calls) != 1 {
					t.Fatalf("expected one isolated model call, got %d", len(calls))
				}
				wire := <-calls
				for field, want := range extra {
					expected, _ := json.Marshal(want)
					normalized, _ := decodePlannedValue(expected)
					if digest(wire[field]) != digest(normalized) {
						t.Fatalf("resource field %s transformed", field)
					}
				}
				t.Log(fmt.Sprintf("CLI=%s auth=%s fields-preserved; no resource or scope authorization proved", version, auth))
			})
		}
	}
}

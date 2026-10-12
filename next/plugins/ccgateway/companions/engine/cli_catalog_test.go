package engine

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestCLICatalogSerializesAndKeepsRequestSnapshot(t *testing.T) {
	var version atomic.Value
	version.Store("2.1.292")
	var calls atomic.Int32
	manager := newCLICatalog(func(context.Context) (string, error) { return version.Load().(string), nil }, func(_ context.Context, v string) (nativeCatalogue, error) {
		calls.Add(1)
		return nativeCatalogue{"Read": {{Name: "Read", Schema: Object{"version": v}}}}, nil
	})
	var tasks sync.WaitGroup
	for range 12 {
		tasks.Add(1)
		go func() {
			defer tasks.Done()
			if err := manager.sync(context.Background()); err != nil {
				t.Error(err)
			}
		}()
	}
	tasks.Wait()
	old, err := manager.snapshot()
	if err != nil || calls.Load() != 1 || old.version != "2.1.292" {
		t.Fatalf("first snapshot: %v, calls=%d", err, calls.Load())
	}
	version.Store("2.1.296")
	if err := manager.sync(context.Background()); err != nil {
		t.Fatal(err)
	}
	current, err := manager.snapshot()
	if err != nil || current == old || current.version != "2.1.296" || old.version != "2.1.292" || calls.Load() != 2 {
		t.Fatalf("snapshot switch: %v", err)
	}
	if str(old.tools["Read"][0].Schema, "version") != "2.1.292" {
		t.Fatal("old request mutated")
	}
}

func TestCLICatalogRejectsChangedVersionAndRetriesFailure(t *testing.T) {
	version := "2.1.292"
	fail := false
	change := false
	manager := newCLICatalog(func(context.Context) (string, error) { return version, nil }, func(context.Context, string) (nativeCatalogue, error) {
		if fail {
			return nil, errors.New("fixture failure")
		}
		if change {
			version = "2.1.297"
		}
		return nativeCatalogue{"Read": {{Name: "Read", Schema: Object{"type": "object"}}}}, nil
	})
	if err := manager.sync(context.Background()); err != nil {
		t.Fatal(err)
	}
	old, _ := manager.snapshot()
	version, fail = "2.1.296", true
	if manager.sync(context.Background()) == nil {
		t.Fatal("accepted failed capture")
	}
	if _, err := manager.snapshot(); err == nil {
		t.Fatal("old directory used for new CLI")
	}
	if manager.current.Load() != old {
		t.Fatal("lost old immutable snapshot")
	}
	fail, change = false, true
	if manager.sync(context.Background()) == nil {
		t.Fatal("published changing CLI")
	}
	change = false
	if err := manager.sync(context.Background()); err != nil {
		t.Fatal(err)
	}
	current, err := manager.snapshot()
	if err != nil || current.version != "2.1.297" {
		t.Fatalf("retry: %v", err)
	}
}

func TestCLICatalogDoesNotTreatVersionErrorAsUnchanged(t *testing.T) {
	fail := false
	manager := newCLICatalog(func(context.Context) (string, error) {
		if fail {
			return "", errors.New("version failed")
		}
		return "2.1.296", nil
	}, func(context.Context, string) (nativeCatalogue, error) {
		return nativeCatalogue{"Read": {{Name: "Read"}}}, nil
	})
	if err := manager.sync(context.Background()); err != nil {
		t.Fatal(err)
	}
	fail = true
	if manager.sync(context.Background()) == nil {
		t.Fatal("version error hidden")
	}
	if _, err := manager.snapshot(); err == nil {
		t.Fatal("unverified runtime remained ready")
	}
}

func TestRealCLIDynamicCatalog(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	runner := &Runner{CLI: cli, Work: t.TempDir(), Version: version}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	tools, err := runner.captureToolCatalog(ctx, version)
	if err != nil {
		t.Fatal(err)
	}
	if len(tools["Read"]) == 0 || len(tools["Agent"]) == 0 {
		t.Fatal("missing baseline tools")
	}
	snapshot := &cliSnapshot{version: version, tools: tools}
	request := &Request{Tools: []Tool{tools["Read"][0]}, cliSnapshot: snapshot}
	matchNativeTools(request, version)
	if !request.Native["Read"] || request.wireName("Read") != "Read" {
		t.Fatal("fresh catalog did not preserve native Read")
	}
	client := tools["Read"][0]
	client.Description += " client-only description"
	request.Tools = []Tool{client}
	matchNativeTools(request, version)
	if request.Native["Read"] || request.wireName("Read") != "mcp__ccgateway__Read" {
		t.Fatal("description-only difference did not use MCP")
	}
	reply := sdkMCPReply(Object{"server_name": "ccgateway", "message": Object{"id": 1, "method": "tools/list"}}, request)
	listed := reply["result"].(Object)["tools"].([]Object)
	if len(listed) != 1 || str(listed[0], "description") != client.Description || digest(listed[0]["inputSchema"]) != digest(client.Schema) {
		t.Fatal("MCP fallback changed the client definition")
	}
	t.Logf("CLI %s dynamically captured %d tool names", version, len(tools))
}

func TestRealCLIRuntimeDynamicToolHandoff(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	root := t.TempDir()
	var calls atomic.Int32
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			_, _ = io.WriteString(w, `{"input_tokens":1}`)
			return
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Error(err)
			return
		}
		request, err := decodeObject(body)
		if err != nil {
			t.Error(err)
			return
		}
		tools, _ := request["tools"].([]any)
		if len(tools) != 1 {
			t.Errorf("unexpected tools: %d", len(tools))
			return
		}
		tool, _ := tools[0].(map[string]any)
		name := str(tool, "name")
		if name != "Read" && name != "mcp__ccgateway__Read" {
			t.Errorf("unexpected name: %s", name)
			return
		}
		calls.Add(1)
		writeSurfaceFixture(w, str(request, "model"), []Object{{"type": "tool_use", "id": "toolu_catalog_handoff", "name": name, "input": Object{"file_path": filepath.Join(root, "client-only.txt")}}})
	}))
	defer provider.Close()
	server := httptest.NewUnstartedServer(nil)
	base := "http://" + server.Listener.Addr().String()
	runtime, err := NewRuntime(Options{CLI: cli, DataDir: root, Key: "fixture", AdminKey: "fixture-admin", InternalBaseURL: base, Env: nativeProbeEnv(root, provider.URL)})
	if err != nil {
		t.Fatal(err)
	}
	server.Config.Handler = runtime
	server.Start()
	defer server.Close()
	defer runtime.Close()
	deadline := time.Now().Add(time.Minute)
	for !runtime.CLIReady() && time.Now().Before(deadline) {
		time.Sleep(20 * time.Millisecond)
	}
	snapshot, err := runtime.catalog.snapshot()
	if err != nil {
		t.Fatalf("runtime catalog: %v %+v", err, runtime.catalog.status())
	}
	if err := runtime.gateway.Runner.verifyCLICatalog(context.Background(), snapshot.version, snapshot.tools); err != nil {
		t.Fatal(err)
	}
	tool := snapshot.tools["Read"][0]
	for _, change := range []bool{false, true} {
		if change {
			tool.Description += " client-specific suffix"
		}
		input, _ := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 128, "tools": []Tool{tool}, "messages": []Object{{"role": "user", "content": "Read the client file"}}})
		request, _ := http.NewRequest("POST", server.URL+"/v1/messages", strings.NewReader(string(input)))
		request.Header.Set("X-Api-Key", "fixture")
		response, err := http.DefaultClient.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(response.Body)
		response.Body.Close()
		if response.StatusCode != 200 {
			t.Fatalf("handoff: %d %s", response.StatusCode, body)
		}
		answer, err := decodeObject(body)
		if err != nil {
			t.Fatal(err)
		}
		blocks, _ := answer["content"].([]any)
		found := false
		for _, block := range blocks {
			b, _ := block.(map[string]any)
			if str(b, "type") == "tool_use" {
				found = str(b, "name") == "Read" && str(b, "id") == "toolu_catalog_handoff"
			}
		}
		if !found {
			t.Fatal("client tool identity was not restored")
		}
	}
	if calls.Load() != 2 {
		t.Fatalf("extra model calls: %d", calls.Load())
	}
}

func TestCLICatalogRetainsDescriptionVariants(t *testing.T) {
	probe := &cliCatalogProbe{tools: map[string]Tool{}}
	for _, description := range []string{"original", "changed", "original "} {
		raw, _ := json.Marshal(Object{"model": "fixture", "tools": []Tool{{Name: "Read", Description: description, Schema: Object{"type": "object"}}}})
		out := httptest.NewRecorder()
		probe.capture(out, httptest.NewRequest("POST", "/v1/messages", strings.NewReader(string(raw))))
		if out.Code != 200 {
			t.Fatalf("capture failed: %s", out.Body.String())
		}
	}
	if len(probe.tools) != 3 {
		t.Fatalf("description variants collapsed: %d", len(probe.tools))
	}
}

func TestCLICatalogWaitingCanBeCanceled(t *testing.T) {
	manager := newCLICatalog(nil, nil)
	manager.lock <- struct{}{}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := manager.sync(ctx); !errors.Is(err, context.Canceled) {
		t.Fatal(err)
	}
	<-manager.lock
}

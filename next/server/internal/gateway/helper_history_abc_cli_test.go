package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usage"
)

// This opt-in integration runs the actual compiled Worker HTTP server and CLI.
// Only provider Messages responses and the core account directory are fixtures;
// private envelopes, hidden transcripts, encryption, commits and usage receipts
// run through the product implementations. No production credentials are read.
func TestHelperHistoryABCRealDBCLI(t *testing.T) {
	runHelperHistoryABCRealDBCLI(t, false)
}
func TestHelperHistoryABCInlineRealDBCLI(t *testing.T) {
	runHelperHistoryABCRealDBCLI(t, true)
}

type abcHelperOptions struct {
	UpgradePayload       bool
	TailReminder         bool
	SessionContext       bool
	StrictToolReferences bool
	ThinkingEstimates    bool
}

func runHelperHistoryABCRealDBCLI(t *testing.T, inline bool, options ...abcHelperOptions) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated Worker integration")
	}
	db := testutil.DB(t)
	_, source, _, _ := runtime.Caller(0)
	workerDir := filepath.Clean(filepath.Join(filepath.Dir(source), "..", "..", "..", "plugins", "ccgateway", "companions", "worker"))
	binary := filepath.Join(t.TempDir(), "fixture-worker")
	if runtime.GOOS == "windows" {
		binary += ".exe"
	}
	build := exec.Command("go", "build", "-o", binary, "./cmd/worker")
	build.Dir = workerDir
	if override := os.Getenv("CCG_ABC_WORKER_BINARY"); override != "" {
		binary = override
	} else if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build Worker: %v %s", err, out)
	}
	cipher, err := secret.New(bytes.Repeat([]byte{0x51}, 32))
	if err != nil {
		t.Fatal(err)
	}
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			var option abcHelperOptions
			if len(options) > 0 {
				option = options[0]
			}
			mixedVersion := option.UpgradePayload
			legacyCapability := mixedVersion
			policy := json.RawMessage(`{}`)
			if option.TailReminder {
				policy = json.RawMessage(`{"schema_version":1,"attachment_source":"gateway"}`)
			}
			ctx := context.Background()
			e, _, _ := resourceTestEnv(t)
			var userID, groupID int64
			if err := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES($1,'fixture') RETURNING id`, fmt.Sprintf("abc-%v@example.invalid", stream)).Scan(&userID); err != nil {
				t.Fatal(err)
			}
			if err := db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES($1) RETURNING id`, fmt.Sprintf("abc-%v", stream)).Scan(&groupID); err != nil {
				t.Fatal(err)
			}
			e.auth.keys[testKey].UserID = userID
			e.auth.keys[testKey].Group.ID = groupID
			e.accounts.groups[groupID] = append([]int64(nil), e.accounts.groups[testGroup]...)
			for _, a := range e.accounts.accounts {
				a.Credentials = json.RawMessage(`{"api_key":"worker-fixture"}`)
			}
			model := "claude-opus-5-5"
			price := *e.pricer.rules[testModel]
			price.Model = model
			e.pricer.rules[model] = &price
			durable := helperhistory.New(db, cipher, helperhistory.Options{})
			e.gw.d.HelperHistory = durable
			e.gw.d.EnableHelperHistory = true
			provider := &abcProvider{t: t, budget: `{"total":20000,"type":"tokens"}`, inline: inline, tailReminder: option.TailReminder, sessionContext: option.SessionContext, strictToolReferences: option.StrictToolReferences}
			provider.thinkingEstimates = option.ThinkingEstimates
			upstream := httptest.NewServer(provider)
			defer upstream.Close()
			root := t.TempDir()
			worker := startABCWorker(t, binary, cli, root, filepath.Join(root, "cache-1"), upstream.URL, option.SessionContext)
			defer func() { worker.stop() }()
			target, _ := url.Parse(worker.endpoint)
			bridge := httputil.NewSingleHostReverseProxy(target)
			originalDirector := bridge.Director
			var bridgeMu sync.Mutex
			bridgeDiagnostic := ""
			bridge.ModifyResponse = func(resp *http.Response) error {
				raw, err := io.ReadAll(resp.Body)
				resp.Body.Close()
				resp.Body = io.NopCloser(bytes.NewReader(raw))
				bridgeMu.Lock()
				defer bridgeMu.Unlock()
				if err != nil {
					bridgeDiagnostic = err.Error()
					return err
				}
				envelope, decodeErr := wire.DecodeResponse(raw)
				if decodeErr != nil {
					bridgeDiagnostic = fmt.Sprintf("outer=%d type=%s response=%s", resp.StatusCode, resp.Header.Get("Content-Type"), raw)
					return nil
				}
				bridgeDiagnostic = fmt.Sprintf("inner=%d failure=%s auth_type=%s body=%s", envelope.StatusCode, envelope.Failure, envelope.Identity.AuthType, envelope.Body)
				return nil
			}
			bridge.Director = func(r *http.Request) {
				originalDirector(r)
				r.Header.Set("X-CCGateway-Request-Policy", string(policy))
				r.Header.Set("X-Api-Key", "worker-fixture")
			}
			httpBridge := httptest.NewServer(bridge)
			defer httpBridge.Close()
			e.plat.base = httpBridge.URL
			e.gw.helperRequirement = func(ctx context.Context, _ int64, req *http.Request) (string, error) {
				probe := req.Clone(ctx)
				probe.URL, _ = url.Parse(httpBridge.URL + wire.RequirementPath)
				res, err := http.DefaultClient.Do(probe)
				if err != nil {
					return "", err
				}
				defer res.Body.Close()
				if res.StatusCode != http.StatusOK {
					return "", fmt.Errorf("actual Worker requirement status %d", res.StatusCode)
				}
				raw, err := io.ReadAll(io.LimitReader(res.Body, 4097))
				if err != nil {
					return "", err
				}
				out, err := wire.DecodeRequirement(raw)
				return out.Decision, err
			}
			e.gw.helperRuntime = func(ctx context.Context, id int64, actual string) (helperRuntimeInfo, error) {
				caps, identity, err := worker.facts(ctx)
				if err != nil {
					return helperRuntimeInfo{}, err
				}
				// Use the running Worker's actual declaration, CLI and issuer.
				ns, err := helperRuntimeNamespace(caps, actual, policy)
				if legacyCapability {
					caps.HelperHistoryPayloadVersions = nil
				}
				return helperRuntimeInfo{Namespace: ns, Binding: core.ResourceBinding{AccountID: id, PrincipalID: identity.PrincipalID, Generation: identity.Generation}, PayloadVersions: caps.HelperHistoryPayloadVersions}, err
			}
			firstUser := map[string]any{"role": "user", "content": fmt.Sprintf("public weather fixture %v", stream)}
			request := map[string]any{"model": model, "thinking": map[string]any{"type": "adaptive"}, "max_tokens": 128, "stream": stream, "output_config": map[string]any{"task_budget": map[string]any{"type": "tokens", "total": 20000}}, "messages": []any{firstUser}, "tools": []any{map[string]any{"name": "weather", "defer_loading": true, "input_schema": map[string]any{"type": "object", "properties": map[string]any{}}}}}
			initial := []any{firstUser}
			if inline {
				initial = append(initial, abcInlineAddition("spare", "9007199254740993"))
				request["messages"] = initial
			}
			expectRefusal := false
			publicRequestNumber := 0
			post := func() json.RawMessage {
				t.Helper()
				publicRequestNumber++
				provider.mu.Lock()
				_, provider.expectBudget = request["output_config"]
				provider.mu.Unlock()
				beta := "task-budgets-2026-03-13"
				if inline {
					beta += ",inline-tools-2026-09-15"
				}
				r := e.do("/v1/messages", request, map[string]string{"anthropic-beta": beta})
				if r.status != 200 {
					bridgeMu.Lock()
					detail := bridgeDiagnostic
					bridgeMu.Unlock()
					t.Fatalf("ABC HTTP %d: %s; Worker %s", r.status, r.body, detail)
				}
				if bytes.Contains(r.body, []byte("PRIVATE_ABC")) || bytes.Contains(r.body, []byte("attempt_id")) {
					t.Fatal("private history exposed")
				}
				if t.Failed() {
					t.FailNow()
				}
				raw := r.body
				if stream {
					events, err := resourceResponseEvents(raw, true)
					if err != nil {
						t.Fatal(err)
					}
					var frames [][]byte
					for _, ev := range events {
						frames = append(frames, ev.data)
					}
					if option.ThinkingEstimates {
						expectedThinking := 1
						if publicRequestNumber == 1 {
							expectedThinking = 0
						}
						verifyABCThinkingProgress(t, frames, expectedThinking)
					}
					raw, err = credits.MessageFromEvents(frames)
					if err != nil {
						t.Fatal(err)
					}
				}
				var message struct {
					Content    json.RawMessage `json:"content"`
					StopReason string          `json:"stop_reason"`
				}
				if json.Unmarshal(raw, &message) != nil || len(message.Content) == 0 {
					t.Fatal("missing public content")
				}
				if expectRefusal && message.StopReason != "refusal" {
					t.Fatal("provider refusal was changed")
				}
				if option.ThinkingEstimates && bytes.Contains(message.Content, []byte("estimated_tokens")) {
					t.Fatal("display estimate entered public history")
				}
				return message.Content
			}
			one := post()
			if !bytes.Contains(one, []byte("external_weather")) {
				t.Fatal("first external client tool lost")
			}
			publicResult := "PUBLIC_WEATHER_RESULT"
			if option.SessionContext {
				publicResult += "\t"
			}
			continuation := append(append([]any(nil), initial...), map[string]any{"role": "assistant", "content": one}, map[string]any{"role": "user", "content": []any{map[string]any{"type": "tool_result", "tool_use_id": "external_weather", "content": publicResult}}})
			beforeWithdrawal := append([]any(nil), continuation...)
			if inline {
				continuation = append(continuation, map[string]any{"role": "system", "content": []any{map[string]any{"type": "tool_removal", "tool": map[string]any{"type": "tool_reference", "name": "weather"}}}})
			}
			request["messages"] = continuation
			var legacyRecord core.HelperHistoryRecord
			owner := core.ResourceOwner{UserID: userID, GroupID: groupID}
			if mixedVersion {
				chain := abcStoredChain(t, durable, owner, request)
				if len(chain.Records) != 1 || abcPayloadVersion(t, chain.Records[0].Payload) != 1 {
					t.Fatal("first receipt is not a persisted v1 payload")
				}
				legacyRecord = chain.Records[0]
				legacyRecord.Payload = append([]byte(nil), legacyRecord.Payload...)
				legacyCapability = false
			}
			two := post()
			// Ordinary no-budget round still joins the known immutable receipt chain.
			delete(request, "output_config")
			ordinary := append(append([]any(nil), continuation...), map[string]any{"role": "assistant", "content": two}, map[string]any{"role": "user", "content": "ordinary public follow-up"})
			request["messages"] = ordinary
			var mixedPrefixes []string
			if mixedVersion {
				chain := abcStoredChain(t, durable, owner, request)
				verifyABCMixedChain(t, chain, legacyRecord)
				encoded, _ := json.Marshal(request)
				_, mixedPrefixes, _ = publicHelperPrefixes(encoded)
			}
			three := post()
			worker.stop()
			worker = startABCWorker(t, binary, cli, root, filepath.Join(root, "cache-2"), upstream.URL, option.SessionContext)
			target, _ = url.Parse(worker.endpoint)
			bridge.Director = func(r *http.Request) {
				r.URL.Scheme = target.Scheme
				r.URL.Host = target.Host
				r.Header.Set("X-CCGateway-Request-Policy", string(policy))
				r.Header.Set("X-Api-Key", "worker-fixture")
			}
			// A new store instance plus new native cache must restore from PostgreSQL.
			durable = helperhistory.New(db, cipher, helperhistory.Options{})
			e.gw.d.HelperHistory = durable
			request["messages"] = append(append([]any(nil), ordinary...), map[string]any{"role": "assistant", "content": three}, map[string]any{"role": "user", "content": "cold public follow-up"})
			post()
			request["messages"] = continuation
			request["output_config"] = map[string]any{"task_budget": map[string]any{"type": "tokens", "total": 20000}}
			expectRefusal = option.ThinkingEstimates
			post()
			wantRequests, wantCalls := 5, 6
			if inline {
				request["messages"] = beforeWithdrawal
				post()
				request["messages"] = append(append([]any(nil), continuation...), map[string]any{"role": "assistant", "content": two}, map[string]any{"role": "user", "content": "readd schema"}, abcInlineAddition("weather", "9007199254740995"))
				post()
				wantRequests, wantCalls = 7, 8
			}
			pending, err := durable.PendingUsage(ctx, 64)
			if err != nil || len(pending) != wantRequests {
				t.Fatalf("durable usage count %d: %v", len(pending), err)
			}
			var sumIn, sumOut, sumCache1h int64
			var account int64
			consumer := usage.New(db, nil, nil, nil, usage.Options{})
			for _, item := range pending {
				if !item.Record.Success || item.Record.Attempts != 1 || item.Record.AccountID == nil {
					t.Fatalf("invalid frozen usage %+v", item.Record)
				}
				if account == 0 {
					account = *item.Record.AccountID
				}
				if *item.Record.AccountID != account {
					t.Fatal("chain changed account")
				}
				sumIn += item.Record.Tokens.Input
				sumOut += item.Record.Tokens.Output
				sumCache1h += item.Record.Tokens.CacheCreation1h
				// Replaying the same frozen outbox item cannot create a second charge row.
				for range 2 {
					if err := consumer.PersistHelperUsage(ctx, item.Record, item.FrozenEnvelope, item.Digest); err != nil {
						t.Fatal(err)
					}
				}
			}
			if err := consumer.DrainHelperHistoryUsage(ctx, durable); err != nil {
				t.Fatal(err)
			}
			remain, err := durable.PendingUsage(ctx, 64)
			if err != nil || len(remain) != 0 {
				t.Fatal("outbox not acknowledged", err)
			}
			provider.mu.Lock()
			calls := provider.calls
			if option.SessionContext && provider.embeddedContexts == 0 {
				t.Error("real CLI never embedded a session context into the public tool result")
			}
			provider.mu.Unlock()
			wantIn, wantOut, wantCache1h := int64(wantCalls*20), int64(wantCalls*8), int64(0)
			if option.TailReminder {
				wantIn += 4
				wantOut += 83
				wantCache1h = 1647
			}
			if calls != wantCalls || sumIn != wantIn || sumOut != wantOut || sumCache1h != wantCache1h {
				t.Fatalf("calls=%d actual cumulative usage %d/%d cache1h=%d (expected %d/%d cache1h=%d)", calls, sumIn, sumOut, sumCache1h, wantIn, wantOut, wantCache1h)
			}
			var rows, receipts int
			if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM usage_logs WHERE user_id=$1`, userID).Scan(&rows); err != nil {
				t.Fatal(err)
			}
			if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM provider_helper_usage_receipts p JOIN usage_logs u USING(request_id) WHERE u.user_id=$1`, userID).Scan(&receipts); err != nil {
				t.Fatal(err)
			}
			if rows != wantRequests || receipts != wantRequests {
				t.Fatalf("usage replay rows=%d receipts=%d", rows, receipts)
			}
			if mixedVersion {
				found, err := durable.Lookup(ctx, owner, mixedPrefixes)
				if err != nil || found.State != core.HelperHistoryKnownReady {
					t.Fatalf("mixed receipt reload: %v state=%s", err, found.State)
				}
				verifyABCMixedChain(t, found.Chain, legacyRecord)
			}
		})
	}
}

type abcWorker struct {
	endpoint string
	cmd      *exec.Cmd
	done     chan error
	once     sync.Once
}

func (w *abcWorker) stop() { w.once.Do(func() { _ = w.cmd.Process.Kill(); <-w.done }) }
func startABCWorker(t *testing.T, binary, cli, root, cache, provider string, sessionContext ...bool) *abcWorker {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	address := listener.Addr().String()
	listener.Close()
	env := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if v := os.Getenv(key); v != "" {
			env = append(env, key+"="+v)
		}
	}
	values := map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "SECURESTORAGE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-abc-fixture", "ANTHROPIC_BASE_URL": provider, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1", "ENABLE_TOOL_SEARCH": "true", "CCG_API_KEY": "worker-fixture", "CCG_ADMIN_KEY": "admin-fixture", "CCG_DATA_DIR": filepath.Join(root, "data"), "CACHE_DIR": cache, "WORKER_CLI_PATH": cli, "CCG_BIND": address, "CCG_RESOURCE_ISSUER_ID": "abc-fixture", "CCG_RESOURCE_ISSUER_GENERATION": "one", "REQUEST_TIMEOUT": "40s"}
	if len(sessionContext) > 0 && sessionContext[0] {
		values["ANTHROPIC_API_KEY"] = ""
		values["CLAUDE_CODE_OAUTH_TOKEN"] = "dummy-abc-session-context"
		values["CLAUDE_CODE_USER_EMAIL"] = "fixture@example.invalid"
		if err := os.MkdirAll(values["CLAUDE_CONFIG_DIR"], 0700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(values["CLAUDE_CONFIG_DIR"], ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"fixture@example.invalid","accountUuid":"fixture-account","organizationUuid":"fixture-org"}}`), 0600); err != nil {
			t.Fatal(err)
		}
	}
	for k, v := range values {
		env = append(env, k+"="+v)
	}
	cmd := exec.Command(binary)
	cmd.Env = env
	var diagnostic bytes.Buffer
	cmd.Stdout = &diagnostic
	cmd.Stderr = &diagnostic
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	w := &abcWorker{endpoint: "http://" + address, cmd: cmd, done: make(chan error, 1)}
	go func() { w.done <- cmd.Wait() }()
	deadline := time.Now().Add(20 * time.Second)
	for time.Now().Before(deadline) {
		res, err := (&http.Client{Timeout: time.Second}).Get(w.endpoint + "/health")
		if err == nil {
			io.Copy(io.Discard, res.Body)
			res.Body.Close()
			if res.StatusCode == 200 {
				return w
			}
		}
		select {
		case err := <-w.done:
			t.Fatalf("Worker exited %v %s", err, diagnostic.String())
		default:
		}
		time.Sleep(50 * time.Millisecond)
	}
	w.stop()
	t.Fatalf("Worker did not become healthy: %s", diagnostic.String())
	return nil
}
func (w *abcWorker) facts(ctx context.Context) (features.RuntimeCapabilities, resources.Identity, error) {
	var caps features.RuntimeCapabilities
	var identity resources.Identity
	req, _ := http.NewRequestWithContext(ctx, "GET", w.endpoint+"/admin/features", nil)
	req.Header.Set("Authorization", "Bearer admin-fixture")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return caps, identity, err
	}
	raw, err := io.ReadAll(res.Body)
	res.Body.Close()
	if err != nil || res.StatusCode != 200 {
		return caps, identity, fmt.Errorf("Worker features status%d", res.StatusCode)
	}
	caps, err = features.DecodeRuntimeCapabilities(raw)
	if err != nil {
		return caps, identity, err
	}
	req, _ = http.NewRequestWithContext(ctx, "GET", w.endpoint+resources.IdentityPath, nil)
	req.Header.Set("X-Api-Key", "worker-fixture")
	res, err = http.DefaultClient.Do(req)
	if err != nil {
		return caps, identity, err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return caps, identity, fmt.Errorf("Worker issuer status%d", res.StatusCode)
	}
	err = json.NewDecoder(res.Body).Decode(&identity)
	return caps, identity, err
}

type abcProvider struct {
	thinkingEstimates    bool
	strictToolReferences bool
	sessionContext       bool
	embeddedContexts     int
	tailReminder         bool
	tailDigest           string
	inline               bool
	inlineCatalogDigest  string
	t                    *testing.T
	mu                   sync.Mutex
	calls                int
	budget               string
	systemDigest         string
	resultDigest         string
	assistantDigest      string
	expectBudget         bool
}

func (p *abcProvider) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if p.sessionContext && r.URL.Path == "/api/oauth/profile" {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"account":{"uuid":"fixture-account"},"organization":{"uuid":"fixture-org"}}`)
		return
	}
	raw, err := io.ReadAll(r.Body)
	if err != nil {
		p.t.Error(err)
		return
	}
	if r.URL.Path != "/v1/messages" {
		p.t.Errorf("unexpected provider endpoint %s", r.URL.Path)
		w.WriteHeader(500)
		return
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	p.calls++
	if bytes.Contains(raw, []byte(`"attempt_id"`)) {
		p.t.Error("private envelope reached provider")
	}
	var body struct {
		Model    string
		Tools    []json.RawMessage
		Messages []json.RawMessage
		Output   map[string]json.RawMessage `json:"output_config"`
	}
	if json.Unmarshal(raw, &body) != nil {
		p.t.Error("invalid wire")
		return
	}
	if p.strictToolReferences {
		if err := validateABCToolReferences(body.Tools, body.Messages); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]any{"type": "error", "error": map[string]any{"type": "invalid_request_error", "message": err.Error()}})
			return
		}
	}
	budget := body.Output["task_budget"]
	if (len(budget) > 0) != p.expectBudget {
		p.t.Error("task budget presence changed on provider request")
	}
	if len(budget) > 0 {
		actual, _ := wire.CanonicalDigest(budget)
		wanted, _ := wire.CanonicalDigest([]byte(p.budget))
		if actual != wanted {
			p.t.Error("budget changed or decremented")
		}
	}
	joined, _ := json.Marshal(body.Messages)
	if p.sessionContext {
		p.embeddedContexts += verifyABCToolResultContext(p.t, body.Messages)
	}
	if p.inline {
		verifyABCInline(p.t, body.Messages, &p.inlineCatalogDigest)
	}
	if p.tailReminder {
		verifyABCTailReminder(p.t, body.Messages, &p.tailDigest)
	}
	if !bytes.Contains(joined, []byte("helper_source_call")) {
		emitABCResponse(w, body.Model, p.calls, []map[string]any{{"type": "thinking", "thinking": "PRIVATE_ABC_THINKING", "signature": "fixture-original-signature"}, {"type": "text", "text": "PRIVATE_ABC_PLANNING"}, {"type": "tool_use", "id": "helper_source_call", "name": "ToolSearch", "input": map[string]any{"query": "select:mcp__ccgateway__weather"}}}, abcResponseOptions{LargeUsage: p.tailReminder})
		return
	}
	for i, msg := range body.Messages {
		if bytes.Contains(msg, []byte(`"id":"helper_source_call"`)) {
			var hidden struct {
				Role    string
				Content []json.RawMessage
			}
			if json.Unmarshal(msg, &hidden) != nil || hidden.Role != "assistant" || len(hidden.Content) != 3 {
				p.t.Error("whole hidden assistant block order/count changed")
				continue
			}
			wantBlocks := []json.RawMessage{
				json.RawMessage(`{"type":"thinking","thinking":"PRIVATE_ABC_THINKING","signature":"fixture-original-signature"}`),
				json.RawMessage(`{"type":"text","text":"PRIVATE_ABC_PLANNING"}`),
				json.RawMessage(`{"type":"tool_use","id":"helper_source_call","name":"ToolSearch","input":{"query":"select:mcp__ccgateway__weather"}}`),
			}
			for block, want := range wantBlocks {
				var actualFields, wantedFields map[string]json.RawMessage
				if json.Unmarshal(hidden.Content[block], &actualFields) != nil {
					p.t.Errorf("hidden block %d is invalid", block)
					continue
				}
				json.Unmarshal(want, &wantedFields)
				for field, value := range wantedFields {
					actualDigest, err := wire.CanonicalDigest(actualFields[field])
					wantedDigest, _ := wire.CanonicalDigest(value)
					if err != nil || actualDigest != wantedDigest {
						p.t.Errorf("hidden assistant block %d field %s changed", block, field)
					}
				}
			}
			assistantDigest, _ := wire.CanonicalDigest(msg)
			if p.assistantDigest == "" {
				p.assistantDigest = assistantDigest
			} else if p.assistantDigest != assistantDigest {
				p.t.Error("whole hidden assistant metadata changed on restore")
			}
			if i+1 >= len(body.Messages) {
				p.t.Error("hidden tool result missing")
				continue
			}
			var result struct {
				Role    string
				Content []json.RawMessage
			}
			if json.Unmarshal(body.Messages[i+1], &result) != nil || result.Role != "user" {
				p.t.Error("hidden tool result role/position changed")
				continue
			}
			matched := 0
			for _, raw := range result.Content {
				var block struct {
					Type    string
					ID      string `json:"tool_use_id"`
					Content json.RawMessage
				}
				if json.Unmarshal(raw, &block) == nil && block.Type == "tool_result" && block.ID == "helper_source_call" {
					matched++
					if len(block.Content) == 0 || string(block.Content) == "null" || !bytes.Contains(block.Content, []byte("weather")) {
						p.t.Error("hidden search result content lost")
					}
				}
			}
			if matched != 1 {
				p.t.Error("hidden tool result pairing changed")
			}
			resultDigest, _ := wire.CanonicalDigest(body.Messages[i+1])
			if p.resultDigest == "" {
				p.resultDigest = resultDigest
			} else if p.resultDigest != resultDigest {
				p.t.Error("hidden result fields changed on restore")
			}
			if i == 0 {
				p.t.Error("helper catalogue missing")
				break
			}
			var previous struct{ Role string }
			json.Unmarshal(body.Messages[i-1], &previous)
			if previous.Role != "system" {
				p.t.Error("catalogue role/position changed")
			}
			d, _ := wire.CanonicalDigest(body.Messages[i-1])
			if p.systemDigest == "" {
				p.systemDigest = d
			} else if p.systemDigest != d {
				p.t.Error("catalogue representation changed across restore")
			}
		}
	}
	if !bytes.Contains(joined, []byte("PUBLIC_WEATHER_RESULT")) {
		emitABCResponse(w, body.Model, p.calls, []map[string]any{{"type": "tool_use", "id": "external_weather", "name": "mcp__ccgateway__weather", "input": map[string]any{}}}, abcResponseOptions{})
		return
	}
	blocks := []map[string]any{{"type": "text", "text": "PUBLIC_DONE"}}
	if p.thinkingEstimates {
		blocks = append([]map[string]any{{"type": "thinking", "thinking": "", "signature": "fixture-public-signature"}}, blocks...)
	}
	emitABCResponse(w, body.Model, p.calls, blocks, abcResponseOptions{ThinkingEstimates: p.thinkingEstimates, Refusal: p.thinkingEstimates && p.calls == 6})
}

type abcResponseOptions struct {
	LargeUsage        bool
	ThinkingEstimates bool
	Refusal           bool
}

func emitABCResponse(w http.ResponseWriter, model string, n int, blocks []map[string]any, option abcResponseOptions) {
	w.Header().Set("Content-Type", "text/event-stream")
	emit := func(v map[string]any) {
		raw, _ := json.Marshal(v)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", v["type"], raw)
	}
	startUsage := map[string]any{"input_tokens": 20, "output_tokens": 0}
	outputTokens := 8
	if option.LargeUsage {
		startUsage["input_tokens"] = 24
		startUsage["cache_creation_input_tokens"] = 1647
		startUsage["cache_creation"] = map[string]any{"ephemeral_1h_input_tokens": 1647, "ephemeral_5m_input_tokens": 0}
		outputTokens = 91
	}
	emit(map[string]any{"type": "message_start", "message": map[string]any{"id": fmt.Sprintf("msg_abc_%d", n), "type": "message", "role": "assistant", "model": model, "content": []any{}, "stop_reason": nil, "usage": startUsage}})
	stop := "end_turn"
	for i, b := range blocks {
		start := map[string]any{}
		for k, v := range b {
			start[k] = v
		}
		var delta map[string]any
		switch b["type"] {
		case "text":
			start["text"] = ""
			delta = map[string]any{"type": "text_delta", "text": b["text"]}
		case "thinking":
			start["thinking"] = ""
			start["signature"] = ""
			delta = map[string]any{"type": "thinking_delta", "thinking": b["thinking"]}
		case "tool_use":
			stop = "tool_use"
			start["input"] = map[string]any{}
			input, _ := json.Marshal(b["input"])
			delta = map[string]any{"type": "input_json_delta", "partial_json": string(input)}
		}
		emit(map[string]any{"type": "content_block_start", "index": i, "content_block": start})
		emitABCBlockDelta(emit, i, delta, option.ThinkingEstimates)
		if b["type"] == "thinking" {
			emit(map[string]any{"type": "content_block_delta", "index": i, "delta": map[string]any{"type": "signature_delta", "signature": b["signature"]}})
		}
		emit(map[string]any{"type": "content_block_stop", "index": i})
	}
	if option.Refusal {
		stop = "refusal"
	}
	emit(map[string]any{"type": "message_delta", "delta": map[string]any{"stop_reason": stop, "stop_sequence": nil}, "usage": map[string]any{"output_tokens": outputTokens}})
	emit(map[string]any{"type": "message_stop"})
}

func emitABCBlockDelta(emit func(map[string]any), index int, delta map[string]any, estimates bool) {
	if delta == nil {
		return
	}
	withEstimate := estimates && delta["type"] == "thinking_delta"
	if withEstimate {
		delta["estimated_tokens"] = 50
	}
	emit(map[string]any{"type": "content_block_delta", "index": index, "delta": delta})
	if withEstimate {
		emit(map[string]any{"type": "content_block_delta", "index": index, "delta": map[string]any{"type": "thinking_delta", "thinking": "", "estimated_tokens": nil}})
	}
}

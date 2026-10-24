package engine

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/stretchr/testify/require"
)

const creditTestRequest = `{"model":"fixture","messages":[{"role":"user","content":"hello"}],"max_tokens":16}`

const creditTokenRequest = `{"model":"fixture","messages":[{"role":"user","content":"hello"}],"max_tokens":16,"fallback_credit_token":"fixture-credit"}`

const creditJSONAnswer = `{"id":"msg_1","type":"message","role":"assistant","model":"fixture","content":[{"type":"text","text":"hi"}],"stop_reason":"end_turn","usage":{"input_tokens":1,"output_tokens":1}}`

const creditSSEAnswer = "event: message_start\n" +
	`data: {"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","model":"fixture","content":[]}}` + "\n\n" +
	"event: content_block_start\n" +
	`data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}` + "\n\n" +
	"event: content_block_delta\n" +
	`data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hi"}}` + "\n\n" +
	"event: content_block_stop\n" +
	`data: {"type":"content_block_stop","index":0}` + "\n\n" +
	"event: message_delta\n" +
	`data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":1}}` + "\n\n" +
	"event: message_stop\n" +
	`data: {"type":"message_stop"}` + "\n\n"

const creditJSONRefusal = `{"id":"msg_1","type":"message","role":"assistant","model":"fixture","content":[],"stop_reason":"refusal","stop_details":{"type":"refusal","fallback_credit_token":"fixture-credit"},"usage":{"input_tokens":1,"output_tokens":1}}`

const creditSSERefusal = "event: message_start\n" +
	`data: {"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","model":"fixture","content":[]}}` + "\n\n" +
	"event: message_delta\n" +
	`data: {"type":"message_delta","delta":{"stop_reason":"refusal","stop_details":{"type":"refusal","fallback_credit_token":"fixture-credit"}},"usage":{"output_tokens":1}}` + "\n\n" +
	"event: message_stop\n" +
	`data: {"type":"message_stop"}` + "\n\n"

// requestFixturePeer answers the Worker's request command with the meta and
// body the fixture directory records, then exits successfully.
func requestFixturePeer(fixture string) {
	_, _ = io.Copy(io.Discard, os.Stdin)
	meta, err := os.ReadFile(filepath.Join(fixture, "meta"))
	if err != nil {
		panic(err)
	}
	for i, arg := range os.Args {
		if arg == "--response-meta" && i+1 < len(os.Args) {
			if err = os.WriteFile(os.Args[i+1], meta, 0600); err != nil {
				panic(err)
			}
		}
	}
	body, err := os.ReadFile(filepath.Join(fixture, "body"))
	if err != nil {
		panic(err)
	}
	if _, err = os.Stdout.Write(body); err != nil {
		panic(err)
	}
	if target := os.Getenv("CCG_TEST_REQUEST_READY"); target != "" {
		if err = os.WriteFile(target, []byte("ready"), 0600); err != nil {
			panic(err)
		}
	}
}

// creditTestGateway is a direct-mode Worker whose resource identity was
// verified a moment ago (so the identity comes from the cache) and whose CLI
// answers with the given upstream answer. It returns the path the peer marks
// after it ran.
func creditTestGateway(t *testing.T, contentType, answer string) (*Gateway, resources.Identity, string) {
	t.Helper()
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	fixture := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(fixture, "meta"), []byte(`{"status":200,"headers":{"content-type":"`+contentType+`"}}`), 0600))
	require.NoError(t, os.WriteFile(filepath.Join(fixture, "body"), []byte(answer), 0600))
	config := filepath.Join(root, "config")
	require.NoError(t, os.MkdirAll(config, 0700))
	ready := filepath.Join(root, "request.ready")
	env := envWith(os.Environ(), map[string]string{
		"CCG_TEST_REQUEST_PEER": "fixture", "CCG_TEST_REQUEST_FIXTURE": fixture, "CCG_TEST_REQUEST_READY": ready,
		"HOME": root, "CLAUDE_CONFIG_DIR": config, "CLAUDE_SECURESTORAGE_CONFIG_DIR": config, "ANTHROPIC_API_KEY": "fixture-key",
		"CCG_RESOURCE_ISSUER_ID": "diagnostics-fixture", "CCG_RESOURCE_ISSUER_GENERATION": "1",
	}, "CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL")
	g := &Gateway{RequestMode: "direct", Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
		CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_direct"}},
		Runner:  &Runner{CLI: exe, Work: root, Env: env}}
	broker, err := newResourceBroker(g, &authManager{}, root)
	require.NoError(t, err)
	t.Cleanup(func() { broker.lease.Close() })
	g.resources = broker
	auth, err := resourceAuthorizationCandidate(g.Runner.baseEnv())
	require.NoError(t, err)
	identity := resources.Identity{AuthType: "api_key", PrincipalID: "principal-fixture", Generation: "generation-fixture"}
	broker.verified.Store(&verifiedResourceIdentity{identity: identity, auth: auth, at: time.Now()})
	return g, identity, ready
}

// creditHeaders is the core's credit admission for identity.
func creditHeaders(identity resources.Identity) map[string]string {
	return map[string]string{
		"Anthropic-Beta":           "fallback-credit-2026-07-01",
		credits.TrackingHeader:     "1",
		resources.PrincipalHeader:  identity.PrincipalID,
		resources.GenerationHeader: identity.Generation,
	}
}

func creditTestPost(t *testing.T, g *Gateway, body string, headers map[string]string, edit func(*http.Request)) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(body))
	request.Header.Set("x-api-key", "fixture")
	for name, value := range headers {
		request.Header.Set(name, value)
	}
	if edit != nil {
		edit(request)
	}
	response := httptest.NewRecorder()
	g.ServeHTTP(response, request)
	return response
}

// A tracked answer names the verified issuer on every answer, and leaves the
// claim unset when the provider issued no credit. The body is untouched.
func TestCreditReceiptAnswersTrackedResponse(t *testing.T) {
	for _, tc := range []struct{ name, contentType, answer string }{
		{"json", "application/json", creditJSONAnswer},
		{"sse", "text/event-stream", creditSSEAnswer},
	} {
		t.Run(tc.name, func(t *testing.T) {
			g, identity, ready := creditTestGateway(t, tc.contentType, tc.answer)
			response := creditTestPost(t, g, creditTestRequest, creditHeaders(identity), nil)
			require.Equal(t, http.StatusOK, response.Code, response.Body.String())
			require.Equal(t, identity.PrincipalID, response.Header().Get(resources.PrincipalHeader))
			require.Equal(t, identity.Generation, response.Header().Get(resources.GenerationHeader))
			require.Empty(t, response.Header().Get(credits.ReadyHeader), "no claim was issued")
			require.Equal(t, tc.answer, response.Body.String(), "the answer must pass through byte for byte")
			require.FileExists(t, ready, "the CLI did not run")
		})
	}
}

// A tracked answer whose message issues a credit confirms exactly that claim's
// token hash, which is how the core records the credit.
func TestCreditReceiptConfirmsIssuedCredit(t *testing.T) {
	hash, err := credits.TokenHash("fixture-credit")
	require.NoError(t, err)
	for _, tc := range []struct{ name, contentType, answer string }{
		{"json", "application/json", creditJSONRefusal},
		{"sse", "text/event-stream", creditSSERefusal},
	} {
		t.Run(tc.name, func(t *testing.T) {
			g, identity, _ := creditTestGateway(t, tc.contentType, tc.answer)
			response := creditTestPost(t, g, creditTestRequest, creditHeaders(identity), nil)
			require.Equal(t, http.StatusOK, response.Code, response.Body.String())
			require.Equal(t, []string{hash}, response.Header().Values(credits.ReadyHeader))
			require.Equal(t, tc.answer, response.Body.String())
		})
	}
}

// The credit capability is the core's alone: untrusted tracking, a redemption
// without tracking, an admission that does not hash the token, and an issuer
// that is not the account's are all refused before the CLI starts.
func TestCreditAdmissionRefusesUntrustedRequests(t *testing.T) {
	for _, tc := range []struct {
		name   string
		body   string
		edit   func(*http.Request)
		status int
	}{
		{"tracking without its beta", creditTestRequest, func(r *http.Request) {
			r.Header.Set("Anthropic-Beta", "unrelated-beta")
		}, 400},
		{"duplicate tracking", creditTestRequest, func(r *http.Request) {
			r.Header.Add(credits.TrackingHeader, "1")
		}, 400},
		{"tracking is not one", creditTestRequest, func(r *http.Request) {
			r.Header.Set(credits.TrackingHeader, "true")
		}, 400},
		{"token without tracking", creditTokenRequest, func(r *http.Request) {
			r.Header.Del(credits.TrackingHeader)
		}, 400},
		{"admission without a token", creditTestRequest, func(r *http.Request) {
			r.Header.Set(credits.AdmissionHeader, strings.Repeat("0", 64))
		}, 400},
		{"admission does not hash the token", creditTokenRequest, func(r *http.Request) {
			r.Header.Set(credits.AdmissionHeader, strings.Repeat("0", 64))
		}, 400},
		{"another issuer", creditTestRequest, func(r *http.Request) {
			r.Header.Set(resources.GenerationHeader, "another-generation")
		}, 409},
	} {
		t.Run(tc.name, func(t *testing.T) {
			g, identity, ready := creditTestGateway(t, "application/json", creditJSONAnswer)
			response := creditTestPost(t, g, tc.body, creditHeaders(identity), tc.edit)
			require.Equal(t, tc.status, response.Code, response.Body.String())
			require.NoFileExists(t, ready, "the CLI ran for a refused admission")
		})
	}
}

// The verified issuer and its authority are held for the whole request: a
// resource reauthorization cannot switch it while the CLI is running, and the
// identity step does not keep a slot of its own.
func TestCreditTrackingHoldsTheIssuerAuthority(t *testing.T) {
	g, identity, ready := creditTestGateway(t, "text/event-stream", creditSSEAnswer)
	g.Runner.Env = envWith(g.Runner.Env, map[string]string{"CCG_TEST_REQUEST_PEER": "stream"}, "CCG_TEST_REQUEST_FIXTURE")
	done := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer close(done)
		g.ServeHTTP(w, r)
	}))
	defer server.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, "POST", server.URL+"/v1/messages", strings.NewReader(creditTestRequest))
	require.NoError(t, err)
	request.Header.Set("x-api-key", "fixture")
	for name, value := range creditHeaders(identity) {
		request.Header.Set(name, value)
	}
	answered := make(chan error, 1)
	go func() {
		response, err := server.Client().Do(request)
		if err == nil {
			response.Body.Close()
		}
		answered <- err
	}()
	require.Eventually(t, func() bool { _, err := os.Stat(ready); return err == nil }, 5*time.Second, 10*time.Millisecond, "the CLI did not start")
	require.False(t, g.resources.authority.mu.TryLock(), "the resource authority is not held during the CLI run")
	require.Len(t, g.Slots, 1, "the identity slot is not released before the request's own")
	select {
	case err := <-answered:
		t.Fatalf("a tracked answer was committed before its CLI finished: %v", err)
	case <-time.After(100 * time.Millisecond):
	}
	cancel()
	<-done
	require.True(t, g.resources.authority.mu.TryLock(), "the resource authority is not released after the request")
	g.resources.authority.mu.Unlock()
	<-answered
}

// Untracked answers keep streaming: their first bytes reach the client while
// the CLI is still running.
func TestUntrackedRequestStillStreams(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	ready := filepath.Join(root, "ready")
	g := &Gateway{RequestMode: "direct", Key: "fixture", Slots: make(chan struct{}, 1), Timeout: time.Minute,
		CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_direct"}},
		Runner:  &Runner{CLI: exe, Work: root, Env: envWith(os.Environ(), map[string]string{"CCG_TEST_REQUEST_PEER": "stream", "CCG_TEST_REQUEST_READY": ready})}}
	first := make(chan string, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		g.ServeHTTP(w, r)
	}))
	defer server.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, "POST", server.URL+"/v1/messages", strings.NewReader(creditTestRequest))
	require.NoError(t, err)
	request.Header.Set("x-api-key", "fixture")
	go func() {
		response, err := server.Client().Do(request)
		if err != nil {
			first <- ""
			return
		}
		defer response.Body.Close()
		buffer := make([]byte, len(cancellationFirstEvent))
		n, _ := io.ReadFull(response.Body, buffer)
		first <- string(buffer[:n])
	}()
	select {
	case got := <-first:
		require.Equal(t, cancellationFirstEvent, got, "the untracked answer was buffered")
	case <-time.After(5 * time.Second):
		t.Fatal("the untracked answer did not stream before the CLI exited")
	}
	cancel()
}

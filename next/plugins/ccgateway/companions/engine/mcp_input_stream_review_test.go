package engine

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"testing"
	"time"
)

func TestReviewMCPInputBridgeClearsOriginalLength(t *testing.T) {
	relay := &outboundRelay{}
	req := &Request{MCP: &MCPConnectorPlan{}}
	block := Object{"type": "mcp_tool_use", "id": "review-call", "server_name": "one", "name": "read", "input": Object{}}
	var wire []byte
	for _, e := range []Object{{"type": "message_start", "message": Object{"id": "review-msg"}}, {"type": "content_block_start", "index": 0, "content_block": block}, {"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": "{\"n\":9007199254740993}"}}, {"type": "content_block_stop", "index": 0}, {"type": "message_stop"}} {
		wire = append(wire, mcpCarrierEvent(e)...)
	}
	r := httptest.NewRequest("POST", "http://fixture/v1/messages", nil)
	r = r.WithContext(context.WithValue(r.Context(), apiOutputRequestKey{}, req))
	response := &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"text/event-stream"}, "Content-Length": []string{strconv.Itoa(len(wire))}}, ContentLength: int64(len(wire)), Body: io.NopCloser(bytes.NewReader(wire)), Request: r}
	observer := &apiTerminalObserver{relay: relay, req: req}
	response.Body = &sseWatch{body: response.Body, relay: relay, request: r, ignoreErrors: true, observe: observer.observe}
	relay.bridgeMCPInputs(response, req)
	out, err := io.ReadAll(response.Body)
	response.Body.Close()
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(out, []byte("input_json_delta")) || !bytes.Contains(out, []byte("9007199254740993")) {
		t.Fatal("unexpected normalization")
	}
	if response.ContentLength != -1 || response.Header.Get("Content-Length") != "" {
		t.Fatal("normalized body retained stale provider length", len(wire), len(out), response.ContentLength)
	}
}

func TestReviewMCPGzipTransportBeforeInputBridge(t *testing.T) {
	var wire []byte
	for _, e := range []Object{
		{"type": "message_start", "message": Object{"id": "gzip-msg"}},
		{"type": "content_block_start", "index": 0, "content_block": Object{"type": "mcp_tool_use", "id": "gzip-call", "name": "read", "server_name": "one", "input": Object{}}},
		{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": `{"n":9007199254740993}`}},
		{"type": "content_block_stop", "index": 0}, {"type": "message_stop"},
	} {
		wire = append(wire, mcpCarrierEvent(e)...)
	}
	var encoded bytes.Buffer
	gz := gzip.NewWriter(&encoded)
	gz.Write(wire)
	gz.Close()
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Set("Content-Length", strconv.Itoa(encoded.Len()))
		w.Write(encoded.Bytes())
	}))
	defer up.Close()
	target, _ := url.Parse(up.URL)
	tr := http.DefaultTransport.(*http.Transport).Clone()
	defer tr.CloseIdleConnections()
	relay := &outboundRelay{transport: tr}
	proxy := relay.forwarder(target)
	front := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r = r.WithContext(context.WithValue(r.Context(), apiOutputRequestKey{}, &Request{MCP: &MCPConnectorPlan{}}))
		proxy.ServeHTTP(w, r)
	}))
	defer front.Close()
	r, err := http.Get(front.URL + "/v1/messages")
	if err != nil {
		t.Fatal(err)
	}
	out, err := io.ReadAll(r.Body)
	r.Body.Close()
	if err != nil {
		t.Fatal(err)
	}
	if r.StatusCode != 200 || r.Header.Get("Content-Encoding") != "" || bytes.Contains(out, []byte("input_json_delta")) || !bytes.Contains(out, []byte("9007199254740993")) {
		t.Fatalf("bad normalized gzip stream: %d %s", r.StatusCode, out)
	}
}

type mcpReviewStartedBody struct {
	net.Conn
	started chan struct{}
}

func (b *mcpReviewStartedBody) Read(p []byte) (int, error) { close(b.started); return b.Conn.Read(p) }
func TestReviewMCPInputCloseUnblocksReader(t *testing.T) {
	a, b := net.Pipe()
	defer b.Close()
	source := &mcpReviewStartedBody{Conn: a, started: make(chan struct{})}
	relay := &outboundRelay{}
	resp := &http.Response{Body: source, Header: http.Header{}, Request: httptest.NewRequest("POST", "http://fixture", nil)}
	relay.bridgeMCPInputs(resp, &Request{MCP: &MCPConnectorPlan{}})
	done := make(chan error, 1)
	go func() { _, err := resp.Body.Read(make([]byte, 1)); done <- err }()
	<-source.started
	if err := resp.Body.Close(); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-done:
		if err == nil {
			t.Fatal("closed read succeeded")
		}
	case <-time.After(time.Second):
		t.Fatal("Close left upstream read blocked")
	}
}

func TestReviewMCPGuardRunsBeforeCarrierAndLedger(t *testing.T) {
	relay := &outboundRelay{}
	req := &Request{MCP: &MCPConnectorPlan{credentials: map[string]mcpCredential{"one": {token: "PRIVATE_TOKEN"}}}}
	events := []Object{
		{"type": "message_start", "message": Object{"id": "secret-msg"}},
		{"type": "content_block_start", "index": 0, "content_block": Object{"type": "mcp_tool_use", "id": "secret-call", "server_name": "one", "name": "read", "input": Object{}}},
		{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": `{"x":"PRIVATE_`}},
		{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": `TOKEN"}`}},
		{"type": "content_block_stop", "index": 0},
		{"type": "message_stop"},
	}
	var wire []byte
	for _, e := range events {
		wire = append(wire, mcpCarrierEvent(e)...)
	}
	r := httptest.NewRequest("POST", "http://fixture/v1/messages", nil)
	r = r.WithContext(context.WithValue(r.Context(), apiOutputRequestKey{}, req))
	response := &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"text/event-stream"}}, Body: io.NopCloser(bytes.NewReader(wire)), Request: r}
	if err := relay.protectMCPResponse(response); err != nil {
		t.Fatal(err)
	}
	o := &apiTerminalObserver{relay: relay, req: req}
	response.Body = &sseWatch{body: response.Body, relay: relay, request: r, ignoreErrors: true, observe: o.observe}
	relay.bridgeMCPInputs(response, req)
	out, err := io.ReadAll(response.Body)
	response.Body.Close()
	if err == nil || relay.UpstreamError() == nil {
		t.Fatal("credential echo accepted")
	}
	if bytes.Contains(out, []byte("PRIVATE_")) || bytes.Contains(out, []byte("content_block_start")) {
		t.Fatal("secret-bearing block exposed to CLI")
	}
	relay.mu.Lock()
	defer relay.mu.Unlock()
	for _, blocks := range relay.exactToolInputs {
		for _, source := range blocks {
			raw, _ := json.Marshal(source.block)
			if bytes.Contains(raw, []byte("PRIVATE_")) {
				t.Fatal("secret entered exact ledger")
			}
		}
	}
}

func TestReviewMCPBridgeLeavesNonMCPBodyAlone(t *testing.T) {
	body := io.NopCloser(bytes.NewBufferString("fixture"))
	response := &http.Response{Body: body, ContentLength: 7, Header: http.Header{"Content-Length": []string{"7"}}}
	(&outboundRelay{}).bridgeMCPInputs(response, &Request{})
	if response.Body != body || response.ContentLength != 7 || response.Header.Get("Content-Length") != "7" {
		t.Fatal("non-MCP response changed")
	}
}

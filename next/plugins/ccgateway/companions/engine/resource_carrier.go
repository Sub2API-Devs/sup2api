package engine

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
)

type resourceRequestKey struct{}

// Resource payloads are never CLI messages: only native request authentication
// crosses the carrier, and the provider response is consumed before the CLI.
type resourceExchange struct {
	route      resourceRoute
	input      *resourceSpool
	dir        string
	limit      int64
	budget     *resourceSpoolBudget
	mu         sync.Mutex
	dispatched bool
	response   *resourceResponse
}
type resourceResponse struct {
	status int
	header http.Header
	body   *resourceSpool
}

func (op *resourceExchange) completed() bool {
	op.mu.Lock()
	defer op.mu.Unlock()
	return op.response != nil
}

func (relay *outboundRelay) prepareResourceRequest(w http.ResponseWriter, r *http.Request, op *resourceExchange) bool {
	op.mu.Lock()
	if op.dispatched {
		op.mu.Unlock()
		apiError(w, 400, "invalid_request_error", "Resource carrier already consumed")
		return false
	}
	op.dispatched = true
	op.mu.Unlock()
	r.Method = op.route.method
	r.URL.Path = relay.path + op.route.path
	r.URL.RawPath = ""
	r.URL.RawQuery = op.route.query
	r.Body = http.NoBody
	r.ContentLength = 0
	if op.input != nil {
		r.Body = io.NopCloser(op.input.File)
		r.ContentLength = op.input.size
	}
	r.Header.Del("Content-Length")
	r.Header.Del("Content-Type")
	r.Header.Del("Accept-Encoding")
	if op.route.path != "/api/oauth/profile" {
		beta := []string{}
		for _, line := range r.Header.Values("Anthropic-Beta") {
			for _, name := range strings.Split(line, ",") {
				if strings.TrimSpace(name) == "oauth-2025-04-20" {
					beta = append(beta, "oauth-2025-04-20")
				}
			}
		}
		beta = append(beta, op.route.betas...)
		r.Header.Del("Anthropic-Beta")
		if len(beta) > 0 {
			r.Header.Set("Anthropic-Beta", strings.Join(beta, ","))
		}
	}
	if op.route.contentType != "" {
		r.Header.Set("Content-Type", op.route.contentType)
	}
	if op.route.version != "" {
		r.Header.Set("Anthropic-Version", op.route.version)
	}
	*r = *r.WithContext(context.WithValue(r.Context(), resourceRequestKey{}, op))
	return true
}

func (relay *outboundRelay) captureResourceResponse(resp *http.Response, op *resourceExchange) error {
	body, err := spoolResource(resp.Request.Context(), op.dir, resp.Body, resp.ContentLength, op.limit, op.budget)
	op.mu.Lock()
	if err == nil {
		op.response = &resourceResponse{status: resp.StatusCode, header: resourceResponseHeaders(resp.Header), body: body}
	}
	op.mu.Unlock()
	if err != nil {
		relay.mu.Lock()
		relay.failure = fmt.Errorf("resource response unavailable: %w", err)
		relay.mu.Unlock()
	}
	resp.Body = http.NoBody
	resp.ContentLength = 0
	resp.Header.Set("Content-Length", "0")
	resp.Header.Del("Content-Encoding")
	relay.stop(resp.Request)
	return err
}

func resourceResponseHeaders(source http.Header) http.Header {
	h := httpfacts.Select(source)
	hop := map[string]bool{}
	for _, line := range source.Values("Connection") {
		for _, key := range strings.Split(line, ",") {
			hop[strings.ToLower(strings.TrimSpace(key))] = true
		}
	}
	for _, key := range []string{"Content-Type", "Content-Disposition", "Content-Encoding", "ETag", "Last-Modified"} {
		if hop[strings.ToLower(key)] {
			continue
		}
		for _, value := range source.Values(key) {
			if validResourceHeader(value) {
				h.Add(key, value)
			}
		}
	}
	return h
}
func validResourceHeader(value string) bool {
	for _, c := range value {
		if c < 32 && c != '\t' || c == 127 {
			return false
		}
	}
	return true
}

func (runner *Runner) runResource(ctx context.Context, op *resourceExchange) (*resourceResponse, error) {
	dir, err := os.MkdirTemp(runner.Work, "resource-operation-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)
	req, err := parsePolicyRequest([]byte(`{"model":"claude-opus-5-5","max_tokens":1,"messages":[{"role":"user","content":"resource carrier"}]}`), http.Header{})
	if err != nil {
		return nil, err
	}
	req.resource = op
	p := &Prepared{Work: dir, SessionID: uuid(), InputUUID: uuid()}
	_, err = runner.run(ctx, req, p, dir, func(Object) error { return fmt.Errorf("resource carrier unexpectedly generated model content") })
	// Record only lifecycle facts, before failure cleanup clears the response.
	// In particular, profile response bodies contain account identifiers.
	op.mu.Lock()
	facts := Object{"request_prepared": op.dispatched, "response_received": op.response != nil, "runner_failed": err != nil}
	if op.response != nil {
		facts["response_status"] = op.response.status
	}
	op.mu.Unlock()
	resourceDiagnostic(ctx).trace("resource_carrier_completed", facts)
	if err != nil {
		op.mu.Lock()
		if op.response != nil {
			_ = op.response.body.Close()
			op.response = nil
		}
		op.mu.Unlock()
		return nil, err
	}
	op.mu.Lock()
	defer op.mu.Unlock()
	if op.response == nil {
		return nil, fmt.Errorf("resource operation did not receive a response")
	}
	return op.response, nil
}

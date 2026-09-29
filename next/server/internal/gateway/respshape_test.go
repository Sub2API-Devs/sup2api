package gateway

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// The gateway still picks SSE or JSON from the upstream Content-Type; what
// endpoint.response buys is that a response shape the endpoint never declared
// is now visible instead of silently costing the request its usage rules.

// withEndpointResponse rewrites the response declaration of one endpoint, in
// the platform definition and in its endpoint binding (the gateway reads the
// first for the upstream route and the second to match the client request).
func withEndpointResponse(protocol string, r manifest.EndpointResp) envOpt {
	return func(e *env) {
		for i := range e.gen.platforms {
			eps := e.gen.platforms[i].Platform.Endpoints
			for j := range eps {
				if eps[j].Protocol == protocol {
					eps[j].Response = r
				}
			}
		}
		for i := range e.gen.endpoints {
			if e.gen.endpoints[i].Endpoint.Protocol == protocol {
				e.gen.endpoints[i].Endpoint.Response = r
			}
		}
	}
}

// captureWarnings redirects slog for the duration of the test.
func captureWarnings(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelWarn})))
	t.Cleanup(func() { slog.SetDefault(prev) })
	return &buf
}

// An endpoint declaring only nonStream whose upstream answers SSE: the client
// still gets its stream, and the record says the declaration was wrong.
func TestResponseMismatchSSENotDeclared(t *testing.T) {
	buf := captureWarnings(t)
	e := newEnv(t, withEndpointResponse("anthropic.messages", manifest.EndpointResp{NonStream: "json"}))
	r := e.messages(body(testModel, true))
	if r.status != 200 || !strings.Contains(r.header.Get("Content-Type"), "text/event-stream") ||
		!strings.Contains(string(r.body), "message_stop") {
		t.Fatalf("the stream must be forwarded as before: %d %s %s", r.status, r.header.Get("Content-Type"), r.body)
	}
	rec := e.record()
	if rec.ResponseMismatch != core.ResponseMismatchSSENotDeclared {
		t.Fatalf("mismatch = %q", rec.ResponseMismatch)
	}
	// Nothing about the billing changed: the tokens the SSE rules did find are
	// still counted and the record is still billable.
	if !rec.Success || rec.StatusCode != 200 || rec.Tokens.Output != upOutput || !rec.Billable {
		t.Fatalf("record: %+v", rec)
	}
	s := buf.String()
	if !strings.Contains(s, core.ResponseMismatchSSENotDeclared) || !strings.Contains(s, rec.RequestID) ||
		!strings.Contains(s, "anthropic.messages") || !strings.Contains(s, "/v1/messages") ||
		!strings.Contains(s, "text/event-stream") {
		t.Fatalf("warning = %s", s)
	}
}

// The reverse: an endpoint promising only a stream whose upstream answers
// JSON. Harmless, recorded for symmetry.
func TestResponseMismatchJSONWhileStreamDeclared(t *testing.T) {
	buf := captureWarnings(t)
	e := newEnv(t, withEndpointResponse("anthropic.messages", manifest.EndpointResp{Stream: "sse"}))
	r := e.messages(body(testModel, false))
	if r.status != 200 || r.json().Get("usage.output_tokens").Int() != upOutput {
		t.Fatalf("response: %d %s", r.status, r.body)
	}
	rec := e.record()
	if rec.ResponseMismatch != core.ResponseMismatchJSONWhileStream {
		t.Fatalf("mismatch = %q", rec.ResponseMismatch)
	}
	if !strings.Contains(buf.String(), core.ResponseMismatchJSONWhileStream) {
		t.Fatalf("warning = %s", buf.String())
	}
}

// The built-in anthropic endpoint declares both shapes, so neither a stream
// nor a JSON answer is a mismatch. A marker on a healthy request would make
// the column useless.
func TestResponseShapeDeclaredLeavesNoMarker(t *testing.T) {
	for _, stream := range []bool{false, true} {
		buf := captureWarnings(t)
		e := newEnv(t)
		if r := e.messages(body(testModel, stream)); r.status != 200 {
			t.Fatalf("stream=%v status %d", stream, r.status)
		}
		rec := e.record()
		if rec.ResponseMismatch != "" {
			t.Fatalf("stream=%v: unexpected mismatch %q", stream, rec.ResponseMismatch)
		}
		if strings.Contains(buf.String(), "response shape") {
			t.Fatalf("stream=%v: unexpected warning %s", stream, buf.String())
		}
	}
}

// An endpoint that only streams (request.stream, no response.nonStream) is
// exactly the always-streaming shape manifest validation allows, and an SSE
// answer to it is correct.
func TestResponseShapeAlwaysStreamingEndpoint(t *testing.T) {
	e := newEnv(t, withEndpointResponse("anthropic.messages", manifest.EndpointResp{Stream: "sse"}))
	if r := e.messages(body(testModel, true)); r.status != 200 {
		t.Fatalf("status %d", r.status)
	}
	if rec := e.record(); rec.ResponseMismatch != "" {
		t.Fatalf("mismatch = %q", rec.ResponseMismatch)
	}
}

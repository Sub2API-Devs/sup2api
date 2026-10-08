package engine

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestHelperHistoryTransportRejectsBeforeCLI(t *testing.T) {
	for _, name := range []string{"unauthorized", "multi-header", "digest", "wrong-path", "resources", "credit-grant", "no-issuer", "namespace-change", "concurrent-attempt"} {
		t.Run(name, func(t *testing.T) {
			raw := json.RawMessage(`{"model":"fixture","max_tokens":10,"messages":[{"role":"user","content":"public"}]}`)
			hash, _ := helperhistory.CanonicalDigest(raw)
			env := helperhistory.RequestEnvelope{Version: 1, AttemptID: "attempt", RequestDigest: hash, Namespace: "namespace", Identity: resources.Identity{PrincipalID: "issuer", Generation: "generation"}, Request: raw}
			env.Namespace, _ = helperhistory.Namespace("fixture", "2.1.292", json.RawMessage(`{}`))
			if name == "digest" {
				env.RequestDigest = string(bytes.Repeat([]byte("0"), 64))
			}
			if name == "resources" {
				env.Request = json.RawMessage(`{"model":"fixture","messages":[{"role":"user","content":[{"type":"container_upload","file_id":"file_other"}]}]}`)
				env.RequestDigest, _ = helperhistory.CanonicalDigest(env.Request)
			}
			body, _ := json.Marshal(env)
			req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(body))
			req.Header.Set(helperhistory.Header, "1")
			req.Header.Set("x-api-key", "fixture-key")
			req.Header.Set("X-CCGateway-Request-Policy", `{}`)
			if name == "namespace-change" {
				req.Header.Set("X-CCGateway-Request-Policy", `{"attachment_source":"gateway"}`)
			}
			if name == "unauthorized" {
				req.Header.Set("x-api-key", "wrong")
			}
			if name == "multi-header" {
				req.Header.Add(helperhistory.Header, "1")
			}
			if name == "wrong-path" {
				req.URL.Path = "/v1/messages/count_tokens"
			}
			if name == "credit-grant" {
				req.Header.Set("X-CCGateway-Fallback-Credit-Track", "1")
			}
			g := &Gateway{Key: "fixture-key", Runner: &Runner{CLI: "must-not-execute", Version: "2.1.292"}}
			if name == "concurrent-attempt" {
				g.occupy("helper-attempt-" + digest([]string{env.AttemptID, env.Identity.PrincipalID, env.Identity.Generation}))
			}
			w := httptest.NewRecorder()
			if !g.serveHelperHistory(w, req) || w.Code < 400 {
				t.Fatal("invalid carrier admitted", w.Code)
			}
			if name == "concurrent-attempt" && (w.Code != 409 || !bytes.Contains(w.Body.Bytes(), []byte("already running"))) {
				t.Fatal("concurrent attempt not rejected before execution")
			}
		})
	}
}

func TestHelperHistoryAccountingPrecisionAndBounds(t *testing.T) {
	var a helperAccounting
	frames := []string{`data: {"type":"message_start","message":{"model":"fixture","usage":{"input_tokens":9007199254740993}}}` + "\n\n", `data: {"type":"message_delta","usage":{"output_tokens":3,"unknown_future":{"n":9007199254740995}}}` + "\n\n", `data: {"type":"message_stop"}` + "\n\n"}
	for _, frame := range frames {
		for _, c := range []byte(frame) {
			a.observe("text/event-stream", []byte{c})
		}
	}
	if !a.evidence.Known || !a.evidence.Complete || len(a.evidence.Frames) != 2 || !bytes.Contains(a.evidence.Frames[0], []byte("9007199254740993")) {
		t.Fatal("observed accounting changed")
	}
	if err := a.evidence.Validate(); err != nil {
		t.Fatal(err)
	}
	w := &helperHistoryWriter{header: http.Header{"Content-Type": []string{"application/json"}}}
	prefix := []byte(`{"model":"fixture","content":"`)
	large := append(prefix, bytes.Repeat([]byte("x"), helperhistory.MaxPayloadBytes)...)
	large = append(large, []byte(`","usage":{"output_tokens":9007199254740993}}`)...)
	if _, err := w.Write(large); err == nil || w.body.Len() != 0 {
		t.Fatal("overflow became partial successful message")
	}
	if !w.accounting.evidence.Known || !w.accounting.evidence.Complete || !bytes.Contains(w.accounting.evidence.Frames[0], []byte("9007199254740993")) {
		t.Fatal("completed original JSON accounting lost")
	}
	var truncated helperAccounting
	truncated.observe("text/event-stream", []byte(frames[0]))
	if !truncated.evidence.Known || truncated.evidence.Complete {
		t.Fatal("partial accounting claimed complete")
	}
}

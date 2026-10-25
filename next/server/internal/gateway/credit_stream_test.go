package gateway

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// creditStreamUpstream answers like a Worker whose CLI relayed a stream: the
// issuer on the answer, the stream flushed up to "<release>" and the rest once
// release closes, then the receipt (when given) as a trailer after the last
// byte.
func creditStreamUpstream(t *testing.T, e *env, stream, ready string, release <-chan struct{}) {
	t.Helper()
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
		w.Header().Set(resources.GenerationHeader, "v1")
		w.Header().Set("Content-Type", "text/event-stream")
		head, tail, _ := strings.Cut(stream, "<release>")
		fmt.Fprint(w, head)
		w.(http.Flusher).Flush()
		if release != nil {
			<-release
		}
		fmt.Fprint(w, tail)
		w.(http.Flusher).Flush()
		if ready != "" {
			w.Header().Set(http.TrailerPrefix+credits.ReadyHeader, ready)
		}
	}))
	t.Cleanup(up.Close)
	e.plat.base = up.URL
}

func creditStreamMessageStart(id string) string {
	return `{"type":"message_start","message":{"id":"` + id + `","type":"message","model":"` + testModel + `","role":"assistant","content":[],"usage":{"input_tokens":5,"output_tokens":1}}}`
}

// The core reads the claim with the Worker's own reading
// (credits.EventPayloads, 2026-10-25 audit r3 P2-3): a stream with CRLF line
// ends, comment lines and a last event without its closing blank line still
// has its credit confirmed and recorded.
func TestFallbackCreditStreamFormsMatchTheWorker(t *testing.T) {
	e, _, _ := resourceTestEnv(t)
	registry := &memoryCredits{rows: map[string]core.FallbackCredit{}}
	e.gw.d.Credits = registry
	token := "fixture-credit-token"
	hash, _ := credits.TokenHash(token)
	stream := ": keep-alive\r\n" +
		"event: message_start\r\ndata: " + creditStreamMessageStart("msg_forms") + "\r\n\r\n" +
		"event: content_block_start\r\ndata: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}\r\n\r\n" +
		": ping\r\n\r\n" +
		"event: content_block_delta\r\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"No. \"}}\r\n\r\n" +
		"event: content_block_stop\r\ndata: {\"type\":\"content_block_stop\",\"index\":0}\r\n\r\n" +
		"event: message_delta\r\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"refusal\",\"stop_details\":{\"fallback_credit_token\":\"" + token + "\"}},\"usage\":{\"output_tokens\":2}}\r\n\r\n" +
		"event: message_stop\r\ndata: {\"type\":\"message_stop\"}"
	creditStreamUpstream(t, e, stream, hash, nil)
	raw, _ := json.Marshal(body(testModel, true))
	status, response := creditStreamRequest(t, e, raw)
	e.record()
	if status != 200 || !strings.Contains(string(response), token) || strings.Contains(string(response), "event: error") {
		t.Fatalf("a valid stream form was refused: %d %s", status, response)
	}
	registry.mu.Lock()
	defer registry.mu.Unlock()
	if registry.rows[hash].TokenHash != hash {
		t.Fatal("the credit of a CRLF stream was not recorded")
	}
}

// A credit that cannot be confirmed ends the stream with its error event and
// a clean end, not a cut connection a client would retry (audit r3 P2-1); the
// token never reaches the client and the attempt is recorded as failed.
func TestFallbackCreditUnconfirmedStreamEndsCleanly(t *testing.T) {
	e, _, _ := resourceTestEnv(t)
	e.gw.d.Credits = &memoryCredits{rows: map[string]core.FallbackCredit{}}
	token := "fixture-credit-token"
	stream := "event: message_start\ndata: " + creditStreamMessageStart("msg_unconfirmed") + "\n\n" +
		"event: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"refusal\",\"stop_details\":{\"fallback_credit_token\":\"" + token + "\"}},\"usage\":{\"output_tokens\":2}}\n\n" +
		"event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"
	creditStreamUpstream(t, e, stream, "", nil)
	raw, _ := json.Marshal(body(testModel, true))
	status, response := creditStreamRequest(t, e, raw)
	rec := e.record()
	if status != 200 || strings.Contains(string(response), token) || !strings.HasSuffix(string(response), "\n\n") || !strings.Contains(string(response), "event: error") {
		t.Fatalf("unconfirmed credit answered %d %q", status, response)
	}
	if rec.Success {
		t.Fatal("an unconfirmed credit was recorded as a success")
	}
}

// What holds a stream back is a token the claim reads, not the words: an
// answer that only mentions fallback_credit_token is relayed as it arrives
// (audit r3 P2-4).
func TestFallbackCreditStreamHoldsOnlyAToken(t *testing.T) {
	e, _, _ := resourceTestEnv(t)
	e.gw.d.Credits = &memoryCredits{rows: map[string]core.FallbackCredit{}}
	release := make(chan struct{})
	defer close(release)
	stream := "event: message_start\ndata: " + creditStreamMessageStart("msg_words") + "\n\n" +
		"event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"the fallback_credit_token field\"}}\n\n" +
		"<release>event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"
	creditStreamUpstream(t, e, stream, "", release)
	raw, _ := json.Marshal(body(testModel, true))
	req, _ := http.NewRequest("POST", e.srv.URL+"/v1/messages", bytes.NewReader(raw))
	req.Header.Set("X-Api-Key", testKey)
	req.Header.Set("Anthropic-Beta", "fallback-credit-2026-07-01")
	req.Header.Set("Content-Type", "application/json")
	read := make(chan string, 1)
	go func() {
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			read <- ""
			return
		}
		defer resp.Body.Close()
		var got bytes.Buffer
		buffer := make([]byte, 4096)
		for !strings.Contains(got.String(), "the fallback_credit_token field") {
			n, err := resp.Body.Read(buffer)
			got.Write(buffer[:n])
			if err != nil {
				break
			}
		}
		read <- got.String()
	}()
	select {
	case got := <-read:
		if !strings.Contains(got, "the fallback_credit_token field") {
			t.Fatalf("the mention was not relayed: %q", got)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("an answer that only mentions the field was held until its end")
	}
}

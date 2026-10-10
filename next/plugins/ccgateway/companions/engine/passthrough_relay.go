package engine

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
)

// The outbound relay in passthrough: requests and responses go through as the
// CLI and the API wrote them. The relay only reads, for the gateway:
//   - the status, the provider facts (rate-limit headers, request ID) and the
//     body of an upstream error, which the client receives as sent;
//   - the CLI's request, for the request log when the account keeps one, and
//     to check that a native tool still has the client's definition (else the
//     run is redone with the tool under the gateway's MCP name) and, with
//     client safeguards, that the tool identities are unchanged.
//
// The CLI does not retry (CLAUDE_CODE_MAX_RETRIES=0). After an upstream error
// the relay forwards no further model request of the run unless the Mod moves
// to the next fallback model, so a CLI recovery that reshapes the request
// never reaches the API.

type passthroughKey struct{}
type passthroughExchange struct{ model bool }

// servePassthrough forwards one request of the inner CLI unchanged.
func (relay *outboundRelay) servePassthrough(w http.ResponseWriter, r *http.Request, req *Request, forward http.Handler) {
	model := r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/messages")
	if model && (relay.isStopped() || relay.passthroughBlocked()) {
		apiError(w, 400, "invalid_request_error", relayRefusedMessage)
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<20))
	if err != nil {
		apiError(w, 413, "request_too_large", "Request exceeds the relay limit")
		return
	}
	relay.mu.Lock()
	relay.sequence++
	sequence := relay.sequence
	relay.mu.Unlock()
	if req.diagnostic.enabled() {
		prefix := "upstream-" + uuid()
		r = r.WithContext(context.WithValue(r.Context(), traceExchangeKey{}, traceExchange{req.diagnostic, prefix}))
		req.diagnostic.trace("upstream_request", Object{"exchange": prefix, "model": model})
		req.diagnostic.artifact(prefix+"-request-headers.json", safeHeaders(r.Header))
		// The CLI's own request is the one upstream receives.
		req.diagnostic.save(fmt.Sprintf("upstream-request-%03d-%s.body", sequence, uuid()[:8]), body)
	}
	if model {
		if err := relay.checkPassthroughTools(req, body); err != nil {
			var unavailable *nativeToolAvailabilityError
			relay.mu.Lock()
			if errors.As(err, &unavailable) {
				unavailable.RetrySafe = !relay.modelForwarded
			}
			if relay.failure == nil {
				relay.failure = &requestRefusal{fmt.Errorf("cannot forward the upstream request: %w", err)}
			}
			relay.mu.Unlock()
			relay.stop(r)
			apiError(w, 400, "invalid_request_error", relayRefusedMessage)
			return
		}
		relay.mu.Lock()
		relay.modelForwarded = true
		relay.mu.Unlock()
		r = r.WithContext(context.WithValue(r.Context(), providerResponseKey{}, req.responseFacts))
	}
	r = r.WithContext(context.WithValue(r.Context(), passthroughKey{}, &passthroughExchange{model: model}))
	r.Body = io.NopCloser(bytes.NewReader(body))
	forward.ServeHTTP(w, r)
}

// checkPassthroughTools reads the CLI's model request: every native tool must
// carry the client's definition (a shell tool may differ in its timeout
// numbers only), and client safeguards need unchanged tool identities. It
// changes nothing that is forwarded.
func (relay *outboundRelay) checkPassthroughTools(req *Request, body []byte) error {
	message, err := decodeObject(body)
	if err != nil {
		return nil
	}
	if err := verifyNativeWireTools(req, message); err != nil {
		return err
	}
	if req.Plan != nil && len(req.Plan.fields["safeguards"]) > 0 {
		return req.validateSafeguardTools(message)
	}
	return nil
}

// observePassthrough reads an upstream answer without changing it.
func (relay *outboundRelay) observePassthrough(resp *http.Response, exchange *passthroughExchange) error {
	if tr, ok := resp.Request.Context().Value(traceExchangeKey{}).(traceExchange); ok {
		tr.diagnostic.artifact(tr.prefix+"-response.json", Object{"status": resp.StatusCode, "headers": safeHeaders(resp.Header)})
		tr.diagnostic.trace("upstream_response", Object{"exchange": tr.prefix, "status": resp.StatusCode})
		resp.Body = &traceReader{ReadCloser: resp.Body, diagnostic: tr.diagnostic, name: tr.prefix + "-response.body"}
	}
	if !exchange.model {
		return nil
	}
	if facts, _ := resp.Request.Context().Value(providerResponseKey{}).(*providerResponseFacts); facts != nil && resp.StatusCode >= 200 && resp.StatusCode < 300 {
		facts.mu.Lock()
		facts.header = clientFacts(resp.Header)
		facts.mu.Unlock()
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		raw, err := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
		resp.Body.Close()
		resp.Body = io.NopCloser(bytes.NewReader(raw))
		if err != nil {
			return err
		}
		upstream := &upstreamError{Status: resp.StatusCode, ContentType: resp.Header.Get("Content-Type"), Headers: clientFacts(resp.Header)}
		encoding := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Encoding")))
		if upstream.Body = decodeContent(raw, encoding); upstream.Body == nil {
			// Not decodable here: the client gets the bytes with their encoding.
			upstream.Body = raw
			upstream.Headers.Set("Content-Encoding", resp.Header.Get("Content-Encoding"))
		}
		relay.recordUpstream(upstream)
		return nil
	}
	if strings.HasPrefix(resp.Header.Get("Content-Type"), "text/event-stream") && resp.Header.Get("Content-Encoding") == "" {
		headers := clientFacts(resp.Header)
		observe := relay.observeEvent
		resp.Body = &sseObserver{body: resp.Body, onEvent: observe, onError: func(payload []byte) {
			status := 500
			if decoded, err := decodeObject(payload); err == nil {
				inner, _ := decoded["error"].(Object)
				status = errorTypeStatus(str(inner, "type"))
			}
			relay.recordUpstream(&upstreamError{Status: status, ContentType: "application/json", Body: append([]byte(nil), payload...), Headers: headers})
		}}
	}
	return nil
}

// clientFacts are the provider facts the client receives: request ID and
// retry hints, never the subscription's own limits (anthropic-ratelimit-
// unified-*), which describe the gateway's account, not the client's.
func clientFacts(h http.Header) http.Header {
	out := httpfacts.Select(h)
	for name := range out {
		if strings.HasPrefix(strings.ToLower(name), "anthropic-ratelimit-unified-") {
			delete(out, name)
		}
	}
	return out
}

// decodeContent is the body without its content coding; nil when the coding
// is not one the relay reads.
func decodeContent(raw []byte, encoding string) []byte {
	var reader io.Reader
	switch encoding {
	case "", "identity":
		return raw
	case "gzip", "x-gzip":
		gz, err := gzip.NewReader(bytes.NewReader(raw))
		if err != nil {
			return nil
		}
		reader = gz
	case "deflate":
		reader = flate.NewReader(bytes.NewReader(raw))
	default:
		return nil
	}
	out, err := io.ReadAll(io.LimitReader(reader, 32<<20))
	if err != nil {
		return nil
	}
	return out
}

// recordUpstream keeps the latest upstream error of the run (a fallback
// attempt replaces an earlier one) and holds further model requests.
func (relay *outboundRelay) recordUpstream(e *upstreamError) {
	relay.mu.Lock()
	defer relay.mu.Unlock()
	relay.upstream = e
	relay.blocked = true
}

func (relay *outboundRelay) passthroughBlocked() bool {
	relay.mu.Lock()
	defer relay.mu.Unlock()
	return relay.blocked
}

// allowFallback lets the Mod's next fallback model reach the API after an
// error the API's own fallback chain would also move on from: rate limits,
// overload and server errors, never a rejected request.
func (relay *outboundRelay) allowFallback() bool {
	relay.mu.Lock()
	defer relay.mu.Unlock()
	if relay.upstream == nil || relay.stopped {
		return false
	}
	switch relay.upstream.Status {
	case 429, 500, 502, 503, 504, 529:
		relay.blocked = false
		return true
	}
	return false
}

// sseObserver passes a model stream through byte for byte and reports its
// error events, and every event's data to onEvent when set.
type sseObserver struct {
	body    io.ReadCloser
	pending []byte
	onError func(payload []byte)
	onEvent func(data Object)
}

func (s *sseObserver) Read(p []byte) (int, error) {
	n, err := s.body.Read(p)
	if n > 0 {
		s.pending = append(s.pending, p[:n]...)
		for {
			end, size := sseEventEnd(s.pending)
			if end < 0 {
				break
			}
			if payload, failed := sseErrorPayload(s.pending[:end+size]); failed {
				s.onError(payload)
			} else if s.onEvent != nil {
				if data := sseData(s.pending[:end+size]); data != nil {
					s.onEvent(data)
				}
			}
			s.pending = s.pending[end+size:]
		}
		if len(s.pending) > 16<<20 {
			// One event this large is never an error event; stop looking.
			s.pending = s.pending[:0]
		}
	}
	return n, err
}

func (s *sseObserver) Close() error { return s.body.Close() }

// sseData is an event's data as an object; nil when it is not one.
func sseData(event []byte) Object {
	var data [][]byte
	for _, line := range bytes.Split(bytes.ReplaceAll(event, []byte("\r\n"), []byte("\n")), []byte("\n")) {
		if v, ok := bytes.CutPrefix(bytes.TrimSuffix(line, []byte("\r")), []byte("data:")); ok {
			data = append(data, bytes.TrimPrefix(v, []byte(" ")))
		}
	}
	decoded, err := decodeObject(bytes.Join(data, []byte("\n")))
	if err != nil {
		return nil
	}
	return decoded
}

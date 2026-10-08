package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

type helperHistoryContextKey struct{}

type helperHistoryWriter struct {
	header     http.Header
	status     int
	body       bytes.Buffer
	err        error
	accounting helperAccounting
}

func (w *helperHistoryWriter) Header() http.Header { return w.header }
func (w *helperHistoryWriter) WriteHeader(status int) {
	if w.status == 0 {
		w.status = status
	}
}
func (w *helperHistoryWriter) Flush() {}
func (w *helperHistoryWriter) Write(p []byte) (int, error) {
	w.accounting.observe(w.header.Get("Content-Type"), p)
	if w.status == 0 {
		w.status = 200
	}
	if w.err != nil {
		return 0, w.err
	}
	if len(p) > helperhistory.MaxPayloadBytes-w.body.Len() {
		w.err = fmt.Errorf("helper public response exceeds bounded transport")
		return 0, w.err
	}
	return w.body.Write(p)
}

func (g *Gateway) serveHelperHistory(w http.ResponseWriter, r *http.Request) bool {
	present := false
	for name := range r.Header {
		if strings.EqualFold(name, helperhistory.Header) {
			present = true
		}
	}
	if !present {
		return false
	}
	if !g.authorized(r) {
		apiError(w, 401, "authentication_error", "Invalid Worker credential")
		return true
	}
	if !helperhistory.Enabled(r.Header) || r.Method != "POST" || r.URL.Path != "/v1/messages" {
		apiError(w, 400, "invalid_request_error", "Invalid helper history transport")
		return true
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, helperhistory.MaxEnvelopeBytes))
	if err != nil {
		apiError(w, 413, "request_too_large", "Helper history envelope exceeds limit")
		return true
	}
	envelope, err := helperhistory.DecodeRequest(raw)
	if err != nil {
		apiError(w, 400, "invalid_request_error", err.Error())
		return true
	}
	execution, err := newHelperHistoryExecution(envelope)
	if err != nil {
		apiError(w, 400, "invalid_request_error", err.Error())
		return true
	}
	if err := helperTransportCombinations(envelope.Request, r.Header); err != nil {
		apiError(w, 400, "invalid_request_error", err.Error())
		return true
	}
	var request struct {
		Model string `json:"model"`
	}
	_ = json.Unmarshal(envelope.Request, &request)
	policies := r.Header.Values("X-CCGateway-Request-Policy")
	if len(policies) != 1 {
		apiError(w, 400, "invalid_request_error", "Helper history requires one trusted policy")
		return true
	}
	namespace, err := helperhistory.Namespace(request.Model, g.Runner.Version, json.RawMessage(policies[0]))
	if err != nil || namespace != envelope.Namespace {
		apiError(w, 409, "invalid_request_error", "Helper history interpretation namespace changed")
		return true
	}
	busyKey := "helper-attempt-" + digest([]string{envelope.AttemptID, envelope.Identity.PrincipalID, envelope.Identity.Generation})
	if !g.occupy(busyKey) {
		apiError(w, 409, "invalid_request_error", "Helper history attempt is already running")
		return true
	}
	defer g.vacate(busyKey)
	// Reuse the issuer authority lease without granting any model resource IDs.
	h := http.Header{}
	h.Set(resources.ResourceOutputsHeader, "1")
	h.Set(resources.PrincipalHeader, envelope.Identity.PrincipalID)
	h.Set(resources.GenerationHeader, envelope.Identity.Generation)
	grant, err := g.admitResourceReferences(r.Context(), []byte(`{}`), h)
	if err != nil {
		apiError(w, 409, "invalid_request_error", "Helper history issuer binding could not be verified")
		return true
	}
	defer grant.close()
	execution.authenticated = true
	inner := r.Clone(context.WithValue(r.Context(), helperHistoryContextKey{}, execution))
	inner.Header = r.Header.Clone()
	inner.Header.Del(helperhistory.Header)
	inner.Header.Set("Content-Type", "application/json")
	inner.Header.Del("Content-Length")
	inner.Header.Del("Content-Encoding")
	inner.Body = io.NopCloser(bytes.NewReader(envelope.Request))
	inner.ContentLength = int64(len(envelope.Request))
	buffer := &helperHistoryWriter{header: http.Header{}}
	g.ServeHTTP(buffer, inner)
	delta, captureErr := execution.exportDelta()
	if buffer.err != nil {
		captureErr = buffer.err
	}
	status := buffer.status
	if status == 0 {
		status = 200
	}
	contentType := buffer.header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}
	response := helperhistory.ResponseEnvelope{Version: helperhistory.Version, PayloadVersion: envelope.PayloadVersion, AttemptID: envelope.AttemptID, RequestDigest: envelope.RequestDigest, Namespace: envelope.Namespace, Identity: grant.identity, StatusCode: status, ContentType: contentType, Headers: httpfacts.Select(buffer.header), Body: buffer.body.Bytes(), Delta: delta}
	if captureErr != nil {
		response.Failure = helperhistory.FailureCapture
		response.Delta = nil
		response.Accounting = execution.failureAccounting(buffer.accounting.evidence)
		if buffer.err != nil {
			response.Body = nil
		}
	}
	if status >= 400 && response.Accounting == nil {
		response.Accounting = execution.failureAccounting(buffer.accounting.evidence)
	}
	if err := response.Validate(); err != nil {
		apiError(w, 502, "gateway_helper_history", "Invalid helper response envelope")
		return true
	}
	w.Header().Set("Content-Type", helperhistory.ContentType)
	w.WriteHeader(200)
	_ = json.NewEncoder(w).Encode(response)
	return true
}

func helperTransportCombinations(raw []byte, headers http.Header) error {
	refs, err := resources.ScanReferences(raw)
	if err != nil || len(refs) != 0 {
		return fmt.Errorf("helper history cannot yet combine resource references")
	}
	var body map[string]json.RawMessage
	if err := json.Unmarshal(raw, &body); err != nil {
		return err
	}
	for _, name := range []string{"container", "mcp_servers", "fallbacks", "fallback_credit_token"} {
		if value := body[name]; len(value) != 0 && string(value) != "null" {
			return fmt.Errorf("helper history cannot yet combine %s", name)
		}
	}
	for name := range headers {
		lower := strings.ToLower(name)
		if strings.HasPrefix(lower, "x-ccgateway-fallback-credit") || strings.HasPrefix(lower, "x-ccgateway-resource-") && !strings.EqualFold(name, resources.PrincipalHeader) && !strings.EqualFold(name, resources.GenerationHeader) {
			return fmt.Errorf("helper history cannot combine resource or credit authority grants")
		}
	}
	return nil
}

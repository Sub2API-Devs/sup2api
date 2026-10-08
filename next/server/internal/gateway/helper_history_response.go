package gateway

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/gin-gonic/gin"
)

// The client cannot observe bytes until the history and usage transaction commits.
type helperResponseWriter struct {
	gin.ResponseWriter
	header            http.Header
	body              bytes.Buffer
	status            int
	written, overflow bool
}

func newHelperResponseWriter(w gin.ResponseWriter) *helperResponseWriter {
	return &helperResponseWriter{ResponseWriter: w, header: w.Header().Clone(), status: http.StatusOK}
}
func (w *helperResponseWriter) Header() http.Header { return w.header }
func (w *helperResponseWriter) WriteHeader(code int) {
	if !w.written {
		w.status = code
	}
}
func (w *helperResponseWriter) WriteHeaderNow() { w.written = true }
func (w *helperResponseWriter) Write(p []byte) (int, error) {
	w.written = true
	if w.body.Len()+len(p) > wire.MaxPayloadBytes {
		w.overflow = true
		return 0, fmt.Errorf("helper public response too large")
	}
	return w.body.Write(p)
}
func (w *helperResponseWriter) WriteString(s string) (int, error) { return w.Write([]byte(s)) }
func (w *helperResponseWriter) Flush()                            { w.WriteHeaderNow() }
func (w *helperResponseWriter) Status() int                       { return w.status }
func (w *helperResponseWriter) Size() int {
	if !w.written {
		return -1
	}
	return w.body.Len()
}
func (w *helperResponseWriter) Written() bool { return w.written }
func (w *helperResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	return nil, nil, fmt.Errorf("helper custody cannot upgrade the connection")
}
func (w *helperResponseWriter) Pusher() http.Pusher { return nil }

func (c *call) unwrapHelperHistoryResponse(resp *http.Response, rt *typeRoute) error {
	h := c.helperHistory
	if h == nil || !h.dispatched {
		return nil
	}
	if !strings.HasPrefix(resp.Header.Get("Content-Type"), wire.ContentType) {
		return fmt.Errorf("Worker did not return custody envelope")
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, wire.MaxEnvelopeBytes+1))
	closeErr := resp.Body.Close()
	if err != nil || closeErr != nil || len(raw) > wire.MaxEnvelopeBytes {
		return fmt.Errorf("incomplete helper envelope")
	}
	e, err := wire.DecodeResponse(raw)
	if err != nil {
		return err
	}
	expected := h.envelope
	if e.EffectivePayloadVersion() != expected.EffectivePayloadVersion() {
		return fmt.Errorf("helper response payload selection changed")
	}
	if e.AttemptID != expected.AttemptID || e.RequestDigest != expected.RequestDigest || e.Namespace != expected.Namespace || e.Identity.PrincipalID != expected.Identity.PrincipalID || e.Identity.Generation != expected.Identity.Generation {
		return fmt.Errorf("helper response identity changed")
	}
	h.response = &e
	resp.StatusCode = e.StatusCode
	resp.Status = http.StatusText(e.StatusCode)
	resp.Header = e.Headers.Clone()
	if resp.Header == nil {
		resp.Header = make(http.Header)
	}
	resp.Header.Set("Content-Type", e.ContentType)
	resp.Header.Del("Content-Length")
	resp.Header.Del("Content-Encoding")
	resp.TransferEncoding = nil
	resp.ContentLength = int64(len(e.Body))
	resp.Body = io.NopCloser(bytes.NewReader(e.Body))
	if e.Failure != "" {
		c.applyHelperAccounting(e.Accounting, rt)
		return fmt.Errorf("Worker could not capture complete helper history")
	}
	if e.StatusCode >= 300 {
		if e.Accounting != nil {
			c.applyHelperAccounting(e.Accounting, rt)
		} else {
			c.applyHelperBodyAccounting(e.Body, isSSE(e.ContentType), rt)
		}
	}
	return nil
}

func (c *call) applyHelperBodyAccounting(body []byte, sse bool, rt *typeRoute) {
	events, _ := resourceResponseEvents(body, sse)
	frames := make([]json.RawMessage, 0, len(events))
	for _, e := range events {
		frames = append(frames, e.data)
	}
	if len(frames) > 0 {
		c.applyHelperAccounting(&wire.AccountingEvidence{Source: wire.AccountingPublic, SSE: sse, Known: true, Frames: frames}, rt)
	}
}
func (c *call) applyHelperAccounting(a *wire.AccountingEvidence, rt *typeRoute) {
	if a == nil || !a.Known {
		c.rec.BillingError = "helper response usage is unknown"
		return
	}
	if !a.Complete {
		c.rec.BillingError = "helper response usage is incomplete"
	}
	calls := a.Calls
	if a.Source != wire.AccountingProviderCalls {
		calls = []wire.AccountingCall{{SSE: a.SSE, Complete: a.Complete, Frames: a.Frames}}
	}
	c.rec.Replacement = nil
	for _, call := range calls {
		u := newUsageAcc(rt.usage)
		for _, frame := range call.Frames {
			if call.SSE {
				u.ApplySSE("", frame)
			} else {
				u.ApplyJSON(frame)
			}
		}
		if a.Source != wire.AccountingProviderCalls {
			c.rec.Tokens = u.Tokens()
			c.rec.Metrics = u.Metrics
			continue
		}
		// Preserve each call's categorical facts and price inputs; do not sum
		// categorical values or also charge the public aggregate.
		if u.Model != "" && u.Model != c.rec.UpstreamModel && u.Model != c.model {
			c.rec.BillingError = "helper provider accounting model differs from authorized model"
		}
		c.rec.Replacement = append(c.rec.Replacement, core.PricedUsage{Kind: "helper_round", Model: c.rec.UpstreamModel, Price: c.rec.Price, UsageSemantics: c.rec.UsageSemantics, Tokens: u.Tokens(), Metrics: u.Metrics, PriceParams: c.rec.PriceParams, PriceHeaders: c.rec.PriceHeaders, RateMultiplier: c.rec.RateMultiplier})
	}
}

func helperDeliveredPrefix(messages []json.RawMessage, body []byte, sse bool) (string, error) {
	raw := body
	if sse {
		events, err := resourceResponseEvents(body, true)
		if err != nil {
			return "", err
		}
		frames := make([][]byte, 0, len(events))
		for _, e := range events {
			frames = append(frames, e.data)
		}
		raw, err = credits.MessageFromEvents(frames)
		if err != nil {
			return "", err
		}
	}
	if _, err := wire.CanonicalDigest(raw); err != nil {
		return "", err
	}
	var m struct {
		Type, Role, ID string
		Content        json.RawMessage
		StopReason     *string `json:"stop_reason"`
	}
	if err := json.Unmarshal(raw, &m); err != nil {
		return "", err
	}
	if m.Type != "message" || m.Role != "assistant" || m.ID == "" || m.StopReason == nil || *m.StopReason == "" || len(m.Content) == 0 || m.Content[0] != '[' {
		return "", fmt.Errorf("public assistant response is incomplete")
	}
	assistant, err := json.Marshal(struct {
		Role    string          `json:"role"`
		Content json.RawMessage `json:"content"`
	}{"assistant", m.Content})
	if err != nil {
		return "", err
	}
	history := append(append([]json.RawMessage(nil), messages...), assistant)
	raw, err = json.Marshal(history)
	if err != nil {
		return "", err
	}
	return wire.CanonicalDigest(raw)
}

func (c *call) finishHelperHistory() {
	h := c.helperHistory
	if h == nil || !h.dispatched || h.held == nil {
		return
	}
	held := h.held
	original := held.ResponseWriter
	defer func() { c.c.Writer = original }()
	ctx, cancel := context.WithTimeout(context.WithoutCancel(c.c.Request.Context()), 15*time.Second)
	defer cancel()
	if p := c.usage; p != nil {
		c.usage = nil
		c.extractUsage(ctx, p)
		c.countTokens(ctx, p.accountID)
	}
	if !c.rec.Success && h.response != nil && h.response.Accounting != nil {
		c.applyHelperAccounting(h.response.Accounting, h.rt)
	}
	c.rec.LatencyMs = int(c.g.now().Sub(c.start) / time.Millisecond)
	if c.rec.StatusCode == 0 {
		c.rec.StatusCode = held.Status()
	}
	if h.response == nil {
		c.rec.BillingError = "helper transport outcome and usage are unknown"
	}
	valid := c.rec.Success && c.c.Request.Context().Err() == nil && !held.overflow && h.response != nil && h.response.Failure == ""
	prefix := ""
	var err error
	if valid {
		prefix, err = helperDeliveredPrefix(h.messages, held.body.Bytes(), isSSE(held.header.Get("Content-Type")))
		valid = err == nil
	}
	if c.rec.Success && !valid {
		c.rec = core.HelperHistoryStorageFailure(c.rec)
	}
	c.finalizeBillability(ctx, c.rec, c.ep.Billing)
	if valid {
		_, err = c.g.d.HelperHistory.Commit(ctx, c.resourceOwner(), h.attempt.ID, core.HelperHistoryCompletion{Usage: c.rec, PublicPrefixDigest: prefix, Payload: h.response.Delta})
		if err != nil {
			c.rec = core.HelperHistoryStorageFailure(c.rec)
			recoveryCtx, recoveryCancel := context.WithTimeout(context.WithoutCancel(c.c.Request.Context()), 15*time.Second)
			err = c.g.d.HelperHistory.PersistUncertainUsage(recoveryCtx, c.resourceOwner(), h.attempt.ID, c.rec)
			recoveryCancel()
		}
	} else {
		err = c.g.d.HelperHistory.PersistUncertainUsage(ctx, c.resourceOwner(), h.attempt.ID, c.rec)
	}
	if err != nil {
		c.rec = core.HelperHistoryStorageFailure(c.rec)
		slog.ErrorContext(ctx, "gateway: helper usage not durably recorded", "request_id", c.rid, "account", h.attempt.Binding.AccountID, "error", err)
	} else {
		c.helperPersisted = true
	}
	c.c.Writer = original
	if c.rec.ErrorType == "gateway_helper_history_storage" || held.overflow {
		writeError(c.c, c.format, &gwError{Status: 503, Code: "gateway_helper_history_storage", Message: "helper history could not be durably committed"})
		return
	}
	if c.c.Request.Context().Err() != nil {
		return
	}
	for k := range original.Header() {
		original.Header().Del(k)
	}
	for k, vs := range held.header {
		original.Header()[k] = append([]string(nil), vs...)
	}
	original.Header().Del("Content-Length")
	original.Header().Del("Content-Encoding")
	original.WriteHeader(held.status)
	_, _ = original.Write(held.body.Bytes())
}

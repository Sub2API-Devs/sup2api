package moderation

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Channel types (channels.type) and LLM protocols (channels.protocol).
const (
	ChannelOpenAI   = "openai_moderation"
	ChannelTypeSafe = "typesafe"
	ChannelLLM      = "llm"

	ProtocolOpenAIChat = "openai_chat"
)

// defaultChannelTimeoutMs per type (CONTRACTS §72.6).
var defaultChannelTimeoutMs = map[string]int{ChannelOpenAI: 3000, ChannelTypeSafe: 8000, ChannelLLM: 15000}

// defaultChannelModel per type ("" = required).
var defaultChannelModel = map[string]string{ChannelOpenAI: "omni-moderation-latest", ChannelTypeSafe: "jev-latest"}

// liveChannel is a usable channel of the snapshot: enabled, key opened.
type liveChannel struct {
	ID       int64
	Name     string
	Type     string
	Protocol string
	BaseURL  string
	Key      string
	Model    string
	// BillingModel is the model the calls are priced on ("" = Model).
	BillingModel string
	Timeout      time.Duration
	// ttft is the first-byte timeout (ttft_timeout_ms); nil or 0 = none.
	ttft      func() time.Duration
	markerKey []byte // llm only: self-request marker key
	client    *http.Client
}

const (
	maxJSONResponse = 4 << 20
	drainLimit      = 4 << 10
)

// UpstreamError is a non-2xx answer. message is the error text of the body
// with the key removed; it may echo user input, so it is only shown by the
// channel test and never stored.
type UpstreamError struct {
	Status     int
	message    string
	tooLarge   bool
	retryAfter time.Duration
}

func (e *UpstreamError) Error() string { return fmt.Sprintf("upstream returned status %d", e.Status) }

type networkError struct{ err error }

func (e *networkError) Error() string { return "network: " + e.err.Error() }
func (e *networkError) Unwrap() error { return e.err }

var (
	// ErrNoInput: nothing the engine can send (no text, no sendable image);
	// the auditor is skipped.
	ErrNoInput          = errors.New("input has no text and no image the engine can send")
	errNoChannel        = errors.New("moderation channel is disabled, deleted or misconfigured")
	errAuditorMissing   = errors.New("auditor referenced by the flow no longer exists")
	errAuditorPanic     = errors.New("auditor panicked")
	errTimeout          = errors.New("timeout")
	errTTFTTimeout      = errors.New("no first byte within ttft_timeout_ms")
	errEmptyResult      = errors.New("upstream returned no result")
	errBadScores        = errors.New("upstream result is incomplete or out of range")
	errResponseTooLarge = errors.New("upstream response too large")
)

// Error type codes written to traces.
const (
	ErrTypeTimeout        = "timeout"
	ErrTypeTTFTTimeout    = "ttft_timeout"
	ErrTypeUpstreamError  = "upstream_error"
	ErrTypeNetwork        = "network"
	ErrTypeBadResponse    = "bad_response"
	ErrTypeNoChannel      = "no_channel"
	ErrTypeAuditorMissing = "auditor_missing"
	ErrTypePanic          = "panic"
	ErrTypeCanceled       = "canceled"
)

// ErrType maps an error to its type code; unknown errors are bad responses.
func ErrType(err error) string {
	switch {
	case err == nil:
		return ""
	case errors.Is(err, errTTFTTimeout):
		return ErrTypeTTFTTimeout
	case errors.Is(err, errTimeout), errors.Is(err, context.DeadlineExceeded):
		return ErrTypeTimeout
	case errors.Is(err, context.Canceled):
		return ErrTypeCanceled
	case errors.Is(err, errNoChannel):
		return ErrTypeNoChannel
	case errors.Is(err, errAuditorMissing):
		return ErrTypeAuditorMissing
	case errors.Is(err, errAuditorPanic):
		return ErrTypePanic
	}
	var up *UpstreamError
	if errors.As(err, &up) {
		return ErrTypeUpstreamError
	}
	var ne *networkError
	if errors.As(err, &ne) {
		return ErrTypeNetwork
	}
	return ErrTypeBadResponse
}

func upstreamStatus(err error) int {
	var up *UpstreamError
	if errors.As(err, &up) {
		return up.Status
	}
	return 0
}

// Engine endpoints.
const (
	pathModerations = "/v1/moderations"
	pathSystemOne   = "/v1/systemone"
)

// endpoint is the URL the calls of ch go to.
func (ch *liveChannel) endpoint() string {
	switch ch.Type {
	case ChannelOpenAI:
		return joinURL(ch.BaseURL, pathModerations)
	case ChannelTypeSafe:
		return joinURL(ch.BaseURL, pathSystemOne)
	}
	return joinURL(ch.BaseURL, protocolOf(ch).path)
}

// joinURL appends path ("/v1/...") to base, dropping a duplicated /v1.
func joinURL(base, path string) string {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	if strings.HasSuffix(base, "/v1") && strings.HasPrefix(path, "/v1/") {
		return base + path[3:]
	}
	return base + path
}

// firstByte is the time-to-first-byte timer of one upstream call (new-api
// upstream.go): when it fires the call is canceled with errTTFTTimeout. A
// JSON call arrives with the response headers, a streaming call with the
// first model output event.
type firstByte struct{ timer *time.Timer }

// withFirstByte derives the call context of ch; release stops the timer
// and the context.
func withFirstByte(ctx context.Context, ch *liveChannel) (_ context.Context, _ *firstByte, release func()) {
	ctx, cancel := context.WithCancelCause(ctx)
	fb := &firstByte{}
	if ch.ttft != nil {
		if d := ch.ttft(); d > 0 {
			fb.timer = time.AfterFunc(d, func() { cancel(errTTFTTimeout) })
		}
	}
	return ctx, fb, func() { fb.arrived(); cancel(nil) }
}

// ttftTimeout is the current ttft_timeout_ms (channels read it per call).
func (p *Plugin) ttftTimeout() time.Duration { return p.cfg.Load().ttft }

func (f *firstByte) arrived() {
	if f != nil && f.timer != nil {
		f.timer.Stop()
	}
}

// callJSON posts body to {base}{path} and decodes a 2xx JSON answer (at most
// 4 MiB) into out. ctx carries the call timeout.
func callJSON(ctx context.Context, ch *liveChannel, path string, header map[string]string, body, out any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	ctx, fb, release := withFirstByte(ctx, ch)
	defer release()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, joinURL(ch.BaseURL, path), bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if ch.Key != "" {
		req.Header.Set("Authorization", "Bearer "+ch.Key)
	}
	for k, v := range header {
		req.Header.Set(k, v)
	}
	client := ch.client
	if client == nil {
		client = http.DefaultClient
	}
	resp, err := client.Do(req)
	if err != nil {
		return ctxErr(ctx, &networkError{err})
	}
	fb.arrived()
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		head, _ := io.ReadAll(io.LimitReader(resp.Body, drainLimit))
		return &UpstreamError{Status: resp.StatusCode, message: upstreamMessage(head, ch.Key),
			tooLarge: resp.StatusCode == http.StatusRequestEntityTooLarge ||
				resp.StatusCode == http.StatusBadRequest && bytes.Contains(head, []byte("max_tokens_exceeded"))}
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxJSONResponse+1))
	if err != nil {
		return ctxErr(ctx, &networkError{err})
	}
	if len(data) > maxJSONResponse {
		return errResponseTooLarge
	}
	if err := json.Unmarshal(data, out); err != nil {
		return fmt.Errorf("invalid upstream JSON: %s", snippet(data, 200))
	}
	return nil
}

func ctxErr(ctx context.Context, err error) error {
	switch {
	case ctx.Err() == nil:
		return err
	case errors.Is(context.Cause(ctx), errTTFTTimeout):
		return errTTFTTimeout
	case errors.Is(ctx.Err(), context.DeadlineExceeded):
		return errTimeout
	}
	return context.Canceled
}

// upstreamMessage is the error text of an error body (error.message,
// message, detail or error), the key cut out, at most 300 runes.
func upstreamMessage(body []byte, key string) string {
	msg := strings.TrimSpace(string(body))
	var m map[string]any
	if json.Unmarshal(body, &m) == nil {
		if e, ok := m["error"].(map[string]any); ok {
			if s, ok := e["message"].(string); ok && s != "" {
				msg = s
			}
		} else {
			for _, k := range []string{"message", "detail", "error"} {
				if s, ok := m[k].(string); ok && s != "" {
					msg = s
					break
				}
			}
		}
	}
	if key != "" {
		msg = strings.ReplaceAll(msg, key, "…")
	}
	return truncateRunes(msg, 300)
}

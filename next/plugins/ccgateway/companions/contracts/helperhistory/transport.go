package helperhistory

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

const Header = "X-CCGateway-Helper-History"
const ContentType = "application/vnd.ccgateway.helper-history+json"
const MaxEnvelopeBytes = 80 << 20
const FailureCapture = "capture_failed"
const MaxAccountingBytes = 1 << 20

// Frames are projections of actually observed public-output usage, after any
// internal-round aggregation. They are not estimated token counts. A capture
// failure with unknown usage must explicitly say Known=false, Complete=false.
const AccountingPublic = "public"
const AccountingProviderCalls = "provider_calls"

type AccountingCall struct {
	SSE      bool              `json:"sse"`
	Complete bool              `json:"complete"`
	Frames   []json.RawMessage `json:"frames"`
}
type AccountingEvidence struct {
	Source   string            `json:"source,omitempty"`
	Calls    []AccountingCall  `json:"calls,omitempty"`
	SSE      bool              `json:"sse"`
	Known    bool              `json:"known"`
	Complete bool              `json:"complete"`
	Frames   []json.RawMessage `json:"frames"`
}

type RequestEnvelope struct {
	Version       int                `json:"version"`
	AttemptID     string             `json:"attempt_id"`
	RequestDigest string             `json:"request_digest"`
	Namespace     string             `json:"namespace"`
	Identity      resources.Identity `json:"identity"`
	Request       json.RawMessage    `json:"request"`
	History       []json.RawMessage  `json:"history"`
}

type ResponseEnvelope struct {
	Version       int                 `json:"version"`
	AttemptID     string              `json:"attempt_id"`
	RequestDigest string              `json:"request_digest"`
	Namespace     string              `json:"namespace"`
	Identity      resources.Identity  `json:"identity"`
	StatusCode    int                 `json:"status_code"`
	ContentType   string              `json:"content_type"`
	Headers       http.Header         `json:"headers"`
	Body          []byte              `json:"body"`
	Delta         json.RawMessage     `json:"delta"`
	Failure       string              `json:"failure,omitempty"`
	Accounting    *AccountingEvidence `json:"accounting,omitempty"`
}

func validTransportIdentity(version int, attempt, digest, namespace string, identity resources.Identity) bool {
	return version == Version && transportText(attempt, 256) && ValidDigest(digest) && transportText(namespace, 256) && transportText(identity.PrincipalID, 256) && transportText(identity.Generation, 256)
}
func transportText(s string, n int) bool {
	return s != "" && len(s) <= n && !strings.ContainsAny(s, "\x00\r\n")
}

func (e RequestEnvelope) Validate() error {
	if !validTransportIdentity(e.Version, e.AttemptID, e.RequestDigest, e.Namespace, e.Identity) || len(e.Request) == 0 || len(e.Request) > MaxPayloadBytes || len(e.History) > MaxChainDepth {
		return fmt.Errorf("invalid helper request envelope")
	}
	d, err := CanonicalDigest(e.Request)
	if err != nil || d != e.RequestDigest {
		return fmt.Errorf("helper request digest mismatch")
	}
	if bytes.TrimSpace(e.Request)[0] != '{' {
		return fmt.Errorf("helper request must be an object")
	}
	total := 0
	for _, raw := range e.History {
		total += len(raw)
		if total > MaxPayloadBytes {
			return fmt.Errorf("helper history exceeds transport limit")
		}
		if err := Validate(raw); err != nil {
			return err
		}
	}
	return nil
}
func (e ResponseEnvelope) Validate() error {
	if !validTransportIdentity(e.Version, e.AttemptID, e.RequestDigest, e.Namespace, e.Identity) || e.StatusCode < 200 || e.StatusCode > 599 || !transportText(e.ContentType, 256) || len(e.Body) > MaxPayloadBytes {
		return fmt.Errorf("invalid helper response envelope")
	}
	if e.Failure != "" && e.Failure != FailureCapture {
		return fmt.Errorf("unknown helper capture outcome")
	}
	if e.Failure != "" && e.Accounting == nil {
		return fmt.Errorf("capture failure requires explicit accounting evidence")
	}
	if e.Accounting != nil {
		if err := e.Accounting.Validate(); err != nil {
			return err
		}
	}
	if e.Failure == "" {
		if err := Validate(e.Delta); err != nil {
			return err
		}
	} else if len(e.Delta) != 0 && string(e.Delta) != "null" {
		return fmt.Errorf("failed capture cannot advertise history")
	}
	// Transport metadata is not an alternate credential or hop-by-hop channel.
	selected := httpfacts.Select(e.Headers)
	if !equalHeaders(e.Headers, selected) {
		return fmt.Errorf("unsafe helper response headers")
	}
	return nil
}

func (a AccountingEvidence) Validate() error {
	switch a.Source {
	case "", AccountingPublic:
		if len(a.Calls) != 0 {
			return fmt.Errorf("mixed helper accounting sources")
		}
	case AccountingProviderCalls:
		if a.SSE || len(a.Frames) != 0 || len(a.Calls) > 128 {
			return fmt.Errorf("mixed helper accounting sources")
		}
		for _, call := range a.Calls {
			if len(call.Frames) == 0 || a.Complete && !call.Complete {
				return fmt.Errorf("invalid provider accounting completeness")
			}
			a.Frames = append(a.Frames, call.Frames...)
		}
	default:
		return fmt.Errorf("unknown helper accounting source")
	}
	if a.Known != (len(a.Frames) > 0) || a.Complete && !a.Known || len(a.Frames) > 128 {
		return fmt.Errorf("invalid helper accounting completeness")
	}
	n := 0
	for _, frame := range a.Frames {
		n += len(frame)
		if n > MaxAccountingBytes {
			return fmt.Errorf("helper accounting evidence too large")
		}
		v, err := strictValue(frame)
		if err != nil {
			return err
		}
		if _, ok := v.(map[string]any); !ok {
			return fmt.Errorf("helper accounting frame must be object")
		}
	}
	return nil
}
func equalHeaders(a, b http.Header) bool {
	if len(a) != len(b) {
		return false
	}
	for k, vs := range a {
		got := b.Values(k)
		if len(vs) != len(got) {
			return false
		}
		for i, v := range vs {
			if v != got[i] {
				return false
			}
		}
	}
	return true
}
func decodeEnvelope(raw []byte, out any) error {
	if len(raw) == 0 || len(raw) > MaxEnvelopeBytes {
		return fmt.Errorf("helper envelope size invalid")
	}
	if _, err := strictValueBound(raw, MaxEnvelopeBytes); err != nil {
		return err
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	return d.Decode(out)
}
func DecodeRequest(raw []byte) (RequestEnvelope, error) {
	var e RequestEnvelope
	if err := decodeEnvelope(raw, &e); err != nil {
		return e, err
	}
	return e, e.Validate()
}
func DecodeResponse(raw []byte) (ResponseEnvelope, error) {
	var e ResponseEnvelope
	if err := decodeEnvelope(raw, &e); err != nil {
		return e, err
	}
	return e, e.Validate()
}

// Enabled requires exactly one canonical capability value; caller authentication
// is a separate Worker gate and this header alone never grants access.
func Enabled(h http.Header) bool {
	var values []string
	for k, v := range h {
		if strings.EqualFold(k, Header) {
			values = append(values, v...)
		}
	}
	return len(values) == 1 && values[0] == "1"
}

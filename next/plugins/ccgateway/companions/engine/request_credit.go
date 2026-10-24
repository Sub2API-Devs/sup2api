package engine

// Fallback credit receipts (2026-10-24 audit, P1).
//
// The core marks a request it tracks with credits.TrackingHeader and, for a
// redemption, binds the token's hash with credits.AdmissionHeader. The
// provider keeps final authority — the CLI forwards the client's own token
// upstream, which validates it — so the Worker stores no registry. What the
// Worker owes the core is evidence only:
//
//   - the verified issuer on every answer, and
//   - credits.ReadyHeader with the claim's token hash when the provider issued
//     a credit, a claim the core recomputes from the same bytes.
//
// A claim is known only once the message is complete, so a tracked response is
// buffered and committed only after the CLI succeeded.

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

// creditAdmissionTimeout bounds issuer verification; the authority itself stays
// held for the whole request.
const creditAdmissionTimeout = 30 * time.Second

var errCreditResponseTooLarge = errors.New("fallback credit response exceeds the receipt limit")

// requestCredit is one tracked request. The resource authority stays held while
// it answers, so a reauthorization cannot switch the issuer the core bound this
// request to, and the client's own body and betas are what its answer's claim
// is computed from.
type requestCredit struct {
	authority  *sync.Mutex
	clientBody []byte
	betas      []string
}

// release hands the resource authority back when the request finishes.
func (c *requestCredit) release() { c.authority.Unlock() }

// admitCredit is the header admission of a tracked request: the core's tracking
// mark with its registered beta, then the issuer its answer must name. A
// request the core did not track returns nil.
func (g *Gateway) admitCredit(w http.ResponseWriter, r *http.Request) (*requestCredit, *requestRefusal) {
	if len(r.Header.Values(credits.TrackingHeader)) == 0 && len(r.Header.Values(credits.AdmissionHeader)) == 0 {
		return nil, nil
	}
	if refusal := creditTrackingRefusal(r.Header); refusal != nil {
		return nil, refusal
	}
	if g.resources == nil {
		return nil, refuse(503, "api_error", "Fallback credit issuer verification unavailable")
	}
	ctx, cancel := context.WithTimeout(r.Context(), creditAdmissionTimeout)
	defer cancel()
	// The resource path's order (lock → slot): a request waiting for authority
	// never consumes a slot a resource request needs.
	if err := lockResourceAuthority(ctx, &g.resources.authority.mu); err != nil {
		return nil, refuse(503, "api_error", "Fallback credit issuer verification unavailable")
	}
	credit := &requestCredit{authority: &g.resources.authority.mu}
	if refusal := g.creditIssuer(ctx, w, r); refusal != nil {
		credit.release()
		return nil, refusal
	}
	return credit, nil
}

// creditTrackingRefusal reads the core's two credit headers: each at most once,
// tracking exactly "1", and the beta that registers the protocol.
func creditTrackingRefusal(h http.Header) *requestRefusal {
	tracking, admission := h.Values(credits.TrackingHeader), h.Values(credits.AdmissionHeader)
	if len(tracking) != 1 || tracking[0] != "1" || len(admission) > 1 || !credits.Enabled(h.Values("Anthropic-Beta")) {
		return refuse(400, "invalid_request_error", "Fallback credit requires trusted tracking and its registered beta")
	}
	return nil
}

// creditIssuer verifies the identity with a slot of its own, then puts the
// issuer on the answer, so every answer (the response or an error frame) proves
// it. The request must be bound to that same issuer.
func (g *Gateway) creditIssuer(ctx context.Context, w http.ResponseWriter, r *http.Request) *requestRefusal {
	if err := waitResourceSlot(ctx, g.Slots); err != nil {
		return refuse(503, "api_error", "Fallback credit issuer verification unavailable")
	}
	id, err := g.resources.identity(ctx)
	<-g.Slots
	if err != nil {
		typ := "api_error"
		if errors.Is(err, errManagedResourceIssuerMissing) {
			typ = resources.IdentityUnsupportedErrorType
		}
		return refuse(503, typ, err.Error())
	}
	w.Header().Set(resources.PrincipalHeader, id.PrincipalID)
	w.Header().Set(resources.GenerationHeader, id.Generation)
	if err := verifyExpectedResourceIdentity(r.Header, id); err != nil {
		return refuse(409, "invalid_request_error", err.Error())
	}
	return nil
}

// admitCreditBody binds the client's redemption to the admitted headers and,
// for a tracked request, keeps what its answer's claim is computed from. A
// token travels only with tracking, and an admission only with a token.
func (p *requestPlan) admitCreditBody(raw []byte, h http.Header) *requestRefusal {
	parameter, err := credits.ParseParameter(creditTokenValue(raw))
	if err != nil {
		return refuse(400, "invalid_request_error", err.Error())
	}
	admission := h.Get(credits.AdmissionHeader)
	switch {
	case !parameter.Present && admission != "":
		return refuse(400, "invalid_request_error", "Fallback credit admission requires a redemption token")
	case !parameter.Present:
	case p.credit == nil:
		return refuse(400, "invalid_request_error", "Fallback credit redemption requires trusted tracking")
	case admission != "":
		hash, _ := credits.TokenHash(parameter.Token)
		if hash != admission {
			return refuse(400, "invalid_request_error", "Fallback credit admission does not match the redemption token")
		}
	}
	if p.credit != nil {
		p.credit.clientBody = append([]byte(nil), raw...)
		p.credit.betas = append([]string(nil), h.Values("Anthropic-Beta")...)
	}
	return nil
}

// creditTokenValue is the body's fallback_credit_token as JSON, null when the
// body does not name it. Only a body that mentions the parameter is decoded; a
// body that cannot be read is the mode's own refusal, answered there.
func creditTokenValue(raw []byte) any {
	if !bytes.Contains(raw, []byte("fallback_credit_token")) {
		return nil
	}
	var body map[string]json.RawMessage
	if json.Unmarshal(raw, &body) != nil {
		return nil
	}
	field, exists := body["fallback_credit_token"]
	if !exists {
		return nil
	}
	decoder := json.NewDecoder(bytes.NewReader(field))
	decoder.UseNumber()
	var value any
	if decoder.Decode(&value) != nil {
		return nil
	}
	return value
}

// bufferCredit holds a tracked response until its claim is known: the core
// refuses a committed answer whose credit it cannot confirm.
func (o *requestCommandOutput) bufferCredit(p []byte) (int, error) {
	if o.body.Len()+len(p) > credits.MaxBodyBytes {
		o.overflow = true
		return 0, errCreditResponseTooLarge
	}
	return o.body.Write(p)
}

// finish commits a successful tracked answer with its credit receipt; the
// answer is only committed here, after the claim is known.
func (o *requestCommandOutput) finish() error {
	status, headers, err := o.response()
	if err != nil {
		return err
	}
	ready := o.credit.receipt(headers, o.body.Bytes())
	if ready != "" {
		o.writer.Header().Set(credits.ReadyHeader, ready)
	}
	o.commit(status, headers)
	if o.diagnostic != nil {
		o.diagnostic.trace("fallback_credit_receipt", Object{"ready": ready != "", "stream": eventStream(headers.Get("Content-Type"))})
	}
	if _, err := o.writer.Write(o.body.Bytes()); err != nil {
		panic(http.ErrAbortHandler)
	}
	_ = http.NewResponseController(o.writer).Flush()
	return nil
}

// receipt is the token hash the core confirms for this answer, empty when the
// answer issues no credit or its stream is not a complete message (the core
// reaches the same conclusion from the same bytes).
func (c *requestCredit) receipt(headers http.Header, body []byte) string {
	message := body
	if eventStream(headers.Get("Content-Type")) {
		var err error
		if message, err = credits.MessageFromEvents(creditPayloads(body)); err != nil {
			return ""
		}
	}
	claim, err := credits.ClaimForResponse(c.clientBody, message, c.betas)
	if err != nil || claim == nil {
		return ""
	}
	return claim.TokenHash
}

func eventStream(contentType string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(contentType)), "text/event-stream")
}

// creditPayloads is the core's own reading of an event stream: blocks separated
// by a blank line, their data lines joined (one leading space dropped), empty
// payloads left out.
func creditPayloads(body []byte) [][]byte {
	var payloads [][]byte
	normalized := bytes.ReplaceAll(body, []byte("\r\n"), []byte("\n"))
	for _, block := range bytes.Split(normalized, []byte("\n\n")) {
		var data []byte
		for _, line := range bytes.Split(block, []byte("\n")) {
			value, ok := bytes.CutPrefix(line, []byte("data:"))
			if !ok {
				continue
			}
			if len(data) > 0 {
				data = append(data, '\n')
			}
			data = append(data, bytes.TrimPrefix(value, []byte(" "))...)
		}
		if len(bytes.TrimSpace(data)) > 0 {
			payloads = append(payloads, data)
		}
	}
	return payloads
}

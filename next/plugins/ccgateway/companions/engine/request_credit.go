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
// A claim is known only once the message is complete, so the receipt is a
// trailer: the response streams as it arrives (2026-10-25 audit P2-1), a copy
// is kept for the claim, and the receipt follows the last byte. The core holds
// back what carries a token until it has confirmed the receipt.

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

// creditAdmissionTimeout bounds waiting for the authority and verifying the
// issuer.
const creditAdmissionTimeout = 30 * time.Second

// requestCredit is one tracked request. It shares the resource authority from
// issuer verification until the provider answered (2026-10-25 audit P2-2): a
// reauthorization cannot switch the issuer the core bound this request to
// before the CLI sent it, while tracked requests do not wait on each other and
// resource operations wait only for that answer, not the whole response. The
// client's own body and betas are what its answer's claim is computed from.
type requestCredit struct {
	authority  *sync.RWMutex
	released   sync.Once
	clientBody []byte
	betas      []string
}

// release hands the shared authority back, once: when the provider's answer
// begins, or when the request ends without one.
func (c *requestCredit) release() { c.released.Do(c.authority.RUnlock) }

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
	if err := lockResourceAuthority(ctx, g.resources.authority.mu.TryRLock); err != nil {
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

// keepCredit keeps the copy a tracked answer's claim is computed from. Past the
// core's own limit no claim can be confirmed, so the copy stops and the answer
// carries no receipt; the core reaches the same conclusion.
func (o *requestCommandOutput) keepCredit(p []byte) {
	if o.creditOverflow || o.creditCopy.Len()+len(p) > credits.MaxBodyBytes {
		o.creditOverflow = true
		o.creditCopy = bytes.Buffer{}
		return
	}
	o.creditCopy.Write(p)
}

// finish ends a successful tracked answer with its credit receipt, sent as a
// trailer after the answer's last byte.
func (o *requestCommandOutput) finish() error {
	if err := o.start(); err != nil {
		return err
	}
	ready := ""
	if !o.creditOverflow {
		ready = o.credit.receipt(o.contentType, o.creditCopy.Bytes())
	}
	if ready != "" {
		o.writer.Header().Set(http.TrailerPrefix+credits.ReadyHeader, ready)
	}
	if o.diagnostic != nil {
		o.diagnostic.trace("fallback_credit_receipt", Object{"ready": ready != "", "stream": eventStream(o.contentType), "over_limit": o.creditOverflow})
	}
	_ = http.NewResponseController(o.writer).Flush()
	return nil
}

// receipt is the token hash the core confirms for this answer, empty when the
// answer issues no credit or its stream is not a complete message (the core
// reaches the same conclusion from the same bytes).
func (c *requestCredit) receipt(contentType string, body []byte) string {
	message := body
	if eventStream(contentType) {
		var err error
		if message, err = credits.MessageFromEvents(credits.EventPayloads(body)); err != nil {
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

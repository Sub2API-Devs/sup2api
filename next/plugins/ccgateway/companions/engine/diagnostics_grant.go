package engine

import (
	"context"
	"encoding/json"
	"fmt"
	diag "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/diagnostics"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"net/http"
	"time"
)

func (x *exchange) trustedDiagnostics(id string) (bool, error) {
	h := x.r.Header
	for _, name := range []string{diag.TrackingHeader, diag.GrantHeader} {
		if len(h.Values(name)) > 1 {
			return false, fmt.Errorf("duplicate diagnostics capability header")
		}
	}
	track, grant := h.Get(diag.TrackingHeader), h.Get(diag.GrantHeader)
	if track == "" && grant == "" {
		return false, nil
	}
	if track != "1" {
		return false, fmt.Errorf("invalid diagnostics capability")
	}
	if id == "" && grant != "" {
		return false, fmt.Errorf("diagnostics grant without previous message")
	}
	if id != "" {
		hash, err := diag.Hash(id)
		if err != nil || hash != grant {
			return false, fmt.Errorf("diagnostics grant does not match previous message")
		}
	}
	if x.resources == nil {
		if x.g.resources == nil {
			return false, fmt.Errorf("diagnostics issuer verification unavailable")
		}
		ctx, cancel := context.WithTimeout(x.r.Context(), 30*time.Second)
		defer cancel()
		broker := x.g.resources
		if err := lockResourceAuthority(ctx, &broker.authority.mu); err != nil {
			return false, err
		}
		admission := &resourceAdmission{unlock: broker.authority.mu.Unlock}
		if err := waitResourceSlot(ctx, x.g.Slots); err != nil {
			admission.close()
			return false, err
		}
		identity, err := broker.identity(ctx)
		<-x.g.Slots
		if err == nil {
			err = verifyExpectedResourceIdentity(h, identity)
		}
		if err != nil {
			admission.close()
			return false, err
		}
		admission.identity = identity
		x.resources = admission
		x.req.resources = admission
		admission.applyResponseHeaders(x.w.Header())
	} else if err := verifyExpectedResourceIdentity(h, x.resources.identity); err != nil {
		return false, err
	}
	x.w.Header().Set(diag.ReadyHeader, "1")
	return true, nil
}

// requestDiagnosticsGrant is trustedDiagnostics for the request command. With
// the host's tracking headers it verifies the account's resource identity
// against the one the host bound and answers with that identity and the
// ready header, so the host can record the response's message ID for this
// account. Without them the body's diagnostics go upstream untracked. The
// authority is held for the verification only, not for the model request:
// a reauthorization during the request is the one window, and the host sees
// the new generation on the next request.
func (g *Gateway) requestDiagnosticsGrant(ctx context.Context, w http.ResponseWriter, h http.Header, raw []byte) (int, error) {
	for _, name := range []string{diag.TrackingHeader, diag.GrantHeader} {
		if len(h.Values(name)) > 1 {
			return 400, fmt.Errorf("duplicate diagnostics capability header")
		}
	}
	track, grant := h.Get(diag.TrackingHeader), h.Get(diag.GrantHeader)
	if track == "" && grant == "" {
		return 0, nil
	}
	var body struct {
		Diagnostics *struct {
			PreviousMessageID *string `json:"previous_message_id"`
		} `json:"diagnostics"`
	}
	if track != "1" || json.Unmarshal(raw, &body) != nil || body.Diagnostics == nil {
		return 400, fmt.Errorf("diagnostics capability requires opt-in object")
	}
	id := ""
	if body.Diagnostics.PreviousMessageID != nil {
		id = *body.Diagnostics.PreviousMessageID
	}
	if id == "" && grant != "" {
		return 400, fmt.Errorf("diagnostics grant without previous message")
	}
	if id != "" {
		if hash, err := diag.Hash(id); err != nil || hash != grant {
			return 400, fmt.Errorf("diagnostics grant does not match previous message")
		}
	}
	broker := g.resources
	if broker == nil {
		return 503, fmt.Errorf("diagnostics issuer verification unavailable")
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	if err := lockResourceAuthority(ctx, &broker.authority.mu); err != nil {
		return 503, err
	}
	defer broker.authority.mu.Unlock()
	if err := waitResourceSlot(ctx, g.Slots); err != nil {
		return 503, err
	}
	identity, err := broker.identity(withResourceAuthorization(ctx))
	<-g.Slots
	if err != nil {
		return 503, err
	}
	if err := verifyExpectedResourceIdentity(h, identity); err != nil {
		return 409, err
	}
	w.Header().Set(resources.PrincipalHeader, identity.PrincipalID)
	w.Header().Set(resources.GenerationHeader, identity.Generation)
	w.Header().Set(diag.ReadyHeader, "1")
	return 0, nil
}

package engine

import (
	"context"
	"fmt"
	diag "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/diagnostics"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
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
	if len(h.Values(resources.PrincipalHeader)) != 1 || len(h.Values(resources.GenerationHeader)) != 1 {
		return false, fmt.Errorf("ambiguous diagnostics issuer capability")
	}
	if track != "1" || x.req.CountTokens {
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

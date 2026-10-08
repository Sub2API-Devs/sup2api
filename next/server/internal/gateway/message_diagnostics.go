package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	diag "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/diagnostics"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/tidwall/gjson"
	"net/http"
	"strings"
)

type diagnosticRequest struct {
	raw         []byte
	previous    *core.DiagnosticMessage
	lookupError *gwError
}
type diagnosticAccess struct{ binding core.ResourceBinding }

func (c *call) checkMessageDiagnostics(ctx context.Context) *gwError {
	c.diagnosticRequest = nil
	if c.ep.Protocol != "anthropic.messages" {
		return nil
	}
	value := gjson.GetBytes(c.body, "diagnostics")
	if !value.Exists() || value.Type == gjson.Null {
		return nil
	}
	if !value.IsObject() {
		return invalidModelReference("diagnostics must be an object or null")
	}
	invalid := false
	value.ForEach(func(k, v gjson.Result) bool {
		if k.String() != "previous_message_id" {
			invalid = true
		}
		return true
	})
	if invalid {
		return invalidModelReference("unknown diagnostics field")
	}
	r := &diagnosticRequest{raw: []byte(value.Raw)}
	c.diagnosticRequest = r
	previous := value.Get("previous_message_id")
	if !previous.Exists() || previous.Type == gjson.Null {
		return nil
	}
	if previous.Type != gjson.String {
		return invalidModelReference("diagnostics previous_message_id must be a string or null")
	}
	hash, err := diag.Hash(previous.String())
	if err != nil {
		return invalidModelReference(err.Error())
	}
	if c.g.d.Diagnostics == nil {
		r.lookupError = fromCore(core.ErrUnavailable.WithMessage("diagnostics ownership registry unavailable"), errTypeInternal)
		return nil
	}
	record, err := c.g.d.Diagnostics.LookupOwned(ctx, c.resourceOwner(), hash)
	if err != nil || record.Owner != c.resourceOwner() || record.IDHash != hash || !record.RetentionUntil.After(c.g.now()) {
		r.lookupError = fromCore(core.ErrNotFound.WithMessage("diagnostics response ownership is unknown or outside platform retention"), errTypeInvalidRequest)
		if err != nil && core.AsError(err).Status >= 500 {
			r.lookupError = fromCore(core.ErrUnavailable.WithMessage("diagnostics ownership registry unavailable"), errTypeInternal)
		}
		return nil
	}
	if len(c.resourceRefs) > 0 && c.resourceRefs[0].resource.Binding != record.Binding {
		return invalidModelReference("diagnostics and resources require the same issuer")
	}
	if c.creditRequest != nil && c.creditRequest.redemption != nil && c.creditRequest.redemption.Binding != record.Binding {
		return invalidModelReference("diagnostics and credit require the same issuer")
	}
	r.previous = &record
	return nil
}
func (c *call) diagnosticAccountAllowed(a *core.AccountRef) bool {
	r := c.diagnosticRequest
	if r == nil {
		return true
	}
	if r.lookupError != nil {
		return a.PluginKey != "ccgateway"
	}
	return r.previous == nil || a.PluginKey == "ccgateway" && a.ID == r.previous.Binding.AccountID
}
func (c *call) applyDiagnosticHeaders(ctx context.Context, req *http.Request, account *core.Account, body []byte) error {
	c.diagnosticAccess = nil
	for name := range req.Header {
		if strings.HasPrefix(strings.ToLower(name), "x-ccgateway-diagnostics-") {
			req.Header.Del(name)
		}
	}
	r := c.diagnosticRequest
	if r == nil || account.PluginKey != "ccgateway" {
		return nil
	}
	if c.g.d.Diagnostics == nil || c.g.d.ResourceTransport == nil {
		return core.ErrUnavailable.WithMessage("diagnostics ownership service unavailable")
	}
	if !sameDiagnosticObject(r.raw, []byte(gjson.GetBytes(body, "diagnostics").Raw)) {
		return core.ErrInvalidArgument.WithMessage("diagnostics changed before dispatch")
	}
	var binding core.ResourceBinding
	if c.resourceAccess != nil {
		binding = c.resourceAccess.binding
	} else if c.creditAccess != nil {
		binding = c.creditAccess.binding
	} else {
		var err error
		binding, err = c.g.d.ResourceTransport.Identity(ctx, account.ID)
		if err != nil {
			if r.previous == nil {
				return &resourceEligibilityError{err}
			}
			return err
		}
	}
	if binding.AccountID != account.ID || binding.PrincipalID == "" || binding.Generation == "" {
		return core.ErrNotFound
	}
	if r.previous != nil {
		if r.previous.Binding != binding {
			return core.ErrNotFound.WithMessage("diagnostics issuer changed")
		}
		req.Header.Set(diag.GrantHeader, r.previous.IDHash)
	}
	req.Header.Set(diag.TrackingHeader, "1")
	req.Header.Set(resources.PrincipalHeader, binding.PrincipalID)
	req.Header.Set(resources.GenerationHeader, binding.Generation)
	c.diagnosticAccess = &diagnosticAccess{binding: binding}
	return nil
}
func sameDiagnosticObject(a, b []byte) bool {
	var x, y bytes.Buffer
	if json.Compact(&x, a) != nil || json.Compact(&y, b) != nil {
		return false
	}
	return bytes.Equal(x.Bytes(), y.Bytes())
}
func (c *call) recordDiagnosticID(ctx context.Context, id string) error {
	hash, err := diag.Hash(id)
	if err != nil {
		return err
	}
	if c.diagnosticAccess == nil {
		return fmt.Errorf("diagnostics identity is not verified")
	}
	return c.g.d.Diagnostics.Record(ctx, core.DiagnosticMessage{IDHash: hash, Owner: c.resourceOwner(), Binding: c.diagnosticAccess.binding, ObservedAt: c.g.now()})
}

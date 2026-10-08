package gateway

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/tidwall/gjson"
)

type modelCreditRequest struct {
	parameter      credits.Parameter
	verifiedPrompt bool
	tokenHash      string
	tokenPresent   bool
	lookupError    *gwError
	redemption     *core.FallbackCredit
}

type modelCreditAccess struct{ binding core.ResourceBinding }

// This error is a gateway persistence fault. A provider refusal itself is a
// normal successful Message and must never be classified as an upstream error.
type creditStorageError struct{ cause error }

func (e *creditStorageError) Error() string { return "fallback credit state could not be recorded" }
func (e *creditStorageError) Unwrap() error { return e.cause }

func (c *call) checkFallbackCredit(ctx context.Context) *gwError {
	c.creditRequest = nil
	if c.ep.Protocol != "anthropic.messages" {
		return nil
	}
	parameter, err := credits.ParseParameter(gjson.GetBytes(c.body, "fallback_credit_token").Value())
	if err != nil {
		return invalidModelReference(err.Error())
	}
	betas := c.c.Request.Header.Values("Anthropic-Beta")
	if err := parameter.ValidateBetas(betas); err != nil {
		return invalidModelReference(err.Error())
	}
	if !parameter.Present && !credits.Enabled(betas) {
		return nil
	}
	c.creditRequest = &modelCreditRequest{tokenPresent: parameter.Present, parameter: parameter}
	if !parameter.Present {
		return nil
	}
	if gjson.GetBytes(c.body, "fallbacks").Exists() {
		return invalidModelReference("fallback credit token cannot be combined with fallbacks")
	}
	if c.g.d.Credits == nil {
		c.creditRequest.lookupError = fromCore(core.ErrUnavailable.WithMessage("fallback credit registry unavailable"), errTypeInternal)
		return nil
	}
	hash, err := credits.TokenHash(parameter.Token)
	if err != nil {
		return invalidModelReference(err.Error())
	}
	digest, err := credits.Digest(c.body, c.c.Request.Header.Values("Anthropic-Beta"))
	if err != nil {
		return invalidModelReference(err.Error())
	}
	stored, err := c.g.d.Credits.LookupOwned(ctx, c.resourceOwner(), hash)
	if err != nil || stored.Owner != c.resourceOwner() || stored.PluginKey != "ccgateway" || stored.TokenHash != hash {
		c.creditRequest.lookupError = fromCore(core.ErrNotFound.WithMessage("fallback credit is unknown, expired or does not match this request"), errTypeInvalidRequest)
		if err != nil && core.AsError(err).Status >= 500 {
			c.creditRequest.lookupError = fromCore(core.ErrUnavailable.WithMessage("fallback credit registry unavailable").WithCause(err), errTypeInternal)
		}
		return nil
	}
	if len(c.resourceRefs) > 0 && c.resourceRefs[0].resource.Binding != stored.Binding {
		return invalidModelReference("fallback credit and resources must belong to the same account and issuer")
	}
	c.creditRequest.tokenHash = hash
	c.creditRequest.redemption = &stored
	c.creditRequest.verifiedPrompt = stored.ExpiresAt.After(c.g.now()) && slices.Contains(stored.PromptDigests, digest)
	if parameter.Mode == "strict" && !c.creditRequest.verifiedPrompt {
		return fromCore(core.ErrNotFound.WithMessage("fallback credit is expired or does not match this request"), errTypeInvalidRequest)
	}
	return nil
}

func (c *call) creditAccountAllowed(account *core.AccountRef) bool {
	if c.creditRequest == nil {
		return true
	}
	if c.creditRequest.lookupError != nil {
		return account.PluginKey != "ccgateway"
	}
	return c.creditRequest.redemption == nil || account.PluginKey == "ccgateway" && account.ID == c.creditRequest.redemption.Binding.AccountID
}

func (c *call) applyCreditHeaders(ctx context.Context, req *http.Request, account *core.Account, body []byte) error {
	c.creditAccess = nil
	for name := range req.Header {
		if strings.HasPrefix(strings.ToLower(name), "x-ccgateway-fallback-credit") {
			req.Header.Del(name)
		}
	}
	if c.creditRequest == nil || account.PluginKey != "ccgateway" {
		return nil
	}
	if c.g.d.Credits == nil || c.g.d.ResourceTransport == nil {
		return core.ErrUnavailable.WithMessage("fallback credit identity and registry unavailable")
	}
	var binding core.ResourceBinding
	if c.resourceAccess != nil {
		binding = c.resourceAccess.binding
	} else {
		var err error
		binding, err = c.g.d.ResourceTransport.Identity(ctx, account.ID)
		if err != nil {
			if c.creditRequest.redemption == nil {
				return &resourceEligibilityError{err}
			}
			return err
		}
	}
	if binding.AccountID != account.ID || binding.PrincipalID == "" || binding.Generation == "" {
		return core.ErrNotFound
	}
	if stored := c.creditRequest.redemption; stored != nil {
		parameter, err := credits.ParseParameter(gjson.GetBytes(body, "fallback_credit_token").Value())
		if err != nil || !parameter.Present || !bytes.Equal(parameter.Raw, c.creditRequest.parameter.Raw) || stored.Binding != binding {
			return core.ErrNotFound.WithMessage("fallback credit identity or token changed before dispatch")
		}
		if parameter.Mode == "strict" && !c.creditPromptVerified(binding) {
			return core.ErrNotFound.WithMessage("fallback credit expired before dispatch")
		}
		hash := c.creditRequest.tokenHash
		req.Header.Set(credits.AdmissionHeader, hash)
	}
	req.Header.Set(credits.TrackingHeader, "1")
	req.Header.Set(resources.PrincipalHeader, binding.PrincipalID)
	req.Header.Set(resources.GenerationHeader, binding.Generation)
	c.creditAccess = &modelCreditAccess{binding: binding}
	return nil
}

// Events have already received any public resource-ID rewriting. The source
// client body and the response visible to that client define the credit claim.
func (c *call) observeFallbackCredit(ctx context.Context, response *http.Response, events []resourceResponseEvent, sse bool) error {
	if c.creditAccess == nil {
		return nil
	}
	binding := c.creditAccess.binding
	if response.Header.Get(resources.PrincipalHeader) != binding.PrincipalID || response.Header.Get(resources.GenerationHeader) != binding.Generation {
		return fmt.Errorf("fallback credit issuer evidence mismatch")
	}
	if failure := response.Header.Get(credits.FailureHeader); failure != "" {
		if failure != "storage" || len(response.Header.Values(credits.FailureHeader)) != 1 || response.Header.Get(credits.ReadyHeader) != "" {
			return fmt.Errorf("invalid fallback credit failure evidence")
		}
		return &creditStorageError{cause: fmt.Errorf("Worker credit custody failed")}
	}
	var message []byte
	if sse {
		var payloads [][]byte
		for _, event := range events {
			if len(event.data) > 0 {
				payloads = append(payloads, event.data)
			}
		}
		var err error
		message, err = credits.MessageFromEvents(payloads)
		if err != nil {
			// Provider SSE errors do not issue credits and retain normal error
			// forwarding. A Ready claim on such a stream is never accepted.
			if response.Header.Get(credits.ReadyHeader) == "" {
				for _, payload := range payloads {
					if gjson.GetBytes(payload, "type").String() == "error" {
						return nil
					}
				}
			}
			return err
		}
	} else if len(events) == 1 {
		message = events[0].data
	}
	claim, err := credits.ClaimForResponse(c.body, message, c.c.Request.Header.Values("Anthropic-Beta"))
	if err != nil {
		return err
	}
	ready := response.Header.Get(credits.ReadyHeader)
	if claim == nil {
		if ready != "" {
			return fmt.Errorf("fallback credit readiness has no response token")
		}
		return nil
	}
	if ready != claim.TokenHash || len(response.Header.Values(credits.ReadyHeader)) != 1 {
		return fmt.Errorf("fallback credit snapshot not confirmed by Worker")
	}
	now := c.g.now()
	if err := c.g.d.Credits.Record(ctx, core.FallbackCredit{TokenHash: claim.TokenHash, PluginKey: "ccgateway", SourceModel: claim.SourceModel, Owner: c.resourceOwner(), Binding: binding, PromptDigests: claim.Digests, ObservedAt: now, ExpiresAt: now.Add(credits.Lifetime)}); err != nil {
		return &creditStorageError{cause: err}
	}
	return nil
}

func (c *call) creditPromptVerified(binding core.ResourceBinding) bool {
	r := c.creditRequest
	return r != nil && r.verifiedPrompt && r.redemption != nil && r.redemption.Binding == binding && r.redemption.ExpiresAt.After(c.g.now())
}

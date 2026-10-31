package gateway

import (
	"context"
	"errors"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func (c *call) resourcePreparationFailure(err error) attemptResult {
	kind := attemptReturn
	var eligibility *resourceEligibilityError
	if errors.As(err, &eligibility) && len(c.resourceRefs) == 0 && (c.creditRequest == nil || c.creditRequest.redemption == nil) {
		kind = attemptFailover
	}
	return attemptResult{kind: kind, err: fromCore(core.AsError(err), errTypeInvalidRequest)}
}

// accountRefused answers a resource identity the Worker refused with the
// account's own login verdict (a dead or cleared login, a refused token) as
// the upstream's error response: classified, so the account fails over and
// the auto-disable rules apply, and the body returned as the Worker wrote it.
// It used to be a 503 "no verified resource issuer" that only failed over
// (2026-11-01).
func (c *call) accountRefused(ctx context.Context, rt *typeRoute, acct *pluginv1.Account, execution *gatewayExecution, err error) (attemptResult, bool) {
	var refusal *ccgateway.AccountRefusalError
	if !errors.As(err, &refusal) {
		return attemptResult{}, false
	}
	body := &upstreamErrorBody{prefix: refusal.Body}
	if execution != nil {
		execution.errorBody = body
		return execution.classify(ctx, refusal.Status, refusal.Header, refusal.Body, ""), true
	}
	res := c.classify(ctx, rt, acct, refusal.Status, refusal.Header, refusal.Body, "")
	c.preserveHTTPError(res.err, refusal.Status, refusal.Header, body)
	return res, true
}

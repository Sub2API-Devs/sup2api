package gateway

import (
	"errors"

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

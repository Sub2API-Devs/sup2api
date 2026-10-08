package helperhistory

import "fmt"

const RequirementPath = "/internal/helper-history/requirement"
const RequirementOrdinary = "ordinary"
const RequirementNeedsCustody = "needs_custody"

// Defer is not an admission proof: the ordinary authenticated execution path
// must perform all validation requiring resource or other runtime context.
const RequirementDeferToOrdinary = "defer_to_ordinary"

type RequirementResponse struct {
	Version  int    `json:"version"`
	Decision string `json:"decision"`
}

func DecodeRequirement(raw []byte) (RequirementResponse, error) {
	var r RequirementResponse
	if len(raw) > 4096 {
		return r, fmt.Errorf("helper requirement response exceeds limit")
	}
	if err := decodeEnvelope(raw, &r); err != nil {
		return r, err
	}
	if r.Version != Version {
		return r, fmt.Errorf("unsupported helper requirement version")
	}
	switch r.Decision {
	case RequirementOrdinary, RequirementNeedsCustody, RequirementDeferToOrdinary:
		return r, nil
	default:
		return r, fmt.Errorf("invalid helper requirement decision")
	}
}

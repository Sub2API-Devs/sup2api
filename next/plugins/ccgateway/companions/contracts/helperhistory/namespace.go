package helperhistory

import (
	"encoding/json"
	"fmt"
)

// Namespace binds stable interpretation state, not sampling or task-budget
// values. Worker recomputes it using its actual CLI version and trusted policy.
func Namespace(model, cliVersion string, policy json.RawMessage) (string, error) {
	if !transportText(model, 256) || !transportText(cliVersion, 128) || len(policy) == 0 || len(policy) > 64<<10 {
		return "", fmt.Errorf("invalid helper namespace context")
	}
	v, err := strictValue(policy)
	if err != nil {
		return "", err
	}
	if _, ok := v.(map[string]any); !ok {
		return "", fmt.Errorf("helper policy must be an object")
	}
	raw, err := json.Marshal(struct {
		Version int             `json:"version"`
		Model   string          `json:"model"`
		CLI     string          `json:"cli"`
		Policy  json.RawMessage `json:"policy"`
	}{Version: Version, Model: model, CLI: cliVersion, Policy: policy})
	if err != nil {
		return "", err
	}
	d, err := CanonicalDigest(raw)
	if err != nil {
		return "", err
	}
	return "helper-v1:" + d, nil
}

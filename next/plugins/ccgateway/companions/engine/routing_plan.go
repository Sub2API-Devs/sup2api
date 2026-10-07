package engine

import (
	"encoding/json"
	"fmt"
)

func (r *Request) hasInferenceGeo() bool {
	if r.Plan == nil {
		return false
	}
	_, exists := r.Plan.fields["inference_geo"]
	return exists
}

// Geography applies to auxiliary model calls too: classifiers can carry client
// content. It does not claim storage residency or override provider identity.
func (r *Request) applyInferenceGeo(body []byte) ([]byte, error) {
	if !r.hasInferenceGeo() {
		return body, nil
	}
	message, err := decodeObject(body)
	if err != nil {
		return nil, err
	}
	value, err := decodePlannedValue(r.Plan.fields["inference_geo"])
	if err != nil {
		return nil, err
	}
	message["inference_geo"] = value
	return json.Marshal(message)
}

func (r *Request) validateRoutingProvider(env []string) error {
	if !r.hasInferenceGeo() {
		return nil
	}
	for _, name := range []string{"CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CODE_USE_FOUNDRY"} {
		value := environmentValue(env, name)
		if value != "" && value != "0" && value != "false" {
			return fmt.Errorf("inference_geo requires the Anthropic API transport; provider region routing is not interchangeable")
		}
	}
	return nil
}

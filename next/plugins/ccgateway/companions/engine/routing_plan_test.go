package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInferenceGeoNativeExtraBody(t *testing.T) {
	for _, geo := range []string{`"us"`, `"global"`, `null`} {
		t.Run(geo, func(t *testing.T) {
			raw := []byte(`{"model":"fixture","max_tokens":100,"messages":[{"role":"user","content":"client"}],"inference_geo":` + geo + `,"service_tier":"standard_only","temperature":0.2500,"top_p":1e-1}`)
			req, err := parsePolicyRequest(raw, nil)
			require.NoError(t, err)
			cfg, err := req.passthroughBodies()
			require.NoError(t, err)
			for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
				assert.Equal(t, geo, string(round["inference_geo"]))
				assert.Equal(t, `"standard_only"`, string(round["service_tier"]))
				assert.Equal(t, "0.2500", string(round["temperature"]))
				assert.Equal(t, "1e-1", string(round["top_p"]))
				assert.Equal(t, "100", string(round["max_tokens"]))
			}
		})
	}
}

func TestInferenceGeoNativeAbsentAndInvalid(t *testing.T) {
	req, err := parsePolicyRequest([]byte(`{"model":"fixture","max_tokens":1,"messages":[{"role":"user","content":"x"}]}`), nil)
	require.NoError(t, err)
	cfg, err := req.passthroughBodies()
	require.NoError(t, err)
	assert.NotContains(t, cfg.First, "inference_geo")
	assert.NotContains(t, cfg.Rest, "inference_geo")
	for _, geo := range []string{`"eu"`, `1`, `{"region":"us"}`, `["us"]`} {
		_, err := parsePolicyRequest([]byte(`{"model":"fixture","max_tokens":1,"messages":[{"role":"user","content":"x"}],"inference_geo":`+geo+`}`), nil)
		require.ErrorContains(t, err, "inference_geo")
	}
}

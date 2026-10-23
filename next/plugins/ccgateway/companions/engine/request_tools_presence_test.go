package engine

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

func TestBuildRetainsAbsentVersusExplicitEmptyTools(t *testing.T) {
	for _, version := range []string{"legacy", "v2"} {
		for _, fields := range []string{"", `"tools":[]`} {
			t.Run(version+"/"+fields, func(t *testing.T) {
				var policy *features.CLIPolicy
				if version == "v2" {
					policy = &features.CLIPolicy{ContractVersion: 2}
				}
				out, err := messagesBuildComponentsPolicy(generationRequest(fields), policy, "/work")
				require.NoError(t, err)
				var components map[string]json.RawMessage
				require.NoError(t, json.Unmarshal(out, &components))
				tools, exists := components["tools"]
				require.Equal(t, fields != "", exists, "tool catalog presence changed")
				if exists {
					require.Equal(t, "[]", string(tools))
				}
				var parameters map[string]json.RawMessage
				require.NoError(t, json.Unmarshal(components["parameters"], &parameters))
				require.NotContains(t, parameters, "tools")
			})
		}
	}
}

func TestBuildRejectsNullAndMalformedToolCatalog(t *testing.T) {
	for _, value := range []string{"null", "{}", `"tools"`, "true", "0", "[null]", "[1]"} {
		t.Run(value, func(t *testing.T) {
			raw := generationRequest(`"tools":` + value)
			_, err := messagesBuildComponents(raw)
			require.Error(t, err)
			_, err = messagesBuildComponentsPolicy(raw, &features.CLIPolicy{ContractVersion: 2}, "/work")
			require.Error(t, err)
		})
	}
}

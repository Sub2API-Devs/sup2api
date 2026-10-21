package ccgateway

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

// Consumer half of the editor → core contract. The fixture holds what the
// actual console editors send (web/src/views/ccgateway/contractFixtures.spec.ts
// regenerates it); here it goes through the same decoding and validation as the
// remote-config PUT and the account PATCH, and resolves to what the editor
// meant. A payload the core rejects fails this test, not production.
func TestEditorPayloadsDecodeInTheCore(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "..", "plugins", "ccgateway", "companions", "contracts", "testdata", "web-policy-payloads.json"))
	require.NoError(t, err)
	var fixture struct {
		Cases []struct {
			Name    string            `json:"name"`
			Layer   string            `json:"layer"`
			GroupID int64             `json:"group_id"`
			Saved   json.RawMessage   `json:"saved"`
			Body    json.RawMessage   `json:"body"`
			Expect  map[string]string `json:"expect"`
		} `json:"cases"`
	}
	require.NoError(t, json.Unmarshal(raw, &fixture))
	layers := map[string]bool{}
	for _, tc := range fixture.Cases {
		t.Run(tc.Name, func(t *testing.T) {
			layers[tc.Layer] = true
			var old Config
			require.NoError(t, json.Unmarshal(tc.Saved, &old))
			old.Mode, old.AccountRuntimes, old.Scheme, old.Host, old.Port, old.AdminKey = "controller", true, "https", "ccg.example.com", 443, "fixture-admin-key"
			cfg, account := old, AccountFeaturePolicy{}
			switch tc.Layer {
			case "global", "group":
				var in Config
				require.NoError(t, json.Unmarshal(tc.Body, &in), "remote-config PUT body")
				cfg, err = mergeConfig(in, old)
				require.NoError(t, err, "remote-config PUT body")
			case "account":
				require.NoError(t, json.Unmarshal(tc.Body, &account), "account cc_feature_policy")
				require.NoError(t, account.Validate(), "account cc_feature_policy")
			default:
				t.Fatalf("unknown layer %q", tc.Layer)
			}
			r := cfg.ResolveFeaturePolicy(tc.GroupID, account)
			require.NoError(t, validateRequestPolicy(r.Effective))
			require.NotEmpty(t, tc.Expect)
			for field, want := range tc.Expect {
				got := r.Effective.RelayMode
				if field != "relay_mode" {
					got = matrixValue(r.Effective, field)
				}
				require.Equal(t, want, got, field)
			}
			wire, err := (&Service{}).resolvedWorkerPolicy(context.Background(), Config{RequestPolicy: &r.Effective}, 0, 0)
			require.NoError(t, err)
			require.NoError(t, validateRequestPolicy(wire))
		})
	}
	require.Equal(t, map[string]bool{"global": true, "group": true, "account": true}, layers, "every editor layer is covered")
}

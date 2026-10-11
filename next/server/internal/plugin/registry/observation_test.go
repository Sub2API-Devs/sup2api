package registry_test

import (
	"context"
	"encoding/json"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"github.com/stretchr/testify/require"
)

type observationExt struct{ ext }

func (observationExt) Observer() core.ObservationPlugin { return observationClient{} }

type observationClient struct{}

func (observationClient) OnObservations(context.Context, *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error) {
	return &pluginv1.ObservationResult{}, nil
}

func TestObservationRegistryRequiresCapabilityAndGrant(t *testing.T) {
	for _, name := range []string{"own", "all", "missing_grant", "invalid_scope", "missing_capability", "missing_client"} {
		t.Run(name, func(t *testing.T) {
			m := registrytest.Manifest("probe", "1.0.0")
			m.Observations = &manifest.Observations{Events: []string{observation.UsageFinalized}, Metrics: []string{"custom_units"}}
			if name != "missing_capability" {
				m.Capabilities = append(m.Capabilities, manifest.Capability{ID: manifest.CapGatewayObserve})
			}
			grants := registry.Grants{}
			scope := `{"types":"own"}`
			if name == "all" {
				scope = `{"types":"all"}`
			}
			if name == "invalid_scope" {
				scope = `{}`
			}
			if name != "missing_grant" {
				grants[observation.Permission] = json.RawMessage(scope)
			}
			e := ext{pkg: load(t, m), grants: grants}
			var extension registry.Extension = observationExt{e}
			if name == "missing_client" {
				extension = e
			}
			g := registry.New().Publish([]registry.Extension{extension}).(core.ObservationGeneration)
			if name == "own" || name == "all" {
				require.Len(t, g.Observers(), 1)
				require.Equal(t, name == "all", g.Observers()[0].AllAccounts)
			} else {
				require.Empty(t, g.Observers())
			}
		})
	}
}

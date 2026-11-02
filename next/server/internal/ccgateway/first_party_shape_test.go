package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

func featureBool(v bool) *bool { return &v }

// first_party_shape (2026-11-03, CONTRACTS §53.23) is on by default and
// inherits global -> group -> account like the other settings.
func TestFirstPartyShapeResolvesAndInherits(t *testing.T) {
	// No stored policy, and a stored policy from before the setting: on.
	for _, cfg := range []Config{{}, {RequestPolicy: &RequestPolicy{Level: features.LevelLow}}} {
		r := cfg.ResolveFeaturePolicy(0, AccountFeaturePolicy{Mode: "follow"})
		require.True(t, *r.Effective.FirstPartyShape)
		require.Equal(t, "global", r.Sources["first_party_shape"])
		require.True(t, *workerPolicy(r.Effective).FirstPartyShape)
	}

	global := defaultRequestPolicy()
	global.FirstPartyShape = featureBool(false)
	cfg := Config{RequestPolicy: &global, CCFeatureGroups: map[string]GroupFeaturePolicy{
		"7": {Enabled: true, AllowAccountOverride: true, Overrides: FeatureOverrides{FirstPartyShape: featureBool(true)}},
		"8": {Enabled: true, AllowAccountOverride: true},
	}}
	r := cfg.ResolveFeaturePolicy(8, AccountFeaturePolicy{Mode: "follow"})
	require.False(t, *r.Effective.FirstPartyShape)
	require.Equal(t, "global", r.Sources["first_party_shape"])
	r = cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "follow"})
	require.True(t, *r.Effective.FirstPartyShape)
	require.Equal(t, "group", r.Sources["first_party_shape"])
	r = cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "custom", Overrides: FeatureOverrides{FirstPartyShape: featureBool(false)}})
	require.False(t, *r.Effective.FirstPartyShape)
	require.True(t, *r.Inherited.FirstPartyShape)
	require.Equal(t, "account", r.Sources["first_party_shape"])
	require.False(t, *workerPolicy(r.Effective).FirstPartyShape)
	// At every level, direct included.
	r = cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "custom", Overrides: FeatureOverrides{Level: featureString(features.LevelNone)}})
	require.Equal(t, "direct", workerPolicy(r.Effective).RelayMode)
	require.True(t, *workerPolicy(r.Effective).FirstPartyShape)

	// Inherit by omitting the key; null is refused like every override.
	var o FeatureOverrides
	require.Error(t, json.Unmarshal([]byte(`{"first_party_shape":null}`), &o))
	require.Error(t, json.Unmarshal([]byte(`{"first_party_shape":"on"}`), &o))
	require.NoError(t, json.Unmarshal([]byte(`{"first_party_shape":false}`), &o))
	require.NoError(t, o.Validate())
	require.False(t, *o.FirstPartyShape)
}

// A save without the key (a console from before the setting) keeps the
// stored value; an explicit value replaces it and moves the feature revision.
func TestFirstPartyShapeGlobalSaveKeepsOmitted(t *testing.T) {
	stored := defaultRequestPolicy()
	stored.Level, stored.FirstPartyShape = features.LevelLow, featureBool(false)
	old := Config{RequestPolicy: &stored, FeatureRevision: 3}

	body := defaultRequestPolicy()
	body.Level = features.LevelLow
	c := Config{RequestPolicy: &body, FeatureRevision: 3}
	require.NoError(t, mergeRequestPolicy(&c, old))
	require.False(t, *c.RequestPolicy.FirstPartyShape)
	require.Equal(t, int64(3), c.FeatureRevision)

	on := defaultRequestPolicy()
	on.Level, on.FirstPartyShape = features.LevelLow, featureBool(true)
	c = Config{RequestPolicy: &on, FeatureRevision: 3}
	require.NoError(t, mergeRequestPolicy(&c, old))
	require.True(t, *c.RequestPolicy.FirstPartyShape)
	require.Equal(t, int64(4), c.FeatureRevision)
}

// The field reaches only a Worker declaring build_first_party_shape_v1, true
// or false as resolved; a Worker without it gets no field and is never
// refused for it.
func TestFirstPartyShapeOnlyReachesAWorkerThatDeclaresIt(t *testing.T) {
	p := features.WorkerPolicy{SchemaVersion: features.PolicySchemaVersion, RelayMode: "build", FirstPartyShape: featureBool(false)}
	require.NotContains(t, requestPolicyCapabilities(p), features.FirstPartyShapeCapability)
	require.Nil(t, withConfirmedShape(p, nil).FirstPartyShape)
	require.Nil(t, withConfirmedCapabilities(p, []string{features.BuildInjectionToolsV2Capability}).FirstPartyShape)
	require.False(t, *withConfirmedCapabilities(p, []string{features.FirstPartyShapeCapability}).FirstPartyShape)
	require.False(t, *p.FirstPartyShape, "the policy given is not changed")

	for _, tc := range []struct {
		capable bool
		setting *bool
		want    string
	}{
		{false, nil, ""}, {false, featureBool(false), ""},
		{true, nil, "true"}, {true, featureBool(true), "true"}, {true, featureBool(false), "false"},
	} {
		var policies []string
		worker := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/healthz" {
				caps := []string{features.RequestPolicyModeCapability, features.RequestLevelsCapability, features.BuildContentPreservationCapability, features.BuildInjectionCapability}
				if tc.capable {
					caps = append(caps, features.FirstPartyShapeCapability)
				}
				_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok", "claude_version": "2.1.312", "capabilities": caps})
				return
			}
			policies = append(policies, r.Header.Get(features.PolicyHeader))
			_, _ = w.Write([]byte(`{}`))
		}))
		t.Setenv("CCGATEWAY_URL", worker.URL)
		global := defaultRequestPolicy()
		global.Level, global.FirstPartyShape = features.LevelLow, tc.setting
		svc := &Service{}
		svc.cache.cfg = keptConfig(Config{Mode: "local", APIKey: "worker-key", RequestPolicy: &global}, time.Now())
		req, err := http.NewRequestWithContext(context.Background(), "POST", VirtualURL, strings.NewReader(`{}`))
		require.NoError(t, err)
		res, err := svc.ModelClientForRequest(ModelRequestContext{}).Do(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, res.StatusCode, "never refused for first_party_shape")
		_, _ = io.Copy(io.Discard, res.Body)
		res.Body.Close()
		require.Len(t, policies, 1)
		var fields map[string]json.RawMessage
		require.NoError(t, json.Unmarshal([]byte(policies[0]), &fields))
		require.Equal(t, tc.want, string(fields["first_party_shape"]), "capable=%v setting=%v", tc.capable, tc.setting)
		worker.Close()
	}
}

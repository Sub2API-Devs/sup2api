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

func sessionMemory(thread, tools int) *features.SessionMemoryPolicy {
	return &features.SessionMemoryPolicy{ThreadTTLSeconds: thread, ToolsTTLSeconds: tools}
}

// session_memory (SESSION-MEMORY-TOOLS-USED-DESIGN.md §4.7, 2026-11-05):
// both lifetimes default to 24 hours and inherit global -> group -> account
// each on its own.
func TestSessionMemoryResolvesAndInherits(t *testing.T) {
	// No stored policy, a policy from before the setting, and {}: the
	// defaults, shown explicitly, sent as nothing.
	for _, cfg := range []Config{{}, {RequestPolicy: &RequestPolicy{Level: features.LevelLow}}, {RequestPolicy: &RequestPolicy{Level: features.LevelLow, SessionMemory: sessionMemory(0, 0)}}} {
		r := cfg.ResolveFeaturePolicy(0, AccountFeaturePolicy{Mode: "follow"})
		require.Equal(t, sessionMemory(86400, 86400), r.Effective.SessionMemory)
		require.Equal(t, "global", r.Sources["session_memory.thread_ttl_seconds"])
		require.Equal(t, "global", r.Sources["session_memory.tools_ttl_seconds"])
		require.Nil(t, workerPolicy(r.Effective).SessionMemory)
	}

	global := defaultRequestPolicy()
	global.SessionMemory = sessionMemory(3600, 0)
	cfg := Config{RequestPolicy: &global, CCFeatureGroups: map[string]GroupFeaturePolicy{
		"7": {Enabled: true, AllowAccountOverride: true, Overrides: FeatureOverrides{SessionMemory: sessionMemory(0, 604800)}},
		"8": {Enabled: true, AllowAccountOverride: true},
	}}
	before, _ := json.Marshal(cfg)
	r := cfg.ResolveFeaturePolicy(8, AccountFeaturePolicy{Mode: "follow"})
	require.Equal(t, sessionMemory(3600, 86400), r.Effective.SessionMemory)
	require.Equal(t, sessionMemory(3600, 0), workerPolicy(r.Effective).SessionMemory, "only what differs from the default")

	r = cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "follow"})
	require.Equal(t, sessionMemory(3600, 604800), r.Effective.SessionMemory)
	require.Equal(t, "global", r.Sources["session_memory.thread_ttl_seconds"])
	require.Equal(t, "group", r.Sources["session_memory.tools_ttl_seconds"])

	r = cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "custom", Overrides: FeatureOverrides{SessionMemory: sessionMemory(86400, 120)}})
	require.Equal(t, sessionMemory(86400, 120), r.Effective.SessionMemory)
	require.Equal(t, sessionMemory(3600, 604800), r.Inherited.SessionMemory)
	require.Equal(t, "account", r.Sources["session_memory.thread_ttl_seconds"])
	require.Equal(t, "account", r.Sources["session_memory.tools_ttl_seconds"])
	require.Equal(t, sessionMemory(0, 120), workerPolicy(r.Effective).SessionMemory)
	// At every level, direct included.
	r = cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "custom", Overrides: FeatureOverrides{Level: featureString(features.LevelNone)}})
	require.Equal(t, "direct", workerPolicy(r.Effective).RelayMode)
	require.Equal(t, sessionMemory(3600, 604800), workerPolicy(r.Effective).SessionMemory)
	after, _ := json.Marshal(cfg)
	require.JSONEq(t, string(before), string(after), "resolving must not change the stored policies")

	// Inherit by omitting the key; null, strings and out-of-range values are refused.
	var o FeatureOverrides
	require.Error(t, json.Unmarshal([]byte(`{"session_memory":null}`), &o))
	require.Error(t, json.Unmarshal([]byte(`{"session_memory":{"thread_ttl_seconds":"1h"}}`), &o))
	require.Error(t, json.Unmarshal([]byte(`{"session_memory":{"ttl":60}}`), &o))
	for _, bad := range []string{`{"thread_ttl_seconds":59}`, `{"tools_ttl_seconds":2592001}`, `{"tools_ttl_seconds":-1}`} {
		o = FeatureOverrides{}
		require.NoError(t, json.Unmarshal([]byte(`{"session_memory":`+bad+`}`), &o))
		require.Error(t, o.Validate(), bad)
	}
	o = FeatureOverrides{}
	require.NoError(t, json.Unmarshal([]byte(`{"session_memory":{"thread_ttl_seconds":60,"tools_ttl_seconds":2592000}}`), &o))
	require.NoError(t, o.Validate())
	bad := defaultRequestPolicy()
	bad.SessionMemory = sessionMemory(30, 0)
	require.Error(t, validateRequestPolicy(bad))
}

// A stored value outside today's range (a range narrowed later) is ignored
// when resolving, never taking the requests down.
func TestSessionMemoryStoredOutOfRangeIsIgnored(t *testing.T) {
	global := defaultRequestPolicy()
	global.SessionMemory = sessionMemory(10, 7200)
	cfg := Config{RequestPolicy: &global, CCFeatureGroups: map[string]GroupFeaturePolicy{
		"7": {Enabled: true, AllowAccountOverride: true, Overrides: FeatureOverrides{SessionMemory: sessionMemory(5, 0)}},
	}}
	r := cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "custom", Overrides: FeatureOverrides{SessionMemory: sessionMemory(0, 99999999)}})
	require.Equal(t, sessionMemory(86400, 7200), r.Effective.SessionMemory)
	require.NoError(t, validateRequestPolicy(r.Effective))
	require.Equal(t, sessionMemory(10, 7200), global.SessionMemory, "the stored value is not touched")
}

// A save without the key (a console from before the setting) keeps the
// stored value; an explicit value replaces it and moves the feature revision.
func TestSessionMemoryGlobalSaveKeepsOmitted(t *testing.T) {
	stored := defaultRequestPolicy()
	stored.Level, stored.SessionMemory = features.LevelLow, sessionMemory(3600, 0)
	old := Config{RequestPolicy: &stored, FeatureRevision: 3}

	body := defaultRequestPolicy()
	body.Level = features.LevelLow
	c := Config{RequestPolicy: &body, FeatureRevision: 3}
	require.NoError(t, mergeRequestPolicy(&c, old))
	require.Equal(t, sessionMemory(3600, 0), c.RequestPolicy.SessionMemory)
	require.Equal(t, int64(3), c.FeatureRevision)

	changed := defaultRequestPolicy()
	changed.Level, changed.SessionMemory = features.LevelLow, sessionMemory(3600, 604800)
	c = Config{RequestPolicy: &changed, FeatureRevision: 3}
	require.NoError(t, mergeRequestPolicy(&c, old))
	require.Equal(t, sessionMemory(3600, 604800), c.RequestPolicy.SessionMemory)
	require.Equal(t, int64(4), c.FeatureRevision)

	invalid := defaultRequestPolicy()
	invalid.Level, invalid.SessionMemory = features.LevelLow, sessionMemory(0, 59)
	c = Config{RequestPolicy: &invalid, FeatureRevision: 3}
	require.Error(t, mergeRequestPolicy(&c, old))
}

// The field reaches only a Worker declaring session_memory_ttl_v1; a Worker
// without it gets no field and is never refused for it.
func TestSessionMemoryOnlyReachesAWorkerThatDeclaresIt(t *testing.T) {
	p := features.WorkerPolicy{SchemaVersion: features.PolicySchemaVersion, RelayMode: "build", SessionMemory: sessionMemory(3600, 0)}
	require.NotContains(t, requestPolicyCapabilities(p), features.SessionMemoryCapability)
	require.Nil(t, withConfirmedSessionMemory(p, nil).SessionMemory)
	require.Nil(t, withConfirmedCapabilities(p, []string{features.FirstPartyShapeCapability}).SessionMemory)
	require.Equal(t, sessionMemory(3600, 0), withConfirmedCapabilities(p, []string{features.SessionMemoryCapability}).SessionMemory)
	require.Equal(t, sessionMemory(3600, 0), p.SessionMemory, "the policy given is not changed")

	for _, tc := range []struct {
		capable bool
		setting *features.SessionMemoryPolicy
		want    string
	}{
		{false, nil, ""}, {false, sessionMemory(3600, 120), ""},
		{true, nil, ""}, {true, sessionMemory(86400, 86400), ""},
		{true, sessionMemory(3600, 0), `{"thread_ttl_seconds":3600}`},
		{true, sessionMemory(3600, 120), `{"thread_ttl_seconds":3600,"tools_ttl_seconds":120}`},
	} {
		var policies []string
		worker := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/healthz" {
				caps := []string{features.RequestPolicyModeCapability, features.RequestLevelsCapability, features.BuildContentPreservationCapability, features.BuildInjectionCapability}
				if tc.capable {
					caps = append(caps, features.SessionMemoryCapability)
				}
				_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok", "claude_version": "2.1.318", "capabilities": caps})
				return
			}
			policies = append(policies, r.Header.Get(features.PolicyHeader))
			_, _ = w.Write([]byte(`{}`))
		}))
		t.Setenv("CCGATEWAY_URL", worker.URL)
		global := defaultRequestPolicy()
		global.Level, global.SessionMemory = features.LevelLow, tc.setting
		svc := &Service{}
		svc.cache.cfg = keptConfig(Config{Mode: "local", APIKey: "worker-key", RequestPolicy: &global}, time.Now())
		req, err := http.NewRequestWithContext(context.Background(), "POST", VirtualURL, strings.NewReader(`{}`))
		require.NoError(t, err)
		res, err := svc.ModelClientForRequest(ModelRequestContext{}).Do(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, res.StatusCode, "never refused for session_memory")
		_, _ = io.Copy(io.Discard, res.Body)
		res.Body.Close()
		require.Len(t, policies, 1)
		var fields map[string]json.RawMessage
		require.NoError(t, json.Unmarshal([]byte(policies[0]), &fields))
		require.Equal(t, tc.want, string(fields["session_memory"]), "capable=%v setting=%+v", tc.capable, tc.setting)
		var wire features.WorkerPolicy
		require.NoError(t, json.Unmarshal([]byte(policies[0]), &wire))
		require.NoError(t, wire.Validate())
		worker.Close()
	}
}

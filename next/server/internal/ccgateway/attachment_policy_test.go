package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/requestfailure"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildAttachmentPolicySaveAndForward(t *testing.T) {
	var input Config
	require.NoError(t, json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_field":"reject","relay_mode":"build","build_attachment_sources":{"platform_name":"client","os_version":"worker"}}}`), &input))
	saved, err := mergeConfig(input, Config{Mode: "disabled"})
	require.NoError(t, err)
	raw, err := json.Marshal(saved)
	require.NoError(t, err)
	var loaded Config
	require.NoError(t, json.Unmarshal(raw, &loaded))
	want := features.BuildAttachmentSources{"platform_name": "client", "os_version": "worker"}
	require.Equal(t, want, loaded.WorkerRequestPolicy(21).BuildAttachmentSources)
	public, _ := json.Marshal(loaded.Public())
	require.Contains(t, string(public), `"build_attachment_sources":{"os_version":"worker","platform_name":"client"}`)
	for _, sources := range []features.BuildAttachmentSources{{"cwd": "worker"}, {"os_version": "unknown"}} {
		bad := *saved.RequestPolicy
		bad.BuildAttachmentSources = sources
		_, err = mergeConfig(Config{Mode: "disabled", RequestPolicy: &bad}, saved)
		require.ErrorContains(t, err, "build_attachment_sources")
	}
}

func TestBuildAttachmentCapabilityCheckedBeforeModelSend(t *testing.T) {
	for _, tc := range []struct {
		mode, version string
		capable       bool
		blocked       bool
	}{
		{"build", "2.1.304", false, true},
		{"build", "2.1.296", true, true},
		{"build", "2.1.304", true, false},
		{"direct", "2.1.304", true, false},
		{"direct", "2.1.304", false, true},
	} {
		t.Run(tc.mode+"/"+tc.version+"/"+strconv.FormatBool(tc.capable), func(t *testing.T) {
			probes, modelRequests := 0, 0
			worker := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				require.Equal(t, "worker-key", r.Header.Get("x-api-key"))
				require.Empty(t, r.Header.Get("Authorization"))
				if r.URL.Path == "/healthz" {
					probes++
					caps := []string{}
					if tc.capable {
						caps = append(caps, features.BuildAttachmentCapability, features.RequestPolicyModeCapability, features.BuildContentPreservationCapability, features.RequestLevelsCapability)
					}
					_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok", "claude_version": tc.version, "capabilities": caps})
					return
				}
				modelRequests++
				var policy RequestPolicy
				require.NoError(t, json.Unmarshal([]byte(r.Header.Get("X-CCGateway-Request-Policy")), &policy))
				if tc.mode == "build" {
					require.Equal(t, "worker", policy.BuildAttachmentSources["os_version"])
				} else {
					require.Empty(t, policy.BuildAttachmentSources)
				}
				body, _ := io.ReadAll(r.Body)
				require.Equal(t, `{"model":"fixture","messages":[{"role":"user","content":"hello"}]}`, string(body))
				_, _ = w.Write([]byte(`{"ok":true}`))
			}))
			defer worker.Close()
			t.Setenv("CCGATEWAY_URL", worker.URL)
			policy := defaultRequestPolicy()
			policy.RelayMode = tc.mode
			policy.BuildAttachmentSources = features.BuildAttachmentSources{"os_version": "worker"}
			svc := &Service{}
			svc.cache.cfg = &cachedConfig{c: Config{Mode: "local", APIKey: "worker-key", RequestPolicy: &policy}, at: time.Now()}
			req, err := http.NewRequestWithContext(context.Background(), "POST", VirtualURL, strings.NewReader(`{"model":"fixture","messages":[{"role":"user","content":"hello"}]}`))
			require.NoError(t, err)
			req.Header.Set("Authorization", "Bearer inbound-not-upstream")
			res, err := svc.ModelClient().Do(req)
			if tc.blocked {
				// The core's own refusal: a marked 503 naming what is missing.
				require.NoError(t, err)
				require.Equal(t, http.StatusServiceUnavailable, res.StatusCode)
				require.Equal(t, requestfailure.SourceCore, requestfailure.Source(res.Header))
				answer, _ := io.ReadAll(res.Body)
				res.Body.Close()
				require.Contains(t, string(answer), "The feature policy cannot be applied")
				require.Equal(t, 0, modelRequests)
			} else {
				require.NoError(t, err)
				res.Body.Close()
				require.Equal(t, 1, modelRequests)
			}
			require.Equal(t, 1, probes)
		})
	}
}

func TestNativePolicyDropsRetiredControlsOnSaveReload(t *testing.T) {
	var cfg Config
	require.NoError(t, json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_field":"ignore","unknown_beta":"reject","attachment_source":"both","attachment_sources":{"environment":"gateway"},"environment_fields":{"workingDirectory":"gateway"},"unknown_client_attachment":"ignore","unknown_gateway_attachment":"pass","tool_search":"false","custom_tool_prefix":"client-tools","thinking_disabled_compat":"omit"}}`), &cfg))
	for range 2 {
		cfg.FeatureRevision = 0 // each iteration models a fresh persistence target
		saved, err := mergeConfig(cfg, Config{Mode: "disabled"})
		require.NoError(t, err)
		for _, value := range []any{saved, saved.Public(), saved.WorkerRequestPolicy(26)} {
			raw, err := json.Marshal(value)
			require.NoError(t, err)
			for _, field := range []string{"unknown_beta", "attachment_source", "attachment_sources", "environment_fields", "unknown_client_attachment", "unknown_gateway_attachment"} {
				assert.NotContains(t, string(raw), `"`+field+`"`)
			}
		}
		raw, err := json.Marshal(saved)
		require.NoError(t, err)
		require.NoError(t, json.Unmarshal(raw, &cfg))
		policy := cfg.EffectiveRequestPolicy()
		assert.Equal(t, "build", policy.RelayMode)
		assert.Equal(t, "ignore", policy.UnknownField)
		assert.Equal(t, "false", policy.ToolSearch)
		assert.Equal(t, "client-tools", policy.CustomToolPrefix)
		assert.Equal(t, "omit", policy.ThinkingDisabledCompat)
	}
}

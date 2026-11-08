package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func hookManifest(hostCompat string, points []any, hooks ...manifest.Hook) *manifest.Manifest {
	m := minimal()
	m.HostCompat = hostCompat
	m.Capabilities = []manifest.Capability{{ID: manifest.CapGatewayHook}}
	m.HostPermissions = []manifest.HostPermission{{ID: "gateway.hook", Scope: map[string]any{"points": points, "fields": []any{"model"}},
		Reason: manifest.LocalizedText{"en": "hooks"}}}
	m.Hooks = hooks
	return m
}

// gateway.attempt is a hook point of its own: it must be in scope.points,
// and hostCompat must keep out the cores that do not run it (CONTRACTS §85).
func TestAttemptHookPoint(t *testing.T) {
	floor := ">=" + AttemptHookFirstCore + " <0.2.0"
	attempt := manifest.Hook{ID: "a", Point: manifest.HookPointAttempt, Needs: []string{"model"}}
	request := manifest.Hook{ID: "r", Point: manifest.HookPointRequest, Needs: []string{"model"}}
	both := []any{manifest.HookPointRequest, manifest.HookPointAttempt}
	for _, tc := range []struct {
		name string
		m    *manifest.Manifest
		want map[string]string
	}{
		{"attempt", hookManifest(floor, both, request, attempt), nil},
		{"request on an old core", hookManifest(">=0.1.0 <0.2.0", []any{manifest.HookPointRequest}, request), nil},
		{"attempt below the floor", hookManifest(">=0.1.0 <0.2.0", both, attempt), map[string]string{"hostCompat": "below_feature_core"}},
		{"attempt outside scope", hookManifest(floor, []any{manifest.HookPointRequest}, attempt), map[string]string{"hooks[0].point": "exceeds_scope"}},
		{"unknown point", hookManifest(floor, []any{"gateway.response"}, manifest.Hook{Point: "gateway.response"}), map[string]string{"hooks[0].point": "unsupported"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got := codes(Validate(tc.m, nil, ValidateOptions{Tooling: true}))
			if len(got) != len(tc.want) {
				t.Fatalf("errors = %v, want %v", got, tc.want)
			}
			for f, c := range tc.want {
				if got[f] != c {
					t.Fatalf("errors = %v, want %v", got, tc.want)
				}
			}
		})
	}
}

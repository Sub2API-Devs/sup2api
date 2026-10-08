package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestAccountEndpointSubset(t *testing.T) {
	for _, tc := range []struct {
		name     string
		platform string
		ids      []string
		code     string
	}{
		{"legacy", "anthropic", nil, ""},
		{"subset", "anthropic", []string{"messages"}, ""},
		{"empty", "anthropic", []string{}, "required"},
		{"cross platform", "anthropic", []string{"chat_completions"}, "unknown_endpoint"},
		{"duplicate", "anthropic", []string{"messages", "messages"}, "duplicate"},
		{"missing", "missing", []string{"messages"}, "unknown_platform"},
		{"external", "video", []string{"generate"}, ""},
		{"external invalid", "video", []string{"messages"}, "unknown_endpoint"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			v := validator{opt: ValidateOptions{OtherPlatforms: []PlatformOwner{{ID: "video", Endpoints: []manifest.Endpoint{{ID: "generate"}}}}}}
			v.accountEndpoints("platforms[0]", manifest.AccountPlatform{Platform: tc.platform, Endpoints: tc.ids}, nil)
			if tc.code == "" {
				if len(v.errs) != 0 {
					t.Fatalf("unexpected errors: %+v", v.errs)
				}
				return
			}
			if len(v.errs) != 1 || v.errs[0].Code != tc.code {
				t.Fatalf("errors = %+v, want %s", v.errs, tc.code)
			}
		})
	}
}

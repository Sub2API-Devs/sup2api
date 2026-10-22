package ccgateway

import (
	"encoding/json"
	"os"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// The core hands the plugin only the client headers the manifest lists, so
// every header headers() forwards must be listed for every account type; a
// header missing there never reaches the Worker (found in production
// 2026-10-22: only agent-id was listed).
func TestManifestPassesTheForwardedHeaders(t *testing.T) {
	raw, err := os.ReadFile("../../manifest.json")
	if err != nil {
		t.Fatal(err)
	}
	var m manifest.Manifest
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatal(err)
	}
	want := []string{"anthropic-version", "anthropic-beta"}
	for name := range agentContextHeaders {
		want = append(want, name)
	}
	for _, accountType := range m.AccountTypes {
		for _, platform := range accountType.Platforms {
			for _, name := range want {
				if !slices.Contains(platform.PassHeaders, name) {
					t.Errorf("%s/%s does not pass %s", accountType.ID, platform.Platform, name)
				}
			}
		}
	}
}

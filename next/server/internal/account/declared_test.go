package account

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/upstream"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/declarative"
)

// A declared type's view carries its resolved upstream declaration, in the
// JSON shape of manifest.Upstream, as the console upstream editor's
// defaults; a code plugin's type has none.
func TestTypeViewUpstream(t *testing.T) {
	g := testGen(&fakePlatform{})
	raw, _ := json.Marshal(typeView(g, g.types[0], nil))
	require.False(t, gjson.GetBytes(raw, "upstream").Exists())

	at := manifest.AccountType{ID: "custom_anthropic", Upstream: &manifest.Upstream{Preset: "anthropic", AccountConfig: true}}
	p, err := upstream.Resolve(&at, nil, nil)
	require.NoError(t, err)
	b := g.types[0]
	b.Type, b.Client = at, declarative.New(p, nil)
	raw, _ = json.Marshal(typeView(g, b, nil))
	want, _ := json.Marshal(p.Upstream())
	require.JSONEq(t, string(want), gjson.GetBytes(raw, "upstream").Raw)
	require.Equal(t, "/v1/messages", gjson.GetBytes(raw, "upstream.routes.anthropic\\.messages.path").String())
	require.Equal(t, "x-api-key", gjson.GetBytes(raw, "upstream.auth.name").String())
	require.True(t, gjson.GetBytes(raw, "pass_headers").IsArray())
}

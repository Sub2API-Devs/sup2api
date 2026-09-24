// Command relay is the sub2api-next "Claude relay" plugin: one account type
// (relay_key) for Anthropic-compatible relays.
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/relay/internal/relay"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(relay.New(), pluginsdk.WithManifest(manifestJSON))
}

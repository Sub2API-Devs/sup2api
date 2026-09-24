// Command anthropic is the sub2api-next Anthropic platform plugin.
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/anthropic/internal/anthropic"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(anthropic.New(), pluginsdk.WithManifest(manifestJSON))
}

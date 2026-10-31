// Command dynweight is the sub2api-next dynamic weight plugin
// (CONTRACTS §74.5).
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/dynweight"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(dynweight.New(), pluginsdk.WithManifest(manifestJSON))
}

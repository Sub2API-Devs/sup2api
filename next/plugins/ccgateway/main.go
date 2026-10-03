// Command ccgateway provides OAuth and API Key Claude Code accounts through
// the core connection service.
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/internal/ccgateway"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(ccgateway.New(), pluginsdk.WithManifest(manifestJSON))
}

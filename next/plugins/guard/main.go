// Command guard is the sub2api-next guard demo plugin.
package main

import (
	_ "embed"
	_ "time/tzdata" // stats accept IANA time zones on any OS

	"github.com/Sub2API-Devs/sup2api/next/plugins/guard/internal/guard"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(guard.New(), pluginsdk.WithManifest(manifestJSON))
}

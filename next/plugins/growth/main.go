// Command growth is the sub2api-next growth & engagement plugin
// (referral rewards and daily check-in).
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/growth/internal/growth"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(growth.New(), pluginsdk.WithManifest(manifestJSON))
}

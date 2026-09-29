// Command volcengine is the sub2api-next "Volcengine Ark" plugin: one
// account type (apikey) for Volcengine Ark (火山方舟 / 豆包) serving the
// built-in openai platform.
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/volcengine/internal/volcengine"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(volcengine.New(), pluginsdk.WithManifest(manifestJSON))
}

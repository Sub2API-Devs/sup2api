// Command gemini is the sub2api-next Gemini plugin: the Gemini API key
// account type for the built-in gemini platform and default model prices.
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/gemini/internal/gemini"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(gemini.New(), pluginsdk.WithManifest(manifestJSON))
}

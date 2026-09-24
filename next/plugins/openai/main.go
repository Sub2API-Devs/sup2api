// Command openai is the sub2api-next OpenAI plugin: the OpenAI API key
// account type for the built-in openai platform and default model prices.
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/openai/internal/openai"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(openai.New(), pluginsdk.WithManifest(manifestJSON))
}

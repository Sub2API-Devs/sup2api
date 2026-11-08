// Command codex is the sub2api-next codex plugin: ChatGPT (Codex) account
// types for the built-in openai platform that use the operator's own ChatGPT
// subscription (Codex device code login, Sign in with ChatGPT).
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/codex/internal/codex"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(codex.New(), pluginsdk.WithManifest(manifestJSON))
}

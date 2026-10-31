// Command mailer is the "email" notification channel plugin.
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/mailer/internal/mailer"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(mailer.New(), pluginsdk.WithManifest(manifestJSON))
}

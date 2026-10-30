// Command moderation is the sub2api-next prompt moderation plugin
// (CONTRACTS §20, §72).
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/moderation/internal/moderation"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

// maxRecvMsgSize lets hook calls carry request images (CONTRACTS §72.2).
const maxRecvMsgSize = 64 << 20

func main() {
	pluginsdk.Serve(moderation.New(), pluginsdk.WithManifest(manifestJSON), pluginsdk.WithMaxRecvMsgSize(maxRecvMsgSize))
}

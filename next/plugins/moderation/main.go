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
// Hook fields are pieces of the request body, so the limit covers the largest
// body the core accepts (the max_request_body_mb environment variable, Max
// 1024 in server/internal/core/environment.go) plus 1 MiB for the request
// meta: an oversize call would fail with RESOURCE_EXHAUSTED and count toward
// the core's hook breaker.
const maxRecvMsgSize = (1024 + 1) << 20

func main() {
	pluginsdk.Serve(moderation.New(), pluginsdk.WithManifest(manifestJSON), pluginsdk.WithMaxRecvMsgSize(maxRecvMsgSize))
}

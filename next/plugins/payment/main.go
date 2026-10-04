// Command payment is the sub2api-next payment plugin (online recharge,
// redeem codes and promo codes).
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/payment/internal/payment"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(payment.New(), pluginsdk.WithManifest(manifestJSON))
}

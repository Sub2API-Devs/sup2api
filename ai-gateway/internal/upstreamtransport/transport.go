package upstreamtransport

import (
	"net/http"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
)

// Factory resolves a reusable RoundTripper for an execution plan. Custom
// Caddy modules implement this interface for TLS fingerprints, egress proxies,
// or provider-specific connection behavior.
type Factory interface {
	Transport(*controlv1.ExecutionPlan) (http.RoundTripper, error)
}

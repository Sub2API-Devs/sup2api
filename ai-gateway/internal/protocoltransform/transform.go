// Package protocoltransform defines the provider-protocol extension point used
// by the terminal Sup2API Caddy handler.
package protocoltransform

import (
	"net/http"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

// Transformer may rewrite a request before it is sent upstream and wrap or
// rewrite the corresponding response before it reaches settlement and the
// client. Implementations must remain streaming-safe: large request bodies and
// SSE response bodies must not be unconditionally buffered.
type Transformer interface {
	TransformRequest(*http.Request, *controlv1.ExecutionPlan, *requeststate.State) error
	TransformResponse(*http.Response, *controlv1.ExecutionPlan, *requeststate.State) error
}

// ModelRewriteOwner is implemented by protocol plugins that consume or replace
// the top-level model field themselves.
type ModelRewriteOwner interface {
	HandlesModelRewrite() bool
}

// ClientAddressPolicy lets provider plugins suppress X-Forwarded metadata when
// the provider contract accepts only a strict client-header allowlist.
type ClientAddressPolicy interface {
	ForwardClientAddress() bool
}

// TransportWrapper lets a protocol own a narrowly scoped, request-local
// transport behavior such as a provider-documented one-shot recovery. The
// wrapper must honor ExecutionPlan.MaxAttempts and must not change routing or
// credentials from the authoritative plan.
type TransportWrapper interface {
	WrapTransport(http.RoundTripper, *controlv1.ExecutionPlan, *requeststate.State) (http.RoundTripper, error)
}

// HTTPError lets a protocol plugin distinguish a client policy rejection from
// an upstream/data-plane failure. Implementations must return a 4xx/5xx status.
type HTTPError interface {
	error
	HTTPStatus() int
	ErrorCode() string
}

package core

import (
	"context"
	"net/http"
)

// ProviderResourceTransport is an authenticated, fixed-operation transport.
// Callers supply a provider API path, never credentials or a destination host.
// Implementations must verify the expected issuer before dispatching a side
// effect and bind the response to the same authenticated issuer generation.
type ProviderResourceTransport interface {
	Identity(context.Context, int64) (ResourceBinding, error)
	RoundTrip(int64, ResourceBinding, *http.Request) (*http.Response, error)
}

package passthrough

import (
	"net/http"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/caddyserver/caddy/v2"
)

func init() {
	caddy.RegisterModule(Transformer{})
}

// Transformer preserves the provider-native request and response protocol.
// It is the only profile used by the initial direct API-key data path.
type Transformer struct{}

func (Transformer) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "sup2api.protocols.passthrough",
		New: func() caddy.Module { return new(Transformer) },
	}
}

func (*Transformer) TransformRequest(*http.Request, *controlv1.ExecutionPlan, *requeststate.State) error {
	return nil
}

func (*Transformer) TransformResponse(*http.Response, *controlv1.ExecutionPlan, *requeststate.State) error {
	return nil
}

var _ caddy.Module = (*Transformer)(nil)

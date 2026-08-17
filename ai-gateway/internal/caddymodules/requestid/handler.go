package requestid

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

const maxRequestIDBytes = 128

func init() {
	caddy.RegisterModule(Handler{})
}

// Handler establishes the request-scoped state before authentication or
// admission. A caller-provided ID is retained only when it is a bounded,
// visible ASCII token; otherwise a cryptographically random ID is generated.
type Handler struct{}

func (Handler) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.sup2api_request_id",
		New: func() caddy.Module { return new(Handler) },
	}
}

func (Handler) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
	requestID := normalizeOrGenerate(r.Header.Get("X-Request-ID"))
	r.Header.Set("X-Request-ID", requestID)
	w.Header().Set("X-Request-ID", requestID)

	state := &requeststate.State{RequestID: requestID, StartedAt: time.Now()}
	r = r.WithContext(requeststate.WithContext(r.Context(), state))
	return next.ServeHTTP(w, r)
}

func normalizeOrGenerate(value string) string {
	value = strings.TrimSpace(value)
	if validRequestID(value) {
		return value
	}
	var random [16]byte
	if _, err := rand.Read(random[:]); err == nil {
		return hex.EncodeToString(random[:])
	}
	return hex.EncodeToString([]byte(time.Now().UTC().Format(time.RFC3339Nano)))
}

func validRequestID(value string) bool {
	if value == "" || len(value) > maxRequestIDBytes {
		return false
	}
	for i := 0; i < len(value); i++ {
		if value[i] < '!' || value[i] > '~' {
			return false
		}
	}
	return true
}

var (
	_ caddy.Module                = (*Handler)(nil)
	_ caddyhttp.MiddlewareHandler = (*Handler)(nil)
)

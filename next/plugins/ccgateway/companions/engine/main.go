package engine

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/requestfailure"
)

type Gateway struct {
	RequestMode            string
	CLIInfo                cliRequestInfo
	MaintenanceOnly        bool
	resources              *resourceBroker
	Runner                 *Runner
	Key                    string
	Timeout                time.Duration
	Slots                  chan struct{}
	RequestLogs            *requestLogStore
	requestIdentityEnabled bool
	requestIdentitySecret  []byte
}

// apiError is the Worker's own error answer: an Anthropic error body marked
// as the gateway's (requestfailure.SourceGateway) with a machine-readable
// reason, so the plugin never mistakes it for the upstream's (audit C2) and
// the client's error text stays the Worker's own. Upstream answers never
// pass through here (requestErrorFrame writes them with their own source).
func apiError(w http.ResponseWriter, status int, kind, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set(requestfailure.SourceHeader, requestfailure.SourceGateway)
	w.Header().Set(requestfailure.ReasonHeader, gatewayReason(status, kind))
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Object{"type": "error", "error": Object{"type": kind, "message": msg}})
}

// gatewayReason names a Worker refusal by its status (and the configuration
// type) for requestfailure.ReasonHeader.
func gatewayReason(status int, kind string) string {
	switch {
	case kind == "configuration_error":
		return "configuration_error"
	case status == http.StatusUnauthorized:
		return "unauthorized"
	case status == http.StatusNotFound:
		return "not_found"
	case status == http.StatusMethodNotAllowed:
		return "method_not_allowed"
	case status == http.StatusRequestEntityTooLarge:
		return "request_too_large"
	case status == http.StatusTooManyRequests:
		return "concurrency_limit"
	case status == http.StatusGatewayTimeout:
		return "timeout"
	case status == http.StatusServiceUnavailable:
		return "unavailable"
	case status >= 500:
		return "internal"
	default:
		return "invalid_request"
	}
}

// authorized says whether the request carries the gateway key. The Runtime
// compares it once per request and passes the answer on (withAuthorization,
// audit C8); a Gateway served on its own compares it here.
func (g *Gateway) authorized(r *http.Request) bool {
	if known, ok := r.Context().Value(authorizationKey{}).(bool); ok {
		return known
	}
	return g.keyMatches(r)
}

func (g *Gateway) keyMatches(r *http.Request) bool {
	if g.Key == "" {
		return true
	}
	key := r.Header.Get("x-api-key")
	if key == "" {
		key = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	}
	return subtle.ConstantTimeCompare([]byte(key), []byte(g.Key)) == 1
}

type authorizationKey struct{}

// AdminAuthorized says whether r carries the management key as
// "Authorization: Bearer <key>". Every management endpoint of the Worker
// (/admin/* here, the Worker's /admin/features) checks it this one way
// (audit C13); an empty key opens nothing. Each endpoint keeps its own
// refusal.
func AdminAuthorized(r *http.Request, key string) bool {
	value, bearer := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	return key != "" && bearer && subtle.ConstantTimeCompare([]byte(value), []byte(key)) == 1
}

// withAuthorization is ctx carrying the gateway key comparison of a request.
func withAuthorization(ctx context.Context, authorized bool) context.Context {
	return context.WithValue(ctx, authorizationKey{}, authorized)
}

func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if r.URL.Path == "/healthz" && r.Method == "GET" {
		f := g.facts()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(Object{"status": "ok", "claude_version": f.CLIVersion, "cli_patch": f.CLIPatch, "cli_sha256": f.CLISHA256, "capabilities": f.Capabilities, "slots": f.Slots})
		return
	}
	diagnostic := newRequestDiagnostic(w, r)
	diagnostic.store = g.RequestLogs
	defer diagnostic.finish()
	// Only an authenticated request is logged (audit C7): an unknown caller
	// creates no directory and writes no headers.
	if !g.authorized(r) {
		refuse(401, "authentication_error", "Invalid gateway API key").write(w, diagnostic)
		return
	}
	// Every Worker runs the CLI's request command (audit C5): there is no
	// other way to answer.
	g.serveRequestCommand(diagnostic.capture(w, r), r, diagnostic)
}

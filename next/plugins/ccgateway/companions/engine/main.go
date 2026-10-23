package engine

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"regexp"
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
	RequestLogDir          string
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
	// A writer that named the source already (the native path's "cli") keeps it.
	if w.Header().Get(requestfailure.SourceHeader) == "" {
		w.Header().Set(requestfailure.SourceHeader, requestfailure.SourceGateway)
		w.Header().Set(requestfailure.ReasonHeader, gatewayReason(status, kind))
	}
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
func (g *Gateway) authorized(r *http.Request) bool {
	if g.Key == "" {
		return true
	}
	key := r.Header.Get("x-api-key")
	if key == "" {
		key = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	}
	return subtle.ConstantTimeCompare([]byte(key), []byte(g.Key)) == 1
}

var sessionName = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,128}$`)

func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if r.URL.Path == "/healthz" && r.Method == "GET" {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(Object{"status": "ok", "claude_version": g.Runner.Version, "cli_patch": g.CLIInfo.Patch, "cli_sha256": g.CLIInfo.SHA256, "capabilities": g.requestCapabilities()})
		return
	}
	diagnostic := newRequestDiagnostic(w, r)
	diagnostic.store = g.RequestLogs
	w = diagnostic.capture(w, r, g.RequestLogDir)
	defer diagnostic.finish()
	if g.RequestMode != "" {
		g.serveRequestCommand(w, r, diagnostic)
		return
	}
	// Every Worker runs the CLI's request command (audit C5): there is no
	// other way to answer, and none is improvised.
	diagnostic.fail(500, "api_error", "Worker has no request mode")
	apiError(w, 500, "api_error", "Worker has no request mode")
}

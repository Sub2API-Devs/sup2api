package check

import (
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// webSocketEndpoint validates an endpoint of kind "websocket". The client
// upgrades with GET; every message of the session that carries a model at
// request.modelPath is one turn, scheduled, metered by the usage.sse rules
// (matched by the message "type") and billed on its own. Nothing about it is
// a bounded JSON response, a plugin-read usage or an async task.
func (v *validator) webSocketEndpoint(f string, e manifest.Endpoint) {
	if !strings.EqualFold(e.Method, "GET") {
		v.add(f+".method", "invalid", "a websocket endpoint is opened with GET")
	}
	if e.Response.Stream != manifest.ResponseWebSocket {
		v.add(f+".response.stream", "required", "a websocket endpoint must declare response.stream %q", manifest.ResponseWebSocket)
	}
	if e.Response.NonStream != "" {
		v.add(f+".response.nonStream", "unsupported", "a websocket endpoint has no non-streaming response")
	}
	if e.Request.Stream || e.Request.StreamPath != "" {
		v.add(f+".request", "unsupported", "request.stream and request.streamPath do not apply to a websocket endpoint")
	}
	if e.Request.ModelParam != "" || e.Request.ModelSource != "" {
		v.add(f+".request", "unsupported", "a websocket endpoint reads the model only from request.modelPath")
	}
	if e.PluginUsage() {
		v.add(f+".usageSource", "unsupported", "a websocket endpoint is metered by its usage.sse rules")
	}
	if e.Task != nil {
		v.add(f+".task", "unsupported", "a websocket endpoint cannot be an async task endpoint")
	}
}

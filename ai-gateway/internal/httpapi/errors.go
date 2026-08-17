package httpapi

import (
	"encoding/json"
	"net"
	"net/http"
	"strconv"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
)

func ProtocolForRequest(r *http.Request) controlv1.Protocol {
	path := r.URL.Path
	if strings.HasPrefix(path, "/v1beta/") {
		return controlv1.Protocol_PROTOCOL_GEMINI
	}
	if path == "/v1/messages" || strings.HasPrefix(path, "/v1/messages/") {
		return controlv1.Protocol_PROTOCOL_ANTHROPIC
	}
	return controlv1.Protocol_PROTOCOL_OPENAI
}

func RemoteIP(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err == nil {
		return host
	}
	return remoteAddr
}

func WriteError(w http.ResponseWriter, protocol controlv1.Protocol, status int, code, message string, retryAfter int) {
	if code == "" {
		code = "gateway_error"
	}
	if message == "" {
		message = "Gateway request denied"
	}
	if retryAfter > 0 {
		w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	encoder := json.NewEncoder(w)
	switch protocol {
	case controlv1.Protocol_PROTOCOL_ANTHROPIC:
		_ = encoder.Encode(map[string]any{"type": "error", "error": map[string]any{"type": code, "message": message}})
	case controlv1.Protocol_PROTOCOL_GEMINI:
		_ = encoder.Encode(map[string]any{"error": map[string]any{"code": status, "status": code, "message": message}})
	default:
		_ = encoder.Encode(map[string]any{"error": map[string]any{"type": code, "code": code, "message": message}})
	}
}

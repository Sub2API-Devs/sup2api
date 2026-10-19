// Package requestfailure carries CLI failure facts across the trusted
// Worker/core boundary. This marker must never be accepted from a provider.
package requestfailure

import "net/http"

const SourceHeader = "X-CCGateway-Error-Source"

func Source(h http.Header) string {
	values := h.Values(SourceHeader)
	if len(values) != 1 {
		return ""
	}
	switch values[0] {
	case "http", "input", "transport", "timeout", "interrupted", "internal":
		return values[0]
	}
	return ""
}

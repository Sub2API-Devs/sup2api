// Package httpfacts defines the narrow provider response facts safe to relay
// across Worker and core boundaries. It does not copy request headers.
package httpfacts

import (
	"net/http"
	"strings"
)

func Select(source http.Header) http.Header {
	hop := map[string]bool{}
	for _, line := range source.Values("Connection") {
		for _, name := range strings.Split(line, ",") {
			hop[strings.ToLower(strings.TrimSpace(name))] = true
		}
	}
	out := http.Header{}
	for name, values := range source {
		lower := strings.ToLower(name)
		allowed := lower == "request-id" || lower == "retry-after" || lower == "x-should-retry" || strings.HasPrefix(lower, "anthropic-ratelimit-") || strings.HasPrefix(lower, "anthropic-fast-")
		if !allowed || hop[lower] {
			continue
		}
		for _, value := range values {
			if !strings.ContainsAny(value, "\r\n\x00") {
				out.Add(name, value)
			}
		}
	}
	return out
}

func Apply(destination, source http.Header) {
	for name, values := range Select(source) {
		destination[name] = append([]string(nil), values...)
	}
}

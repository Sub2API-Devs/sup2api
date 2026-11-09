package paramoverride

import "strings"

// The headers below are never copied from a client (header passthrough,
// CONTRACTS §81) nor written, read or removed by an override (§84):
// credentials (an account's own are set by the code building its upstream
// request), hop-by-hop and framing headers the transport owns, and client
// addresses a client could forge. Declared upstreams (sdk/upstream) hold
// their ordinary headers to the same list; only their auth declaration may
// write a credential header.
var blockedHeaders = map[string]struct{}{
	// RFC 9110 / 7230 hop-by-hop and framing.
	"connection":        {},
	"keep-alive":        {},
	"te":                {},
	"trailer":           {},
	"transfer-encoding": {},
	"upgrade":           {},
	"expect":            {},
	"host":              {},
	"content-length":    {},
	"content-encoding":  {},
	"accept-encoding":   {},
	// Credentials.
	"authorization":  {},
	"x-api-key":      {},
	"x-goog-api-key": {},
	"api-key":        {},
	"cookie":         {},
	// Client addresses and proxy trails.
	"x-forwarded-for":     {},
	"x-forwarded-host":    {},
	"x-forwarded-proto":   {},
	"x-forwarded-port":    {},
	"x-real-ip":           {},
	"forwarded":           {},
	"via":                 {},
	"cf-connecting-ip":    {},
	"true-client-ip":      {},
	"x-client-ip":         {},
	"x-cluster-client-ip": {},
}

// blockedHeaderPrefixes are the blocked header families: proxy credentials,
// WebSocket handshakes, and the control headers of this gateway and of the
// gateways it fronts (x-kin-* steers vm2api/sakura).
var blockedHeaderPrefixes = []string{"proxy-", "sec-websocket-", "x-sub2api-", "x-kin-"}

// HeaderBlocked reports whether the header is one no passthrough rule may
// forward and no override or ordinary upstream header may touch.
func HeaderBlocked(name string) bool {
	n := strings.ToLower(strings.TrimSpace(name))
	if n == "" {
		return true
	}
	if _, ok := blockedHeaders[n]; ok {
		return true
	}
	for _, p := range blockedHeaderPrefixes {
		if strings.HasPrefix(n, p) {
			return true
		}
	}
	return false
}

// ValidHeaderName reports whether s is an HTTP field name (RFC 9110 token).
func ValidHeaderName(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case c >= 'a' && c <= 'z', c >= 'A' && c <= 'Z', c >= '0' && c <= '9':
		case strings.IndexByte("!#$%&'*+-.^_`|~", c) >= 0:
		default:
			return false
		}
	}
	return true
}

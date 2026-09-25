package proxy

import (
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Spec is a parsed proxy address (alias of core.ProxySpec so callers in
// other modules can pass it to core.ProxyResolver / ProxyDirectory).
type Spec = core.ProxySpec

// ParseURL is core.ParseProxyURL (CONTRACTS §21.4); the parser lives in core
// so other modules do not import this package.
func ParseURL(raw string) (Spec, error) { return core.ParseProxyURL(raw) }

// checkSpec re-validates a Spec handed in by another module (the resolver and
// HTTPClientFor trust nothing that did not come through ParseURL).
func checkSpec(spec Spec) error {
	switch spec.Protocol {
	case "http", "https", "socks5":
	default:
		return core.ErrInvalidArgument.WithMessage("invalid proxy protocol")
	}
	if spec.Host == "" || len(spec.Host) > 255 || strings.ContainsAny(spec.Host, "/?#@ \t") {
		return core.ErrInvalidArgument.WithMessage("invalid proxy host")
	}
	if spec.Port < 1 || spec.Port > 65535 {
		return core.ErrInvalidArgument.WithMessage("invalid proxy port")
	}
	if len(spec.Username) > 255 || len(spec.Password) > 1024 {
		return core.ErrInvalidArgument.WithMessage("proxy credentials too long")
	}
	return nil
}

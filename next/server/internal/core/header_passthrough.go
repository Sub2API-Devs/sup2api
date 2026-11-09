package core

import (
	"context"
	"net/http"

	"github.com/Sub2API-Devs/sup2api/next/sdk/paramoverride"
)

// Header passthrough (CONTRACTS §81). The rules engine lives in
// sdk/paramoverride, where manifest/check validates declared defaults with
// the same parser; these names keep the core's callers unchanged.

// MaxHeaderPassthroughRules caps the rules of one account.
const MaxHeaderPassthroughRules = paramoverride.MaxPassthroughRules

// HeaderPassthroughBlocked reports whether no rule may forward the header.
// The list is shared with the §84 override and declared upstreams
// (sdk/paramoverride).
func HeaderPassthroughBlocked(name string) bool { return paramoverride.HeaderBlocked(name) }

// NormalizeHeaderPassthrough trims, validates and de-duplicates the rules of
// an account, with the messages in the request locale.
func NormalizeHeaderPassthrough(ctx context.Context, field string, rules []string) ([]string, []FieldError) {
	out, errs := paramoverride.NormalizePassthrough(field, rules, Locale(ctx) == "zh")
	return out, fieldErrors(errs)
}

// PassthroughHeaders returns the client headers the rules forward, keyed by
// canonical name, with every value of each.
func PassthroughHeaders(rules []string, inbound http.Header) http.Header {
	return paramoverride.PassthroughHeaders(rules, inbound)
}

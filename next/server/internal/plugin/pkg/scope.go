package pkg

import (
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
)

// Scope semantics shared by validation, consent and upgrade diffs. The rules
// live in the SDK next to manifest validation, which applies them to
// hostPermissions[].scope; this file keeps the names server modules import.
//
// A host permission scope is a JSON object. A key that is absent means "no
// restriction on that dimension". Lists restrict to their members (entries
// may be "*", "prefix.*" or "*.domain" patterns); numbers are upper bounds;
// strings and booleans must match exactly; objects nest.

// ScopeWithin reports whether narrow grants no more than wide.
func ScopeWithin(narrow, wide map[string]any) bool { return check.ScopeWithin(narrow, wide) }

// PatternCovers reports whether pattern p covers value v. Supported forms:
// exact, "*", "prefix.*" (and "prefix*"), "*.domain" (suffix match on a
// dot boundary). A pattern value is covered by an identical or broader
// pattern ("usage.*" covers "usage.x.*").
func PatternCovers(p, v string) bool { return check.PatternCovers(p, v) }

// StringList reads scope[key] as a list of strings; ok is false when the key
// is absent or not a list of strings.
func StringList(scope map[string]any, key string) (list []string, ok bool) {
	return check.StringList(scope, key)
}

// CoveredBy reports whether every value is covered by some pattern.
func CoveredBy(values, patterns []string) (missing []string) {
	return check.CoveredBy(values, patterns)
}

// NormalizeScope round-trips a scope through JSON so values have the
// encoding/json generic types ([]any, float64, map[string]any).
func NormalizeScope(s map[string]any) map[string]any { return check.NormalizeScope(s) }

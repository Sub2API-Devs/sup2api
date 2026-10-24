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

// NormalizeScope round-trips a scope through JSON so values have the
// encoding/json generic types ([]any, float64, map[string]any).
func NormalizeScope(s map[string]any) map[string]any { return check.NormalizeScope(s) }

package pkg

import (
	"encoding/json"
	"reflect"
	"strings"
)

// Scope semantics shared by validation, consent and upgrade diffs.
//
// A host permission scope is a JSON object. A key that is absent means "no
// restriction on that dimension". Lists restrict to their members (entries
// may be "*", "prefix.*" or "*.domain" patterns); numbers are upper bounds;
// strings and booleans must match exactly; objects nest.

// ScopeWithin reports whether narrow grants no more than wide.
func ScopeWithin(narrow, wide map[string]any) bool {
	for k, wv := range wide {
		nv, ok := narrow[k]
		if !ok {
			return false // narrow is unrestricted where wide is restricted
		}
		if !valueWithin(nv, wv) {
			return false
		}
	}
	return true
}

func valueWithin(n, w any) bool {
	switch wv := w.(type) {
	case []any:
		nl, ok := n.([]any)
		if !ok {
			return false
		}
		for _, item := range nl {
			if !listCovers(wv, item) {
				return false
			}
		}
		return true
	case []string:
		return valueWithin(n, toAnySlice(wv))
	case map[string]any:
		nm, ok := n.(map[string]any)
		if !ok {
			return false
		}
		return ScopeWithin(nm, wv)
	case float64, int, int64, json.Number:
		nf, ok1 := toFloat(n)
		wf, ok2 := toFloat(w)
		return ok1 && ok2 && nf <= wf
	default:
		if ns, ok := n.([]string); ok {
			return valueWithin(toAnySlice(ns), w)
		}
		return reflect.DeepEqual(n, w)
	}
}

func listCovers(list []any, item any) bool {
	is, isStr := item.(string)
	for _, e := range list {
		if es, ok := e.(string); ok && isStr {
			if PatternCovers(es, is) {
				return true
			}
			continue
		}
		if reflect.DeepEqual(e, item) {
			return true
		}
	}
	return false
}

// PatternCovers reports whether pattern p covers value v. Supported forms:
// exact, "*", "prefix.*" (and "prefix*"), "*.domain" (suffix match on a
// dot boundary). A pattern value is covered by an identical or broader
// pattern ("usage.*" covers "usage.x.*").
func PatternCovers(p, v string) bool {
	switch {
	case p == v || p == "*":
		return true
	case strings.HasSuffix(p, "*") && !strings.HasPrefix(p, "*"):
		return strings.HasPrefix(v, strings.TrimSuffix(p, "*"))
	case strings.HasPrefix(p, "*."):
		suffix := p[1:] // ".domain"
		return strings.HasSuffix(v, suffix) && len(v) > len(suffix)
	}
	return false
}

// StringList reads scope[key] as a list of strings; ok is false when the key
// is absent or not a list of strings.
func StringList(scope map[string]any, key string) (list []string, ok bool) {
	v, present := scope[key]
	if !present {
		return nil, false
	}
	switch t := v.(type) {
	case []string:
		return t, true
	case []any:
		out := make([]string, 0, len(t))
		for _, e := range t {
			s, isStr := e.(string)
			if !isStr {
				return nil, false
			}
			out = append(out, s)
		}
		return out, true
	}
	return nil, false
}

// CoveredBy reports whether every value is covered by some pattern.
func CoveredBy(values, patterns []string) (missing []string) {
	for _, v := range values {
		ok := false
		for _, p := range patterns {
			if PatternCovers(p, v) {
				ok = true
				break
			}
		}
		if !ok {
			missing = append(missing, v)
		}
	}
	return missing
}

// NormalizeScope round-trips a scope through JSON so values have the
// encoding/json generic types ([]any, float64, map[string]any).
func NormalizeScope(s map[string]any) map[string]any {
	if s == nil {
		return map[string]any{}
	}
	b, err := json.Marshal(s)
	if err != nil {
		return map[string]any{}
	}
	out := map[string]any{}
	_ = json.Unmarshal(b, &out)
	return out
}

func toAnySlice(s []string) []any {
	out := make([]any, len(s))
	for i, v := range s {
		out[i] = v
	}
	return out
}

func toFloat(v any) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case int:
		return float64(t), true
	case int64:
		return float64(t), true
	case json.Number:
		f, err := t.Float64()
		return f, err == nil
	}
	return 0, false
}

package pkg

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Gateway endpoint paths (ARCHITECTURE 6.4) use a gin-like syntax: each
// segment is a literal, a parameter ":name", a parameter with a literal
// suffix ":name:suffix" (e.g. ":model:generateContent" matches
// "gemini-pro:generateContent", the suffix keeps its leading colon), or a
// trailing catch-all "*name".

var paramNameRe = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

type segKind int

const (
	segLiteral segKind = iota
	segParam
	segCatchAll
)

type pathSeg struct {
	kind   segKind
	lit    string // literal text (segLiteral)
	name   string // parameter name (segParam, segCatchAll)
	suffix string // literal suffix after the parameter, including ':' (segParam)
}

// parseEndpointPath splits p into segments; err describes the first
// malformed segment.
func parseEndpointPath(p string) ([]pathSeg, error) {
	if !strings.HasPrefix(p, "/") {
		return nil, fmt.Errorf("path must start with /")
	}
	parts := strings.Split(strings.TrimPrefix(p, "/"), "/")
	segs := make([]pathSeg, 0, len(parts))
	for i, s := range parts {
		switch {
		case strings.HasPrefix(s, ":"):
			name, suffix, hasSuffix := strings.Cut(s[1:], ":")
			if !paramNameRe.MatchString(name) {
				return nil, fmt.Errorf("invalid parameter name in segment %q", s)
			}
			if hasSuffix {
				if suffix == "" {
					return nil, fmt.Errorf("empty suffix in segment %q", s)
				}
				suffix = ":" + suffix
			}
			segs = append(segs, pathSeg{kind: segParam, name: name, suffix: suffix})
		case strings.HasPrefix(s, "*"):
			if i != len(parts)-1 {
				return nil, fmt.Errorf("catch-all %q must be the last segment", s)
			}
			if !paramNameRe.MatchString(s[1:]) {
				return nil, fmt.Errorf("invalid parameter name in segment %q", s)
			}
			segs = append(segs, pathSeg{kind: segCatchAll, name: s[1:]})
		default:
			segs = append(segs, pathSeg{kind: segLiteral, lit: s})
		}
	}
	return segs, nil
}

// PathParams returns the parameter names of an endpoint path (nil when the
// path is malformed).
func PathParams(p string) []string {
	segs, err := parseEndpointPath(p)
	if err != nil {
		return nil
	}
	var out []string
	for _, s := range segs {
		if s.kind != segLiteral {
			out = append(out, s.name)
		}
	}
	return out
}

// segsOverlap reports whether some non-empty path segment matches both.
func segsOverlap(a, b pathSeg) bool {
	switch {
	case a.kind == segLiteral && b.kind == segLiteral:
		return a.lit == b.lit
	case a.kind == segLiteral:
		return litMatchesParam(a.lit, b)
	case b.kind == segLiteral:
		return litMatchesParam(b.lit, a)
	default:
		// Two parameters: a value ending with the longer suffix (and a
		// non-empty parameter part) matches both when one suffix ends the
		// other.
		return strings.HasSuffix(a.suffix, b.suffix) || strings.HasSuffix(b.suffix, a.suffix)
	}
}

func litMatchesParam(lit string, p pathSeg) bool {
	return len(lit) > len(p.suffix) && strings.HasSuffix(lit, p.suffix)
}

// PathsOverlap reports whether some request path matches both endpoint path
// patterns (malformed paths never overlap).
func PathsOverlap(a, b string) bool {
	sa, errA := parseEndpointPath(strings.TrimSuffix(a, "/"))
	sb, errB := parseEndpointPath(strings.TrimSuffix(b, "/"))
	if errA != nil || errB != nil {
		return false
	}
	for i := 0; ; i++ {
		endA, endB := i == len(sa), i == len(sb)
		switch {
		case endA && endB:
			return true
		case endA:
			return sb[i].kind == segCatchAll
		case endB:
			return sa[i].kind == segCatchAll
		}
		if sa[i].kind == segCatchAll || sb[i].kind == segCatchAll {
			return true
		}
		if !segsOverlap(sa[i], sb[i]) {
			return false
		}
	}
}

// EndpointsConflict reports whether two gateway endpoints could both match
// one request (same method, overlapping path patterns).
func EndpointsConflict(a, b manifest.Endpoint) bool {
	return strings.EqualFold(a.Method, b.Method) && PathsOverlap(a.Path, b.Path)
}

// Package perm names permission keys and the row ranges they open. It is a
// leaf package: it imports nothing internal, so every module can use it.
package perm

import "slices"

// Key is a permission key, e.g. "account:read".
type Key string

// Scoped is a row range: any All key reaches every row, any Own key only the
// rows the caller created (CONTRACTS §21.1). Keys() is what a route accepts.
type Scoped struct{ All, Own []Key }

// Pair is the common Scoped of one "all" key and its "own" counterpart.
func Pair(all, own Key) Scoped { return Scoped{All: []Key{all}, Own: []Key{own}} }

// OrAll returns s with more "all" keys; s itself is left unchanged.
func (s Scoped) OrAll(k ...Key) Scoped {
	s.All = slices.Concat(s.All, k)
	return s
}

// Keys lists every accepted key, the All keys first, without duplicates.
func (s Scoped) Keys() []Key {
	seen := make(map[Key]struct{}, len(s.All)+len(s.Own))
	return slices.DeleteFunc(slices.Concat(s.All, s.Own), func(k Key) bool {
		_, dup := seen[k]
		seen[k] = struct{}{}
		return dup
	})
}

// Strings converts keys to plain strings, for APIs that take []string.
func Strings(keys []Key) []string {
	out := make([]string, len(keys))
	for i, k := range keys {
		out[i] = string(k)
	}
	return out
}

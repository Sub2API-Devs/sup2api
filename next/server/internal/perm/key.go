// Package perm names permission keys and parses their scopes (CONTRACTS
// §21.0). It is a leaf package: it imports nothing internal, so every module
// can use it.
package perm

// Key is a permission key, e.g. "account:read" or "account:read:own".
type Key string

// Strings converts keys to plain strings, for APIs that take []string.
func Strings(keys []Key) []string {
	out := make([]string, len(keys))
	for i, k := range keys {
		out[i] = string(k)
	}
	return out
}

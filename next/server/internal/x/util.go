// Package x provides small utility functions used across the codebase.
package x

import (
	"strconv"
	"unicode/utf8"
)

// Itoa64 converts an int64 to a string.
func Itoa64(n int64) string {
	return strconv.FormatInt(n, 10)
}

// TruncUTF8 truncates s to at most n bytes, cutting at a rune boundary.
func TruncUTF8(s string, n int) string {
	if len(s) <= n {
		return s
	}
	for n > 0 && n < len(s) && !utf8.RuneStart(s[n]) {
		n--
	}
	return s[:n]
}

// PtrIfPositive returns a pointer to v if v > 0, otherwise nil.
func PtrIfPositive(v int64) *int64 {
	if v > 0 {
		return &v
	}
	return nil
}

// Uniq removes consecutive duplicates from a sorted slice.
func Uniq[T comparable](s []T) []T {
	if len(s) == 0 {
		return s
	}
	w := 1
	for i := 1; i < len(s); i++ {
		if s[i] != s[i-1] {
			s[w] = s[i]
			w++
		}
	}
	return s[:w]
}

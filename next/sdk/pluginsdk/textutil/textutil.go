// Package textutil holds the small string helpers every plugin used to copy:
// cutting text to a rune or byte budget without splitting a UTF-8 sequence.
package textutil

import "unicode/utf8"

// TruncateRunes returns at most n runes of s.
func TruncateRunes(s string, n int) string {
	if n <= 0 {
		return ""
	}
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	return string([]rune(s)[:n])
}

// TruncateBytes returns at most n bytes of s, cut on a rune boundary.
func TruncateBytes(s string, n int) string {
	if len(s) <= n {
		return s
	}
	if n <= 0 {
		return ""
	}
	for n > 0 && !utf8.RuneStart(s[n]) {
		n--
	}
	return s[:n]
}

// Clip is TruncateBytes followed by "..." when something was cut. It is the
// form used for upstream messages in account reasons and logs.
func Clip(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return TruncateBytes(s, n) + "..."
}

package store

import "strings"

// Like escapes ILIKE wildcard characters (%, _) for use in SQL ILIKE patterns.
// Wrap the result with % as needed: ILIKE '%' || Like(input) || '%'
func Like(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "%", "\\%")
	s = strings.ReplaceAll(s, "_", "\\_")
	return s
}

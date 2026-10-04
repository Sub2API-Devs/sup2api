package textutil

import "testing"

func TestTruncate(t *testing.T) {
	for _, c := range []struct {
		fn   func(string, int) string
		in   string
		n    int
		want string
	}{
		{TruncateRunes, "héllo", 2, "hé"},
		{TruncateRunes, "héllo", 9, "héllo"},
		{TruncateRunes, "abc", 0, ""},
		{TruncateBytes, "héllo", 2, "h"}, // é is two bytes: never split it
		{TruncateBytes, "héllo", 3, "hé"},
		{TruncateBytes, "abc", 5, "abc"},
		{TruncateBytes, "abc", -1, ""},
		{Clip, "abcdef", 3, "abc..."},
		{Clip, "abc", 3, "abc"},
		{Clip, "中文字", 4, "中..."},
	} {
		if got := c.fn(c.in, c.n); got != c.want {
			t.Errorf("(%q, %d) = %q, want %q", c.in, c.n, got, c.want)
		}
	}
}

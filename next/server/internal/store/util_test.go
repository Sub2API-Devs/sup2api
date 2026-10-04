package store

import "testing"

func TestLike(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"hello", "hello"},
		{"hello%world", "hello\\%world"},
		{"hello_world", "hello\\_world"},
		{"100%", "100\\%"},
		{"a_b%c", "a\\_b\\%c"},
		{"back\\slash", "back\\\\slash"},
		{"\\%_", "\\\\\\%\\_"},
		{"", ""},
	}
	for _, tt := range tests {
		if got := Like(tt.input); got != tt.want {
			t.Errorf("Like(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

package x

import (
	"testing"
)

func TestItoa64(t *testing.T) {
	tests := []struct {
		n    int64
		want string
	}{
		{0, "0"},
		{123, "123"},
		{-456, "-456"},
		{9223372036854775807, "9223372036854775807"},
	}
	for _, tt := range tests {
		if got := Itoa64(tt.n); got != tt.want {
			t.Errorf("Itoa64(%d) = %q, want %q", tt.n, got, tt.want)
		}
	}
}

func TestTruncUTF8(t *testing.T) {
	tests := []struct {
		s    string
		n    int
		want string
	}{
		{"hello", 10, "hello"},
		{"hello", 3, "hel"},
		{"你好世界", 6, "你好"},
		{"你好世界", 7, "你好"},
		{"你好世界", 4, "你"},
		{"", 5, ""},
	}
	for _, tt := range tests {
		if got := TruncUTF8(tt.s, tt.n); got != tt.want {
			t.Errorf("TruncUTF8(%q, %d) = %q, want %q", tt.s, tt.n, got, tt.want)
		}
	}
}

func TestPtrIfPositive(t *testing.T) {
	tests := []struct {
		v       int64
		wantNil bool
	}{
		{1, false},
		{100, false},
		{0, true},
		{-1, true},
	}
	for _, tt := range tests {
		got := PtrIfPositive(tt.v)
		if tt.wantNil {
			if got != nil {
				t.Errorf("PtrIfPositive(%d) = %v, want nil", tt.v, got)
			}
		} else {
			if got == nil || *got != tt.v {
				t.Errorf("PtrIfPositive(%d) = %v, want %d", tt.v, got, tt.v)
			}
		}
	}
}

func TestUniq(t *testing.T) {
	tests := []struct {
		s    []int
		want []int
	}{
		{[]int{1, 2, 2, 3, 3, 3, 4}, []int{1, 2, 3, 4}},
		{[]int{1, 1, 1, 1}, []int{1}},
		{[]int{1, 2, 3}, []int{1, 2, 3}},
		{[]int{}, []int{}},
		{nil, nil},
	}
	for _, tt := range tests {
		got := Uniq(tt.s)
		if len(got) != len(tt.want) {
			t.Errorf("Uniq(%v) = %v, want %v", tt.s, got, tt.want)
			continue
		}
		for i := range got {
			if got[i] != tt.want[i] {
				t.Errorf("Uniq(%v) = %v, want %v", tt.s, got, tt.want)
				break
			}
		}
	}
}

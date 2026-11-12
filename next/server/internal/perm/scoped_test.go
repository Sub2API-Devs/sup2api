package perm

import (
	"slices"
	"testing"
)

func TestScopedKeys(t *testing.T) {
	s := Scoped{All: []Key{"a", "b", "a"}, Own: []Key{"c", "b", "c"}}
	if got, want := s.Keys(), []Key{"a", "b", "c"}; !slices.Equal(got, want) {
		t.Fatalf("Keys() = %v, want %v", got, want)
	}
	if got := (Scoped{}).Keys(); len(got) != 0 {
		t.Fatalf("empty Keys() = %v", got)
	}
}

func TestScopedOrAll(t *testing.T) {
	base := Pair("x:read", "x:own:read")
	wider := base.OrAll("settings:manage")
	if got, want := wider.Keys(), []Key{"x:read", "settings:manage", "x:own:read"}; !slices.Equal(got, want) {
		t.Fatalf("OrAll Keys() = %v, want %v", got, want)
	}
	if got, want := base.All, []Key{"x:read"}; !slices.Equal(got, want) {
		t.Fatalf("OrAll changed its receiver: All = %v", got)
	}
	// Appending to a value with spare capacity must not leak into siblings.
	s := Scoped{All: make([]Key, 1, 4)}
	a, b := s.OrAll("a"), s.OrAll("b")
	if a.All[1] != "a" || b.All[1] != "b" {
		t.Fatalf("OrAll results share storage: %v %v", a.All, b.All)
	}
}

func TestStrings(t *testing.T) {
	if got, want := Strings([]Key{"a", "b"}), []string{"a", "b"}; !slices.Equal(got, want) {
		t.Fatalf("Strings() = %v, want %v", got, want)
	}
	if got := Strings(nil); len(got) != 0 {
		t.Fatalf("Strings(nil) = %v", got)
	}
}

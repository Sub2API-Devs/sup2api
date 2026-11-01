package rnd

import (
	"strings"
	"testing"
)

// covers: S5 S6 U1 (secrets.token_urlsafe / token_hex lengths and alphabets)
func TestTokens(t *testing.T) {
	r := Crypto()
	if s := TokenURLSafe(r, 32); len(s) != 43 || strings.ContainsAny(s, "+/=") {
		t.Fatal(s)
	}
	if s := TokenURLSafe(r, 16); len(s) != 22 {
		t.Fatal(s)
	}
	if s := TokenHex(r, 6); len(s) != 12 || strings.Trim(s, "0123456789abcdef") != "" {
		t.Fatal(s)
	}
	for i := 0; i < 1000; i++ {
		if n := r.Intn(7); n < 0 || n >= 7 {
			t.Fatal(n)
		}
	}
	func() {
		defer func() {
			if recover() == nil {
				t.Error("Intn(0) must panic")
			}
		}()
		r.Intn(0)
	}()
}

// covers: N2 N3 (deterministic test source)
func TestFixed(t *testing.T) {
	f := Fixed(1, 5, -2)
	if f.Intn(3) != 2 || f.Intn(10) != 2 || f.Intn(4) != 1 {
		t.Fatal("cycling choices")
	}
	if got := TokenHex(f, 2); got != "0102" {
		t.Fatal(got)
	}
	if Choice(Fixed(0, 1), []string{"a", "b"}) != "b" || Fixed(0).Intn(5) != 0 {
		t.Fatal("Choice")
	}
}

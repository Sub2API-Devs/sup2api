package helperhistory

import (
	"bytes"
	"testing"
)

func TestIndependentCanonicalBoundPreservesNumericLexemes(t *testing.T) {
	raw := []byte(` { "z":-0, "a":[9007199254740993,1.2300,1e400],"text":"<>&" } `)
	if _, err := CanonicalJSON(raw, len(raw)-1); err == nil {
		t.Fatal("input bound ignored")
	}
	got, err := CanonicalJSON(raw, len(raw))
	if err != nil {
		t.Fatal(err)
	}
	want := []byte(`{"a":[9007199254740993,1.2300,1e400],"text":"\u003c\u003e\u0026","z":-0}`)
	if !bytes.Equal(got, want) {
		t.Fatalf("canonical bytes differ: %s", got)
	}
	for _, limit := range []int{-1, 0} {
		if _, err := CanonicalJSON(raw, limit); err == nil {
			t.Fatal("invalid bound accepted")
		}
	}
}

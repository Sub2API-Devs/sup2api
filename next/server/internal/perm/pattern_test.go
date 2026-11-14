package perm

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/permvectors"
)

type vectors struct {
	Canonical []struct {
		In, Out string
		Invalid bool
	}
	Implies []struct {
		Have, Want string
		OK         bool
	}
}

func loadVectors(t *testing.T) vectors {
	t.Helper()
	var v vectors
	if err := json.Unmarshal(permvectors.JSON, &v); err != nil || len(v.Canonical) == 0 || len(v.Implies) == 0 {
		t.Fatalf("vectors: %v", err)
	}
	return v
}

// The shared vectors (sdk/permvectors) pin the canonical spelling.
func TestCanonicalVectors(t *testing.T) {
	t.Parallel()
	for _, c := range loadVectors(t).Canonical {
		got, err := Canonical(c.In)
		if c.Invalid {
			if err == nil {
				t.Errorf("Canonical(%q) = %q, want invalid", c.In, got)
			}
			continue
		}
		if err != nil || string(got) != c.Out {
			t.Errorf("Canonical(%q) = %q, %v; want %q", c.In, got, err, c.Out)
		}
		// Canonical is idempotent and Parse round-trips through Key.
		if again, err := Canonical(string(got)); err != nil || again != got {
			t.Errorf("Canonical(%q) again = %q, %v", got, again, err)
		}
	}
}

// The shared vectors pin the implies table (design §1.4).
func TestImpliesVectors(t *testing.T) {
	t.Parallel()
	for _, c := range loadVectors(t).Implies {
		have, err1 := Parse(c.Have)
		want, err2 := Parse(c.Want)
		if err1 != nil || err2 != nil {
			t.Fatalf("parse %q / %q: %v %v", c.Have, c.Want, err1, err2)
		}
		if got := Implies(have, want); got != c.OK {
			t.Errorf("Implies(%q, %q) = %v, want %v", c.Have, c.Want, got, c.OK)
		}
	}
}

// Implies is a preorder on the parsed scopes: reflexive and transitive.
func TestImpliesPreorder(t *testing.T) {
	t.Parallel()
	var pats []Pattern
	for _, c := range loadVectors(t).Canonical {
		if p, err := Parse(c.In); err == nil && p.Action == AccountUpdate {
			pats = append(pats, p)
		}
	}
	for _, a := range pats {
		if !Implies(a, a) {
			t.Errorf("%s does not imply itself", a.Key())
		}
		for _, b := range pats {
			for _, c := range pats {
				if Implies(a, b) && Implies(b, c) && !Implies(a, c) {
					t.Errorf("%s ⇒ %s ⇒ %s but not %s ⇒ %s", a.Key(), b.Key(), c.Key(), a.Key(), c.Key())
				}
			}
		}
	}
}

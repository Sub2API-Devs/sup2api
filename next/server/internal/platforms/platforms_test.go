package platforms

import (
	"strings"
	"testing"
)

func TestBuiltinPlatforms(t *testing.T) {
	seen := map[string]string{}
	for _, p := range Builtin() {
		if len(p.Endpoints) == 0 {
			t.Fatalf("%s has no endpoints", p.ID)
		}
		for _, e := range p.Endpoints {
			if !strings.HasPrefix(e.Protocol, p.ID+".") {
				t.Errorf("%s: protocol %q must start with the platform id", p.ID, e.Protocol)
			}
			k := e.Method + " " + e.Path
			if other, dup := seen[k]; dup {
				t.Errorf("endpoint %s declared by %s and %s", k, other, p.ID)
			}
			seen[k] = p.ID
		}
	}
	if !IsBuiltin("anthropic") || IsBuiltin("relay") {
		t.Fatal("IsBuiltin")
	}
}

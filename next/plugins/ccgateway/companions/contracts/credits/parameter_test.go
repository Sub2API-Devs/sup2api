package credits

import (
	"encoding/json"
	"testing"
)

func TestParameterShapesAndJulyGate(t *testing.T) {
	for _, raw := range []string{`null`, `"test-token"`, `{"token":"test-token"}`, `{"token":"test-token","mode":"best_effort"}`} {
		var v any
		json.Unmarshal([]byte(raw), &v)
		p, err := ParseParameter(v)
		if err != nil {
			t.Fatal(err)
		}
		if p.Present && p.ValidateBetas([]string{"fallback-credit-2026-07-01"}) != nil {
			t.Fatal(raw)
		}
		if p.Object && p.ValidateBetas([]string{"server-side-fallback-2026-07-01"}) == nil {
			t.Fatal("object accepted without exact July beta")
		}
		if p.Present {
			var decoded any
			json.Unmarshal(p.Raw, &decoded)
			again, _ := ParseParameter(decoded)
			if again.Mode != p.Mode || again.Object != p.Object || again.Token != p.Token {
				t.Fatal("shape lost")
			}
		}
	}
	for _, raw := range []string{`false`, `[]`, `{"token":""}`, `{"token":"x","mode":null}`, `{"token":"x","extra":1}`, `{"token":"x","mode":"relaxed"}`} {
		var v any
		json.Unmarshal([]byte(raw), &v)
		if _, err := ParseParameter(v); err == nil {
			t.Fatalf("accepted %s", raw)
		}
	}
}

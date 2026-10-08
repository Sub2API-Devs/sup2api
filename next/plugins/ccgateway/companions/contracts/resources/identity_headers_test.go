package resources

import (
	"net/http"
	"testing"
)

func TestIdentityHeadersRequireExactlyOneValue(t *testing.T) {
	id := Identity{PrincipalID: "issuer", Generation: "generation"}
	for _, name := range []string{PrincipalHeader, GenerationHeader} {
		for _, mode := range []string{"valid", "missing", "empty", "wrong", "same-duplicate", "conflict", "comma"} {
			t.Run(name+"/"+mode, func(t *testing.T) {
				h := http.Header{}
				h.Set(PrincipalHeader, id.PrincipalID)
				h.Set(GenerationHeader, id.Generation)
				v := h.Get(name)
				switch mode {
				case "missing":
					h.Del(name)
				case "empty":
					h.Set(name, "")
				case "wrong":
					h.Set(name, "other")
				case "same-duplicate":
					h.Add(name, v)
				case "conflict":
					h.Add(name, "other")
				case "comma":
					h.Set(name, v+",other")
				}
				if err := ValidateIdentityHeaders(h, id); (err == nil) != (mode == "valid") {
					t.Fatal(mode, err)
				}
			})
		}
	}
}

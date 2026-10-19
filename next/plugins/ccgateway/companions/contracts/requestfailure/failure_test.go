package requestfailure

import (
	"net/http"
	"testing"
)

func TestSourceAcceptsOnlyOneKnownLocalMarker(t *testing.T) {
	for _, source := range []string{"http", "input", "transport", "timeout", "interrupted", "internal"} {
		h := http.Header{}
		h.Set(SourceHeader, source)
		if Source(h) != source {
			t.Fatal(source)
		}
		h.Add(SourceHeader, source)
		if Source(h) != "" {
			t.Fatal("ambiguous source accepted")
		}
	}
	for _, source := range []string{"", "proxy", "transport,internal", "transport\r\nsecret"} {
		h := http.Header{}
		h.Set(SourceHeader, source)
		if Source(h) != "" {
			t.Fatal(source)
		}
	}
}

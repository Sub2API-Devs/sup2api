package requestfailure

import (
	"net/http"
	"testing"
)

func TestSourceAcceptsOnlyOneKnownLocalMarker(t *testing.T) {
	for _, source := range []string{"http", "input", "transport", "timeout", "interrupted", "internal", "gateway", "core"} {
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

func TestLocalSourcesAndReasons(t *testing.T) {
	for source, local := range map[string]bool{SourceGateway: true, SourceCore: true, SourceHTTP: false, SourceInternal: false, "": false} {
		if Local(source) != local {
			t.Fatal(source)
		}
	}
	if SourceOf([]string{"core"}) != "core" || SourceOf([]string{"Core"}) != "" || SourceOf(nil) != "" {
		t.Fatal("SourceOf")
	}
	h := http.Header{}
	h.Set(ReasonHeader, "configuration_error")
	if Reason(h) != "configuration_error" {
		t.Fatal("reason")
	}
	for _, bad := range []string{"", "Configuration Error", "x\r\ny", "9abc"} {
		if ReasonOf(bad) != "" {
			t.Fatal(bad)
		}
	}
}

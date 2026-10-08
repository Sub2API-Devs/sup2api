package core

import (
	"encoding/json"
	"testing"
)

func TestHelperUsageEnvelopeVersionAndNumberLexemes(t *testing.T) {
	old := []byte(`{"Version":1,"Record":{"RequestID":"old","Metrics":{"big":9007199254740993,"decimal":1.2300}}}`)
	r, d, err := DecodeHelperHistoryUsage(old)
	if err != nil || len(d) != 64 {
		t.Fatal(err)
	}
	if r.Metrics["big"] != json.Number("9007199254740993") || r.Metrics["decimal"] != json.Number("1.2300") {
		t.Fatal("number lexemes lost")
	}
	_, newDigest, err := HelperHistoryUsageBytes(r)
	if err != nil || newDigest == d {
		t.Fatal("test must cover old envelope with missing newer zero fields")
	}
	for _, raw := range []string{`{"Version":2,"Record":{}}`, `{"Version":1,"Record":{"FutureField":true}}`, `{"Version":1,"Record":{}}{}`} {
		if _, _, err := DecodeHelperHistoryUsage([]byte(raw)); err == nil {
			t.Fatal("unknown schema silently consumed")
		}
	}
}

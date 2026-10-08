package helperhistory

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func transportFixture(t *testing.T) RequestEnvelope {
	t.Helper()
	raw := json.RawMessage(`{"messages":[{"role":"user","content":"fixture"}],"n":9007199254740993}`)
	d, e := CanonicalDigest(raw)
	if e != nil {
		t.Fatal(e)
	}
	return RequestEnvelope{Version: Version, AttemptID: "attempt", RequestDigest: d, Namespace: "policy-v1", Identity: resources.Identity{PrincipalID: "issuer", Generation: "generation"}, Request: raw}
}
func TestHelperTransportRoundTripAndHeaderIsolation(t *testing.T) {
	r := transportFixture(t)
	raw, _ := json.Marshal(r)
	decoded, e := DecodeRequest(raw)
	if e != nil || !bytes.Equal(decoded.Request, r.Request) {
		t.Fatal("request changed", e)
	}
	body := []byte("event: error\r\ndata: {\"type\":\"error\",\"n\":9007199254740993}\r\n\r\n")
	s := ResponseEnvelope{Version: Version, AttemptID: r.AttemptID, RequestDigest: r.RequestDigest, Namespace: r.Namespace, Identity: r.Identity, StatusCode: 400, ContentType: "text/event-stream", Headers: http.Header{"Retry-After": []string{"7"}}, Body: body, Delta: json.RawMessage(`{"version":1,"segments":[]}`)}
	raw, _ = json.Marshal(s)
	out, e := DecodeResponse(raw)
	if e != nil || out.StatusCode != 400 || !bytes.Equal(out.Body, body) || out.Headers.Get("Retry-After") != "7" {
		t.Fatal("original response changed", e)
	}
	for _, h := range []string{"Authorization", "Set-Cookie", "Content-Length", "Content-Encoding", "Connection"} {
		s.Headers.Set(h, "private")
		if s.Validate() == nil {
			t.Fatal("unsafe header admitted", h)
		}
		s.Headers.Del(h)
	}
	if Enabled(http.Header{Header: []string{"1", "1"}}) || Enabled(http.Header{Header: []string{"1,1"}}) || !Enabled(http.Header{Header: []string{"1"}}) {
		t.Fatal("capability cardinality ignored")
	}
}
func TestHelperTransportStrictFraming(t *testing.T) {
	r := transportFixture(t)
	raw, _ := json.Marshal(r)
	for _, bad := range [][]byte{append(raw, []byte("{}")...), bytes.Replace(raw, []byte(`"version":1`), []byte(`"version":1,"version":1`), 1), bytes.Replace(raw, []byte(`"version":1`), []byte(`"version":2`), 1)} {
		if _, e := DecodeRequest(bad); e == nil {
			t.Fatal("invalid framing accepted")
		}
	}
	r.Request = append(r.Request[:len(r.Request)-1], []byte(`,"new":1}`)...)
	if r.Validate() == nil {
		t.Fatal("digest mismatch accepted")
	}
}

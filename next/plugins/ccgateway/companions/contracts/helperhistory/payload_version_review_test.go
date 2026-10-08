package helperhistory

import (
	"bytes"
	"encoding/json"
	"testing"
)

func TestReviewPayloadVersionCannotUseCaseAliases(t *testing.T) {
	request := transportFixture(t)
	raw, _ := json.Marshal(request)
	for _, field := range []string{`"Payload_Version":null`, `"PAYLOAD_VERSION":0`, `"payload_version":2,"Payload_Version":0`} {
		bad := append([]byte("{"+field+","), raw[1:]...)
		if _, err := DecodeRequest(bad); err == nil {
			t.Errorf("ambiguous selection accepted: %s", field)
		}
	}
}
func TestReviewPayloadVersionPreservesExplicitRequestBytes(t *testing.T) {
	r := transportFixture(t)
	r.PayloadVersion = 2
	old := json.RawMessage(`{"version":1,"segments":[]}`)
	r.History = []json.RawMessage{old, json.RawMessage(`{"version":2,"segments":[]}`)}
	raw, _ := json.Marshal(r)
	got, err := DecodeRequest(raw)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got.Request, r.Request) || !bytes.Equal(got.History[0], old) {
		t.Fatal("history or request rewritten")
	}
}

func TestReviewResponsePayloadVersionRejectsExplicitInvalidAndAliases(t *testing.T) {
	r := transportFixture(t)
	reply := ResponseEnvelope{Version: 1, AttemptID: r.AttemptID, RequestDigest: r.RequestDigest, Namespace: r.Namespace, Identity: r.Identity, StatusCode: 200, ContentType: "application/json", Body: []byte(`{}`), Delta: json.RawMessage(`{"version":1,"segments":[]}`)}
	raw, _ := json.Marshal(reply)
	for _, field := range []string{`"payload_version":null`, `"payload_version":0`, `"payload_version":3`, `"Payload_Version":null`, `"payload_version":2,"PAYLOAD_VERSION":0`} {
		bad := append([]byte("{"+field+","), raw[1:]...)
		if _, err := DecodeResponse(bad); err == nil {
			t.Errorf("invalid response selection accepted %s", field)
		}
	}
}

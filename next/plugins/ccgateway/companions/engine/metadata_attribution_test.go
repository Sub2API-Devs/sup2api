package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// §53.12: the client's metadata only selects the session. The main-request
// plan never writes it into the upstream request, whatever its shape.
func TestMetadataClientObjectNeverReplacesCLIMetadata(t *testing.T) {
	inner := Object{"user_id": `{"account_uuid":"inner-account","session_id":"inner-session"}`}
	for _, metadata := range []Object{{}, {"user_id": nil}, {"user_id": strings.Repeat("界", 512)}, {"user_id": `{ "device_id": "client", "account_uuid": "", "session_id": "client-session" }`}} {
		r := plannedRequest(t, Object{"metadata": metadata})
		wire := Object{"metadata": inner}
		if err := r.ApplyMainRequestFeatures(wire); err != nil {
			t.Fatal(err)
		}
		if digest(wire["metadata"]) != digest(inner) {
			t.Fatal("client metadata replaced the CLI's")
		}
		for _, decision := range r.Plan.FeatureDecisions() {
			if decision["field"] == "metadata" && decision["action"] != "select_session_only" {
				t.Fatal("metadata decision", decision)
			}
		}
	}
	r := plannedRequest(t, Object{})
	wire := Object{"metadata": inner}
	if err := r.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	if digest(wire["metadata"]) != digest(inner) {
		t.Fatal("missing client metadata changed CLI defaults")
	}
}

// Main, auxiliary and count requests alike carry the CLI's own user_id with
// the gateway session U; none carries any part of the client's user_id, and
// the account credential is untouched.
func TestMetadataRelayScopeAndAuthorizationIsolation(t *testing.T) {
	client := Object{"user_id": `{"device_id":"client-device","account_uuid":"client-attribution","session_id":"11111111-2222-4333-8444-555555555555"}`}
	r := plannedRequest(t, Object{"metadata": client})
	branch, err := newSessionBranch(r, scopeHeader("user:1:key:1", ""))
	if err != nil {
		t.Fatal(err)
	}
	r.upstreamSession = branch.Upstream
	scope := newMainRequestScope()
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	relay := &outboundRelay{scope: scope, path: "/metadata-fixture"}
	var forwarded Object
	var forwardedRaw string
	var auth, session string
	handler := relay.handler(r, http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		raw, _ := io.ReadAll(req.Body)
		forwardedRaw = string(raw)
		forwarded, _ = decodeObject(raw)
		auth = req.Header.Get("Authorization")
		session = req.Header.Get("X-Claude-Code-Session-Id")
		w.WriteHeader(200)
	}))
	inner := Object{"user_id": `{"device_id":"container-device","account_uuid":"","session_id":"internal-cli-session"}`}
	want := `{"device_id":"container-device","account_uuid":"","session_id":"` + branch.Upstream + `"}`
	for _, tc := range []struct {
		name, path string
		marked     bool
	}{{"main", "/messages", true}, {"auxiliary", "/messages", false}, {"count", "/messages/count_tokens", true}} {
		t.Run(tc.name, func(t *testing.T) {
			body := scopedFixture(scope)
			body["metadata"] = inner
			if !tc.marked {
				body["system"] = []any{Object{"type": "text", "text": "classifier"}}
			}
			raw, _ := json.Marshal(body)
			req := httptest.NewRequest("POST", "http://local/metadata-fixture"+tc.path, bytes.NewReader(raw))
			req.Header.Set("Authorization", "Bearer dummy-inner-account")
			req.Header.Set("X-Claude-Code-Session-Id", "internal-cli-session")
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != 200 {
				t.Fatal(res.Code, res.Body.String())
			}
			if str(forwarded["metadata"].(map[string]any), "user_id") != want || session != branch.Upstream {
				t.Fatalf("upstream session identity: %v %s", forwarded["metadata"], session)
			}
			for _, secret := range []string{"client-device", "client-attribution", "11111111-2222-4333-8444-555555555555", "internal-cli-session"} {
				if strings.Contains(forwardedRaw, secret) {
					t.Fatalf("%s sent upstream", secret)
				}
			}
			if auth != "Bearer dummy-inner-account" {
				t.Fatal("client attribution changed account credential")
			}
		})
	}
}

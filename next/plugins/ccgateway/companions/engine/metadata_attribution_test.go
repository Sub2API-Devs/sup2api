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

func TestMetadataExplicitObjectAndMissingDefaults(t *testing.T) {
	inner := Object{"user_id": `{"account_uuid":"inner-account","session_id":"inner-session"}`}
	for _, metadata := range []Object{{}, {"user_id": nil}, {"user_id": strings.Repeat("界", 512)}, {"user_id": `{ "device_id": "client", "account_uuid": "", "session_id": "client-session" }`}} {
		r := plannedRequest(t, Object{"metadata": metadata})
		wire := Object{"metadata": inner}
		if err := r.ApplyMainRequestFeatures(wire); err != nil {
			t.Fatal(err)
		}
		if digest(wire["metadata"]) != digest(metadata) {
			t.Fatal("explicit metadata object changed")
		}
		for _, decision := range r.Plan.FeatureDecisions() {
			if decision["field"] == "metadata" && decision["mapping"] != "explicit_client_object_replaces_cli_metadata" {
				t.Fatal("effective metadata mapping missing")
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

func TestMetadataRelayScopeAndAuthorizationIsolation(t *testing.T) {
	client := Object{"user_id": `{"account_uuid":"client-attribution","session_id":"client-session"}`}
	r := plannedRequest(t, Object{"metadata": client})
	scope := newMainRequestScope()
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	relay := &outboundRelay{scope: scope, path: "/metadata-fixture"}
	var forwarded Object
	var auth string
	handler := relay.handler(r, http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		raw, _ := io.ReadAll(req.Body)
		forwarded, _ = decodeObject(raw)
		auth = req.Header.Get("Authorization")
		w.WriteHeader(200)
	}))
	inner := Object{"user_id": "inner-attribution"}
	for _, tc := range []struct {
		name, path           string
		marked, expectClient bool
	}{{"main", "/messages", true, true}, {"auxiliary", "/messages", false, false}, {"count", "/messages/count_tokens", true, false}} {
		t.Run(tc.name, func(t *testing.T) {
			body := scopedFixture(scope)
			body["metadata"] = inner
			if !tc.marked {
				body["system"] = []any{Object{"type": "text", "text": "classifier"}}
			}
			raw, _ := json.Marshal(body)
			req := httptest.NewRequest("POST", "http://local/metadata-fixture"+tc.path, bytes.NewReader(raw))
			req.Header.Set("Authorization", "Bearer dummy-inner-account")
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != 200 {
				t.Fatal(res.Code, res.Body.String())
			}
			want := inner
			if tc.expectClient {
				want = client
			}
			if digest(forwarded["metadata"]) != digest(want) {
				t.Fatal("wrong metadata scope")
			}
			if auth != "Bearer dummy-inner-account" {
				t.Fatal("client attribution changed account credential")
			}
		})
	}
}

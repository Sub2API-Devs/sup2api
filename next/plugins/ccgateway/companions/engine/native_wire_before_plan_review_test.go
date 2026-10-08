package engine

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestReviewNativeWireDefinitionBeforePlanRelay(t *testing.T) {
	for _, variant := range []string{"mixed-native-metadata", "mixed-exact-schema", "plain-native-metadata"} {
		for _, changed := range []bool{false, true} {
			t.Run(variant+map[bool]string{false: "/same", true: "/changed"}[changed], func(t *testing.T) {
				known := verifiedNativeToolCatalogues["2.1.292"]["Read"][0]
				body := basic()
				native := Object{"name": "Read", "description": known.Description, "input_schema": known.Schema, "defer_loading": false}
				other := Object{"name": "other", "input_schema": Object{"type": "object"}, "defer_loading": true}
				if variant == "mixed-exact-schema" {
					other["input_schema"] = Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740993")}}}
				} else {
					native["strict"] = false
				}
				body["tools"] = []any{native, other}
				p := defaultRequestPolicy()
				if variant != "plain-native-metadata" {
					body["tool_choice"] = Object{"type": "tool", "name": "Read"}
					p.ToolSearch = "true"
				}
				r, err := parsePolicyRequest(mustMCPJSON(body), policyHeaders(p))
				if err != nil {
					t.Fatal(err)
				}
				matchNativeTools(r, "2.1.292")
				if !r.Native["Read"] {
					t.Fatal("fixture failed real native selection")
				}
				scope := newMainRequestScope()
				if err := scope.enter(); err != nil {
					t.Fatal(err)
				}
				relay := &outboundRelay{scope: scope, path: "/native-review"}
				forwarded := false
				handler := relay.handler(r, http.HandlerFunc(func(w http.ResponseWriter, h *http.Request) { forwarded = true; w.WriteHeader(200) }))
				wire := scopedFixture(scope)
				schema := known.Schema
				if changed {
					schema = Object{"type": "object", "properties": Object{"different_runtime_argument": Object{"type": "string"}}}
				}
				wire["tools"] = []any{Object{"name": "Read", "input_schema": schema}, Object{"name": r.wireName("other"), "input_schema": r.Tools[1].Schema}}
				raw, _ := json.Marshal(wire)
				req := httptest.NewRequest("POST", "http://local/native-review/messages", bytes.NewReader(raw))
				res := httptest.NewRecorder()
				handler.ServeHTTP(res, req)
				if !changed {
					if !forwarded || res.Code != 200 {
						t.Fatalf("valid native rejected: status=%d err=%v", res.Code, relay.Failure())
					}
					return
				}
				var unavailable *nativeToolAvailabilityError
				if forwarded || !errors.As(relay.Failure(), &unavailable) {
					t.Fatalf("changed actual native schema masked before validation: forwarded=%v status=%d failure=%v", forwarded, res.Code, relay.Failure())
				}
			})
		}
	}
}

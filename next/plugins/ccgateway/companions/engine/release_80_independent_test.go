package engine

import (
	"bytes"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRelease80ListingHistoryWithoutDiscoveryDoesNotGrant(t *testing.T) {
	for _, variant := range []string{"deferred", "eager", "disabled", "unknown"} {
		t.Run(variant, func(t *testing.T) {
			body := dynamicMCPFixture()
			def := body["tools"].([]any)[0].(Object)
			if variant == "eager" {
				def["configs"] = Object{"echo": Object{"defer_loading": false}}
			}
			if variant == "disabled" {
				def["configs"] = Object{"echo": Object{"enabled": false, "defer_loading": false}}
			}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": []any{dynamicMCPListing()}}, Object{"role": "user", "content": "continue"})
			r, err := parseMCPInline(body)
			if err != nil {
				t.Fatal(err)
			}
			ledger, err := r.serverHistoryLedger()
			if err != nil {
				t.Fatal(err)
			}
			call := dynamicMCPBlocks()[3]
			if variant == "unknown" {
				call["name"] = "not_listed"
			}
			err = ledger.accept(call, r)
			if (err == nil) != (variant == "eager") {
				t.Fatalf("listing-only history granted incorrect permission: %v", err)
			}
		})
	}
}

func TestRelease80NativeRelayRejectsMissingAndDuplicateBeforeRestore(t *testing.T) {
	for _, variant := range []string{"valid", "missing", "duplicate"} {
		t.Run(variant, func(t *testing.T) {
			known := verifiedNativeToolCatalogues["2.1.292"]["Read"][0]
			body := basic()
			body["tools"] = []any{Object{"name": "Read", "input_schema": known.Schema, "strict": false, "defer_loading": false}, Object{"name": "other", "input_schema": Object{"type": "object"}, "defer_loading": true}}
			body["tool_choice"] = Object{"type": "tool", "name": "Read"}
			r := reviewParseForcedMixed(t, body)
			matchNativeTools(r, "2.1.292")
			if !r.Native["Read"] {
				t.Fatal("fixture failed native selection")
			}
			scope := newMainRequestScope()
			if err := scope.enter(); err != nil {
				t.Fatal(err)
			}
			relay := &outboundRelay{scope: scope, path: "/release80"}
			forwarded := false
			handler := relay.handler(r, http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) { forwarded = true; w.WriteHeader(200) }))
			wire := scopedFixture(scope)
			other := Object{"name": r.wireName("other"), "input_schema": r.Tools[1].Schema}
			native := Object{"name": "Read", "input_schema": known.Schema}
			wire["tools"] = []any{native, other}
			if variant == "missing" {
				wire["tools"] = []any{other}
			}
			if variant == "duplicate" {
				wire["tools"] = []any{native, other, native}
			}
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, httptest.NewRequest("POST", "http://local/release80/messages", bytes.NewReader(mustMCPJSON(wire))))
			if variant == "valid" {
				if !forwarded || res.Code != 200 {
					t.Fatalf("valid rejected: %d %v", res.Code, relay.Failure())
				}
				return
			}
			var unavailable *nativeToolAvailabilityError
			if forwarded || !errors.As(relay.Failure(), &unavailable) {
				t.Fatalf("invalid native escaped raw validation: %v %v", forwarded, relay.Failure())
			}
		})
	}
}

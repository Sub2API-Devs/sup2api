package engine

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestReviewBestEffortCustodyStillChecksIssuerAndStorage(t *testing.T) {
	for _, scenario := range []string{"missing", "changed-config", "changed-issuer", "corrupt"} {
		t.Run(scenario, func(t *testing.T) {
			registry, err := newCreditRegistry(t.TempDir(), "fixture-key", 1<<20)
			if err != nil {
				t.Fatal(err)
			}
			hash, _ := credits.TokenHash("fixture-token")
			identity := resources.Identity{PrincipalID: "fixture-principal", Generation: "generation"}
			if scenario == "corrupt" {
				if err := os.WriteFile(filepath.Join(registry.dir, hash+".credit"), []byte("corrupt"), 0600); err != nil {
					t.Fatal(err)
				}
			} else if scenario != "missing" {
				snapshot := creditSnapshot{Hash: hash, Identity: identity, ConfigHash: "old-config", ClientDigests: []string{"old-digest"}, WirePrompt: json.RawMessage(`{"messages":[]}`), ExpiresAt: time.Now().Add(time.Minute)}
				if scenario == "changed-issuer" {
					snapshot.Identity.Generation = "another-generation"
				}
				if err := registry.Save(snapshot); err != nil {
					t.Fatal(err)
				}
			}
			parameter, _ := credits.ParseParameter(Object{"token": "fixture-token", "mode": "best_effort"})
			r := httptest.NewRequest("POST", "/v1/messages", nil)
			r.Header.Set("Anthropic-Beta", "fallback-credit-2026-07-01")
			r.Header.Set(credits.TrackingHeader, "1")
			r.Header.Set(credits.AdmissionHeader, hash)
			x := &exchange{g: &Gateway{Runner: &Runner{}, credits: registry}, r: r, w: httptest.NewRecorder(), resources: &resourceAdmission{identity: identity}, req: &Request{ToolSearch: "false", Plan: &RequestPlan{creditToken: "fixture-token", creditParameter: parameter}}}
			err = x.admitCredit([]byte(`{"model":"fixture","messages":[{"role":"user","content":"question"}]}`))
			if scenario == "corrupt" {
				var storage *creditLocalStorageError
				if !errors.As(err, &storage) {
					t.Fatal("corruption did not remain storage failure", err)
				}
			} else if scenario == "changed-issuer" {
				if err == nil {
					t.Fatal("best effort crossed issuer generation")
				}
			} else if err != nil || x.req.credit == nil || x.req.credit.previous != nil {
				t.Fatal("unproved best effort must use normal current wire without snapshot authority", err)
			}
		})
	}
}

func TestReviewCreditUsageOnlyAllowsSourceNumericNormalization(t *testing.T) {
	for _, tc := range []struct {
		name           string
		source, actual any
		allowed        bool
	}{
		{"large-integer", json.Number("9007199254740993"), json.Number("9007199254740992"), true},
		{"source-overflow", json.Number("1e400"), nil, true},
		{"null-cannot-become-overflow", nil, json.Number("1e400"), false},
		{"number-cannot-become-string", json.Number("3"), "3", false},
		{"string-cannot-become-number", "3", json.Number("3"), false},
		{"status-cannot-change", "redeemed", "rejected", false},
		{"missing-is-not-null", Object{"counter": nil}, Object{}, false},
		{"array-position-preserved", []any{nil, json.Number("1e400")}, []any{json.Number("1e400"), nil}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			source := Object{"outcome": tc.source}
			target := Object{"usage": Object{"fallback_credit": Object{"outcome": tc.actual}}}
			before := digest(target)
			err := restoreCreditUsage(target, source)
			if (err == nil) != tc.allowed {
				t.Fatalf("allowed=%v err=%v", tc.allowed, err)
			}
			if err != nil && digest(target) != before {
				t.Fatal("failed comparison mutated target")
			}
		})
	}
}

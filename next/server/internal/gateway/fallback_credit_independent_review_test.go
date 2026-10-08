package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/tidwall/gjson"
)

type unavailableCreditRegistry struct{ core.FallbackCredits }

func (unavailableCreditRegistry) Resolve(context.Context, core.FallbackCreditLookup) (core.FallbackCredit, error) {
	return core.FallbackCredit{}, core.ErrUnavailable
}

type forbiddenCreditIdentity struct{ core.ProviderResourceTransport }

func (forbiddenCreditIdentity) Identity(context.Context, int64) (core.ResourceBinding, error) {
	panic("non-CC credit called identity transport")
}

func TestReviewUnknownCreditPreservesOtherAnthropicRoutes(t *testing.T) {
	for _, mode := range []string{"no-registry", "unknown", "registry-error", "provider-429"} {
		t.Run(mode, func(t *testing.T) {
			e := newEnv(t)
			e.gw.d.ResourceTransport = forbiddenCreditIdentity{}
			switch mode {
			case "unknown", "provider-429":
				e.gw.d.Credits = &memoryCredits{rows: map[string]core.FallbackCredit{}}
			case "registry-error":
				e.gw.d.Credits = unavailableCreditRegistry{}
			}
			if mode == "provider-429" {
				for _, key := range []string{"acc-1", "acc-2", "acc-3"} {
					e.up.set(key, &upstreamRule{status: 429})
				}
			}
			request := body(testModel, false)
			request["fallback_credit_token"] = "external-provider-issued-opaque-fixture"
			raw, _ := json.Marshal(request)
			status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, "fallback-credit-2026-07-01", raw, "application/json")
			want := 200
			if mode == "provider-429" {
				want = 429
			}
			if status != want || len(e.up.keys()) != 1 {
				t.Fatalf("ordinary Anthropic credit blocked/retried: %d calls=%d %s", status, len(e.up.keys()), response)
			}
			sent := e.up.last()
			if gjson.GetBytes(sent.body, "fallback_credit_token").String() != request["fallback_credit_token"] || sent.header.Get(credits.TrackingHeader) != "" || sent.header.Get(credits.AdmissionHeader) != "" {
				t.Fatal("non-CC request was remapped or received private grants")
			}
		})
	}
}

func TestReviewUnknownCreditCCOnlyReturnsAdmissionFailure(t *testing.T) {
	for _, mode := range []string{"unknown", "no-registry", "registry-error"} {
		t.Run(mode, func(t *testing.T) {
			e, _, _ := resourceTestEnv(t)
			want := 503
			switch mode {
			case "unknown":
				e.gw.d.Credits = &memoryCredits{rows: map[string]core.FallbackCredit{}}
				want = 404
			case "registry-error":
				e.gw.d.Credits = unavailableCreditRegistry{}
			}
			request := body(testModel, false)
			request["fallback_credit_token"] = "unregistered-fixture"
			raw, _ := json.Marshal(request)
			status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, "fallback-credit-2026-07-01", raw, "application/json")
			if status != want || len(e.up.keys()) != 0 {
				t.Fatalf("CC admission bypass/error hidden %d calls=%d %s", status, len(e.up.keys()), response)
			}
		})
	}
}

func TestReviewUnknownCreditExcludesCCButKeepsOtherCandidates(t *testing.T) {
	e := newEnv(t, func(e *env) {
		cc := e.gen.accountTypes[0]
		cc.Plugin.Key = "ccgateway"
		e.gen.accountTypes = append(e.gen.accountTypes, cc)
		e.accounts.accounts[1].PluginKey = "ccgateway"
	})
	e.gw.d.Credits = &memoryCredits{rows: map[string]core.FallbackCredit{}}
	e.gw.d.ResourceTransport = forbiddenCreditIdentity{}
	request := body(testModel, false)
	request["fallback_credit_token"] = "external-fixture-credit"
	raw, _ := json.Marshal(request)
	status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, "fallback-credit-2026-07-01", raw, "application/json")
	if status != 200 || len(e.up.keys()) != 1 || e.up.last().key == "acc-1" {
		t.Fatalf("unknown token blocked all routes or reached CC %d keys=%v %s", status, e.up.keys(), response)
	}
}

func TestReviewCreditOwnerModelIssuerAndResourceBinding(t *testing.T) {
	for _, mode := range []string{"valid", "key-rotation", "other-owner", "other-group", "forbidden-model", "issuer-change", "resource-match", "resource-conflict", "changed-beta"} {
		t.Run(mode, func(t *testing.T) {
			e, store, transport := resourceTestEnv(t)
			const token = "independent-fixture-credit"
			request := body(testModel, false)
			request["fallback_credit_token"] = token
			if mode == "resource-match" || mode == "resource-conflict" {
				request = fileReferenceBody("file_owned")
				request["fallback_credit_token"] = token
				account := int64(2)
				if mode == "resource-conflict" {
					account = 1
				}
				seedReference(e, store, "file_owned", account)
			}
			raw, _ := json.Marshal(request)
			hash, _ := credits.TokenHash(token)
			digest, err := credits.Digest(raw, []string{"fallback-credit-2026-07-01"})
			if err != nil {
				t.Fatal(err)
			}
			p := e.auth.keys[testKey]
			binding := core.ResourceBinding{AccountID: 2, PrincipalID: "synthetic_issuer", Generation: "v1"}
			e.gw.d.Credits = &memoryCredits{rows: map[string]core.FallbackCredit{hash: {TokenHash: hash, PluginKey: "ccgateway", SourceModel: "refused-model", Owner: core.ResourceOwner{UserID: p.UserID, GroupID: p.Group.ID}, Binding: binding, PromptDigests: []string{digest}, ObservedAt: time.Now(), ExpiresAt: time.Now().Add(time.Minute)}}}
			key := testKey
			beta := "fallback-credit-2026-07-01"
			allowed := mode == "valid" || mode == "key-rotation" || mode == "resource-match"
			switch mode {
			case "key-rotation", "other-owner", "other-group":
				copy := *p
				copy.KeyID += 10
				if mode == "other-owner" {
					copy.UserID++
				}
				if mode == "other-group" {
					copy.Group.ID++
				}
				key = "review-other-key"
				e.auth.keys[key] = &copy
			case "forbidden-model":
				p.Group.ModelAllowlist = []string{"a-different-model"}
			case "issuer-change":
				transport.generation = "changed"
			case "changed-beta":
				beta += ",context-1m-2025-08-07"
			}
			var calls atomic.Int32
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				if r.Header.Get("X-Api-Key") != "acc-2" {
					t.Error("registered credit escaped issuing account")
				}
				if r.Header.Get(credits.AdmissionHeader) != hash || r.Header.Get(credits.TrackingHeader) != "1" {
					t.Error("missing verified credit admission")
				}
				if mode == "resource-match" {
					var body json.RawMessage
					if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
						t.Error(err)
					}
					if gjson.GetBytes(body, "messages.0.content.0.source.file_id").String() != "remote_file_owned" {
						t.Error("resource mapping disagreed with credit request")
					}
				}
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set(resources.PrincipalHeader, binding.PrincipalID)
				w.Header().Set(resources.GenerationHeader, binding.Generation)
				json.NewEncoder(w).Encode(map[string]any{"id": "review_credit", "type": "message", "role": "assistant", "model": testModel, "content": []any{}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 3, "output_tokens": 0}})
			}))
			defer up.Close()
			e.plat.base = up.URL
			status, response := fileRequest(t, e, "POST", "/v1/messages", key, beta, raw, "application/json")
			if allowed {
				if status != 200 || calls.Load() != 1 {
					t.Fatalf("authorized credit failed %d calls=%d %s", status, calls.Load(), response)
				}
			} else if status < 400 || calls.Load() != 0 {
				t.Fatalf("invalid credit reached model %d calls=%d %s", status, calls.Load(), response)
			}
		})
	}
}

func TestReviewNewCreditTrackingSkipsUnreadyIssuerBeforeModel(t *testing.T) {
	e, _, transport := resourceTestEnv(t)
	probe := &firstIneligibleResourceTransport{ProviderResourceTransport: transport}
	e.gw.d.ResourceTransport = probe
	e.gw.d.Credits = &memoryCredits{rows: map[string]core.FallbackCredit{}}
	var calls atomic.Int32
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
		w.Header().Set(resources.GenerationHeader, "v1")
		json.NewEncoder(w).Encode(map[string]any{"id": "new_credit", "type": "message", "role": "assistant", "model": testModel, "content": []any{}, "stop_reason": "refusal", "usage": map[string]any{"input_tokens": 1, "output_tokens": 0}})
	}))
	defer up.Close()
	e.plat.base = up.URL
	raw, _ := json.Marshal(body(testModel, false))
	status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, "fallback-credit-2026-07-01", raw, "application/json")
	if status != 200 || calls.Load() != 1 || probe.probes.Load() != 2 {
		t.Fatalf("eligibility retried inference or rejected refusal %d probes=%d calls=%d %s", status, probe.probes.Load(), calls.Load(), response)
	}
}
func (unavailableCreditRegistry) LookupOwned(context.Context, core.ResourceOwner, string) (core.FallbackCredit, error) {
	return core.FallbackCredit{}, core.ErrUnavailable
}
func TestCreditObjectModeOwnershipAndWireShape(t *testing.T) {
	for _, mode := range []string{"strict", "best_effort"} {
		for _, mismatch := range []string{"none", "prompt", "expiry"} {
			t.Run(mode+"/"+mismatch, func(t *testing.T) {
				e, _, _ := resourceTestEnv(t)
				request := body(testModel, false)
				request["fallback_credit_token"] = map[string]any{"token": "object-fixture", "mode": mode}
				raw, _ := json.Marshal(request)
				digest, _ := credits.Digest(raw, []string{"fallback-credit-2026-07-01"})
				hash, _ := credits.TokenHash("object-fixture")
				p := e.auth.keys[testKey]
				binding := core.ResourceBinding{AccountID: 2, PrincipalID: "synthetic_issuer", Generation: "v1"}
				expiry := time.Now().Add(time.Minute)
				if mismatch == "expiry" {
					expiry = time.Now().Add(-time.Minute)
				}
				if mismatch == "prompt" {
					digest = strings.Repeat("a", 64)
				}
				e.gw.d.Credits = &memoryCredits{rows: map[string]core.FallbackCredit{hash: {TokenHash: hash, PluginKey: "ccgateway", Owner: core.ResourceOwner{UserID: p.UserID, GroupID: p.Group.ID}, Binding: binding, PromptDigests: []string{digest}, ExpiresAt: expiry}}}
				var calls atomic.Int32
				up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					calls.Add(1)
					if r.Header.Get("X-Api-Key") != "acc-2" {
						t.Error("issuer moved")
					}
					var wire map[string]any
					json.NewDecoder(r.Body).Decode(&wire)
					param, err := credits.ParseParameter(wire["fallback_credit_token"])
					if err != nil || !param.Object || param.Mode != mode {
						t.Error("object mode rewritten")
					}
					w.Header().Set(resources.PrincipalHeader, binding.PrincipalID)
					w.Header().Set(resources.GenerationHeader, binding.Generation)
					w.Header().Set("Content-Type", "application/json")
					json.NewEncoder(w).Encode(map[string]any{"id": "object_answer", "type": "message", "role": "assistant", "model": testModel, "content": []any{}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 2, "output_tokens": 0}})
				}))
				defer up.Close()
				e.plat.base = up.URL
				status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, "fallback-credit-2026-07-01", raw, "application/json")
				if mode == "strict" && mismatch != "none" {
					if status != 404 || calls.Load() != 0 {
						t.Fatalf("strict mismatch %d %s", status, response)
					}
				} else if status != 200 || calls.Load() != 1 {
					t.Fatalf("allowed object %d %s", status, response)
				}
			})
		}
	}
}
func TestReviewBestEffortPTCPrivilegeRequiresLiveVerifiedPrompt(t *testing.T) {
	e := newEnv(t)
	binding := core.ResourceBinding{AccountID: 22, PrincipalID: "fixture-issuer", Generation: "1"}
	for _, tc := range []struct {
		name     string
		verified bool
		expiry   time.Time
		want     bool
	}{
		{"matching", true, time.Now().Add(time.Minute), true},
		{"changed-prompt", false, time.Now().Add(time.Minute), false},
		{"expired-after-check", true, time.Now().Add(-time.Minute), false},
		{"expired-and-changed", false, time.Now().Add(-time.Minute), false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			c := &call{g: e.gw, creditRequest: &modelCreditRequest{parameter: credits.Parameter{Present: true, Object: true, Mode: "best_effort"}, verifiedPrompt: tc.verified, redemption: &core.FallbackCredit{Binding: binding, ExpiresAt: tc.expiry}}}
			if got := c.creditPromptVerified(binding); got != tc.want {
				t.Fatalf("PTC echo privilege=%v want=%v", got, tc.want)
			}
			other := binding
			other.Generation = "other"
			if c.creditPromptVerified(other) {
				t.Fatal("PTC privilege crossed issuer")
			}
		})
	}
}

func TestReviewNullCreditWithoutBetaDoesNotTrack(t *testing.T) {
	for _, cc := range []bool{false, true} {
		t.Run(fmt.Sprint(cc), func(t *testing.T) {
			var e *env
			if cc {
				e, _, _ = resourceTestEnv(t)
			} else {
				e = newEnv(t)
			}
			e.gw.d.ResourceTransport = forbiddenCreditIdentity{}
			e.gw.d.Credits = unavailableCreditRegistry{}
			request := body(testModel, false)
			request["fallback_credit_token"] = nil
			raw, _ := json.Marshal(request)
			status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, "", raw, "application/json")
			if status != 200 || len(e.up.keys()) != 1 {
				t.Fatalf("null unexpectedly tracked: %d %s", status, response)
			}
			sent := e.up.last()
			if sent.header.Get(credits.TrackingHeader) != "" || sent.header.Get(credits.AdmissionHeader) != "" {
				t.Fatal("null issued internal grant")
			}
			v := gjson.GetBytes(sent.body, "fallback_credit_token")
			if !v.Exists() || v.Type != gjson.Null {
				t.Fatal("explicit null wire shape lost")
			}
		})
	}
}

func TestReviewUnregisteredBestEffortCannotEnterSharedCC(t *testing.T) {
	e, _, _ := resourceTestEnv(t)
	e.gw.d.Credits = &memoryCredits{rows: map[string]core.FallbackCredit{}}
	request := body(testModel, false)
	request["fallback_credit_token"] = map[string]any{"token": "unknown-best-effort-fixture", "mode": "best_effort"}
	raw, _ := json.Marshal(request)
	status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, "fallback-credit-2026-07-01", raw, "application/json")
	if status != 404 || len(e.up.keys()) != 0 {
		t.Fatalf("best_effort bypassed ownership: %d %s", status, response)
	}
}

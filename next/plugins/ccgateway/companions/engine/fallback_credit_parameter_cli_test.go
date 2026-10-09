package engine

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestRealCLICreditParameterModes(t *testing.T) {
	const token = "mode-fixture-token"
	hash, _ := credits.TokenHash(token)
	labelOf := map[string]string{}
	for _, label := range []string{"issue", "strict-object", "mode-less", "best-match", "best-changed", "best-expired", "best-missing", "best-provider400", "best-corrupt", "null", "old-beta"} {
		labelOf[upstreamSessionID(digestUUID(sha256.Sum256([]byte("ccgateway-session-v1"+label))))] = label
	}
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprintf("stream-%v", stream), func(t *testing.T) {
			var calls atomic.Int32
			var firstSystem any
			outcome := Object{"status": Object{"type": "redeemed"}, "fixture_number": json.Number("9007199254740993")}
			runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				raw, _ := io.ReadAll(r.Body)
				wire, _ := decodeObject(raw)
				// Each case is its own client session (metadata.user_id = label);
				// upstream sees only its session U, never the label (§53.12).
				label := labelOf[r.Header.Get("X-Claude-Code-Session-Id")]
				metadata, _ := wire["metadata"].(Object)
				if label == "" || !strings.Contains(str(metadata, "user_id"), `"`+r.Header.Get("X-Claude-Code-Session-Id")+`"`) {
					t.Errorf("upstream session %q does not identify a case", r.Header.Get("X-Claude-Code-Session-Id"))
				}
				if label == "issue" {
					firstSystem = wire["system"]
				} else if label == "null" {
					if value, exists := wire["fallback_credit_token"]; !exists || value != nil {
						t.Error("null token not preserved")
					}
				} else {
					value, ok := wire["fallback_credit_token"].(Object)
					if !ok || str(value, "token") != token {
						t.Error("object token flattened or omitted")
					}
					if strings.HasPrefix(label, "best") {
						if str(value, "mode") != "best_effort" {
							t.Error("best effort mode changed")
						}
					}
					if label == "strict-object" || label == "mode-less" || label == "best-match" {
						if digest(wire["system"]) != digest(firstSystem) {
							t.Error("verified original wire not reused")
						}
					} else if !bytes.Contains(mustMCPJSON(wire["system"]), []byte("CHANGED_SYSTEM")) {
						t.Error("unverified old wire used for current prompt")
					}
				}
				if label == "best-provider400" {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(400)
					fmt.Fprint(w, `{"type":"error","error":{"type":"invalid_request_error","message":"synthetic token failure"}}`)
					return
				}
				stop := "end_turn"
				var details any
				usage := Object{"input_tokens": 3, "output_tokens": 4, "fallback_credit": outcome}
				if label == "null" {
					delete(usage, "fallback_credit")
				}
				if label == "issue" {
					stop = "refusal"
					details = Object{"type": "refusal", "fallback_credit_token": token, "fallback_has_prefill_claim": true}
					delete(usage, "fallback_credit")
				}
				blocks := []Object{{"type": "text", "text": "MODE_REPLY"}}
				if wire["stream"] != true {
					w.Header().Set("Content-Type", "application/json")
					json.NewEncoder(w).Encode(Object{"id": "msg_modes", "type": "message", "role": "assistant", "model": wire["model"], "content": blocks, "stop_reason": stop, "stop_details": details, "usage": usage})
					return
				}
				rec := httptest.NewRecorder()
				writeSurfaceFixture(rec, str(wire, "model"), blocks)
				w.Header().Set("Content-Type", "text/event-stream")
				for _, line := range strings.Split(rec.Body.String(), "\n") {
					if !strings.HasPrefix(line, "data:") {
						continue
					}
					event, _ := decodeObject([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
					if str(event, "type") == "message_delta" {
						event["delta"].(Object)["stop_reason"] = stop
						event["delta"].(Object)["stop_details"] = details
						event["usage"] = usage
					}
					data, _ := json.Marshal(event)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), data)
				}
			})
			runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "modes-fixture", "CCG_RESOURCE_ISSUER_GENERATION": "1"})
			cache, _ := newCache(filepath.Join(t.TempDir(), "cache"), 8<<20)
			g := &Gateway{Runner: runner, Cache: cache, Key: "worker-mode-key", Slots: make(chan struct{}, 2), Timeout: 20 * time.Second}
			broker, err := newResourceBroker(g, &authManager{}, t.TempDir())
			if err != nil {
				t.Fatal(err)
			}
			g.resources = broker
			defer broker.lease.Close()
			identity, err := broker.identity(context.Background())
			if err != nil {
				t.Fatal(err)
			}
			server := httptest.NewServer(g)
			defer server.Close()
			base := Object{"model": "claude-opus-5-5", "max_tokens": 64, "stream": stream, "system": "ORIGINAL_SYSTEM", "messages": []any{Object{"role": "user", "content": "fixture"}}}
			post := func(label string, value any, present bool, beta string) (int, []byte) {
				body, _ := jsonCopyObject(base)
				body["metadata"] = Object{"user_id": label}
				if present {
					body["fallback_credit_token"] = value
				}
				if label != "issue" && label != "null" && label != "strict-object" && label != "mode-less" && label != "best-match" {
					body["system"] = "CHANGED_SYSTEM"
				}
				req, _ := http.NewRequest("POST", server.URL+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
				req.Header.Set("X-Api-Key", g.Key)
				if beta != "" {
					req.Header.Set("Anthropic-Beta", beta)
				}
				if label != "null" {
					req.Header.Set(credits.TrackingHeader, "1")
					req.Header.Set(resources.PrincipalHeader, identity.PrincipalID)
					req.Header.Set(resources.GenerationHeader, identity.Generation)
					if label != "issue" {
						req.Header.Set(credits.AdmissionHeader, hash)
					}
				}
				p := defaultRequestPolicy()
				p.ToolSearch = "false"
				req.Header.Set(policyHeader, string(mustMCPJSON(p)))
				res, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				defer res.Body.Close()
				raw, _ := io.ReadAll(res.Body)
				return res.StatusCode, raw
			}
			beta := "fallback-credit-2026-07-01"
			status, raw := post("issue", nil, false, beta)
			if status != 200 || !bytes.Contains(raw, []byte(token)) {
				t.Fatalf("issue HTTP%d %s", status, raw)
			}
			path := filepath.Join(g.credits.dir, hash+".credit")
			original, err := os.ReadFile(path)
			if err != nil {
				t.Fatal(err)
			}
			for _, label := range []string{"strict-object", "mode-less", "best-match", "best-changed", "best-expired", "best-missing", "best-provider400", "best-corrupt", "null", "old-beta"} {
				t.Run(label, func(t *testing.T) {
					if err := os.WriteFile(path, original, 0600); err != nil {
						t.Fatal(err)
					}
					if label == "best-expired" {
						snapshot, err := g.credits.Load(hash)
						if err != nil {
							t.Fatal(err)
						}
						snapshot.ExpiresAt = time.Now().Add(-time.Minute)
						payload, _ := json.Marshal(snapshot)
						nonce := make([]byte, g.credits.cipher.NonceSize())
						rand.Read(nonce)
						encrypted := g.credits.cipher.Seal(nonce, nonce, payload, []byte(hash))
						if err := os.WriteFile(path, encrypted, 0600); err != nil {
							t.Fatal(err)
						}
					}
					if label == "best-missing" {
						if err := os.Remove(path); err != nil {
							t.Fatal(err)
						}
					}
					if label == "best-corrupt" {
						if err := os.WriteFile(path, []byte("corrupt"), 0600); err != nil {
							t.Fatal(err)
						}
					}
					value := any(Object{"token": token, "mode": "strict"})
					if label == "mode-less" {
						value = Object{"token": token}
					}
					if strings.HasPrefix(label, "best") {
						value = Object{"token": token, "mode": "best_effort"}
					}
					selectedBeta := beta
					if label == "null" {
						value = nil
						selectedBeta = ""
					}
					if label == "old-beta" {
						selectedBeta = "fallback-credit-2026-06-01"
					}
					before := calls.Load()
					status, raw := post(label, value, true, selectedBeta)
					expected := 200
					if label == "best-provider400" || label == "old-beta" {
						expected = 400
					}
					if label == "best-corrupt" {
						expected = 503
					}
					if status != expected {
						t.Fatalf("HTTP%d %s", status, raw)
					}
					want := int32(1)
					if label == "old-beta" || label == "best-corrupt" {
						want = 0
					}
					if calls.Load()-before != want {
						t.Fatal("unexpected retry or call", calls.Load()-before)
					}
					if status == 200 && label != "null" && (!bytes.Contains(raw, []byte(`"fallback_credit"`)) || !bytes.Contains(raw, []byte("9007199254740993"))) {
						t.Fatalf("credit outcome lost: %s", raw)
					}
					if label == "best-corrupt" && !bytes.Contains(raw, []byte("gateway_credit_storage")) {
						t.Fatal("corruption treated as provider token failure")
					}
				})
			}
		})
	}
}

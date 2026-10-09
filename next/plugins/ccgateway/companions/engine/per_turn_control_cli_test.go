package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestRealCLIPerTurnControlWireCompatibility(t *testing.T) {
	for _, beta := range []string{ccPerTurnBeta, publicPerTurnBeta} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/stream=%t", beta, stream), func(t *testing.T) {
				calls := make(chan Object, 8)
				handler := func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					raw, _ := io.ReadAll(r.Body)
					wire, err := decodeObject(raw)
					if err != nil {
						t.Error(err)
						return
					}
					// CLI itself also supplies its per-turn-control beta. Public API
					// beta must still survive; CC-only input must not be renamed.
					if !hasBetaHeader(r.Header.Values("anthropic-beta"), beta) || (beta == ccPerTurnBeta && hasBetaHeader(r.Header.Values("anthropic-beta"), publicPerTurnBeta)) {
						t.Error("client beta replaced, dropped or another beta injected")
					}
					calls <- wire
					generationFixtureEvents(w, str(wire, "model"), "end_turn", "PER_TURN_OK", false)
				}
				endpoint, _ := newThinkingOutputFixture(t, handler)
				directive := Object{"role": "system", "content": []any{Object{"type": "text", "text": "fixture environment"}}, "output_config": Object{"effort": "medium"}}
				original := []any{Object{"role": "user", "content": "first"}, directive}
				messages := append([]any(nil), original...)
				post := func(endpoint, label string) {
					t.Helper()
					body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "messages": messages}
					raw, _ := json.Marshal(body)
					request, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
					request.Header.Set("Content-Type", "application/json")
					request.Header.Set("anthropic-beta", beta)
					setTestSession(t, request, "per-turn-fixture")
					response, err := http.DefaultClient.Do(request)
					if err != nil {
						t.Fatal(err)
					}
					out, _ := io.ReadAll(response.Body)
					response.Body.Close()
					if response.StatusCode != 200 || !bytes.Contains(out, []byte("PER_TURN_OK")) {
						t.Fatalf("%s HTTP%d %s", label, response.StatusCode, out)
					}
					wire := <-calls
					parsed, err := parsePolicyRequest(raw, request.Header)
					if err != nil {
						t.Fatal(err)
					}
					if _, err = alignClientHistory(parsed, wire); err != nil {
						t.Fatalf("%s exact history: %v", label, err)
					}
					count := 0
					for _, value := range wire["messages"].([]any) {
						m := value.(Object)
						if config, ok := m["output_config"].(Object); ok {
							if str(m, "role") != "system" || str(config, "effort") != "medium" {
								t.Fatal("directive altered")
							}
							count++
						}
					}
					if count != 1 {
						t.Fatalf("directive count=%d", count)
					}
				}
				post(endpoint, "new")
				base := append(append([]any(nil), original...), Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "PER_TURN_OK"}}})
				messages = append(append([]any(nil), base...), Object{"role": "user", "content": "continue"})
				post(endpoint, "continue")
				messages = append(append([]any(nil), base...), Object{"role": "user", "content": "fork"})
				post(endpoint, "fork")
				cold, _ := newThinkingOutputFixture(t, handler)
				post(cold, "cold")
				if len(calls) != 0 {
					t.Fatal("unexpected extra upstream requests")
				}
			})
		}
	}
}

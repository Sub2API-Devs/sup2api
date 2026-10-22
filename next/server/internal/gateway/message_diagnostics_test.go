package gateway

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// diagnostics is Claude Code's question about the prompt cache; it goes
// upstream exactly as the client sent it, to whichever account serves the
// request, with nothing added (2026-10-22 user decision).
func TestDiagnosticsForwardedAsSent(t *testing.T) {
	for _, accountType := range []string{"managed", "apikey"} {
		t.Run(accountType, func(t *testing.T) {
			e, _, _ := resourceTestEnv(t)
			e.gen.accountTypes[0].Type.ID = accountType
			for _, a := range e.accounts.accounts {
				a.Type = accountType
			}
			sent := map[string]any{"previous_message_id": "msg_from_another_account"}
			calls := 0
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				var got map[string]json.RawMessage
				json.NewDecoder(r.Body).Decode(&got)
				want, _ := json.Marshal(sent)
				if string(got["diagnostics"]) != string(want) {
					t.Errorf("diagnostics changed: %s", got["diagnostics"])
				}
				for name := range r.Header {
					if strings.HasPrefix(strings.ToLower(name), "x-ccgateway-diagnostics-") {
						t.Errorf("tracking header %s sent", name)
					}
				}
				w.Header().Set("Content-Type", "application/json")
				fmt.Fprintf(w, `{"id":"msg_new","type":"message","role":"assistant","model":%q,"content":[],"stop_reason":"end_turn","usage":{"input_tokens":1,"output_tokens":0}}`, testModel)
			}))
			defer up.Close()
			e.plat.base = up.URL
			request := body(testModel, false)
			request["diagnostics"] = sent
			raw, _ := json.Marshal(request)
			status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, "", raw, "application/json")
			if status != 200 || calls != 1 {
				t.Fatalf("%d calls%d %s", status, calls, response)
			}
		})
	}
}

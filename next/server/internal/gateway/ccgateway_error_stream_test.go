package gateway

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestCCGatewayInterruptedStreamReachesClientWithoutCleanEOF(t *testing.T) {
	for _, interrupted := range []bool{false, true} {
		t.Run(map[bool]string{false: "complete", true: "interrupted"}[interrupted], func(t *testing.T) {
			e := newEnv(t, func(e *env) {
				info := e.gen.accountTypes[0].Plugin
				info.Key = "ccgateway"
				typ := e.gen.accountTypes[0].Type
				e.gen.plugins = []core.PluginInfo{info}
				e.gen.accountTypes = []core.AccountTypeBinding{{Plugin: info, Type: typ, Client: e.plat}}
				e.accounts = newFakeAccounts()
				e.accounts.addTyped(testGroup, 1, 1, "acc-1", "ccgateway", typ.ID)
			})
			e.up.set("acc-1", &upstreamRule{breakStream: interrupted})
			raw, _ := json.Marshal(body(testModel, true))
			req, _ := http.NewRequest("POST", e.srv.URL+"/v1/messages", strings.NewReader(string(raw)))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("x-api-key", testKey)
			res, err := e.srv.Client().Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			data, readErr := io.ReadAll(res.Body)
			if res.StatusCode != 200 || !strings.Contains(string(data), "message_start") {
				t.Fatal(res.StatusCode, string(data))
			}
			if interrupted != (readErr != nil) || interrupted == strings.Contains(string(data), "message_stop") {
				t.Fatal("completion was misrepresented", string(data), readErr)
			}
			if len(e.up.keys()) != 1 {
				t.Fatal("replayed committed request")
			}
			rec := e.record()
			if rec.Success == interrupted || !rec.Billable || rec.Tokens.Input != upInput {
				t.Fatalf("partial usage lost: %+v", rec)
			}
		})
	}
}

package account

import (
	"fmt"
	"net/http"
	"sync/atomic"
	"testing"
)

func TestCCGatewayQuotaInListAndRefresh(t *testing.T) {
	e := setup(t)
	var queries atomic.Int64
	e.withCCGateway(false, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/admin/usage" {
			t.Errorf("unexpected quota route %s", r.URL.Path)
			w.WriteHeader(404)
			return
		}
		queries.Add(1)
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"five_hour":{"utilization":12,"resets_at":null},"seven_day":{"utilization":34,"resets_at":null}}`)
	})
	credentials, err := e.svc.d.Cipher.Encrypt([]byte(`{}`), []byte("account:ccgateway"))
	if err != nil {
		t.Fatal(err)
	}
	id := e.exec1(`INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES('quota','ccgateway','managed',$1) RETURNING id`, credentials)
	code, out := e.do("GET", fmt.Sprintf("/accounts/%d", id), nil)
	if code != 200 {
		t.Fatal(code, out)
	}
	q, ok := out["data"].(map[string]any)["quota"].(map[string]any)
	if !ok || q["supported"] != true {
		t.Fatal("CCGateway quota hidden before first snapshot", out)
	}
	path := fmt.Sprintf("/accounts/%d/quota?force=true", id)
	code, out = e.do("GET", path, nil)
	if code != 200 {
		t.Fatal(code, out)
	}
	q = out["data"].(map[string]any)
	if len(q["windows"].([]any)) != 2 || q["source"] != "active" {
		t.Fatal("quota query was not wired", out)
	}
	e.do("GET", path, nil)
	if queries.Load() != 1 {
		t.Fatal("query floor bypassed", queries.Load())
	}
	_, out = e.do("GET", fmt.Sprintf("/accounts/%d", id), nil)
	if len(out["data"].(map[string]any)["quota"].(map[string]any)["windows"].([]any)) != 2 {
		t.Fatal("snapshot missing in view", out)
	}
}

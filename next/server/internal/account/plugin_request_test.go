package account

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// SendPluginAccountRequest is the host side of HostService.SendAccountRequest:
// the request leaves from the account's own egress, only for the plugin's own
// accounts, and every request sent is audited without its secrets.
func TestSendPluginAccountRequest(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	mine := e.mkRawAccount("anthropic", "apikey", "mine", "sk-mine", false)
	other := e.mkRawAccount("relay", "relay_key", "theirs", "sk-theirs", true)

	var gotMethod, gotAuth, gotType, gotBody string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/moved" {
			http.Redirect(w, r, "/reset", http.StatusFound)
			return
		}
		b, _ := io.ReadAll(r.Body)
		gotMethod, gotAuth, gotType, gotBody = r.Method, r.Header.Get("Authorization"), r.Header.Get("Content-Type"), string(b)
		w.Header().Set("X-Reset", "1")
		_, _ = w.Write([]byte(`{"ok":true,"token":"resp-secret"}`))
	}))
	defer srv.Close()

	in := &pluginv1.SendAccountRequestRequest{AccountId: mine, Method: "post", Url: srv.URL + "/reset?code=query-secret",
		Headers: map[string]string{"Authorization": "Bearer sk-header-secret"}, Body: []byte(`{"code":"body-secret"}`)}
	out, err := e.svc.SendPluginAccountRequest(ctx, "anthropic", in)
	if err != nil {
		t.Fatal(err)
	}
	if out.GetStatus() != 200 || string(out.GetBody()) != `{"ok":true,"token":"resp-secret"}` || out.GetHeaders()["x-reset"] != "1" ||
		out.GetTransportError() != "" || out.GetTruncated() {
		t.Fatalf("answer = %v", out)
	}
	if gotMethod != http.MethodPost || gotAuth != "Bearer sk-header-secret" || gotType != "application/json" || gotBody != `{"code":"body-secret"}` {
		t.Fatalf("upstream saw %s %q %q %q", gotMethod, gotAuth, gotType, gotBody)
	}

	// A redirect is answered as it is, not followed.
	in.Url, in.Method, in.Body = srv.URL+"/moved", "", nil
	if out, err := e.svc.SendPluginAccountRequest(ctx, "anthropic", in); err != nil || out.GetStatus() != http.StatusFound {
		t.Fatalf("redirect: %v %v", out, err)
	}

	// A transport failure is the answer, not an error.
	dead := httptest.NewServer(http.NotFoundHandler())
	dead.Close()
	in.Url = dead.URL + "/reset"
	if out, err := e.svc.SendPluginAccountRequest(ctx, "anthropic", in); err != nil || out.GetStatus() != 0 || out.GetTransportError() == "" {
		t.Fatalf("transport failure: %v %v", out, err)
	}

	// Another plugin's account is not found, like a missing id, and nothing
	// is sent for it.
	in.Url, gotMethod = srv.URL+"/reset", ""
	in.AccountId = other
	_, foreign := e.svc.SendPluginAccountRequest(ctx, "anthropic", in)
	in.AccountId = other + 10_000
	_, missing := e.svc.SendPluginAccountRequest(ctx, "anthropic", in)
	if core.AsError(foreign).Code != "not_found" || core.AsError(missing).Message != core.AsError(foreign).Message || gotMethod != "" {
		t.Fatalf("foreign %v, missing %v, sent %q", foreign, missing, gotMethod)
	}

	rows := e.auditRows(AuditPluginAccountRequest)
	if len(rows) != 3 {
		t.Fatalf("audit rows = %d, want one per request sent", len(rows))
	}
	d := rows[0]["detail"].(map[string]any)
	if rows[0]["target_id"] != itoa(mine) || d["plugin_key"] != "anthropic" || d["method"] != "POST" ||
		d["host"] != strings.TrimPrefix(srv.URL, "http://") || d["path"] != "/reset" || d["status"] != float64(200) {
		t.Fatalf("audit = %v", rows[0])
	}
	if d := rows[2]["detail"].(map[string]any); d["method"] != "GET" || d["status"] != float64(0) {
		t.Fatalf("transport failure audit = %v", d)
	}
	// The path is recorded escaped: a decoded NUL would make the jsonb row
	// fail, so the request would be sent without its audit row.
	in.AccountId, in.Url = mine, srv.URL+"/x%00y"
	if _, err := e.svc.SendPluginAccountRequest(ctx, "anthropic", in); err != nil {
		t.Fatal(err)
	}
	if rows = e.auditRows(AuditPluginAccountRequest); len(rows) != 4 || rows[3]["detail"].(map[string]any)["path"] != "/x%00y" {
		t.Fatalf("escaped path audit = %v", rows)
	}
	raw, _ := json.Marshal(rows)
	for _, secret := range []string{"sk-header-secret", "body-secret", "query-secret", "resp-secret", "sk-mine"} {
		if strings.Contains(string(raw), secret) {
			t.Fatalf("audit holds %q: %s", secret, raw)
		}
	}
}

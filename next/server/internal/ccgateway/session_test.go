package ccgateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeLogin mimics the business container's single pending login
// (tools/ccgateway/auth.go) behind the controller.
type fakeLogin struct {
	mu      sync.Mutex
	pending string
	n       int
	seen    []string // session ids complete/cancel received
}

func (l *fakeLogin) fail(w http.ResponseWriter, msg string) {
	w.WriteHeader(400)
	_ = json.NewEncoder(w).Encode(map[string]any{"type": "error", "error": map[string]string{"type": "invalid_request_error", "message": msg}})
}

func (l *fakeLogin) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	l.mu.Lock()
	defer l.mu.Unlock()
	var body struct {
		SessionID string `json:"session_id"`
		Code      string `json:"code"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	switch {
	case strings.HasSuffix(r.URL.Path, "/admin/auth/start"):
		if l.pending != "" {
			l.fail(w, "已有待完成的授权，请先取消或等待过期")
			return
		}
		l.n++
		l.pending = fmt.Sprintf("s%d", l.n)
		_ = json.NewEncoder(w).Encode(map[string]any{"session_id": l.pending,
			"url":        "https://claude.ai/oauth/authorize?state=st&code_challenge=c&code_challenge_method=S256",
			"expires_at": time.Now().Add(10 * time.Minute).UTC()})
	case strings.HasSuffix(r.URL.Path, "/admin/auth/complete"), strings.HasSuffix(r.URL.Path, "/admin/auth/cancel"):
		l.seen = append(l.seen, body.SessionID)
		cancel := strings.HasSuffix(r.URL.Path, "/cancel")
		if cancel && l.pending == "" {
			_, _ = w.Write([]byte(`{"success":true}`))
			return
		}
		if l.pending == "" || body.SessionID != l.pending {
			l.fail(w, "授权会话不存在或已过期")
			return
		}
		if !cancel && !strings.Contains(body.Code, "#") {
			l.fail(w, "请粘贴完整的 code#state，且必须属于本次授权")
			return
		}
		l.pending = ""
		_, _ = w.Write([]byte(`{"success":true}`))
	case strings.HasSuffix(r.URL.Path, "/admin/auth/logout"):
		l.pending = ""
		_, _ = w.Write([]byte(`{"success":true}`))
	default:
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "pending"})
	}
}

func data(out map[string]any) map[string]any {
	d, _ := out["data"].(map[string]any)
	return d
}

// TestAuthorizationSessionSurvivesAReload: the console can lose the session
// id and still resume, complete or cancel the pending login (CONTRACTS §49.4).
func TestAuthorizationSessionSurvivesAReload(t *testing.T) {
	login := &fakeLogin{}
	f := newRuntimeFixture(t, login.ServeHTTP)
	id := f.account(true)

	if code, out := f.call("GET", id, "session", ""); code != 200 || out["data"] != nil {
		t.Fatalf("no session yet: %d %v", code, out)
	}
	code, out := f.call("POST", id, "start", `{}`)
	if code != 200 || data(out)["session_id"] != "s1" {
		t.Fatalf("start: %d %v", code, out)
	}
	// Reload: the saved session is served, and a second start resumes it
	// instead of failing on the container's pending login.
	if code, out = f.call("GET", id, "session", ""); code != 200 || data(out)["session_id"] != "s1" || data(out)["url"] == "" {
		t.Fatalf("session after start: %d %v", code, out)
	}
	if code, out = f.call("POST", id, "start", `{}`); code != 200 || data(out)["session_id"] != "s1" {
		t.Fatalf("start with a pending login: %d %v", code, out)
	}
	// A malformed code keeps the session; complete without session_id uses
	// the saved one.
	code, out = f.call("POST", id, "complete", `{"code":"no-state"}`)
	if code != 400 || !strings.Contains(fmt.Sprint(out["error"]), "code#state") {
		t.Fatalf("malformed code: %d %v", code, out)
	}
	if code, out = f.call("GET", id, "session", ""); data(out)["session_id"] != "s1" {
		t.Fatalf("malformed code dropped the session: %v", out)
	}
	if code, out = f.call("POST", id, "complete", `{"code":"abc#st"}`); code != 200 || data(out)["success"] != true {
		t.Fatalf("complete: %d %v", code, out)
	}
	if code, out = f.call("GET", id, "session", ""); out["data"] != nil {
		t.Fatalf("session kept after complete: %v", out)
	}
	if strings.Join(login.seen, ",") != "s1,s1" {
		t.Fatalf("container got session ids %v", login.seen)
	}

	// Cancel without session_id cancels the saved session and forgets it.
	if code, out = f.call("POST", id, "start", `{}`); code != 200 || data(out)["session_id"] != "s2" {
		t.Fatalf("second start: %d %v", code, out)
	}
	if code, out = f.call("POST", id, "cancel", ``); code != 200 {
		t.Fatalf("cancel: %d %v", code, out)
	}
	if login.pending != "" || login.seen[len(login.seen)-1] != "s2" {
		t.Fatalf("cancel did not reach the pending login: %+v", login)
	}
	if _, out = f.call("GET", id, "session", ""); out["data"] != nil {
		t.Fatalf("session kept after cancel: %v", out)
	}

	// A session the container no longer knows is forgotten on complete.
	f.call("POST", id, "start", `{}`)
	login.mu.Lock()
	login.pending = ""
	login.mu.Unlock()
	if code, _ = f.call("POST", id, "complete", `{"code":"abc#st"}`); code != 400 {
		t.Fatalf("stale complete: %d", code)
	}
	if _, out = f.call("GET", id, "session", ""); out["data"] != nil {
		t.Fatalf("stale session kept: %v", out)
	}
	// Logout forgets the session too.
	f.call("POST", id, "start", `{}`)
	if code, _ = f.call("POST", id, "logout", `{}`); code != 200 {
		t.Fatalf("logout: %d", code)
	}
	if _, out = f.call("GET", id, "session", ""); out["data"] != nil {
		t.Fatalf("session kept after logout: %v", out)
	}
}

// TestAccountRuntimeOwnership: besides settings administrators, account
// readers and updaters reach the runtime of the accounts they may see; own
// level only the ones they created (CONTRACTS §49.5).
func TestAccountRuntimeOwnership(t *testing.T) {
	login := &fakeLogin{}
	f := newRuntimeFixture(t, login.ServeHTTP)
	ctx := context.Background()
	user := func(email string) int64 {
		var id int64
		if err := f.db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES($1,'x') RETURNING id`, email).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	vendor, reader, nobody := user("vendor@x"), user("reader@x"), user("nobody@x")
	admin := user("admin@x") // no entry in keys: holds every key
	f.auth.keys[vendor] = []string{"account:own:read", "account:own:update"}
	f.auth.keys[reader] = []string{"account:read"}
	f.auth.keys[nobody] = []string{"account:own:create"}
	mine, other := f.account(true), f.account(true)
	if _, err := f.db.Pool.Exec(ctx, `UPDATE accounts SET created_by=$1 WHERE id=$2`, vendor, mine); err != nil {
		t.Fatal(err)
	}

	for _, tc := range []struct {
		uid            int64
		method, action string
		id             int64
		want           int
	}{
		{vendor, "GET", "status", mine, 200},
		{vendor, "GET", "session", mine, 200},
		{vendor, "POST", "start", mine, 200},
		{vendor, "GET", "status", other, 404},
		{vendor, "POST", "sync", other, 404},
		{vendor, "POST", "start", other, 404},
		{reader, "GET", "status", other, 200},
		{reader, "GET", "health", mine, 200},
		{reader, "POST", "sync", mine, 403},
		{nobody, "GET", "status", mine, 403},
		{nobody, "POST", "start", mine, 403},
		{admin, "POST", "cancel", mine, 200}, // settings administrator
		{admin, "GET", "status", other, 200},
	} {
		code, out := f.callAs(tc.uid, tc.method, tc.id, tc.action, `{}`)
		if code != tc.want {
			t.Errorf("user %d %s %s on %d: %d %v, want %d", tc.uid, tc.method, tc.action, tc.id, code, out, tc.want)
		}
	}
}

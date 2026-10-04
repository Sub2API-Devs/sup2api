package account

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// tokenUpstream is an OAuth token endpoint that rotates refresh tokens:
// refresh token rt-N is accepted once and answered with at-(N+1) / rt-(N+1).
type tokenUpstream struct {
	srv        *httptest.Server
	mu         sync.Mutex
	next       int // the N of the refresh token it accepts
	calls      atomic.Int32
	failStatus atomic.Int32
	// during runs while a request is being answered (after the token was
	// rotated upstream), e.g. to change the account meanwhile.
	during func()
}

func newTokenUpstream(t *testing.T) *tokenUpstream {
	u := &tokenUpstream{next: 1}
	u.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u.calls.Add(1)
		if s := u.failStatus.Load(); s != 0 {
			w.WriteHeader(int(s))
			return
		}
		var body struct {
			RefreshToken string `json:"refresh_token"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		u.mu.Lock()
		want := "rt-" + strconv.Itoa(u.next)
		if body.RefreshToken != want {
			u.mu.Unlock()
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprint(w, `{"error":"invalid_grant"}`)
			return
		}
		u.next++
		n, during := u.next, u.during
		u.mu.Unlock()
		if during != nil {
			during()
		}
		fmt.Fprintf(w, `{"access_token":"at-%d","refresh_token":"rt-%d","expires_in":28800}`, n, n)
	}))
	t.Cleanup(u.srv.Close)
	return u
}

// mkOAuthAccount stores an account of the anthropic/apikey harness type
// with OAuth credentials expiring in `in` (no expires_at when in is 0).
func (e *env) mkOAuthAccount(name, refreshToken string, in time.Duration) int64 {
	e.t.Helper()
	creds := map[string]any{"api_key": "sk-good-key-123", "access_token": "at-old", "refresh_token": refreshToken, "scratch": "x"}
	if in != 0 {
		creds["expires_at"] = strconv.FormatInt(time.Now().Add(in).Unix(), 10)
	}
	return e.mkAccountCreds(name, creds)
}

func (e *env) mkAccountCreds(name string, creds map[string]any) int64 {
	e.t.Helper()
	b, _ := json.Marshal(creds)
	enc, err := e.svc.d.Cipher.Encrypt(b, aad("anthropic"))
	if err != nil {
		e.t.Fatal(err)
	}
	return e.exec1(`INSERT INTO accounts (name, plugin_key, type, credentials_enc, settings, status, schedulable)
		VALUES ($1, 'anthropic', 'apikey', $2, '{"base_url":"https://api.anthropic.com"}', 'active', true) RETURNING id`, name, enc)
}

// creds decrypts the stored credentials of an account.
func (e *env) creds(id int64) map[string]any {
	e.t.Helper()
	var enc []byte
	if err := e.db.Pool.QueryRow(context.Background(), `SELECT credentials_enc FROM accounts WHERE id = $1`, id).Scan(&enc); err != nil {
		e.t.Fatal(err)
	}
	plain, err := e.svc.d.Cipher.Decrypt(enc, aad("anthropic"))
	if err != nil {
		e.t.Fatal(err)
	}
	m := map[string]any{}
	_ = json.Unmarshal(plain, &m)
	return m
}

func (e *env) setCreds(id int64, creds map[string]any) {
	e.t.Helper()
	b, _ := json.Marshal(creds)
	enc, _ := e.svc.d.Cipher.Encrypt(b, aad("anthropic"))
	if _, err := e.db.Pool.Exec(context.Background(), `UPDATE accounts SET credentials_enc = $2 WHERE id = $1`, id, enc); err != nil {
		e.t.Fatal(err)
	}
}

func TestCredentialRefresh(t *testing.T) {
	e := setup(t)
	up := newTokenUpstream(t)
	e.plat.refreshURL = up.srv.URL + "/token"
	ctx := context.Background()
	due := e.mkOAuthAccount("due", "rt-1", 10*time.Minute)
	later := e.mkOAuthAccount("later", "rt-later", 5*time.Hour)
	noExpiry := e.mkOAuthAccount("no-expiry", "rt-none", 0)
	path := fmt.Sprintf("/accounts/%d/refresh-credentials", due)

	// A type without refresh: refused, nothing swept, refresh null in lists.
	if code, _ := e.do("POST", path, nil); code != http.StatusBadRequest {
		t.Fatalf("unsupported type: %d", code)
	}
	if n, err := e.svc.SweepRefresh(ctx); err != nil || n != 0 || up.calls.Load() != 0 {
		t.Fatalf("sweep without declaration: %d %v", n, err)
	}
	e.gen.types[0].Type.Refresh = &manifest.AccountRefresh{} // 30 minutes ahead

	// The sweep renews only the account inside the window, merging the
	// patch: renewed fields replaced, null removed, the rest kept.
	n, err := e.svc.SweepRefresh(ctx)
	if err != nil || n != 1 || up.calls.Load() != 1 {
		t.Fatalf("sweep: renewed %d, err %v, upstream calls %d", n, err, up.calls.Load())
	}
	c := e.creds(due)
	if c["access_token"] != "at-2" || c["refresh_token"] != "rt-2" || c["api_key"] != "sk-good-key-123" {
		t.Fatalf("renewed credentials: %v", c)
	}
	if _, ok := c["scratch"]; ok {
		t.Fatalf("null in the patch did not remove the key: %v", c)
	}
	if exp, _ := c["expires_at"].(float64); time.Until(time.Unix(int64(exp), 0)) < 7*time.Hour {
		t.Fatalf("expires_at: %v", c["expires_at"])
	}
	if c := e.creds(later); c["access_token"] != "at-old" {
		t.Fatal("an account outside the window was renewed")
	}
	if c := e.creds(noExpiry); c["access_token"] != "at-old" {
		t.Fatal("an account without expiry was renewed by the sweep")
	}
	if rows := e.auditRows("account.credentials_refresh"); len(rows) != 1 || rows[0]["target_id"] != strconv.FormatInt(due, 10) {
		t.Fatalf("audit: %v", rows)
	}
	e.bus.mu.Lock()
	sent := strings.Join(e.bus.sent, ",")
	e.bus.mu.Unlock()
	if !strings.Contains(sent, "account:changed") {
		t.Fatalf("account:changed not broadcast: %s", sent)
	}
	// Renewed: not due any more.
	if n, _ := e.svc.SweepRefresh(ctx); n != 0 || up.calls.Load() != 1 {
		t.Fatalf("second sweep renewed %d (calls %d)", n, up.calls.Load())
	}

	// The list shows the state; an administrator can renew at once.
	_, out := e.do("GET", "/accounts", nil)
	for _, it := range out["data"].([]any) {
		a := it.(map[string]any)
		r, _ := a["refresh"].(map[string]any)
		if int64(a["id"].(float64)) == due && (r == nil || r["last_success_at"] == nil || r["error_type"] != "" || r["expires_at"] == nil) {
			t.Fatalf("list refresh state: %v", a["refresh"])
		}
	}
	code, out := e.do("POST", path, nil)
	if d := out["data"].(map[string]any); code != 200 || d["refreshed"] != true || e.creds(due)["refresh_token"] != "rt-3" {
		t.Fatalf("manual refresh: %d %v", code, out)
	}

	// Another renewal of the account in progress: skipped, nothing sent.
	mu, _ := e.svc.refreshLocal.LoadOrStore(due, &sync.Mutex{})
	mu.(*sync.Mutex).Lock()
	_, out = e.do("POST", path, nil)
	mu.(*sync.Mutex).Unlock()
	if d := out["data"].(map[string]any); d["skipped"] != "in_progress" || up.calls.Load() != 2 {
		t.Fatalf("locked: %v (calls %d)", out, up.calls.Load())
	}

	// A transient failure is recorded and retried by the next sweep.
	e.setCreds(due, map[string]any{"access_token": "at-3", "refresh_token": "rt-3",
		"expires_at": time.Now().Add(time.Minute).Unix()})
	up.failStatus.Store(503)
	if n, _ := e.svc.SweepRefresh(ctx); n != 0 || up.calls.Load() != 3 {
		t.Fatalf("transient: renewed %d, calls %d", n, up.calls.Load())
	}
	states, _ := e.db.AccountRefreshStates(ctx, []int64{due})
	if st := states[due]; st == nil || st.ErrorType != "transient" || !strings.Contains(st.Error, "503") || st.LastSuccessAt == nil {
		t.Fatalf("transient state: %+v", st)
	}
	up.failStatus.Store(0)
	if n, _ := e.svc.SweepRefresh(ctx); n != 1 || up.calls.Load() != 4 {
		t.Fatalf("retry after transient: renewed %d, calls %d", n, up.calls.Load())
	}
	states, _ = e.db.AccountRefreshStates(ctx, []int64{due})
	if st := states[due]; st.ErrorType != "" || st.Error != "" {
		t.Fatalf("success did not clear the error: %+v", st)
	}

	// A refresh token refused for good is not tried again until the
	// credentials change.
	e.setCreds(due, map[string]any{"access_token": "at-x", "refresh_token": "rt-spent",
		"expires_at": time.Now().Add(time.Minute).Unix()})
	if n, _ := e.svc.SweepRefresh(ctx); n != 0 || up.calls.Load() != 5 {
		t.Fatalf("rejected: renewed %d, calls %d", n, up.calls.Load())
	}
	states, _ = e.db.AccountRefreshStates(ctx, []int64{due})
	if st := states[due]; st.ErrorType != "auth_rejected" || len(st.RejectedCredHash) == 0 {
		t.Fatalf("rejected state: %+v", st)
	}
	if n, _ := e.svc.SweepRefresh(ctx); n != 0 || up.calls.Load() != 5 {
		t.Fatalf("rejected credentials tried again: calls %d", up.calls.Load())
	}
	var status string
	_ = e.db.Pool.QueryRow(ctx, `SELECT status FROM accounts WHERE id = $1`, due).Scan(&status)
	if status != "active" {
		t.Fatalf("a refused refresh changed the account status: %s", status)
	}
	// Re-authorised by an administrator: tried again.
	up.mu.Lock()
	cur := up.next
	up.mu.Unlock()
	e.setCreds(due, map[string]any{"access_token": "at-y", "refresh_token": "rt-" + strconv.Itoa(cur),
		"expires_at": time.Now().Add(time.Minute).Unix()})
	if n, _ := e.svc.SweepRefresh(ctx); n != 1 || up.calls.Load() != 6 {
		t.Fatalf("after re-authorisation: renewed %d, calls %d", n, up.calls.Load())
	}

	// Credentials changed while the renewal ran: the administrator's save
	// wins and the renewal is discarded.
	edited := map[string]any{"access_token": "at-admin", "refresh_token": "rt-admin", "expires_at": time.Now().Add(time.Hour).Unix()}
	up.mu.Lock()
	up.during = func() { e.setCreds(due, edited) }
	up.mu.Unlock()
	_, out = e.do("POST", path, nil)
	up.mu.Lock()
	up.during = nil
	up.mu.Unlock()
	if d := out["data"].(map[string]any); d["skipped"] != "changed" || e.creds(due)["refresh_token"] != "rt-admin" {
		t.Fatalf("concurrent edit: %v, stored %v", out, e.creds(due))
	}
}

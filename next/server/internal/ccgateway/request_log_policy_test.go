package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	resourcecontract "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/stretchr/testify/require"
)

// CONTRACTS §65: the default rule is part of the configuration, off or
// summary only; omitted keeps the stored one.
func TestRequestLogDefaultConfig(t *testing.T) {
	require.Equal(t, "summary", Config{}.DefaultRequestLog(), "no rule is summary")
	require.Equal(t, "off", Config{RequestLogs: &RequestLogDefault{Level: "off"}}.DefaultRequestLog())
	old := Config{Mode: "disabled", RequestLogs: &RequestLogDefault{Level: "off"}}
	for _, tc := range []struct{ body, want string }{
		{`{"mode":"disabled"}`, "off"},
		{`{"mode":"disabled","request_logs":null}`, "off"},
		{`{"mode":"disabled","request_logs":{"level":"summary"}}`, "summary"},
		{`{"mode":"disabled","request_logs":{"level":"off"}}`, "off"},
	} {
		var in Config
		require.NoError(t, json.Unmarshal([]byte(tc.body), &in), tc.body)
		saved, err := mergeConfig(in, old)
		require.NoError(t, err, tc.body)
		require.Equal(t, tc.want, saved.DefaultRequestLog(), tc.body)
		require.Equal(t, RequestLogDefault{Level: tc.want}, saved.Public()["request_logs"], tc.body)
	}
	for _, body := range []string{
		`{"mode":"disabled","request_logs":{"level":"full"}}`,
		`{"mode":"disabled","request_logs":{"level":""}}`,
		`{"mode":"disabled","request_logs":{}}`,
		`{"mode":"disabled","request_logs":{"level":"Summary"}}`,
		`{"mode":"disabled","request_logs":{"level":"follow"}}`,
	} {
		var in Config
		require.NoError(t, json.Unmarshal([]byte(body), &in), body)
		_, err := mergeConfig(in, old)
		require.Error(t, err, body)
	}
	var in Config
	require.Error(t, json.Unmarshal([]byte(`{"request_logs":{"level":"off","full_for_hours":4}}`), &in), "unknown keys are refused")
	require.Error(t, json.Unmarshal([]byte(`{"request_logs":"off"}`), &in))
	// The default travels with each request: no runtime is reconciled for it.
	require.True(t, sameRuntimeConfig(Config{Mode: "controller"}, Config{Mode: "controller", RequestLogs: &RequestLogDefault{Level: "off"}}))
}

// The default rule is saved with the configuration (PUT remote-config,
// settings:manage), read back by GET, and refuses full; no runtime is asked.
func TestRequestLogDefaultSavedThroughRemoteConfig(t *testing.T) {
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		t.Errorf("a request log default reached the controller: %s", r.URL.Path)
		http.NotFound(w, r)
	})
	admin := f.user("settings@test")
	reader := f.user("reader@test")
	f.auth.keys[admin] = []string{"settings:manage", "settings:read"}
	f.auth.keys[reader] = []string{"settings:read"}
	code, out := f.request(admin, "GET", "/system/ccgateway/remote-config", "")
	require.Equal(t, 200, code, out)
	require.Equal(t, map[string]any{"level": "summary"}, data(out)["request_logs"])
	code, out = f.request(admin, "PUT", "/system/ccgateway/remote-config", `{"mode":"local","request_logs":{"level":"off"}}`)
	require.Equal(t, 200, code, out)
	require.Equal(t, map[string]any{"level": "off"}, data(out)["request_logs"])
	code, _ = f.request(reader, "PUT", "/system/ccgateway/remote-config", `{"mode":"local","request_logs":{"level":"summary"}}`)
	require.Equal(t, 403, code)
	code, out = f.request(admin, "PUT", "/system/ccgateway/remote-config", `{"mode":"local","request_logs":{"level":"full"}}`)
	require.Equal(t, 400, code, out)
	code, out = f.request(admin, "PUT", "/system/ccgateway/remote-config", `{"mode":"local","request_logs":{"level":"verbose"}}`)
	require.Equal(t, 400, code, out)
	// Saving something else keeps it.
	code, _ = f.request(admin, "PUT", "/system/ccgateway/remote-config", `{"mode":"local"}`)
	require.Equal(t, 200, code)
	code, out = f.request(reader, "GET", "/system/ccgateway/remote-config", "")
	require.Equal(t, 200, code, out)
	require.Equal(t, map[string]any{"level": "off"}, data(out)["request_logs"])
	cfg, err := f.s.Load(context.Background())
	require.NoError(t, err)
	require.Equal(t, "off", cfg.DefaultRequestLog())
}

// REQUEST-LOG-POLICY-DESIGN.md §1: the account's setting, else the default;
// a full past full_until counts as no setting.
func TestEffectiveRequestLog(t *testing.T) {
	now := time.Date(2026, 10, 26, 12, 0, 0, 0, time.UTC)
	later, earlier := now.Add(time.Hour), now.Add(-time.Second)
	off := Config{RequestLogs: &RequestLogDefault{Level: "off"}}
	for _, tc := range []struct {
		name    string
		cfg     Config
		account AccountRequestLog
		want    string
	}{
		{"follow default", Config{}, AccountRequestLog{}, "summary"},
		{"follow off", off, AccountRequestLog{}, "off"},
		{"override off", Config{}, AccountRequestLog{Level: "off"}, "off"},
		{"override summary", off, AccountRequestLog{Level: "summary"}, "summary"},
		{"full until later", off, AccountRequestLog{Level: "full", FullUntil: &later}, "full"},
		{"full expired", off, AccountRequestLog{Level: "full", FullUntil: &earlier}, "off"},
		{"full at its end", Config{}, AccountRequestLog{Level: "full", FullUntil: &now}, "summary"},
		{"full without expiry", Config{}, AccountRequestLog{Level: "full"}, "summary"},
		{"unknown level", Config{}, AccountRequestLog{Level: "verbose"}, "summary"},
	} {
		require.Equal(t, tc.want, effectiveRequestLog(tc.cfg, tc.account, now), tc.name)
	}
	require.Equal(t, requestLogSetting{Level: "follow"}, viewSetting(AccountRequestLog{Level: "full", FullUntil: &earlier}, now), "an expired full shows as follow")
}

// The level reaches the Worker with every request (model, probe and
// provider resource), read through the request cache: a saved level is
// dropped at once on this node and through the bus on the others, and full's
// expiry is checked when the policy is built, not when the cache refreshes.
func TestRequestLogLevelOnTheRequestPath(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	cipher, _ := secret.New(make([]byte, 32))
	s := New(db, cipher)
	bus := &recordingBus{}
	s.Bus = bus
	var id int64
	require.NoError(t, db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES('ccg','ccgateway','managed',''::bytea) RETURNING id`).Scan(&id))
	var mu sync.Mutex
	policies := map[string]string{}
	account := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if serveFakeWorkerHealth(w, r, "2.1.302") {
			return
		}
		mu.Lock()
		policies[r.URL.Path] = r.Header.Get("X-CCGateway-Request-Policy")
		mu.Unlock()
		_, _ = w.Write([]byte(`{}`))
	}))
	defer account.Close()
	panel := &cachePanel{accountAddr: account.Listener.Addr().String()}
	srv := httptest.NewServer(panel)
	defer srv.Close()
	saveConfig := func(def *RequestLogDefault) {
		t.Helper()
		cfg := testPanelConfig("127.0.0.1", srv.Listener.Addr().(*net.TCPAddr).Port, "")
		cfg.Scheme = "http"
		cfg.RequestPolicy = &RequestPolicy{SchemaVersion: 1, UnknownField: "reject", CLIVersion: "2.1.302"}
		cfg.RequestLogs = def
		plain, _ := json.Marshal(cfg)
		encrypted, _ := cipher.Encrypt(plain, configAAD)
		envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
		_, err := db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope)
		require.NoError(t, err)
	}
	saveConfig(nil)
	d, err := s.desired(ctx, id, false)
	require.NoError(t, err)
	panel.apply(d.Revision)
	send := func(url, path string) string {
		t.Helper()
		req, _ := http.NewRequest("POST", url, strings.NewReader(`{}`))
		res, err := s.ModelClientForRequest(ModelRequestContext{AccountID: id}).Do(req)
		require.NoError(t, err)
		_, _ = io.Copy(io.Discard, res.Body)
		res.Body.Close()
		require.Equal(t, 200, res.StatusCode)
		mu.Lock()
		defer mu.Unlock()
		return policies[path]
	}
	level := func() string {
		t.Helper()
		var p struct {
			RequestLog string `json:"request_log"`
			RelayMode  string `json:"relay_mode"`
		}
		raw := send(VirtualURL, "/v1/messages")
		require.NoError(t, json.Unmarshal([]byte(raw), &p), raw)
		require.NotEmpty(t, p.RelayMode, "the feature policy is still sent")
		return p.RequestLog
	}
	require.Equal(t, "summary", level(), "no rule, no setting")
	require.Contains(t, send(VirtualTestURL, "/v1/ccgateway/probe"), `"request_log":"summary"`, "the account test carries it too")

	// Saved through the endpoint: dropped at once here, announced to the others.
	put := func(body string) {
		t.Helper()
		w := serveRequestLogsFor(s, d, "PUT", body)
		require.Equal(t, 200, w.Code, w.Body.String())
	}
	put(`{"level":"off"}`)
	require.Equal(t, "off", level())
	require.Contains(t, bus.published, `config:changed {"account_id":`+strconv.FormatInt(id, 10)+`,"type":"ccgateway_request_log"}`)

	// Written by another node: kept until its message arrives.
	_, err = db.Pool.Exec(ctx, `UPDATE ccgateway_account_request_logs SET level='full', full_until=now()+interval '1 hour' WHERE account_id=$1`, id)
	require.NoError(t, err)
	require.Equal(t, "off", level(), "cached")
	s.onConfigChanged([]byte(`{"type":"ccgateway_request_log","account_id":` + strconv.FormatInt(id, 10) + `}`))
	require.Equal(t, "full", level())

	// full ends when full_until passes, whatever the cache holds.
	past := time.Now().Add(-time.Second)
	s.cache.mu.Lock()
	s.cache.requestLogs[id] = cacheEntry[AccountRequestLog]{v: AccountRequestLog{Level: "full", FullUntil: &past}, at: time.Now()}
	s.cache.mu.Unlock()
	require.Equal(t, "summary", level(), "an expired full follows the default")

	// Following, the configuration's rule applies once it is read again.
	put(`{"level":"follow"}`)
	saveConfig(&RequestLogDefault{Level: "off"})
	require.Equal(t, "summary", level(), "the configuration is cached")
	s.onConfigChanged([]byte(`{"type":"ccgateway_features"}`))
	require.Equal(t, "off", level())

	// A provider resource request names only its level.
	put(`{"level":"full","full_for_hours":1}`)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://ccgateway.internal"+resourcecontract.IdentityPath, nil)
	res, err := (modelTransport{s: s, accountID: id}).forwardManaged(req, resourcecontract.IdentityPath, true)
	require.NoError(t, err)
	_, _ = io.Copy(io.Discard, res.Body)
	res.Body.Close()
	mu.Lock()
	require.Equal(t, `{"request_log":"full"}`, policies[resourcecontract.IdentityPath])
	mu.Unlock()
}

// Every invalidation of an account (and of everything) drops its level too;
// a message without an account id drops nothing.
func TestRequestLogCacheInvalidation(t *testing.T) {
	s := &Service{}
	fill := func() {
		s.cache.requestLogs = map[int64]cacheEntry[AccountRequestLog]{7: {at: time.Now()}, 8: {at: time.Now()}}
	}
	fill()
	s.onConfigChanged([]byte(`{"type":"ccgateway_request_log"}`))
	require.Len(t, s.cache.requestLogs, 2)
	s.onConfigChanged([]byte(`{"type":"ccgateway_request_log","account_id":7}`))
	require.Len(t, s.cache.requestLogs, 1)
	fill()
	s.AccountChanged(8)
	require.Len(t, s.cache.requestLogs, 1)
	fill()
	s.invalidateRequests(true)
	require.Nil(t, s.cache.requestLogs)
	// Nothing cached is stored from a read that an invalidation overtook.
	gen := s.cache.gen
	s.forgetRequestLog(9)
	require.NotEqual(t, gen, s.cache.gen)
}

// GET is open to readers of the account, PUT to whoever may update it; an
// owner-level caller only reaches accounts it created.
func TestRequestLogsPermissions(t *testing.T) {
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) { http.NotFound(w, r) })
	owner := f.user("owner@test")
	outsider := f.user("outsider@test")
	reader := f.user("reader@test")
	f.auth.keys[owner] = []string{"account:own:read", "account:own:update"}
	f.auth.keys[outsider] = []string{"account:own:read", "account:own:update"}
	f.auth.keys[reader] = []string{"settings:read"}
	id := f.account(false)
	_, err := f.db.Pool.Exec(context.Background(), "UPDATE accounts SET created_by=$1 WHERE id=$2", owner, id)
	require.NoError(t, err)
	code, out := f.callAs(owner, "PUT", id, "request-logs", `{"level":"off"}`)
	require.Equal(t, 200, code, out)
	require.Equal(t, "off", data(out)["effective"])
	require.Nil(t, data(out)["worker"], "the Worker answered 404")
	code, _ = f.callAs(outsider, "PUT", id, "request-logs", `{"level":"summary"}`)
	require.Equal(t, 404, code)
	code, _ = f.callAs(outsider, "GET", id, "request-logs", "")
	require.Equal(t, 404, code)
	code, _ = f.callAs(reader, "PUT", id, "request-logs", `{"level":"summary"}`)
	require.Equal(t, 403, code)
	code, out = f.callAs(reader, "GET", id, "request-logs", "")
	require.Equal(t, 200, code, out)
	require.Equal(t, map[string]any{"level": "off", "full_until": nil}, data(out)["setting"])
	var by int64
	require.NoError(t, f.db.Pool.QueryRow(context.Background(), `SELECT updated_by FROM ccgateway_account_request_logs WHERE account_id=$1`, id).Scan(&by))
	require.Equal(t, owner, by)
}

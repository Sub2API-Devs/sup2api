//go:build linux

package control

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"
)

// TestRealCoreResponsesWebSocket runs the OpenAI Responses WebSocket mode on
// three real cores with the signed openai plugin and the mock upstream: turns
// of one session share an upstream connection and are each recorded and
// billed, a rejected account key fails over at the handshake, a session also
// works through a forwarding node, and draining a core closes its sessions
// with 1012 so the client reconnects to another node.
//
// Besides the real-core variables it needs TEST_MOCK_URL and the openai
// package in TEST_BUILTIN_DIR.
func TestRealCoreResponsesWebSocket(t *testing.T) {
	mockURL := strings.TrimRight(os.Getenv("TEST_MOCK_URL"), "/")
	if mockURL == "" {
		t.Skip("requires TEST_MOCK_URL in addition to the real-core variables")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()
	const adminEmail, adminPassword = "admin@real.test", "Real-core-admin-pass!"
	c := newRealCluster(t, ctx, realOptions{coreEnv: []string{
		"SUB2API_BOOTSTRAP_ADMIN_EMAIL=" + adminEmail, "SUB2API_BOOTSTRAP_ADMIN_PASSWORD=" + adminPassword,
		"SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM=true",
	}})
	bundled := false
	for _, b := range c.bundled {
		bundled = bundled || strings.Contains(b.name, "openai")
	}
	if !bundled {
		t.Fatal("TEST_BUILTIN_DIR must contain the signed openai package")
	}
	db := c.db
	tick := time.NewTicker(200 * time.Millisecond)
	defer tick.Stop()
	wait := func(what string, timeout time.Duration, fn func() bool) {
		t.Helper()
		deadline := time.Now().Add(timeout)
		for !fn() {
			if time.Now().After(deadline) {
				t.Fatalf("timed out after %s waiting for %s", timeout, what)
			}
			select {
			case <-ctx.Done():
				t.Fatal(ctx.Err())
			case <-tick.C:
			}
		}
	}
	for _, id := range []string{"a", "b", "c"} {
		c.startShell(id)
	}
	if err := c.node("a").engine.Recover(ctx, true); err != nil {
		t.Fatal("bootstrap primary", err)
	}
	_ = c.node("a").engine.Heartbeat(ctx)
	for _, id := range []string{"b", "c"} {
		if err := c.node(id).engine.Recover(ctx, false); err != nil {
			t.Fatal("join follower", err)
		}
	}
	for _, n := range c.list() {
		c.run(n)
	}
	a, b, f := c.node("a"), c.node("b"), c.node("c")
	for _, n := range c.list() {
		wait(n.id+" serving", 3*time.Minute, func() bool {
			st, mode, err := n.runtime.Status(ctx)
			return err == nil && st.Ready && mode == "local"
		})
	}
	wait("openai plugin with websocket support enabled", 3*time.Minute, func() bool {
		var ok bool
		_ = db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM plugins p JOIN plugin_versions v ON v.plugin_key=p.key AND v.version=p.active_version
			WHERE p.key='openai' AND p.status='enabled' AND v.manifest::text LIKE '%platform.websocket.v1%')`).Scan(&ok)
		return ok
	})

	// ---- tenant: two openai accounts on the mock, the first one's key is
	// rejected at the handshake
	admin := newAPIClient(t, a.public.URL).login(adminEmail, adminPassword)
	mock := mockClient{newAPIClient(t, mockURL)}
	suffix := c.dbname
	model := "gpt-ws-real-" + suffix
	badKey, goodKey := "sk-ws-bad-"+suffix, "sk-ws-good-"+suffix
	mock.rule(map[string]any{"api_key": badKey, "status": 401})
	admin.ok(http.MethodPost, "/prices", map[string]any{"model": model, "mode": "per_token", "note": "real-core run price",
		"config": map[string]float64{"p": 3, "c": 15, "cr": 0.3, "cc": 3.75, "cc1h": 6}})
	group := admin.ok(http.MethodPost, "/groups", map[string]any{"name": "ws-" + suffix, "description": "real-core", "visibility": "restricted", "rate_multiplier": "1", "model_allowlist": []string{}}).id("data.id")
	account := func(name, key string, priority int) int64 {
		return admin.ok(http.MethodPost, "/accounts", map[string]any{
			"name": name, "plugin_key": "openai", "type": "apikey", "group_ids": []int64{group}, "proxy_id": nil,
			"priority": priority, "max_concurrency": 4, "schedulable": true,
			"credentials": map[string]any{"api_key": key, "base_url": mockURL},
		}).id("data.id")
	}
	badID, goodID := account("ws-bad-"+suffix, badKey, 1), account("ws-good-"+suffix, goodKey, 5)
	email, password := "ws-"+suffix+"@real.test", "Real-ws-pass!"
	userID := admin.ok(http.MethodPost, "/users", map[string]any{"email": email, "display_name": email, "password": password, "role_keys": []string{"user"}, "max_concurrency": 10}).id("data.id")
	admin.ok(http.MethodPut, fmt.Sprintf("/users/%d/groups", userID), map[string]any{"group_ids": []int64{group}})
	admin.ok(http.MethodPost, fmt.Sprintf("/users/%d/balance/adjust", userID), map[string]any{"amount": "20", "credit": true, "note": "real-core credit"})
	apiKey := admin.login(email, password).ok(http.MethodPost, "/me/api-keys", map[string]any{"name": "ws-" + suffix, "group_id": group}).str("data.key")

	turn := func(conn *wsConn, input string) []apiResponse {
		t.Helper()
		raw, _ := json.Marshal(map[string]any{"type": "response.create", "model": model, "input": input, "store": false})
		conn.sendText(t, raw)
		var events []apiResponse
		for {
			op, payload, code := conn.readFrame(t)
			if op == 8 {
				t.Fatalf("session closed with %d during a turn after %d events", code, len(events))
			}
			ev := apiResponse{status: 200, body: payload}
			events = append(events, ev)
			switch ev.str("type") {
			case "response.completed":
				return events
			case "error":
				t.Fatalf("turn failed: %s", payload)
			}
		}
	}
	rows := func() (n int, nodes string) {
		_ = db.QueryRow(ctx, `SELECT count(*), coalesce(string_agg(DISTINCT node_id, ','), '') FROM usage_logs
			WHERE user_id=$1 AND protocol='openai.responses_ws' AND success AND account_id=$2 AND input_tokens=120 AND output_tokens=42
			AND cache_read_tokens=50 AND stream AND total_cost > 0`, userID, goodID).Scan(&n, &nodes)
		return
	}

	// ---- one session on follower b: three turns, one upstream connection
	conn, status := dialWS(t, b.public.URL, "/v1/responses", "Bearer "+apiKey)
	if status != 101 {
		t.Fatalf("upgrade through b: HTTP %d", status)
	}
	for i := 0; i < 3; i++ {
		if evs := turn(conn, fmt.Sprint("turn ", i)); evs[0].str("type") != "response.created" || len(evs) < 4 {
			t.Fatalf("turn %d events: %v", i, evs)
		}
	}
	wait("three billed turns recorded", time.Minute, func() bool { n, _ := rows(); return n == 3 })
	if n, nodes := rows(); n != 3 || nodes != "b" {
		t.Fatalf("turns recorded on %q", nodes)
	}
	var disabled bool
	if err := db.QueryRow(ctx, `SELECT status <> 'active' FROM accounts WHERE id=$1`, badID).Scan(&disabled); err != nil || !disabled {
		t.Fatalf("account with the rejected key still active: %v", err)
	}
	handshakes, messages := mockWS(t, mock, goodKey)
	if handshakes != 1 || messages != 3 {
		t.Fatalf("mock saw %d handshakes and %d messages for the good key", handshakes, messages)
	}
	if h, _ := mockWS(t, mock, badKey); h != 1 {
		t.Fatalf("rejected key handshakes: %d", h)
	}
	t.Log("session on b: rejected key failed over at the handshake, three turns on one upstream connection, each recorded and billed")

	// ---- a session through a forwarding node is served by the primary
	nodes, err := c.store.Nodes(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, n := range nodes {
		if n.ID == "a" {
			if err = f.runtime.Redirect(ctx, n); err != nil {
				t.Fatal(err)
			}
		}
	}
	if f.runtime.Router.Route().Mode != "forward-only" {
		t.Fatal("c did not start forwarding to a")
	}
	via, status := dialWS(t, f.public.URL, "/v1/responses", "Bearer "+apiKey)
	if status != 101 {
		t.Fatalf("upgrade through forwarding c: HTTP %d", status)
	}
	turn(via, "forwarded")
	wait("forwarded turn recorded on a", time.Minute, func() bool { n, nodes := rows(); return n == 4 && strings.Contains(nodes, "a") })
	via.closeFrame()
	if err := f.runtime.Local(ctx); err != nil {
		t.Fatal(err)
	}

	// ---- draining b's core closes its session with 1012; the client
	// reconnects through another node and goes on
	stopped := make(chan error, 1)
	go func() { stopped <- b.runtime.DrainStop(ctx, "websocket-drain-test") }()
	op, _, code := conn.readFrame(t)
	for op != 8 {
		op, _, code = conn.readFrame(t)
	}
	if code != 1012 {
		t.Fatalf("session on the draining core closed with %d, want 1012", code)
	}
	if err := <-stopped; err != nil {
		t.Fatalf("drain with an open session: %v", err)
	}
	again, status := dialWS(t, a.public.URL, "/v1/responses", "Bearer "+apiKey)
	if status != 101 {
		t.Fatalf("reconnect through a: HTTP %d", status)
	}
	turn(again, "after reconnect")
	again.closeFrame()
	wait("turn after reconnect recorded", time.Minute, func() bool { n, _ := rows(); return n == 5 })
	t.Log("draining b closed its session with 1012; the client reconnected through a and continued")
}

// mockWS counts the mock's accepted or rejected handshakes and the turn
// messages it received for one API key.
func mockWS(t *testing.T, mock mockClient, key string) (handshakes, messages int) {
	t.Helper()
	r := mock.do(http.MethodGet, "/__requests", nil, nil)
	var log struct {
		Data []struct {
			Method string `json:"method"`
			Path   string `json:"path"`
			APIKey string `json:"api_key"`
		} `json:"data"`
	}
	if err := json.Unmarshal(r.body, &log); err != nil {
		t.Fatal(err)
	}
	for _, e := range log.Data {
		if e.APIKey != key || e.Path != "/v1/responses" {
			continue
		}
		switch e.Method {
		case "GET":
			handshakes++
		case "WS":
			messages++
		}
	}
	return
}

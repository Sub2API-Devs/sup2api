package ccgateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestParseUsage(t *testing.T) {
	now := time.Now()
	fiveReset := now.Add(4 * time.Hour).Format(time.RFC3339)
	weekReset := now.Add(6 * 24 * time.Hour).Format(time.RFC3339)
	sonnetReset := now.Add(5 * 24 * time.Hour).Format(time.RFC3339)
	fableReset := now.Add(7 * 24 * time.Hour).Format(time.RFC3339)

	full := fmt.Sprintf(`{
		"five_hour": {"utilization": 25.5, "resets_at": %q},
		"seven_day": {"utilization": 10.0, "resets_at": %q},
		"seven_day_sonnet": {"utilization": 5.0, "resets_at": %q},
		"seven_day_overage_included": {"utilization": 3.0, "resets_at": %q}
	}`, fiveReset, weekReset, sonnetReset, fableReset)

	windows, err := ParseUsage([]byte(full))
	if err != nil || len(windows) != 4 {
		t.Fatalf("full: %v %v", err, windows)
	}
	keys := make([]string, len(windows))
	for i, w := range windows {
		keys[i] = w.Key
	}
	if fmt.Sprint(keys) != "[5h 7d 7d_sonnet 7d_fable]" {
		t.Fatalf("order: %v", keys)
	}
	if windows[0].Utilization != 25.5 || windows[0].ResetsAt == nil || windows[0].ResetsAt.Before(now) {
		t.Fatalf("5h: %+v", windows[0])
	}

	// Only five_hour: the weekly windows are absent.
	fiveOnly := fmt.Sprintf(`{"five_hour": {"utilization": 40, "resets_at": %q}}`, fiveReset)
	windows, err = ParseUsage([]byte(fiveOnly))
	if err != nil || len(windows) != 1 || windows[0].Key != "5h" {
		t.Fatalf("five only: %v %v", err, windows)
	}

	// No five_hour: it defaults to 0 utilization, no reset.
	noFive := fmt.Sprintf(`{"seven_day": {"utilization": 10, "resets_at": %q}}`, weekReset)
	windows, err = ParseUsage([]byte(noFive))
	if err != nil || len(windows) != 2 || windows[0].Utilization != 0 || windows[0].ResetsAt != nil {
		t.Fatalf("no five: %v %v", err, windows)
	}

	// seven_day_sonnet without resets_at: not started yet, omitted.
	sonnetNotStarted := fmt.Sprintf(`{"five_hour": {"utilization": 0, "resets_at": %q}, "seven_day_sonnet": {"utilization": 0, "resets_at": null}}`, fiveReset)
	windows, err = ParseUsage([]byte(sonnetNotStarted))
	if err != nil || len(windows) != 1 {
		t.Fatalf("sonnet not started: %v %v", err, windows)
	}

	// seven_day and seven_day_overage_included without resets_at: reported as 0, no reset.
	weekNotStarted := fmt.Sprintf(`{"five_hour": {"utilization": 10, "resets_at": %q}, "seven_day": {"utilization": 0}, "seven_day_overage_included": {"utilization": 0}}`, fiveReset)
	windows, err = ParseUsage([]byte(weekNotStarted))
	if err != nil || len(windows) != 3 {
		t.Fatalf("week not started: %v %v", err, windows)
	}
	if windows[1].Key != "7d" || windows[1].ResetsAt != nil || windows[2].Key != "7d_fable" || windows[2].ResetsAt != nil {
		t.Fatalf("not started windows: %+v %+v", windows[1], windows[2])
	}

	// Invalid JSON.
	if _, err := ParseUsage([]byte("not json")); err == nil {
		t.Fatal("invalid json accepted")
	}

	// Empty object: one 0 % window.
	windows, err = ParseUsage([]byte("{}"))
	if err != nil || len(windows) != 1 || windows[0].Utilization != 0 {
		t.Fatalf("empty: %v %v", err, windows)
	}

	// October 2026 shape (Max 20x): the Fable weekly window is only in limits.
	limits := fmt.Sprintf(`{
		"five_hour": {"utilization": 0, "resets_at": %q},
		"seven_day": {"utilization": 4, "resets_at": %q},
		"seven_day_sonnet": null, "seven_day_opus": null,
		"limits": [
			{"kind": "session", "group": "session", "percent": 0, "resets_at": %q, "scope": null},
			{"kind": "weekly_all", "group": "weekly", "percent": 4, "resets_at": %q, "scope": null},
			{"kind": "weekly_scoped", "group": "weekly", "percent": 12, "resets_at": %q, "scope": {"model": {"id": null, "display_name": "Fable"}, "surface": null}}
		]
	}`, fiveReset, weekReset, fiveReset, weekReset, fableReset)
	windows, err = ParseUsage([]byte(limits))
	if err != nil || len(windows) != 3 || windows[2].Key != "7d_fable" || windows[2].Utilization != 12 || windows[2].ResetsAt == nil {
		t.Fatalf("limits: %v %+v", err, windows)
	}
	// The legacy field wins when both are sent.
	both := fmt.Sprintf(`{"seven_day_overage_included": {"utilization": 3, "resets_at": %q}, "limits": [{"kind": "weekly_scoped", "percent": 12, "resets_at": %q, "scope": {"model": {"display_name": "Fable"}}}]}`, fableReset, fableReset)
	if windows, err = ParseUsage([]byte(both)); err != nil || len(windows) != 2 || windows[1].Utilization != 3 {
		t.Fatalf("both: %v %+v", err, windows)
	}
}

func TestQueryUsage(t *testing.T) {
	reset := time.Now().Add(4 * time.Hour).Format(time.RFC3339)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" || r.URL.Path != "/admin/usage" {
			w.WriteHeader(404)
			return
		}
		auth := r.Header.Get("Authorization")
		switch auth {
		case "Bearer test-admin-key":
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"five_hour": {"utilization": 42, "resets_at": %q}}`, reset)
		case "Bearer expired":
			w.WriteHeader(400)
			_, _ = w.Write([]byte(`{"type":"error","error":{"type":"token_expired","message":"The OAuth token has expired."}}`))
		case "Bearer not-logged-in":
			w.WriteHeader(400)
			_, _ = w.Write([]byte(`{"type":"error","error":{"type":"not_logged_in","message":"No account is signed in."}}`))
		case "Bearer old-runtime":
			w.WriteHeader(404)
			_, _ = w.Write([]byte(`{"type":"error","error":{"type":"not_found","message":"Unknown endpoint."}}`))
		case "Bearer conflict":
			w.WriteHeader(409)
			_, _ = w.Write([]byte(`{"type":"error","error":{"type":"not_synchronized","message":"The runtime is not synchronized."}}`))
		default:
			w.WriteHeader(401)
		}
	}))
	defer upstream.Close()

	f := newRuntimeFixture(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth != "Bearer controller-secret" {
			w.WriteHeader(401)
			return
		}
		// Account runtime: /accounts/<key>/admin/usage
		if strings.Contains(r.URL.Path, "/accounts/") && strings.HasSuffix(r.URL.Path, "/admin/usage") && r.Method == "GET" {
			// Proxy to upstream with different auth
			req, _ := http.NewRequest(r.Method, upstream.URL+"/admin/usage", r.Body)
			req.Header.Set("Authorization", "Bearer test-admin-key")
			res, err := http.DefaultClient.Do(req)
			if err != nil {
				w.WriteHeader(502)
				return
			}
			defer res.Body.Close()
			w.WriteHeader(res.StatusCode)
			w.Header().Set("Content-Type", res.Header.Get("Content-Type"))
			buf := make([]byte, 1<<16)
			n, _ := res.Body.Read(buf)
			_, _ = w.Write(buf[:n])
			return
		}
		w.WriteHeader(404)
	}))

	ctx := context.Background()
	id := f.account(true)

	// Success: shared-container mode.
	windows, err := f.s.QueryUsage(ctx, id)
	if err != nil || len(windows) != 1 || windows[0].Utilization != 42 {
		t.Fatalf("success: %v %v", err, windows)
	}

	// Not configured.
	_, _ = f.db.Pool.Exec(ctx, `DELETE FROM settings WHERE key = $1`, settingKey)
	_, err = f.s.QueryUsage(ctx, id)
	if ue, ok := err.(*UsageError); !ok || ue.Code != "not_configured" {
		t.Fatalf("not configured: %v", err)
	}

	// token_expired: Auth = true.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(400)
		_, _ = w.Write([]byte(`{"type":"error","error":{"type":"token_expired","message":"x"}}`))
	}))
	defer srv.Close()
	t.Setenv("CCGATEWAY_URL", srv.URL)
	cfg, _ := json.Marshal(Config{Mode: "local", AdminKey: "x"})
	enc, _ := f.cipher.Encrypt(cfg, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": enc})
	_, _ = f.db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope)
	_, err = f.s.QueryUsage(ctx, id)
	if ue, ok := err.(*UsageError); !ok || !ue.Auth {
		t.Fatalf("auth error: %+v", err)
	}

	// Old runtime: unsupported.
	srv2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(404)
		_, _ = w.Write([]byte(`{"type":"error","error":{"type":"not_found","message":"x"}}`))
	}))
	defer srv2.Close()
	t.Setenv("CCGATEWAY_URL", srv2.URL)
	cfg, _ = json.Marshal(Config{Mode: "local", AdminKey: "x"})
	enc, _ = f.cipher.Encrypt(cfg, configAAD)
	envelope, _ = json.Marshal(map[string]any{"cipher": enc})
	_, _ = f.db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope)
	_, err = f.s.QueryUsage(ctx, id)
	if ue, ok := err.(*UsageError); !ok || ue.Code != "unsupported" {
		t.Fatalf("unsupported: %v", err)
	}

	// API key account.
	apiID := f.account(true)
	_, _ = f.db.Pool.Exec(ctx, `UPDATE accounts SET type = 'api_key' WHERE id = $1`, apiID)
	srv3 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(409)
		_, _ = w.Write([]byte(`{"type":"error","error":{"type":"api_key_account","message":"API key accounts have no subscription usage."}}`))
	}))
	defer srv3.Close()
	t.Setenv("CCGATEWAY_URL", srv3.URL)
	cfg, _ = json.Marshal(Config{Mode: "local", AdminKey: "x"})
	enc, _ = f.cipher.Encrypt(cfg, configAAD)
	envelope, _ = json.Marshal(map[string]any{"cipher": enc})
	_, _ = f.db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope)
	_, err = f.s.QueryUsage(ctx, apiID)
	if ue, ok := err.(*UsageError); !ok || ue.Code != "api_key_account" {
		t.Fatalf("api key account: %v", err)
	}
}

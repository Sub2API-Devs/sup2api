package proxy

import (
	"context"
	"fmt"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// An owner cannot change the connection of a proxy that accounts of other
// users go through; everything else, and the full key, are unaffected.
func TestUpdateInUseByOthers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	ctx := context.Background()
	svc := New(db, testCipher(t), nil, Options{})
	admin, alice, bob := addUser(t, db, "admin@x.com"), addUser(t, db, "alice@x.com"), addUser(t, db, "bob@x.com")
	engine := gin.New()
	svc.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, fakeAuthz{keys: map[int64][]string{
		admin: {"proxy:read", "proxy:manage"},
		alice: {"proxy:read:own", "proxy:manage:own"},
		bob:   {"proxy:read:own", "proxy:manage:own"},
	}}))
	stored := map[string]any{"name": "p", "protocol": "http", "host": "h.example", "port": 8080, "username": "u", "password": "pw"}
	code, out := do(t, engine, alice, "POST", "/proxies", stored)
	if code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	id := int64(data(out)["id"].(float64))
	path := fmt.Sprintf("/proxies/%d", id)
	account := func(name string, owner int64) {
		t.Helper()
		if _, err := db.Pool.Exec(ctx, `INSERT INTO accounts (name, plugin_key, type, credentials_enc, proxy_id, created_by)
			VALUES ($1, 'p', 't', '\x00', $2, $3)`, name, id, owner); err != nil {
			t.Fatal(err)
		}
	}

	// Only the owner's own accounts use it: the connection is theirs to change.
	account("mine", alice)
	if code, out = do(t, engine, alice, "PATCH", path, map[string]any{"host": "h2.example"}); code != 200 {
		t.Fatalf("patch host without foreign accounts: %d %v", code, out)
	}
	stored["host"] = "h2.example"

	// The administrator puts the supplier's proxy on two accounts.
	account("admin's", admin)
	if _, err := db.Pool.Exec(ctx, `INSERT INTO accounts (name, plugin_key, type, credentials_enc, proxy_id) VALUES ('legacy', 'p', 't', '\x00', $1)`, id); err != nil {
		t.Fatal(err)
	}
	for field, value := range map[string]any{"protocol": "socks5", "host": "h3.example", "port": 9, "username": "v", "password": "other"} {
		code, out = do(t, engine, alice, "PATCH", path, map[string]any{field: value})
		e, _ := out["error"].(map[string]any)
		details, _ := e["details"].(map[string]any)
		if code != 409 || e["code"] != "proxy_in_use" || details["account_count"] != float64(2) {
			t.Fatalf("patch %s in use: %d %v", field, code, out)
		}
	}
	if code, out = do(t, engine, alice, "PATCH", path, map[string]any{"password": ""}); code != 409 {
		t.Fatalf("clear password in use: %d %v", code, out)
	}
	// Visibility comes first: another own-level user gets 404, not 409.
	if code, out = do(t, engine, bob, "PATCH", path, map[string]any{"host": "h3.example"}); code != 404 {
		t.Fatalf("foreign patch in use: %d %v", code, out)
	}
	// A host in another case is the stored host, and stays as stored.
	if code, out = do(t, engine, alice, "PATCH", path, map[string]any{"host": "H2.Example"}); code != 200 || data(out)["host"] != "h2.example" {
		t.Fatalf("patch host case in use: %d %v", code, out)
	}
	// The name, the status and the stored connection sent back by the
	// console are not a connection change.
	if code, out = do(t, engine, alice, "PATCH", path, map[string]any{"name": "renamed"}); code != 200 || data(out)["name"] != "renamed" {
		t.Fatalf("rename in use: %d %v", code, out)
	}
	stored["name"], stored["status"] = "again", "disabled"
	if code, out = do(t, engine, alice, "PATCH", path, stored); code != 200 || data(out)["status"] != "disabled" || data(out)["host"] != "h2.example" {
		t.Fatalf("console edit in use: %d %v", code, out)
	}
	// The full key changes it anyway.
	if code, out = do(t, engine, admin, "PATCH", path, map[string]any{"host": "h4.example"}); code != 200 || data(out)["host"] != "h4.example" {
		t.Fatalf("manage patch in use: %d %v", code, out)
	}
	// Deleting still counts every account.
	code, out = do(t, engine, alice, "DELETE", path, nil)
	if e, _ := out["error"].(map[string]any); code != 409 || e["code"] != "conflict" || e["details"].(map[string]any)["account_count"].(float64) != 3 {
		t.Fatalf("delete in use: %d %v", code, out)
	}
	// Soft-deleted foreign accounts no longer hold the connection.
	if _, err := db.Pool.Exec(ctx, `UPDATE accounts SET deleted_at = now() WHERE created_by IS DISTINCT FROM $1`, alice); err != nil {
		t.Fatal(err)
	}
	if code, out = do(t, engine, alice, "PATCH", path, map[string]any{"port": 9}); code != 200 {
		t.Fatalf("patch after foreign accounts are gone: %d %v", code, out)
	}
}

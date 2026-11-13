package billing

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// Who may adjust whose balance is authz's CanActOnUsers, and only a
// superuser its own (M7, FU5). Every caller here holds balance:adjust
// (allowAll); the roles decide.
func TestAdjustBalanceActsOnOthers(t *testing.T) {
	e := newEnv(t)
	az := authz.New(authz.Deps{DB: e.db, Bus: e.bus})
	if err := az.SyncCore(context.Background()); err != nil {
		t.Fatal(err)
	}
	e.svc.Users = az
	withRole := func(email, role string) int64 {
		id := e.user(email)
		e.exec(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE key = $2`, id, role)
		return id
	}
	super, admin := withRole("super@example.com", authz.RoleSuperAdmin), withRole("admin@example.com", authz.RoleAdmin)
	operator, user := withRole("operator@example.com", authz.RoleOperator), withRole("user@example.com", authz.RoleUser)
	adjust := func(actor, target int64) (int, map[string]any) {
		return e.call(actor, "POST", "/users/"+itoa(target)+"/balance/adjust", map[string]any{"amount": "1", "credit": true})
	}
	adjusted := 0
	for _, tc := range []struct {
		name          string
		actor, target int64
		status        int
		code          string
	}{
		{"oneself", admin, admin, 409, "conflict"},
		{"a superuser oneself", super, super, 200, ""},
		{"a user with higher privileges", operator, admin, 403, "permission_denied"},
		{"a superuser", admin, super, 403, "permission_denied"},
		{"a user within one's own roles", operator, user, 200, ""},
		{"an admin as the superuser", super, admin, 200, ""},
	} {
		status, resp := adjust(tc.actor, tc.target)
		if status != tc.status || (tc.code != "" && errCode(resp) != tc.code) {
			t.Fatalf("adjusting %s: %d %v", tc.name, status, resp)
		}
		if status == 200 {
			adjusted++
		}
	}
	// Refused adjustments moved no money.
	var n int
	if err := e.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM balance_ledger`).Scan(&n); err != nil || n != adjusted {
		t.Fatalf("ledger rows: %d %v", n, err)
	}
	// Not wired, nobody adjusts anything.
	e.svc.Users = nil
	if status, resp := adjust(super, user); status != 500 {
		t.Fatalf("no guard: %d %v", status, resp)
	}
}

// keyTokens is allowAll that also answers "sak_<name>" with keys[name].
type keyTokens struct {
	allowAll
	keys map[string]core.AccessKeyIdentity
}

func (k keyTokens) VerifyAccessKey(_ context.Context, raw, _ string) (core.AccessKeyIdentity, error) {
	id, ok := k.keys[strings.TrimPrefix(raw, core.AccessKeyPrefix)]
	if !ok {
		return core.AccessKeyIdentity{}, core.ErrUnauthenticated
	}
	return id, nil
}

// A superuser adjusts its own balance through its session, or through an
// access key only when the key holds balance:adjust; nobody else does,
// whichever way they come (FU5). Each exemption leaves one audit row.
func TestAdjustBalanceSuperuserSelf(t *testing.T) {
	e := newEnv(t)
	az := authz.New(authz.Deps{DB: e.db, Bus: e.bus})
	if err := az.SyncCore(context.Background()); err != nil {
		t.Fatal(err)
	}
	withRole := func(email, role string) int64 {
		id := e.user(email)
		e.exec(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE key = $2`, id, role)
		return id
	}
	super, admin := withRole("super@example.com", authz.RoleSuperAdmin), withRole("admin@example.com", authz.RoleAdmin)
	engine := gin.New()
	e.svc.Users = az
	e.svc.RegisterRoutes(httpapi.NewRouter(engine, keyTokens{keys: map[string]core.AccessKeyIdentity{
		"adjust":       {UserID: super, KeyID: 11, Permissions: []string{"balance:adjust"}},
		"read":         {UserID: super, KeyID: 12, Permissions: []string{"balance:read"}},
		"admin_adjust": {UserID: admin, KeyID: 13, Permissions: []string{"balance:adjust"}},
	}}, az))
	e.h = engine
	adjust := func(actor int64, key string) (int, map[string]any) {
		var auth []string
		if key != "" {
			auth = []string{"Authorization", "Bearer " + core.AccessKeyPrefix + key}
		}
		return e.call(actor, "POST", "/users/"+itoa(actor)+"/balance/adjust", map[string]any{"amount": "1", "credit": true}, auth...)
	}
	for _, tc := range []struct {
		name   string
		actor  int64
		key    string
		status int
		code   string
	}{
		{"superuser session", super, "", 200, ""},
		{"superuser key with balance:adjust", super, "adjust", 200, ""},
		{"superuser key without it", super, "read", 403, "permission_denied"},
		{"admin session", admin, "", 409, "conflict"},
		{"admin key with balance:adjust", admin, "admin_adjust", 409, "conflict"},
	} {
		if status, resp := adjust(tc.actor, tc.key); status != tc.status || (tc.code != "" && errCode(resp) != tc.code) {
			t.Fatalf("%s: %d %v", tc.name, status, resp)
		}
	}
	rows, err := e.db.Pool.Query(context.Background(), `SELECT user_id, target_id, detail FROM audit_logs WHERE action = 'user.act_on_self' ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var got []map[string]any
	for rows.Next() {
		var uid int64
		var target string
		var raw []byte
		if err := rows.Scan(&uid, &target, &raw); err != nil {
			t.Fatal(err)
		}
		var d map[string]any
		if err := json.Unmarshal(raw, &d); err != nil || uid != super || target != itoa(super) || d["reason"] != "self_by_superuser" {
			t.Fatalf("audit row: %d %s %s %v", uid, target, raw, err)
		}
		got = append(got, d)
	}
	if len(got) != 2 || got[0]["via"] != "session" || got[0]["access_key_id"] != nil ||
		got[1]["via"] != "access_key" || got[1]["access_key_id"] != float64(11) {
		t.Fatalf("audit rows: %v", got)
	}
}

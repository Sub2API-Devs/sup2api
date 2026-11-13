package proxy

import (
	"context"
	"fmt"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// A holder of proxy:manage:proxy/X (CONTRACTS §21.0) manages that proxy
// only: other proxies are 404, it creates and probes nothing, it keeps the
// restricted tier (no private address), and deleting the proxy clears the
// grants naming it.
func TestProxyIDScope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	ctx := context.Background()
	svc := New(db, testCipher(t), nil, Options{ProbeURL: "http://probe.example.invalid/generate_204"})
	admin, keeper := addUser(t, db, "admin@x.com"), addUser(t, db, "keeper@x.com")
	az := fakeAuthz{keys: map[int64][]string{admin: {"proxy:read", "proxy:manage"}}}
	engine := gin.New()
	svc.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, az))
	create := func(name string) int64 {
		code, out := do(t, engine, admin, "POST", "/proxies", map[string]any{"name": name, "protocol": "http", "host": "h.example", "port": 8080})
		require.Equal(t, 201, code, out)
		return int64(data(out)["id"].(float64))
	}
	mine, other := create("mine"), create("other")
	az.keys[keeper] = []string{fmt.Sprintf("proxy:manage:proxy/%d", mine), fmt.Sprintf("proxy:read:proxy/%d", mine)}

	_, out := do(t, engine, keeper, "GET", "/proxies", nil)
	require.Equal(t, fmt.Sprint(mine), ids(out))
	code, out := do(t, engine, keeper, "PATCH", fmt.Sprintf("/proxies/%d", mine), map[string]any{"name": "renamed"})
	require.Equal(t, 200, code, out)
	code, _ = do(t, engine, keeper, "PATCH", fmt.Sprintf("/proxies/%d", other), map[string]any{"name": "x"})
	require.Equal(t, 404, code)
	code, _ = do(t, engine, keeper, "GET", fmt.Sprintf("/proxies/%d", other), nil)
	require.Equal(t, 404, code)
	code, out = do(t, engine, keeper, "PATCH", fmt.Sprintf("/proxies/%d", mine), map[string]any{"host": "10.0.0.1"})
	require.Equal(t, 403, code, out)
	code, out = do(t, engine, keeper, "POST", "/proxies", map[string]any{"name": "new", "protocol": "http", "host": "h.example", "port": 8081})
	require.Equal(t, 403, code, out)
	require.Equal(t, "proxy:manage:own", permission(out))
	code, out = do(t, engine, keeper, "POST", "/proxies/probe", map[string]any{"proxy_url": "http://h.example:8080"})
	require.Equal(t, 403, code, out)

	role := scalar(t, db, `INSERT INTO roles (key, name) VALUES ('keeper', '{}') RETURNING id`)
	perm := scalar(t, db, `INSERT INTO permissions (key, module, label, source) VALUES ('proxy:manage', 'proxy', '{}', 'core')
		ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key RETURNING id`)
	_, err := db.Pool.Exec(ctx, `INSERT INTO role_permission_scopes (role_id, permission_id, scope) VALUES ($1, $2, $3), ($1, $2, $4)`,
		role, perm, fmt.Sprintf("proxy/%d", mine), fmt.Sprintf("proxy/%d", other))
	require.NoError(t, err)
	code, _ = do(t, engine, admin, "DELETE", fmt.Sprintf("/proxies/%d", mine), nil)
	require.Equal(t, 204, code)
	var left []string
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT array_agg(scope) FROM role_permission_scopes WHERE role_id = $1`, role).Scan(&left))
	require.Equal(t, []string{fmt.Sprintf("proxy/%d", other)}, left)
}

func ids(out map[string]any) string {
	items, _ := out["data"].([]any)
	s := ""
	for i, it := range items {
		if i > 0 {
			s += ","
		}
		s += fmt.Sprint(int64(it.(map[string]any)["id"].(float64)))
	}
	return s
}

func permission(out map[string]any) string {
	e, _ := out["error"].(map[string]any)
	d, _ := e["details"].(map[string]any)
	p, _ := d["permission"].(string)
	return p
}

func scalar(t *testing.T, db *store.DB, sql string) (v int64) {
	t.Helper()
	require.NoError(t, db.Pool.QueryRow(context.Background(), sql).Scan(&v))
	return v
}

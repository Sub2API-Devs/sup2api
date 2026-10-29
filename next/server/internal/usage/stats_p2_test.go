package usage

import (
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// order/limit rank the groups and fold the rest into "__other__"; an
// operator can group by the upstream model, the caller cannot.
func TestSummaryRankingAndUpstreamModel(t *testing.T) {
	f := newFixture(t)
	var recs []*core.UsageRecord
	for i, m := range []string{"m-a", "m-a", "m-a", "m-b", "m-b", "m-c"} {
		r := f.record("rank-"+strconv.Itoa(i), false)
		r.Model, r.UpstreamModel = m, "up-"+m
		recs = append(recs, r)
	}
	f.svc.process(t.Context(), recs)
	q := "&from=2026-09-20T00:00:00Z"
	rows := f.get(f.user, "/me/usage/summary?group_by=model&order=requests&limit=1"+q, 200)["data"].([]any)
	require.Len(t, rows, 2)
	require.Equal(t, "m-a", rows[0].(map[string]any)["key"])
	require.Equal(t, "__other__", rows[1].(map[string]any)["key"])
	require.Equal(t, float64(3), rows[1].(map[string]any)["requests"])
	require.Len(t, f.get(f.user, "/me/usage/summary?group_by=model&limit=5"+q, 200)["data"].([]any), 3)
	for _, bad := range []string{"order=oops", "limit=0", "limit=201"} {
		f.get(f.user, "/me/usage/summary?group_by=model&"+bad+q, 400)
	}
	up := f.get(f.user, "/usage/summary?group_by=upstream_model&order=requests"+q, 200)["data"].([]any)
	require.Equal(t, "up-m-a", up[0].(map[string]any)["key"])
	f.get(f.user, "/me/usage/summary?group_by=upstream_model"+q, 400)
}

// The operator overview counts every user's rows and adds users and
// accounts for a caller allowed to read them; the self view has API keys.
func TestAllOverview(t *testing.T) {
	f := newFixture(t)
	now := time.Now()
	mine, theirs := f.record("aov-1", false), f.record("aov-2", false)
	mine.CreatedAt, theirs.CreatedAt, theirs.UserID = now.Add(-time.Minute), now.Add(-time.Minute), f.other
	f.svc.process(t.Context(), []*core.UsageRecord{mine, theirs})
	_, err := f.db.Pool.Exec(t.Context(), `INSERT INTO accounts(name,plugin_key,type,credentials_enc,status) VALUES('ok','anthropic','apikey','','active'),('bad','anthropic','apikey','','error')`)
	require.NoError(t, err)

	ov := f.get(f.user, "/usage/overview?tz=UTC", 200)["data"].(map[string]any)
	require.Equal(t, float64(2), ov["last_5m"].(map[string]any)["requests"])
	require.NotContains(t, ov, "users") // no Authorizer: optional sections hidden
	require.NotContains(t, ov, "api_keys")

	f.svc.Authz = allowAll{}
	ov = f.get(f.user, "/usage/overview?tz=Asia/Shanghai", 200)["data"].(map[string]any)
	users := ov["users"].(map[string]any)
	require.Equal(t, float64(2), users["total"])
	require.Equal(t, float64(2), users["active_today"])
	accounts := ov["accounts"].(map[string]any)
	require.Equal(t, float64(2), accounts["total"])
	require.Equal(t, float64(1), accounts["available"])
	require.Equal(t, float64(1), accounts["auto_disabled"]) // a legacy "error" reads as auto-disabled

	self := f.get(f.user, "/me/usage/overview?tz=UTC", 200)["data"].(map[string]any)
	require.Equal(t, float64(1), self["last_5m"].(map[string]any)["requests"])
	require.Contains(t, self, "api_keys")
	require.NotContains(t, self, "users")
}

// The CSV export: BOM, header language, formula-safe cells, operator-only
// columns, the self view's own rows only, and an audit row.
func TestUsageExport(t *testing.T) {
	f := newFixture(t)
	a, b, other := f.record("exp-1", false), f.record("exp-2", false), f.record("exp-3", false)
	a.Model = "=HYPERLINK(\"x\")"
	b.CreatedAt = a.CreatedAt.Add(time.Second)
	other.UserID = f.other
	f.svc.process(t.Context(), []*core.UsageRecord{a, b, other})

	get := func(path string) string {
		req := httptest.NewRequest("GET", "/api/v1"+path, nil)
		req.Header.Set("Authorization", "Bearer "+strconv.FormatInt(f.user, 10))
		w := httptest.NewRecorder()
		f.h.ServeHTTP(w, req)
		require.Equal(t, 200, w.Code, w.Body.String())
		require.Contains(t, w.Header().Get("Content-Disposition"), "attachment")
		return w.Body.String()
	}
	mine := get("/me/usage/export?lang=zh&tz=Asia/Shanghai&from=2026-09-20T00:00:00Z")
	require.True(t, strings.HasPrefix(mine, "\xef\xbb\xbf时间,请求 ID"), mine[:40])
	lines := strings.Split(strings.TrimSpace(mine), "\n")
	require.Len(t, lines, 3) // header + the caller's two rows, newest first
	require.Contains(t, lines[1], "exp-2")
	require.Contains(t, mine, `"'=HYPERLINK(""x"")"`)
	require.NotContains(t, lines[0], "账号")
	require.NotContains(t, mine, "exp-3")

	all := get("/usage/export?lang=en&from=2026-09-20T00:00:00Z")
	require.Contains(t, strings.SplitN(all, "\n", 2)[0], "Account")
	require.Len(t, strings.Split(strings.TrimSpace(all), "\n"), 4)

	f.get(f.user, "/me/usage/export?lang=fr", 400)
	require.Equal(t, "2", f.scalar(`SELECT count(*)::text FROM audit_logs WHERE action = 'usage.export'`))
}

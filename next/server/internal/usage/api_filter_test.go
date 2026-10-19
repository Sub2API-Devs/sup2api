package usage

import (
	"net/http/httptest"
	"strconv"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/gin-gonic/gin"
)

func TestParseFilterClientRequestID(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)
	for _, self := range []*int64{nil, new(int64)} {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest("GET", "/usage?client_request_id=abc-123&request_id=r1", nil)
		f, err := parseFilter(c, self)
		if err != nil {
			t.Fatal(err)
		}
		sql := f.sql()
		if !strings.Contains(sql, "u.client_request_id = $") || !strings.Contains(sql, "u.request_id = $") {
			t.Fatalf("self=%v sql: %s", self != nil, sql)
		}
		found := false
		for _, a := range f.args {
			if a == "abc-123" {
				found = true
			}
		}
		if !found {
			t.Fatalf("args: %v", f.args)
		}
	}
}

func TestParseFilterInvalidSearch(t *testing.T) {
	for _, query := range []string{"status_code=oops", "status_code=600", "status_code=-1", "stream=maybe", "client_ip=not-an-ip", "api_key_id=-1", "from=2026-10-02T00:00:00Z&to=2026-10-01T00:00:00Z"} {
		t.Run(query, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("GET", "/usage?"+query, nil)
			_, err := parseFilter(c, nil)
			require.Error(t, err)
		})
	}
}

func TestUsageSearchListSummaryAndPrivacy(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()
	var keyID, accountID int64
	require.NoError(t, f.db.Pool.QueryRow(ctx, `INSERT INTO api_keys(user_id,group_id,name,key_prefix,key_hash) VALUES($1,$2,'Team_100%','masked','never-return-secret') RETURNING id`, f.user, f.group).Scan(&keyID))
	require.NoError(t, f.db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES('Search Account','anthropic','apikey','') RETURNING id`).Scan(&accountID))
	mine := f.record("search-mine", false)
	mine.APIKeyID, mine.AccountID, mine.ClientIP, mine.UserAgent, mine.NodeID = keyID, &accountID, "192.0.2.9", "test-client", "node-search"
	mine.Stream, mine.Model = true, "model_100%"
	other := f.record("search-other", false)
	other.UserID, other.ClientIP, other.Model = f.other, "192.0.2.10", "modelX100Y"
	require.NoError(t, f.db.Pool.QueryRow(ctx, `INSERT INTO api_keys(user_id,group_id,name,key_prefix,key_hash) VALUES($1,$2,'TeamX100Y','masked','other-hash') RETURNING id`, f.other, f.group).Scan(&other.APIKeyID))
	f.svc.process(ctx, []*core.UsageRecord{mine, other})
	queries := []string{"api_key_name=team_100%25", "client_ip=192.0.2.9", "model_contains=_100%25", "stream=true", "account_name=Search", "user_email=u%40example.com", "node_id=node-search"}
	for _, query := range queries {
		list := f.get(f.user, "/usage?"+query, 200)
		items := list["data"].([]any)
		require.Len(t, items, 1, query)
		row := items[0].(map[string]any)
		require.Equal(t, "search-mine", row["request_id"])
		require.Equal(t, "192.0.2.9", row["client_ip"])
		require.Equal(t, "Team_100%", row["api_key_name"])
		require.NotContains(t, row, "key_hash")
		require.NotContains(t, row, "key")
		summary := f.get(f.user, "/usage/summary?from=2026-09-01T00:00:00Z&"+query, 200)["data"].([]any)
		require.Len(t, summary, 1, query)
		require.Equal(t, float64(1), summary[0].(map[string]any)["requests"])
		cursor := f.get(f.user, "/usage?cursor=&"+query, 200)["data"].([]any)
		require.Len(t, cursor, 1)
	}
	for _, path := range []string{"/me/usage?client_ip=192.0.2.10", "/me/usage?api_key_name=other", "/usage?model_contains=%25missing", "/usage?status_code=403"} {
		require.Empty(t, f.get(f.user, path, 200)["data"])
	}
	self := f.get(f.user, "/me/usage?client_ip=192.0.2.9&user_id="+strconv.FormatInt(f.other, 10), 200)["data"].([]any)
	require.Len(t, self, 1)
	row := self[0].(map[string]any)
	require.Nil(t, row["account_id"])
	detail := f.get(f.user, "/me/usage/"+strconv.FormatInt(int64(row["id"].(float64)), 10), 200)["data"].(map[string]any)
	require.Equal(t, "192.0.2.9", detail["client_ip"])
	require.Equal(t, "test-client", detail["user_agent"])
	require.Empty(t, detail["node_id"])
}

func TestUsageSummaryByClientIP(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()
	var recs []*core.UsageRecord
	for i, ip := range []string{"192.0.2.1", "192.0.2.2", "192.0.2.2", "192.0.2.2", "192.0.2.3", "192.0.2.3"} {
		r := f.record("ip-"+strconv.Itoa(i), false)
		r.ClientIP = ip
		recs = append(recs, r)
	}
	other := f.record("ip-other", false)
	other.UserID, other.ClientIP = f.other, "198.51.100.1"
	f.svc.process(ctx, append(recs, other))

	rows := f.get(f.user, "/usage/summary?group_by=ip&from=2026-09-01T00:00:00Z", 200)["data"].([]any)
	keys := []string{}
	for _, r := range rows {
		m := r.(map[string]any)
		keys = append(keys, m["key"].(string))
		require.NotEmpty(t, m["last_at"])
	}
	require.Equal(t, []string{"192.0.2.2", "192.0.2.3", "192.0.2.1", "198.51.100.1"}, keys) // busiest first
	require.Equal(t, float64(3), rows[0].(map[string]any)["requests"])

	mine := f.get(f.user, "/me/usage/summary?group_by=ip&from=2026-09-01T00:00:00Z", 200)["data"].([]any)
	require.Len(t, mine, 3)
	for _, r := range mine {
		require.NotEqual(t, "198.51.100.1", r.(map[string]any)["key"])
	}
	days := f.get(f.user, "/usage/summary?group_by=day&from=2026-09-01T00:00:00Z", 200)["data"].([]any)
	require.NotContains(t, days[0].(map[string]any), "last_at")
}

func TestUsageSummaryPromptTokens(t *testing.T) {
	f := newFixture(t)
	for _, tc := range []struct {
		id        string
		semantics string
		tokens    core.UsageTokens
		billable  bool
		legacy    bool
		prompt    any
	}{
		{"exclusive", "exclusive", core.UsageTokens{CacheRead: 100, CacheCreation: 700, CacheCreation1h: 200}, false, false, float64(1000)},
		{"inclusive", "inclusive", core.UsageTokens{Input: 1000, CacheRead: 100, CacheCreation: 700, CacheCreation1h: 200}, false, false, float64(1000)},
		{"billed", "inclusive", core.UsageTokens{Input: 1000, CacheRead: 100}, true, false, float64(1000)},
		{"default", "", core.UsageTokens{Input: 20, CacheRead: 80}, false, false, float64(100)},
		{"legacy-cached", "exclusive", core.UsageTokens{CacheRead: 100, CacheCreation: 900}, false, true, nil},
		{"legacy-uncached", "inclusive", core.UsageTokens{Input: 100}, false, true, float64(100)},
	} {
		r := f.record(tc.id, tc.billable)
		r.UsageSemantics, r.Tokens = tc.semantics, tc.tokens
		r.ClientIP = "192.0.2.1"
		// Free records must not start storing request pricing metadata.
		r.PriceParams = map[string]string{"test-param": "private"}
		r.PriceHeaders = map[string]string{"test-header": "private"}
		f.svc.process(t.Context(), []*core.UsageRecord{r})
		if tc.legacy {
			_, err := f.db.Pool.Exec(t.Context(), `UPDATE usage_logs SET billing_detail = '{}' WHERE request_id = $1`, tc.id)
			require.NoError(t, err)
		} else if !tc.billable {
			detail := f.scalar(`SELECT billing_detail::text FROM usage_logs WHERE request_id = $1`, tc.id)
			require.NotContains(t, detail, "private")
		}
		for _, prefix := range []string{"/usage", "/me/usage"} {
			for _, by := range []string{"day", "model", "ip"} {
				rows := f.get(f.user, prefix+"/summary?from=2026-09-01T00:00:00Z&group_by="+by+"&request_id="+tc.id, 200)["data"].([]any)
				require.Len(t, rows, 1)
				require.Equal(t, tc.prompt, rows[0].(map[string]any)["prompt_tokens"], tc.id+" "+by)
			}
		}
	}
	// Mixed semantics are normalized before summing. Unknown cached history
	// must not silently disappear from the denominator of the entire group.
	all := f.get(f.user, "/usage/summary?from=2026-09-01T00:00:00Z", 200)["data"].([]any)
	require.Nil(t, all[0].(map[string]any)["prompt_tokens"])
	_, err := f.db.Pool.Exec(t.Context(), `DELETE FROM usage_logs WHERE request_id = 'legacy-cached'`)
	require.NoError(t, err)
	all = f.get(f.user, "/usage/summary?from=2026-09-01T00:00:00Z", 200)["data"].([]any)
	require.Equal(t, float64(3200), all[0].(map[string]any)["prompt_tokens"])
}

func TestTruncClientRequestID(t *testing.T) {
	t.Parallel()
	long := strings.Repeat("x", 127) + "界界"
	got := trunc(long, 128)
	if len(got) != 127 || got != strings.Repeat("x", 127) {
		t.Fatalf("trunc = %q (%d)", got, len(got))
	}
	if trunc("short", 128) != "short" {
		t.Fatal("short")
	}
}

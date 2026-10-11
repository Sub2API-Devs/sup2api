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

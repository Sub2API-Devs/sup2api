package usage

import (
	"encoding/json"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// request_id matches our request ID or the client's X-Request-Id;
// client_request_id stays an exact match on the client's alone.
func TestParseFilterRequestIDs(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)
	since := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	cases := []struct {
		name, query string
		conds       []string
		args        []any
	}{
		{"request_id", "request_id=r1&from=2026-09-01T00:00:00Z", []string{"(u.request_id = $1 OR u.client_request_id = $2)", "u.created_at >= $3"}, []any{"r1", "r1", since}},
		{"request_id without range", "request_id=r1", []string{"u.request_id = $1"}, []any{"r1"}},
		{"client_request_id", "client_request_id=abc-123", []string{"u.client_request_id = $1"}, []any{"abc-123"}},
		{"both", "client_request_id=abc-123&request_id=r1&from=2026-09-01T00:00:00Z",
			[]string{"u.client_request_id = $1", "(u.request_id = $2 OR u.client_request_id = $3)", "u.created_at >= $4"}, []any{"abc-123", "r1", "r1", since}},
		{"neither", "model=m", []string{"u.model = $1"}, []any{"m"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("GET", "/usage?"+tc.query, nil)
			f, err := parseFilter(c, nil, true)
			require.NoError(t, err)
			require.Equal(t, " WHERE "+strings.Join(tc.conds, " AND "), f.Cond())
			require.Equal(t, tc.args, f.Args())
		})
	}
	// A user's own search keeps its user condition first and the same match.
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("GET", "/me/usage?request_id=r1&from=2026-09-01T00:00:00Z", nil)
	f, err := parseFilter(c, new(int64), false)
	require.NoError(t, err)
	require.Equal(t, " WHERE u.user_id = $1 AND (u.request_id = $2 OR u.client_request_id = $3) AND u.created_at >= $4", f.Cond())
}

// The usage list, summary and export find a row by either request ID; a
// user still sees only their own rows, and client_request_id never matches
// our request ID.
func TestUsageSearchByRequestID(t *testing.T) {
	f := newFixture(t)
	a := f.record("rid-a", false)
	a.ClientRequestID = "cli-shared"
	b := f.record("rid-b", false)
	b.ClientRequestID = "rid-a" // a client ID that happens to equal another row's ID
	c := f.record("rid-c", false)
	c.UserID, c.ClientRequestID = f.other, "cli-shared"
	f.svc.process(t.Context(), []*core.UsageRecord{a, b, c})

	cases := []struct {
		path, query string
		want        []string
	}{
		{"/usage", "request_id=rid-c", []string{"rid-c"}},
		{"/usage", "request_id=rid-a", []string{"rid-a", "rid-b"}},
		{"/usage", "request_id=cli-shared", []string{"rid-a", "rid-c"}},
		{"/me/usage", "request_id=cli-shared", []string{"rid-a"}},
		{"/me/usage", "request_id=rid-c", nil},
		{"/usage", "request_id=missing", nil},
		{"/usage", "client_request_id=cli-shared", []string{"rid-a", "rid-c"}},
		{"/usage", "client_request_id=rid-c", nil},
		{"/usage", "client_request_id=rid-a&request_id=rid-a", []string{"rid-b"}},
	}
	// Without a time range the unindexed client half is left out: only our request_id matches.
	t.Run("no range matches request_id only", func(t *testing.T) {
		var got []string
		for _, r := range f.get(f.user, "/usage?request_id=cli-shared", 200)["data"].([]any) {
			got = append(got, r.(map[string]any)["request_id"].(string))
		}
		require.Empty(t, got)
	})
	for _, tc := range cases {
		t.Run(tc.path+"?"+tc.query, func(t *testing.T) {
			var got []string
			for _, r := range f.get(f.user, tc.path+"?from=2026-09-01T00:00:00Z&"+tc.query, 200)["data"].([]any) {
				got = append(got, r.(map[string]any)["request_id"].(string))
			}
			require.ElementsMatch(t, tc.want, got)

			requests := 0.0
			for _, r := range f.get(f.user, tc.path+"/summary?group_by=none&from=2026-09-01T00:00:00Z&"+tc.query, 200)["data"].([]any) {
				requests += r.(map[string]any)["requests"].(float64)
			}
			require.Equal(t, float64(len(tc.want)), requests)

			req := httptest.NewRequest("GET", "/api/v1"+tc.path+"/export?lang=en&from=2026-09-01T00:00:00Z&"+tc.query, nil)
			req.Header.Set("Authorization", "Bearer "+strconv.FormatInt(f.user, 10))
			w := httptest.NewRecorder()
			f.h.ServeHTTP(w, req)
			require.Equal(t, 200, w.Code, w.Body.String())
			require.Len(t, strings.Split(strings.TrimSpace(w.Body.String()), "\n"), 1+len(tc.want)) // header + rows
		})
	}
}

func TestParseFilterInvalidSearch(t *testing.T) {
	for _, query := range []string{"status_code=oops", "status_code=600", "status_code=-1", "stream=maybe", "retried=maybe", "client_ip=not-an-ip", "api_key_id=-1", "from=2026-10-02T00:00:00Z&to=2026-10-01T00:00:00Z"} {
		t.Run(query, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("GET", "/usage?"+query, nil)
			_, err := parseFilter(c, nil, true)
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

// group_by=api_key gives the API key list its per-key requests and cost; the
// caller's own summary never counts another user's keys.
func TestUsageSummaryByAPIKey(t *testing.T) {
	f := newFixture(t)
	var recs []*core.UsageRecord
	for i, key := range []int64{1, 2, 2} {
		r := f.record("key-"+strconv.Itoa(i), false)
		r.APIKeyID = key
		recs = append(recs, r)
	}
	other := f.record("key-other", false)
	other.UserID, other.APIKeyID = f.other, 3
	f.svc.process(t.Context(), append(recs, other))

	requests := map[string]float64{}
	for _, r := range f.get(f.user, "/me/usage/summary?group_by=api_key&from=2026-09-01T00:00:00Z", 200)["data"].([]any) {
		m := r.(map[string]any)
		requests[m["key"].(string)] = m["requests"].(float64)
	}
	require.Equal(t, map[string]float64{"1": 1, "2": 2}, requests)
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
			for _, by := range []string{"day", "model", "ip", "protocol"} {
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

// The CCGateway request log of a row stays reachable for an operator with
// settings:read but without account:read: request_log_account_id carries the
// account the log is filed under while account_id stays hidden.
func TestRequestLogAccountWithoutAccountRead(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()
	var accountID int64
	require.NoError(t, f.db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES('CCG Account','ccgateway','oauth','') RETURNING id`).Scan(&accountID))
	rec := f.record("ccg-log", false)
	rec.PluginKey, rec.AccountID = "ccgateway", &accountID
	f.svc.process(ctx, []*core.UsageRecord{rec})
	path := "/usage/" + f.scalar(`SELECT id::text FROM usage_logs WHERE request_id = 'ccg-log'`)

	d := f.get(f.user, path, 200)["data"].(map[string]any)
	require.Equal(t, float64(accountID), d["account_id"])
	require.Equal(t, float64(accountID), d["request_log_account_id"])

	f.svc.Authz = denyPerms{keys: []string{"account:read"}}
	d = f.get(f.user, path, 200)["data"].(map[string]any)
	require.Nil(t, d["account_id"])
	require.NotContains(t, d, "account_name")
	require.Equal(t, float64(accountID), d["request_log_account_id"])

	f.svc.Authz = denyPerms{keys: []string{"account:read", "settings:read"}}
	d = f.get(f.user, path, 200)["data"].(map[string]any)
	require.Nil(t, d["account_id"])
	require.NotContains(t, d, "request_log_account_id")
}

// Self-service views hide upstream fields but keep the recorded error
// message as is, 5xx included (user rule, 2026-11-02).
func TestHideUpstreamKeepsErrorMessage(t *testing.T) {
	t.Parallel()
	id := int64(9)
	r := Record{AccountID: &id, AccountName: "acc", AccountType: "managed", UpstreamModel: "m", StatusCode: 503,
		ErrorType: "model_availability", ErrorMessage: "model availability could not be verified, please retry later"}
	r.hideUpstream()
	require.Nil(t, r.AccountID)
	require.Empty(t, r.AccountName)
	require.Empty(t, r.AccountType)
	require.Empty(t, r.UpstreamModel)
	require.Equal(t, "model availability could not be verified, please retry later", r.ErrorMessage)
}

// usage_logs.conversion (CONTRACTS §88): written as recorded, NULL when
// native, filtered by grade or loss, hidden from self-service views.
func TestUsageConversionTraceAndFilter(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()
	native := f.record("conv-native", false)
	fair := f.record("conv-fair", false)
	fair.Conversion = &core.ConversionTrace{V: 1, Grade: "fair", Hops: []string{"openai.chat", "anthropic.messages"},
		Policy: "allow", Lost: map[string][]string{"other": {"top_k"}}}
	refused := f.record("conv-refused", false)
	refused.Conversion = &core.ConversionTrace{V: 1, Grade: "native", Rejected: []core.ConversionRejection{{Type: "p/k", Policy: "safe", Category: "tool", Path: "tools[0]"}}}
	f.svc.process(ctx, []*core.UsageRecord{native, fair, refused})

	ids := func(query string) []string {
		var out []string
		for _, r := range f.get(f.user, "/usage?"+query, 200)["data"].([]any) {
			out = append(out, r.(map[string]any)["request_id"].(string))
		}
		return out
	}
	require.ElementsMatch(t, []string{"conv-native", "conv-refused"}, ids("conversion=native"))
	require.Equal(t, []string{"conv-fair"}, ids("conversion=converted"))
	require.Equal(t, []string{"conv-fair"}, ids("conversion=fair"))
	require.Equal(t, []string{"conv-fair"}, ids("conversion=lossy"))
	require.Empty(t, ids("conversion=local"))
	f.get(f.user, "/usage?conversion=bogus", 400)

	row := f.get(f.user, "/usage?request_id=conv-fair", 200)["data"].([]any)[0].(map[string]any)
	conv := row["conversion"].(map[string]any)
	require.Equal(t, "fair", conv["grade"])
	require.Equal(t, map[string]any{"other": []any{"top_k"}}, conv["lost"])
	require.Nil(t, f.get(f.user, "/usage?request_id=conv-native", 200)["data"].([]any)[0].(map[string]any)["conversion"])
	mine := f.get(f.user, "/me/usage?request_id=conv-fair", 200)["data"].([]any)[0].(map[string]any)
	require.Nil(t, mine["conversion"])
	detail := f.get(f.user, "/usage/"+strconv.FormatInt(int64(row["id"].(float64)), 10), 200)["data"].(map[string]any)
	require.Equal(t, "allow", detail["conversion"].(map[string]any)["policy"])
}

// The attempt trail of a retried request (CONTRACTS §98): every view gets it,
// shaped for the caller - ids for an operator who may read accounts, names
// only in the detail, numbered accounts without account:read, outcomes alone
// for the owner. A request sent once and a row from before the trail have
// none; retried= filters the list, the summary and the export, and the
// trail is no anomaly.
func TestUsageAttemptTrail(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()
	var a1, a2 int64
	require.NoError(t, f.db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES('Trail One','anthropic','apikey','') RETURNING id`).Scan(&a1))
	require.NoError(t, f.db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES('Trail Two','anthropic','apikey','') RETURNING id`).Scan(&a2))
	retried := f.record("trail-retried", false)
	retried.Attempts, retried.AccountID = 3, &a2
	retried.AttemptTrail = &core.AttemptTrail{V: 1, Steps: []core.AttemptStep{
		{AccountID: a1, Status: 502, ErrorType: "upstream_error", Ms: 640, Message: "upstream connect error", Next: core.AttemptSame},
		{AccountID: a1, Status: 502, ErrorType: "upstream_error", Ms: 702, Message: "upstream connect error", Next: core.AttemptSwitch},
		{AccountID: a2, Status: 200, Ms: 2950},
	}}
	once := f.record("trail-once", false)
	old := f.record("trail-old", false)
	old.Attempts = 2
	f.svc.process(ctx, []*core.UsageRecord{retried, once, old})
	require.Equal(t, "null", f.scalar(`SELECT COALESCE(anomalies->'attempts', 'null'::jsonb)::text FROM usage_logs WHERE request_id='trail-once'`))

	row := func(path, rid string) map[string]any {
		for _, r := range f.get(f.user, path, 200)["data"].([]any) {
			if m := r.(map[string]any); m["request_id"] == rid {
				return m
			}
		}
		t.Fatalf("%s: no %s", path, rid)
		return nil
	}
	steps := func(v any) []any {
		require.IsType(t, map[string]any{}, v)
		return v.(map[string]any)["steps"].([]any)
	}
	id := f.scalar(`SELECT id::text FROM usage_logs WHERE request_id='trail-retried'`)

	// An operator with account:read: as stored in the list, named in the detail.
	list := steps(row("/usage", "trail-retried")["attempt_trail"])
	require.Len(t, list, 3)
	require.Equal(t, map[string]any{"account_id": float64(a1), "status": float64(502), "error_type": "upstream_error", "ms": float64(640),
		"message": "upstream connect error", "next": "same"}, list[0])
	require.Equal(t, map[string]any{"account_id": float64(a2), "status": float64(200), "ms": float64(2950)}, list[2])
	require.Nil(t, row("/usage", "trail-once")["attempt_trail"])
	require.Nil(t, row("/usage", "trail-old")["attempt_trail"], "a row from before the trail")
	d := f.get(f.user, "/usage/"+id, 200)["data"].(map[string]any)
	detail := steps(d["attempt_trail"])
	require.Equal(t, "Trail One", detail[0].(map[string]any)["account_name"])
	require.Equal(t, "Trail Two", detail[2].(map[string]any)["account_name"])
	require.NotContains(t, d["anomalies"], core.AnomalyAttempts, "served as attempt_trail")

	// The owner: each attempt's outcome and time, nothing of the accounts.
	for _, v := range []any{row("/me/usage", "trail-retried")["attempt_trail"], f.get(f.user, "/me/usage/"+id, 200)["data"].(map[string]any)["attempt_trail"]} {
		self := steps(v)
		require.Len(t, self, 3)
		require.Equal(t, map[string]any{"status": float64(502), "error_type": "upstream_error", "ms": float64(640)}, self[0])
		require.Equal(t, map[string]any{"status": float64(200), "ms": float64(2950)}, self[2])
	}

	// An operator without account:read: the same account keeps one number.
	f.svc.Authz = denyPerms{keys: []string{"account:read"}}
	for _, v := range []any{row("/usage", "trail-retried")["attempt_trail"], f.get(f.user, "/usage/"+id, 200)["data"].(map[string]any)["attempt_trail"]} {
		refs := steps(v)
		require.Equal(t, map[string]any{"account_ref": float64(1), "status": float64(502), "error_type": "upstream_error", "ms": float64(702),
			"message": "upstream connect error", "next": "switch"}, refs[1])
		require.Equal(t, map[string]any{"account_ref": float64(2), "status": float64(200), "ms": float64(2950)}, refs[2])
	}

	// retried= in the list, the summary and the export, for everyone.
	export := func(uid int64, path string) []string {
		req := httptest.NewRequest("GET", "/api/v1"+path, nil)
		req.Header.Set("Authorization", "Bearer "+strconv.FormatInt(uid, 10))
		w := httptest.NewRecorder()
		f.h.ServeHTTP(w, req)
		require.Equal(t, 200, w.Code, w.Body.String())
		return strings.Split(strings.TrimSpace(strings.TrimPrefix(w.Body.String(), "\uFEFF")), "\n")
	}
	for _, path := range []string{"/usage", "/me/usage"} {
		for q, want := range map[string]int{"retried=true": 2, "retried=false": 1, "retried=": 3} {
			require.Len(t, f.get(f.user, path+"?"+q, 200)["data"], want, path+"?"+q)
			sum := f.get(f.user, path+"/summary?group_by=none&from=2026-09-01T00:00:00Z&"+q, 200)["data"].([]any)
			require.Equal(t, float64(want), sum[0].(map[string]any)["requests"], path+"/summary?"+q)
			require.Len(t, export(f.user, path+"/export?lang=en&"+q), 1+want, path+"/export?"+q)
		}
		f.get(f.user, path+"?retried=maybe", 400)
	}
	sum := f.get(f.user, "/usage/summary?group_by=none&from=2026-09-01T00:00:00Z", 200)["data"].([]any)
	require.Equal(t, float64(0), sum[0].(map[string]any)["anomalies"], "a trace is not an anomaly")

	// The export's call chain: numbered accounts here, then ids, then the
	// count for the owner and for the row from before the trail.
	chain := func(lines []string) string {
		cells := strings.Split(lines[1], ",")
		return cells[len(cells)-1]
	}
	lines := export(f.user, "/usage/export?lang=zh&request_id=trail-retried")
	require.True(t, strings.HasSuffix(lines[0], ",调用链路"), lines[0])
	require.Equal(t, "账号1×2 → 账号2", chain(lines))
	f.svc.Authz = allowAll{}
	require.Equal(t, "#"+strconv.FormatInt(a1, 10)+"×2 → #"+strconv.FormatInt(a2, 10), chain(export(f.user, "/usage/export?lang=en&request_id=trail-retried")))
	require.Equal(t, "2 attempts", chain(export(f.user, "/usage/export?lang=en&request_id=trail-old")))
	require.Equal(t, "", chain(export(f.user, "/usage/export?lang=en&request_id=trail-once")))
	require.Equal(t, "3 次", chain(export(f.user, "/me/usage/export?lang=zh&request_id=trail-retried")))
}

// A stored trail that cannot be read is dropped, whoever reads it.
func TestShapeTrailDropsUnreadable(t *testing.T) {
	t.Parallel()
	for _, view := range []trailView{trailAccounts, trailRefs, trailSelf} {
		r := Record{AttemptTrail: json.RawMessage(`{"steps":[{"account_id":5`)}
		require.Nil(t, r.shapeTrail(view))
		require.Nil(t, r.AttemptTrail)
	}
}

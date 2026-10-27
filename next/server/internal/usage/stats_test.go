package usage

import (
	"strconv"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Day and hour buckets follow tz (CONTRACTS §66): 00:30 in Shanghai is the
// previous UTC day.
func TestSummaryTimeZoneBuckets(t *testing.T) {
	f := newFixture(t)
	r := f.record("tz-1", false)
	r.CreatedAt = time.Date(2026, 9, 23, 16, 30, 0, 0, time.UTC) // 2026-09-24 00:30 +08:00
	f.svc.process(t.Context(), []*core.UsageRecord{r})

	key := func(path string) string {
		rows := f.get(f.user, path, 200)["data"].([]any)
		require.Len(t, rows, 1, path)
		return rows[0].(map[string]any)["key"].(string)
	}
	from := "&from=2026-09-20T00:00:00Z&to=2026-09-30T00:00:00Z"
	require.Equal(t, "2026-09-23", key("/me/usage/summary?group_by=day"+from))
	require.Equal(t, "2026-09-24", key("/me/usage/summary?group_by=day&tz=Asia/Shanghai"+from))
	require.Equal(t, "2026-09-23 16:00", key("/usage/summary?group_by=hour"+from))
	require.Equal(t, "2026-09-24 00:00", key("/usage/summary?group_by=hour&tz=Asia/Shanghai"+from))
	require.Equal(t, "2026-09-23", key("/me/usage/summary?group_by=day&tz=America/New_York"+from))

	for _, q := range []string{"tz=Mars/Base", "tz=Local", "tz=%27%3B+drop", "tz=a/../c"} {
		f.get(f.user, "/me/usage/summary?group_by=day&"+q+from, 400)
	}
	f.get(f.user, "/me/usage/summary?group_by=hour&from=2026-08-01T00:00:00Z&to=2026-09-30T00:00:00Z", 400)
	f.get(f.user, "/me/usage/summary?group_by=user"+from, 400)
}

// group_by=none is always one row, zeros when nothing matched; the new
// columns: total tokens, the cost before the multiplier, average times over
// the successful requests.
func TestSummaryNoneStandardCostAndLatency(t *testing.T) {
	f := newFixture(t)
	empty := f.get(f.user, "/me/usage/summary?group_by=none&from=2026-09-20T00:00:00Z", 200)["data"].([]any)
	require.Len(t, empty, 1)
	require.Equal(t, "", empty[0].(map[string]any)["key"])
	require.Equal(t, float64(0), empty[0].(map[string]any)["requests"])

	a := f.record("std-a", true)
	a.RateMultiplier = decimal.RequireFromString("0.8")
	a.LatencyMs, a.FirstTokenMs = 1000, 200
	b := f.record("std-b", false)
	b.LatencyMs, b.FirstTokenMs = 3000, 400
	failed := f.record("std-failed", false)
	failed.Success, failed.StatusCode, failed.LatencyMs, failed.FirstTokenMs = false, 529, 60000, 0
	f.svc.process(t.Context(), []*core.UsageRecord{a, b, failed})

	row := f.get(f.user, "/me/usage/summary?group_by=none&from=2026-09-20T00:00:00Z", 200)["data"].([]any)[0].(map[string]any)
	require.Equal(t, float64(3), row["requests"])
	require.Equal(t, float64(2), row["success"])
	require.Equal(t, float64(2000), row["latency_ms_avg"])
	require.Equal(t, float64(300), row["first_token_ms_avg"])
	require.Equal(t, float64(3*(100000+2000+80000)), row["total_tokens"])
	total := decimal.RequireFromString(row["total_cost"].(string))
	std := decimal.RequireFromString(row["standard_cost"].(string))
	require.True(t, total.IsPositive())
	require.True(t, std.Mul(decimal.RequireFromString("0.8")).Sub(total).Abs().LessThan(decimal.New(1, -7)), "std %s total %s", std, total)

	groups := f.get(f.user, "/me/usage/summary?group_by=group&from=2026-09-20T00:00:00Z", 200)["data"].([]any)
	require.Len(t, groups, 1)
	require.Equal(t, "default", groups[0].(map[string]any)["key"])
	for _, by := range []string{"endpoint", "platform"} {
		rows := f.get(f.user, "/me/usage/summary?group_by="+by+"&from=2026-09-20T00:00:00Z", 200)["data"].([]any)
		require.Len(t, rows, 1, by)
	}
}

// The overview's windows: today and yesterday are calendar days in tz, the
// last 30 days and 5 minutes are relative; another user's rows and keys do
// not count.
func TestMyOverview(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()
	loc, _ := time.LoadLocation("Asia/Shanghai")
	now := time.Now()
	w := overviewWindows(now, loc)
	at := func(id string, ts time.Time, user int64) *core.UsageRecord {
		r := f.record(id, false)
		r.CreatedAt, r.UserID = ts, user
		return r
	}
	f.svc.process(ctx, []*core.UsageRecord{
		at("ov-now", now.Add(-time.Minute), f.user),
		at("ov-today", w.today.Add(time.Second), f.user),
		at("ov-yesterday", w.yesterday.Add(time.Hour), f.user),
		at("ov-10d", now.AddDate(0, 0, -10), f.user),
		at("ov-40d", now.AddDate(0, 0, -40), f.user),
		at("ov-other", now.Add(-time.Minute), f.other),
	})
	for i, status := range []string{"active", "active", "disabled"} {
		_, err := f.db.Pool.Exec(ctx, `INSERT INTO api_keys(user_id,group_id,name,key_prefix,key_hash,status) VALUES($1,$2,$3,'p',$4,$5)`,
			f.user, f.group, "k"+strconv.Itoa(i), "hash-ov-"+strconv.Itoa(i), status)
		require.NoError(t, err)
	}
	_, err := f.db.Pool.Exec(ctx, `INSERT INTO api_keys(user_id,group_id,name,key_prefix,key_hash,expires_at) VALUES($1,$2,'expired','p','hash-ov-exp',now()-interval '1 hour')`, f.user, f.group)
	require.NoError(t, err)
	_, err = f.db.Pool.Exec(ctx, `INSERT INTO api_keys(user_id,group_id,name,key_prefix,key_hash,deleted_at) VALUES($1,$2,'gone','p','hash-ov-del',now())`, f.user, f.group)
	require.NoError(t, err)

	ov := f.get(f.user, "/me/usage/overview?tz=Asia/Shanghai", 200)["data"].(map[string]any)
	n := func(window, field string) float64 { return ov[window].(map[string]any)[field].(float64) }
	// Right after midnight the row of a minute ago is yesterday's.
	today, yesterday := float64(2), float64(1)
	if now.Add(-time.Minute).Before(w.today) {
		today, yesterday = 1, 2
	}
	require.Equal(t, "Asia/Shanghai", ov["tz"])
	require.Equal(t, today, n("today", "requests"))
	require.Equal(t, yesterday, n("yesterday", "requests"))
	require.Equal(t, float64(4), n("last_30d", "requests"))
	require.Equal(t, float64(1), n("last_5m", "requests"))
	require.Equal(t, float64(100000+2000+80000), n("last_5m", "tokens"))
	keys := ov["api_keys"].(map[string]any)
	require.Equal(t, float64(4), keys["total"])
	require.Equal(t, float64(2), keys["active"])

	f.get(f.user, "/me/usage/overview?tz=Nowhere/City", 400)
}

func TestOverviewWindowsDST(t *testing.T) {
	ny, _ := time.LoadLocation("America/New_York")
	// 2026-11-01 is the end of DST in New York: that day lasts 25 hours.
	w := overviewWindows(time.Date(2026, 11, 2, 12, 0, 0, 0, ny), ny)
	require.Equal(t, time.Date(2026, 11, 2, 0, 0, 0, 0, ny), w.today)
	require.Equal(t, 25*time.Hour, w.today.Sub(w.yesterday))
}

package usage

import (
	"encoding/json"
	"fmt"
	"net/url"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// rollupRow is one usage_logs row of the rollup tests.
type rollupRow struct {
	age                       time.Duration // before now
	user                      int64
	model, protocol, platform string
	success                   bool
	in, out, cacheRead        int64
	semantics                 string // billing_detail inputs.semantics; "" leaves it out
	cost, multiplier          string
	anomalies                 string
	latency, firstToken       int
}

func (f *fixture) insertRollupRows(now time.Time, prefix string, rows []rollupRow) {
	f.t.Helper()
	for i, r := range rows {
		detail := `{}`
		if r.semantics != "" {
			detail = `{"inputs": {"semantics": "` + r.semantics + `"}}`
		}
		_, err := f.db.Pool.Exec(f.t.Context(), `INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, account_id,
			platform, protocol, endpoint, model, upstream_model, status_code, success, input_tokens, output_tokens, cache_read_tokens,
			billing_detail, total_cost, rate_multiplier, anomalies, latency_ms, first_token_ms, client_ip, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, '/v1/messages', $8::text, $8::text || '-up', 200, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
			fmt.Sprintf("%s-%d", prefix, i), r.user, r.user*10, f.group, r.user*100, r.platform, r.protocol, r.model, r.success,
			r.in, r.out, r.cacheRead, detail, r.cost, r.multiplier, r.anomalies, r.latency, r.firstToken,
			fmt.Sprintf("10.0.0.%d", i%3), now.Add(-r.age))
		require.NoError(f.t, err)
	}
}

// rollupRows spans the live part (the last half hour and the current hour),
// sealed hours of today and yesterday and days of the history, with every
// measure's cases: failures, cached input with and without semantics, a
// free group, anomalies and estimates, timed and untimed requests.
func (f *fixture) rollupRows() []rollupRow {
	anomalies := []string{`{}`, `{"usage_extract": "plugin"}`, `{"usage_extract": "fallback"}`, `{"reconcile": "estimated"}`,
		`{"reconcile": "retrying"}`, `{"failure_policy": "x", "availability": "y"}`}
	semantics := []string{"", "inclusive", "exclusive", "", "other"}
	var rows []rollupRow
	for i, age := range []time.Duration{2 * time.Minute, 20 * time.Minute, 50 * time.Minute, 2 * time.Hour, 3*time.Hour + 10*time.Minute,
		9 * time.Hour, 26 * time.Hour, 30 * time.Hour, 3 * 24 * time.Hour, 5*24*time.Hour + 7*time.Hour, 12 * 24 * time.Hour, 40 * 24 * time.Hour} {
		for j := range 3 {
			k := i*3 + j
			r := rollupRow{
				age: age + time.Duration(j)*time.Minute, user: []int64{f.user, f.other}[k%2],
				model: []string{"claude-a", "claude-b", "gpt-c"}[k%3], protocol: []string{"anthropic.messages", "openai.chat"}[k%2],
				platform: []string{"anthropic", "openai"}[k%2], success: k%4 != 3,
				in: int64(100 + k), out: int64(10 + k), semantics: semantics[k%len(semantics)],
				cost: fmt.Sprintf("0.%04d", 1000+k*37), multiplier: []string{"1", "0.5", "0"}[k%3],
				anomalies: anomalies[k%len(anomalies)], latency: []int{0, 1200 + k, 800}[k%3], firstToken: []int{300 + k, 0}[k%2],
			}
			if k%3 != 0 {
				r.cacheRead = int64(50 + k)
			}
			rows = append(rows, r)
		}
	}
	return rows
}

// statsJSON reads one statistics answer, re-encoded for comparing.
func (f *fixture) statsJSON(path string) string {
	f.t.Helper()
	b, err := json.Marshal(f.get(f.user, path, 200)["data"])
	require.NoError(f.t, err)
	return string(b)
}

// rollupPaths are the statistics compared, over aligned and unaligned
// ranges, every grouping and the filters the rollup answers and does not.
func rollupPaths(now time.Time, user int64) []string {
	q := func(kv ...string) string {
		v := url.Values{}
		for i := 0; i < len(kv); i += 2 {
			v.Set(kv[i], kv[i+1])
		}
		return v.Encode()
	}
	from := now.Add(-20*24*time.Hour - 17*time.Minute).Format(time.RFC3339)
	to := now.Add(-25*time.Hour + 13*time.Minute).Format(time.RFC3339)
	var paths []string
	for _, g := range []string{"day", "none", "model", "upstream_model", "user", "api_key", "group", "protocol", "platform", "ip", "endpoint"} {
		paths = append(paths,
			"/usage/summary?"+q("group_by", g),
			"/usage/summary?"+q("group_by", g, "tz", "Asia/Shanghai", "from", from),
			"/usage/summary?"+q("group_by", g, "tz", "Asia/Kolkata", "from", from, "to", to),
			"/usage/summary?"+q("group_by", g, "model", "claude-a", "from", from),
			"/usage/summary?"+q("group_by", g, "success", "true"),
		)
		if g != "user" && g != "upstream_model" {
			paths = append(paths, "/me/usage/summary?"+q("group_by", g, "tz", "America/New_York"))
		}
	}
	hourFrom := now.Add(-6 * 24 * time.Hour).Format(time.RFC3339)
	return append(paths,
		"/usage/summary?"+q("group_by", "hour", "tz", "Asia/Shanghai", "from", hourFrom),
		"/usage/summary?"+q("group_by", "hour", "tz", "Asia/Kolkata", "from", hourFrom),
		"/usage/summary?"+q("group_by", "user", "order", "requests", "limit", "1", "user_id", fmt.Sprint(user)),
		"/usage/overview?tz=Asia/Shanghai", "/usage/overview?tz=UTC", "/usage/overview?tz=Asia/Kolkata",
		"/me/usage/overview?tz=Asia/Shanghai",
	)
}

// The statistics answer the same from the rollup as from usage_logs alone,
// after the history is filled in, a sealed row changes, a late row arrives
// and a row goes away (CONTRACTS §66.8).
func TestRollupMatchesLive(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()
	now := time.Now()
	f.insertRollupRows(now, "rollup", f.rollupRows())

	live := func() map[string]string {
		_, err := f.db.Pool.Exec(ctx, `UPDATE usage_hourly_state SET low = NULL, high = NULL`)
		require.NoError(t, err)
		out := map[string]string{}
		for _, p := range rollupPaths(now, f.user) {
			out[p] = f.statsJSON(p)
		}
		return out
	}
	check := func(stage string) {
		t.Helper()
		_, err := f.db.Pool.Exec(ctx, `UPDATE usage_hourly_state SET low = NULL, high = NULL`)
		require.NoError(t, err)
		_, err = f.db.Pool.Exec(ctx, `TRUNCATE usage_hourly, usage_hourly_dirty`)
		require.NoError(t, err)
		want := live()
		for runs := 0; ; runs++ {
			hours, err := f.svc.refreshRollup(ctx)
			require.NoError(t, err)
			if hours == 0 {
				require.Greater(t, runs, 1, stage) // one chunk of history a run
				break
			}
		}
		f.compareRollup(stage, now, want)
	}
	check("history")

	// Which answers come from the rollup: skewing it shows.
	before := map[string]string{}
	for _, p := range rollupPaths(now, f.user) {
		before[p] = f.statsJSON(p)
	}
	_, err := f.db.Pool.Exec(ctx, `UPDATE usage_hourly SET requests = requests + 1000`)
	require.NoError(t, err)
	for _, p := range rollupPaths(now, f.user) {
		u, _ := url.Parse(p)
		q := u.Query()
		g := q.Get("group_by")
		live := g == "ip" || g == "endpoint" || q.Get("success") != "" || (q.Get("tz") == "Asia/Kolkata" && (g == "day" || g == "hour" || u.Path == "/usage/overview"))
		require.Equal(t, live, before[p] == f.statsJSON(p), p)
	}
	_, err = f.db.Pool.Exec(ctx, `UPDATE usage_hourly SET requests = requests - 1000`)
	require.NoError(t, err)

	var low, high time.Time
	require.NoError(t, f.db.Pool.QueryRow(ctx, `SELECT low, high FROM usage_hourly_state`).Scan(&low, &high))
	require.Equal(t, now.Add(-40*24*time.Hour).Truncate(time.Hour), low)
	var sealed time.Time
	require.NoError(t, f.db.Pool.QueryRow(ctx, sealedSQL).Scan(&sealed))
	require.Equal(t, sealed, high)

	// Changes to rolled-up hours mark them; the next refresh recomputes them.
	_, err = f.db.Pool.Exec(ctx, `UPDATE usage_logs SET total_cost = total_cost + 1, success = NOT success
		WHERE request_id IN ('rollup-12', 'rollup-25')`)
	require.NoError(t, err)
	f.insertRollupRows(now, "late", []rollupRow{{age: 26*time.Hour + 5*time.Minute, user: f.user, model: "late", protocol: "anthropic.messages",
		platform: "anthropic", success: true, in: 7, out: 3, cost: "2", multiplier: "1", anomalies: `{}`, latency: 50}})
	_, err = f.db.Pool.Exec(ctx, `DELETE FROM usage_logs WHERE request_id = 'rollup-30'`)
	require.NoError(t, err)
	var marks int
	require.NoError(t, f.db.Pool.QueryRow(ctx, `SELECT count(*) FROM usage_hourly_dirty`).Scan(&marks))
	require.Positive(t, marks)

	want := live()
	_, err = f.db.Pool.Exec(ctx, `UPDATE usage_hourly_state SET low = $1, high = $2`, low, high)
	require.NoError(t, err)
	f.compareRollup("marked", now, want) // marked hours are read live until recomputed
	_, err = f.svc.refreshRollup(ctx)
	require.NoError(t, err)
	require.NoError(t, f.db.Pool.QueryRow(ctx, `SELECT count(*) FROM usage_hourly_dirty`).Scan(&marks))
	require.Zero(t, marks)
	f.compareRollup("changes", now, want)
}

func (f *fixture) compareRollup(stage string, now time.Time, want map[string]string) {
	f.t.Helper()
	for _, p := range rollupPaths(now, f.user) {
		require.JSONEq(f.t, want[p], f.statsJSON(p), "%s: %s", stage, p)
	}
}

// Recent rows, the settlement's hot path, never mark an hour.
func TestRollupTriggerSkipsRecentRows(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()
	f.insertRollupRows(time.Now(), "recent", []rollupRow{{age: time.Minute, user: f.user, model: "m", protocol: "p", platform: "x",
		success: true, cost: "1", multiplier: "1", anomalies: `{}`}})
	_, err := f.db.Pool.Exec(ctx, `UPDATE usage_logs SET total_cost = 2`)
	require.NoError(t, err)
	var marks int
	require.NoError(t, f.db.Pool.QueryRow(ctx, `SELECT count(*) FROM usage_hourly_dirty`).Scan(&marks))
	require.Zero(t, marks)
}

// No hour is sealed that a write transaction still open may have written
// without marking.
func TestRollupSealWaitsForOpenWrites(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()
	var free time.Time
	require.NoError(t, f.db.Pool.QueryRow(ctx, sealedSQL).Scan(&free))
	require.Equal(t, time.Now().Add(-rollupSeal).Truncate(time.Hour), free.Truncate(time.Hour))

	tx, err := f.db.Pool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = tx.Rollback(ctx) }()
	var started time.Time
	_, err = tx.Exec(ctx, `SELECT txid_current()`) // a write transaction has an xid
	require.NoError(t, err)
	require.NoError(t, tx.QueryRow(ctx, `SELECT xact_start FROM pg_stat_activity WHERE pid = pg_backend_pid()`).Scan(&started))
	var held time.Time
	require.NoError(t, f.db.Pool.QueryRow(ctx, sealedSQL).Scan(&held))
	require.Equal(t, started.Add(-15*time.Minute).Truncate(time.Hour), held)
}

// The rollup answers day and hour buckets only where the zone is whole hours
// from UTC all along the range.
func TestHourAligned(t *testing.T) {
	zone := func(name string) *time.Location {
		loc, err := time.LoadLocation(name)
		require.NoError(t, err)
		return loc
	}
	at := func(s string) time.Time {
		v, err := time.Parse(time.RFC3339, s)
		require.NoError(t, err)
		return v
	}
	for _, c := range []struct {
		zone, from, to string
		want           bool
	}{
		{"Asia/Shanghai", "2026-01-01T00:00:00Z", "2026-12-01T00:00:00Z", true},
		{"America/New_York", "2026-01-01T00:00:00Z", "2026-12-01T00:00:00Z", true},
		{"Asia/Kolkata", "2026-11-01T00:00:00Z", "2026-11-02T00:00:00Z", false},
		// +11 at both ends, +10:30 in between.
		{"Australia/Lord_Howe", "2026-02-01T00:00:00Z", "2026-11-01T00:00:00Z", false},
		{"Australia/Lord_Howe", "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z", true},
	} {
		require.Equal(t, c.want, hourAligned(zone(c.zone), at(c.from), at(c.to)), "%s %s", c.zone, c.from)
	}
}

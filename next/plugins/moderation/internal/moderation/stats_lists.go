package moderation

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Per-row figures of the flow, auditor and channel lists (CONTRACTS
// §72.14.3), read from the hourly tables like new-api's list columns.

// FlowStat is the flow list's last-24-hour columns.
type FlowStat struct {
	Audited         int64   `json:"audited"`
	SuspiciousRate  float64 `json:"suspicious_rate"`
	PreLatencyAvgMs float64 `json:"pre_latency_avg_ms"`
}

func flowStats24h(ctx context.Context, db *pgxpool.Pool, now time.Time) (map[int64]FlowStat, error) {
	rows, err := queryStatRows(ctx, db, statsFilter{from: now.Add(-24 * time.Hour).Truncate(time.Hour), to: now, group: -1})
	if err != nil {
		return nil, err
	}
	all, pre := map[int64]*counters{}, map[int64]*counters{}
	for i := range rows {
		r := &rows[i]
		if r.kind() != kindFlow {
			continue
		}
		mergeInto(all, r.flow, &r.c)
		if r.timing == TimingPre {
			mergeInto(pre, r.flow, &r.c)
		}
	}
	out := make(map[int64]FlowStat, len(all))
	for id, c := range all {
		st := FlowStat{Audited: c.audited + c.cacheSkipped, SuspiciousRate: ratio(c.hit, c.audited+c.cacheSkipped)}
		if pc := pre[id]; pc != nil {
			st.PreLatencyAvgMs = summaryOf(pc).AvgMs
		}
		out[id] = st
	}
	return out, nil
}

// AuditorToday is the auditor list's "today": hook calls and their cost.
type AuditorToday struct {
	Calls int64       `json:"calls"`
	Cost  CostSummary `json:"cost"`
}

func auditorsToday(ctx context.Context, db *pgxpool.Pool, today, now time.Time) (map[int64]AuditorToday, error) {
	rows, err := db.Query(ctx, `SELECT auditor_id, coalesce(sum(calls), 0)::bigint, coalesce(sum(tokens_in), 0)::bigint,
			coalesce(sum(tokens_out), 0)::bigint, coalesce(sum(cost), 0)::text
		FROM stats_hourly WHERE hour >= $1 AND hour <= $2 AND auditor_id <> 0 GROUP BY auditor_id`, today, now)
	if err != nil {
		return nil, err
	}
	out := map[int64]AuditorToday{}
	var id int64
	var a AuditorToday
	_, err = pgx.ForEachRow(rows, []any{&id, &a.Calls, &a.Cost.TokensIn, &a.Cost.TokensOut, &a.Cost.Cost}, func() error {
		a.Cost.Calls = a.Calls
		a.Cost.normalize()
		out[id] = a
		return nil
	})
	return out, err
}

// ChannelHealth is the channel list's health and cost columns; calls and
// errors count audit and analysis calls only.
type ChannelHealth struct {
	Calls1h          int64                  `json:"calls_1h"`
	ErrorRate1h      float64                `json:"error_rate_1h"`
	TokensToday      int64                  `json:"tokens_today"`
	Cost1h           CostSummary            `json:"cost_1h"`
	CostToday        CostSummary            `json:"cost_today"`
	CostTodaySources map[string]CostSummary `json:"cost_today_sources"`
}

func newChannelHealth() *ChannelHealth {
	return &ChannelHealth{Cost1h: zeroCost(), CostToday: zeroCost(), CostTodaySources: map[string]CostSummary{}}
}

func channelsHealth(ctx context.Context, db *pgxpool.Pool, today, now time.Time) (map[int64]*ChannelHealth, error) {
	hour := lastHour(now)
	rows, err := queryCostHours(ctx, db, earliest(today, hour))
	if err != nil {
		return nil, err
	}
	out := map[int64]*ChannelHealth{}
	errs := map[int64]int64{}
	for _, r := range rows {
		h := out[r.channel]
		if h == nil {
			h = newChannelHealth()
			out[r.channel] = h
		}
		if !r.hour.Before(hour) {
			h.Cost1h.add(r.sum)
			if r.source == SourceAudit || r.source == SourceAnalysis {
				h.Calls1h += r.sum.Calls
				errs[r.channel] += r.errors
			}
		}
		if !r.hour.Before(today) {
			h.TokensToday += r.sum.TokensIn + r.sum.TokensOut
			h.CostToday.add(r.sum)
			s, ok := h.CostTodaySources[r.source]
			if !ok {
				s = zeroCost()
			}
			s.add(r.sum)
			h.CostTodaySources[r.source] = s
		}
	}
	for id, h := range out {
		h.ErrorRate1h = ratio(errs[id], h.Calls1h)
	}
	return out, nil
}

package guard

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Job ids declared in manifest.json.
const (
	JobRollup  = "rollup"
	JobCleanup = "cleanup"
)

// Retention used by the cleanup job.
const (
	minutelyRetention = 8 * 24 * time.Hour
	longRetention     = 30 * 24 * time.Hour
	rollupLookback    = 26 * time.Hour
)

// usageRecorded is the part of the usage.recorded payload guard uses
// (CONTRACTS §6).
type usageRecorded struct {
	GroupID   int64     `json:"group_id"`
	Model     string    `json:"model"`
	CreatedAt time.Time `json:"created_at"`
}

// OnEvents implements pluginsdk.EventHandler. Each event is processed once:
// processed_events guards against redelivery, in the same transaction as the
// counter update.
func (p *Plugin) OnEvents(ctx context.Context, in *pluginv1.OnEventsRequest) (*pluginv1.OnEventsResponse, error) {
	evs := in.GetEvents()
	if len(evs) == 0 {
		return &pluginv1.OnEventsResponse{}, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	var last int64
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		for _, ev := range evs {
			var inserted bool
			if err := tx.QueryRow(ctx, `WITH ins AS (
					INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING 1)
				SELECT EXISTS (SELECT 1 FROM ins)`, ev.GetId()).Scan(&inserted); err != nil {
				return err
			}
			if inserted && ev.GetType() == "usage.recorded" {
				var u usageRecorded
				if err := json.Unmarshal([]byte(ev.GetPayloadJson()), &u); err != nil {
					p.log.Warn("guard: bad usage.recorded payload", "event_id", ev.GetId(), "error", err.Error())
				} else {
					at := u.CreatedAt
					if at.IsZero() {
						at = time.UnixMilli(ev.GetOccurredAtUnixMs())
					}
					if _, err := tx.Exec(ctx, `INSERT INTO stats_minutely (minute, group_id, model, requests, blocked)
						VALUES (date_trunc('minute', $1::timestamptz), $2, $3, 1, 0)
						ON CONFLICT (minute, group_id, model) DO UPDATE SET requests = stats_minutely.requests + 1`,
						at.UTC(), u.GroupID, u.Model); err != nil {
						return err
					}
				}
			}
			if ev.GetId() > last {
				last = ev.GetId()
			}
		}
		return nil
	})
	if err != nil {
		return nil, status.Error(codes.Unavailable, fmt.Sprintf("guard: store events: %v", err))
	}
	return &pluginv1.OnEventsResponse{AckedThroughId: last}, nil
}

// RunJob implements pluginsdk.JobRunner.
func (p *Plugin) RunJob(ctx context.Context, in *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	now := p.now().UTC()
	switch in.GetJobId() {
	case JobRollup:
		// Recompute the hourly rows of the last day from the minutely rows
		// (idempotent; covers late events and the current partial hour).
		tag, err := db.Exec(ctx, `INSERT INTO stats_hourly (hour, group_id, model, requests, blocked)
			SELECT date_trunc('hour', minute, 'UTC'), group_id, model, sum(requests), sum(blocked)
			FROM stats_minutely WHERE minute >= date_trunc('hour', $1::timestamptz, 'UTC')
			GROUP BY 1, 2, 3
			ON CONFLICT (hour, group_id, model) DO UPDATE
			SET requests = EXCLUDED.requests, blocked = EXCLUDED.blocked`, now.Add(-rollupLookback))
		if err != nil {
			return nil, status.Errorf(codes.Internal, "rollup: %v", err)
		}
		return &pluginv1.RunJobResponse{Message: fmt.Sprintf("rolled up %d hourly rows", tag.RowsAffected())}, nil
	case JobCleanup:
		var total int64
		for _, q := range []struct {
			sql    string
			before time.Time
		}{
			{`DELETE FROM stats_minutely WHERE minute < $1`, now.Add(-minutelyRetention)},
			{`DELETE FROM stats_hourly WHERE hour < $1`, now.Add(-longRetention)},
			{`DELETE FROM block_log WHERE occurred_at < $1`, now.Add(-longRetention)},
			{`DELETE FROM processed_events WHERE processed_at < $1`, now.Add(-longRetention)},
		} {
			tag, err := db.Exec(ctx, q.sql, q.before)
			if err != nil {
				return nil, status.Errorf(codes.Internal, "cleanup: %v", err)
			}
			total += tag.RowsAffected()
		}
		return &pluginv1.RunJobResponse{Message: fmt.Sprintf("deleted %d rows", total)}, nil
	default:
		return nil, status.Errorf(codes.NotFound, "unknown job %q", in.GetJobId())
	}
}

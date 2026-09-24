package egress

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// pgStore is the PostgreSQL logStore.
type pgStore struct{ db *store.DB }

var logColumns = []string{
	"plugin_key", "node_id", "network", "host", "port", "started_at",
	"duration_ms", "bytes_in", "bytes_out", "result", "error", "closed_at",
}

func (s pgStore) resetOpen(ctx context.Context, nodeID string, before time.Time) (int64, error) {
	tag, err := s.db.Pool.Exec(ctx, `UPDATE plugin_egress_logs
		SET result = 'reset', error = 'node restarted', closed_at = now(),
			duration_ms = LEAST(EXTRACT(EPOCH FROM (now() - started_at)) * 1000, 2147483647)::int
		WHERE result = 'open' AND node_id = $1 AND started_at < $2`, nodeID, before)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// insertOpen inserts the rows in one pipelined batch (one round trip) so
// every id maps back to its row.
func (s pgStore) insertOpen(ctx context.Context, rows []logEntry) ([]int64, error) {
	b := &pgx.Batch{}
	for _, r := range rows {
		b.Queue(`INSERT INTO plugin_egress_logs (plugin_key, node_id, network, host, port, started_at, duration_ms, result)
			VALUES ($1, $2, $3, $4, $5, $6, 0, 'open') RETURNING id`,
			r.PluginKey, r.NodeID, r.Network, r.Host, r.Port, r.StartedAt)
	}
	br := s.db.Pool.SendBatch(ctx, b)
	defer br.Close()
	ids := make([]int64, 0, len(rows))
	for range rows {
		var id int64
		if err := br.QueryRow().Scan(&id); err != nil {
			return ids, err
		}
		ids = append(ids, id)
	}
	return ids, br.Close()
}

func (s pgStore) insertDone(ctx context.Context, rows []logEntry) error {
	_, err := s.db.Pool.CopyFrom(ctx, pgx.Identifier{"plugin_egress_logs"}, logColumns,
		pgx.CopyFromSlice(len(rows), func(i int) ([]any, error) {
			r := rows[i]
			closed := r.StartedAt.Add(time.Duration(r.DurationMS) * time.Millisecond)
			return []any{r.PluginKey, r.NodeID, r.Network, r.Host, r.Port, r.StartedAt,
				r.DurationMS, r.BytesIn, r.BytesOut, r.Result, r.Error, closed}, nil
		}))
	return err
}

func (s pgStore) closeRows(ctx context.Context, rows []closedRow) error {
	n := len(rows)
	ids := make([]int64, n)
	results, errs := make([]string, n), make([]string, n)
	durations := make([]int32, n)
	in, out := make([]int64, n), make([]int64, n)
	closed := make([]time.Time, n)
	for i, r := range rows {
		ids[i], results[i], errs[i] = r.ID, r.Result, r.Error
		durations[i], in[i], out[i], closed[i] = int32(r.DurationMS), r.BytesIn, r.BytesOut, r.ClosedAt
	}
	_, err := s.db.Pool.Exec(ctx, `
		UPDATE plugin_egress_logs l SET result = u.result, error = u.error,
			duration_ms = CASE WHEN u.duration_ms > 0 THEN u.duration_ms
				ELSE LEAST(EXTRACT(EPOCH FROM (u.closed_at - l.started_at)) * 1000, 2147483647)::int END,
			bytes_in = GREATEST(l.bytes_in, u.bytes_in), bytes_out = GREATEST(l.bytes_out, u.bytes_out),
			closed_at = u.closed_at
		FROM unnest($1::bigint[], $2::text[], $3::text[], $4::int[], $5::bigint[], $6::bigint[], $7::timestamptz[])
			AS u(id, result, error, duration_ms, bytes_in, bytes_out, closed_at)
		WHERE l.id = u.id AND l.result = 'open'`, ids, results, errs, durations, in, out, closed)
	return err
}

func (s pgStore) prune(ctx context.Context, before time.Time) error {
	_, err := s.db.Pool.Exec(ctx, `DELETE FROM plugin_egress_logs WHERE started_at < $1`, before)
	return err
}

func (s pgStore) upsertDomains(ctx context.Context, ds []domainDelta,
	onNew func(ctx context.Context, tx pgx.Tx, news []domainDelta) error) error {
	n := len(ds)
	keys, hosts := make([]string, n), make([]string, n)
	first, last := make([]time.Time, n), make([]time.Time, n)
	conns := make([]int64, n)
	byKey := make(map[domainKey]domainDelta, n)
	for i, d := range ds {
		keys[i], hosts[i], first[i], last[i], conns[i] = d.PluginKey, d.Host, d.FirstSeen, d.LastSeen, d.Connections
		byKey[domainKey{d.PluginKey, d.Host}] = d
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `
			INSERT INTO plugin_egress_domains AS d (plugin_key, host, first_seen_at, last_seen_at, connections)
			SELECT * FROM unnest($1::text[], $2::text[], $3::timestamptz[], $4::timestamptz[], $5::bigint[])
			ON CONFLICT (plugin_key, host) DO UPDATE SET
				last_seen_at = GREATEST(d.last_seen_at, EXCLUDED.last_seen_at),
				connections = d.connections + EXCLUDED.connections
			RETURNING d.plugin_key, d.host, d.first_seen_at, (xmax = 0) AS inserted`,
			keys, hosts, first, last, conns)
		if err != nil {
			return err
		}
		var news []domainDelta
		for rows.Next() {
			var (
				key, host string
				firstSeen time.Time
				inserted  bool
			)
			if err := rows.Scan(&key, &host, &firstSeen, &inserted); err != nil {
				rows.Close()
				return err
			}
			if inserted {
				d := byKey[domainKey{key, host}]
				d.FirstSeen = firstSeen
				news = append(news, d)
			}
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return err
		}
		if len(news) == 0 || onNew == nil {
			return nil
		}
		return onNew(ctx, tx, news)
	})
}

package egress

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// logEntry is one plugin_egress_logs row.
type logEntry struct {
	PluginKey  string
	NodeID     string
	Network    string
	Host       string
	Port       int
	StartedAt  time.Time
	DurationMS int
	BytesIn    int64
	BytesOut   int64
	Result     string
	Error      string
}

var logColumns = []string{
	"plugin_key", "node_id", "network", "host", "port", "started_at",
	"duration_ms", "bytes_in", "bytes_out", "result", "error",
}

// logWriter batches entries and writes them with COPY.
type logWriter struct {
	db        *store.DB
	log       *slog.Logger
	ch        chan logEntry
	interval  time.Duration
	batch     int
	retention time.Duration
	dropped   atomic.Int64

	flushReq chan chan error
	stop     chan struct{}
	done     chan struct{}
	once     sync.Once
}

func newLogWriter(db *store.DB, o Options) *logWriter {
	w := &logWriter{
		db: db, log: o.Logger,
		interval: o.FlushInterval, batch: o.BatchSize, retention: o.Retention,
		flushReq: make(chan chan error), stop: make(chan struct{}), done: make(chan struct{}),
	}
	if w.interval <= 0 {
		w.interval = 2 * time.Second
	}
	if w.batch <= 0 {
		w.batch = 500
	}
	if w.retention == 0 {
		w.retention = 7 * 24 * time.Hour
	}
	q := o.QueueSize
	if q <= 0 {
		q = 10000
	}
	w.ch = make(chan logEntry, q)
	go w.run()
	return w
}

// add queues an entry without blocking; entries are dropped when the queue
// is full (the database is down or too slow).
func (w *logWriter) add(e logEntry) {
	select {
	case w.ch <- e:
	default:
		if w.dropped.Add(1)%1000 == 1 {
			w.log.Warn("egress log queue full, dropping entries", "dropped", w.dropped.Load())
		}
	}
}

func (w *logWriter) run() {
	defer close(w.done)
	t := time.NewTicker(w.interval)
	defer t.Stop()
	prune := time.NewTicker(time.Hour)
	defer prune.Stop()
	buf := make([]logEntry, 0, w.batch)
	flush := func() error {
		if len(buf) == 0 {
			return nil
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		err := w.write(ctx, buf)
		if err != nil {
			w.log.Warn("egress log write failed", "rows", len(buf), "err", err)
		}
		buf = buf[:0]
		return err
	}
	drain := func() {
		for {
			select {
			case e := <-w.ch:
				buf = append(buf, e)
				if len(buf) >= w.batch {
					_ = flush()
				}
			default:
				return
			}
		}
	}
	for {
		select {
		case e := <-w.ch:
			buf = append(buf, e)
			if len(buf) >= w.batch {
				_ = flush()
			}
		case <-t.C:
			_ = flush()
		case <-prune.C:
			w.prune()
		case reply := <-w.flushReq:
			drain()
			reply <- flush()
		case <-w.stop:
			drain()
			_ = flush()
			return
		}
	}
}

func (w *logWriter) write(ctx context.Context, rows []logEntry) error {
	if w.db == nil {
		return nil
	}
	_, err := w.db.Pool.CopyFrom(ctx, pgx.Identifier{"plugin_egress_logs"}, logColumns,
		pgx.CopyFromSlice(len(rows), func(i int) ([]any, error) {
			r := rows[i]
			return []any{r.PluginKey, r.NodeID, r.Network, r.Host, r.Port, r.StartedAt,
				r.DurationMS, r.BytesIn, r.BytesOut, r.Result, r.Error}, nil
		}))
	return err
}

func (w *logWriter) prune() {
	if w.db == nil || w.retention < 0 {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	if _, err := w.db.Pool.Exec(ctx, `DELETE FROM plugin_egress_logs WHERE started_at < $1`,
		time.Now().Add(-w.retention)); err != nil {
		w.log.Warn("egress log prune failed", "err", err)
	}
}

func (w *logWriter) flushNow(ctx context.Context) error {
	reply := make(chan error, 1)
	select {
	case w.flushReq <- reply:
	case <-w.done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
	select {
	case err := <-reply:
		return err
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (w *logWriter) close() {
	w.once.Do(func() { close(w.stop) })
	<-w.done
}

// HostSummary aggregates a plugin's egress by host.
type HostSummary struct {
	Host        string    `json:"host"`
	Connections int64     `json:"connections"`
	Denied      int64     `json:"denied"`
	Errors      int64     `json:"errors"`
	BytesIn     int64     `json:"bytes_in"`
	BytesOut    int64     `json:"bytes_out"`
	FirstSeen   time.Time `json:"first_seen"`
	LastSeen    time.Time `json:"last_seen"`
}

// LogRecord is one plugin_egress_logs row for the API.
type LogRecord struct {
	ID         int64     `json:"id"`
	NodeID     string    `json:"node_id"`
	Network    string    `json:"network"`
	Host       string    `json:"host"`
	Port       int       `json:"port"`
	StartedAt  time.Time `json:"started_at"`
	DurationMS int       `json:"duration_ms"`
	BytesIn    int64     `json:"bytes_in"`
	BytesOut   int64     `json:"bytes_out"`
	Result     string    `json:"result"`
	Error      string    `json:"error"`
}

// Summary groups a plugin's egress in [from, to) by host (busiest first).
func Summary(ctx context.Context, q store.Querier, pluginKey string, from, to time.Time) ([]HostSummary, error) {
	rows, err := q.Query(ctx, `
SELECT host, count(*),
       count(*) FILTER (WHERE result = 'denied'),
       count(*) FILTER (WHERE result IN ('dial_error', 'reset')),
       coalesce(sum(bytes_in), 0)::bigint, coalesce(sum(bytes_out), 0)::bigint,
       min(started_at), max(started_at)
FROM plugin_egress_logs
WHERE plugin_key = $1 AND started_at >= $2 AND started_at < $3
GROUP BY host
ORDER BY count(*) DESC, host`, pluginKey, from, to)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (HostSummary, error) {
		var s HostSummary
		err := r.Scan(&s.Host, &s.Connections, &s.Denied, &s.Errors, &s.BytesIn, &s.BytesOut, &s.FirstSeen, &s.LastSeen)
		return s, err
	})
}

// List returns a plugin's most recent egress rows in [from, to).
func List(ctx context.Context, q store.Querier, pluginKey string, from, to time.Time, limit int) ([]LogRecord, error) {
	if limit <= 0 || limit > 1000 {
		limit = 200
	}
	rows, err := q.Query(ctx, `
SELECT id, node_id, network, host, port, started_at, duration_ms, bytes_in, bytes_out, result, error
FROM plugin_egress_logs
WHERE plugin_key = $1 AND started_at >= $2 AND started_at < $3
ORDER BY started_at DESC, id DESC
LIMIT $4`, pluginKey, from, to, limit)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (LogRecord, error) {
		var l LogRecord
		err := r.Scan(&l.ID, &l.NodeID, &l.Network, &l.Host, &l.Port, &l.StartedAt, &l.DurationMS,
			&l.BytesIn, &l.BytesOut, &l.Result, &l.Error)
		return l, err
	})
}

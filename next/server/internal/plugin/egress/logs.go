package egress

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// ResultOpen marks a connection that is still open (its row is updated
// when it closes).
const ResultOpen = "open"

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

// closedRow is the final state of a connection logged as open.
type closedRow struct {
	ID         int64
	Result     string
	Error      string
	DurationMS int
	BytesIn    int64
	BytesOut   int64
	ClosedAt   time.Time
}

// openConn tracks one connection logged with result 'open'. entry is
// immutable once queued; the other fields belong to the writer goroutine.
type openConn struct {
	entry  logEntry
	id     int64      // row id once inserted (0 = not inserted)
	final  *closedRow // close seen in the batch being flushed
	merged bool       // written as one finished row instead
}

type itemKind uint8

const (
	itemDone  itemKind = iota // finished row (COPY)
	itemOpen                  // connection opened
	itemClose                 // connection of an itemOpen closed
)

type logItem struct {
	kind  itemKind
	entry logEntry  // itemDone
	conn  *openConn // itemOpen, itemClose
	final closedRow // itemClose
}

// logStore persists egress logs and domains (pgStore in production).
type logStore interface {
	// resetOpen marks rows of nodeID still 'open' and started before
	// before as reset (left behind by an earlier run of this node).
	resetOpen(ctx context.Context, nodeID string, before time.Time) (int64, error)
	// insertOpen inserts result='open' rows and returns their ids in order.
	insertOpen(ctx context.Context, rows []logEntry) ([]int64, error)
	insertDone(ctx context.Context, rows []logEntry) error
	closeRows(ctx context.Context, rows []closedRow) error
	prune(ctx context.Context, before time.Time) error
	// upsertDomains adds connection counts per host. onNew is called in the
	// same transaction with the deltas whose row was created.
	upsertDomains(ctx context.Context, ds []domainDelta, onNew func(ctx context.Context, tx pgx.Tx, news []domainDelta) error) error
}

// logWriter batches log rows and domain updates on one goroutine.
type logWriter struct {
	st        logStore
	log       *slog.Logger
	nodeID    string
	events    core.EventPublisher
	ch        chan logItem
	interval  time.Duration
	batch     int
	retention time.Duration
	dropped   atomic.Int64
	started   time.Time
	domains   *domainTracker

	openIDs map[int64]bool // rows this process left open (writer only)

	flushReq chan chan error
	kick     chan struct{}
	stop     chan struct{}
	done     chan struct{}
	once     sync.Once
}

func newLogWriter(st logStore, o Options) *logWriter {
	w := &logWriter{
		st: st, log: o.Logger, nodeID: o.NodeID, events: o.Events,
		interval: o.FlushInterval, batch: o.BatchSize, retention: o.Retention,
		started: time.Now(), openIDs: map[int64]bool{},
		flushReq: make(chan chan error), kick: make(chan struct{}, 1),
		stop: make(chan struct{}), done: make(chan struct{}),
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
	w.domains = newDomainTracker(o.DomainUpdateInterval)
	w.ch = make(chan logItem, q)
	go w.run()
	return w
}

func (w *logWriter) enqueue(it logItem) {
	select {
	case w.ch <- it:
	default:
		if w.dropped.Add(1)%1000 == 1 {
			w.log.Warn("egress log queue full, dropping entries", "dropped", w.dropped.Load())
		}
	}
}

// add queues a finished row without blocking; entries are dropped when the
// queue is full (the database is down or too slow).
func (w *logWriter) add(e logEntry) { w.enqueue(logItem{kind: itemDone, entry: e}) }

// open queues the 'open' row of a connection.
func (w *logWriter) open(e logEntry) *openConn {
	e.Result, e.DurationMS = ResultOpen, 0
	c := &openConn{entry: e}
	w.enqueue(logItem{kind: itemOpen, conn: c})
	return c
}

// close queues the final state of a connection returned by open.
func (w *logWriter) close(c *openConn, result, errMsg string, in, out int64, start time.Time) {
	now := time.Now()
	w.enqueue(logItem{kind: itemClose, conn: c, final: closedRow{
		Result: result, Error: errMsg, DurationMS: int(now.Sub(start).Milliseconds()),
		BytesIn: in, BytesOut: out, ClosedAt: now,
	}})
}

// observe counts one connection to host for the domain list.
func (w *logWriter) observe(pluginKey, host string, port int) {
	if w.domains.observe(pluginKey, host, port, time.Now()) {
		select {
		case w.kick <- struct{}{}:
		default:
		}
	}
}

func (w *logWriter) run() {
	defer close(w.done)
	if w.st != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		if n, err := w.st.resetOpen(ctx, w.nodeID, w.started); err != nil {
			w.log.Warn("egress log: reset open rows of a previous run failed", "err", err)
		} else if n > 0 {
			w.log.Info("egress log: marked connections of a previous run as reset", "rows", n)
		}
		cancel()
	}
	t := time.NewTicker(w.interval)
	defer t.Stop()
	prune := time.NewTicker(time.Hour)
	defer prune.Stop()
	buf := make([]logItem, 0, w.batch)
	flush := func() error {
		if len(buf) == 0 {
			return nil
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		err := w.write(ctx, buf)
		if err != nil {
			w.log.Warn("egress log write failed", "items", len(buf), "err", err)
		}
		clear(buf)
		buf = buf[:0]
		return err
	}
	take := func(it logItem) {
		buf = append(buf, it)
		if len(buf) >= w.batch {
			_ = flush()
		}
	}
	drain := func() {
		for {
			select {
			case it := <-w.ch:
				take(it)
			default:
				return
			}
		}
	}
	for {
		select {
		case it := <-w.ch:
			take(it)
		case <-t.C:
			_ = flush()
			w.flushDomains(false)
		case <-w.kick:
			w.flushDomains(false)
		case <-prune.C:
			w.prune()
			w.domains.evict(time.Now())
		case reply := <-w.flushReq:
			drain()
			err := flush()
			if derr := w.flushDomains(true); err == nil {
				err = derr
			}
			reply <- err
		case <-w.stop:
			drain()
			_ = flush()
			_ = w.flushDomains(true)
			w.closeLeftovers()
			return
		}
	}
}

// write persists one batch: open rows first (their ids are needed by
// closes), then finished rows, then closes. A connection opened and closed
// within the batch is written once as a finished row.
func (w *logWriter) write(ctx context.Context, items []logItem) error {
	if w.st == nil {
		return nil
	}
	for i := range items {
		if it := &items[i]; it.kind == itemClose {
			f := it.final
			it.conn.final = &f
		}
	}
	var (
		done   []logEntry
		opens  []*openConn
		closes []closedRow
	)
	for _, it := range items {
		switch it.kind {
		case itemDone:
			done = append(done, it.entry)
		case itemOpen:
			if it.conn.final != nil {
				done = append(done, merge(it.conn.entry, *it.conn.final))
				it.conn.merged = true
			} else {
				opens = append(opens, it.conn)
			}
		}
	}
	var firstErr error
	if len(opens) > 0 {
		rows := make([]logEntry, len(opens))
		for i, c := range opens {
			rows[i] = c.entry
		}
		ids, err := w.st.insertOpen(ctx, rows)
		if err != nil {
			firstErr = err
		}
		// On a partial failure the rows inserted so far keep their ids.
		for i, c := range opens {
			if i < len(ids) && ids[i] > 0 {
				c.id = ids[i]
				w.openIDs[c.id] = true
			}
		}
	}
	for _, it := range items {
		if it.kind != itemClose || it.conn.merged {
			continue
		}
		if it.conn.id > 0 {
			f := it.final
			f.ID = it.conn.id
			closes = append(closes, f)
		} else {
			// The open row was dropped or failed: write the whole row now.
			done = append(done, merge(it.conn.entry, it.final))
		}
	}
	if len(done) > 0 {
		if err := w.st.insertDone(ctx, done); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	if len(closes) > 0 {
		if err := w.st.closeRows(ctx, closes); err != nil {
			if firstErr == nil {
				firstErr = err
			}
		} else {
			for _, f := range closes {
				delete(w.openIDs, f.ID)
			}
		}
	}
	return firstErr
}

func merge(e logEntry, f closedRow) logEntry {
	e.Result, e.Error, e.DurationMS, e.BytesIn, e.BytesOut = f.Result, f.Error, f.DurationMS, f.BytesIn, f.BytesOut
	return e
}

// closeLeftovers marks rows this process still has open as reset (the
// tunnels die with the process).
func (w *logWriter) closeLeftovers() {
	if w.st == nil || len(w.openIDs) == 0 {
		return
	}
	now := time.Now()
	rows := make([]closedRow, 0, len(w.openIDs))
	for id := range w.openIDs {
		rows = append(rows, closedRow{ID: id, Result: ResultReset, Error: "node shutting down", ClosedAt: now})
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := w.st.closeRows(ctx, rows); err != nil {
		w.log.Warn("egress log: closing open rows at shutdown failed", "rows", len(rows), "err", err)
	}
}

// flushDomains writes due domain counters (all pending ones with force).
func (w *logWriter) flushDomains(force bool) error {
	ds := w.domains.due(time.Now(), force)
	if len(ds) == 0 || w.st == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err := w.st.upsertDomains(ctx, ds, func(ctx context.Context, tx pgx.Tx, news []domainDelta) error {
		evs := make([]core.Event, 0, len(news))
		for _, d := range news {
			w.log.Warn("plugin connected to a new external host",
				"plugin", d.PluginKey, "host", d.Host, "port", d.Port, "node_id", w.nodeID)
			evs = append(evs, core.Event{Type: core.EventPluginEgressNewDomain, Payload: map[string]any{
				"plugin_key": d.PluginKey, "host": d.Host, "port": d.Port,
				"node_id": w.nodeID, "first_seen_at": d.FirstSeen.UTC(),
			}})
		}
		if w.events == nil {
			return nil
		}
		return w.events.Emit(ctx, tx, evs...)
	})
	if err != nil {
		w.log.Warn("egress domain update failed", "hosts", len(ds), "err", err)
		w.domains.restore(ds)
	}
	return err
}

func (w *logWriter) prune() {
	if w.st == nil || w.retention < 0 {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	if err := w.st.prune(ctx, time.Now().Add(-w.retention)); err != nil {
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

func (w *logWriter) shutdown() {
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

// LogRecord is one plugin_egress_logs row for the API. Result "open" marks
// a connection that is still open (ClosedAt nil).
type LogRecord struct {
	ID         int64      `json:"id"`
	NodeID     string     `json:"node_id"`
	Network    string     `json:"network"`
	Host       string     `json:"host"`
	Port       int        `json:"port"`
	StartedAt  time.Time  `json:"started_at"`
	ClosedAt   *time.Time `json:"closed_at"`
	DurationMS int        `json:"duration_ms"`
	BytesIn    int64      `json:"bytes_in"`
	BytesOut   int64      `json:"bytes_out"`
	Result     string     `json:"result"`
	Error      string     `json:"error"`
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
SELECT id, node_id, network, host, port, started_at, closed_at, duration_ms, bytes_in, bytes_out, result, error
FROM plugin_egress_logs
WHERE plugin_key = $1 AND started_at >= $2 AND started_at < $3
ORDER BY started_at DESC, id DESC
LIMIT $4`, pluginKey, from, to, limit)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (LogRecord, error) {
		var l LogRecord
		err := r.Scan(&l.ID, &l.NodeID, &l.Network, &l.Host, &l.Port, &l.StartedAt, &l.ClosedAt, &l.DurationMS,
			&l.BytesIn, &l.BytesOut, &l.Result, &l.Error)
		return l, err
	})
}

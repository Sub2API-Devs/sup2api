package egress

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// DefaultDomainUpdateInterval is how often the counters of a known host
// are written at most (per host and node).
const DefaultDomainUpdateInterval = time.Minute

// domainIdleEvict drops cached hosts without traffic for this many update
// intervals (a returning host is simply upserted again).
const domainIdleEvict = 30

type domainKey struct{ plugin, host string }

type domainState struct {
	port      int       // last port seen (reported in the new-domain event)
	pending   int64     // connections not written yet
	firstAt   time.Time // earliest pending connection
	lastAt    time.Time // latest connection
	flushedAt time.Time // last write by this process; zero = never
}

// domainDelta is one upsert into plugin_egress_domains.
type domainDelta struct {
	PluginKey   string
	Host        string
	Port        int
	Connections int64
	FirstSeen   time.Time
	LastSeen    time.Time
}

// domainTracker aggregates connections per (plugin, host) in memory so the
// database is written at most once per interval for a known host, and at
// once for a host this process has not written yet (new-domain detection).
type domainTracker struct {
	interval time.Duration
	mu       sync.Mutex
	m        map[domainKey]*domainState
}

func newDomainTracker(interval time.Duration) *domainTracker {
	if interval <= 0 {
		interval = DefaultDomainUpdateInterval
	}
	return &domainTracker{interval: interval, m: map[domainKey]*domainState{}}
}

// observe counts one connection; it returns true when the host has never
// been written by this process (the caller should flush soon).
func (t *domainTracker) observe(plugin, host string, port int, now time.Time) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	k := domainKey{plugin, host}
	st := t.m[k]
	if st == nil {
		st = &domainState{}
		t.m[k] = st
	}
	if st.pending == 0 {
		st.firstAt = now
	}
	st.pending++
	st.lastAt, st.port = now, port
	return st.flushedAt.IsZero()
}

// due takes the pending counters to write: hosts never written, and hosts
// last written at least one interval ago (every pending host with force).
func (t *domainTracker) due(now time.Time, force bool) []domainDelta {
	t.mu.Lock()
	defer t.mu.Unlock()
	var out []domainDelta
	for k, st := range t.m {
		if st.pending == 0 {
			continue
		}
		if !force && !st.flushedAt.IsZero() && now.Sub(st.flushedAt) < t.interval {
			continue
		}
		out = append(out, domainDelta{PluginKey: k.plugin, Host: k.host, Port: st.port,
			Connections: st.pending, FirstSeen: st.firstAt, LastSeen: st.lastAt})
		st.pending = 0
		st.flushedAt = now
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].PluginKey != out[j].PluginKey {
			return out[i].PluginKey < out[j].PluginKey
		}
		return out[i].Host < out[j].Host
	})
	return out
}

// restore puts counters back after a failed write; they are retried on the
// next flush.
func (t *domainTracker) restore(ds []domainDelta) {
	t.mu.Lock()
	defer t.mu.Unlock()
	for _, d := range ds {
		k := domainKey{d.PluginKey, d.Host}
		st := t.m[k]
		if st == nil {
			st = &domainState{port: d.Port, lastAt: d.LastSeen}
			t.m[k] = st
		}
		if st.pending == 0 || d.FirstSeen.Before(st.firstAt) {
			st.firstAt = d.FirstSeen
		}
		st.pending += d.Connections
		if d.LastSeen.After(st.lastAt) {
			st.lastAt = d.LastSeen
		}
		st.flushedAt = time.Time{}
	}
}

// evict forgets idle hosts to bound memory.
func (t *domainTracker) evict(now time.Time) {
	t.mu.Lock()
	defer t.mu.Unlock()
	for k, st := range t.m {
		if st.pending == 0 && now.Sub(st.lastAt) > domainIdleEvict*t.interval {
			delete(t.m, k)
		}
	}
}

func (t *domainTracker) size() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	return len(t.m)
}

// DomainRecord is one plugin_egress_domains row for the API.
type DomainRecord struct {
	Host        string    `json:"host"`
	FirstSeenAt time.Time `json:"first_seen_at"`
	LastSeenAt  time.Time `json:"last_seen_at"`
	Connections int64     `json:"connections"`
	New         bool      `json:"new"` // first seen within NewDomainWindow
}

// NewDomainWindow: a host first seen within this window is reported as new.
const NewDomainWindow = 24 * time.Hour

// Domains lists the hosts a plugin has connected to (most recent first),
// for GET /plugins/:key/egress (CONTRACTS §14.2).
func Domains(ctx context.Context, q store.Querier, pluginKey string) ([]DomainRecord, error) {
	rows, err := q.Query(ctx, `
SELECT host, first_seen_at, last_seen_at, connections, first_seen_at > now() - $2 * interval '1 second'
FROM plugin_egress_domains
WHERE plugin_key = $1
ORDER BY last_seen_at DESC, host
LIMIT 1000`, pluginKey, int64(NewDomainWindow/time.Second))
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (DomainRecord, error) {
		var d DomainRecord
		err := r.Scan(&d.Host, &d.FirstSeenAt, &d.LastSeenAt, &d.Connections, &d.New)
		return d, err
	})
}

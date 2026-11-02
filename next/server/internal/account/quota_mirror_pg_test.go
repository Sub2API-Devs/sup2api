package account

import (
	"context"
	"encoding/json"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// ensureQuotaRow creates or aligns the quota row of id like the service
// does, announcing a written row so the quota mirror reads it again.
func (e *env) ensureQuotaRow(id int64, revision string, automatic bool) {
	e.t.Helper()
	created, err := store.EnsureAccountQuota(e.t.Context(), e.db.Pool, id, revision, automatic)
	require.NoError(e.t, err)
	if created {
		e.svc.quotaChanged(e.t.Context(), id)
	}
}

func quotaWindow(snap *pluginv1.AccountQuotaSnapshot, key string) *pluginv1.QuotaWindow {
	for _, w := range snap.GetWindows() {
		if w.Key == key {
			return w
		}
	}
	return nil
}

// recordAccountChanges records the account:changed payloads published from
// now on; the returned func reads them.
func (e *env) recordAccountChanges() func() []string {
	var mu sync.Mutex
	var payloads []string
	e.bus.Subscribe(core.ChannelAccountChanged, func(p []byte) {
		mu.Lock()
		payloads = append(payloads, string(p))
		mu.Unlock()
	})
	return func() []string {
		mu.Lock()
		defer mu.Unlock()
		return append([]string(nil), payloads...)
	}
}

// TestQuotaMirrorReadsOwnWrite: right after a write on this node, a read
// sees the new value; the precheck's read sees it too, or knows its value is
// stale - never the old value unmarked.
func TestQuotaMirrorReadsOwnWrite(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "own-write", "sk-good-key-123", true)
	generation := quotaObservationGeneration(t, e, id)
	view, err := e.svc.AccountQuotaView(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Nil(t, quotaWindow(view.Snapshots[id], "7d_fable"))
	for i, status := range []string{"rejected", "allowed", "rejected"} {
		require.NoError(t, e.svc.ApplyAccountQuotaObservation(t.Context(), id, generation,
			&pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "7d_fable", Utilization: float64(i), Status: status}}}))
		view, err = e.svc.AccountQuotaView(t.Context(), []int64{id})
		require.NoError(t, err)
		if !view.Stale[id] {
			require.Equal(t, status, quotaWindow(view.Snapshots[id], "7d_fable").GetStatus())
		}
		snaps, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
		require.NoError(t, err)
		require.Equal(t, status, quotaWindow(snaps[id], "7d_fable").GetStatus())
	}
	// The precheck's read of a settled entry needs no I/O and is fresh.
	waitUntil(t, "refill", func() bool { has, stale := entryState(e.svc.quotas(), id); return has && !stale })
	view, err = e.svc.AccountQuotaView(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Empty(t, view.Stale)
	require.Equal(t, "rejected", quotaWindow(view.Snapshots[id], "7d_fable").GetStatus())
}

// TestQuotaMirrorGenerationAfterTrigger: the trigger replaces the quota
// generation without telling the mirror; the account change that caused it
// does (changed), and an observation under the old generation is dropped.
func TestQuotaMirrorGenerationAfterTrigger(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "trigger", "sk-good-key-123", true)
	old := quotaObservationGeneration(t, e, id)
	_, err := e.db.Pool.Exec(t.Context(), `UPDATE accounts SET credentials_enc=$2 WHERE id=$1`, id, []byte("re-authorized"))
	require.NoError(t, err)
	snaps, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Equal(t, old, snaps[id].Generation, "not announced yet: the mirror still has the old generation")
	e.svc.changed(t.Context(), id)
	snaps, err = e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	current := snaps[id].Generation
	require.Greater(t, current, old)
	before := snaps[id].Revision
	require.NoError(t, e.svc.ApplyAccountQuotaObservation(t.Context(), id, old,
		&pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "7d_fable", Utilization: 100, Status: "rejected"}}}))
	stored, err := e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.Equal(t, before, stored.Revision, "the old generation's observation affected no row")
	require.Equal(t, current, stored.Generation)
	require.NotContains(t, stored.Windows, "7d_fable")
}

// TestQuotaMirrorInitializeAnnounces: a quota row created by the sweep (or a
// new plugin revision) is announced, so the negative entry does not wait for
// the reload.
func TestQuotaMirrorInitializeAnnounces(t *testing.T) {
	e := setup(t)
	// Keep the background sweep out of the way.
	e.svc.quotaSweepMu.Lock()
	defer e.svc.quotaSweepMu.Unlock()
	e.withQuota(&manifest.AccountQuota{Query: true, AutoRefresh: true})
	id := e.mkRawAccount("anthropic", "apikey", "initialize", "sk-good-key-123", true)
	snaps, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Empty(t, snaps, "no row yet: a negative entry")
	payloads := e.recordAccountChanges()
	keys := quotaSweepTypes(e.gen)
	require.NotEmpty(t, keys)
	require.NoError(t, e.svc.initializeQuotaPage(t.Context(), keys))
	require.Contains(t, payloads(), `{"account_id":`+itoa(id)+`,"kind":"quota"}`)
	snaps, err = e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.NotNil(t, snaps[id])
	first := snaps[id].Generation
	// Nothing to write: nothing announced.
	n := len(payloads())
	require.NoError(t, e.svc.initializeQuotaPage(t.Context(), keys))
	require.Len(t, payloads(), n)
	// A new plugin revision starts a new generation and is announced.
	created, err := store.EnsureAccountQuota(t.Context(), e.db.Pool, id, "another-revision", true)
	require.NoError(t, err)
	require.True(t, created)
	e.svc.quotaChanged(t.Context(), id)
	snaps, err = e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Greater(t, snaps[id].Generation, first)
}

// TestQuotaMirrorAcrossNodes: two nodes share the database and the bus; a
// write on one is read by the other, and the quota message leaves the other
// node's directory snapshots alone.
func TestQuotaMirrorAcrossNodes(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "nodes-mirror", "sk-good-key-123", true)
	generation := quotaObservationGeneration(t, e, id)
	other := New(Deps{DB: e.db, Registry: e.reg, Bus: e.bus, Events: dbEvents{}})
	defer other.watchChanges(t.Context())()
	snaps, err := other.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Nil(t, quotaWindow(snaps[id], "7d_fable"))
	other.cacheMu.Lock()
	other.groups[1] = groupSnap{at: time.Now()}
	epoch := other.epoch
	other.cacheMu.Unlock()

	require.NoError(t, e.svc.ApplyAccountQuotaObservation(t.Context(), id, generation,
		&pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "7d_fable", Utilization: 100, Status: "rejected"}}}))
	snaps, err = other.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Equal(t, "rejected", quotaWindow(snaps[id], "7d_fable").GetStatus())
	other.cacheMu.Lock()
	require.Len(t, other.groups, 1, "a quota write keeps the other node's directory snapshots")
	require.Equal(t, epoch, other.epoch)
	other.cacheMu.Unlock()

	// An account change reaches the other node's directory and mirror.
	_, err = e.db.Pool.Exec(t.Context(), `UPDATE accounts SET credentials_enc=$2 WHERE id=$1`, id, []byte("re-authorized"))
	require.NoError(t, err)
	e.svc.changed(t.Context(), id)
	snaps, err = other.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Greater(t, snaps[id].Generation, generation)
	other.cacheMu.Lock()
	require.Empty(t, other.groups)
	other.cacheMu.Unlock()
}

// TestQuotaMirrorReloadScope: the full reload covers every account not
// deleted of the types declaring modelAvailability, rows or not, and drops
// what it no longer covers.
func TestQuotaMirrorReloadScope(t *testing.T) {
	e := setup(t)
	e.gen.types[0].Type.ModelAvailability = true
	withRow := e.mkRawAccount("anthropic", "apikey", "scope-row", "sk-good-key-123", true)
	quotaObservationGeneration(t, e, withRow)
	noRow := e.mkRawAccount("anthropic", "apikey", "scope-none", "sk-good-key-123", false)
	relay := e.mkRawAccount("relay", "relay_key", "scope-relay", "sk-good-key-123", true)
	deleted := e.mkRawAccount("anthropic", "apikey", "scope-deleted", "sk-good-key-123", true)
	_, err := e.db.Pool.Exec(t.Context(), `UPDATE accounts SET deleted_at=now() WHERE id=$1`, deleted)
	require.NoError(t, err)
	require.Equal(t, []string{"anthropic/apikey"}, modelAvailabilityTypes(e.gen))

	m := newQuotaMirror(e.svc.readQuotas, e.svc.readAvailabilityQuotas)
	_, err = m.view(t.Context(), []int64{deleted}, -1) // cached, then no longer covered
	require.NoError(t, err)
	require.NoError(t, m.reload(t.Context()))
	m.mu.Lock()
	_, hasRow := m.entries[withRow]
	none := m.entries[noRow]
	_, hasRelay := m.entries[relay]
	_, hasDeleted := m.entries[deleted]
	m.mu.Unlock()
	require.True(t, hasRow)
	require.NotNil(t, none)
	require.True(t, none.has)
	require.Nil(t, none.snap, "a covered account without a row is a negative entry")
	require.False(t, hasRelay, "a type without modelAvailability is not loaded")
	require.False(t, hasDeleted, "a deleted account is dropped")

	// Served from memory: the database is not asked again.
	loads := 0
	m.load = func(ctx context.Context, ids []int64) (*store.QuotaRead, error) {
		loads++
		return e.db.ReadAccountQuotas(ctx, ids)
	}
	v, err := m.view(t.Context(), []int64{withRow, noRow}, m.staleWait)
	require.NoError(t, err)
	require.NotNil(t, v.Snapshots[withRow])
	require.Nil(t, v.Snapshots[noRow])
	require.Zero(t, loads)
}

// TestQuotaMirrorQuotaWriteKeepsDirectory: a passive quota write on this node
// no longer drops the directory snapshots (MODEL-AVAILABILITY-PRECHECK-DESIGN
// §7), and tells the other nodes with a quota message.
func TestQuotaMirrorQuotaWriteKeepsDirectory(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "passive", "sk-good-key-123", true)
	payloads := e.recordAccountChanges()
	e.svc.cacheMu.Lock()
	e.svc.groups[1] = groupSnap{at: time.Now()}
	epoch := e.svc.epoch
	e.svc.cacheMu.Unlock()
	e.svc.quota.observe(id, map[string]store.QuotaWindow{"5h": {Utilization: 10}}, time.Now())
	e.svc.quota.flush(t.Context(), true) // or the recorder's own flush
	waitUntil(t, "passive write", func() bool { return len(payloads()) == 1 })
	stored, err := e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.NotNil(t, stored)
	var m map[string]any
	require.NoError(t, json.Unmarshal([]byte(payloads()[0]), &m))
	require.Equal(t, "quota", m["kind"])
	require.EqualValues(t, id, m["account_id"])
	e.svc.cacheMu.Lock()
	defer e.svc.cacheMu.Unlock()
	require.Len(t, e.svc.groups, 1)
	require.Equal(t, epoch, e.svc.epoch)
}

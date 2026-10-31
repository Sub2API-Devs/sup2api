package audit

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// AuditPluginWrite never waits on the database: while audit_logs is locked
// it returns at once, a full queue drops (and counts) rows, and the queued
// rows are written once the lock goes (CONTRACTS §75.2).
func TestPluginWritesDoNotBlockTheCaller(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	w := &PluginWrites{DB: db, QueueSize: 1}
	write := func(path string) time.Duration {
		start := time.Now()
		w.AuditPluginWrite(ctx, core.PluginWrite{Plugin: "demo", Method: "POST", Path: path, Status: 200, Body: []byte(`{"a":1}`)})
		return time.Since(start)
	}

	tx, err := db.Pool.Begin(ctx)
	require.NoError(t, err)
	_, err = tx.Exec(ctx, `LOCK TABLE audit_logs IN ACCESS EXCLUSIVE MODE`)
	require.NoError(t, err)

	assert.Less(t, write("/1"), time.Second)
	// The writer took /1 and waits on the lock; /2 fills the queue.
	require.Eventually(t, func() bool { return len(w.queue) == 0 }, 5*time.Second, 5*time.Millisecond)
	assert.Less(t, write("/2"), time.Second)
	assert.Less(t, write("/3"), time.Second)
	assert.Equal(t, int64(1), w.Dropped(), "the full queue drops /3")

	fctx, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
	assert.False(t, w.Flush(fctx), "flush cannot finish while the table is locked")
	cancel()
	require.NoError(t, tx.Rollback(ctx))
	fctx, cancel = context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	require.True(t, w.Flush(fctx))

	var paths []string
	rows, err := db.Pool.Query(ctx, `SELECT detail->>'path' FROM audit_logs WHERE action = $1 ORDER BY id`, ActionPluginWrite)
	require.NoError(t, err)
	for rows.Next() {
		var p string
		require.NoError(t, rows.Scan(&p))
		paths = append(paths, p)
	}
	require.NoError(t, rows.Err())
	assert.Equal(t, []string{"/1", "/2"}, paths)
}

// Run, when stopped, writes what is still queued before it returns.
func TestPluginWritesRunDrainsOnStop(t *testing.T) {
	db := testutil.DB(t)
	ctx, cancel := context.WithCancel(context.Background())
	w := &PluginWrites{DB: db}
	done := make(chan struct{})
	go func() {
		defer close(done)
		w.Run(ctx)
	}()
	w.AuditPluginWrite(ctx, core.PluginWrite{Plugin: "demo", Method: "DELETE", Path: "/x", Status: 204})
	cancel()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatal("Run did not return")
	}
	var n int
	require.NoError(t, db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE action = $1`, ActionPluginWrite).Scan(&n))
	assert.Equal(t, 1, n)
}

package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestAccountQuota(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping database test in short mode")
	}
	ctx := context.Background()
	db := testutil.DB(t)
	id := createTestAccount(t, db)

	q, err := db.AccountQuota(ctx, id)
	require.NoError(t, err)
	assert.Nil(t, q, "no snapshot yet")

	reset := time.Now().Add(2 * time.Hour).UTC().Truncate(time.Second)
	require.NoError(t, db.SaveAccountQuota(ctx, id, store.QuotaPassive, map[string]store.QuotaWindow{
		"5h": {Utilization: 42, ResetsAt: &reset, Status: "allowed"},
		"7d": {Utilization: 10},
	}))
	q, err = db.AccountQuota(ctx, id)
	require.NoError(t, err)
	require.NotNil(t, q)
	assert.Equal(t, store.QuotaPassive, q.Source)
	assert.NotNil(t, q.UpdatedAt)
	assert.NotNil(t, q.LastPassiveAt)
	assert.Nil(t, q.LastActiveAt)
	assert.Equal(t, 42.0, q.Windows["5h"].Utilization)
	assert.True(t, q.Windows["5h"].ResetsAt.Equal(reset))

	// The first claim wins, a second one inside the floor loses.
	ok, err := db.ClaimAccountQuotaQuery(ctx, id, 30*time.Second)
	require.NoError(t, err)
	assert.True(t, ok)
	ok, err = db.ClaimAccountQuotaQuery(ctx, id, 30*time.Second)
	require.NoError(t, err)
	assert.False(t, ok)
	ok, err = db.ClaimAccountQuotaQuery(ctx, id, 0)
	require.NoError(t, err)
	assert.True(t, ok, "a zero floor always claims")

	require.NoError(t, db.SetAccountQuotaError(ctx, id, "transient: 503"))
	q, _ = db.AccountQuota(ctx, id)
	assert.Equal(t, "transient: 503", q.Error)
	assert.Equal(t, 42.0, q.Windows["5h"].Utilization, "an error keeps the windows")

	// An active sample merges by key and clears the error.
	require.NoError(t, db.SaveAccountQuota(ctx, id, store.QuotaActive, map[string]store.QuotaWindow{
		"5h":        {Utilization: 50},
		"7d_sonnet": {Utilization: 5},
	}))
	q, _ = db.AccountQuota(ctx, id)
	assert.Equal(t, store.QuotaActive, q.Source)
	assert.Equal(t, "", q.Error)
	assert.Len(t, q.Windows, 3)
	assert.Equal(t, 50.0, q.Windows["5h"].Utilization)
	assert.Equal(t, 10.0, q.Windows["7d"].Utilization)
	assert.NotNil(t, q.LastPassiveAt, "an active sample keeps last_passive_at")

	other := createTestAccount(t, db)
	all, err := db.AccountQuotas(ctx, []int64{id, other})
	require.NoError(t, err)
	assert.Len(t, all, 1)
	assert.NotNil(t, all[id])

	// A missing account is skipped, not an error.
	require.NoError(t, db.SaveAccountQuota(ctx, 1<<40, store.QuotaPassive, map[string]store.QuotaWindow{"5h": {}}))
	ok, err = db.ClaimAccountQuotaQuery(ctx, 1<<40, 30*time.Second)
	require.NoError(t, err)
	assert.False(t, ok)
}

var testAccountSeq int

// createTestAccount inserts a minimal account row and returns its id.
func createTestAccount(t *testing.T, db *store.DB) int64 {
	t.Helper()
	testAccountSeq++
	var id int64
	err := db.Pool.QueryRow(context.Background(), `INSERT INTO accounts (name, plugin_key, type, credentials_enc)
		VALUES ($1, 'test', 'test_type', $2) RETURNING id`,
		"quota-test-"+time.Now().Format("150405.000000")+"-"+string(rune('a'+testAccountSeq)), []byte("x")).Scan(&id)
	require.NoError(t, err)
	return id
}

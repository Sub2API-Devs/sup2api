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

	// AccountQuotasAt reads the same rows plus the database time of the read.
	var before time.Time
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT clock_timestamp()`).Scan(&before))
	at1, stamp, err := db.AccountQuotasAt(ctx, []int64{id, other})
	require.NoError(t, err)
	assert.Len(t, at1, 1)
	assert.Equal(t, all[id].Windows, at1[id].Windows)
	assert.Equal(t, id, at1[id].AccountID)
	assert.False(t, stamp.Before(before), "stamp %v before %v", stamp, before)
	none, stamp2, err := db.AccountQuotasAt(ctx, []int64{other})
	require.NoError(t, err)
	assert.Empty(t, none)
	assert.True(t, stamp2.After(stamp), "an account without a snapshot still gets the read time")
	empty, _, err := db.AccountQuotasAt(ctx, nil)
	require.NoError(t, err)
	assert.Empty(t, empty)

	// A missing account is skipped, not an error.
	require.NoError(t, db.SaveAccountQuota(ctx, 1<<40, store.QuotaPassive, map[string]store.QuotaWindow{"5h": {}}))
	ok, err = db.ClaimAccountQuotaQuery(ctx, 1<<40, 30*time.Second)
	require.NoError(t, err)
	assert.False(t, ok)
}

func TestQuotaManualRefreshWithoutCooldownPreservesLease(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	id := createTestAccount(t, db)
	require.NoError(t, store.EnsureAccountQuota(ctx, db.Pool, id, "v1", true))
	claim, err := db.LeaseAccountQuota(ctx, id, "v1", 0, time.Minute, true)
	require.NoError(t, err)
	require.NotNil(t, claim)
	busy, err := db.LeaseAccountQuota(ctx, id, "v1", 0, time.Minute, true)
	require.NoError(t, err)
	require.Nil(t, busy, "force must not bypass an active query lease")
	applied, err := db.CompleteAccountQuota(ctx, claim, map[string]store.QuotaWindow{"daily": {Utilization: 10}}, "", time.Now().Add(time.Minute))
	require.NoError(t, err)
	require.True(t, applied)
	limited, err := db.LeaseAccountQuota(ctx, id, "v1", 30*time.Second, time.Minute, true)
	require.NoError(t, err)
	require.Nil(t, limited, "a nonzero floor still applies")
	claim, err = db.LeaseAccountQuota(ctx, id, "v1", 0, time.Minute, true)
	require.NoError(t, err)
	require.NotNil(t, claim, "a completed refresh can be repeated immediately")
	released, err := db.ReleaseAccountQuotaQuery(ctx, claim, time.Now().Add(time.Minute))
	require.NoError(t, err)
	require.True(t, released)
	_, err = db.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET last_active_at=now()+interval '1 hour' WHERE account_id=$1`, id)
	require.NoError(t, err)
	claim, err = db.LeaseAccountQuota(ctx, id, "v1", 0, time.Minute, true)
	require.NoError(t, err)
	require.NotNil(t, claim, "force ignores elapsed time even with a future timestamp")
}

func TestQuotaLeaseFencesIdentityAndLateCompletion(t *testing.T) {
	ctx := t.Context()
	db := testutil.DB(t)
	id := createTestAccount(t, db)
	require.NoError(t, store.EnsureAccountQuota(ctx, db.Pool, id, "v1", true))
	claim, err := db.LeaseAccountQuota(ctx, id, "v1", 30*time.Second, time.Minute, false)
	require.NoError(t, err)
	require.NotNil(t, claim)
	other, err := db.LeaseAccountQuota(ctx, id, "v1", 0, time.Minute, true)
	require.NoError(t, err)
	require.Nil(t, other)
	_, err = db.Pool.Exec(ctx, `UPDATE accounts SET credentials_enc='new'::bytea WHERE id=$1`, id)
	require.NoError(t, err)
	ok, err := db.CompleteAccountQuota(ctx, claim, map[string]store.QuotaWindow{"daily": {Utilization: 100}}, "", time.Now().Add(time.Minute))
	require.NoError(t, err)
	require.False(t, ok)
	q, err := db.AccountQuota(ctx, id)
	require.NoError(t, err)
	require.Empty(t, q.Windows)
	require.Equal(t, "pending", q.RefreshStatus)
	_, err = db.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET last_active_at=now()-interval '31 seconds' WHERE account_id=$1`, id)
	require.NoError(t, err)
	claim, err = db.LeaseAccountQuota(ctx, id, "v1", 30*time.Second, time.Minute, true)
	require.NoError(t, err)
	require.NotNil(t, claim)
	_, err = db.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET lease_until=now()-interval '1 second' WHERE account_id=$1`, id)
	require.NoError(t, err)
	ok, err = db.CompleteAccountQuota(ctx, claim, nil, "late", time.Now())
	require.NoError(t, err)
	require.False(t, ok)
}

func TestQuotaClaimInvalidationAndManualControls(t *testing.T) {
	for _, change := range []string{"deleted", "disabled", "plugin_disabled", "plugin_revision", "name"} {
		t.Run(change, func(t *testing.T) {
			db := testutil.DB(t)
			ctx := t.Context()
			_, err := db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status) VALUES('test','{"en":"Test"}','enabled')`)
			require.NoError(t, err)
			id := createTestAccount(t, db)
			require.NoError(t, store.EnsureAccountQuota(ctx, db.Pool, id, "v1", true))
			claim, err := db.LeaseAccountQuota(ctx, id, "v1", 30*time.Second, time.Minute, false)
			require.NoError(t, err)
			require.NotNil(t, claim)
			switch change {
			case "deleted":
				_, err = db.Pool.Exec(ctx, `UPDATE accounts SET deleted_at=now() WHERE id=$1`, id)
			case "disabled":
				_, err = db.Pool.Exec(ctx, `UPDATE accounts SET status='disabled' WHERE id=$1`, id)
			case "plugin_disabled":
				_, err = db.Pool.Exec(ctx, `UPDATE plugins SET status='disabled' WHERE key='test'`)
			case "plugin_revision":
				err = store.EnsureAccountQuota(ctx, db.Pool, id, "v2", true)
			case "name":
				_, err = db.Pool.Exec(ctx, `UPDATE accounts SET name='renamed' WHERE id=$1`, id)
			}
			require.NoError(t, err)
			applied, err := db.CompleteAccountQuota(ctx, claim, map[string]store.QuotaWindow{"daily": {Utilization: 100}}, "", time.Now().Add(time.Minute))
			require.NoError(t, err)
			require.Equal(t, change == "name", applied)
		})
	}
}

func TestQuotaLegacyPassiveFreshness(t *testing.T) {
	for _, activeQuery := range []bool{false, true} {
		name := "headers_only"
		if activeQuery {
			name = "legacy_query"
		}
		t.Run(name, func(t *testing.T) {
			db := testutil.DB(t)
			ctx := t.Context()
			id := createTestAccount(t, db)
			if activeQuery {
				require.NoError(t, store.EnsureAccountQuota(ctx, db.Pool, id, "v1", false))
				require.NoError(t, db.SaveAccountQuota(ctx, id, store.QuotaActive, map[string]store.QuotaWindow{"daily": {Utilization: 5}}))
			}
			require.NoError(t, db.SaveAccountQuota(ctx, id, store.QuotaPassive, map[string]store.QuotaWindow{"daily": {Utilization: 10}}))
			before, err := db.AccountQuota(ctx, id)
			require.NoError(t, err)
			require.NotNil(t, before.UpdatedAt)
			_, err = db.Pool.Exec(ctx, `SELECT pg_sleep(0.005)`)
			require.NoError(t, err)
			require.NoError(t, db.SaveAccountQuota(ctx, id, store.QuotaPassive, map[string]store.QuotaWindow{"daily": {Utilization: 20}}))
			after, err := db.AccountQuota(ctx, id)
			require.NoError(t, err)
			require.True(t, after.UpdatedAt.After(*before.UpdatedAt))
			require.True(t, after.LastPassiveAt.After(*before.LastPassiveAt))
			require.Equal(t, store.QuotaPassive, after.Source)
			require.Equal(t, float64(20), after.Windows["daily"].Utilization)
		})
	}
}

func TestQuotaObservationGenerationAndFreshness(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	_, err := db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status,active_version) VALUES('test','{"en":"Test"}','enabled','v1')`)
	require.NoError(t, err)
	id := createTestAccount(t, db)
	require.NoError(t, store.EnsureAccountQuota(ctx, db.Pool, id, "v1", true))
	require.NoError(t, db.SaveAccountQuota(ctx, id, store.QuotaActive, map[string]store.QuotaWindow{"shared": {Utilization: 20}, "scoped": {Utilization: 10}}))
	require.NoError(t, db.SetAccountQuotaError(ctx, id, "active query failed"))
	_, err = db.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET updated_at=now()-interval '1 hour' WHERE account_id=$1`, id)
	require.NoError(t, err)
	before, err := db.AccountQuota(ctx, id)
	require.NoError(t, err)
	apply := func(generation int64, status string) (bool, error) {
		pct := float64(100)
		if status == "allowed" {
			pct = 0
		}
		return db.ApplyAccountQuotaObservation(ctx, id, generation, "test", "test_type", "v1", map[string]store.QuotaWindow{"scoped": {Utilization: pct, Status: status}}, nil)
	}
	for _, generation := range []int64{0, -1} {
		applied, err := apply(generation, "rejected")
		require.NoError(t, err)
		require.False(t, applied)
	}
	applied, err := apply(before.Generation, "rejected")
	require.NoError(t, err)
	require.True(t, applied)
	after, err := db.AccountQuota(ctx, id)
	require.NoError(t, err)
	require.Equal(t, before.UpdatedAt, after.UpdatedAt)
	require.Equal(t, "active query failed", after.Error)
	require.Equal(t, before.Windows["shared"], after.Windows["shared"])
	require.Equal(t, "rejected", after.Windows["scoped"].Status)
	require.NoError(t, store.ResetAccountQuota(ctx, db.Pool, id))
	require.NoError(t, db.SaveAccountQuota(ctx, id, store.QuotaActive, map[string]store.QuotaWindow{"shared": {Utilization: 40}, "scoped": {Utilization: 50, Status: "allowed"}}))
	fresh, err := db.AccountQuota(ctx, id)
	require.NoError(t, err)
	require.NotEqual(t, before.Generation, fresh.Generation)
	for _, status := range []string{"rejected", "allowed"} {
		applied, err := apply(before.Generation, status)
		require.NoError(t, err)
		require.False(t, applied)
	}
	after, err = db.AccountQuota(ctx, id)
	require.NoError(t, err)
	require.Equal(t, fresh, after)
	_, err = db.Pool.Exec(ctx, `DELETE FROM accounts WHERE id=$1`, id)
	require.NoError(t, err)
	applied, err = apply(fresh.Generation, "rejected")
	require.NoError(t, err)
	require.False(t, applied)
	after, err = db.AccountQuota(ctx, id)
	require.NoError(t, err)
	require.Nil(t, after)
}

func TestQuotaObservationRequiresCurrentIdentityAndEligibility(t *testing.T) {
	for _, change := range []string{"account_disabled", "deleted", "plugin_disabled", "plugin_version", "account_type", "plugin_missing"} {
		t.Run(change, func(t *testing.T) {
			db := testutil.DB(t)
			ctx := t.Context()
			_, err := db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status,active_version) VALUES('test','{"en":"Test"}','enabled','v1')`)
			require.NoError(t, err)
			id := createTestAccount(t, db)
			require.NoError(t, store.EnsureAccountQuota(ctx, db.Pool, id, "v1", true))
			switch change {
			case "account_disabled":
				_, err = db.Pool.Exec(ctx, `UPDATE accounts SET status='disabled' WHERE id=$1`, id)
			case "deleted":
				_, err = db.Pool.Exec(ctx, `UPDATE accounts SET deleted_at=now() WHERE id=$1`, id)
			case "plugin_disabled":
				_, err = db.Pool.Exec(ctx, `UPDATE plugins SET status='disabled' WHERE key='test'`)
			case "plugin_version":
				_, err = db.Pool.Exec(ctx, `UPDATE plugins SET active_version='v2' WHERE key='test'`)
			case "account_type":
				_, err = db.Pool.Exec(ctx, `UPDATE accounts SET type='other' WHERE id=$1`, id)
			case "plugin_missing":
				_, err = db.Pool.Exec(ctx, `DELETE FROM plugins WHERE key='test'`)
			}
			require.NoError(t, err)
			before, err := db.AccountQuota(ctx, id)
			require.NoError(t, err)
			applied, err := db.ApplyAccountQuotaObservation(ctx, id, before.Generation, "test", "test_type", "v1", map[string]store.QuotaWindow{"daily": {Utilization: 100}}, nil)
			require.NoError(t, err)
			require.False(t, applied)
			after, err := db.AccountQuota(ctx, id)
			require.NoError(t, err)
			require.Equal(t, before, after)
		})
	}
}

func TestQuotaReleasePreservesFactsAndFencesLease(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	id := createTestAccount(t, db)
	require.NoError(t, store.EnsureAccountQuota(ctx, db.Pool, id, "v1", true))
	require.NoError(t, db.SaveAccountQuota(ctx, id, store.QuotaPassive, map[string]store.QuotaWindow{"daily": {Utilization: 100, Status: "rejected"}}))
	require.NoError(t, db.SetAccountQuotaError(ctx, id, "previous error"))
	claim, err := db.LeaseAccountQuota(ctx, id, "v1", 30*time.Second, time.Minute, true)
	require.NoError(t, err)
	require.NotNil(t, claim)
	before, err := db.AccountQuota(ctx, id)
	require.NoError(t, err)
	next := time.Now().Add(3 * time.Minute).UTC().Truncate(time.Microsecond)
	released, err := db.ReleaseAccountQuotaQuery(ctx, claim, next)
	require.NoError(t, err)
	require.True(t, released)
	after, err := db.AccountQuota(ctx, id)
	require.NoError(t, err)
	require.True(t, after.NextCheckAt.Equal(next))
	after.NextCheckAt = before.NextCheckAt
	require.Equal(t, before, after)
	blocked, err := db.LeaseAccountQuota(ctx, id, "v1", 30*time.Second, time.Minute, true)
	require.NoError(t, err)
	require.Nil(t, blocked)
	_, err = db.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET last_active_at=now()-interval '31 seconds' WHERE account_id=$1`, id)
	require.NoError(t, err)
	current, err := db.LeaseAccountQuota(ctx, id, "v1", 30*time.Second, time.Minute, true)
	require.NoError(t, err)
	require.NotNil(t, current)
	released, err = db.ReleaseAccountQuotaQuery(ctx, claim, next)
	require.NoError(t, err)
	require.False(t, released)
	valid, err := db.AccountQuotaClaimValid(ctx, current)
	require.NoError(t, err)
	require.True(t, valid)
	require.NoError(t, store.ResetAccountQuota(ctx, db.Pool, id))
	released, err = db.ReleaseAccountQuotaQuery(ctx, current, next)
	require.NoError(t, err)
	require.False(t, released)
	fresh, err := db.LeaseAccountQuota(ctx, id, "v1", 0, time.Minute, true)
	require.NoError(t, err)
	require.NotNil(t, fresh)
	_, err = db.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET lease_until=now()-interval '1 second' WHERE account_id=$1`, id)
	require.NoError(t, err)
	released, err = db.ReleaseAccountQuotaQuery(ctx, fresh, next)
	require.NoError(t, err)
	require.False(t, released)
}

func TestQuotaObsoleteActiveResultPreservesNewerMetadata(t *testing.T) {
	for _, message := range []string{"", "obsolete failure", "unimplemented"} {
		t.Run("message="+message, func(t *testing.T) {
			db := testutil.DB(t)
			ctx := t.Context()
			_, err := db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status,active_version) VALUES('test','{"en":"Test"}','enabled','v1')`)
			require.NoError(t, err)
			id := createTestAccount(t, db)
			require.NoError(t, store.EnsureAccountQuota(ctx, db.Pool, id, "v1", true))
			require.NoError(t, db.SaveAccountQuota(ctx, id, store.QuotaActive, map[string]store.QuotaWindow{"shared": {Utilization: 20}}))
			_, err = db.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET next_check_at=now()+interval '1 hour' WHERE account_id=$1`, id)
			require.NoError(t, err)
			claim, err := db.LeaseAccountQuota(ctx, id, "v1", 30*time.Second, time.Minute, true)
			require.NoError(t, err)
			require.NotNil(t, claim)
			earlier := time.Now().Add(30 * time.Second).UTC().Truncate(time.Microsecond)
			applied, err := db.ApplyAccountQuotaObservation(ctx, id, claim.Generation, "test", "test_type", "v1", map[string]store.QuotaWindow{"scoped": {Utilization: 100, Status: "rejected"}}, &earlier)
			require.NoError(t, err)
			require.True(t, applied)
			require.NoError(t, db.SetAccountQuotaError(ctx, id, "newer failure"))
			_, err = db.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET failures=4 WHERE account_id=$1`, id)
			require.NoError(t, err)
			before, err := db.AccountQuota(ctx, id)
			require.NoError(t, err)
			require.True(t, before.NextCheckAt.Equal(earlier))
			if message == "unimplemented" {
				applied, err = db.ReleaseAccountQuotaQuery(ctx, claim, time.Now().Add(3*time.Minute))
			} else {
				applied, err = db.CompleteAccountQuota(ctx, claim, map[string]store.QuotaWindow{"scoped": {Utilization: 0, Status: "allowed"}}, message, time.Now().Add(3*time.Minute))
			}
			require.NoError(t, err)
			require.True(t, applied)
			after, err := db.AccountQuota(ctx, id)
			require.NoError(t, err)
			require.Equal(t, before.NextCheckAt, after.NextCheckAt)
			require.Equal(t, before.Windows, after.Windows)
			require.Equal(t, before.UpdatedAt, after.UpdatedAt)
			require.Equal(t, before.Error, after.Error)
			require.Equal(t, before.RefreshStatus, after.RefreshStatus)
			var failures int
			var lease *time.Time
			require.NoError(t, db.Pool.QueryRow(ctx, `SELECT failures,lease_until FROM account_quota_snapshots WHERE account_id=$1`, id).Scan(&failures, &lease))
			require.Equal(t, 4, failures)
			require.Nil(t, lease)
		})
	}
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

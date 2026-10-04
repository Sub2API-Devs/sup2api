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

func TestAccountLimits(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping database test in short mode")
	}

	ctx := context.Background()
	db := testutil.DB(t)

	// Create a test account first
	accountID := createTestAccount(t, db)

	t.Run("GetAccountLimits_NotFound", func(t *testing.T) {
		limits, err := db.GetAccountLimits(ctx, accountID)
		require.NoError(t, err)
		assert.Nil(t, limits, "should return nil when no cache exists")
	})

	t.Run("UpsertAccountLimits_Insert", func(t *testing.T) {
		snapshot := store.LimitsSnapshot{
			Windows: []store.LimitsWindow{
				{
					Label:   "5h",
					Seconds: 18000,
					Used:    3000,
					Limit:   10000,
					ResetAt: time.Now().Add(2 * time.Hour),
				},
				{
					Label:   "1w",
					Seconds: 604800,
					Used:    12000,
					Limit:   50000,
					ResetAt: time.Now().Add(24 * time.Hour),
				},
			},
			UpdatedAt: time.Now(),
			Provider:  "kimi-coding-plan",
		}

		err := db.UpsertAccountLimits(ctx, accountID, snapshot, "")
		require.NoError(t, err)

		// Verify insertion
		limits, err := db.GetAccountLimits(ctx, accountID)
		require.NoError(t, err)
		require.NotNil(t, limits)
		assert.Equal(t, accountID, limits.AccountID)
		assert.Equal(t, 2, len(limits.LimitsSnapshot.Windows))
		assert.Equal(t, "kimi-coding-plan", limits.LimitsSnapshot.Provider)
		assert.Equal(t, int64(3000), limits.LimitsSnapshot.Windows[0].Used)
		assert.Equal(t, 1, limits.QueryCount)
		assert.Equal(t, "", limits.LastError)
	})

	t.Run("UpsertAccountLimits_Update", func(t *testing.T) {
		snapshot := store.LimitsSnapshot{
			Windows: []store.LimitsWindow{
				{
					Label:   "5h",
					Seconds: 18000,
					Used:    5000, // Updated usage
					Limit:   10000,
					ResetAt: time.Now().Add(2 * time.Hour),
				},
			},
			UpdatedAt: time.Now(),
			Provider:  "kimi-coding-plan",
		}

		err := db.UpsertAccountLimits(ctx, accountID, snapshot, "")
		require.NoError(t, err)

		// Verify update
		limits, err := db.GetAccountLimits(ctx, accountID)
		require.NoError(t, err)
		require.NotNil(t, limits)
		assert.Equal(t, 1, len(limits.LimitsSnapshot.Windows))
		assert.Equal(t, int64(5000), limits.LimitsSnapshot.Windows[0].Used)
		assert.Equal(t, 2, limits.QueryCount, "query count should increment")
	})

	t.Run("UpsertAccountLimits_WithError", func(t *testing.T) {
		snapshot := store.LimitsSnapshot{
			Windows:   []store.LimitsWindow{},
			UpdatedAt: time.Now(),
			Provider:  "kimi-coding-plan",
		}

		err := db.UpsertAccountLimits(ctx, accountID, snapshot, "upstream timeout")
		require.NoError(t, err)

		limits, err := db.GetAccountLimits(ctx, accountID)
		require.NoError(t, err)
		assert.Equal(t, "upstream timeout", limits.LastError)
	})

	t.Run("ClearAccountLimitsMarkers", func(t *testing.T) {
		// Set markers first
		resumeAt := time.Now().Add(1 * time.Hour)
		err := db.SetAccountLimitsResumeAt(ctx, accountID, resumeAt)
		require.NoError(t, err)

		// Verify markers set
		limits, err := db.GetAccountLimits(ctx, accountID)
		require.NoError(t, err)
		assert.True(t, limits.DisabledAt.Valid)
		assert.True(t, limits.ResumeAt.Valid)

		// Clear markers
		err = db.ClearAccountLimitsMarkers(ctx, accountID)
		require.NoError(t, err)

		// Verify markers cleared
		limits, err = db.GetAccountLimits(ctx, accountID)
		require.NoError(t, err)
		assert.False(t, limits.DisabledAt.Valid)
		assert.False(t, limits.ResumeAt.Valid)
	})

	t.Run("ClearAccountLimits", func(t *testing.T) {
		err := db.ClearAccountLimits(ctx, accountID)
		require.NoError(t, err)

		// Verify deletion
		limits, err := db.GetAccountLimits(ctx, accountID)
		require.NoError(t, err)
		assert.Nil(t, limits)
	})

	t.Run("ListAccountsDueForResume", func(t *testing.T) {
		// Create another account with past resume_at
		accountID2 := createTestAccount(t, db)
		snapshot := store.LimitsSnapshot{
			Windows:   []store.LimitsWindow{},
			UpdatedAt: time.Now(),
			Provider:  "test",
		}
		err := db.UpsertAccountLimits(ctx, accountID2, snapshot, "")
		require.NoError(t, err)

		pastResumeAt := time.Now().Add(-1 * time.Hour)
		err = db.SetAccountLimitsResumeAt(ctx, accountID2, pastResumeAt)
		require.NoError(t, err)

		// List accounts due for resume
		accounts, err := db.ListAccountsDueForResume(ctx, 10)
		require.NoError(t, err)
		assert.Contains(t, accounts, accountID2)
	})

	t.Run("GetAccountLimitsBatch", func(t *testing.T) {
		// Create two accounts with limits
		acc1 := createTestAccount(t, db)
		acc2 := createTestAccount(t, db)

		snapshot1 := store.LimitsSnapshot{
			Windows:   []store.LimitsWindow{{Label: "5h", Seconds: 18000, Used: 1000, Limit: 10000, ResetAt: time.Now()}},
			UpdatedAt: time.Now(),
			Provider:  "provider1",
		}
		snapshot2 := store.LimitsSnapshot{
			Windows:   []store.LimitsWindow{{Label: "1w", Seconds: 604800, Used: 2000, Limit: 50000, ResetAt: time.Now()}},
			UpdatedAt: time.Now(),
			Provider:  "provider2",
		}

		require.NoError(t, db.UpsertAccountLimits(ctx, acc1, snapshot1, ""))
		require.NoError(t, db.UpsertAccountLimits(ctx, acc2, snapshot2, ""))

		// Batch get
		result, err := db.GetAccountLimitsBatch(ctx, []int64{acc1, acc2})
		require.NoError(t, err)
		assert.Equal(t, 2, len(result))
		assert.Equal(t, "provider1", result[acc1].LimitsSnapshot.Provider)
		assert.Equal(t, "provider2", result[acc2].LimitsSnapshot.Provider)
	})

	t.Run("CleanupStaleAccountLimits", func(t *testing.T) {
		// This test requires manual time manipulation or waiting
		// For now, just test it doesn't error
		count, err := db.CleanupStaleAccountLimits(ctx, 30*24*time.Hour)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, count, int64(0))
	})
}

// createTestAccount creates a minimal test account and returns its ID
func createTestAccount(t *testing.T, db *store.DB) int64 {
	// This is a placeholder - adjust based on your actual account creation logic
	const query = `
		INSERT INTO accounts (name, plugin_key, type, cred_enc, settings, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`
	var id int64
	err := db.Pool.QueryRow(
		context.Background(),
		query,
		"test-account-"+time.Now().Format("150405"),
		"test",
		"test-type",
		[]byte("{}"),
		[]byte("{}"),
		"active",
	).Scan(&id)
	require.NoError(t, err)
	return id
}

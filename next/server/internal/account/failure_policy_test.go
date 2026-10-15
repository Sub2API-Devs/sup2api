package account

import (
	"github.com/stretchr/testify/require"
	"testing"
)

func TestFailurePolicyOwnsGlobalAutomaticDisable(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "policy", "unused", true)
	for _, enabled := range []bool{false, true} {
		_, err := e.db.Pool.Exec(t.Context(), `INSERT INTO settings(key,value) VALUES('failure_policy', jsonb_build_object('account_enabled',$1::boolean)) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, enabled)
		require.NoError(t, err)
		actual, err := automaticDisableEnabled(t.Context(), e.db.Pool)
		require.NoError(t, err)
		require.Equal(t, enabled, actual)
		disabled, err := e.svc.AutoDisable(t.Context(), id, "core policy")
		require.NoError(t, err)
		require.Equal(t, enabled, disabled)
	}
}

func TestFailurePolicyAuthorizedDisableRetainsSnapshotAndAccountOptOut(t *testing.T) {
	e := setup(t)
	_, err := e.db.Pool.Exec(t.Context(), `INSERT INTO settings(key,value) VALUES('failure_policy','{"account_enabled":false}')`)
	require.NoError(t, err)
	for _, allowed := range []bool{false, true} {
		id := e.mkRawAccount("anthropic", "apikey", "snapshot", "unused", true)
		_, err = e.db.Pool.Exec(t.Context(), `UPDATE accounts SET auto_disable=$2 WHERE id=$1`, id, allowed)
		require.NoError(t, err)
		disabled, err := e.svc.AutoDisable(t.Context(), id, "current global policy")
		require.NoError(t, err)
		require.False(t, disabled)
		disabled, err = e.svc.AutoDisableByPolicy(t.Context(), id, "previously authorized snapshot")
		require.NoError(t, err)
		require.Equal(t, allowed, disabled)
	}
}

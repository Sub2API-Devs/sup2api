package migrations

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMigration194CreatesWorkerScopedManagementAndLogTables(t *testing.T) {
	content, err := FS.ReadFile("194_worker_management.sql")
	require.NoError(t, err)
	sql := string(content)
	require.Contains(t, sql, "CREATE TABLE IF NOT EXISTS workers")
	require.Contains(t, sql, "management_key_encrypted TEXT NOT NULL")
	require.Contains(t, sql, "UNIQUE (remote_worker_id)")
	require.Contains(t, sql, "idx_workers_log_stream_key_unique")
	require.Contains(t, sql, "CREATE TABLE IF NOT EXISTS worker_accounts")
	require.Contains(t, sql, "worker_id BIGINT NOT NULL REFERENCES workers(id) ON DELETE CASCADE")
	require.Contains(t, sql, "UNIQUE (worker_id, remote_account_id)")
	require.Contains(t, sql, "CREATE TABLE IF NOT EXISTS worker_logs")
	require.Contains(t, sql, "UNIQUE (worker_id, event_id)")
	require.Contains(t, sql, "idx_worker_logs_worker_id")
}

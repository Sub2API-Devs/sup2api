package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
)

type workerRepository struct {
	db *sql.DB
}

func NewWorkerRepository(db *sql.DB) service.WorkerRepository {
	return &workerRepository{db: db}
}

func (r *workerRepository) CreateWorker(ctx context.Context, worker *service.Worker) error {
	if r == nil || r.db == nil || worker == nil {
		return errors.New("worker repository is unavailable")
	}
	return r.db.QueryRowContext(ctx, `
INSERT INTO workers (
  name, base_url, management_key_encrypted, remote_worker_id, instance_id,
  protocol_version, version, status, enabled, log_stream_key, last_seen_at, last_error,
  heartbeat_interval_seconds, heartbeat_timeout_seconds
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
RETURNING id, created_at, updated_at`,
		worker.Name, worker.BaseURL, worker.ManagementKeyCipher, worker.RemoteWorkerID,
		worker.InstanceID, worker.ProtocolVersion, worker.Version, worker.Status,
		worker.Enabled, worker.LogStreamKey, worker.LastSeenAt, worker.LastError,
		worker.HeartbeatIntervalSeconds, worker.HeartbeatTimeoutSeconds,
	).Scan(&worker.ID, &worker.CreatedAt, &worker.UpdatedAt)
}

func (r *workerRepository) ListWorkers(ctx context.Context) ([]service.Worker, error) {
	rows, err := r.db.QueryContext(ctx, workerSelect+` ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	workers := make([]service.Worker, 0)
	for rows.Next() {
		worker, err := scanWorker(rows)
		if err != nil {
			return nil, err
		}
		workers = append(workers, *worker)
	}
	return workers, rows.Err()
}

func (r *workerRepository) GetWorker(ctx context.Context, id int64) (*service.Worker, error) {
	worker, err := scanWorker(r.db.QueryRowContext(ctx, workerSelect+` WHERE w.id=$1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return worker, err
}

func (r *workerRepository) GetWorkerByRemoteID(ctx context.Context, remoteID string) (*service.Worker, error) {
	worker, err := scanWorker(r.db.QueryRowContext(ctx, workerSelect+` WHERE w.remote_worker_id=$1`, remoteID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return worker, err
}

func (r *workerRepository) DeleteWorker(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM workers WHERE id=$1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err == nil && rows == 0 {
		return service.ErrWorkerNotFound
	}
	return err
}

func (r *workerRepository) UpdateWorker(ctx context.Context, worker *service.Worker, updateEnabled bool) error {
	if worker == nil {
		return errors.New("nil worker")
	}
	result, err := r.db.ExecContext(ctx, `
UPDATE workers SET
  name=$2, base_url=$3, management_key_encrypted=$4,
  enabled=CASE WHEN $8 THEN $5 ELSE enabled END,
  heartbeat_interval_seconds=$6, heartbeat_timeout_seconds=$7,
  status=CASE
    WHEN NOT $8 THEN status
    WHEN NOT $5 THEN 'disabled'
    WHEN enabled THEN status
    ELSE 'unknown'
  END,
  last_error=CASE WHEN $8 AND $5 AND NOT enabled THEN NULL ELSE last_error END,
  updated_at=NOW()
WHERE id=$1`, worker.ID, worker.Name, worker.BaseURL, worker.ManagementKeyCipher,
		worker.Enabled, worker.HeartbeatIntervalSeconds, worker.HeartbeatTimeoutSeconds, updateEnabled)
	return workerMutationResult(result, err)
}

func (r *workerRepository) SetWorkerEnabled(ctx context.Context, id int64, enabled bool) error {
	result, err := r.db.ExecContext(ctx, `
UPDATE workers SET
  enabled=$2,
  status=CASE WHEN NOT $2 THEN 'disabled' WHEN enabled THEN status ELSE 'unknown' END,
  last_error=CASE WHEN $2 AND NOT enabled THEN NULL ELSE last_error END,
  updated_at=NOW()
WHERE id=$1`, id, enabled)
	return workerMutationResult(result, err)
}

func (r *workerRepository) ListWorkersDueHeartbeat(ctx context.Context, now time.Time, limit int) ([]service.Worker, error) {
	if limit <= 0 {
		limit = 64
	}
	rows, err := r.db.QueryContext(ctx, workerSelect+`
 WHERE w.enabled=TRUE
   AND (w.last_heartbeat_at IS NULL OR w.last_heartbeat_at + (w.heartbeat_interval_seconds * INTERVAL '1 second') <= $1)
 ORDER BY w.last_heartbeat_at NULLS FIRST, w.id
 LIMIT $2`, now, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	workers := make([]service.Worker, 0)
	for rows.Next() {
		worker, scanErr := scanWorker(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		workers = append(workers, *worker)
	}
	return workers, rows.Err()
}

func (r *workerRepository) UpdateWorkerHeartbeat(ctx context.Context, id int64, observation service.WorkerHeartbeatObservation) error {
	result, err := r.db.ExecContext(ctx, `
UPDATE workers SET
  instance_id=CASE WHEN $2='' THEN instance_id ELSE $2 END,
  protocol_version=CASE WHEN $3='' THEN protocol_version ELSE $3 END,
  version=CASE WHEN $4='' THEN version ELSE $4 END,
  status=CASE WHEN enabled THEN $5 ELSE 'disabled' END,
  last_heartbeat_at=NOW(),
  last_heartbeat_latency_ms=$6,
  consecutive_failures=CASE WHEN $7 THEN 0 ELSE consecutive_failures + 1 END,
  last_seen_at=CASE WHEN $7 THEN NOW() ELSE last_seen_at END,
  last_error=$8,
  updated_at=NOW()
WHERE id=$1`, id, observation.Identity.InstanceID, observation.Identity.ProtocolVersion,
		observation.Identity.Version, observation.Status, observation.LatencyMS,
		observation.Reachable, observation.LastError)
	return workerMutationResult(result, err)
}

func (r *workerRepository) UpsertWorkerAccount(ctx context.Context, account *service.WorkerAccount) error {
	if account == nil {
		return errors.New("nil worker account")
	}
	metadata, err := json.Marshal(account.Metadata)
	if err != nil {
		return err
	}
	return r.db.QueryRowContext(ctx, `
INSERT INTO worker_accounts (worker_id, remote_account_id, name, kind, status, metadata)
VALUES ($1,$2,$3,$4,$5,$6::jsonb)
ON CONFLICT (worker_id, remote_account_id) DO UPDATE SET
  name=EXCLUDED.name, kind=EXCLUDED.kind, status=EXCLUDED.status,
  metadata=EXCLUDED.metadata, updated_at=NOW()
RETURNING id, created_at, updated_at`, account.WorkerID, account.RemoteAccountID,
		account.Name, account.Kind, account.Status, string(metadata),
	).Scan(&account.ID, &account.CreatedAt, &account.UpdatedAt)
}

func (r *workerRepository) ListWorkerAccounts(ctx context.Context, workerID int64) ([]service.WorkerAccount, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, worker_id, remote_account_id, name, kind, status, metadata, created_at, updated_at
FROM worker_accounts WHERE worker_id=$1 ORDER BY id DESC`, workerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]service.WorkerAccount, 0)
	for rows.Next() {
		var item service.WorkerAccount
		var metadata []byte
		if err := rows.Scan(&item.ID, &item.WorkerID, &item.RemoteAccountID, &item.Name,
			&item.Kind, &item.Status, &metadata, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(metadata, &item.Metadata)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *workerRepository) DeleteWorkerAccount(ctx context.Context, workerID int64, remoteAccountID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM worker_accounts WHERE worker_id=$1 AND remote_account_id=$2`, workerID, remoteAccountID)
	return err
}

func (r *workerRepository) DeleteWorkerAccountsExcept(ctx context.Context, workerID int64, keepRemoteIDs []string) error {
	return r.deleteWorkerChildrenExcept(ctx, "worker_accounts", "remote_account_id", workerID, keepRemoteIDs)
}

func (r *workerRepository) UpsertWorkerProxy(ctx context.Context, proxy *service.WorkerProxy) error {
	if proxy == nil {
		return errors.New("nil worker proxy")
	}
	metadata, err := json.Marshal(proxy.Metadata)
	if err != nil {
		return err
	}
	return r.db.QueryRowContext(ctx, `
INSERT INTO worker_proxies (worker_id, remote_proxy_id, name, protocol, host, port, status, metadata)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
ON CONFLICT (worker_id, remote_proxy_id) DO UPDATE SET
  name=EXCLUDED.name, protocol=EXCLUDED.protocol, host=EXCLUDED.host, port=EXCLUDED.port,
  status=EXCLUDED.status, metadata=EXCLUDED.metadata, updated_at=NOW()
RETURNING id, created_at, updated_at`, proxy.WorkerID, proxy.RemoteProxyID,
		proxy.Name, proxy.Protocol, proxy.Host, proxy.Port, proxy.Status, string(metadata),
	).Scan(&proxy.ID, &proxy.CreatedAt, &proxy.UpdatedAt)
}

func (r *workerRepository) ListWorkerProxies(ctx context.Context, workerID int64) ([]service.WorkerProxy, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, worker_id, remote_proxy_id, name, protocol, host, port, status, metadata, created_at, updated_at
FROM worker_proxies WHERE worker_id=$1 ORDER BY id DESC`, workerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]service.WorkerProxy, 0)
	for rows.Next() {
		var item service.WorkerProxy
		var metadata []byte
		if err := rows.Scan(&item.ID, &item.WorkerID, &item.RemoteProxyID, &item.Name,
			&item.Protocol, &item.Host, &item.Port, &item.Status, &metadata, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(metadata, &item.Metadata)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *workerRepository) DeleteWorkerProxy(ctx context.Context, workerID int64, remoteProxyID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM worker_proxies WHERE worker_id=$1 AND remote_proxy_id=$2`, workerID, remoteProxyID)
	return err
}

func (r *workerRepository) DeleteWorkerProxiesExcept(ctx context.Context, workerID int64, keepRemoteIDs []string) error {
	return r.deleteWorkerChildrenExcept(ctx, "worker_proxies", "remote_proxy_id", workerID, keepRemoteIDs)
}

func (r *workerRepository) deleteWorkerChildrenExcept(ctx context.Context, table, remoteColumn string, workerID int64, keepRemoteIDs []string) error {
	if r == nil || r.db == nil {
		return errors.New("worker repository is unavailable")
	}
	if len(keepRemoteIDs) == 0 {
		_, err := r.db.ExecContext(ctx, fmt.Sprintf(`DELETE FROM %s WHERE worker_id=$1`, table), workerID)
		return err
	}
	args := make([]any, 0, len(keepRemoteIDs)+1)
	args = append(args, workerID)
	placeholders := make([]string, 0, len(keepRemoteIDs))
	for _, remoteID := range keepRemoteIDs {
		args = append(args, remoteID)
		placeholders = append(placeholders, fmt.Sprintf("$%d", len(args)))
	}
	query := fmt.Sprintf(
		`DELETE FROM %s WHERE worker_id=$1 AND %s NOT IN (%s)`,
		table, remoteColumn, strings.Join(placeholders, ","),
	)
	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

func (r *workerRepository) InsertWorkerLog(ctx context.Context, log *service.WorkerLog) error {
	if log == nil {
		return errors.New("nil worker log")
	}
	payload, err := json.Marshal(log.Payload)
	if err != nil {
		return err
	}
	err = r.db.QueryRowContext(ctx, `
INSERT INTO worker_logs (
  worker_id, event_id, event_type, instance_id, request_id, channel_id,
  model_name, worker_created_at, payload
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
ON CONFLICT (worker_id, event_id) DO NOTHING
RETURNING id, consumed_at`, log.WorkerID, log.EventID, log.EventType,
		log.InstanceID, log.RequestID, log.ChannelID, log.ModelName,
		log.WorkerCreatedAt, string(payload),
	).Scan(&log.ID, &log.ConsumedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	return err
}

func (r *workerRepository) ListWorkerLogs(ctx context.Context, workerID int64, limit int, beforeID int64) ([]service.WorkerLog, error) {
	query := `
SELECT id, worker_id, event_id, event_type, instance_id, request_id, channel_id,
       model_name, worker_created_at, payload, consumed_at
FROM worker_logs WHERE worker_id=$1`
	args := []any{workerID}
	if beforeID > 0 {
		query += ` AND id < $2`
		args = append(args, beforeID)
	}
	query += fmt.Sprintf(` ORDER BY id DESC LIMIT $%d`, len(args)+1)
	args = append(args, limit)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]service.WorkerLog, 0, limit)
	for rows.Next() {
		var item service.WorkerLog
		var payload []byte
		if err := rows.Scan(&item.ID, &item.WorkerID, &item.EventID, &item.EventType,
			&item.InstanceID, &item.RequestID, &item.ChannelID, &item.ModelName,
			&item.WorkerCreatedAt, &payload, &item.ConsumedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(payload, &item.Payload)
		items = append(items, item)
	}
	return items, rows.Err()
}

const workerSelect = `
SELECT w.id, w.name, w.base_url, w.management_key_encrypted, w.remote_worker_id, w.instance_id,
       w.protocol_version, w.version, w.status, w.enabled, w.log_stream_key, w.last_seen_at,
       w.last_heartbeat_at, w.last_heartbeat_latency_ms, w.consecutive_failures,
       w.heartbeat_interval_seconds, w.heartbeat_timeout_seconds,
       (SELECT COUNT(*) FROM worker_accounts wa WHERE wa.worker_id=w.id) AS account_count,
       (SELECT COUNT(*) FROM worker_proxies wp WHERE wp.worker_id=w.id) AS proxy_count,
       (SELECT COUNT(*) FROM usage_logs ul WHERE ul.data_plane_id=w.remote_worker_id) AS log_count,
       w.last_error, w.created_at, w.updated_at
FROM workers w`

type workerRowScanner interface {
	Scan(...any) error
}

func scanWorker(row workerRowScanner) (*service.Worker, error) {
	var worker service.Worker
	var lastSeen sql.NullTime
	var lastHeartbeat sql.NullTime
	var lastError sql.NullString
	err := row.Scan(&worker.ID, &worker.Name, &worker.BaseURL, &worker.ManagementKeyCipher,
		&worker.RemoteWorkerID, &worker.InstanceID, &worker.ProtocolVersion, &worker.Version,
		&worker.Status, &worker.Enabled, &worker.LogStreamKey, &lastSeen, &lastHeartbeat,
		&worker.LastHeartbeatLatencyMS, &worker.ConsecutiveFailures,
		&worker.HeartbeatIntervalSeconds, &worker.HeartbeatTimeoutSeconds,
		&worker.AccountCount, &worker.ProxyCount, &worker.LogCount, &lastError,
		&worker.CreatedAt, &worker.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if lastSeen.Valid {
		value := lastSeen.Time
		worker.LastSeenAt = &value
	}
	if lastHeartbeat.Valid {
		value := lastHeartbeat.Time
		worker.LastHeartbeatAt = &value
	}
	if lastError.Valid {
		value := lastError.String
		worker.LastError = &value
	}
	return &worker, nil
}

func workerMutationResult(result sql.Result, err error) error {
	if err != nil {
		return err
	}
	rows, rowsErr := result.RowsAffected()
	if rowsErr != nil {
		return rowsErr
	}
	if rows == 0 {
		return service.ErrWorkerNotFound
	}
	return nil
}

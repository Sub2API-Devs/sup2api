package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

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
  protocol_version, version, status, log_stream_key, last_seen_at, last_error
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
RETURNING id, created_at, updated_at`,
		worker.Name, worker.BaseURL, worker.ManagementKeyCipher, worker.RemoteWorkerID,
		worker.InstanceID, worker.ProtocolVersion, worker.Version, worker.Status,
		worker.LogStreamKey, worker.LastSeenAt, worker.LastError,
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
	worker, err := scanWorker(r.db.QueryRowContext(ctx, workerSelect+` WHERE id=$1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return worker, err
}

func (r *workerRepository) GetWorkerByRemoteID(ctx context.Context, remoteID string) (*service.Worker, error) {
	worker, err := scanWorker(r.db.QueryRowContext(ctx, workerSelect+` WHERE remote_worker_id=$1`, remoteID))
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
		return errors.New("worker not found")
	}
	return err
}

func (r *workerRepository) UpdateWorkerObservation(ctx context.Context, id int64, identity service.WorkerIdentity, status string, lastError *string) error {
	_, err := r.db.ExecContext(ctx, `
UPDATE workers SET
  instance_id=CASE WHEN $2='' THEN instance_id ELSE $2 END,
  protocol_version=CASE WHEN $3='' THEN protocol_version ELSE $3 END,
  version=CASE WHEN $4='' THEN version ELSE $4 END,
  status=$5, last_seen_at=NOW(), last_error=$6, updated_at=NOW()
WHERE id=$1`, id, identity.InstanceID, identity.ProtocolVersion, identity.Version, status, lastError)
	return err
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
	if r == nil || r.db == nil {
		return errors.New("worker repository is unavailable")
	}
	if len(keepRemoteIDs) == 0 {
		_, err := r.db.ExecContext(ctx, `DELETE FROM worker_accounts WHERE worker_id=$1`, workerID)
		return err
	}
	// Build a parameterized NOT IN list so a remote account list sync cannot
	// leave deleted Worker-local accounts visible in the control-plane index.
	args := make([]any, 0, len(keepRemoteIDs)+1)
	args = append(args, workerID)
	placeholders := make([]string, 0, len(keepRemoteIDs))
	for _, remoteID := range keepRemoteIDs {
		args = append(args, remoteID)
		placeholders = append(placeholders, fmt.Sprintf("$%d", len(args)))
	}
	query := fmt.Sprintf(
		`DELETE FROM worker_accounts WHERE worker_id=$1 AND remote_account_id NOT IN (%s)`,
		strings.Join(placeholders, ","),
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
SELECT id, name, base_url, management_key_encrypted, remote_worker_id, instance_id,
       protocol_version, version, status, log_stream_key, last_seen_at, last_error,
       created_at, updated_at
FROM workers`

type workerRowScanner interface {
	Scan(...any) error
}

func scanWorker(row workerRowScanner) (*service.Worker, error) {
	var worker service.Worker
	var lastSeen sql.NullTime
	var lastError sql.NullString
	err := row.Scan(&worker.ID, &worker.Name, &worker.BaseURL, &worker.ManagementKeyCipher,
		&worker.RemoteWorkerID, &worker.InstanceID, &worker.ProtocolVersion, &worker.Version,
		&worker.Status, &worker.LogStreamKey, &lastSeen, &lastError,
		&worker.CreatedAt, &worker.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if lastSeen.Valid {
		value := lastSeen.Time
		worker.LastSeenAt = &value
	}
	if lastError.Valid {
		value := lastError.String
		worker.LastError = &value
	}
	return &worker, nil
}

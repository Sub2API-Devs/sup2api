package usage

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var _ core.AsyncTasks = (*Service)(nil)

func (s *Service) BeginTask(ctx context.Context, in core.TaskIntent) (string, error) {
	id := "s2task_" + uuid.NewString()
	_, err := s.db.Pool.Exec(ctx, `INSERT INTO task_submission_receipts
		(request_id, public_id, plugin_key, kind, user_id, api_key_id, group_id, account_id, model, protocol)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, in.RequestID, id, in.PluginKey, in.Kind,
		in.UserID, in.APIKeyID, in.GroupID, in.AccountID, in.Model, in.Protocol)
	return id, err
}

func (s *Service) ReceiveTask(ctx context.Context, requestID string, status int, body []byte, reason string) error {
	if len(body) > protocol.MaxTaskSnapshotBytes {
		body = nil
		reason = "response exceeds task receipt limit"
	}
	state := "received"
	if reason != "" {
		state = "uncertain"
	}
	_, err := s.db.Pool.Exec(ctx, `UPDATE task_submission_receipts SET state=$2, response_status=$3,
		response_body=COALESCE($4,response_body), last_error=$5 WHERE request_id=$1 AND state <> 'registered'`,
		requestID, state, status, body, trunc(reason, 2000))
	return err
}

// RegisterTask commits identity, initial observation, usage and optional debit
// together. The gateway cannot return a public ID before this succeeds.
func (s *Service) RegisterTask(ctx context.Context, in core.TaskRegistration) error {
	return s.registerTask(ctx, in, nil, nil, false)
}

func (s *Service) registerTask(ctx context.Context, in core.TaskRegistration, before func(pgx.Tx) error, after func(pgx.Tx) error, strict bool) error {
	r := in.Record
	if r == nil || r.AccountID == nil || in.PublicID == "" || in.UpstreamID == "" {
		return errors.New("invalid task registration")
	}
	if _, err := protocol.RewriteTaskID(in.Snapshot, in.IDPaths, in.UpstreamID, in.PublicID); err != nil {
		return err
	}
	cfg := s.reconcileSettings(ctx)
	now := time.Now()
	deadline := now.Add(cfg.clampDeadline(in.Deadline))
	next := now.Add(cfg.clampDelay(in.NextCheckAfter, 0))
	if next.After(deadline) {
		next = deadline
	}
	if r.Reservation != nil {
		r.Reservation.RefID = in.PublicID
	}
	_, err := s.insertAtomic(ctx, []*core.UsageRecord{r}, before, func(tx pgx.Tx, ids map[string]int64) error {
		uid, ok := ids[r.RequestID]
		if !ok {
			return errors.New("task request ID already registered")
		}
		// The receipt is the trusted dispatch identity; parsing cannot substitute it.
		var valid bool
		if err := tx.QueryRow(ctx, `SELECT public_id=$2 AND plugin_key=$3 AND kind=$4 AND user_id=$5
			AND api_key_id=$6 AND group_id=$7 AND account_id=$8 AND model=$9 AND protocol=$10
			FROM task_submission_receipts WHERE request_id=$1 AND state='received' FOR UPDATE`,
			r.RequestID, in.PublicID, r.PluginKey, in.Kind, r.UserID, r.APIKeyID, r.GroupID, *r.AccountID, r.Model, r.Protocol).Scan(&valid); err != nil {
			return err
		}
		if !valid {
			return errors.New("task receipt identity mismatch")
		}
		_, err := tx.Exec(ctx, `INSERT INTO async_tasks(public_id,plugin_key,kind,upstream_ref_id,user_id,api_key_id,
			group_id,account_id,model,protocol,usage_log_id,snapshot,snapshot_id_paths,next_check_at,deadline_at)
			VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, in.PublicID, r.PluginKey, in.Kind, in.UpstreamID,
			r.UserID, r.APIKeyID, r.GroupID, *r.AccountID, r.Model, r.Protocol, uid, in.Snapshot, jsonOr(in.IDPaths, "[]"), next, deadline)
		if err != nil {
			return err
		} // Identity collisions must never overwrite ownership.
		if _, err = tx.Exec(ctx, `UPDATE pending_settlements SET task_public_id=$2 WHERE usage_log_id=$1`, uid, in.PublicID); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE task_submission_receipts SET state='registered',response_body=NULL,last_error='',
			expires_at=LEAST(expires_at,$2) WHERE request_id=$1`, r.RequestID, deadline)
		if err == nil && after != nil {
			err = after(tx)
		}
		return err
	}, strict)
	if err != nil {
		return err
	}
	// A committed task follows the ordinary immediate settlement path when
	// its submission reported final usage without a reservation. Failure
	// queues billing for retry; it cannot turn registration into a failed
	// submission or cause the upstream task to be sent again.
	if !strict && initialStatus(r) == StatusPending {
		p := fromRecord(r)
		if err := s.settle(ctx, p, false); err != nil {
			s.markFailed(ctx, p, err)
		}
	}
	return nil
}

func (s *Service) FindTask(ctx context.Context, q core.TaskQuery) (*core.TaskSnapshot, error) {
	read := func() (*core.TaskSnapshot, error) {
		out := &core.TaskSnapshot{}
		var paths []byte
		rows, err := s.db.Pool.Query(ctx, `SELECT public_id,upstream_ref_id,model,state,
			CASE WHEN state='pending' AND deadline_at<=clock_timestamp() THEN 'abandoned' ELSE observation_status END,
			snapshot,snapshot_id_paths,failure_code,last_error
			FROM async_tasks WHERE plugin_key=$1 AND kind=$2 AND user_id=$3 AND group_id=$4
			AND (public_id=$5 OR (legacy_imported AND upstream_ref_id=$5 AND NOT starts_with($5,'s2task_')))
			ORDER BY public_id LIMIT 2`, q.PluginKey, q.Kind, q.UserID, q.GroupID, q.ID)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		if !rows.Next() {
			if rows.Err() != nil {
				return nil, rows.Err()
			}
			return nil, pgx.ErrNoRows
		}
		err = rows.Scan(&out.PublicID, &out.UpstreamID, &out.Model, &out.State, &out.ObservationStatus, &out.Body, &paths, &out.FailureCode, &out.FailureReason)
		if rows.Next() {
			return nil, core.ErrNotFound.WithMessage("task not found")
		}
		if rows.Err() != nil {
			return nil, rows.Err()
		}
		if err == nil {
			err = json.Unmarshal(paths, &out.IDPaths)
		}
		return out, err
	}
	out, err := read()
	if store.IsNoRows(err) && !strings.HasPrefix(q.ID, "s2task_") {
		if err = s.importLegacyTask(ctx, q); err == nil {
			out, err = read()
		}
	}
	if store.IsNoRows(err) {
		return nil, core.ErrNotFound.WithMessage("task not found")
	}
	return out, err
}

// Only core billing history establishes legacy ownership. Plugin tables may
// contain colliding upstream IDs and are deliberately never consulted.
func (s *Service) importLegacyTask(ctx context.Context, q core.TaskQuery) error {
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		// Lock the usage parent before its settlement, matching the legacy
		// financial path. An imported row cannot be settled by an old claim.
		var ownerUsage int64
		if err := tx.QueryRow(ctx, `SELECT u.id FROM pending_settlements p JOIN usage_logs u ON u.id=p.usage_log_id
			WHERE p.plugin_key=$1 AND p.ref_id=$2 AND u.user_id=$3 AND u.group_id=$4 AND u.protocol=$5 FOR UPDATE OF u`,
			q.PluginKey, q.ID, q.UserID, q.GroupID, q.SubmitProtocol).Scan(&ownerUsage); err != nil {
			return err
		}
		rows, err := tx.Query(ctx, `SELECT p.id,p.usage_log_id,p.account_id,u.model,u.api_key_id,p.next_check_at,p.deadline_at,
			p.created_at,p.task_public_id FROM pending_settlements p JOIN usage_logs u ON u.id=p.usage_log_id
			WHERE p.plugin_key=$1 AND p.ref_id=$2 AND u.user_id=$3 AND u.group_id=$4 AND u.protocol=$5
			FOR UPDATE OF p`, q.PluginKey, q.ID, q.UserID, q.GroupID, q.SubmitProtocol)
		if err != nil {
			return err
		}
		var pid, uid, key int64
		var aid *int64
		var model string
		var next, deadline, created time.Time
		var existing *string
		count := 0
		for rows.Next() {
			count++
			err = rows.Scan(&pid, &uid, &aid, &model, &key, &next, &deadline, &created, &existing)
			if err != nil {
				break
			}
		}
		rows.Close()
		if err != nil {
			return err
		}
		if err = rows.Err(); err != nil {
			return err
		}
		if count != 1 || aid == nil {
			return core.ErrNotFound.WithMessage("task not found")
		}
		if existing != nil {
			return nil
		}
		id := "s2task_" + uuid.NewString()
		// Already settled legacy rows still need an observation, without another debit.
		_, err = tx.Exec(ctx, `INSERT INTO async_tasks(public_id,plugin_key,kind,upstream_ref_id,user_id,api_key_id,group_id,
			account_id,model,protocol,usage_log_id,snapshot_id_paths,legacy_imported,next_check_at,deadline_at,created_at)
			VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13,$14,$15)`, id, q.PluginKey, q.Kind, q.ID, q.UserID, key, q.GroupID,
			*aid, model, q.SubmitProtocol, uid, jsonOr(q.IDPaths, "[]"), next, deadline, created)
		if err != nil {
			return err
		}
		// Importing into the managed scheduler must not reset query failures.
		if _, err = tx.Exec(ctx, `UPDATE async_tasks SET poll_failures=p.poll_failures,attempts=p.attempts
		FROM pending_settlements p WHERE async_tasks.public_id=$1 AND p.id=$2`, id, pid); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE pending_settlements SET task_public_id=$2 WHERE id=$1`, pid, id)
		return err
	})
}

func (s *Service) cleanTaskReceipts(ctx context.Context) {
	_, err := s.db.Pool.Exec(ctx, `DELETE FROM task_submission_receipts WHERE request_id IN
		(SELECT request_id FROM task_submission_receipts WHERE expires_at <= now() ORDER BY expires_at LIMIT 200)`)
	if err != nil {
		s.rec.log.Warn("task receipt cleanup failed", "err", err)
	}
}

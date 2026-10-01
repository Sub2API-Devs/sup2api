package usage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/jackc/pgx/v5"
)

var errExecutionDone = errors.New("execution already committed")

func (s *Service) BeginExecution(ctx context.Context, in core.ExecutionIntent) error {
	if in.ID == "" || in.RequestID == "" || in.AccountID == 0 {
		return errors.New("invalid execution identity")
	}
	_, err := s.db.Pool.Exec(ctx, `INSERT INTO plugin_executions(id,request_id,plugin_key,account_id,attempt,record,task_submit)
 VALUES($1,$2,$3,$4,$5,$6,$7)`, in.ID, in.RequestID, in.PluginKey, in.AccountID, in.Attempt, jsonOr(in.Record, "{}"), in.TaskSubmit)
	return err
}

func (s *Service) ObserveExecution(ctx context.Context, id string, rec *core.UsageRecord, observation []byte) error {
	if rec == nil || len(observation) > 512<<10 {
		return errors.New("invalid execution observation")
	}
	raw, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	if len(raw) > 512<<10 {
		return errors.New("execution facts exceed limit")
	}
	tag, err := s.db.Pool.Exec(ctx, `UPDATE plugin_executions SET state='observed',record=$2,observation=$3,updated_at=clock_timestamp()
 WHERE id=$1 AND state='intent' AND request_id=$4 AND account_id=$5`, id, raw, observation, rec.RequestID, rec.AccountID)
	if err == nil && tag.RowsAffected() != 1 {
		return errors.New("execution identity or state mismatch")
	}
	return err
}

func (s *Service) CommitExecution(ctx context.Context, in core.ExecutionCommit) (*pluginv1.ExecutionReceipt, error) {
	if in.Record == nil || in.Record.AccountID == nil || len(in.Digest) != 64 || (in.Operation != "usage" && in.Operation != "watch") {
		return nil, errors.New("invalid execution commit")
	}
	out := &pluginv1.ExecutionReceipt{}
	before := func(tx pgx.Tx) error {
		var state, op, digest, requestID, pluginKey string
		var accountID int64
		err := tx.QueryRow(ctx, `SELECT state,operation,digest,task_id,request_id,plugin_key,account_id FROM plugin_executions WHERE id=$1 FOR UPDATE`, in.ID).Scan(&state, &op, &digest, &out.TaskId, &requestID, &pluginKey, &accountID)
		if err != nil {
			return err
		}
		if requestID != in.Record.RequestID || pluginKey != in.Record.PluginKey || accountID != *in.Record.AccountID {
			return errors.New("execution identity mismatch")
		}
		if state == "committed" {
			if op != in.Operation || digest != in.Digest {
				return core.ErrConflict.WithMessage("execution facts already committed")
			}
			return errExecutionDone
		}
		if state != "observed" {
			return errors.New("execution has no durable observation")
		}
		return nil
	}
	after := func(tx pgx.Tx) error {
		if in.Task != nil {
			out.TaskId = in.Task.PublicID
		}
		_, err := tx.Exec(ctx, `UPDATE plugin_executions SET state='committed',operation=$2,digest=$3,task_id=$4,record=NULL,observation=NULL,updated_at=clock_timestamp() WHERE id=$1`, in.ID, in.Operation, in.Digest, out.TaskId)
		return err
	}
	var err error
	if in.Task != nil {
		if in.Operation != "watch" {
			return nil, errors.New("wrong execution operation")
		}
		in.Task.Record = in.Record
		err = s.registerTask(ctx, *in.Task, before, after, true)
	} else {
		if in.Operation != "usage" {
			return nil, errors.New("task registration required")
		}
		_, err = s.insertAtomic(ctx, []*core.UsageRecord{in.Record}, before, func(tx pgx.Tx, ids map[string]int64) error {
			if _, ok := ids[in.Record.RequestID]; !ok {
				return errors.New("usage identity already recorded")
			}
			return after(tx)
		}, true)
	}
	if errors.Is(err, errExecutionDone) {
		err = nil
	}
	if err != nil {
		return nil, err
	}
	return out, nil
}

// Recovery never replays network I/O. Only completed host observations may
// fall back to declarative facts; unobserved intents remain uncertain.
func (s *Service) recoverExecutions(ctx context.Context) error {
	rows, err := s.db.Pool.Query(ctx, `SELECT id,record FROM plugin_executions WHERE state='observed' AND NOT task_submit AND NOT EXISTS(SELECT 1 FROM task_submission_receipts t WHERE t.request_id=plugin_executions.request_id) AND updated_at<clock_timestamp()-interval '1 minute' ORDER BY updated_at LIMIT 100`)
	if err != nil {
		return err
	}
	type item struct {
		id  string
		raw []byte
	}
	var list []item
	for rows.Next() {
		var i item
		if err = rows.Scan(&i.id, &i.raw); err != nil {
			break
		}
		list = append(list, i)
	}
	rows.Close()
	if err != nil {
		return err
	}
	if err = rows.Err(); err != nil {
		return err
	}
	for _, i := range list {
		var r core.UsageRecord
		if err = json.Unmarshal(i.raw, &r); err != nil {
			s.deferExecutionRecovery(ctx, i.id, err)
			continue
		}
		// Tasks need their validated parser result; the durable submission
		// receipt remains available for repair instead of inventing an ID.
		var task bool
		if err = s.db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM task_submission_receipts WHERE request_id=$1)`, r.RequestID).Scan(&task); err != nil {
			return err
		}
		if task {
			continue
		}
		_, err = s.CommitExecution(ctx, core.ExecutionCommit{ID: i.id, Operation: "usage", Digest: fmt.Sprintf("%064x", 0), Record: &r})
		if err != nil && !errors.Is(err, core.ErrConflict) {
			s.deferExecutionRecovery(ctx, i.id, err)
		}
	}
	return s.cleanupExecutionReceipts(ctx)
}

func (s *Service) deferExecutionRecovery(ctx context.Context, id string, cause error) {
	slog.ErrorContext(ctx, "usage: execution recovery deferred", "execution_id", id, "err", cause)
	// Rotate failures behind other observations. A permanently unpriceable
	// record must not monopolize the oldest LIMIT batch on every sweep.
	_, _ = s.db.Pool.Exec(ctx, `UPDATE plugin_executions SET updated_at=clock_timestamp() WHERE id=$1 AND state='observed'`, id)
}

var _ core.ExecutionRecords = (*Service)(nil)

// Retention eligibility is seven days; bounded batches catch up without
// monopolizing the settlement retry worker or holding a long transaction.
func (s *Service) cleanupExecutionReceipts(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	for _, table := range []string{"plugin_executions", "plugin_monitor_receipts"} {
		for range 20 {
			if ctx.Err() != nil {
				return nil
			}
			tag, err := s.db.Pool.Exec(ctx, `DELETE FROM `+table+` WHERE id IN(SELECT id FROM `+table+` WHERE created_at<clock_timestamp()-interval '7 days' ORDER BY created_at LIMIT 1000)`)
			if err != nil {
				if ctx.Err() != nil {
					return nil
				}
				return err
			}
			if tag.RowsAffected() < 1000 {
				break
			}
		}
	}
	return nil
}

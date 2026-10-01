package usage

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sync/atomic"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"google.golang.org/protobuf/proto"
)

type monitorOutcome struct {
	ctx                context.Context
	id, digest, taskID string
	err                error
	done               bool
}

// outcomeTx adds the result receipt to the existing financial transaction.
// Its advisory lock serializes retries of this claim, before task→usage→pending.
func (s *Service) outcomeTx(ctx context.Context, e *settleEntry, fn func(pgx.Tx) error) error {
	m := e.monitor
	if m == nil {
		return s.db.Tx(ctx, fn)
	}
	ctx = m.ctx
	if err := ctx.Err(); err != nil {
		m.err = err
		return err
	}
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, "plugin-monitor:"+m.id); err != nil {
			return err
		}
		var digest string
		err := tx.QueryRow(ctx, `SELECT digest FROM plugin_monitor_receipts WHERE id=$1`, m.id).Scan(&digest)
		if err == nil {
			if digest != m.digest {
				return core.ErrConflict.WithMessage("monitor result already committed")
			}
			return nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if err = fn(tx); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `INSERT INTO plugin_monitor_receipts(id,digest,task_id) VALUES($1,$2,$3)`, m.id, m.digest, m.taskID)
		return err
	})
	m.err = err
	m.done = err == nil
	return err
}

func (s *Service) askMonitor(ctx context.Context, e *settleEntry, row *reservedRowState, client core.PlatformPlugin, entry *pluginv1.ReconcileEntry, acct *pluginv1.Account, proxyID *int64) (*pluginv1.ReconcileResult, error) {
	monitor, ok := client.(core.MonitorPlugin)
	if !ok {
		return nil, errors.New("platform.monitor.v1 has no Monitor implementation")
	}
	claimID := fmt.Sprintf("legacy:%d:%s", e.id, uuid.NewString())
	taskID := ""
	if e.task != nil {
		claimID = e.task.id + ":" + e.task.token
		taskID = e.task.id
	}
	var deferred atomic.Bool
	execute := func(ctx context.Context, in *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
		return s.fetchExecutionHTTP(ctx, in, proxyID, func(ctx context.Context) error {
			if s.rec.Limiter != nil {
				ok, err := s.rec.Limiter.TryHit(ctx, e.account, "monitor:"+row.p.RequestID)
				if err != nil || !ok {
					deferred.Store(true)
					return errTaskDeferred
				}
			}
			return nil
		})
	}
	report := func(ctx context.Context, in *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error) {
		if deferred.Load() {
			return nil, errTaskDeferred
		}
		if in.Result == nil {
			return nil, errors.New("missing monitor result")
		}
		raw, err := (proto.MarshalOptions{Deterministic: true}).Marshal(in.Result)
		if err != nil {
			return nil, err
		}
		if len(raw) > 512<<10 {
			return nil, errors.New("monitor result too large")
		}
		sum := sha256.Sum256(raw)
		e.monitor = &monitorOutcome{ctx: ctx, id: claimID, digest: hex.EncodeToString(sum[:]), taskID: taskID}
		defer func() { e.monitor = nil }()
		if err = s.applyMonitorResult(ctx, e, row, in.Result); err != nil {
			return nil, err
		}
		if !e.monitor.done {
			return nil, errors.New("monitor result was not committed")
		}
		e.reported = true
		return &pluginv1.ExecutionReceipt{TaskId: taskID}, nil
	}
	err := monitor.Monitor(ctx, &pluginv1.PollRequest{Entry: entry, Account: acct}, execute, report)
	if deferred.Load() && !e.reported {
		return nil, errTaskDeferred
	}
	return nil, err
}

func (s *Service) applyMonitorResult(ctx context.Context, e *settleEntry, row *reservedRowState, res *pluginv1.ReconcileResult) error {
	cfg := s.reconcileSettings(ctx)
	if s.handlePollResult(ctx, e, row, cfg, res) {
		return e.monitor.err
	}
	state := res.GetState()
	if state < pluginv1.ReconcileResult_PENDING || state > pluginv1.ReconcileResult_SETTLED_ESTIMATE {
		return errors.New("unknown monitor result state")
	}
	if e.task != nil {
		e.task.snapshot = nil
		if raw := []byte(res.TaskSnapshotJson); len(raw) > 0 {
			if _, err := protocol.RewriteTaskID(raw, e.task.paths, e.refID, e.task.id); err != nil {
				return err
			}
			e.task.snapshot = raw
		} else if state != pluginv1.ReconcileResult_PENDING {
			return errors.New("terminal monitor result missing snapshot")
		}
		if state == pluginv1.ReconcileResult_PENDING {
			s.rescheduleTask(ctx, e, cfg, time.Duration(res.NextCheckAfterSec)*time.Second, "", true)
			return e.monitor.err
		}
		if state == pluginv1.ReconcileResult_FAILED {
			e.task.state = "failed"
		} else {
			e.task.state = "succeeded"
		}
		if row.status != StatusReserved {
			s.finishTaskOnly(ctx, e, "closed")
			return e.monitor.err
		}
	} else if state == pluginv1.ReconcileResult_PENDING {
		next := time.Now().Add(cfg.clampDelay(time.Duration(res.NextCheckAfterSec)*time.Second, e.attempts+1))
		if next.After(e.deadlineAt) {
			next = e.deadlineAt
		}
		return s.outcomeTx(ctx, e, func(tx pgx.Tx) error {
			// Match legacy finance lock order and reject a row transferred to the
			// managed task table while this callback was running.
			var status string
			if err := tx.QueryRow(ctx, `SELECT billing_status FROM usage_logs WHERE id=$1 FOR UPDATE`, e.usageLogID).Scan(&status); err != nil {
				return err
			}
			if status != StatusReserved {
				return errNotPending
			}
			if err := lockLegacyOutcome(ctx, tx, e); err != nil {
				return err
			}
			tag, err := tx.Exec(ctx, `UPDATE pending_settlements SET attempts=attempts+1,poll_failures=0,next_check_at=$2,last_error='' WHERE id=$1 AND state='pending'`, e.id, next)
			if err == nil && tag.RowsAffected() != 1 {
				return errNotPending
			}
			return err
		})
	}
	switch state {
	case pluginv1.ReconcileResult_SETTLED:
		s.settleReconciled(ctx, e, row, res)
	case pluginv1.ReconcileResult_SETTLED_ESTIMATE:
		s.settleEstimate(ctx, e, row, res)
	case pluginv1.ReconcileResult_FAILED:
		s.refundFailed(ctx, e, row, res.Reason)
	}
	return e.monitor.err
}

package usage

import (
	"context"
	"errors"
	"fmt"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type taskClaim struct {
	id, token, kind, state     string
	snapshot                   []byte
	paths                      []string
	failureCode, failureReason string
}

var errTaskDeferred = errors.New("original task account is unavailable or busy")

func (s *Service) claimTasks(ctx context.Context, limit int) ([]*settleEntry, error) {
	rows, err := s.db.Pool.Query(ctx, `WITH claimed AS (
		UPDATE async_tasks t SET claim_token=$3,lease_until=now()+make_interval(secs=>$2)
		FROM (SELECT public_id FROM async_tasks WHERE observation_status='pending' AND next_check_at<=now()
			AND (lease_until IS NULL OR lease_until<=now()) ORDER BY next_check_at,public_id FOR UPDATE SKIP LOCKED LIMIT $1) due
		WHERE t.public_id=due.public_id RETURNING t.*)
		SELECT t.public_id,t.claim_token,t.kind,t.state,t.plugin_key,t.upstream_ref_id,t.usage_log_id,t.account_id,
			t.attempts,t.poll_failures,t.created_at,t.deadline_at,COALESCE(p.id,0)
		FROM claimed t LEFT JOIN pending_settlements p ON p.task_public_id=t.public_id`, limit, int(reconcileLease/time.Second), uuid.NewString())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*settleEntry
	for rows.Next() {
		e := &settleEntry{task: &taskClaim{}}
		if err := rows.Scan(&e.task.id, &e.task.token, &e.task.kind, &e.task.state, &e.pluginKey, &e.refID, &e.usageLogID, &e.accountID,
			&e.attempts, &e.pollFailures, &e.createdAt, &e.deadlineAt, &e.id); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Service) acquireTaskAccount(ctx context.Context, e *settleEntry) (context.Context, *pluginv1.Account, *int64, func(), error) {
	if e.accountID == nil {
		return ctx, nil, nil, nil, errTaskDeferred
	}
	a, err := s.rec.Accounts.Load(ctx, *e.accountID)
	if err != nil || a == nil || a.PluginKey != e.pluginKey || a.Status != "active" {
		return ctx, nil, nil, nil, errTaskDeferred
	}
	cooling, err := s.rec.Accounts.IsCoolingDown(ctx, a.ID)
	if err != nil || cooling {
		return ctx, nil, nil, nil, errTaskDeferred
	}
	release := func() {}
	ok := true
	if s.rec.Slots != nil {
		ctx, release, ok, err = core.AcquireSlot(ctx, s.rec.Slots, "account", a.ID, a.MaxConcurrency, "poll:"+e.pluginKey+":"+e.refID)
	}
	if err != nil || !ok {
		return ctx, nil, nil, nil, errTaskDeferred
	}
	e.account = a.AccountRef
	return ctx, &pluginv1.Account{Id: a.ID, Name: a.Name, Type: a.Type, CredentialsJson: string(a.Credentials), SettingsJson: string(a.Settings)}, a.ProxyID, release, nil
}

func (s *Service) reconcileTask(ctx context.Context, e *settleEntry) bool {
	row, err := s.loadReserved(ctx, e.usageLogID)
	if err != nil {
		s.rec.log.Error("task usage lookup failed", "task", e.task.id, "err", err)
		return false
	}
	cfg := s.reconcileSettings(ctx)
	if !time.Now().Before(e.deadlineAt) {
		keptEstimate := e.task.state == "succeeded" && row.status == StatusReserved
		s.failObservation(ctx, e, row, "task_timeout", "task observation deadline reached")
		return keptEstimate
	}
	res, err := s.askPlugin(ctx, e, row)
	if e.reported {
		return false
	}
	if err != nil {
		s.handlePollError(ctx, e, row, cfg, err)
		return false
	}
	if s.handlePollResult(ctx, e, row, cfg, res) {
		return false
	}
	terminal := res.GetState() != pluginv1.ReconcileResult_PENDING
	if raw := []byte(res.GetTaskSnapshotJson()); len(raw) > 0 {
		// Paths are captured from the same generation as the parser call.
		if _, err = protocol.RewriteTaskID(raw, e.task.paths, e.refID, e.task.id); err == nil {
			e.task.snapshot = raw
		}
	} else if terminal {
		err = errors.New("terminal task observation is missing its snapshot")
	}
	if err != nil {
		s.handlePollError(ctx, e, row, cfg, err)
		return false
	}
	if !terminal {
		s.rescheduleTask(ctx, e, cfg, time.Duration(res.GetNextCheckAfterSec())*time.Second, "", true)
		return false
	}
	switch res.GetState() {
	case pluginv1.ReconcileResult_SETTLED, pluginv1.ReconcileResult_SETTLED_ESTIMATE:
		e.task.state = "succeeded"
	case pluginv1.ReconcileResult_FAILED:
		e.task.state = "failed"
	default:
		s.rescheduleTask(ctx, e, cfg, 0, "unknown task result state", true)
		return false
	}
	if row.status != StatusReserved {
		s.finishTaskOnly(ctx, e, "closed")
		return false
	}
	switch res.GetState() {
	case pluginv1.ReconcileResult_SETTLED:
		s.settleReconciled(ctx, e, row, res)
	case pluginv1.ReconcileResult_SETTLED_ESTIMATE:
		s.settleEstimate(ctx, e, row, res)
	case pluginv1.ReconcileResult_FAILED:
		s.refundFailed(ctx, e, row, res.GetReason())
	}
	return false
}

// lockTaskOutcome is always called before locking usage/pending rows. Its
// update and the billing outcome share one transaction, so stale workers can
// neither publish a terminal snapshot nor touch money after lease takeover.
func (s *Service) lockTaskOutcome(ctx context.Context, tx pgx.Tx, e *settleEntry, observation string) error {
	if e.task == nil {
		return nil
	}
	t := e.task
	var current string
	err := tx.QueryRow(ctx, `SELECT state FROM async_tasks WHERE public_id=$1 AND claim_token=$2
		AND observation_status='pending' AND lease_until>clock_timestamp() FOR UPDATE`, t.id, t.token).Scan(&current)
	if errors.Is(err, pgx.ErrNoRows) {
		return errNotPending
	}
	if err != nil {
		return err
	}
	// Recheck after a row-lock wait: the statement's original visibility test
	// may have run before the lease expired while waiting for the lock.
	var valid bool
	if err := tx.QueryRow(ctx, `SELECT lease_until>clock_timestamp() FROM async_tasks WHERE public_id=$1`, t.id).Scan(&valid); err != nil {
		return err
	}
	if !valid {
		return errNotPending
	}
	// A manual retry can reopen billing after a confirmed estimate. Pending
	// observations must never replace the already confirmed terminal snapshot.
	snapshot := t.snapshot
	paths := jsonOr(t.paths, "[]")
	state := t.state
	if observation == "pending" {
		if current != "pending" || state != "pending" {
			snapshot = nil
		}
		state = current
	}
	_, err = tx.Exec(ctx, `UPDATE async_tasks SET state=$2,observation_status=$3,
		snapshot=COALESCE($4,snapshot),snapshot_id_paths=CASE WHEN $4::bytea IS NULL THEN snapshot_id_paths ELSE $5::jsonb END,
		claim_token='',lease_until=NULL,attempts=attempts+CASE WHEN $3='closed' THEN 1 ELSE 0 END,
		failure_code=CASE WHEN $3='closed' THEN $6 ELSE failure_code END,
		last_error=CASE WHEN $3='closed' THEN $7 ELSE last_error END,
		poll_failures=CASE WHEN $3='closed' AND $8 THEN poll_failures+1 WHEN $3='closed' AND $9 THEN 0 ELSE poll_failures END,
		updated_at=now() WHERE public_id=$1`, t.id, state, observation, snapshot, paths, t.failureCode, t.failureReason, e.pollFailed, e.pollObserved)
	return err
}

// A legacy worker may have claimed this row before lazy import transferred
// polling to async_tasks. Financial callers already hold the usage row here.
func lockLegacyOutcome(ctx context.Context, tx pgx.Tx, e *settleEntry) error {
	if e.task != nil {
		return nil
	}
	var managed *string
	if err := tx.QueryRow(ctx, `SELECT task_public_id FROM pending_settlements WHERE id=$1 FOR UPDATE`, e.id).Scan(&managed); err != nil {
		return err
	}
	if managed != nil {
		return errNotPending
	}
	return nil
}

func (s *Service) finishTaskOnly(ctx context.Context, e *settleEntry, observation string) {
	ctx, cancel := bookkeeping(ctx)
	defer cancel()
	err := s.outcomeTx(ctx, e, func(tx pgx.Tx) error { return s.lockTaskOutcome(ctx, tx, e, observation) })
	if err != nil && !errors.Is(err, errNotPending) {
		s.rec.log.Error("task outcome write failed", "task", e.task.id, "err", err)
	}
}

func (s *Service) rescheduleTask(ctx context.Context, e *settleEntry, cfg resolved, want time.Duration, reason string, count bool) {
	ctx, cancel := bookkeeping(ctx)
	defer cancel()
	n := 0
	if count {
		n = 1
	}
	backoffAttempt := e.attempts + n
	if e.pollFailed {
		backoffAttempt = e.pollFailures
	}
	next := time.Now().Add(cfg.clampDelay(want, backoffAttempt))
	if next.After(e.deadlineAt) {
		next = e.deadlineAt
	}
	err := s.outcomeTx(ctx, e, func(tx pgx.Tx) error {
		if err := s.lockTaskOutcome(ctx, tx, e, "pending"); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `UPDATE async_tasks SET attempts=attempts+$2,next_check_at=$3,last_error=$4,
		poll_failures=CASE WHEN $5 THEN poll_failures+1 WHEN $6 THEN 0 ELSE poll_failures END WHERE public_id=$1`, e.task.id, n, next, trunc(reason, 2000), e.pollFailed, e.pollObserved)
		if err == nil && e.id != 0 {
			_, err = tx.Exec(ctx, `UPDATE pending_settlements SET attempts=attempts+$2,next_check_at=$3,last_error=$4,
			poll_failures=CASE WHEN $5 THEN poll_failures+1 WHEN $6 THEN 0 ELSE poll_failures END WHERE id=$1`, e.id, n, next, trunc(reason, 2000), e.pollFailed, e.pollObserved)
		}
		return err
	})
	if err != nil && !errors.Is(err, errNotPending) {
		s.rec.log.Error("task reschedule failed", "task", e.task.id, "err", err)
	}
}

func taskPaths(gen core.Generation, e *settleEntry) ([]string, error) {
	for _, b := range gen.Endpoints() {
		if b.Plugin.Key == e.pluginKey && b.Endpoint.TaskQuery() && b.Endpoint.Task.Kind == e.task.kind {
			return append([]string(nil), b.Endpoint.Task.IDPaths...), nil
		}
	}
	return nil, fmt.Errorf("task query contract %s/%s unavailable", e.pluginKey, e.task.kind)
}

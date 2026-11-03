package ccgateway

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Parking: the runtime of an account that stayed red (needs a person) for
// park_after_hours is stopped, keeping its container, volumes and login
// (ACCOUNT-RUNTIME-PARKING-DESIGN.md). Testing or re-authorizing the account,
// or starting its runtime from the runtime list, wakes it; an account that
// is no longer red runs again by itself.

const (
	// reasonAccountParked: the runtime is stopped because its account stayed
	// red (status of the runtime list).
	reasonAccountParked = "account_parked"
	// reasonRuntimePark: what needs the runtime cannot run while it is
	// stopped (a manual quota refresh).
	reasonRuntimeParked = "runtime_parked"
	// reasonRuntimeNotReady: a woken runtime did not become ready in time.
	reasonRuntimeNotReady = "runtime_not_ready"
)

// ParkRuntimesTask is the cluster task that stops the runtimes of accounts
// red for long enough.
const ParkRuntimesTask = "core.ccgateway.park_runtimes"

// Audit actions.
const (
	actionRuntimeParked = "account.runtime_parked"
	actionRuntimeWoken  = "account.runtime_woken"
)

// defaultParkAfterHours is park_after_hours when the setting was never saved.
const defaultParkAfterHours = 3

// maxParkAfterHours bounds the setting (30 days).
const maxParkAfterHours = 720

// parkBatch bounds the runtimes one run parks.
const parkBatch = 200

// sqlAccountRed is the red account status of the console (CONTRACTS §73.4,
// web accountStatus.ts) over accounts a: disabled, auto-disabled without a
// release time, or active but taken out of scheduling.
const sqlAccountRed = `(a.status = 'disabled'
	OR (a.status IN ('auto_disabled', 'error') AND a.auto_disabled_until IS NULL)
	OR (a.status = 'active' AND NOT a.schedulable))`

// sqlRuntimeParked says whether the runtime r of account a is parked now: the
// mark was set after the account last changed status and it is still red. A
// status change makes the mark stale without clearing it.
const sqlRuntimeParked = `(r.parked_at IS NOT NULL AND a.deleted_at IS NULL AND a.status_changed_at IS NOT NULL
	AND r.parked_at >= a.status_changed_at AND ` + sqlAccountRed + `)`

// wakeWait bounds how long a wake waits for the runtime to be ready.
var (
	wakeWait = 60 * time.Second
	wakePoll = 2 * time.Second
)

// ParkAfter is how long an account stays red before its runtime is stopped;
// 0 never stops it.
func (c Config) ParkAfter() time.Duration {
	hours := defaultParkAfterHours
	if c.ParkAfterHours != nil {
		hours = *c.ParkAfterHours
	}
	return time.Duration(hours) * time.Hour
}

func (c Config) parkAfterHours() int {
	return int(c.ParkAfter() / time.Hour)
}

// mergeParking keeps the stored setting when a body leaves it out.
func mergeParking(c *Config, old Config) error {
	if c.ParkAfterHours == nil {
		c.ParkAfterHours = old.ParkAfterHours
		return nil
	}
	if h := *c.ParkAfterHours; h < 0 || h > maxParkAfterHours {
		return fmt.Errorf("invalid park_after_hours: must be 0 to %d", maxParkAfterHours)
	}
	return nil
}

// parkRuntimesSpec is the task that stops the runtimes of red accounts.
func parkRuntimesSpec(s *Service) core.TaskSpec {
	return core.TaskSpec{Name: ParkRuntimesTask,
		Title: core.LocalizedText{"en": "Stop runtimes of red accounts", "zh": "停止红色账号的容器"},
		Description: core.LocalizedText{
			"en": "Stops the container of a CCGateway account that has been disabled (red) for the configured hours; testing or re-authorizing it starts it again.",
			"zh": "CCGateway 账号处于红色禁用状态满设定小时数后停止它的容器；测试或重新授权会再启动。",
		},
		Scope:   core.TaskCluster,
		Every:   time.Minute,
		Timeout: 50 * time.Second,
		Handler: s.parkRuntimes,
	}
}

type parkedRuntime struct {
	key       string
	accountID int64
}

// parkRuntimes marks the runtimes due and has them blocked (one run).
func (s *Service) parkRuntimes(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
	cfg, err := s.Load(ctx)
	if err != nil {
		return core.TaskResult{}, err
	}
	// Stale marks (the account changed status since) are cleared for tidiness:
	// they never count (sqlRuntimeParked).
	if _, err := s.DB.Pool.Exec(ctx, `UPDATE ccgateway_runtimes r SET parked_at = NULL
		FROM accounts a WHERE a.id = r.account_id AND r.parked_at IS NOT NULL AND NOT `+sqlRuntimeParked); err != nil {
		return core.TaskResult{}, fmt.Errorf("clear stale marks: %w", err)
	}
	after := cfg.ParkAfter()
	if !cfg.AccountRuntimes || after <= 0 {
		return core.TaskResult{Message: "parking is off"}, nil
	}
	var parked []parkedRuntime
	err = s.DB.Tx(ctx, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `UPDATE ccgateway_runtimes r SET parked_at = clock_timestamp()
			FROM (SELECT r.key FROM ccgateway_runtimes r JOIN accounts a ON a.id = r.account_id
				WHERE a.plugin_key = 'ccgateway' AND a.type IN ('managed', 'apikey') AND a.deleted_at IS NULL
					AND r.retired_at IS NULL AND r.purged_at IS NULL AND r.parked_at IS NULL
					AND a.status_changed_at IS NOT NULL AND `+sqlAccountRed+`
					AND greatest(a.status_changed_at, r.woken_at) <= clock_timestamp() - $1::interval
				ORDER BY r.key LIMIT $2 FOR UPDATE OF r SKIP LOCKED) due
			WHERE r.key = due.key RETURNING r.key, r.account_id`, after.String(), parkBatch)
		if err != nil {
			return err
		}
		for rows.Next() {
			var p parkedRuntime
			if err := rows.Scan(&p.key, &p.accountID); err != nil {
				rows.Close()
				return err
			}
			parked = append(parked, p)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return err
		}
		hours := cfg.parkAfterHours()
		for _, p := range parked {
			if err := audit.Audit(ctx, tx, 0, actionRuntimeParked, "account", strconv.FormatInt(p.accountID, 10),
				map[string]any{"runtime": p.key, "after_hours": hours}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return core.TaskResult{}, err
	}
	for _, p := range parked {
		s.Kick(p.key)
	}
	msg := ""
	if len(parked) > 0 {
		msg = fmt.Sprintf("stopped %d runtimes", len(parked))
	}
	return core.TaskResult{Count: len(parked), Message: msg}, nil
}

// RuntimeParked reports whether the runtime of account id is parked.
func (s *Service) RuntimeParked(ctx context.Context, id int64) (bool, error) {
	parked, err := s.ParkedRuntimes(ctx, []int64{id})
	return parked[id], err
}

// ParkedRuntimes returns the accounts among ids whose runtime is parked (one
// query, for the account list).
func (s *Service) ParkedRuntimes(ctx context.Context, ids []int64) (map[int64]bool, error) {
	out := map[int64]bool{}
	if s == nil || s.DB == nil || len(ids) == 0 {
		return out, nil
	}
	rows, err := s.DB.Pool.Query(ctx, `SELECT a.id FROM accounts a JOIN ccgateway_runtimes r ON r.account_id = a.id
		WHERE a.id = ANY($1) AND a.plugin_key = 'ccgateway' AND `+sqlRuntimeParked, ids)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return out, err
		}
		out[id] = true
	}
	return out, rows.Err()
}

// WakeRuntime starts the parked runtime of account id and waits until it is
// ready (at most wakeWait). An account whose runtime is not parked returns
// at once. Its runtime is stopped again once the account stays red for
// another park_after_hours.
func (s *Service) WakeRuntime(ctx context.Context, id int64) error {
	woke, err := s.wake(ctx, id)
	if err != nil || !woke {
		return err
	}
	d, err := s.desired(ctx, id, false)
	if err != nil {
		return err
	}
	// Apply now rather than through the kick queue; a reconcile running
	// elsewhere holds the runtime's lock and does the same.
	if err := s.Reconcile(ctx, d.Key); err != nil {
		slog.WarnContext(ctx, "CCGateway: start woken runtime", "account", id, "err", err)
	}
	return s.waitReady(ctx, d)
}

// wake clears the park mark of account id's runtime (false: it was not
// parked).
func (s *Service) wake(ctx context.Context, id int64) (bool, error) {
	var woke bool
	err := s.DB.Tx(ctx, func(tx pgx.Tx) error {
		var key string
		err := tx.QueryRow(ctx, `UPDATE ccgateway_runtimes r SET parked_at = NULL, woken_at = clock_timestamp()
			FROM accounts a WHERE a.id = r.account_id AND a.id = $1 AND `+sqlRuntimeParked+` RETURNING r.key`, id).Scan(&key)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return err
		}
		woke = true
		uid, _ := core.UserID(ctx)
		return audit.Audit(ctx, tx, uid, actionRuntimeWoken, "account", strconv.FormatInt(id, 10), map[string]any{"runtime": key})
	})
	if woke {
		s.forgetAccount(id, "")
	}
	return woke, err
}

// waitReady polls the runtime of d until it is ready at d's revision.
func (s *Service) waitReady(ctx context.Context, d accountDesired) error {
	deadline := time.Now().Add(wakeWait)
	for {
		status, failure := s.runtimeStatus(ctx, d)
		if failure == nil && status.Status == "ready" && status.Revision == d.Revision {
			return nil
		}
		if !time.Now().Add(wakePoll).Before(deadline) {
			return reasonError(core.ErrUnavailable, reasonRuntimeNotReady)
		}
		select {
		case <-ctx.Done():
			return reasonError(core.ErrUnavailable, reasonRuntimeNotReady)
		case <-time.After(wakePoll):
		}
	}
}

package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"sort"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

const cleanupFeature = "runtime-cleanup-v1"

// reasonResourceInUse: the controller kept a runtime because a container
// outside it still uses one of its networks or its data volume, or a
// resource outside it has one of its names (409).
const reasonResourceInUse = "resource_in_use"

// The retention of a deleted account's runtime, over a runtime row r joined
// to its account a. One place, so every query agrees on it.
const (
	// sqlPendingPurge: the runtime of a deleted account, not purged yet.
	sqlPendingPurge = `a.deleted_at IS NOT NULL AND r.retired_at IS NOT NULL AND r.purged_at IS NULL`
	// sqlInRetention: still kept (until purge_after). A row an older core
	// marked has no purge_after and is due.
	sqlInRetention = `COALESCE(r.purge_after > now(), false)`
	// sqlPurgeAt is when it is (or was) due: purge_after, else the retirement.
	sqlPurgeAt = `COALESCE(r.purge_after, r.retired_at)`
)

// Preserve the account mapping as a durable deletion job. A retired timestamp
// on an attached, deleted account means purge requested: at purge_after (now,
// or the end of the retention the account type allows), after which purged_at
// records the purge. Detached retired rows retain their historical
// reauthorization meaning. Previously deleted accounts are cleaned only by the
// explicit orphan-cleanup action, not during rollout.
func (s *Service) MarkAccountDeleted(ctx context.Context, tx pgx.Tx, id int64, opts core.AccountDeletionOptions) (time.Time, error) {
	var purgeAfter time.Time
	err := tx.QueryRow(ctx, `UPDATE ccgateway_runtimes SET retired_at=now(),purge_after=now()+make_interval(days => $2::int),purged_at=NULL
	 WHERE account_id=$1 RETURNING purge_after`, id, opts.RetainDays).Scan(&purgeAfter)
	if err == nil {
		return purgeAfter, nil
	}
	if !store.IsNoRows(err) {
		return time.Time{}, err
	}
	err = tx.QueryRow(ctx, `INSERT INTO ccgateway_runtimes(key,account_id,adopted_at,retired_at,purge_after)
	 VALUES($1::bigint::text,$1,now(),now(),now()+make_interval(days => $2::int)) ON CONFLICT(key) DO UPDATE
	 SET account_id=EXCLUDED.account_id,retired_at=EXCLUDED.retired_at,purge_after=EXCLUDED.purge_after,purged_at=NULL
	 RETURNING purge_after`, id, opts.RetainDays).Scan(&purgeAfter)
	return purgeAfter, err
}

type cleanupCandidate struct {
	Key      string `json:"key"`
	Identity string `json:"identity"`
}
type cleanupInventory struct {
	Runtimes []cleanupCandidate `json:"runtimes"`
}
type cleanupResult struct {
	Key    string `json:"key"`
	Status string `json:"status"`
	Reason string `json:"reason,omitempty"`
}
type cleanupReport struct {
	Results []cleanupResult `json:"results"`
	Deleted int             `json:"deleted"`
	Failed  int             `json:"failed"`
}

func (s *Service) cleanupConfig(ctx context.Context) (Config, error) {
	cfg, err := s.Load(ctx)
	if err != nil {
		return cfg, err
	}
	if !cfg.AccountRuntimes || (cfg.Mode != "controller" && cfg.Mode != "local" && cfg.Mode != "ssh") {
		return cfg, reasonError(core.ErrUnavailable, "controller_not_configured")
	}
	health, err := s.health(ctx, cfg)
	if err != nil {
		return cfg, err
	}
	if !health.has(cleanupFeature) {
		return cfg, reasonError(core.ErrUnavailable, "controller_outdated")
	}
	return cfg, nil
}

// A deleted account is different from a disabled account: remove its owned
// containers, networks and data. Failed calls stay eligible for reconciliation.
// The controller must declare runtime cleanup (an older one would keep the
// data); a 404 is a failure, the controller knows every account runtime.
func (s *Service) purgeRuntime(ctx context.Context, key string) error {
	if _, err := s.cleanupConfig(ctx); err != nil {
		return err
	}
	return s.deleteRuntime(ctx, key, false, "X-CCG-Delete-Account", key, "X-CCG-Delete-Data", "1")
}

// deleteRuntime sends DELETE /accounts/<key> with the extra header pairs;
// notFoundRemoved counts a 404 as removed. A refusal is deleteFailure.
func (s *Service) deleteRuntime(ctx context.Context, key string, notFoundRemoved bool, header ...string) error {
	res, close, err := s.runtimeRequest(ctx, key, http.MethodDelete, "", nil, "", header...)
	if err != nil {
		return err
	}
	defer close()
	defer res.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
	if res.StatusCode == http.StatusOK || (notFoundRemoved && res.StatusCode == http.StatusNotFound) {
		return nil
	}
	return deleteFailure(res.StatusCode, raw, "runtime_cleanup_failed")
}

// deleteFailure is the error of a refused DELETE /accounts/<key>: the
// controller's 409 resource_in_use is named (a foreign container still uses
// the runtime's network or volume); anything else is reason fallback.
func deleteFailure(status int, raw []byte, fallback string) *core.Error {
	reason := fallback
	if code, _ := parseRuntimeError(raw); status == http.StatusConflict && code == reasonResourceInUse {
		reason = reasonResourceInUse
	}
	return reasonError(core.ErrUnavailable, reason).WithDetails(map[string]any{"status": status})
}

// purgeDeleted purges the runtime of deleted account d and records purged_at
// in tx (Reconcile holds the runtime's lock in it and commits), so no node
// purges it again. A failure leaves the row for the next pass and is logged
// with its reason.
func (s *Service) purgeDeleted(ctx context.Context, tx pgx.Tx, key string, d accountDesired) error {
	if err := s.purgeRuntime(ctx, key); err != nil {
		slog.WarnContext(ctx, "CCGateway: deleted account runtime not purged", "key", key, "account", d.AccountID, "reason", reasonOf(core.AsError(err)), "err", err)
		return err
	}
	slog.InfoContext(ctx, "CCGateway: deleted account runtime purged", "key", key, "account", d.AccountID)
	_, err := tx.Exec(ctx, `UPDATE ccgateway_runtimes SET purged_at=now() WHERE key=$1 AND account_id=$2 AND purged_at IS NULL`, key, d.AccountID)
	return err
}

// Read the authoritative list after the controller inventory. Pagination and
// the caller's account visibility never determine which resources are retained.
// Keep registered drafts even after their idle timeout: their locked sweeper
// owns expiry, so a concurrent authorization heartbeat cannot race this list.
// Keep the runtimes of deleted accounts still in their retention period too:
// Reconcile purges them when it ends.
func (s *Service) cleanupKeepKeys(ctx context.Context) ([]string, error) {
	rows, err := s.DB.Pool.Query(ctx, `
SELECT COALESCE(r.key,a.id::text) FROM accounts a LEFT JOIN ccgateway_runtimes r ON r.account_id=a.id
 WHERE a.plugin_key='ccgateway' AND a.deleted_at IS NULL
UNION SELECT r.key FROM ccgateway_runtimes r WHERE r.account_id IS NULL AND r.retired_at IS NULL
UNION SELECT key FROM ccgateway_runtimes WHERE account_id IS NULL AND retired_at >= now()-$1::bigint*interval '1 second'
UNION SELECT r.key FROM ccgateway_runtimes r WHERE r.account_id IS NOT NULL AND r.purged_at IS NULL AND `+sqlInRetention,
		int64(retiredGrace/time.Second))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	keys := []string{}
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, err
		}
		if !accountKeyPattern.MatchString(key) && !isDraftKey(key) {
			return nil, core.ErrUnavailable
		}
		keys = append(keys, key)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	sort.Strings(keys)
	return keys, nil
}

func (s *Service) runtimeCleanup(c *gin.Context) {
	// The browser starts the operation but cannot supply a partial keep list.
	raw, err := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 4096))
	var input map[string]json.RawMessage
	if err != nil || (len(raw) > 0 && (json.Unmarshal(raw, &input) != nil || len(input) != 0)) {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	ctx, cancel := detached(c, 5*time.Minute)
	defer cancel()
	cfg, err := s.cleanupConfig(ctx)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	// Not installLock: cleanup has always answered a locker error with a plain
	// ErrUnavailable (no reason), unlike every other operation that takes the
	// same lock. The different answer is kept on purpose (plan §8).
	ctx, release, locked, err := s.lockInstall(ctx)
	if err != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	if !locked {
		httpapi.Fail(c, reasonError(core.ErrConflict, "install_in_progress"))
		return
	}
	defer release()
	var inventory cleanupInventory
	if err := s.controllerJSONLimit(ctx, cfg, http.MethodGet, "/runtime/cleanup", nil, &inventory, 8<<20); err != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	keys, err := s.cleanupKeepKeys(ctx)
	if err != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	request := map[string]any{"keep_keys": keys, "candidates": inventory.Runtimes}
	if inventory.Runtimes == nil {
		request["candidates"] = []cleanupCandidate{}
	}
	var report cleanupReport
	if err := s.controllerJSONLimit(ctx, cfg, http.MethodPost, "/runtime/cleanup", request, &report, 8<<20); err != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_cleanup_failed"))
		return
	}
	uid, _ := core.UserID(ctx)
	if err := audit.Audit(ctx, s.DB.Pool, uid, "ccgateway.runtime.cleanup", "system", "ccgateway", map[string]any{"deleted": report.Deleted, "failed": report.Failed}); err != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	httpapi.OK(c, report)
}

// retainedRuntime is a deleted account's runtime not purged yet: kept
// (stopped) until purge_after, or due (Reconcile is purging it and retries
// until the controller succeeds).
type retainedRuntime struct {
	Key         string `json:"key"`
	AccountID   int64  `json:"account_id"`
	AccountName string `json:"account_name"`
	AccountType string `json:"account_type"`
	DeletedAt   string `json:"deleted_at"`
	PurgeAfter  string `json:"purge_after"`
	Due         bool   `json:"due"`
}

// retainedRuntimes serves GET /system/ccgateway/runtimes/retained: the
// runtimes of deleted accounts not purged yet, the one due first first, so a
// purge that keeps failing stays visible. A row an older core marked has no
// purge_after and is due since it was retired. Times are RFC3339 (UTC).
func (s *Service) retainedRuntimes(c *gin.Context) {
	httpapi.NoStore(c)
	rows, err := s.DB.Pool.Query(c.Request.Context(), `SELECT r.key,a.id,a.name,a.type,a.deleted_at,`+sqlPurgeAt+`,`+sqlPurgeAt+` <= now()
  FROM ccgateway_runtimes r JOIN accounts a ON a.id=r.account_id
  WHERE a.plugin_key='ccgateway' AND `+sqlPendingPurge+`
  ORDER BY 6,r.key`)
	if err != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	defer rows.Close()
	out := []retainedRuntime{}
	for rows.Next() {
		var item retainedRuntime
		var deletedAt, purgeAfter time.Time
		if err := rows.Scan(&item.Key, &item.AccountID, &item.AccountName, &item.AccountType, &deletedAt, &purgeAfter, &item.Due); err != nil {
			httpapi.Fail(c, core.ErrUnavailable)
			return
		}
		item.DeletedAt, item.PurgeAfter = deletedAt.UTC().Format(time.RFC3339), purgeAfter.UTC().Format(time.RFC3339)
		out = append(out, item)
	}
	if rows.Err() != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	httpapi.OK(c, map[string]any{"runtimes": out})
}

// runtimePurge serves POST /system/ccgateway/runtimes/:key/purge: the
// retention of a deleted account's runtime ends now (purge_after = now(),
// under the runtime's lock; a due one keeps its time) and this node
// reconciles it, which purges it, so a failed purge can be retried at once.
// 202: the purge itself runs in the background and is retried like any
// other. 404: no such runtime; 409 runtime_not_retained: not a deleted
// account's runtime, or purged already.
func (s *Service) runtimePurge(c *gin.Context) {
	key := c.Param("key")
	if !accountKeyPattern.MatchString(key) && !isDraftKey(key) {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	ctx, cancel := detached(c, 30*time.Second)
	defer cancel()
	var accountID int64
	found, retained := false, false
	err := s.lockedTx(ctx, key, true, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `SELECT a.id, `+sqlPendingPurge+`
  FROM ccgateway_runtimes r JOIN accounts a ON a.id=r.account_id WHERE r.key=$1 AND a.plugin_key='ccgateway' FOR UPDATE OF r`, key).Scan(&accountID, &retained)
		if store.IsNoRows(err) {
			return nil
		}
		if err != nil {
			return err
		}
		found = true
		if !retained {
			return nil
		}
		if _, err := tx.Exec(ctx, `UPDATE ccgateway_runtimes SET purge_after=now() WHERE key=$1 AND purge_after > now()`, key); err != nil {
			return err
		}
		uid, _ := core.UserID(ctx)
		return audit.Audit(ctx, tx, uid, "ccgateway.runtime.purge", "system", "ccgateway", map[string]any{"key": key, "account_id": accountID})
	})
	switch {
	case err != nil:
		httpapi.Fail(c, core.ErrUnavailable)
	case !found:
		httpapi.Fail(c, core.ErrNotFound)
	case !retained:
		httpapi.Fail(c, reasonError(core.ErrConflict, "runtime_not_retained"))
	default:
		s.Kick(key)
		httpapi.Accepted(c, map[string]any{"accepted": true, "key": key, "account_id": accountID})
	}
}

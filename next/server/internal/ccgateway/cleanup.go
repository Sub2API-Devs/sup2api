package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"sort"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

const cleanupFeature = "runtime-cleanup-v1"

// Preserve the account mapping as a durable deletion job. A retired timestamp
// on an attached, deleted account means purge requested; detached retired rows
// retain their historical reauthorization meaning. Previously deleted accounts
// are cleaned only by the explicit orphan-cleanup action, not during rollout.
func (s *Service) MarkAccountDeleted(ctx context.Context, tx pgx.Tx, id int64) error {
	tag, err := tx.Exec(ctx, `UPDATE ccgateway_runtimes SET retired_at=now() WHERE account_id=$1`, id)
	if err != nil || tag.RowsAffected() != 0 {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO ccgateway_runtimes(key,account_id,adopted_at,retired_at)
	 VALUES($1::bigint::text,$1,now(),now()) ON CONFLICT(key) DO UPDATE SET account_id=EXCLUDED.account_id,retired_at=EXCLUDED.retired_at`, id)
	return err
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
func (s *Service) purgeRuntime(ctx context.Context, key string) error {
	cfg, err := s.cleanupConfig(ctx)
	if err != nil {
		return err
	}
	header := http.Header{"X-Ccg-Delete-Account": []string{key}, "X-Ccg-Delete-Data": []string{"1"}}
	res, close, err := s.controllerCall(ctx, cfg, http.MethodDelete, "/accounts/"+key, nil, 0, header)
	if err != nil {
		return err
	}
	defer close()
	defer res.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(res.Body, 65536))
	if res.StatusCode != http.StatusOK {
		return reasonError(core.ErrUnavailable, "runtime_cleanup_failed")
	}
	return nil
}

// Read the authoritative list after the controller inventory. Pagination and
// the caller's account visibility never determine which resources are retained.
// Keep registered drafts even after their idle timeout: their locked sweeper
// owns expiry, so a concurrent authorization heartbeat cannot race this list.
func (s *Service) cleanupKeepKeys(ctx context.Context) ([]string, error) {
	rows, err := s.DB.Pool.Query(ctx, `
SELECT COALESCE(r.key,a.id::text) FROM accounts a LEFT JOIN ccgateway_runtimes r ON r.account_id=a.id
 WHERE a.plugin_key='ccgateway' AND a.deleted_at IS NULL
UNION SELECT r.key FROM ccgateway_runtimes r WHERE r.account_id IS NULL AND r.retired_at IS NULL
UNION SELECT key FROM ccgateway_runtimes WHERE account_id IS NULL AND retired_at >= now()-$1::bigint*interval '1 second'`,
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
	ctx, cancel := context.WithTimeout(context.WithoutCancel(audit.Context(c)), 5*time.Minute)
	defer cancel()
	cfg, err := s.cleanupConfig(ctx)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
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

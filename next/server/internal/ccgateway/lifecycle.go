package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"strconv"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/jackc/pgx/v5"
)

var _ core.AccountLifecycleResource = (*Service)(nil)

func (s *Service) PrepareAccount(ctx context.Context, p core.AccountPreparation) error {
	if !s.runtimesOn(ctx) {
		return reasonError(core.ErrUnavailable, "not_configured")
	}
	if p.Type != "managed" || !isDraftKey(p.Key) {
		return core.ErrInvalidArgument
	}
	if err := s.checkProxy(ctx, p.ProxyID); err != nil {
		return err
	}
	tag, err := s.DB.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key,proxy_id,created_by,initial_settings) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT (key) DO NOTHING`, p.Key, p.ProxyID, p.CreatedBy, p.Settings)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		var matches bool
		err := s.DB.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM ccgateway_runtimes WHERE key=$1 AND created_by=$2 AND proxy_id IS NOT DISTINCT FROM $3 AND initial_settings=$4::jsonb AND account_id IS NULL AND for_account IS NULL AND retired_at IS NULL)`, p.Key, p.CreatedBy, p.ProxyID, p.Settings).Scan(&matches)
		if err != nil {
			return err
		}
		if !matches {
			return core.ErrConflict
		}
	}
	s.Kick(p.Key)
	return nil
}

func (s *Service) AccountPreparationAction(ctx context.Context, p core.AccountPreparation, method, action string, payload json.RawMessage) (any, error) {
	ok, err := s.touchDraftOf(ctx, p.Key, &p.CreatedBy, accountDraft)
	if err != nil || !ok {
		return nil, errOr(err, draftNotFound(core.ErrNotFound))
	}
	desired, err := s.draftDesired(ctx, p.Key, false)
	if err != nil {
		return nil, err
	}
	if !desired.Enabled {
		return nil, reasonError(core.ErrInvalidArgument, desired.Blocked)
	}
	if action == "sync" {
		if err := s.Reconcile(ctx, p.Key); err != nil {
			return nil, transportError(err)
		}
		return map[string]bool{"synced": true}, nil
	}
	paths := map[string]string{"status": "status", "health": "admin/status", "session": "admin/auth/session", "start": "admin/auth/start", "complete": "admin/auth/complete", "cancel": "admin/auth/cancel"}
	path, ok := paths[action]
	if !ok {
		return nil, core.ErrNotFound
	}
	response, close, err := s.runtimeActionRequest(ctx, p.Key, method, path, payload, desired.Revision)
	if err != nil {
		return nil, transportError(err)
	}
	defer close()
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 65537))
	if err != nil || len(raw) > 65536 {
		return nil, reasonError(core.ErrUnavailable, "runtime_unavailable")
	}
	if action == "session" && response.StatusCode == 404 {
		return nil, nil
	}
	if response.StatusCode != 200 {
		return nil, runtimeError(response.StatusCode, raw)
	}
	if action == "session" {
		return sessionResult(raw)
	}
	if action == "status" {
		var status struct {
			Container string `json:"container"`
			Status    string `json:"status"`
			Revision  string `json:"revision"`
		}
		if json.Unmarshal(raw, &status) != nil {
			return nil, reasonError(core.ErrUnavailable, "runtime_unavailable")
		}
		phase := "creating"
		if status.Status == "ready" && status.Revision == desired.Revision {
			phase = "ready"
		}
		return map[string]string{"key": p.Key, "container": status.Container, "status": phase}, nil
	}
	if action == "health" {
		return safeResult("/status", raw)
	}
	return safeResult("/auth/"+action, raw)
}

func (s *Service) UpdateAccountPreparation(ctx context.Context, tx pgx.Tx, p core.AccountPreparation) error {
	tag, err := tx.Exec(ctx, `UPDATE ccgateway_runtimes SET proxy_id=$2,last_seen_at=now() WHERE key=$1 AND created_by=$3 AND account_id IS NULL AND retired_at IS NULL AND for_account IS NULL`, p.Key, p.ProxyID, p.CreatedBy)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return core.ErrNotFound
	}
	return nil
}

func (s *Service) CheckAccountPreparation(ctx context.Context, p core.AccountPreparation) (core.AccountPreparationFacts, error) {
	var matches bool
	if err := s.DB.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM ccgateway_runtimes WHERE key=$1 AND created_by=$2 AND proxy_id IS NOT DISTINCT FROM $3 AND initial_settings=$4::jsonb AND account_id IS NULL AND for_account IS NULL AND retired_at IS NULL)`, p.Key, p.CreatedBy, p.ProxyID, p.Settings).Scan(&matches); err != nil {
		return core.AccountPreparationFacts{}, err
	}
	if !matches {
		return core.AccountPreparationFacts{}, core.ErrConflict.WithMessage("Account preparation configuration changed")
	}
	return s.CheckDraft(ctx, p.Key, &p.CreatedBy)
}

func (s *Service) AdoptAccountPreparation(ctx context.Context, tx pgx.Tx, p core.AccountPreparation, id int64) error {
	return AdoptDraft(ctx, tx, p.Key, id, &p.CreatedBy)
}

func (s *Service) CancelAccountPreparation(ctx context.Context, p core.AccountPreparation) error {
	_, err := s.removeDraft(ctx, p.Key, true)
	return err
}

func (s *Service) AccountAction(ctx context.Context, id int64, action string) (any, error) {
	if action == "refresh_token" {
		return s.RefreshToken(ctx, id)
	}
	if action != "refresh_auth" {
		return nil, core.ErrUnsupported
	}
	uid, _ := core.UserID(ctx)
	key, created, err := s.ReauthDraft(ctx, id, uid, core.OwnerScope(ctx, "settings:manage"))
	if err != nil {
		return nil, err
	}
	return map[string]any{"key": key, "created": created}, nil
}

func (s *Service) AccountSynchronization(ctx context.Context, id int64) (core.AccountSynchronization, error) {
	state := core.AccountSynchronization{Status: "pending", Code: "runtime_pending"}
	if !s.runtimesOn(ctx) {
		state.Code = "runtime_not_configured"
		return state, nil
	}
	desired, err := s.desired(ctx, id, false)
	if err != nil {
		return state, err
	}
	if !desired.Enabled {
		return core.AccountSynchronization{Status: "applied"}, nil
	}
	response, close, err := s.runtimeRequest(ctx, desired.Key, "GET", "status", nil, desired.Revision)
	if err != nil {
		return state, transportError(err)
	}
	defer close()
	defer response.Body.Close()
	var observed struct {
		Status             string `json:"status"`
		Revision           string `json:"revision"`
		EnvironmentPending *bool  `json:"environment_pending"`
	}
	if response.StatusCode != 200 || json.NewDecoder(io.LimitReader(response.Body, 65536)).Decode(&observed) != nil {
		return state, reasonError(core.ErrUnavailable, "runtime_unavailable")
	}
	if observed.EnvironmentPending != nil && *observed.EnvironmentPending {
		state.Code = "environment_requires_new_runtime"
		return state, nil
	}
	if observed.EnvironmentPending == nil && (desired.Locale != "" || desired.Timezone != "") {
		state.Code = "controller_outdated"
		return state, nil
	}
	if observed.Status == "ready" && observed.Revision == desired.Revision {
		return core.AccountSynchronization{Status: "applied"}, nil
	}
	return state, nil
}

func (s *Service) ReconcileAccount(ctx context.Context, id int64) error {
	if !s.runtimesOn(ctx) {
		return nil
	}
	return s.Reconcile(ctx, strconv.FormatInt(id, 10))
}

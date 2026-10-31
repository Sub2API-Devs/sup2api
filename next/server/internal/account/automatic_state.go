package account

import (
	"cmp"
	"context"
	"log/slog"
	"maps"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

var _ core.AccountAutomaticStateController = (*Service)(nil)

const automaticStateSweepInterval = 5 * time.Second
const maxAutomaticDisableDuration = 366 * 24 * time.Hour

func automaticDisableEnabled(ctx context.Context, q store.Querier) (bool, error) {
	var enabled bool
	err := q.QueryRow(ctx, `SELECT COALESCE(
		(SELECT (value->>'account_enabled')::boolean FROM settings WHERE key='failure_policy'),
		(SELECT (value->>'enabled')::boolean FROM settings WHERE key='auto_disable'),true)`).Scan(&enabled)
	return enabled, err
}

func (s *Service) getAutoDisablePolicy(c *gin.Context) {
	enabled, err := automaticDisableEnabled(c.Request.Context(), s.d.DB.Pool)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"enabled": enabled})
}

func (s *Service) ApplyAccountAutomaticState(ctx context.Context, id int64, state *pluginv1.AccountAutomaticState) (*pluginv1.SetAccountAutomaticStateResponse, error) {
	return s.applyAutomaticState(ctx, "", id, state, false)
}

func (s *Service) ApplyPluginAccountAutomaticState(ctx context.Context, pluginKey string, id int64, state *pluginv1.AccountAutomaticState) (*pluginv1.SetAccountAutomaticStateResponse, error) {
	if pluginKey == "" {
		return nil, core.ErrInvalidArgument.WithMessage("plugin key is required")
	}
	return s.applyAutomaticState(ctx, pluginKey, id, state, false)
}

func (s *Service) applyAutomaticState(ctx context.Context, owner string, id int64, state *pluginv1.AccountAutomaticState, policyAuthorized bool) (*pluginv1.SetAccountAutomaticStateResponse, error) {
	if id <= 0 || state == nil || !utf8.ValidString(state.GetReason()) || len(state.GetReason()) > 1000 {
		return nil, core.ErrInvalidArgument.WithMessage("invalid automatic account state")
	}
	if state.GetAction() != pluginv1.AccountAutomaticState_ACTION_DISABLE && state.GetAction() != pluginv1.AccountAutomaticState_ACTION_CLEAR {
		return nil, core.ErrInvalidArgument.WithMessage("automatic state action must be disable or clear")
	}
	if state.GetAction() == pluginv1.AccountAutomaticState_ACTION_CLEAR && state.GetRelease() != nil {
		return nil, core.ErrInvalidArgument.WithMessage("clear cannot specify a release time")
	}
	out := &pluginv1.SetAccountAutomaticStateResponse{}
	var name, pluginKey, typ string
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		var allowed bool
		var until *time.Time
		var now time.Time
		var source string
		err := tx.QueryRow(ctx, `SELECT name,plugin_key,type,status,status_reason,auto_disabled_source,auto_disable,auto_disabled_until,clock_timestamp()
			FROM accounts WHERE id=$1 AND deleted_at IS NULL AND ($2='' OR plugin_key=$2) FOR UPDATE`, id, owner).
			Scan(&name, &pluginKey, &typ, &out.Status, &out.Reason, &source, &allowed, &until, &now)
		if store.IsNoRows(err) {
			return notFound(ctx)
		}
		if err != nil {
			return err
		}
		var release *time.Time
		switch r := state.GetRelease().(type) {
		case *pluginv1.AccountAutomaticState_UntilUnix:
			t := time.Unix(r.UntilUnix, 0).UTC()
			if !t.After(now) || t.After(now.Add(maxAutomaticDisableDuration)) {
				return core.ErrInvalidArgument.WithMessage("release time must be in the next 366 days")
			}
			release = &t
		case *pluginv1.AccountAutomaticState_DurationSeconds:
			if r.DurationSeconds <= 0 || r.DurationSeconds > int64(maxAutomaticDisableDuration/time.Second) {
				return core.ErrInvalidArgument.WithMessage("disable duration must be between 1 second and 366 days")
			}
			t := now.Add(time.Duration(r.DurationSeconds) * time.Second)
			release = &t
		}
		if until != nil {
			out.UntilUnix = until.Unix()
		}
		if out.Status == "disabled" || (owner != "" && state.GetAction() == pluginv1.AccountAutomaticState_ACTION_DISABLE) {
			return nil
		}
		previous, limited := out.Status, limitDisabled(out.Status, source)
		next, reason := "auto_disabled", state.GetReason()
		if state.GetAction() == pluginv1.AccountAutomaticState_ACTION_CLEAR {
			// The usage limit's own disable is lifted by the limit or an
			// administrator only (CONTRACTS §73.4).
			if out.Status != "auto_disabled" || limited {
				return nil
			}
			next, reason = "active", ""
		} else {
			globallyAllowed := policyAuthorized && owner == ""
			if !globallyAllowed {
				globallyAllowed, err = automaticDisableEnabled(ctx, tx)
				if err != nil {
					return err
				}
			}
			if !allowed || !globallyAllowed {
				return nil
			}
			if out.Status == "auto_disabled" && until == nil && release != nil {
				return nil
			}
			// Another disable only replaces the usage limit's when it lasts
			// longer; the limit applies again once that one ends (§73.3).
			if limited && (until == nil || release != nil && !release.After(*until)) {
				return nil
			}
		}
		sameRelease := until == nil && release == nil || until != nil && release != nil && until.Equal(*release)
		if out.Status == next && out.Reason == reason && sameRelease {
			return nil
		}
		out.Changed, out.Status, out.Reason, out.UntilUnix = true, next, reason, 0
		if release != nil {
			out.UntilUnix = release.Unix()
		}
		return s.writeAutomaticStatus(ctx, tx, "account.automatic_state", automaticChange{id: id, name: name, pluginKey: pluginKey, typ: typ,
			from: previous, to: next, reason: reason, until: release, audit: map[string]any{"via_plugin": owner != ""}})
	})
	if err != nil {
		return nil, err
	}
	if out.Changed {
		s.afterStatusChange(ctx, id, pluginKey, typ)
	}
	return out, nil
}

// automaticChange is one automatic status change of an account.
type automaticChange struct {
	id                   int64
	name, pluginKey, typ string
	// from and fromReason are the status the change expects to find.
	from, fromReason string
	to, reason       string
	until            *time.Time
	// source is the auto_disabled_source written with the change:
	// usageLimitSource for the usage limit's disable, '' otherwise.
	source string
	// eventReason is the account.status_changed reason, reason by default.
	eventReason string
	// audit adds to the audit detail.
	audit map[string]any
}

// writeAutomaticStatus writes an automatic change of an account the caller
// locked in tx, with its audit row and account.status_changed event; the
// caller runs afterStatusChange once tx commits.
func (s *Service) writeAutomaticStatus(ctx context.Context, tx pgx.Tx, action string, ch automaticChange) error {
	if _, err := tx.Exec(ctx, `UPDATE accounts SET status=$2,status_reason=$3,auto_disabled_until=$4,auto_disabled_source=$5,updated_at=clock_timestamp() WHERE id=$1`,
		ch.id, ch.to, ch.reason, ch.until, ch.source); err != nil {
		return err
	}
	detail := map[string]any{"plugin_key": ch.pluginKey, "previous_status": ch.from, "status": ch.to, "until": ch.until}
	maps.Copy(detail, ch.audit)
	if err := audit.Audit(ctx, tx, 0, action, "account", itoa(ch.id), detail); err != nil {
		return err
	}
	payload := statusPayload(ch.id, ch.pluginKey, ch.typ, ch.name, ch.to, cmp.Or(ch.eventReason, ch.reason), nil)
	if ch.until != nil {
		payload["auto_disabled_until"] = ch.until.UTC().Format(time.RFC3339)
	}
	return s.d.Events.Emit(ctx, tx, core.Event{Type: core.EventAccountStatusChanged, Payload: payload})
}

// setAutomaticStatus applies ch only if the account is still in the status
// and reason ch expects (another node, an operator or a plugin may have
// changed it since).
func (s *Service) setAutomaticStatus(ctx context.Context, action string, ch automaticChange) error {
	changed := false
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		var status, reason string
		err := tx.QueryRow(ctx, `SELECT status,status_reason FROM accounts WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, ch.id).Scan(&status, &reason)
		if store.IsNoRows(err) || err == nil && (status != ch.from || reason != ch.fromReason) {
			return nil
		}
		if err != nil {
			return err
		}
		changed = true
		return s.writeAutomaticStatus(ctx, tx, action, ch)
	})
	if err == nil && changed {
		s.afterStatusChange(ctx, ch.id, ch.pluginKey, ch.typ)
	}
	return err
}

// afterStatusChange tells the routing cache and the CCGateway runtime of a
// committed status change.
func (s *Service) afterStatusChange(ctx context.Context, id int64, pluginKey, typ string) {
	s.changed(ctx, id)
	s.kickCCGateway(id, pluginKey, typ)
}

func (s *Service) runAutomaticStateSweep(ctx context.Context) {
	ticker := time.NewTicker(automaticStateSweepInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
		if s.d.CanWork != nil && !s.d.CanWork() {
			continue
		}
		if _, err := s.SweepAutomaticState(ctx); err != nil && ctx.Err() == nil {
			slog.WarnContext(ctx, "account: automatic state recovery", "err", err)
		}
		if err := s.runUsageLimits(ctx); err != nil && ctx.Err() == nil {
			slog.WarnContext(ctx, "account: usage limits", "err", err)
		}
	}
}

func (s *Service) SweepAutomaticState(ctx context.Context) (int, error) {
	type recovered struct {
		id                   int64
		name, pluginKey, typ string
	}
	var accounts []recovered
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `UPDATE accounts a SET status='active',status_reason='',auto_disabled_until=NULL,updated_at=clock_timestamp()
			FROM (SELECT id FROM accounts WHERE deleted_at IS NULL AND status='auto_disabled' AND auto_disabled_until<=clock_timestamp()
				ORDER BY auto_disabled_until,id LIMIT 200 FOR UPDATE SKIP LOCKED) due
			WHERE a.id=due.id RETURNING a.id,a.name,a.plugin_key,a.type`)
		if err != nil {
			return err
		}
		accounts, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (recovered, error) {
			var a recovered
			err := r.Scan(&a.id, &a.name, &a.pluginKey, &a.typ)
			return a, err
		})
		if err != nil {
			return err
		}
		for _, a := range accounts {
			if err := audit.Audit(ctx, tx, 0, "account.automatic_recovery", "account", itoa(a.id), map[string]any{"plugin_key": a.pluginKey, "reason": "release time reached"}); err != nil {
				return err
			}
			if err := s.d.Events.Emit(ctx, tx, core.Event{Type: core.EventAccountStatusChanged,
				Payload: statusPayload(a.id, a.pluginKey, a.typ, a.name, "active", "automatic disable expired", nil)}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	for _, a := range accounts {
		s.changed(ctx, a.id)
		s.kickCCGateway(a.id, a.pluginKey, a.typ)
	}
	return len(accounts), nil
}

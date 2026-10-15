package gateway

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

func loadFailurePolicy(ctx context.Context, q store.Querier) (*FailurePolicy, error) {
	var raw []byte
	err := q.QueryRow(ctx, `SELECT value FROM settings WHERE key=$1`, failurePolicyKey).Scan(&raw)
	if store.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var p FailurePolicy
	if err := json.Unmarshal(raw, &p); err != nil {
		return nil, err
	}
	if p.Revision < 1 {
		return nil, fmt.Errorf("invalid failure policy revision")
	}
	if fields := p.validate(ctx); len(fields) != 0 {
		return nil, core.InvalidFields(fields...)
	}
	return &p, nil
}

// Serialize legacy settings and policy publication, including the first insert.
func lockFailureSettings(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext('gateway.failure_policy'))`)
	return err
}

func (g *Gateway) getFailurePolicy(c *gin.Context) {
	db, err := g.db()
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	ctx := c.Request.Context()
	p, err := loadFailurePolicy(ctx, db.Pool)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	configured := p != nil
	if p == nil {
		gw, err := loadGatewaySettings(ctx, db.Pool)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		ad, err := loadAutoDisableSettings(ctx, db.Pool)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		draft := migrationDraft(gw, ad)
		p = &draft
	}
	httpapi.OK(c, gin.H{"configured": configured, "policy": p})
}

type publishFailurePolicy struct {
	ExpectedRevision int64         `json:"expected_revision"`
	Policy           FailurePolicy `json:"policy"`
}

func (g *Gateway) putFailurePolicy(c *gin.Context) {
	var in publishFailurePolicy
	if !httpapi.BindJSON(c, &in) {
		return
	}
	ctx := c.Request.Context()
	if fields := in.Policy.validate(ctx); len(fields) != 0 {
		httpapi.Fail(c, core.InvalidFields(fields...))
		return
	}
	db, err := g.db()
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	uid, _ := core.UserID(ctx)
	err = publishPolicy(ctx, db, uid, &in)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	g.changed(ctx, "settings.failure_policy")
	httpapi.OK(c, gin.H{"configured": true, "policy": in.Policy})
}

func archiveFailurePolicy(ctx context.Context, tx pgx.Tx, uid int64, old *FailurePolicy) error {
	if old == nil {
		return nil
	}
	_, err := store.UpdateSettingJSONTx(ctx, tx, failurePolicyKey+"_history", nullID(uid), func(raw json.RawMessage) (json.RawMessage, error) {
		var history struct {
			Policies []FailurePolicy `json:"policies"`
		}
		if err := json.Unmarshal(raw, &history); err != nil {
			return nil, err
		}
		history.Policies = append([]FailurePolicy{*old}, history.Policies...)
		if len(history.Policies) > 10 {
			history.Policies = history.Policies[:10]
		}
		return json.Marshal(history)
	})
	return err
}

func publishPolicy(ctx context.Context, db *store.DB, uid int64, in *publishFailurePolicy) error {
	return db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockFailureSettings(ctx, tx); err != nil {
			return err
		}
		old, err := loadFailurePolicy(ctx, tx)
		if err != nil {
			return err
		}
		var revision int64
		if old != nil {
			revision = old.Revision
		}
		if revision != in.ExpectedRevision {
			return core.ErrConflict.WithMessage("failure policy changed; reload before publishing")
		}
		in.Policy.Revision = revision + 1
		if err := archiveFailurePolicy(ctx, tx, uid, old); err != nil {
			return err
		}
		_, err = store.UpdateSettingJSONTx(ctx, tx, failurePolicyKey, nullID(uid), func(json.RawMessage) (json.RawMessage, error) { return json.Marshal(in.Policy) })
		return err
	})
}

func (g *Gateway) failurePolicyHistory(c *gin.Context) {
	db, err := g.db()
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	v := struct {
		Policies []FailurePolicy `json:"policies"`
	}{Policies: []FailurePolicy{}}
	if err := loadSettingsRow(c.Request.Context(), db.Pool, failurePolicyKey+"_history", &v); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

func (g *Gateway) previewFailurePolicy(c *gin.Context) {
	var in struct {
		Policy FailurePolicy `json:"policy"`
		Facts  FailureFacts  `json:"facts"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if fields := in.Policy.validate(c.Request.Context()); len(fields) != 0 {
		httpapi.Fail(c, core.InvalidFields(fields...))
		return
	}
	httpapi.OK(c, gin.H{"decision": in.Policy.decide(in.Facts), "text_truncated": len(in.Facts.Text) > classifyPrefix})
}

func legacyFailureSettingGuard(ctx context.Context, tx pgx.Tx) error {
	if err := lockFailureSettings(ctx, tx); err != nil {
		return err
	}
	p, err := loadFailurePolicy(ctx, tx)
	if err != nil {
		return err
	}
	if p != nil {
		return core.ErrConflict.WithMessage("managed by settings/failure-policy")
	}
	return nil
}

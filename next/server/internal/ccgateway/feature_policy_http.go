package ccgateway

import (
	"context"
	"net/http"
	"reflect"
	"strconv"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type featureGroupRef struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}
type featurePreview struct {
	FeatureResolution
	AccountPolicy AccountFeaturePolicy `json:"cc_feature_policy"`
	Groups        []featureGroupRef    `json:"groups"`
}

func (s *Service) accountFeaturePreview(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	ctx := c.Request.Context()
	keys := []string{"settings:read", "account:read"}
	if c.Request.Method == "POST" {
		keys = []string{"settings:manage", "account:update"}
	}
	scope := callerScope(ctx, keys...)
	var exists bool
	err := s.DB.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM accounts WHERE id=$1 AND deleted_at IS NULL
		AND plugin_key='ccgateway' AND type IN ('managed','apikey') AND ($2::bigint IS NULL OR created_by=$2))`, id, scope).Scan(&exists)
	if err != nil || !exists {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	var groupID int64
	var draft *AccountFeaturePolicy
	if c.Request.Method == "POST" {
		var in struct {
			GroupID int64                 `json:"group_id"`
			Policy  *AccountFeaturePolicy `json:"cc_feature_policy"`
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 32<<10)
		if !httpapi.BindJSON(c, &in) {
			return
		}
		groupID, draft = in.GroupID, in.Policy
		if draft != nil {
			if err := draft.Validate(); err != nil {
				httpapi.Fail(c, core.ErrInvalidArgument.WithMessage(err.Error()))
				return
			}
		}
	} else if raw := c.Query("group_id"); raw != "" {
		groupID, err = strconv.ParseInt(raw, 10, 64)
		if err != nil {
			httpapi.Fail(c, core.ErrInvalidArgument)
			return
		}
	}
	if groupID < 0 {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	rows, err := s.DB.Pool.Query(ctx, `SELECT g.id,g.name FROM groups g JOIN account_groups a ON a.group_id=g.id WHERE a.account_id=$1 ORDER BY g.id`, id)
	if err != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	groups := []featureGroupRef{}
	found := groupID == 0
	for rows.Next() {
		var g featureGroupRef
		if err = rows.Scan(&g.ID, &g.Name); err != nil {
			break
		}
		groups = append(groups, g)
		found = found || g.ID == groupID
	}
	if err == nil {
		err = rows.Err()
	}
	rows.Close()
	if err != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	if !found {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	account, err := LoadAccountFeaturePolicy(ctx, s.DB.Pool, id)
	if err != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	cfg, err := s.Load(ctx)
	if err != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	if draft != nil {
		if draft.Revision != account.Revision {
			httpapi.Fail(c, featureRevisionConflict())
			return
		}
		account = *draft
	}
	out := featurePreview{FeatureResolution: cfg.ResolveFeaturePolicy(groupID, account), AccountPolicy: account, Groups: groups}
	httpapi.OK(c, out)
}

// Saving a custom draft requires at least one current account group without an
// enabled prohibition. Groups need no separate CC configuration. Retaining an
// unchanged dormant draft is allowed when editing other fields.
func (s *Service) SaveAccountFeatures(ctx context.Context, tx pgx.Tx, id int64, p AccountFeaturePolicy) error {
	old, err := LoadAccountFeaturePolicy(ctx, tx, id)
	if err != nil {
		return err
	}
	if p.Mode == "custom" && (old.Mode != p.Mode || !reflect.DeepEqual(old.Overrides, p.Overrides)) {
		var raw []byte
		err = tx.QueryRow(ctx, "SELECT value FROM settings WHERE key=$1 FOR SHARE", settingKey).Scan(&raw)
		if err != nil && !store.IsNoRows(err) {
			return err
		}
		cfg, err := s.decode(raw)
		if err != nil {
			return err
		}
		rows, err := tx.Query(ctx, "SELECT group_id FROM account_groups WHERE account_id=$1", id)
		if err != nil {
			return err
		}
		allowed := false
		for rows.Next() {
			var gid int64
			if err = rows.Scan(&gid); err != nil {
				break
			}
			allowed = allowed || cfg.allowsAccountFeatures(gid)
		}
		if err == nil {
			err = rows.Err()
		}
		rows.Close()
		if err != nil {
			return err
		}
		if !allowed {
			return core.ErrPermissionDenied.WithMessage("No account group permits CC feature overrides.")
		}
	}
	return SaveAccountFeaturePolicyTx(ctx, tx, id, p)
}

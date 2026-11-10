package moderation

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Binding kinds (CONTRACTS §72.17), most specific first.
const (
	BindingGroupAccount = "group_account" // an account within a group
	BindingAccount      = "account"       // an account in any group
	BindingGroup        = "group"         // every account of a group; group 0 = the default
)

// Binding is one binding of the whole table: account_id 0 = a group binding
// (flow_groups), group_id 0 with an account = the account in any group.
// flow_id 0 = not moderated. Inactive: the flow is disabled, unpublished,
// gone or published with a spec this node cannot read, so the binding does
// not apply and a wider one decides. It is what the node does: the flow is
// not among the flows it runs (snapshot.flows).
type Binding struct {
	Kind      string `json:"kind"`
	GroupID   int64  `json:"group_id"`
	AccountID int64  `json:"account_id"`
	FlowID    int64  `json:"flow_id"`
	Inactive  bool   `json:"inactive,omitempty"`
}

func bindingKind(group, account int64) string {
	switch {
	case account == 0:
		return BindingGroup
	case group == 0:
		return BindingAccount
	default:
		return BindingGroupAccount
	}
}

// BindingsView is GET /bindings. AccountBindingsActive: the gateway.attempt
// hook is granted; without it the account bindings are kept but every
// request goes by its group.
type BindingsView struct {
	Bindings              []Binding `json:"bindings"`
	AccountBindingsActive bool      `json:"account_bindings_active"`
}

// AccountBinding is an account binding of one flow (FlowView.accounts).
type AccountBinding struct {
	GroupID   int64 `json:"group_id"`
	AccountID int64 `json:"account_id"`
}

func (p *Plugin) listBindings(ctx context.Context, _ *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	list, err := loadBindings(ctx, db, p.snap.Load())
	if err != nil {
		return nil, err
	}
	return pluginsdk.DataResponse(BindingsView{Bindings: list, AccountBindingsActive: p.attemptHook.Load()}), nil
}

// loadBindings reads both tables, account bindings first (by account, then
// group), then the group bindings. A binding is inactive when its flow is
// not one snap runs: the same test that makes the request fall back to a
// wider binding (bindGroup, bindAccount), so a published and enabled flow
// whose spec was dropped from the snapshot is not reported as applying.
func loadBindings(ctx context.Context, q querier, snap *snapshot) ([]Binding, error) {
	rows, err := q.Query(ctx, `SELECT b.group_id, b.account_id, b.flow_id
		FROM (
			SELECT group_id, account_id, flow_id FROM flow_accounts
			UNION ALL SELECT group_id, 0, flow_id FROM flow_groups) b
		ORDER BY b.account_id = 0, b.account_id, b.group_id`)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (Binding, error) {
		var b Binding
		err := r.Scan(&b.GroupID, &b.AccountID, &b.FlowID)
		b.Kind = bindingKind(b.GroupID, b.AccountID)
		b.Inactive = b.FlowID != 0 && (snap == nil || snap.flows[b.FlowID] == nil)
		return b, err
	})
	if list == nil {
		list = []Binding{}
	}
	return list, err
}

// putBinding binds {group_id, account_id} to {flow_id} (0 = not moderated).
// A binding that exists with another flow is a 409 binding_exists unless
// replace is set. Saving takes effect at once and creates no version.
func (p *Plugin) putBinding(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in struct {
		GroupID   int64 `json:"group_id"`
		AccountID int64 `json:"account_id"`
		FlowID    int64 `json:"flow_id"`
		Replace   bool  `json:"replace"`
	}
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
	}
	errs := pluginsdk.FieldErrors{}
	for _, f := range []struct {
		name string
		v    int64
	}{{"group_id", in.GroupID}, {"account_id", in.AccountID}, {"flow_id", in.FlowID}} {
		if f.v < 0 {
			errs = errs.Add(f.name, "invalid", f.name+" must be >= 0 / "+f.name+" 必须 >= 0")
		}
	}
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid binding / 绑定无效", errs), nil
	}
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		if in.FlowID > 0 {
			var exists bool
			if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM flows WHERE id = $1 AND deleted_at IS NULL)`, in.FlowID).Scan(&exists); err != nil {
				return err
			}
			if !exists {
				resp = notFound("flow")
				return errRollback
			}
		}
		current, found, err := bindingFlow(ctx, tx, in.GroupID, in.AccountID)
		if err != nil {
			return err
		}
		if found && current != in.FlowID && !in.Replace {
			resp = errorWithDetails(http.StatusConflict, "binding_exists", "the binding exists with another flow / 该绑定已指向其他流程",
				map[string]any{"flow_id": current})
			return errRollback
		}
		if in.AccountID == 0 {
			_, err = tx.Exec(ctx, `INSERT INTO flow_groups (group_id, flow_id) VALUES ($1, $2)
				ON CONFLICT (group_id) DO UPDATE SET flow_id = EXCLUDED.flow_id`, in.GroupID, in.FlowID)
		} else {
			_, err = tx.Exec(ctx, `INSERT INTO flow_accounts (group_id, account_id, flow_id) VALUES ($1, $2, $3)
				ON CONFLICT (group_id, account_id) DO UPDATE SET flow_id = EXCLUDED.flow_id`, in.GroupID, in.AccountID, in.FlowID)
		}
		return err
	})
	if resp != nil {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	return p.listBindings(ctx, req)
}

// bindingFlow reads the flow of one binding.
func bindingFlow(ctx context.Context, tx pgx.Tx, group, account int64) (int64, bool, error) {
	var flow int64
	var err error
	if account == 0 {
		err = tx.QueryRow(ctx, `SELECT flow_id FROM flow_groups WHERE group_id = $1`, group).Scan(&flow)
	} else {
		err = tx.QueryRow(ctx, `SELECT flow_id FROM flow_accounts WHERE group_id = $1 AND account_id = $2`, group, account).Scan(&flow)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	return flow, err == nil, err
}

func (p *Plugin) deleteBinding(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	group, err1 := strconv.ParseInt(pluginsdk.Param(req, "group_id"), 10, 64)
	account, err2 := strconv.ParseInt(pluginsdk.Param(req, "account_id"), 10, 64)
	if err1 != nil || err2 != nil || group < 0 || account < 0 {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "group_id and account_id must be integers >= 0 / group_id 和 account_id 必须是 >= 0 的整数"), nil
	}
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		sql := `DELETE FROM flow_accounts WHERE group_id = $1 AND account_id = $2`
		args := []any{group, account}
		if account == 0 {
			sql, args = `DELETE FROM flow_groups WHERE group_id = $1`, args[:1]
		}
		tag, err := tx.Exec(ctx, sql, args...)
		if err == nil && tag.RowsAffected() == 0 {
			resp = pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "binding not found / 绑定不存在")
			return errRollback
		}
		return err
	})
	if resp != nil {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	return p.listBindings(ctx, req)
}

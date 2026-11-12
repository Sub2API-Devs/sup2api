package authz

import (
	"context"
	"slices"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

var (
	// ErrNotTheSuperAdmin is the denial of a transfer by anyone but the super
	// admin.
	ErrNotTheSuperAdmin = core.ErrPermissionDenied.WithMessage("only the super admin can transfer the super admin role")

	errTransferToSelf         = transferTargetError("self", "you already are the super admin")
	errTransferTargetNotFound = transferTargetError("not_found", "user not found")
	errTransferTargetInactive = transferTargetError("inactive", "the user is disabled")
)

func transferTargetError(code, message string) *core.Error {
	return core.InvalidFields(core.FieldError{Field: "target_user_id", Code: code, Message: message})
}

// TransferSuperAdmin hands the super admin role to targetID inside tx, the
// only way it changes hands; every other holder becomes an admin. actorID
// must hold it; 0 is the server CLI, which also repairs a database with no or
// several holders. It returns the bumped version (call Committed after
// commit) and the demoted users. Only roles, user_roles and users are read
// and written, so the CLI runs on any schema it may meet.
func (s *Service) TransferSuperAdmin(ctx context.Context, tx pgx.Tx, actorID, targetID int64) (int64, []int64, error) {
	v, err := s.Bump(ctx, tx)
	if err != nil {
		return 0, nil, err
	}
	holders, err := superAdmins(ctx, tx)
	if err != nil {
		return 0, nil, err
	}
	if actorID != 0 && !slices.Contains(holders, actorID) {
		return 0, nil, ErrNotTheSuperAdmin
	}
	if err := checkTransferTarget(ctx, tx, actorID, targetID); err != nil {
		return 0, nil, err
	}
	// Delete before insert, so a one-holder constraint never sees two.
	demoted := slices.DeleteFunc(slices.Clone(holders), func(id int64) bool { return id == targetID })
	if _, err := tx.Exec(ctx, `DELETE FROM user_roles ur USING roles r WHERE r.id = ur.role_id AND r.superuser AND ur.user_id = ANY($1)`, demoted); err != nil {
		return 0, nil, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) SELECT u, r.id FROM unnest($1::bigint[]) u, roles r WHERE r.key = $2 ON CONFLICT DO NOTHING`, demoted, RoleAdmin); err != nil {
		return 0, nil, err
	}
	if !slices.Contains(holders, targetID) {
		if _, err := tx.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE superuser`, targetID); err != nil {
			return 0, nil, err
		}
	}
	via := "console"
	if actorID == 0 {
		via = "cli"
	}
	return v, demoted, s.audit(ctx, tx, actorID, "superadmin.transfer", "user", targetID, map[string]any{"from": holders, "to": targetID, "via": via})
}

// superAdmins locks the rows of superuser roles and returns their holders.
func superAdmins(ctx context.Context, tx pgx.Tx) ([]int64, error) {
	rows, err := tx.Query(ctx, `SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id AND r.superuser ORDER BY 1 FOR UPDATE OF ur`)
	if err != nil {
		return nil, err
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[int64])
	return slices.Compact(ids), err
}

// checkTransferTarget fails unless targetID is an active, undeleted user
// other than the acting super admin, and locks its row.
func checkTransferTarget(ctx context.Context, tx pgx.Tx, actorID, targetID int64) error {
	if actorID != 0 && targetID == actorID {
		return errTransferToSelf
	}
	var active bool
	err := tx.QueryRow(ctx, `SELECT status = 'active' FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, targetID).Scan(&active)
	switch {
	case store.IsNoRows(err):
		return errTransferTargetNotFound
	case err != nil:
		return err
	case !active:
		return errTransferTargetInactive
	}
	return nil
}

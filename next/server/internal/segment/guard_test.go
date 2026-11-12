package segment

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
)

// Whose user group a caller may choose is authz's CanActOnUsers, and never
// their own (C-L7). admin and masked both hold segment:manage; the roles
// decide.
func TestMembershipActsOnOthers(t *testing.T) {
	e := setup(t)
	az := authz.New(authz.Deps{DB: e.db})
	require.NoError(t, az.SyncCore(context.Background()))
	e.svc.users = az
	for user, role := range map[int64]string{e.admin: authz.RoleAdmin, e.masked: authz.RoleOperator} {
		e.exec(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE key = $2`, user, role)
	}
	operator, vip := e.masked, e.segment("VIP", "1")
	add := func(users ...int64) response {
		return e.do(operator, "POST", path("/segments/%d/members", vip), map[string]any{"user_ids": users})
	}
	personalize := func(user int64) response {
		return e.do(operator, "POST", path("/users/%d/personal-segment", user), map[string]any{})
	}
	depersonalize := func(user int64) response {
		return e.do(operator, "DELETE", path("/users/%d/personal-segment", user), nil)
	}

	add(e.plain, operator).failed(409, "conflict")
	add(e.plain, e.admin).failed(403, "permission_denied")
	require.NotEqual(t, vip, e.segmentOf(e.plain), "nobody moves when one may not be moved")
	require.Equal(t, float64(1), add(e.plain).ok(200).data()["moved"])

	personalize(operator).failed(409, "conflict")
	personalize(e.admin).failed(403, "permission_denied")
	personalize(e.plain).ok(201)

	e.personal(operator)
	e.personal(e.admin)
	depersonalize(operator).failed(409, "conflict")
	depersonalize(e.admin).failed(403, "permission_denied")
	depersonalize(e.plain).ok(204)
	require.Equal(t, int64(2), e.id(`SELECT count(*) FROM segments WHERE kind = 'personal'`))
}

// A service built without a user guard refuses every change of membership.
func TestMembershipWithoutGuardIsRefused(t *testing.T) {
	e := setup(t)
	e.svc.users = New(Deps{}).users
	e.do(e.admin, "POST", path("/segments/%d/members", e.defaultSegment()), map[string]any{"user_ids": []int64{e.plain}}).failed(500, "internal")
	e.do(e.admin, "POST", path("/users/%d/personal-segment", e.plain), map[string]any{}).failed(500, "internal")
	e.do(e.admin, "DELETE", path("/users/%d/personal-segment", e.plain), nil).failed(500, "internal")
}

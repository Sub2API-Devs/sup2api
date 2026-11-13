package segment

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
)

// Whose user group a caller may choose is authz's CanActOnUsers, and only a
// superuser its own (C-L7, FU5). admin and masked both hold segment:manage;
// the roles decide.
func TestMembershipActsOnOthers(t *testing.T) {
	e := setup(t)
	az := authz.New(authz.Deps{DB: e.db})
	require.NoError(t, az.SyncCore(context.Background()))
	e.svc.users = az
	super := e.user("super@x.com")
	for user, role := range map[int64]string{e.admin: authz.RoleAdmin, e.masked: authz.RoleOperator, super: authz.RoleSuperAdmin} {
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
	require.NotEqual(t, vip, e.segmentOf(e.plain), "nobody moves when the caller is among them")
	add(e.plain, e.admin).failed(403, "permission_denied")
	add(e.plain, super).failed(403, "permission_denied")
	e.do(e.admin, "POST", path("/segments/%d/members", vip), map[string]any{"user_ids": []int64{super}}).failed(403, "permission_denied")
	require.NotEqual(t, vip, e.segmentOf(e.plain), "nobody moves when one may not be moved")
	require.Equal(t, float64(1), add(e.plain).ok(200).data()["moved"])

	personalize(operator).failed(409, "conflict")
	personalize(e.admin).failed(403, "permission_denied")
	personalize(super).failed(403, "permission_denied")
	personalize(e.plain).ok(201)

	e.personal(operator)
	e.personal(e.admin)
	depersonalize(operator).failed(409, "conflict")
	depersonalize(e.admin).failed(403, "permission_denied")
	depersonalize(e.plain).ok(204)
	require.Equal(t, int64(2), e.id(`SELECT count(*) FROM segments WHERE kind = 'personal'`))
}

// A superuser chooses its own user group like anyone else's, and each time
// leaves an audit row (FU5).
func TestSuperuserChoosesOwnSegment(t *testing.T) {
	e := setup(t)
	az := authz.New(authz.Deps{DB: e.db})
	require.NoError(t, az.SyncCore(context.Background()))
	e.svc.users = az
	e.exec(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE key = $2`, e.admin, authz.RoleSuperAdmin)
	vip := e.segment("VIP", "1")
	e.do(e.admin, "POST", path("/segments/%d/members", vip), map[string]any{"user_ids": []int64{e.admin, e.plain}}).ok(200)
	require.Equal(t, vip, e.segmentOf(e.admin))
	e.do(e.admin, "POST", path("/users/%d/personal-segment", e.admin), map[string]any{}).ok(201)
	e.do(e.admin, "DELETE", path("/users/%d/personal-segment", e.admin), nil).ok(204)
	require.Equal(t, int64(3), e.id(`SELECT count(*) FROM audit_logs WHERE action = 'user.act_on_self' AND user_id = $1
		AND target_id = $1::text AND detail->>'reason' = 'self_by_superuser' AND detail->>'via' = 'session'`, e.admin))
}

// A service built without a user guard refuses every change of membership.
func TestMembershipWithoutGuardIsRefused(t *testing.T) {
	e := setup(t)
	e.svc.users = New(Deps{}).users
	e.do(e.admin, "POST", path("/segments/%d/members", e.defaultSegment()), map[string]any{"user_ids": []int64{e.plain}}).failed(500, "internal")
	e.do(e.admin, "POST", path("/users/%d/personal-segment", e.plain), map[string]any{}).failed(500, "internal")
	e.do(e.admin, "DELETE", path("/users/%d/personal-segment", e.plain), nil).failed(500, "internal")
}

// segment:manage and group:manage change what a user group charges or
// grants only when the caller is not in it, a personal segment included;
// the default segment, which everyone is in, is exempt, and a superuser
// changes its own (FU2).
func TestSettingsOfOwnSegment(t *testing.T) {
	e := setup(t)
	az := authz.New(authz.Deps{DB: e.db})
	require.NoError(t, az.SyncCore(context.Background()))
	e.svc.users = az
	e.exec(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE key = $2`, e.masked, authz.RoleOperator)
	operator, own, other := e.masked, e.segment("Own", "1"), e.segment("Other", "1")
	grp := e.group("g", "public", "1")
	e.exec(`UPDATE users SET segment_id = $2 WHERE id = $1`, operator, own)
	discount := func(segment int64) response {
		return e.do(operator, "PATCH", path("/segments/%d", segment), map[string]any{"discount": "0.5"})
	}
	grant := func(segment int64) response {
		return e.do(operator, "PUT", path("/segments/%d/groups", segment), map[string]any{"items": []map[string]any{{"group_id": grp, "granted": true}}})
	}
	grantInGroup := func(segment int64) response {
		return e.do(operator, "PUT", path("/groups/%d/segments", grp), map[string]any{"items": []map[string]any{{"segment_id": segment, "granted": true}}})
	}

	discount(own).failed(409, "conflict")
	grant(own).failed(409, "conflict")
	grantInGroup(own).failed(409, "conflict")
	e.do(operator, "DELETE", path("/segments/%d", own), nil).failed(409, "conflict")
	require.Equal(t, int64(0), e.id(`SELECT count(*) FROM segment_groups WHERE segment_id = $1`, own), "a refused save writes nothing")
	require.Equal(t, int64(1), e.id(`SELECT count(*) FROM segments WHERE id = $1 AND discount = 1`, own), "a refused patch keeps the discount")
	// Renaming is no change of terms; reads are not either.
	e.do(operator, "PATCH", path("/segments/%d", own), map[string]any{"name": "Mine"}).ok(200)
	e.do(operator, "GET", path("/segments/%d/groups", own), nil).ok(200)

	discount(other).ok(200)
	grant(other).ok(200)
	grantInGroup(other).ok(200)
	// admin is in the default segment and no superuser: it is exempt.
	require.Equal(t, e.defaultSegment(), e.segmentOf(e.admin))
	e.do(e.admin, "PATCH", path("/segments/%d", e.defaultSegment()), map[string]any{"discount": "0.9"}).ok(200)
	e.do(e.admin, "PUT", path("/groups/%d/segments", grp), map[string]any{"items": []map[string]any{{"segment_id": e.defaultSegment(), "granted": true}}}).ok(200)

	personal := e.personal(operator)
	discount(personal).failed(409, "conflict")
	grant(personal).failed(409, "conflict")

	// A superuser changes its own user group, audited.
	e.exec(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE key = $2`, e.admin, authz.RoleSuperAdmin)
	e.exec(`UPDATE users SET segment_id = $2 WHERE id = $1`, e.admin, other)
	e.do(e.admin, "PATCH", path("/segments/%d", other), map[string]any{"discount": "0.7"}).ok(200)
	e.do(e.admin, "PUT", path("/segments/%d/groups", other), map[string]any{"items": []map[string]any{{"group_id": grp, "granted": false}}}).ok(200)
	require.Equal(t, int64(2), e.id(`SELECT count(*) FROM audit_logs WHERE action = 'user.act_on_self' AND user_id = $1`, e.admin))
}

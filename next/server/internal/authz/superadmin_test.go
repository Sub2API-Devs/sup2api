package authz

import (
	"context"
	"slices"
	"strconv"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func transfer(s *Service, actor, target int64) ([]int64, error) {
	ctx := context.Background()
	var v int64
	var demoted []int64
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var err error
		v, demoted, err = s.TransferSuperAdmin(ctx, tx, actor, target)
		return err
	})
	if err == nil {
		s.Committed(ctx, v)
	}
	return demoted, err
}

// superAdminsNow lists the holders of a superuser role.
func superAdminsNow(t *testing.T, s *Service) []int64 {
	t.Helper()
	var ids []int64
	err := s.db.Tx(context.Background(), func(tx pgx.Tx) error {
		var err error
		ids, err = superAdmins(context.Background(), tx)
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	return ids
}

func userRoleKeys(t *testing.T, s *Service, uid int64) []string {
	t.Helper()
	var keys []string
	if err := s.db.Pool.QueryRow(context.Background(), `SELECT COALESCE(array_agg(r.key ORDER BY r.key), '{}') FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`, uid).Scan(&keys); err != nil {
		t.Fatal(err)
	}
	return keys
}

func TestTransferSuperAdmin(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	admin := addUser(t, s, "admin@x.com", RoleAdmin)
	target := addUser(t, s, "target@x.com", RoleUser)
	disabled := addUser(t, s, "disabled@x.com", RoleUser)
	deleted := addUser(t, s, "deleted@x.com", RoleUser)
	if _, err := db.Pool.Exec(ctx, `UPDATE users SET status = 'disabled' WHERE id = $1`, disabled); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE users SET deleted_at = now() WHERE id = $1`, deleted); err != nil {
		t.Fatal(err)
	}

	denied := []struct {
		name          string
		actor, target int64
		code          string
	}{
		{"not the super admin", admin, target, "permission_denied"},
		{"to self", root, root, "invalid_argument"},
		{"disabled target", root, disabled, "invalid_argument"},
		{"deleted target", root, deleted, "invalid_argument"},
		{"unknown target", root, 1 << 40, "invalid_argument"},
	}
	for _, tt := range denied {
		if _, err := transfer(s, tt.actor, tt.target); !isCode(err, tt.code) {
			t.Errorf("%s: %v", tt.name, err)
		}
	}
	if got := superAdminsNow(t, s); !slices.Equal(got, []int64{root}) {
		t.Fatalf("holders after refusals: %v", got)
	}

	demoted, err := transfer(s, root, target)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(demoted, []int64{root}) || !slices.Equal(superAdminsNow(t, s), []int64{target}) {
		t.Fatalf("demoted %v, holders %v", demoted, superAdminsNow(t, s))
	}
	if got := userRoleKeys(t, s, root); !slices.Equal(got, []string{RoleAdmin}) {
		t.Fatalf("old holder roles: %v", got)
	}
	if got := userRoleKeys(t, s, target); !slices.Equal(got, []string{RoleSuperAdmin, RoleUser}) {
		t.Fatalf("new holder roles: %v", got)
	}
	mustCan(t, s, target, "plugin:manage", true)
	var n int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action = 'superadmin.transfer' AND user_id = $1 AND target_id = $2
		AND detail->>'via' = 'console' AND detail->'from' = $3::jsonb`, root, strconv.FormatInt(target, 10), "["+strconv.FormatInt(root, 10)+"]").Scan(&n); err != nil || n != 1 {
		t.Fatalf("audit rows: %d %v", n, err)
	}
	if _, err := transfer(s, root, admin); !isCode(err, "permission_denied") {
		t.Fatalf("former holder transferred again: %v", err)
	}
}

// The CLI (actor 0) also repairs a database with several holders or none. A
// deleted holder loses the role without becoming an admin, so restoring the
// user later brings back no privileges.
func TestTransferSuperAdminRepairs(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	a := addUser(t, s, "a@x.com", RoleSuperAdmin)
	b := addUser(t, s, "b@x.com", RoleUser)
	c := addUser(t, s, "c@x.com", RoleUser)
	d := addUser(t, s, "d@x.com", RoleUser)
	for _, uid := range []int64{b, d} {
		testutil.ExecWithoutTrigger(t, db, "user_roles", "user_roles_one_superuser",
			`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, uid, roleID(t, s, RoleSuperAdmin))
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE users SET deleted_at = now() WHERE id = $1`, d); err != nil {
		t.Fatal(err)
	}
	demoted, err := transfer(s, 0, b)
	if err != nil || !slices.Equal(demoted, []int64{a, d}) || !slices.Equal(superAdminsNow(t, s), []int64{b}) {
		t.Fatalf("several holders: demoted %v, holders %v, %v", demoted, superAdminsNow(t, s), err)
	}
	if got := userRoleKeys(t, s, a); !slices.Equal(got, []string{RoleAdmin}) {
		t.Fatalf("demoted holder roles: %v", got)
	}
	if got := userRoleKeys(t, s, d); !slices.Equal(got, []string{RoleUser}) {
		t.Fatalf("deleted holder roles: %v", got)
	}
	if _, err := db.Pool.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`, b, roleID(t, s, RoleSuperAdmin)); err != nil {
		t.Fatal(err)
	}
	demoted, err = transfer(s, 0, c)
	if err != nil || len(demoted) != 0 || !slices.Equal(superAdminsNow(t, s), []int64{c}) {
		t.Fatalf("no holder: demoted %v, holders %v, %v", demoted, superAdminsNow(t, s), err)
	}
	var via string
	if err := db.Pool.QueryRow(ctx, `SELECT detail->>'via' FROM audit_logs WHERE action = 'superadmin.transfer' AND target_id = $1`, strconv.FormatInt(c, 10)).Scan(&via); err != nil || via != "cli" {
		t.Fatalf("via %q %v", via, err)
	}
}

// Bump serializes transfers: of two at once by the same holder, the second
// finds it no longer holds the role.
func TestTransferSuperAdminConcurrent(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	targets := []int64{addUser(t, s, "a@x.com", RoleUser), addUser(t, s, "b@x.com", RoleUser)}
	errs := make([]error, len(targets))
	var wg sync.WaitGroup
	for i, target := range targets {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, errs[i] = transfer(s, root, target)
		}()
	}
	wg.Wait()
	if (errs[0] == nil) == (errs[1] == nil) {
		t.Fatalf("both or neither succeeded: %v", errs)
	}
	for _, err := range errs {
		if err != nil && !isCode(err, "permission_denied") {
			t.Fatalf("loser: %v", err)
		}
	}
	if got := superAdminsNow(t, s); len(got) != 1 || !slices.Contains(targets, got[0]) {
		t.Fatalf("holders: %v", got)
	}
}

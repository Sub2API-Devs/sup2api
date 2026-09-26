package authz

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// ------------------------------------------------------------ fakes

type memBus struct {
	mu   sync.Mutex
	subs map[string][]func([]byte)
}

func newMemBus() *memBus { return &memBus{subs: map[string][]func([]byte){}} }

func (b *memBus) Publish(_ context.Context, ch string, payload []byte) error {
	b.mu.Lock()
	subs := append([]func([]byte){}, b.subs[ch]...)
	b.mu.Unlock()
	for _, fn := range subs {
		fn(payload)
	}
	return nil
}

func (b *memBus) Subscribe(ch string, fn func([]byte)) func() {
	b.mu.Lock()
	b.subs[ch] = append(b.subs[ch], fn)
	b.mu.Unlock()
	return func() {}
}

type fakeGen struct {
	core.Generation
	plugins []core.PluginInfo
}

func (g fakeGen) Plugins() []core.PluginInfo { return g.plugins }

type fakeRegistry struct{ gen core.Generation }

func (r fakeRegistry) Current() core.Generation                       { return r.gen }
func (r fakeRegistry) OnChange(func(core.Generation)) (cancel func()) { return func() {} }

// ------------------------------------------------------------ helpers

func newService(t *testing.T, db *store.DB, bus core.Bus, reg core.PluginRegistry) *Service {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	s := New(Deps{DB: db, Bus: bus, Plugins: reg, PollInterval: 100 * time.Millisecond})
	if err := s.Start(ctx); err != nil {
		t.Fatalf("start: %v", err)
	}
	return s
}

func addUser(t *testing.T, s *Service, email string, roles ...string) int64 {
	t.Helper()
	ctx := context.Background()
	var id int64
	if err := s.db.Pool.QueryRow(ctx, `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`, email).Scan(&id); err != nil {
		t.Fatal(err)
	}
	var v int64
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var err error
		v, err = s.SetUserRoles(ctx, tx, 0, id, roles)
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	s.Committed(ctx, v)
	return id
}

func setRoles(s *Service, actor, user int64, roles ...string) error {
	ctx := context.Background()
	var v int64
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var err error
		v, err = s.SetUserRoles(ctx, tx, actor, user, roles)
		return err
	})
	if err == nil {
		s.Committed(ctx, v)
	}
	return err
}

func roleID(t *testing.T, s *Service, key string) int64 {
	t.Helper()
	var id int64
	if err := s.db.Pool.QueryRow(context.Background(), `SELECT id FROM roles WHERE key = $1`, key).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func mustCan(t *testing.T, s *Service, uid int64, perm string, want bool) {
	t.Helper()
	got, err := s.Can(context.Background(), uid, perm)
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("Can(%d, %q) = %v, want %v", uid, perm, got, want)
	}
}

func eventually(t *testing.T, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(20 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("condition not met in time")
}

func isCode(err error, code string) bool {
	var e *core.Error
	return errors.As(err, &e) && e.Code == code
}

// ------------------------------------------------------------ tests

func TestSyncCoreSeedsCatalogAndRoles(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()

	var n int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM permissions WHERE source = 'core' AND status = 'active'`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != len(CorePermissions()) {
		t.Fatalf("core permissions = %d, want %d", n, len(CorePermissions()))
	}
	roles, err := s.ListRoles(ctx)
	if err != nil {
		t.Fatal(err)
	}
	byKey := map[string]*Role{}
	for _, r := range roles {
		byKey[r.Key] = r
	}
	if !byKey[RoleSuperAdmin].Superuser || !byKey[RoleSuperAdmin].Builtin {
		t.Fatalf("super_admin: %+v", byKey[RoleSuperAdmin])
	}
	if len(byKey[RoleAdmin].PermissionKeys) != n {
		t.Fatalf("admin perms = %d, want %d", len(byKey[RoleAdmin].PermissionKeys), n)
	}
	if len(byKey[RoleUser].PermissionKeys) != len(userRolePermissions) {
		t.Fatalf("user perms = %v", byKey[RoleUser].PermissionKeys)
	}

	// Idempotent: a second sync does not bump the version.
	v1, _ := s.currentVersion(ctx)
	if err := s.SyncCore(ctx); err != nil {
		t.Fatal(err)
	}
	v2, _ := s.currentVersion(ctx)
	if v1 != v2 {
		t.Fatalf("version bumped on no-op sync: %d -> %d", v1, v2)
	}

	// A core permission dropped from code is marked removed; a new one is
	// granted to admin.
	if _, err := db.Pool.Exec(ctx, `INSERT INTO permissions (key, module, label, source) VALUES ('legacy:thing', 'legacy', '{"en":"x"}', 'core')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `DELETE FROM permissions WHERE key = 'node:read'`); err != nil {
		t.Fatal(err)
	}
	if err := s.SyncCore(ctx); err != nil {
		t.Fatal(err)
	}
	var status string
	_ = db.Pool.QueryRow(ctx, `SELECT status FROM permissions WHERE key = 'legacy:thing'`).Scan(&status)
	if status != "removed" {
		t.Fatalf("legacy status = %q", status)
	}
	admin := addUser(t, s, "a@x.com", RoleAdmin)
	mustCan(t, s, admin, "node:read", true)
	mustCan(t, s, admin, "legacy:thing", false)
}

func TestAuthorizerCacheInvalidation(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	bus := newMemBus()
	a := newService(t, db, bus, nil)
	b := newService(t, db, bus, nil)
	ctx := context.Background()

	uid := addUser(t, a, "u@x.com", RoleUser)
	mustCan(t, a, uid, "gateway:use", true)
	mustCan(t, b, uid, "gateway:use", true)
	mustCan(t, b, uid, "user:read", false) // cached on b

	// Mutation on node a is visible on node b through the bus.
	if _, err := a.SetRolePermissions(ctx, roleID(t, a, RoleUser), append(append([]string{}, userRolePermissions...), "user:read")); err != nil {
		t.Fatal(err)
	}
	mustCan(t, a, uid, "user:read", true)
	mustCan(t, b, uid, "user:read", true)

	// Without a broadcast the poller catches up.
	c := newService(t, db, nil, nil)
	mustCan(t, c, uid, "user:read", true)
	if _, err := a.SetRolePermissions(ctx, roleID(t, a, RoleUser), userRolePermissions); err != nil {
		t.Fatal(err)
	}
	eventually(t, func() bool { ok, _ := c.Can(ctx, uid, "user:read"); return !ok })

	// Disabled users have no permissions.
	su := addUser(t, a, "s@x.com", RoleSuperAdmin)
	mustCan(t, a, su, "anything:at:all", true)
	v := bump(t, a)
	if _, err := db.Pool.Exec(ctx, `UPDATE users SET status = 'disabled' WHERE id = $1`, su); err != nil {
		t.Fatal(err)
	}
	a.Committed(ctx, v)
	mustCan(t, a, su, "anything:at:all", false)
}

func bump(t *testing.T, s *Service) int64 {
	var v int64
	err := s.db.Tx(context.Background(), func(tx pgx.Tx) error {
		var err error
		v, err = s.Bump(context.Background(), tx)
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func TestRoleManagement(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()

	if err := s.DeleteRole(ctx, roleID(t, s, RoleAdmin)); !isCode(err, "conflict") {
		t.Fatalf("delete builtin: %v", err)
	}
	if _, err := s.SetRolePermissions(ctx, roleID(t, s, RoleSuperAdmin), []string{"user:read"}); !isCode(err, "conflict") {
		t.Fatalf("super_admin perms: %v", err)
	}
	if _, err := s.CreateRole(ctx, CreateRoleInput{Key: "ops", Name: lt("Ops", "运营"), PermissionKeys: []string{"nope:x"}}); !isCode(err, "invalid_argument") {
		t.Fatalf("unknown perm: %v", err)
	}
	if _, err := s.CreateRole(ctx, CreateRoleInput{Key: "Bad Key", Name: lt("x", "x")}); !isCode(err, "invalid_argument") {
		t.Fatalf("bad key: %v", err)
	}
	r, err := s.CreateRole(ctx, CreateRoleInput{Key: "ops", Name: lt("Ops", "运营"), PermissionKeys: []string{"account:read", "account:test"}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateRole(ctx, CreateRoleInput{Key: "ops", Name: lt("Ops", "运营")}); !isCode(err, "conflict") {
		t.Fatalf("dup key: %v", err)
	}
	uid := addUser(t, s, "o@x.com", "ops")
	mustCan(t, s, uid, "account:test", true)
	mustCan(t, s, uid, "account:delete", false)

	r, err = s.UpdateRole(ctx, r.ID, UpdateRoleInput{Name: lt("Operators", "运营人员")})
	if err != nil || r.Name.Get("zh") != "运营人员" || r.UserCount != 1 {
		t.Fatalf("update: %+v %v", r, err)
	}
	if err := s.DeleteRole(ctx, r.ID); err != nil {
		t.Fatal(err)
	}
	mustCan(t, s, uid, "account:test", false)
	if _, err := s.GetRole(ctx, r.ID); !isCode(err, "not_found") {
		t.Fatalf("get deleted: %v", err)
	}
}

func TestSuperAdminRules(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)

	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	admin := addUser(t, s, "admin@x.com", RoleAdmin)

	// Cannot revoke own super_admin, nor remove the last one.
	if err := setRoles(s, root, root, RoleAdmin); !isCode(err, "conflict") {
		t.Fatalf("self revoke: %v", err)
	}
	if err := setRoles(s, 0, root, RoleAdmin); !isCode(err, "conflict") {
		t.Fatalf("last super admin: %v", err)
	}
	// A non-superuser cannot grant super_admin.
	if err := setRoles(s, admin, admin, RoleSuperAdmin); !isCode(err, "permission_denied") {
		t.Fatalf("escalation: %v", err)
	}
	// Root can promote admin; then root can be demoted by the new super admin.
	if err := setRoles(s, root, admin, RoleSuperAdmin); err != nil {
		t.Fatal(err)
	}
	if err := setRoles(s, admin, root, RoleAdmin); err != nil {
		t.Fatal(err)
	}
	if err := setRoles(s, 0, admin, "nope"); !isCode(err, "invalid_argument") {
		t.Fatalf("unknown role: %v", err)
	}
	ctx := context.Background()
	err := db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := s.Bump(ctx, tx); err != nil {
			return err
		}
		return s.EnsureNotLastSuperAdmin(ctx, tx, admin)
	})
	if !isCode(err, "conflict") {
		t.Fatalf("ensure last: %v", err)
	}
}

func TestPluginCatalog(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ('guard', '{"en":"Guard","zh":"守卫"}', 'installed')`); err != nil {
		t.Fatal(err)
	}
	admin := addUser(t, s, "a@x.com", RoleAdmin)
	user := addUser(t, s, "u@x.com", RoleUser)
	tx := func(fn func(tx pgx.Tx) error) {
		t.Helper()
		if err := db.Tx(ctx, fn); err != nil {
			t.Fatal(err)
		}
	}
	defs := []core.PermissionDef{
		{Key: "stats:read", Label: lt("View stats", "查看统计")},
		{Key: "rules:manage", Label: lt("Manage rules", "管理规则"), Sensitive: true},
	}
	tx(func(tx pgx.Tx) error { return s.SyncPlugin(ctx, tx, "guard", defs, []string{RoleAdmin}) })
	eventually(t, func() bool { ok, _ := s.Can(ctx, admin, "plugin.guard:stats:read"); return ok })
	mustCan(t, s, user, "plugin.guard:stats:read", false)
	if !s.IsSensitive("plugin.guard:rules:manage") || s.IsSensitive("plugin.guard:stats:read") {
		t.Fatal("IsSensitive for plugin permissions")
	}
	if !s.IsSensitive("user:delete") || s.IsSensitive("user:read") {
		t.Fatal("IsSensitive for core permissions")
	}

	mods, err := s.ListPermissions(ctx)
	if err != nil {
		t.Fatal(err)
	}
	last := mods[len(mods)-1]
	if mods[0].Module != "user" || last.Module != "plugin.guard" || last.Label.Get("zh") != "守卫" || len(last.Permissions) != 2 || *last.PluginKey != "guard" {
		t.Fatalf("modules: first=%s last=%+v", mods[0].Module, last)
	}

	// Disable -> permission treated as absent; enable restores it.
	tx(func(tx pgx.Tx) error { return s.SetPluginActive(ctx, tx, "guard", false) })
	eventually(t, func() bool { ok, _ := s.Can(ctx, admin, "plugin.guard:stats:read"); return !ok })
	tx(func(tx pgx.Tx) error { return s.SetPluginActive(ctx, tx, "guard", true) })
	eventually(t, func() bool { ok, _ := s.Can(ctx, admin, "plugin.guard:stats:read"); return ok })

	// Upgrade drops rules:manage, adds audit:read (granted to user only).
	defs = []core.PermissionDef{{Key: "stats:read", Label: lt("View stats", "查看统计")}, {Key: "plugin.guard:audit:read"}}
	tx(func(tx pgx.Tx) error { return s.SyncPlugin(ctx, tx, "guard", defs, []string{RoleUser}) })
	eventually(t, func() bool { ok, _ := s.Can(ctx, user, "plugin.guard:audit:read"); return ok })
	mustCan(t, s, admin, "plugin.guard:stats:read", true) // kept grant
	mustCan(t, s, admin, "plugin.guard:audit:read", false)
	var n int
	_ = db.Pool.QueryRow(ctx, `SELECT count(*) FROM permissions WHERE key = 'plugin.guard:rules:manage'`).Scan(&n)
	if n != 0 {
		t.Fatal("undeclared permission not deleted")
	}

	tx(func(tx pgx.Tx) error { return s.DeletePlugin(ctx, tx, "guard") })
	eventually(t, func() bool { ok, _ := s.Can(ctx, admin, "plugin.guard:stats:read"); return !ok })
}

func TestMenus(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	reg := fakeRegistry{gen: fakeGen{plugins: []core.PluginInfo{{
		Key: "guard",
		Manifest: &manifest.Manifest{UI: &manifest.UI{Menus: []manifest.Menu{
			{ID: "dash", Section: "plugins", Label: manifest.LocalizedText{"en": "Guard", "zh": "请求守卫"}, Page: "dashboard", Permission: "stats:read", Order: 2},
			{ID: "public", Section: "plugins", Label: manifest.LocalizedText{"en": "Info"}, Page: "info", Order: 1},
		}}},
	}, {
		// A plugin with its own sidebar section (between finance and system)
		// and an item joining a core section.
		Key: "mod",
		Manifest: &manifest.Manifest{UI: &manifest.UI{
			Sections: []manifest.MenuSection{{ID: "safety", Label: manifest.LocalizedText{"en": "Safety", "zh": "安全"}, Order: 350}},
			Menus: []manifest.Menu{
				{ID: "dash", Section: "safety", Label: manifest.LocalizedText{"en": "Moderation"}, Page: "dashboard", Permission: "mod:read"},
				{ID: "rules", Section: "gateway", Label: manifest.LocalizedText{"en": "Mod rules"}, Page: "rules", Permission: "mod:read"},
			}}},
	}}}}
	s := newService(t, db, newMemBus(), reg)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ('guard', '{"en":"Guard"}', 'enabled'), ('mod', '{"en":"Mod"}', 'enabled')`); err != nil {
		t.Fatal(err)
	}
	if err := db.Tx(ctx, func(tx pgx.Tx) error {
		if err := s.SyncPlugin(ctx, tx, "guard", []core.PermissionDef{{Key: "stats:read"}}, []string{RoleAdmin}); err != nil {
			return err
		}
		return s.SyncPlugin(ctx, tx, "mod", []core.PermissionDef{{Key: "mod:read"}}, []string{RoleAdmin})
	}); err != nil {
		t.Fatal(err)
	}

	user := addUser(t, s, "u@x.com", RoleUser)
	menus, err := s.Menus(ctx, user)
	if err != nil {
		t.Fatal(err)
	}
	var sections []string
	for _, m := range menus {
		sections = append(sections, m.Section)
	}
	if got := join(sections); got != "overview,me,plugins" {
		t.Fatalf("user sections = %s", got)
	}
	if p := menus[2].Items; len(p) != 1 || p[0].Path != "/p/guard/info" || p[0].PluginKey != "guard" {
		t.Fatalf("user plugin menus = %+v", p)
	}

	admin := addUser(t, s, "a@x.com", RoleAdmin)
	eventually(t, func() bool { ok, _ := s.Can(ctx, admin, "plugin.guard:stats:read"); return ok })
	menus, err = s.Menus(ctx, admin)
	if err != nil {
		t.Fatal(err)
	}
	sections = nil
	for _, m := range menus {
		sections = append(sections, m.Section)
	}
	if got := join(sections); got != "overview,gateway,mod:safety,system,me,plugins" {
		t.Fatalf("admin sections = %s", got)
	}
	if p := menus[5].Items; len(p) != 2 || p[1].Path != "/p/guard/dashboard" || p[1].Label.Get("zh") != "请求守卫" {
		t.Fatalf("admin plugin menus = %+v", p)
	}
	if sec := menus[2]; sec.Label.Get("zh") != "安全" || len(sec.Items) != 1 || sec.Items[0].Path != "/p/mod/dashboard" {
		t.Fatalf("plugin section = %+v", sec)
	}
	if gw := menus[1].Items; gw[len(gw)-1].Path != "/p/mod/rules" || gw[0].Path != "/groups" {
		t.Fatalf("core section with plugin item = %+v", gw)
	}
}

func join(s []string) string {
	out := ""
	for i, x := range s {
		if i > 0 {
			out += ","
		}
		out += x
	}
	return out
}

// TestOwnershipCatalog pins the CONTRACTS §21.1 keys: labels in both
// languages, only the credential views are sensitive, the user role is
// unchanged and the account/proxy menus accept the own keys.
func TestOwnershipCatalog(t *testing.T) {
	t.Parallel()
	defs := map[string]core.PermissionDef{}
	for _, d := range CorePermissions() {
		defs[d.Key] = d
	}
	want := map[string]bool{ // key -> sensitive
		"account:own:read": false, "account:own:create": false, "account:own:update": false,
		"account:own:delete": false, "account:own:test": false, "account:own:credential:view": true,
		"account:settings:custom": false, "proxy:own:read": false, "proxy:own:manage": false,
	}
	for key, sensitive := range want {
		d, ok := defs[key]
		if !ok {
			t.Fatalf("%s missing from catalog", key)
		}
		if d.Sensitive != sensitive || coreSensitive[key] != sensitive {
			t.Fatalf("%s sensitive = %v, want %v", key, d.Sensitive, sensitive)
		}
		if d.Label.Get("en") == "" || d.Label.Get("zh") == "" || d.Label.Get("en") == d.Label.Get("zh") {
			t.Fatalf("%s label = %v", key, d.Label)
		}
		if mod := strings.SplitN(key, ":", 2)[0]; d.Module != mod {
			t.Fatalf("%s module = %s", key, d.Module)
		}
	}
	if join(userRolePermissions) != "apikey:self:manage,balance:self:read,usage:self:read,gateway:use" {
		t.Fatalf("user role changed: %v", userRolePermissions)
	}
	menuKeys := map[string]string{}
	for _, sec := range coreMenus {
		for _, it := range sec.items {
			menuKeys[it.id] = join(it.anyOf)
		}
	}
	if menuKeys["accounts"] != "account:read,account:own:read,account:own:create" ||
		menuKeys["platforms"] != "account:read,account:own:read,account:own:create" ||
		menuKeys["proxies"] != "proxy:read,proxy:own:read,proxy:own:manage" {
		t.Fatalf("menus: %v", menuKeys)
	}
	set := core.PermissionSet{Keys: map[string]struct{}{"proxy:own:manage": {}}}
	if !hasAny(set, []string{"proxy:read", "proxy:own:read", "proxy:own:manage"}) || hasAny(set, []string{"proxy:read"}) {
		t.Fatal("hasAny")
	}
}

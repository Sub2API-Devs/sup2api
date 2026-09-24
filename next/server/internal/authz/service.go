// Package authz implements RBAC: the permission catalog (core and plugin
// permissions), built-in roles, role management, the cached core.Authorizer,
// core.PermissionCatalog for the plugin runtime and the console menu.
package authz

import (
	"context"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Deps are the dependencies of Service.
type Deps struct {
	DB  *store.DB
	Bus core.Bus
	// Plugins supplies plugin menus for /me/menus; may be nil.
	Plugins core.PluginRegistry
	// PollInterval is the fallback version check period (default 30s).
	PollInterval time.Duration
}

// Service is the authz module. It implements core.Authorizer and
// core.PermissionCatalog.
type Service struct {
	db      *store.DB
	bus     core.Bus
	plugins core.PluginRegistry
	poll    time.Duration

	mu         sync.RWMutex
	minVersion int64 // cached entries older than this are stale
	users      map[int64]core.PermissionSet
	catalog    *catalogSnapshot
	listeners  []func()
}

type permMeta struct {
	sensitive bool
	status    string
}

type catalogSnapshot struct {
	version int64
	perms   map[string]permMeta
}

var (
	_ core.Authorizer        = (*Service)(nil)
	_ core.PermissionCatalog = (*Service)(nil)
)

// New creates the service. Call Start before serving requests.
func New(d Deps) *Service {
	if d.PollInterval <= 0 {
		d.PollInterval = 30 * time.Second
	}
	return &Service{db: d.DB, bus: d.Bus, plugins: d.Plugins, poll: d.PollInterval, users: map[int64]core.PermissionSet{}}
}

// Start syncs the core catalog and built-in roles, subscribes to
// authz:changed and starts the fallback version poller (stopped with ctx).
func (s *Service) Start(ctx context.Context) error {
	if err := s.SyncCore(ctx); err != nil {
		return err
	}
	if s.bus != nil {
		cancel := s.bus.Subscribe(core.ChannelAuthzChanged, func(payload []byte) {
			v, err := strconv.ParseInt(string(payload), 10, 64)
			if err != nil {
				s.refreshVersion(context.Background())
				return
			}
			s.invalidate(v)
		})
		go func() { <-ctx.Done(); cancel() }()
	}
	go func() {
		t := time.NewTicker(s.poll)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				s.refreshVersion(ctx)
			}
		}
	}()
	return nil
}

// OnChange registers fn to run (asynchronously) whenever the authz version
// advances on this node; iam uses it to drop its user status cache.
func (s *Service) OnChange(fn func()) {
	s.mu.Lock()
	s.listeners = append(s.listeners, fn)
	s.mu.Unlock()
}

// ------------------------------------------------------------ versioning

// Bump increments the authz version inside tx and returns the new value. It
// also takes the authz_meta row lock, serializing all authz mutations.
func (s *Service) Bump(ctx context.Context, tx pgx.Tx) (int64, error) {
	var v int64
	err := tx.QueryRow(ctx, `UPDATE authz_meta SET version = version + 1 WHERE id = 1 RETURNING version`).Scan(&v)
	return v, err
}

// Committed must be called after a transaction that called Bump has
// committed: it invalidates local caches and broadcasts authz:changed.
func (s *Service) Committed(ctx context.Context, version int64) {
	s.invalidate(version)
	if s.bus != nil {
		if err := s.bus.Publish(ctx, core.ChannelAuthzChanged, []byte(strconv.FormatInt(version, 10))); err != nil {
			slog.WarnContext(ctx, "authz: publish authz:changed failed", "err", err)
		}
	}
}

// committedLater is used when the transaction belongs to the caller: it waits
// until the bumped version is visible, then notifies. If the transaction
// rolls back the wait times out and nothing is published (the poller keeps
// caches correct either way).
func (s *Service) committedLater(version int64) {
	go func() {
		ctx := context.Background()
		deadline := time.Now().Add(2 * time.Minute)
		delay := 50 * time.Millisecond
		for time.Now().Before(deadline) {
			time.Sleep(delay)
			if delay < time.Second {
				delay *= 2
			}
			v, err := s.currentVersion(ctx)
			if err == nil && v >= version {
				s.Committed(ctx, v)
				return
			}
		}
	}()
}

// mutate runs fn in a transaction after bumping the version, then notifies.
func (s *Service) mutate(ctx context.Context, fn func(tx pgx.Tx) error) error {
	var v int64
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var err error
		if v, err = s.Bump(ctx, tx); err != nil {
			return err
		}
		return fn(tx)
	})
	if err != nil {
		return err
	}
	s.Committed(ctx, v)
	return nil
}

func (s *Service) currentVersion(ctx context.Context) (int64, error) {
	var v int64
	err := s.db.Pool.QueryRow(ctx, `SELECT version FROM authz_meta WHERE id = 1`).Scan(&v)
	return v, err
}

func (s *Service) refreshVersion(ctx context.Context) {
	v, err := s.currentVersion(ctx)
	if err != nil {
		if ctx.Err() == nil {
			slog.WarnContext(ctx, "authz: version check failed", "err", err)
		}
		return
	}
	s.invalidate(v)
}

// invalidate drops cache entries older than version.
func (s *Service) invalidate(version int64) {
	s.mu.Lock()
	if version <= s.minVersion {
		s.mu.Unlock()
		return
	}
	s.minVersion = version
	for id, set := range s.users {
		if set.Version < version {
			delete(s.users, id)
		}
	}
	listeners := append([]func(){}, s.listeners...)
	s.mu.Unlock()
	for _, fn := range listeners {
		go fn()
	}
}

// ------------------------------------------------------------ core.Authorizer

func (s *Service) Can(ctx context.Context, userID int64, permission string) (bool, error) {
	set, err := s.PermissionSet(ctx, userID)
	if err != nil {
		return false, err
	}
	return set.Has(permission), nil
}

func (s *Service) PermissionSet(ctx context.Context, userID int64) (core.PermissionSet, error) {
	if err := s.ensureCatalog(ctx); err != nil {
		return core.PermissionSet{}, err
	}
	s.mu.RLock()
	set, ok := s.users[userID]
	min := s.minVersion
	s.mu.RUnlock()
	if ok && set.Version >= min {
		return set, nil
	}
	set, err := s.loadPermissionSet(ctx, userID)
	if err != nil {
		return core.PermissionSet{}, err
	}
	s.mu.Lock()
	if set.Version >= s.minVersion {
		s.users[userID] = set
	}
	s.mu.Unlock()
	return set, nil
}

// readSnapshot runs fn in a read-only repeatable-read transaction and returns
// the authz version seen by that snapshot.
func (s *Service) readSnapshot(ctx context.Context, fn func(tx pgx.Tx) error) (int64, error) {
	tx, err := s.db.Pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var v int64
	if err := tx.QueryRow(ctx, `SELECT version FROM authz_meta WHERE id = 1`).Scan(&v); err != nil {
		return 0, err
	}
	if err := fn(tx); err != nil {
		return 0, err
	}
	return v, tx.Commit(ctx)
}

func (s *Service) loadPermissionSet(ctx context.Context, userID int64) (core.PermissionSet, error) {
	set := core.PermissionSet{Keys: map[string]struct{}{}}
	v, err := s.readSnapshot(ctx, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `
SELECT r.superuser, p.key
FROM user_roles ur
JOIN users u ON u.id = ur.user_id AND u.deleted_at IS NULL AND u.status = 'active'
JOIN roles r ON r.id = ur.role_id
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id AND p.status = 'active'
WHERE ur.user_id = $1`, userID)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var su bool
			var key *string
			if err := rows.Scan(&su, &key); err != nil {
				return err
			}
			if su {
				set.Superuser = true
			}
			if key != nil {
				set.Keys[*key] = struct{}{}
			}
		}
		return rows.Err()
	})
	if err != nil {
		return core.PermissionSet{}, err
	}
	set.Version = v
	return set, nil
}

// IsSensitive covers core and plugin permissions (plugin ones come from the
// cached catalog, refreshed by every Can/PermissionSet call).
func (s *Service) IsSensitive(permission string) bool {
	s.mu.RLock()
	c := s.catalog
	s.mu.RUnlock()
	if c != nil {
		if m, ok := c.perms[permission]; ok {
			return m.sensitive
		}
	}
	return coreSensitive[permission]
}

// ActivePermissionKeys lists every active permission (used for superusers
// in /me).
func (s *Service) ActivePermissionKeys(ctx context.Context) ([]string, error) {
	if err := s.ensureCatalog(ctx); err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, 0, len(s.catalog.perms))
	for k, m := range s.catalog.perms {
		if m.status == "active" {
			out = append(out, k)
		}
	}
	return out, nil
}

func (s *Service) ensureCatalog(ctx context.Context) error {
	s.mu.RLock()
	fresh := s.catalog != nil && s.catalog.version >= s.minVersion
	s.mu.RUnlock()
	if fresh {
		return nil
	}
	snap := &catalogSnapshot{perms: map[string]permMeta{}}
	v, err := s.readSnapshot(ctx, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `SELECT key, sensitive, status FROM permissions`)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var k string
			var m permMeta
			if err := rows.Scan(&k, &m.sensitive, &m.status); err != nil {
				return err
			}
			snap.perms[k] = m
		}
		return rows.Err()
	})
	if err != nil {
		return err
	}
	snap.version = v
	s.mu.Lock()
	if s.catalog == nil || s.catalog.version < v {
		s.catalog = snap
	}
	s.mu.Unlock()
	return nil
}

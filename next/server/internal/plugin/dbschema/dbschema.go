// Package dbschema owns plugin database schemas (plg_<key>), the optional
// per-plugin login role, plugin SQL migrations and the restricted DSN handed
// to plugins.
package dbschema

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io/fs"
	"net/url"
	"regexp"
	"strings"
	"sync"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

var keyRe = regexp.MustCompile(`^[a-z][a-z0-9_]{1,29}$`)

// SchemaName returns "plg_<key>".
func SchemaName(pluginKey string) string { return "plg_" + pluginKey }

// Status describes the database isolation of one plugin.
type Status struct {
	Schema       string `json:"schema"`
	Role         string `json:"role,omitempty"`
	RoleIsolated bool   `json:"role_isolated"`
}

// Manager implements core.PluginSchemaManager and the runtime-internal
// schema API.
type Manager struct {
	db            *store.DB
	databaseURL   string
	masterKey     []byte
	roleIsolation bool

	mu     sync.Mutex
	status map[string]Status
}

// New creates the manager. databaseURL is the host DSN (config
// DatabaseURL); masterKey derives per-plugin role passwords; roleIsolation
// mirrors config Plugins.DBRoleIsolation.
func New(db *store.DB, databaseURL string, masterKey []byte, roleIsolation bool) *Manager {
	return &Manager{db: db, databaseURL: databaseURL, masterKey: masterKey, roleIsolation: roleIsolation, status: map[string]Status{}}
}

var _ core.PluginSchemaManager = (*Manager)(nil)

// RolePassword derives the plugin role password (never stored).
func (m *Manager) RolePassword(pluginKey string) string {
	mac := hmac.New(sha256.New, m.masterKey)
	mac.Write([]byte("plugin-db:" + pluginKey))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// canCreateRole reports whether the current connection may create roles.
func (m *Manager) canCreateRole(ctx context.Context) (bool, error) {
	var ok bool
	err := m.db.Pool.QueryRow(ctx,
		`SELECT rolcreaterole OR rolsuper FROM pg_roles WHERE rolname = current_user`).Scan(&ok)
	return ok, err
}

// Ensure creates the schema and, when possible, the isolated login role.
// It is idempotent and safe to call on every node.
func (m *Manager) Ensure(ctx context.Context, pluginKey string) (Status, error) {
	if !keyRe.MatchString(pluginKey) {
		return Status{}, fmt.Errorf("invalid plugin key %q", pluginKey)
	}
	schema := SchemaName(pluginKey)
	st := Status{Schema: schema}
	isolate := false
	if m.roleIsolation {
		ok, err := m.canCreateRole(ctx)
		if err != nil {
			return st, err
		}
		isolate = ok
	}
	sid := pgx.Identifier{schema}.Sanitize()
	lockKey := store.PluginMigrationLockKey(pluginKey)
	err := m.db.Tx(ctx, func(tx pgx.Tx) error {
		// Serialize with migrations and other nodes ensuring the same schema.
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock($1)`, lockKey^0x5a5a); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, "CREATE SCHEMA IF NOT EXISTS "+sid); err != nil {
			return err
		}
		if !isolate {
			return nil
		}
		role := schema
		rid := pgx.Identifier{role}.Sanitize()
		pw := quoteLiteral(m.RolePassword(pluginKey))
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1)`, role).Scan(&exists); err != nil {
			return err
		}
		if exists {
			if _, err := tx.Exec(ctx, "ALTER ROLE "+rid+" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20 PASSWORD "+pw); err != nil {
				return err
			}
		} else {
			if _, err := tx.Exec(ctx, "CREATE ROLE "+rid+" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20 PASSWORD "+pw); err != nil {
				return err
			}
		}
		// The host must be able to SET ROLE for migrations (PG16+ does not
		// grant SET on created roles by default).
		var verNum int
		if err := tx.QueryRow(ctx, `SELECT current_setting('server_version_num')::int`).Scan(&verNum); err != nil {
			return err
		}
		priv := "MEMBER"
		if verNum >= 160000 {
			priv = "SET"
		}
		var member bool
		if err := tx.QueryRow(ctx, `SELECT pg_has_role(current_user, $1, '`+priv+`')`, role).Scan(&member); err != nil {
			return err
		}
		if !member {
			if _, err := tx.Exec(ctx, "GRANT "+rid+" TO CURRENT_USER"); err != nil {
				return err
			}
		}
		stmts := []string{
			"ALTER SCHEMA " + sid + " OWNER TO " + rid,
			"REVOKE ALL ON SCHEMA " + sid + " FROM PUBLIC",
			"GRANT USAGE, CREATE ON SCHEMA " + sid + " TO " + rid,
			"ALTER ROLE " + rid + " SET search_path TO " + sid,
		}
		for _, s := range stmts {
			if _, err := tx.Exec(ctx, s); err != nil {
				return fmt.Errorf("%s: %w", s, err)
			}
		}
		st.Role = role
		st.RoleIsolated = true
		return nil
	})
	if err != nil {
		return st, fmt.Errorf("ensure schema %s: %w", schema, err)
	}
	m.mu.Lock()
	m.status[pluginKey] = st
	m.mu.Unlock()
	return st, nil
}

// Status returns the last known isolation status, ensuring it when unknown.
func (m *Manager) Status(ctx context.Context, pluginKey string) (Status, error) {
	m.mu.Lock()
	st, ok := m.status[pluginKey]
	m.mu.Unlock()
	if ok {
		return st, nil
	}
	return m.Ensure(ctx, pluginKey)
}

// Migrate ensures the schema and applies the plugin's SQL migrations from
// fsys (the package migrations directory). Returns applied file names.
func (m *Manager) Migrate(ctx context.Context, pluginKey string, fsys fs.FS) ([]string, error) {
	st, err := m.Ensure(ctx, pluginKey)
	if err != nil {
		return nil, err
	}
	if fsys == nil {
		return nil, nil
	}
	opt := store.MigrateOptions{LockKey: store.PluginMigrationLockKey(pluginKey), SearchPath: st.Schema}
	if st.RoleIsolated {
		opt.Role = st.Role
	}
	return store.Migrate(ctx, m.db, fsys, Tracker{PluginKey: pluginKey}, opt)
}

// Pending reports whether any of ids has not been applied yet.
func (m *Manager) Pending(ctx context.Context, pluginKey string, ids []string) (bool, error) {
	if len(ids) == 0 {
		return false, nil
	}
	var n int
	err := m.db.Pool.QueryRow(ctx,
		`SELECT count(*) FROM plugin_migrations WHERE plugin_key = $1 AND migration_id = ANY($2)`,
		pluginKey, ids).Scan(&n)
	return n < len(ids), err
}

// DSN returns the connection string a plugin should use for its schema.
func (m *Manager) DSN(ctx context.Context, pluginKey string) (dsn string, st Status, err error) {
	st, err = m.Status(ctx, pluginKey)
	if err != nil {
		return "", st, err
	}
	user, pass := "", ""
	if st.RoleIsolated {
		user, pass = st.Role, m.RolePassword(pluginKey)
	}
	dsn, err = rewriteDSN(m.databaseURL, user, pass, st.Schema)
	return dsn, st, err
}

// Drop removes the schema, the role and the migration records.
func (m *Manager) Drop(ctx context.Context, pluginKey string) error {
	if !keyRe.MatchString(pluginKey) {
		return fmt.Errorf("invalid plugin key %q", pluginKey)
	}
	schema := SchemaName(pluginKey)
	sid := pgx.Identifier{schema}.Sanitize()
	err := m.db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock($1)`, store.PluginMigrationLockKey(pluginKey)^0x5a5a); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, "DROP SCHEMA IF EXISTS "+sid+" CASCADE"); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM plugin_migrations WHERE plugin_key = $1`, pluginKey); err != nil {
			return err
		}
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1)`, schema).Scan(&exists); err != nil {
			return err
		}
		if exists {
			rid := pgx.Identifier{schema}.Sanitize()
			if _, err := tx.Exec(ctx, "DROP OWNED BY "+rid); err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, "DROP ROLE "+rid); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("drop plugin schema %s: %w", schema, err)
	}
	m.mu.Lock()
	delete(m.status, pluginKey)
	m.mu.Unlock()
	return nil
}

// Tracker records plugin migrations in public.plugin_migrations.
type Tracker struct{ PluginKey string }

func (Tracker) Ensure(context.Context, store.Querier) error { return nil }

func (t Tracker) Applied(ctx context.Context, q store.Querier) (map[string]string, error) {
	rows, err := q.Query(ctx, `SELECT migration_id, checksum FROM public.plugin_migrations WHERE plugin_key = $1`, t.PluginKey)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var id, sum string
		if err := rows.Scan(&id, &sum); err != nil {
			return nil, err
		}
		out[id] = sum
	}
	return out, rows.Err()
}

func (t Tracker) Record(ctx context.Context, tx pgx.Tx, id, checksum string) error {
	// The migration body ran as the plugin role; record as the host role.
	if _, err := tx.Exec(ctx, "RESET ROLE"); err != nil {
		return err
	}
	_, err := tx.Exec(ctx,
		`INSERT INTO public.plugin_migrations (plugin_key, migration_id, checksum) VALUES ($1, $2, $3)`,
		t.PluginKey, id, checksum)
	return err
}

// rewriteDSN replaces the credentials of dsn (URL or key=value form) and pins
// search_path to schema. Empty user keeps the host credentials.
func rewriteDSN(dsn, user, pass, schema string) (string, error) {
	opt := "-c search_path=" + schema
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		u, err := url.Parse(dsn)
		if err != nil {
			return "", fmt.Errorf("parse database url: %w", err)
		}
		if user != "" {
			u.User = url.UserPassword(user, pass)
		}
		q := u.Query()
		q.Set("options", opt)
		// libpq does not decode "+" as a space in URLs.
		u.RawQuery = strings.ReplaceAll(q.Encode(), "+", "%20")
		return u.String(), nil
	}
	// key=value form: later keys override earlier ones.
	var b strings.Builder
	b.WriteString(strings.TrimSpace(dsn))
	if user != "" {
		fmt.Fprintf(&b, " user=%s password=%s", kvQuote(user), kvQuote(pass))
	}
	fmt.Fprintf(&b, " options=%s", kvQuote(opt))
	return strings.TrimSpace(b.String()), nil
}

func kvQuote(s string) string {
	return "'" + strings.NewReplacer(`\`, `\\`, `'`, `\'`).Replace(s) + "'"
}

func quoteLiteral(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

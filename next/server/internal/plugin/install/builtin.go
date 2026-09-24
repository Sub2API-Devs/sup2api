package install

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/Masterminds/semver/v3"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Built-in plugins ship inside the image (config Plugins.BuiltinDir). The
// core installs them at startup with every requested host permission granted,
// enables them on first install and upgrades them when the image carries a
// newer version. Administrators can disable them but not uninstall them.

type systemKey struct{}

// withSystem marks work done by the core itself (no operator involved).
func withSystem(ctx context.Context) context.Context {
	return context.WithValue(ctx, systemKey{}, true)
}

func isSystem(ctx context.Context) bool { v, _ := ctx.Value(systemKey{}).(bool); return v }

// ErrBuiltin is returned when an operation is not allowed on a built-in plugin.
var ErrBuiltin = core.ErrPermissionDenied.WithMessage("built-in plugins cannot be uninstalled; disable them instead").
	WithDetails(map[string]any{"reason": "builtin"})

// IsBuiltin reports whether key is a built-in plugin.
func IsBuiltin(ctx context.Context, q store.Querier, key string) (bool, error) {
	var b bool
	err := q.QueryRow(ctx, `SELECT builtin FROM plugins WHERE key = $1`, key).Scan(&b)
	if store.IsNoRows(err) {
		return false, nil
	}
	return b, err
}

type builtinPkg struct {
	path    string
	key     string
	version *semver.Version
	data    []byte
}

// EnsureBuiltin installs, marks and enables (or upgrades) every package in
// dir. Errors of one package are logged and do not stop the others. Run it on
// one node at a time (cluster lock); it is idempotent.
func (s *Service) EnsureBuiltin(ctx context.Context, dir string, log *slog.Logger) error {
	if dir == "" {
		return nil
	}
	paths, err := filepath.Glob(filepath.Join(dir, "*.s2plugin"))
	if err != nil {
		return err
	}
	// Newest version per key.
	latest := map[string]*builtinPkg{}
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err != nil {
			log.Error("builtin plugin: read", "path", p, "err", err)
			continue
		}
		pk, err := pkg.Open(data, s.Limits())
		if err != nil {
			log.Error("builtin plugin: invalid package", "path", p, "err", err)
			continue
		}
		v, err := semver.NewVersion(pk.Manifest.Version)
		if err != nil {
			log.Error("builtin plugin: invalid version", "path", p, "version", pk.Manifest.Version)
			continue
		}
		if cur := latest[pk.Manifest.Key]; cur == nil || v.GreaterThan(cur.version) {
			latest[pk.Manifest.Key] = &builtinPkg{path: p, key: pk.Manifest.Key, version: v, data: data}
		}
	}
	keys := make([]string, 0, len(latest))
	for k := range latest {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		if err := s.ensureBuiltin(withSystem(ctx), latest[k], log); err != nil {
			log.Error("builtin plugin", "plugin", k, "version", latest[k].version.Original(), "err", err)
		}
	}
	return nil
}

func (s *Service) ensureBuiltin(ctx context.Context, b *builtinPkg, log *slog.Logger) error {
	version := b.version.Original()
	_, err := s.Upload(ctx, b.data, 0, UploadOptions{ExpectKey: b.key, ExpectVersion: version, Source: "builtin"})
	var ce *core.Error
	switch {
	case err == nil:
	case errors.As(err, &ce) && ce.Code == core.ErrConflict.Code && strings.Contains(ce.Message, "different content"):
		// The same version was stored from an earlier image build; keep it.
		log.Warn("builtin plugin: version already stored with other content, keeping the stored one",
			"plugin", b.key, "version", version)
	default:
		return fmt.Errorf("upload %s: %w", filepath.Base(b.path), err)
	}

	var consent string
	if err := s.d.DB.Pool.QueryRow(ctx, `SELECT consent_status FROM plugin_versions WHERE plugin_key = $1 AND version = $2`,
		b.key, version).Scan(&consent); err != nil {
		return err
	}
	if consent == ConsentAwaiting {
		m, err := LoadManifest(ctx, s.d.DB.Pool, b.key, version)
		if err != nil {
			return err
		}
		req := ConsentRequest{RoleKeysForNewPermissions: []string{"admin"}}
		for _, hp := range m.HostPermissions {
			req.Grants = append(req.Grants, GrantInput{Permission: hp.ID})
		}
		if _, err := s.Consent(ctx, b.key, version, req, 0); err != nil {
			return fmt.Errorf("consent: %w", err)
		}
		log.Info("builtin plugin approved", "plugin", b.key, "version", version)
	}
	if _, err := s.d.DB.Pool.Exec(ctx, `UPDATE plugins SET builtin = true, updated_at = now() WHERE key = $1 AND NOT builtin`, b.key); err != nil {
		return err
	}

	if s.d.Rollout == nil {
		return nil
	}
	if ro, err := s.d.Rollout.Current(ctx, b.key); err != nil || ro != nil {
		return err // a rollout is already running; the next start re-checks
	}
	var status string
	var active *string
	if err := s.d.DB.Pool.QueryRow(ctx, `SELECT status, active_version FROM plugins WHERE key = $1`, b.key).Scan(&status, &active); err != nil {
		return err
	}
	switch {
	case status == StatusInstalled && active == nil:
		// Never enabled: built-in plugins are on by default. A disabled one
		// stays disabled (the operator chose so).
		if _, err := s.d.Rollout.Enable(ctx, b.key, 0); err != nil {
			return fmt.Errorf("enable: %w", err)
		}
		log.Info("builtin plugin enabling", "plugin", b.key, "version", version)
	case status == StatusEnabled && active != nil && *active != version:
		cur, err := semver.NewVersion(*active)
		if err == nil && cur.LessThan(b.version) {
			if _, err := s.d.Rollout.Upgrade(ctx, b.key, version, 0); err != nil {
				return fmt.Errorf("upgrade: %w", err)
			}
			log.Info("builtin plugin upgrading", "plugin", b.key, "from", *active, "to", version)
		}
	}
	return nil
}

// Package install implements the plugin install lifecycle: upload and
// review, consent, reject, uninstall, and publisher management/revocation.
package install

import (
	"context"
	"encoding/json"
	"log/slog"
	"runtime"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Plugin statuses (plugins.status).
const (
	StatusAwaitingConsent = "awaiting_consent"
	StatusInstalled       = "installed"
	StatusEnabling        = "enabling"
	StatusEnabled         = "enabled"
	StatusUpgrading       = "upgrading"
	StatusDisabled        = "disabled"
)

// Version consent statuses (plugin_versions.consent_status).
const (
	ConsentAwaiting = "awaiting_consent"
	ConsentApproved = "approved"
	ConsentRejected = "rejected"
)

// Grant statuses (plugin_permission_grants.status).
const (
	GrantGranted = "granted"
	GrantDenied  = "denied"
	GrantRevoked = "revoked"
)

// Grant permissions checked at consent time by risk.
const (
	PermGrantHigh     = "plugin:grant:high"
	PermGrantCritical = "plugin:grant:critical"
)

// Deps are the collaborators of Service. Bus, Schemas and Accounts may be nil.
type Deps struct {
	DB          *store.DB
	Trust       *pkg.TrustStore
	Authz       core.Authorizer
	Permissions core.PermissionCatalog
	Defaults    core.PluginDefaultsApplier
	Rollout     core.RolloutController
	Schemas     core.PluginSchemaManager
	Bus         core.Bus
	// Accounts deletes a plugin's accounts on uninstall with
	// purge_accounts=true; nil makes such requests fail with unavailable.
	Accounts core.PluginAccountPurger
}

// Options are host facts.
type Options struct {
	HostVersion string
	Plugins     config.PluginConfig
	// GOOS/GOARCH override the dev-mode binary target (default runtime).
	GOOS, GOARCH string
	// MaxUnpackedBytes / MaxFiles override pkg defaults (0 = default).
	MaxUnpackedBytes int64
	MaxFiles         int
}

// Service owns the install lifecycle.
type Service struct {
	d   Deps
	opt Options

	cacheMu sync.Mutex
	cache   []cachedPkg // tiny LRU of unpacked packages
}

type cachedPkg struct {
	key, version, sha string
	p                 *pkg.Package
}

const pkgCacheSize = 8

// New builds the install service.
func New(d Deps, opt Options) *Service {
	if opt.GOOS == "" {
		opt.GOOS = runtime.GOOS
	}
	if opt.GOARCH == "" {
		opt.GOARCH = runtime.GOARCH
	}
	return &Service{d: d, opt: opt}
}

// Limits returns the unpack limits derived from configuration.
func (s *Service) Limits() pkg.Limits {
	return pkg.Limits{
		MaxPackageBytes:  s.opt.Plugins.MaxPackageBytes,
		MaxUnpackedBytes: s.opt.MaxUnpackedBytes,
		MaxFiles:         s.opt.MaxFiles,
	}
}

// HostVersion returns the configured host version.
func (s *Service) HostVersion() string { return s.opt.HostVersion }

// DB exposes the database handle to sibling packages (api, market).
func (s *Service) DB() *store.DB { return s.d.DB }

// Package loads and unpacks a stored plugin version (cached by sha256).
func (s *Service) Package(ctx context.Context, key, version string) (*pkg.Package, error) {
	var sha string
	err := s.d.DB.Pool.QueryRow(ctx,
		`SELECT package_sha256 FROM plugin_versions WHERE plugin_key = $1 AND version = $2`, key, version).Scan(&sha)
	if store.IsNoRows(err) {
		return nil, core.ErrNotFound.WithMessage("plugin version not found")
	}
	if err != nil {
		return nil, err
	}
	s.cacheMu.Lock()
	for i, c := range s.cache {
		if c.key == key && c.version == version && c.sha == sha {
			// move to front
			s.cache = append([]cachedPkg{c}, append(s.cache[:i:i], s.cache[i+1:]...)...)
			s.cacheMu.Unlock()
			return c.p, nil
		}
	}
	s.cacheMu.Unlock()

	var raw []byte
	if err := s.d.DB.Pool.QueryRow(ctx,
		`SELECT package FROM plugin_versions WHERE plugin_key = $1 AND version = $2`, key, version).Scan(&raw); err != nil {
		return nil, err
	}
	lim := s.Limits()
	lim.MaxPackageBytes = int64(len(raw)) + 1 // already accepted once
	p, err := pkg.Open(raw, lim)
	if err != nil {
		return nil, err
	}
	s.cacheMu.Lock()
	s.cache = append([]cachedPkg{{key: key, version: version, sha: sha, p: p}}, s.cache...)
	if len(s.cache) > pkgCacheSize {
		s.cache = s.cache[:pkgCacheSize]
	}
	s.cacheMu.Unlock()
	return p, nil
}

// CurrentVersion returns the version that represents the plugin today:
// active_version, else desired_version, else the newest approved version,
// else the newest uploaded one. Empty when the plugin has no versions.
func CurrentVersion(ctx context.Context, q store.Querier, key string) (string, error) {
	var v string
	err := q.QueryRow(ctx, `
		SELECT COALESCE(p.active_version, p.desired_version,
		  (SELECT version FROM plugin_versions WHERE plugin_key = p.key AND consent_status = 'approved'
		     ORDER BY uploaded_at DESC LIMIT 1),
		  (SELECT version FROM plugin_versions WHERE plugin_key = p.key AND consent_status <> 'rejected'
		     ORDER BY uploaded_at DESC LIMIT 1), '')
		FROM plugins p WHERE p.key = $1`, key).Scan(&v)
	if store.IsNoRows(err) {
		return "", core.ErrNotFound.WithMessage("plugin not found")
	}
	return v, err
}

// LoadManifest reads plugin_versions.manifest.
func LoadManifest(ctx context.Context, q store.Querier, key, version string) (*manifest.Manifest, error) {
	var raw []byte
	err := q.QueryRow(ctx, `SELECT manifest FROM plugin_versions WHERE plugin_key = $1 AND version = $2`, key, version).Scan(&raw)
	if store.IsNoRows(err) {
		return nil, core.ErrNotFound.WithMessage("plugin version not found")
	}
	if err != nil {
		return nil, err
	}
	var m manifest.Manifest
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

// Notify broadcasts a config change for the plugin runtime (best effort).
func (s *Service) Notify(ctx context.Context, key string) {
	Notify(ctx, s.d.Bus, key)
}

// Notify publishes {"type":"config","plugin_key":key} on plugin:events.
func Notify(ctx context.Context, bus core.Bus, key string) {
	publish(ctx, bus, "config", key)
}

// NotifyResources publishes {"type":"resources","plugin_key":key} on
// plugin:events after resource limits change; every node restarts its
// instances of the plugin with the new limits (CONTRACTS §14.3). Returns
// false when there is no bus or publishing failed.
func NotifyResources(ctx context.Context, bus core.Bus, key string) bool {
	return publish(ctx, bus, "resources", key)
}

func publish(ctx context.Context, bus core.Bus, typ, key string) bool {
	if bus == nil {
		return false
	}
	b, _ := json.Marshal(map[string]string{"type": typ, "plugin_key": key})
	if err := bus.Publish(ctx, core.ChannelPluginEvents, b); err != nil {
		slog.WarnContext(ctx, "publish plugin event", "type", typ, "plugin", key, "err", err)
		return false
	}
	return true
}

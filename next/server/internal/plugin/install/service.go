// Package install implements the plugin install lifecycle: upload and
// review, consent, reject, uninstall, and publisher management/revocation.
package install

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"runtime"
	"slices"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/blobs"
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

// ErrPackageGone: the version is recorded but no node holds its package any
// more (a failed upgrade's package, cleaned up, or one removed outside the
// core), so it cannot be reviewed, approved or run until it is uploaded
// again (CONTRACTS §5.7).
var ErrPackageGone = core.NewError(http.StatusGone, "package_gone", "the package of this version is no longer available; upload it again")

// Deps are the collaborators of Service. Bus, Schemas and Accounts may be nil.
type Deps struct {
	Mutations   core.PluginMutationGate
	DB          *store.DB
	Trust       *pkg.TrustStore
	Authz       core.Authorizer
	Permissions core.PermissionCatalog
	Defaults    core.PluginDefaultsApplier
	Rollout     core.RolloutController
	Schemas     core.PluginSchemaManager
	Bus         core.Bus
	Nodes       core.NodeRegistry
	// Accounts deletes a plugin's accounts on uninstall with
	// purge_accounts=true; nil makes such requests fail with unavailable.
	Accounts core.PluginAccountPurger
	// KV deletes a plugin key's KV entries on uninstall or key release with
	// purge; nil leaves them to expire.
	KV PluginKVPurger
	// Packages holds the package bytes; PostgreSQL keeps only their sha256.
	Packages *blobs.Source
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

// maxCachedPackage: larger packages are unpacked again on every use
// instead of being cached.
const maxCachedPackage = 64 << 20

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

// Package loads and unpacks a stored plugin version. The unpacked package
// is cached by sha256 while the store still holds it: one removed since
// (outside the core) is fetched again, which fails with ErrPackageGone
// unless a market download serves it (CONTRACTS §5.7).
func (s *Service) Package(ctx context.Context, key, version string) (*pkg.Package, error) {
	sha, url, err := packageRef(ctx, s.d.DB.Pool, key, version)
	if store.IsNoRows(err) {
		return nil, core.ErrNotFound.WithMessage("plugin version not found")
	}
	if err != nil {
		return nil, err
	}
	if p := s.cached(ctx, key, version, sha); p != nil {
		return p, nil
	}
	raw, err := s.d.Packages.Fetch(ctx, sha, url)
	if errors.Is(err, blobs.ErrNotFound) {
		return nil, ErrPackageGone.WithCause(err)
	}
	if err != nil {
		return nil, err
	}
	lim := s.Limits()
	lim.MaxPackageBytes = int64(len(raw)) + 1 // already accepted once
	p, err := pkg.Open(raw, lim)
	if err != nil {
		return nil, err
	}
	if int64(len(raw)) > maxCachedPackage {
		// A package carrying runtime images (CONTRACTS §53.10) would keep
		// about twice its size in memory for as long as it stays cached.
		return p, nil
	}
	s.cacheMu.Lock()
	s.cache = append([]cachedPkg{{key: key, version: version, sha: sha, p: p}}, s.uncache(key, version)...)
	if len(s.cache) > pkgCacheSize {
		s.cache = s.cache[:pkgCacheSize]
	}
	s.cacheMu.Unlock()
	return p, nil
}

// checkPackage fails with ErrPackageGone when key@version's package can no
// longer be had, as Package would: a consent must not approve a package no
// node holds. A version that does not exist passes (the caller reports it).
func (s *Service) checkPackage(ctx context.Context, key, version string) error {
	sha, _, err := packageRef(ctx, s.d.DB.Pool, key, version)
	if store.IsNoRows(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if ok, err := s.d.Packages.Has(ctx, sha); err == nil && ok {
		return nil
	}
	_, err = s.Package(ctx, key, version) // a market version may download again
	return err
}

// packageRef reads the sha256 and market URL of key@version's package.
func packageRef(ctx context.Context, q store.Querier, key, version string) (sha, url string, err error) {
	err = q.QueryRow(ctx, `SELECT package_sha256, package_url FROM plugin_versions WHERE plugin_key = $1 AND version = $2`,
		key, version).Scan(&sha, &url)
	return sha, url, err
}

// cached returns the package unpacked for key@version with sha while the
// store still holds it; otherwise it drops it.
func (s *Service) cached(ctx context.Context, key, version, sha string) *pkg.Package {
	p := s.cacheGet(key, version, sha)
	if p == nil {
		return nil
	}
	if ok, err := s.d.Packages.Has(ctx, sha); err == nil && ok {
		return p
	}
	s.cacheMu.Lock()
	s.cache = s.uncache(key, version)
	s.cacheMu.Unlock()
	return nil
}

// cacheGet returns the package cached for key@version with sha, moved to
// the front.
func (s *Service) cacheGet(key, version, sha string) *pkg.Package {
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()
	i := slices.IndexFunc(s.cache, func(c cachedPkg) bool { return c.key == key && c.version == version && c.sha == sha })
	if i < 0 {
		return nil
	}
	c := s.cache[i]
	s.cache = append([]cachedPkg{c}, slices.Delete(s.cache, i, i+1)...)
	return c.p
}

// uncache returns the cache without key@version (cacheMu held).
func (s *Service) uncache(key, version string) []cachedPkg {
	return slices.DeleteFunc(s.cache, func(c cachedPkg) bool { return c.key == key && c.version == version })
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

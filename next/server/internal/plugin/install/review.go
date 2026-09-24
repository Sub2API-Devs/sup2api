package install

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Review is the consent screen payload (CONTRACTS §5.7).
type Review struct {
	PluginKey        string              `json:"plugin_key"`
	Version          string              `json:"version"`
	Name             core.LocalizedText  `json:"name"`
	Description      core.LocalizedText  `json:"description,omitempty"`
	Icon             string              `json:"icon,omitempty"`
	Publisher        string              `json:"publisher"`
	Trust            string              `json:"trust"`
	SignatureStatus  string              `json:"signature_status"`
	KeyID            string              `json:"key_id,omitempty"`
	ConsentStatus    string              `json:"consent_status"`
	HostCompat       string              `json:"host_compat"`
	HostCompatOK     bool                `json:"host_compat_ok"`
	PackageSHA256    string              `json:"package_sha256"`
	PackageSize      int64               `json:"package_size"`
	UpgradeFrom      string              `json:"upgrade_from,omitempty"`
	Capabilities     []string            `json:"capabilities"`
	GatewayEndpoints []ReviewEndpoint    `json:"gateway_endpoints"`
	Platforms        []ReviewPlatform    `json:"platforms"`
	AccountTypes     []ReviewAccountType `json:"account_types"`
	Hooks            []ReviewHook        `json:"hooks"`
	Jobs             []ReviewJob         `json:"jobs"`
	Events           []string            `json:"events"`
	Routes           []ReviewRoute       `json:"routes"`
	Menus            []ReviewMenu        `json:"menus"`
	Slots            []ReviewSlot        `json:"slots"`
	UserPermissions  []ReviewUserPerm    `json:"user_permissions"`
	Database         *ReviewDatabase     `json:"database"`
	Resources        ReviewResources     `json:"resources"`
	ExternalServices []string            `json:"external_services"`
	HostPermissions  []ReviewHostPerm    `json:"host_permissions"`
	Diff             *ReviewDiff         `json:"diff,omitempty"`
	UploadedAt       time.Time           `json:"uploaded_at"`
}

// ReviewEndpoint is a gateway endpoint of a declared platform. In
// Review.GatewayEndpoints it carries id and platform as well.
type ReviewEndpoint struct {
	ID       string `json:"id,omitempty"`
	Platform string `json:"platform,omitempty"`
	Method   string `json:"method"`
	Path     string `json:"path"`
	Protocol string `json:"protocol"`
	Billing  string `json:"billing"`
}

// ReviewPlatform is a platform declared by the plugin (CONTRACTS §13).
type ReviewPlatform struct {
	ID          string             `json:"id"`
	Label       core.LocalizedText `json:"label,omitempty"`
	Endpoints   []ReviewEndpoint   `json:"endpoints"`
	StickyRules []string           `json:"sticky_rules"`
}

// ReviewAccountType is one top-level account type (ARCHITECTURE 6.6).
type ReviewAccountType struct {
	ID        string             `json:"id"`
	Label     core.LocalizedText `json:"label"`
	Platforms []string           `json:"platforms"`
	FormMode  string             `json:"form_mode"`
}

type ReviewHook struct {
	ID             string   `json:"id,omitempty"`
	Point          string   `json:"point"`
	Order          int      `json:"order"`
	Protocols      []string `json:"protocols"`
	Models         []string `json:"models"`
	Groups         []string `json:"groups"`
	Needs          []string `json:"needs"`
	MaxPromptBytes int      `json:"max_prompt_bytes"`
	TimeoutMs      int      `json:"timeout_ms"`
	Failure        string   `json:"failure"`
}

type ReviewJob struct {
	ID         string `json:"id"`
	Schedule   string `json:"schedule"`
	TimeoutSec int    `json:"timeout_sec"`
}

type ReviewRoute struct {
	Method     string `json:"method"`
	Path       string `json:"path"`
	Scope      string `json:"scope"`
	Permission string `json:"permission,omitempty"`
}

type ReviewMenu struct {
	ID         string             `json:"id"`
	Label      core.LocalizedText `json:"label"`
	Page       string             `json:"page"`
	PageType   string             `json:"page_type"`
	Permission string             `json:"permission,omitempty"`
}

type ReviewSlot struct {
	Slot       string `json:"slot"`
	Component  string `json:"component"`
	Permission string `json:"permission,omitempty"`
}

type ReviewUserPerm struct {
	Key         string             `json:"key"`
	Label       core.LocalizedText `json:"label"`
	Description core.LocalizedText `json:"description,omitempty"`
	Sensitive   bool               `json:"sensitive"`
}

type ReviewDatabase struct {
	Schema     string   `json:"schema"`
	Migrations []string `json:"migrations"`
}

type ReviewResources struct {
	MemoryMB     int     `json:"memory_mb"`
	CPU          float64 `json:"cpu"`
	MaxThreads   int     `json:"max_threads"`
	MaxOpenFiles int     `json:"max_open_files"`
}

type ReviewHostPerm struct {
	ID       string             `json:"id"`
	Risk     string             `json:"risk"`
	Scope    map[string]any     `json:"scope"`
	Reason   core.LocalizedText `json:"reason,omitempty"`
	Optional bool               `json:"optional"`
	// Requires is the extra console permission needed to grant it.
	Requires string `json:"requires"`
	// Current grant (upgrades only).
	CurrentStatus string         `json:"current_status,omitempty"`
	CurrentScope  map[string]any `json:"current_scope,omitempty"`
}

type ReviewDiff struct {
	Added   []DiffItem `json:"added"`
	Widened []DiffItem `json:"widened"`
	Removed []DiffItem `json:"removed"`
}

type DiffItem struct {
	ID            string         `json:"id"`
	Risk          string         `json:"risk"`
	Scope         map[string]any `json:"scope,omitempty"`
	PreviousScope map[string]any `json:"previous_scope,omitempty"`
}

// Grant is one plugin_permission_grants row.
type Grant struct {
	Permission    string         `json:"permission"`
	Risk          string         `json:"risk"`
	Scope         map[string]any `json:"scope"`
	Status        string         `json:"status"`
	PluginVersion string         `json:"plugin_version"`
	GrantedBy     *int64         `json:"granted_by"`
	GrantedAt     time.Time      `json:"granted_at"`
}

// RequiredGrantPermission maps a risk level to the console permission an
// operator needs to grant it ("" when plugin:install is enough).
func RequiredGrantPermission(risk string) string {
	switch risk {
	case manifest.RiskHigh:
		return PermGrantHigh
	case manifest.RiskCritical:
		return PermGrantCritical
	}
	return ""
}

func riskOf(id string) string {
	if r, ok := manifest.HostPermissionRisk[id]; ok {
		return r
	}
	return manifest.RiskCritical
}

// LoadGrants reads all grant rows of a plugin.
func LoadGrants(ctx context.Context, q store.Querier, key string) (map[string]Grant, error) {
	rows, err := q.Query(ctx, `
		SELECT permission, scope, status, plugin_version, granted_by, granted_at
		FROM plugin_permission_grants WHERE plugin_key = $1 ORDER BY permission`, key)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]Grant{}
	for rows.Next() {
		var g Grant
		var scope []byte
		if err := rows.Scan(&g.Permission, &scope, &g.Status, &g.PluginVersion, &g.GrantedBy, &g.GrantedAt); err != nil {
			return nil, err
		}
		g.Scope = map[string]any{}
		_ = json.Unmarshal(scope, &g.Scope)
		g.Risk = riskOf(g.Permission)
		out[g.Permission] = g
	}
	return out, rows.Err()
}

// SortedGrants returns grants ordered by permission id.
func SortedGrants(m map[string]Grant) []Grant {
	out := make([]Grant, 0, len(m))
	for _, g := range m {
		out = append(out, g)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Permission < out[j].Permission })
	return out
}

// buildReview renders the review. current is nil for first installs.
func buildReview(m *manifest.Manifest, files map[string][]byte, ver *pkg.Verification, hostVersion string, current map[string]Grant) *Review {
	r := &Review{
		PluginKey:        m.Key,
		Version:          m.Version,
		Name:             core.LocalizedText(m.Name),
		Description:      core.LocalizedText(m.Description),
		Icon:             m.Icon,
		Publisher:        ver.Publisher,
		Trust:            ver.Trust,
		SignatureStatus:  ver.SignatureStatus,
		KeyID:            ver.KeyID,
		HostCompat:       m.HostCompat,
		Capabilities:     []string{},
		GatewayEndpoints: []ReviewEndpoint{},
		Platforms:        []ReviewPlatform{},
		AccountTypes:     []ReviewAccountType{},
		Hooks:            []ReviewHook{},
		Jobs:             []ReviewJob{},
		Events:           []string{},
		Routes:           []ReviewRoute{},
		Menus:            []ReviewMenu{},
		Slots:            []ReviewSlot{},
		UserPermissions:  []ReviewUserPerm{},
		ExternalServices: append([]string{}, m.ExternalServices...),
		HostPermissions:  []ReviewHostPerm{},
	}
	r.HostCompatOK, _ = pkg.HostCompatible(m.HostCompat, hostVersion)
	for _, c := range m.Capabilities {
		r.Capabilities = append(r.Capabilities, c.ID)
	}
	for _, p := range m.Platforms {
		rp := ReviewPlatform{ID: p.ID, Label: core.LocalizedText(p.Label), Endpoints: []ReviewEndpoint{}, StickyRules: []string{}}
		for _, e := range p.Endpoints {
			billing := e.Billing
			if billing == "" {
				billing = "usage"
			}
			rp.Endpoints = append(rp.Endpoints, ReviewEndpoint{Method: e.Method, Path: e.Path, Protocol: e.Protocol, Billing: billing})
			r.GatewayEndpoints = append(r.GatewayEndpoints, ReviewEndpoint{ID: e.ID, Platform: p.ID, Method: e.Method, Path: e.Path,
				Protocol: e.Protocol, Billing: billing})
		}
		for _, sr := range p.StickyRules {
			rp.StickyRules = append(rp.StickyRules, sr.Name)
		}
		r.Platforms = append(r.Platforms, rp)
	}
	for _, at := range m.AccountTypes {
		pfs := make([]string, 0, len(at.Platforms))
		for _, ap := range at.Platforms {
			pfs = append(pfs, ap.Platform)
		}
		r.AccountTypes = append(r.AccountTypes, ReviewAccountType{ID: at.ID, Label: core.LocalizedText(at.Label), Platforms: pfs, FormMode: at.Form.Mode})
	}
	for _, h := range m.Hooks {
		failure := h.Failure
		if failure == "" {
			failure = "open"
		}
		r.Hooks = append(r.Hooks, ReviewHook{ID: h.ID, Point: h.Point, Order: h.Order, Protocols: h.Match.Protocols, Models: h.Match.Models,
			Groups: h.Match.Groups, Needs: h.Needs, MaxPromptBytes: h.MaxPromptBytes, TimeoutMs: h.TimeoutMs, Failure: failure})
	}
	for _, j := range m.Jobs {
		r.Jobs = append(r.Jobs, ReviewJob{ID: j.ID, Schedule: j.Schedule, TimeoutSec: j.TimeoutSec})
	}
	if m.Events != nil {
		r.Events = append(r.Events, m.Events.Subscribe...)
	}
	for _, rt := range m.Routes {
		r.Routes = append(r.Routes, ReviewRoute{Method: rt.Method, Path: rt.Path, Scope: rt.Scope, Permission: rt.Permission})
	}
	if m.UI != nil {
		for _, mn := range m.UI.Menus {
			r.Menus = append(r.Menus, ReviewMenu{ID: mn.ID, Label: core.LocalizedText(mn.Label), Page: mn.Page,
				PageType: m.UI.Pages[mn.Page].Type, Permission: mn.Permission})
		}
		for _, sl := range m.UI.Slots {
			r.Slots = append(r.Slots, ReviewSlot{Slot: sl.Slot, Component: sl.Component, Permission: sl.Permission})
		}
	}
	for _, up := range m.UserPermissions {
		r.UserPermissions = append(r.UserPermissions, ReviewUserPerm{Key: up.Key, Label: core.LocalizedText(up.Label),
			Description: core.LocalizedText(up.Description), Sensitive: up.Sensitive})
	}
	if m.Database != nil {
		r.Database = &ReviewDatabase{Schema: m.Database.Schema, Migrations: pkg.MigrationFiles(files, m.Database.Migrations)}
	}
	if m.Resources != nil {
		r.Resources = ReviewResources{MemoryMB: m.Resources.MemoryMB, CPU: m.Resources.CPU, MaxThreads: m.Resources.MaxThreads, MaxOpenFiles: m.Resources.MaxOpenFiles}
	}
	for _, hp := range m.HostPermissions {
		risk := riskOf(hp.ID)
		item := ReviewHostPerm{ID: hp.ID, Risk: risk, Scope: pkg.NormalizeScope(hp.Scope), Reason: core.LocalizedText(hp.Reason),
			Optional: hp.Optional, Requires: RequiredGrantPermission(risk)}
		if g, ok := current[hp.ID]; ok {
			item.CurrentStatus = g.Status
			item.CurrentScope = g.Scope
		}
		r.HostPermissions = append(r.HostPermissions, item)
	}
	if current != nil {
		r.Diff = diffGrants(m, current)
	}
	return r
}

// diffGrants compares the requested permissions with the current grants.
func diffGrants(m *manifest.Manifest, current map[string]Grant) *ReviewDiff {
	d := &ReviewDiff{Added: []DiffItem{}, Widened: []DiffItem{}, Removed: []DiffItem{}}
	requested := map[string]bool{}
	for _, hp := range m.HostPermissions {
		requested[hp.ID] = true
		scope := pkg.NormalizeScope(hp.Scope)
		g, ok := current[hp.ID]
		switch {
		case !ok || g.Status != GrantGranted:
			d.Added = append(d.Added, DiffItem{ID: hp.ID, Risk: riskOf(hp.ID), Scope: scope})
		case !pkg.ScopeWithin(scope, g.Scope):
			d.Widened = append(d.Widened, DiffItem{ID: hp.ID, Risk: riskOf(hp.ID), Scope: scope, PreviousScope: g.Scope})
		}
	}
	for _, g := range SortedGrants(current) {
		if !requested[g.Permission] && g.Status == GrantGranted {
			d.Removed = append(d.Removed, DiffItem{ID: g.Permission, Risk: g.Risk, PreviousScope: g.Scope})
		}
	}
	return d
}

// Review returns the review of a stored version (for the consent page).
func (s *Service) Review(ctx context.Context, key, version string) (*Review, error) {
	var (
		status, consent, sigStatus string
		keyID                      *string
		pubName, trust             *string
		size                       int64
		sha                        string
		uploadedAt                 time.Time
	)
	err := s.d.DB.Pool.QueryRow(ctx, `
		SELECT p.status, v.consent_status, v.signature_status, v.key_id, pub.name, pub.trust_level,
		       v.package_size, v.package_sha256, v.uploaded_at
		FROM plugin_versions v
		JOIN plugins p ON p.key = v.plugin_key
		LEFT JOIN publishers pub ON pub.id = v.publisher_id
		WHERE v.plugin_key = $1 AND v.version = $2`, key, version).
		Scan(&status, &consent, &sigStatus, &keyID, &pubName, &trust, &size, &sha, &uploadedAt)
	if store.IsNoRows(err) {
		return nil, core.ErrNotFound.WithMessage("plugin version not found")
	}
	if err != nil {
		return nil, err
	}
	p, err := s.Package(ctx, key, version)
	if err != nil {
		return nil, err
	}
	ver := &pkg.Verification{Publisher: p.Manifest.Publisher, Trust: pkg.TrustUnsigned, SignatureStatus: sigStatus}
	if pubName != nil {
		ver.Publisher, ver.Trust = *pubName, *trust
	}
	if keyID != nil {
		ver.KeyID = *keyID
	}
	var current map[string]Grant
	upgradeFrom := ""
	if status != StatusAwaitingConsent {
		if current, err = LoadGrants(ctx, s.d.DB.Pool, key); err != nil {
			return nil, err
		}
		upgradeFrom, _ = s.runningVersion(ctx, s.d.DB.Pool, key, version)
	}
	r := buildReview(p.Manifest, p.Files, ver, s.opt.HostVersion, current)
	r.ConsentStatus = consent
	r.PackageSHA256, r.PackageSize, r.UploadedAt = sha, size, uploadedAt
	r.UpgradeFrom = upgradeFrom
	return r, nil
}

// runningVersion is the version an upgrade to target replaces: the active
// version, else the newest approved version other than target.
func (s *Service) runningVersion(ctx context.Context, q store.Querier, key, target string) (string, error) {
	var v string
	err := q.QueryRow(ctx, `
		SELECT COALESCE(p.active_version,
		  (SELECT version FROM plugin_versions WHERE plugin_key = p.key AND consent_status = 'approved' AND version <> $2
		     ORDER BY uploaded_at DESC LIMIT 1), '')
		FROM plugins p WHERE p.key = $1`, key, target).Scan(&v)
	return v, err
}

package pkg

import (
	"fmt"
	"reflect"
	"regexp"
	"runtime"
	"slices"
	"sort"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/robfig/cron/v3"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/platforms"
)

var (
	keyRe            = regexp.MustCompile(`^[a-z][a-z0-9_]{1,29}$`)
	userPermKeyRe    = regexp.MustCompile(`^[a-z0-9_]+(:[a-z0-9_]+)+$`)
	idRe             = regexp.MustCompile(`^[a-z0-9][a-z0-9_.-]{0,63}$`)
	accountTypeIDRe  = regexp.MustCompile(`^[a-z][a-z0-9_]{1,49}$`)
	protocolRe       = regexp.MustCompile(`^[a-z0-9_.-]+$`)
	allowedMethods   = map[string]bool{"GET": true, "POST": true, "PUT": true, "PATCH": true, "DELETE": true}
	reservedSegments = map[string]bool{"api": true, "plugin-ui": true, "healthz": true}
)

// KnownCapabilities lists the capability ids host 0.1 understands.
var KnownCapabilities = map[string]bool{
	manifest.CapPlatformAdapter:   true,
	manifest.CapGatewayHook:       true,
	manifest.CapAppJobs:           true,
	manifest.CapAppEvents:         true,
	manifest.CapHTTPRoutes:        true,
	manifest.CapMigrationData:     true,
	manifest.CapSchedulerAffinity: true,
	manifest.CapAppBroadcast:      true,
}

// Resource caps besides the configurable memory cap.
const (
	MaxCPU          = 16.0
	MaxThreads      = 4096
	MaxOpenFiles    = 65536
	MaxHookTimeout  = 10000
	MaxPromptBytes  = 1 << 20
	RequiredArchAMD = "linux-amd64"
	RequiredArchARM = "linux-arm64"
)

// EndpointOwner is a gateway endpoint of a platform declared by another
// installed plugin.
type EndpointOwner struct {
	PluginKey string
	Platform  string
	Method    string
	Path      string
}

// PlatformOwner is a platform declared by another installed plugin.
type PlatformOwner struct {
	PluginKey string
	ID        string
}

// ValidateOptions carries host facts needed by Validate.
type ValidateOptions struct {
	// HostVersion is the server version; a pre-release suffix is ignored
	// when matching hostCompat ("0.1.0-dev" matches ">=0.1.0 <0.2.0").
	HostVersion string
	// DevMode requires a binary for GOOS/GOARCH instead of linux-amd64 and
	// linux-arm64.
	DevMode bool
	GOOS    string // default runtime.GOOS
	GOARCH  string // default runtime.GOARCH
	// MaxMemoryMB is the global per-plugin memory cap (0 = no cap).
	MaxMemoryMB int
	// OtherEndpoints are the platform endpoints of all other installed
	// plugins (built-in platform endpoints are checked by Validate itself).
	OtherEndpoints []EndpointOwner
	// OtherPlatforms are the platforms declared by all other installed plugins.
	OtherPlatforms []PlatformOwner
}

// OthersFromManifests collects the platforms and endpoints declared by the
// given manifests of other installed plugins (for ValidateOptions).
func OthersFromManifests(ms []*manifest.Manifest) ([]PlatformOwner, []EndpointOwner) {
	var pfs []PlatformOwner
	var eps []EndpointOwner
	for _, m := range ms {
		for _, p := range m.Platforms {
			pfs = append(pfs, PlatformOwner{PluginKey: m.Key, ID: p.ID})
			for _, e := range p.Endpoints {
				eps = append(eps, EndpointOwner{PluginKey: m.Key, Platform: p.ID, Method: e.Method, Path: e.Path})
			}
		}
	}
	return pfs, eps
}

type validator struct {
	m     *manifest.Manifest
	files map[string][]byte
	opt   ValidateOptions
	errs  []core.FieldError
	perms map[string]*manifest.HostPermission
}

func (v *validator) add(field, code, format string, args ...any) {
	v.errs = append(v.errs, core.FieldError{Field: field, Code: code, Message: fmt.Sprintf(format, args...)})
}

// needPerm records an error unless the host permission is requested.
func (v *validator) needPerm(field, perm, why string) *manifest.HostPermission {
	p, ok := v.perms[perm]
	if !ok {
		v.add(field, "missing_host_permission", "%s requires host permission %q", why, perm)
		return nil
	}
	return p
}

func (v *validator) needFile(field, p string) {
	if p == "" {
		v.add(field, "required", "file path is required")
		return
	}
	if _, ok := v.files[p]; !ok {
		v.add(field, "file_missing", "file %q not found in package", p)
	}
}

func (v *validator) needCap(field, capID string) {
	for _, c := range v.m.Capabilities {
		if c.ID == capID {
			return
		}
	}
	v.add(field, "missing_capability", "capability %q must be declared", capID)
}

// Validate checks a manifest against the package contents and host facts.
// All problems are reported together as invalid_argument with
// details.fields.
func Validate(m *manifest.Manifest, files map[string][]byte, opt ValidateOptions) error {
	if opt.GOOS == "" {
		opt.GOOS = runtime.GOOS
	}
	if opt.GOARCH == "" {
		opt.GOARCH = runtime.GOARCH
	}
	v := &validator{m: m, files: files, opt: opt, perms: map[string]*manifest.HostPermission{}}
	v.basics()
	v.hostPermissions()
	v.capabilities()
	v.platforms()
	v.accountTypes()
	v.pricing()
	v.hooks()
	v.events()
	v.jobs()
	v.database()
	v.userPermissions()
	v.routes()
	v.ui()
	v.resources()
	if len(v.errs) > 0 {
		return core.InvalidFields(v.errs...).WithMessage("plugin manifest validation failed")
	}
	return nil
}

func (v *validator) basics() {
	m := v.m
	if m.APIVersion != manifest.APIVersion {
		v.add("apiVersion", "unsupported", "apiVersion must be %d", manifest.APIVersion)
	}
	if !keyRe.MatchString(m.Key) {
		v.add("key", "invalid_format", "key must match %s", keyRe.String())
	}
	if strings.TrimSpace(m.Name["en"]) == "" {
		v.add("name", "required", "name.en is required")
	}
	if _, err := semver.StrictNewVersion(m.Version); err != nil {
		v.add("version", "invalid_semver", "version %q is not a valid semver (x.y.z)", m.Version)
	}
	if strings.TrimSpace(m.Publisher) == "" {
		v.add("publisher", "required", "publisher is required")
	}
	if m.Runtime != "grpc" {
		v.add("runtime", "unsupported", "runtime must be \"grpc\"")
	} else if m.Entry.GRPC == nil || m.Entry.GRPC.Binaries == "" {
		v.add("entry.grpc.binaries", "required", "entry.grpc.binaries is required")
	} else {
		tpl := m.Entry.GRPC.Binaries
		targets := [][2]string{{"linux", "amd64"}, {"linux", "arm64"}}
		if v.opt.DevMode {
			targets = [][2]string{{v.opt.GOOS, v.opt.GOARCH}}
		}
		for _, t := range targets {
			p := BinaryPath(tpl, t[0], t[1])
			b, ok := v.files[p]
			if !ok && t[0] == "windows" {
				b, ok = v.files[p+".exe"]
			}
			if !ok || len(b) == 0 {
				v.add("entry.grpc.binaries", "binary_missing", "binary for %s-%s not found at %q", t[0], t[1], p)
			}
		}
	}
	if m.HostCompat == "" {
		v.add("hostCompat", "required", "hostCompat is required")
	} else if ok, err := HostCompatible(m.HostCompat, v.opt.HostVersion); err != nil {
		v.add("hostCompat", "invalid_constraint", "hostCompat: %v", err)
	} else if !ok {
		v.add("hostCompat", "incompatible", "host version %s does not satisfy %q", v.opt.HostVersion, m.HostCompat)
	}
	if m.Icon != "" && !strings.HasPrefix(m.Icon, "text:") {
		v.needFile("icon", m.Icon)
	}
}

// BinaryPath expands the {os}/{arch} template.
func BinaryPath(tpl, goos, goarch string) string {
	return strings.NewReplacer("{os}", goos, "{arch}", goarch).Replace(tpl)
}

// HostCompatible matches a semver range against the host version, ignoring
// any pre-release/build suffix of the host version.
func HostCompatible(constraint, hostVersion string) (bool, error) {
	c, err := semver.NewConstraint(constraint)
	if err != nil {
		return false, err
	}
	hv, err := semver.NewVersion(hostVersion)
	if err != nil {
		return false, fmt.Errorf("invalid host version %q", hostVersion)
	}
	release := semver.New(hv.Major(), hv.Minor(), hv.Patch(), "", "")
	return c.Check(release), nil
}

func (v *validator) hostPermissions() {
	for i := range v.m.HostPermissions {
		hp := &v.m.HostPermissions[i]
		f := fmt.Sprintf("hostPermissions[%d]", i)
		if _, ok := manifest.HostPermissionRisk[hp.ID]; !ok {
			v.add(f+".id", "unknown", "unknown host permission %q", hp.ID)
			continue
		}
		if _, dup := v.perms[hp.ID]; dup {
			v.add(f+".id", "duplicate", "host permission %q requested twice", hp.ID)
			continue
		}
		v.perms[hp.ID] = hp
		if hp.ID == "accounts.credentials" && !reflect.DeepEqual(NormalizeScope(hp.Scope), credentialsScopeOwn) {
			v.add(f+".scope", "invalid", `accounts.credentials scope must be {"types": "own"}`)
		}
		if hp.ID == "net" {
			if d, ok := StringList(hp.Scope, "domains"); ok {
				for _, dom := range d {
					if dom == "" || strings.ContainsAny(dom, "/ :") {
						v.add(f+".scope.domains", "invalid_domain", "invalid domain %q", dom)
					}
				}
			} else if _, present := hp.Scope["domains"]; present {
				v.add(f+".scope.domains", "invalid_type", "domains must be a list of strings")
			}
		}
	}
}

func (v *validator) capabilities() {
	seen := map[string]bool{}
	for i, c := range v.m.Capabilities {
		f := fmt.Sprintf("capabilities[%d]", i)
		if !KnownCapabilities[c.ID] {
			v.add(f, "unknown", "unknown capability %q", c.ID)
		}
		if seen[c.ID] {
			v.add(f, "duplicate", "capability %q declared twice", c.ID)
		}
		seen[c.ID] = true
		// Cluster broadcast (HostService.Publish / AppService.OnBroadcast)
		// needs the matching host permission, like jobs and events.
		if c.ID == manifest.CapAppBroadcast {
			v.needPerm(f, "broadcast", "capability "+manifest.CapAppBroadcast)
		}
	}
}

// platforms validates the plugin's own platforms and their endpoints
// (ARCHITECTURE 6.4, 6.6).
func (v *validator) platforms() {
	pfs := v.m.Platforms
	if len(pfs) == 0 {
		return
	}
	v.needPerm("platforms", "gateway.endpoint", "platforms")
	v.needPerm("platforms", "platform.register", "platforms")
	type ownEndpoint struct {
		field string
		ep    manifest.Endpoint
	}
	var own []ownEndpoint
	ids := map[string]bool{}
	for i, p := range pfs {
		f := fmt.Sprintf("platforms[%d]", i)
		switch {
		case !keyRe.MatchString(p.ID):
			v.add(f+".id", "invalid_format", "platform id %q must match %s", p.ID, keyRe.String())
		case platforms.IsBuiltin(p.ID):
			v.add(f+".id", "builtin_platform", "platform id %q is a built-in platform", p.ID)
		case ids[p.ID]:
			v.add(f+".id", "duplicate", "platform %q declared twice", p.ID)
		default:
			for _, o := range v.opt.OtherPlatforms {
				if o.PluginKey != v.m.Key && o.ID == p.ID {
					v.add(f+".id", "platform_conflict", "platform %q is already declared by plugin %q", p.ID, o.PluginKey)
					break
				}
			}
		}
		ids[p.ID] = true
		if len(p.Endpoints) == 0 {
			v.add(f+".endpoints", "required", "at least one endpoint is required")
		}
		epIDs := map[string]bool{}
		for j, e := range p.Endpoints {
			ef := fmt.Sprintf("%s.endpoints[%d]", f, j)
			if !idRe.MatchString(e.ID) {
				v.add(ef+".id", "invalid_format", "endpoint id %q is invalid", e.ID)
			} else if epIDs[e.ID] {
				v.add(ef+".id", "duplicate", "endpoint id %q declared twice", e.ID)
			}
			epIDs[e.ID] = true
			if !v.endpoint(ef, p.ID, e) {
				continue
			}
			for _, o := range own {
				if EndpointsConflict(o.ep, e) {
					v.add(ef+".path", "duplicate", "endpoint %s %s conflicts with %s (%s %s)",
						strings.ToUpper(e.Method), e.Path, o.field, strings.ToUpper(o.ep.Method), o.ep.Path)
					break
				}
			}
			own = append(own, ownEndpoint{field: ef, ep: e})
			for _, bp := range platforms.Builtin() {
				for _, be := range bp.Endpoints {
					if EndpointsConflict(be, e) {
						v.add(ef+".path", "endpoint_conflict", "endpoint %s %s conflicts with built-in platform %q (%s %s)",
							strings.ToUpper(e.Method), e.Path, bp.ID, be.Method, be.Path)
					}
				}
			}
			for _, o := range v.opt.OtherEndpoints {
				if o.PluginKey == v.m.Key {
					continue
				}
				if EndpointsConflict(manifest.Endpoint{Method: o.Method, Path: o.Path}, e) {
					v.add(ef+".path", "endpoint_conflict", "endpoint %s %s conflicts with plugin %q (%s %s)",
						strings.ToUpper(e.Method), e.Path, o.PluginKey, o.Method, o.Path)
				}
			}
		}
		v.usageRules(f+".usage", p.Usage)
		v.stickyRules(f+".stickyRules", p.StickyRules)
	}
}

// endpoint validates one endpoint of platform platformID; ok=false when its
// method or path is malformed (no conflict checks then).
func (v *validator) endpoint(f, platformID string, e manifest.Endpoint) (ok bool) {
	ok = true
	if !allowedMethods[strings.ToUpper(e.Method)] {
		v.add(f+".method", "invalid", "unsupported method %q", e.Method)
		ok = false
	}
	if msg := checkEndpointPath(e.Path); msg != "" {
		v.add(f+".path", "invalid_path", "%s", msg)
		ok = false
	}
	name, hasPrefix := strings.CutPrefix(e.Protocol, platformID+".")
	switch {
	case e.Protocol == "":
		v.add(f+".protocol", "required", "protocol is required")
	case !hasPrefix || name == "" || !protocolRe.MatchString(name):
		v.add(f+".protocol", "invalid_format", "protocol %q must be %q followed by a name", e.Protocol, platformID+".")
	}
	if e.Kind != "proxy" {
		v.add(f+".kind", "unsupported", "kind must be \"proxy\"")
	}
	if e.Billing != "" && e.Billing != "usage" && e.Billing != "free" {
		v.add(f+".billing", "invalid", "billing must be usage or free")
	}
	if len(e.Auth.Headers) == 0 && e.Auth.Query == "" {
		v.add(f+".auth", "required", "auth.headers or auth.query is required")
	}
	switch {
	case e.Request.ModelPath == "" && e.Request.ModelParam == "":
		v.add(f+".request", "required", "request.modelPath or request.modelParam is required")
	case e.Request.ModelParam != "" && !slices.Contains(PathParams(e.Path), e.Request.ModelParam):
		v.add(f+".request.modelParam", "unknown_param", "path %q has no parameter %q", e.Path, e.Request.ModelParam)
	}
	if e.Usage != nil {
		v.usageRules(f+".usage", *e.Usage)
	}
	return ok
}

func checkEndpointPath(p string) string {
	if !strings.HasPrefix(p, "/") || p == "/" {
		return "path must start with / and not be the root"
	}
	segs := strings.Split(strings.TrimPrefix(p, "/"), "/")
	first := segs[0]
	if first == "" || strings.HasPrefix(first, ":") || strings.HasPrefix(first, "*") {
		return "first path segment must be a literal"
	}
	if reservedSegments[strings.ToLower(first)] {
		return fmt.Sprintf("path must not start with /%s", first)
	}
	for _, s := range segs {
		if s == "" || s == "." || s == ".." {
			return "path contains an empty or relative segment"
		}
	}
	if _, err := parseEndpointPath(p); err != nil {
		return err.Error()
	}
	return ""
}

// NormalizeRoutePath replaces gin parameter names so "/v1/:a" and "/v1/:b"
// compare equal.
func NormalizeRoutePath(p string) string {
	segs := strings.Split(p, "/")
	for i, s := range segs {
		switch {
		case strings.HasPrefix(s, ":"):
			segs[i] = ":"
		case strings.HasPrefix(s, "*"):
			segs[i] = "*"
		}
	}
	return strings.TrimSuffix(strings.Join(segs, "/"), "/")
}

func (v *validator) stickyRules(f0 string, rules []manifest.StickyRule) {
	names := map[string]bool{}
	for i, r := range rules {
		f := fmt.Sprintf("%s[%d]", f0, i)
		if r.Name == "" {
			v.add(f+".name", "required", "name is required")
		} else if names[r.Name] {
			v.add(f+".name", "duplicate", "sticky rule %q declared twice", r.Name)
		}
		names[r.Name] = true
		if len(r.KeySources) == 0 {
			v.add(f+".keySources", "required", "at least one key source is required")
		}
		for j, ks := range r.KeySources {
			switch ks.Type {
			case "body", "header", "api_key", "user":
			case "plugin":
				v.needPerm(fmt.Sprintf("%s.keySources[%d]", f, j), "scheduler.affinity", "a plugin sticky key source")
				v.needCap(fmt.Sprintf("%s.keySources[%d]", f, j), manifest.CapSchedulerAffinity)
			default:
				v.add(fmt.Sprintf("%s.keySources[%d].type", f, j), "invalid", "unknown key source type %q", ks.Type)
			}
		}
		if r.ValueRegex != "" {
			if _, err := regexp.Compile(r.ValueRegex); err != nil {
				v.add(f+".valueRegex", "invalid", "invalid regex: %v", err)
			}
		}
		if r.OnFailure != "" && r.OnFailure != "failover" && r.OnFailure != "stick" {
			v.add(f+".onFailure", "invalid", "onFailure must be failover or stick")
		}
	}
}

// credentialsScopeOwn is the only accepted scope of accounts.credentials:
// the plugin reads credentials of its own account types (ARCHITECTURE 6.6).
var credentialsScopeOwn = map[string]any{"types": "own"}

// accountTypes validates the top-level accountTypes (ARCHITECTURE 6.6).
func (v *validator) accountTypes() {
	ats := v.m.AccountTypes
	if len(ats) == 0 {
		return
	}
	v.needCap("accountTypes", manifest.CapPlatformAdapter)
	v.needPerm("accountTypes", "platform.register", "account types")
	v.needPerm("accountTypes", "accounts.credentials", "account types")
	ownPlatforms := map[string]*manifest.Platform{}
	for i := range v.m.Platforms {
		ownPlatforms[v.m.Platforms[i].ID] = &v.m.Platforms[i]
	}
	ids := map[string]bool{}
	for i, at := range ats {
		f := fmt.Sprintf("accountTypes[%d]", i)
		if !accountTypeIDRe.MatchString(at.ID) {
			v.add(f+".id", "invalid_format", "account type id %q must match %s", at.ID, accountTypeIDRe.String())
		} else if ids[at.ID] {
			v.add(f+".id", "duplicate", "account type %q declared twice", at.ID)
		}
		ids[at.ID] = true
		if strings.TrimSpace(at.Label["en"]) == "" {
			v.add(f+".label", "required", "label.en is required")
		}
		v.form(f+".form", at.Form, false)
		if len(at.Platforms) == 0 {
			v.add(f+".platforms", "required", "at least one platform is required")
		}
		seen := map[string]bool{}
		for j, ap := range at.Platforms {
			pf := fmt.Sprintf("%s.platforms[%d]", f, j)
			switch {
			case ap.Platform == "":
				v.add(pf+".platform", "required", "platform is required")
			case !keyRe.MatchString(ap.Platform):
				v.add(pf+".platform", "invalid_format", "platform id %q must match %s", ap.Platform, keyRe.String())
			case seen[ap.Platform]:
				v.add(pf+".platform", "duplicate", "platform %q listed twice", ap.Platform)
			}
			seen[ap.Platform] = true
			own := ownPlatforms[ap.Platform]
			for _, proto := range sortedKeys(ap.Usage) {
				uf := pf + ".usage." + proto
				if own != nil {
					if !slices.Contains(own.Protocols(), proto) {
						v.add(uf, "unknown_protocol", "protocol %q is not a protocol of platform %q", proto, ap.Platform)
					}
				} else if !strings.HasPrefix(proto, ap.Platform+".") {
					v.add(uf, "unknown_protocol", "protocol %q does not belong to platform %q", proto, ap.Platform)
				}
				v.usageRules(uf, ap.Usage[proto])
			}
		}
	}
}

func sortedKeys[V any](m map[string]V) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// usageRules validates usage extraction rules (platform defaults and
// account type overrides).
func (v *validator) usageRules(field string, u manifest.UsageRules) {
	if u.Semantics != "" && u.Semantics != "exclusive" && u.Semantics != "inclusive" {
		v.add(field+".semantics", "invalid", "semantics must be exclusive or inclusive")
	}
}

// form validates a console form; settings=true for ui.settings.
func (v *validator) form(field string, f manifest.Form, settings bool) {
	switch f.Mode {
	case "schema":
		v.needFile(field+".schema", f.Schema)
		if f.UISchema != "" {
			v.needFile(field+".uiSchema", f.UISchema)
		}
	case "iframe":
		v.needPerm(field, "ui.iframe", "an iframe form")
		v.needFile(field+".page", f.Page)
	case "native":
		v.needPerm(field, "ui.native", "a native form")
		if v.m.UI == nil || v.m.UI.Native == nil {
			v.add(field, "missing_native_ui", "native forms require ui.native")
		}
		if f.Component == "" && !settings {
			v.add(field+".component", "required", "component is required for native forms")
		}
	default:
		v.add(field+".mode", "invalid", "form mode must be schema, iframe or native")
	}
}

func (v *validator) pricing() {
	seen := map[string]bool{}
	for i, p := range v.m.Pricing {
		f := fmt.Sprintf("pricing[%d]", i)
		switch {
		case p.Model == "":
			v.add(f+".model", "required", "model is required")
		case !manifest.ValidModelID(p.Model):
			v.add(f+".model", "invalid", "model must be a complete model id (letters, digits, . _ : / @ + -; no wildcards)")
		case seen[p.Model]:
			v.add(f+".model", "duplicate", "model %q is priced twice", p.Model)
		}
		seen[p.Model] = true
		switch p.Mode {
		case "per_request", "per_token":
		case "expression":
			if strings.TrimSpace(p.Expression) == "" {
				v.add(f+".expression", "required", "expression is required")
			}
		default:
			v.add(f+".mode", "invalid", "mode must be per_request, per_token or expression")
		}
	}
}

func (v *validator) hooks() {
	if len(v.m.Hooks) == 0 {
		return
	}
	v.needCap("hooks", manifest.CapGatewayHook)
	hp := v.needPerm("hooks", "gateway.hook", "gateway hooks")
	var fields, points []string
	var fieldsOK, pointsOK bool
	if hp != nil {
		fields, fieldsOK = StringList(hp.Scope, "fields")
		points, pointsOK = StringList(hp.Scope, "points")
	}
	ids := map[string]bool{}
	for i, h := range v.m.Hooks {
		f := fmt.Sprintf("hooks[%d]", i)
		if h.ID != "" {
			if ids[h.ID] {
				v.add(f+".id", "duplicate", "hook id %q declared twice", h.ID)
			}
			ids[h.ID] = true
		}
		if h.Point != "gateway.request" {
			v.add(f+".point", "unsupported", "unsupported hook point %q", h.Point)
		}
		if h.Failure != "" && h.Failure != "open" && h.Failure != "closed" {
			v.add(f+".failure", "invalid", "failure must be open or closed")
		}
		if h.TimeoutMs < 0 || h.TimeoutMs > MaxHookTimeout {
			v.add(f+".timeoutMs", "out_of_range", "timeoutMs must be between 0 and %d", MaxHookTimeout)
		}
		if h.MaxPromptBytes < 0 || h.MaxPromptBytes > MaxPromptBytes {
			v.add(f+".maxPromptBytes", "out_of_range", "maxPromptBytes must be between 0 and %d", MaxPromptBytes)
		}
		if hp == nil {
			continue
		}
		if len(h.Needs) > 0 {
			if !fieldsOK {
				v.add(f+".needs", "scope_missing", "gateway.hook scope.fields must list the requested fields")
			} else if miss := CoveredBy(h.Needs, fields); len(miss) > 0 {
				v.add(f+".needs", "exceeds_scope", "fields %v are not in gateway.hook scope.fields", miss)
			}
		}
		if pointsOK && len(CoveredBy([]string{h.Point}, points)) > 0 {
			v.add(f+".point", "exceeds_scope", "point %q is not in gateway.hook scope.points", h.Point)
		}
	}
}

func (v *validator) events() {
	e := v.m.Events
	if e == nil {
		return
	}
	v.needCap("events", manifest.CapAppEvents)
	hp := v.needPerm("events", "events", "event subscriptions")
	if len(e.Subscribe) == 0 {
		v.add("events.subscribe", "required", "subscribe must not be empty")
	}
	if e.BatchSize < 0 || e.BatchSize > 1000 {
		v.add("events.batchSize", "out_of_range", "batchSize must be between 0 and 1000")
	}
	if hp == nil {
		return
	}
	scope, ok := StringList(hp.Scope, "subscribe")
	if !ok {
		v.add("events.subscribe", "scope_missing", "events scope.subscribe must list the subscribed events")
	} else if miss := CoveredBy(e.Subscribe, scope); len(miss) > 0 {
		v.add("events.subscribe", "exceeds_scope", "events %v are not in events scope.subscribe", miss)
	}
}

var cronParser = cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow | cron.Descriptor)

// ParseSchedule parses a job schedule (5-field cron or "@every <d>").
func ParseSchedule(s string) (cron.Schedule, error) { return cronParser.Parse(s) }

func (v *validator) jobs() {
	if len(v.m.Jobs) == 0 {
		return
	}
	v.needCap("jobs", manifest.CapAppJobs)
	v.needPerm("jobs", "jobs", "background jobs")
	ids := map[string]bool{}
	for i, j := range v.m.Jobs {
		f := fmt.Sprintf("jobs[%d]", i)
		if !idRe.MatchString(j.ID) {
			v.add(f+".id", "invalid_format", "job id %q is invalid", j.ID)
		} else if ids[j.ID] {
			v.add(f+".id", "duplicate", "job %q declared twice", j.ID)
		}
		ids[j.ID] = true
		if _, err := cronParser.Parse(j.Schedule); err != nil {
			v.add(f+".schedule", "invalid", "invalid schedule %q: %v", j.Schedule, err)
		}
		if j.TimeoutSec < 0 || j.TimeoutSec > 24*3600 {
			v.add(f+".timeoutSec", "out_of_range", "timeoutSec must be between 0 and 86400")
		}
	}
}

func (v *validator) database() {
	d := v.m.Database
	if d == nil {
		return
	}
	v.needPerm("database", "db.schema", "a database schema")
	if d.Schema != "plg_"+v.m.Key {
		v.add("database.schema", "invalid", "schema must be %q", "plg_"+v.m.Key)
	}
	if d.Migrations == "" {
		v.add("database.migrations", "required", "migrations directory is required")
		return
	}
	if len(MigrationFiles(v.files, d.Migrations)) == 0 {
		v.add("database.migrations", "file_missing", "no .sql files under %q", d.Migrations)
	}
}

// MigrationFiles lists *.sql files directly under dir, sorted.
func MigrationFiles(files map[string][]byte, dir string) []string {
	dir = strings.TrimSuffix(dir, "/") + "/"
	var out []string
	for p := range files {
		rest, ok := strings.CutPrefix(p, dir)
		if ok && !strings.Contains(rest, "/") && strings.HasSuffix(rest, ".sql") {
			out = append(out, rest)
		}
	}
	sort.Strings(out)
	return out
}

func (v *validator) userPermissions() {
	seen := map[string]bool{}
	for i, up := range v.m.UserPermissions {
		f := fmt.Sprintf("userPermissions[%d]", i)
		if !userPermKeyRe.MatchString(up.Key) || len("plugin."+v.m.Key+":"+up.Key) > 150 {
			v.add(f+".key", "invalid_format", "permission key %q must match %s", up.Key, userPermKeyRe.String())
		} else if seen[up.Key] {
			v.add(f+".key", "duplicate", "permission %q declared twice", up.Key)
		}
		seen[up.Key] = true
		if firstText(up.Label) == "" {
			v.add(f+".label", "required", "label is required")
		}
	}
}

func (v *validator) userPerm(p string) bool {
	for _, up := range v.m.UserPermissions {
		if up.Key == p {
			return true
		}
	}
	return false
}

func (v *validator) routes() {
	if len(v.m.Routes) == 0 {
		return
	}
	v.needCap("routes", manifest.CapHTTPRoutes)
	seen := map[string]bool{}
	for i, r := range v.m.Routes {
		f := fmt.Sprintf("routes[%d]", i)
		method := strings.ToUpper(r.Method)
		if !allowedMethods[method] {
			v.add(f+".method", "invalid", "unsupported method %q", r.Method)
		}
		if !strings.HasPrefix(r.Path, "/") {
			v.add(f+".path", "invalid_path", "path must start with /")
		}
		sig := method + " " + NormalizeRoutePath(r.Path)
		if seen[sig] {
			v.add(f+".path", "duplicate", "route %s %s declared twice", method, r.Path)
		}
		seen[sig] = true
		switch r.Scope {
		case "admin", "user":
			if r.Permission == "" {
				v.add(f+".permission", "required", "permission is required for %s routes", r.Scope)
			} else if !v.userPerm(r.Permission) {
				v.add(f+".permission", "unknown", "permission %q is not declared in userPermissions", r.Permission)
			}
		case "public", "webhook":
		default:
			v.add(f+".scope", "invalid", "scope must be admin, user, public or webhook")
			continue
		}
		v.needPerm(f+".scope", "routes."+r.Scope, r.Scope+" routes")
	}
}

func (v *validator) ui() {
	u := v.m.UI
	if u == nil {
		return
	}
	if len(u.Menus) > 0 || len(u.Pages) > 0 {
		v.needPerm("ui", "ui.menu", "menus and pages")
	}
	menuIDs := map[string]bool{}
	for i, mn := range u.Menus {
		f := fmt.Sprintf("ui.menus[%d]", i)
		if !idRe.MatchString(mn.ID) {
			v.add(f+".id", "invalid_format", "menu id %q is invalid", mn.ID)
		} else if menuIDs[mn.ID] {
			v.add(f+".id", "duplicate", "menu %q declared twice", mn.ID)
		}
		menuIDs[mn.ID] = true
		if mn.Section != "plugins" {
			v.add(f+".section", "invalid", "section must be \"plugins\"")
		}
		if firstText(mn.Label) == "" {
			v.add(f+".label", "required", "label is required")
		}
		if _, ok := u.Pages[mn.Page]; !ok {
			v.add(f+".page", "unknown", "page %q is not declared in ui.pages", mn.Page)
		}
		if mn.Permission != "" && !v.userPerm(mn.Permission) {
			v.add(f+".permission", "unknown", "permission %q is not declared in userPermissions", mn.Permission)
		}
	}
	pageIDs := make([]string, 0, len(u.Pages))
	for id := range u.Pages {
		pageIDs = append(pageIDs, id)
	}
	sort.Strings(pageIDs)
	for _, id := range pageIDs {
		pg := u.Pages[id]
		f := "ui.pages." + id
		if !idRe.MatchString(id) {
			v.add(f, "invalid_format", "page id %q is invalid", id)
		}
		switch pg.Type {
		case "table":
			if pg.Source == "" {
				v.add(f+".source", "required", "table pages require source")
			}
		case "form":
			v.needFile(f+".schema", pg.Schema)
		case "iframe":
			v.needPerm(f, "ui.iframe", "iframe pages")
			v.needFile(f+".src", pg.Src)
		case "native":
			v.needPerm(f, "ui.native", "native pages")
			if pg.Component == "" {
				v.add(f+".component", "required", "component is required for native pages")
			}
			if u.Native == nil {
				v.add(f, "missing_native_ui", "native pages require ui.native")
			}
		default:
			v.add(f+".type", "invalid", "page type must be table, form, iframe or native")
		}
	}
	for i, s := range u.Slots {
		f := fmt.Sprintf("ui.slots[%d]", i)
		switch s.Slot {
		case "dashboard.widgets", "account.detail.tabs", "account.form.widgets":
		default:
			v.add(f+".slot", "invalid", "unknown slot %q", s.Slot)
		}
		if s.Component == "" {
			v.add(f+".component", "required", "component is required")
		}
		v.needPerm(f, "ui.native", "slot components")
		if u.Native == nil {
			v.add(f, "missing_native_ui", "slot components require ui.native")
		}
		if s.Permission != "" && !v.userPerm(s.Permission) {
			v.add(f+".permission", "unknown", "permission %q is not declared in userPermissions", s.Permission)
		}
	}
	if u.Native != nil {
		v.needPerm("ui.native", "ui.native", "native UI")
		v.needFile("ui.native.entry", u.Native.Entry)
		if u.Native.Entry != "" && !strings.HasPrefix(u.Native.Entry, "ui/") {
			v.add("ui.native.entry", "invalid_path", "native entry must be under ui/")
		}
		if v.m.HostUICompat == "" {
			v.add("hostUICompat", "required", "hostUICompat is required when ui.native is used")
		} else if _, err := semver.NewConstraint(v.m.HostUICompat); err != nil {
			v.add("hostUICompat", "invalid_constraint", "hostUICompat: %v", err)
		}
	}
	if u.Settings != nil {
		v.form("ui.settings", *u.Settings, true)
	}
}

// firstText returns the "en" text or any non-empty value.
func firstText(t map[string]string) string {
	if s := strings.TrimSpace(t["en"]); s != "" {
		return s
	}
	for _, s := range t {
		if s = strings.TrimSpace(s); s != "" {
			return s
		}
	}
	return ""
}

func (v *validator) resources() {
	r := v.m.Resources
	if r == nil {
		return
	}
	if r.MemoryMB < 0 || (v.opt.MaxMemoryMB > 0 && r.MemoryMB > v.opt.MaxMemoryMB) {
		v.add("resources.memoryMB", "out_of_range", "memoryMB must be between 0 and %d", v.opt.MaxMemoryMB)
	}
	if r.CPU < 0 || r.CPU > MaxCPU {
		v.add("resources.cpu", "out_of_range", "cpu must be between 0 and %v", MaxCPU)
	}
	if r.MaxThreads < 0 || r.MaxThreads > MaxThreads {
		v.add("resources.maxThreads", "out_of_range", "maxThreads must be between 0 and %d", MaxThreads)
	}
	if r.MaxOpenFiles < 0 || r.MaxOpenFiles > MaxOpenFiles {
		v.add("resources.maxOpenFiles", "out_of_range", "maxOpenFiles must be between 0 and %d", MaxOpenFiles)
	}
}

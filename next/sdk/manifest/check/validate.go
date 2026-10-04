package check

import (
	"encoding/json"
	"fmt"
	"net/url"
	"reflect"
	"regexp"
	"runtime"
	"slices"
	"sort"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/robfig/cron/v3"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
)

var (
	keyRe           = regexp.MustCompile(`^[a-z][a-z0-9_]{1,29}$`)
	userPermKeyRe   = regexp.MustCompile(`^[a-z0-9_]+(:[a-z0-9_]+)+$`)
	idRe            = regexp.MustCompile(`^[a-z0-9][a-z0-9_.-]{0,63}$`)
	accountTypeIDRe = regexp.MustCompile(`^[a-z][a-z0-9_]{1,49}$`)
	protocolRe      = regexp.MustCompile(`^[a-z0-9_.-]+$`)
	allowedMethods  = map[string]bool{"GET": true, "POST": true, "PUT": true, "PATCH": true, "DELETE": true}
	// errorFormats are the upstream error renderings the gateway implements
	// (server/internal/gateway/errors.go writeError); an endpoint declaring
	// anything else would silently get the host's own "plain" envelope.
	errorFormats = []string{"anthropic", "openai", "gemini", "plain"}
)

// KnownCapabilities lists the capability ids host 0.1 understands.
var KnownCapabilities = map[string]bool{
	manifest.CapPlatformAdapter:   true,
	manifest.CapPlatformTasks:     true,
	manifest.CapPlatformPoll:      true,
	manifest.CapPlatformExecute:   true,
	manifest.CapPlatformMonitor:   true,
	manifest.CapPlatformWebSocket: true,
	manifest.CapGatewayHook:       true,
	manifest.CapAppJobs:           true,
	manifest.CapAppEvents:         true,
	manifest.CapHTTPRoutes:        true,
	manifest.CapMigrationData:     true,
	manifest.CapSchedulerAffinity: true,
	manifest.CapSchedulerRank:     true,
	manifest.CapAppBroadcast:      true,
}

// Resource caps besides the configurable memory cap.
const (
	MaxCPU          = 16.0
	MaxThreads      = 4096
	MaxOpenFiles    = 65536
	MaxHookTimeout  = 30000 // ms; CONTRACTS §20.1
	MinRankTimeout  = 50    // ms; scheduler.rank runs on the hot path
	MaxRankTimeout  = 1000  // ms
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
	// Tooling relaxes the three checks a manifest cannot satisfy outside an
	// installing host: hostCompat is parsed but not matched against
	// HostVersion (which is unknown), and the two package entries produced by
	// the build rather than written by the author - the runtime binaries and
	// the native UI entry - are not required. Plugin tooling (the packaging
	// CLI, a plugin's own tests) sets it; the host never does, so install-time
	// validation is unchanged.
	Tooling bool
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
	errs  []FieldError
	perms map[string]*manifest.HostPermission
	// standalone marks a run without a manifest around the platform
	// (CheckPlatform): manifest-level rules - the capabilities and host
	// permissions an endpoint implies - cannot be judged and are skipped.
	//
	// Before adding a rule to endpoint(), usageRules() or stickyRules(), ask:
	// does it read v.m? If it does, it silently passes on the two paths that
	// have no manifest - CheckPlatform (used for the core's built-in
	// platforms, sdk/platforms/*.json) and any plugin calling CheckPlatform on
	// a platform it is about to declare - because v.m is the zero
	// manifest.Manifest{} there: no capabilities, no host permissions, no
	// platforms. A rule of the shape "this endpoint needs capability X" then
	// reads "no capabilities declared" and fires on every built-in endpoint,
	// so it has to be guarded with !v.standalone (as request.modelSource is)
	// or the built-in path has to be given a real manifest to read.
	standalone bool
}

func (v *validator) add(field, code, format string, args ...any) {
	v.errs = append(v.errs, FieldError{Field: field, Code: code, Message: fmt.Sprintf(format, args...)})
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
// All problems are reported together as a *ValidationError.
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
	v.taskPairs(v.m.Platforms)
	v.accountTypes()
	v.pricing()
	v.hooks()
	v.scheduler()
	v.events()
	v.jobs()
	v.database()
	v.userPermissions()
	v.routes()
	v.ui()
	v.resources()
	if len(v.errs) > 0 {
		return &ValidationError{Fields: v.errs}
	}
	return nil
}

// CheckPlatform applies the endpoint, usage and sticky rules Validate applies
// to a plugin's platforms to a single platform definition, with no manifest
// around it. It holds the core's own built-in platforms to the same contract
// and lets a plugin check a platform it is about to declare.
//
// The rules that need the rest of the manifest are skipped, not guessed: an
// endpoint with request.modelSource "plugin" is not checked for the
// platform.adapter.v1 capability here (Validate does that).
//
// The trap this creates is worth spelling out, because it is silent: the
// validator runs with an empty manifest.Manifest{}, so any rule inside
// endpoint() (or usageRules / stickyRules) that consults v.m - capabilities,
// host permissions, other platforms, the plugin key - reads nothing at all on
// this path. That is not an error the caller sees; it is either a check that
// never fires or one that always fires. Every new rule added to those methods
// must therefore be asked "does it read v.m?", and if it does, guarded with
// v.standalone (see request.modelSource in endpoint()) - remembering that the
// core's own built-in platforms come through here, so a rule that wrongly
// fires here rejects the platforms the core ships with.
func CheckPlatform(p manifest.Platform) []FieldError {
	v := &validator{m: &manifest.Manifest{}, perms: map[string]*manifest.HostPermission{}, standalone: true}
	for i, e := range p.Endpoints {
		v.endpoint(fmt.Sprintf("endpoints[%d]", i), p, e)
	}
	v.taskPairs([]manifest.Platform{p})
	v.usageRules("usage", p.Usage, ownerPlatform, anyPluginUsage(p))
	v.stickyRules("stickyRules", p.StickyRules)
	return v.errs
}

// anyPluginUsage reports whether any endpoint of p reads its usage from a
// plugin. The platform's own usage rules are the defaults of every endpoint,
// so a fact declared there may be supplied by a plugin (and have no path) as
// soon as one endpoint asks for it.
func anyPluginUsage(p manifest.Platform) bool {
	for _, e := range p.Endpoints {
		if e.PluginUsage() || e.TaskSubmit() {
			return true
		}
	}
	return false
}

// protocolPluginUsage reports whether the endpoints of p speaking protocol
// read their usage from a plugin. p is nil when the account type overrides
// the usage of a platform this manifest does not declare (another plugin's,
// or a built-in one): the answer is then unknowable here, and the lenient one
// is returned - a fact without a path is accepted, because the platform's own
// validation is where a source is decided and a false rejection here would
// stop a legitimate override of a plugin-sourced endpoint.
func protocolPluginUsage(p *manifest.Platform, protocol string) bool {
	if p == nil {
		return true
	}
	for _, e := range p.Endpoints {
		if e.Protocol == protocol && e.PluginUsage() {
			return true
		}
	}
	return false
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
	} else if !v.opt.Tooling {
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
	switch {
	case m.HostCompat == "":
		v.add("hostCompat", "required", "hostCompat is required")
	case v.opt.Tooling:
		// No host to match against: the constraint only has to parse.
		if _, err := semver.NewConstraint(m.HostCompat); err != nil {
			v.add("hostCompat", "invalid_constraint", "hostCompat: %v", err)
		}
	default:
		if ok, err := HostCompatible(m.HostCompat, v.opt.HostVersion); err != nil {
			v.add("hostCompat", "invalid_constraint", "hostCompat: %v", err)
		} else if !ok {
			v.add("hostCompat", "incompatible", "host version %s does not satisfy %q", v.opt.HostVersion, m.HostCompat)
		}
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
		if c.ID == manifest.CapPlatformPoll || c.ID == manifest.CapPlatformExecute || c.ID == manifest.CapPlatformMonitor || c.ID == manifest.CapPlatformWebSocket {
			v.needCap(f, manifest.CapPlatformAdapter)
		}
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
			if !v.endpoint(ef, p, e) {
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
		v.usageRules(f+".usage", p.Usage, ownerPlatform, anyPluginUsage(p))
		v.stickyRules(f+".stickyRules", p.StickyRules)
	}
}

// endpoint validates one endpoint of platform p; ok=false when its
// method or path is malformed (no conflict checks then).
func (v *validator) endpoint(f string, p manifest.Platform, e manifest.Endpoint) (ok bool) {
	platformID := p.ID
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
	switch e.Kind {
	case manifest.EndpointKindProxy:
		if e.Response.Stream == manifest.ResponseWebSocket {
			v.add(f+".response.stream", "invalid", "response.stream %q is only for kind %q", manifest.ResponseWebSocket, manifest.EndpointKindWebSocket)
		}
	case manifest.EndpointKindWebSocket:
		v.webSocketEndpoint(f, e)
	default:
		v.add(f+".kind", "unsupported", "kind must be %q or %q", manifest.EndpointKindProxy, manifest.EndpointKindWebSocket)
	}
	// The gateway renders every upstream error of this endpoint in this format
	// and bills according to this mode, so neither may be left to a default.
	switch {
	case e.ErrorFormat == "":
		v.add(f+".errorFormat", "required", "errorFormat is required (%s)", strings.Join(errorFormats, ", "))
	case !slices.Contains(errorFormats, e.ErrorFormat):
		v.add(f+".errorFormat", "invalid", "errorFormat must be one of %s", strings.Join(errorFormats, ", "))
	}
	switch e.Billing {
	case "usage", "free":
	case "":
		v.add(f+".billing", "required", "billing is required (usage or free)")
	default:
		v.add(f+".billing", "invalid", "billing must be usage or free")
	}
	if len(e.BillingTypes) == 0 && e.Billing == "usage" {
		v.add(f+".billingTypes", "required", "a metered endpoint must support at least one billing type")
	}
	seenBilling := map[string]bool{}
	for _, kind := range e.BillingTypes {
		if !slices.Contains([]string{"per_request", "per_token", "expression", "video"}, kind) {
			v.add(f+".billingTypes", "invalid", "unknown billing type %q", kind)
		}
		if seenBilling[kind] {
			v.add(f+".billingTypes", "duplicate", "duplicate billing type %q", kind)
		}
		seenBilling[kind] = true
		if e.Billing == "free" || (kind == "video" && (!e.TaskSubmit() || e.Task.Kind != "video")) {
			v.add(f+".billingTypes", "conflict", "billing type %q is incompatible with this endpoint", kind)
		}
	}
	if e.Response.NonStream == "" && !e.Request.Stream && !e.WebSocket() {
		v.add(f+".response.nonStream", "required", "response.nonStream is required unless request.stream is set")
	}
	if len(e.Auth.Headers) == 0 && e.Auth.Query == "" {
		v.add(f+".auth", "required", "auth.headers or auth.query is required")
	}
	switch {
	case e.Request.ModelPath == "" && e.Request.ModelParam == "" && e.Request.ModelSource == "" && !e.TaskQuery():
		v.add(f+".request", "required", "request.modelPath, request.modelParam or request.modelSource is required")
	case boolCount(e.Request.ModelPath != "", e.Request.ModelParam != "", e.Request.ModelSource != "") > 1:
		v.add(f+".request", "mutually_exclusive", "request.modelPath, request.modelParam and request.modelSource are mutually exclusive")
	case e.Request.ModelParam != "" && !slices.Contains(PathParams(e.Path), e.Request.ModelParam):
		v.add(f+".request.modelParam", "unknown_param", "path %q has no parameter %q", e.Path, e.Request.ModelParam)
	case e.Request.ModelSource != "" && e.Request.ModelSource != manifest.ModelSourcePlugin:
		v.add(f+".request.modelSource", "invalid", "modelSource must be %q", manifest.ModelSourcePlugin)
	case e.Request.ModelSource == manifest.ModelSourcePlugin:
		// ResolveModel answers the model and whether the response streams, so
		// a streamPath next to it would silently never be read.
		if e.Request.StreamPath != "" {
			v.add(f+".request.streamPath", "mutually_exclusive",
				"request.streamPath is not read when modelSource is %q (ResolveModel answers stream)", manifest.ModelSourcePlugin)
		}
		// The host calls PlatformService of the plugin declaring the platform;
		// a plugin without platform.adapter.v1 has no such service, and every
		// request to the endpoint would be a 500 (CONTRACTS §25.1). Skipped in
		// a standalone CheckPlatform: there is no manifest to read.
		if !v.standalone {
			v.needCap(f+".request.modelSource", manifest.CapPlatformAdapter)
		}
	}
	v.queryParams(f, e)
	v.taskEndpoint(f, e)
	v.usageSource(f, e)
	if e.Usage != nil {
		v.usageRules(f+".usage", *e.Usage, ownerEndpoint, e.PluginUsage() || e.TaskSubmit())
	}
	// The other half of the §25.1 rule the modelSource branch above covers:
	// ExtractUsage goes to the PlatformService of the plugin declaring the
	// platform too, so an endpoint that reads its usage from a plugin needs
	// that plugin to declare platform.adapter.v1 as well. Since the source
	// moved onto the endpoint this reads the endpoint and nothing else - no
	// override chain to walk, no way for another plugin's account type to
	// arm or disarm it. Skipped in a standalone CheckPlatform (and for
	// built-in platforms): there is no manifest to read.
	if !v.standalone && e.PluginUsage() {
		v.needCap(f+".usageSource", manifest.CapPlatformAdapter)
	}
	v.streamUsage(f, p, e)
	return ok
}

// streamUsage catches the shape that silently swallows usage: an endpoint that
// declares it can answer with SSE, bills for what it serves, and has no SSE
// extraction rule in effect.
//
// At runtime a streaming response is read event by event and only
// UsageRules.SSE is consulted (usagerules.Acc.ApplySSE); UsageRules.JSON is
// never applied to it. So an endpoint with response.stream, billing "usage"
// and an empty sse list extracts zero tokens from every streaming request it
// serves - the request is answered, the money is not counted, and nothing says
// so. The gateway's runtime comparison of the actual response shape against
// the declaration cannot see this case at all: the declaration is right, it is
// the usage rules that are missing.
//
// "In effect" is the override chain of CONTRACTS §13 as far as it is visible
// here: the endpoint's own usage when it has one, otherwise the platform's.
// The account type layer (AccountPlatform.usage[protocol]) overrides per
// protocol and is validated where it is declared; a platform being checked on
// its own cannot see it, and an account type that overrides usage with an
// empty SSE list is a separate hole this rule does not claim to close.
//
// This rule reads only the endpoint and its platform, never v.m, so it holds
// on the CheckPlatform path too - which is the point: the core's own built-in
// platforms are checked by exactly the same rule.
func (v *validator) streamUsage(f string, p manifest.Platform, e manifest.Endpoint) {
	if e.Response.Stream == "" || e.Billing == "free" {
		return
	}
	u, owner := p.Usage, "platforms usage"
	if e.Usage != nil {
		u, owner = *e.Usage, "this endpoint's usage"
	}
	// usage.source "plugin" is the declared way out of the gjson rules - an
	// endpoint takes it precisely because no sse map can express its usage,
	// so requiring one here would forbid the feature. The cost is real and
	// deliberate: when ExtractUsage fails the host falls back to these (then
	// empty) rules and counts zero. That fallback is never silent - it warns
	// and marks the usage record - which is the trade this rule cannot make.
	if e.PluginUsage() {
		return
	}
	for _, s := range u.SSE {
		if len(s.Map) > 0 {
			return
		}
	}
	// Pointing at the endpoint's own usage even when the platform default is
	// the empty one is deliberate: the fix belongs where the exception is.
	v.add(f+".usage.sse", "required",
		"endpoint declares response.stream %q and billing %q, but %s has no non-empty sse rule: "+
			"streaming responses are metered from usage.sse only (usage.json is not applied to them), "+
			"so every streaming request would be billed as zero tokens",
		e.Response.Stream, e.Billing, owner)
}

func boolCount(bs ...bool) int {
	n := 0
	for _, b := range bs {
		if b {
			n++
		}
	}
	return n
}

// queryParamRe is what a declared query parameter name may look like: the
// characters a client can put in a query key without percent-encoding and a
// plugin author can type. The host matches them case-insensitively.
var queryParamRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`)

// queryParams validates request.queryParams, the allow-list of query
// parameters the host copies into RequestMeta.query.
//
// The endpoint's auth.query parameter may not be listed, and the comparison
// is case-insensitive because the host's is: it excludes auth.query with
// strings.EqualFold (url.Values is a case-sensitive map, so deleting by exact
// name would leak "?Key=sk-..." to the plugin) and matches the allow-list the
// same way. Catching the collision at install time is what makes that safe.
func (v *validator) queryParams(f string, e manifest.Endpoint) {
	seen := map[string]bool{}
	for i, name := range e.Request.QueryParams {
		qf := fmt.Sprintf("%s.request.queryParams[%d]", f, i)
		if !queryParamRe.MatchString(name) {
			v.add(qf, "invalid_format", "query parameter name %q must match %s", name, queryParamRe.String())
			continue
		}
		lower := strings.ToLower(name)
		if seen[lower] {
			v.add(qf, "duplicate", "query parameter %q is declared twice (names are matched case-insensitively)", name)
		}
		seen[lower] = true
		if e.Auth.Query != "" && strings.EqualFold(name, e.Auth.Query) {
			v.add(qf, "credential_param",
				"query parameter %q is the endpoint's auth.query parameter and carries the API key; it is never passed to plugins", name)
		}
	}
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
	if manifest.ReservedFirstSegment(p) {
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
		if at.Icon != "" && !strings.HasPrefix(at.Icon, "text:") {
			v.needFile(f+".icon", at.Icon)
		}
		v.form(f+".form", at.Form, false)
		v.guardedSettings(f, at)
		v.defaultModels(f, at)
		v.quota(f, at.Quota)
		v.refresh(f, at)
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
				v.usageRules(uf, ap.Usage[proto], ownerAccountType, protocolPluginUsage(own, proto))
			}
		}
	}
}

// guardedSettings validates accountTypes[].guardedSettings (CONTRACTS §21.3):
// each field is a distinct settings field of the same account type and its
// allowed list holds at least one absolute http(s) URL.
func (v *validator) guardedSettings(f string, at manifest.AccountType) {
	seen := map[string]bool{}
	for i, gs := range at.GuardedSettings {
		gf := fmt.Sprintf("%s.guardedSettings[%d]", f, i)
		switch {
		case gs.Field == "":
			v.add(gf+".field", "required", "field is required")
		case !slices.Contains(at.SettingsFields, gs.Field):
			v.add(gf+".field", "unknown_field", "field %q is not in settingsFields of account type %q", gs.Field, at.ID)
		case seen[gs.Field]:
			v.add(gf+".field", "duplicate", "field %q is guarded twice", gs.Field)
		}
		seen[gs.Field] = true
		if len(gs.Allowed) == 0 {
			v.add(gf+".allowed", "required", "allowed must list at least one URL")
		}
		for j, raw := range gs.Allowed {
			if !isAbsoluteHTTPURL(raw) {
				v.add(fmt.Sprintf("%s.allowed[%d]", gf, j), "invalid_url", "%q is not an absolute http(s) URL", raw)
			}
		}
	}
}

// defaultModels validates accountTypes[].defaultModels and
// defaultModelMapping (CONTRACTS §41) with the rules the core applies to the
// account fields they prefill: complete model ids, no duplicates, at most
// manifest.MaxDefaultModels each. A mapping key missing from a non-empty
// defaultModels is rejected too: the account would never be scheduled for it.
func (v *validator) defaultModels(f string, at manifest.AccountType) {
	if len(at.DefaultModels) > manifest.MaxDefaultModels {
		v.add(f+".defaultModels", "too_many", "at most %d default models", manifest.MaxDefaultModels)
	}
	seen := map[string]bool{}
	for i, m := range at.DefaultModels {
		mf := fmt.Sprintf("%s.defaultModels[%d]", f, i)
		switch {
		case !manifest.ValidModelID(m):
			v.add(mf, "invalid", "%q is not a complete model id", m)
		case seen[m]:
			v.add(mf, "duplicate", "model %q listed twice", m)
		}
		seen[m] = true
	}
	if len(at.DefaultModelMapping) > manifest.MaxDefaultModels {
		v.add(f+".defaultModelMapping", "too_many", "at most %d mapping entries", manifest.MaxDefaultModels)
	}
	for _, from := range sortedKeys(at.DefaultModelMapping) {
		mf := f + ".defaultModelMapping." + from
		switch to := at.DefaultModelMapping[from]; {
		case !manifest.ValidModelID(from), !manifest.ValidModelID(to):
			v.add(mf, "invalid", "%q -> %q: both sides must be complete model ids", from, to)
		case len(at.DefaultModels) > 0 && !seen[from]:
			v.add(mf, "not_in_models", "mapped model %q is not in defaultModels", from)
		}
	}
}

// isAbsoluteHTTPURL reports whether s is an absolute http or https URL with a
// host and no whitespace.
func isAbsoluteHTTPURL(s string) bool {
	if s == "" || strings.ContainsAny(s, " \t\r\n") {
		return false
	}
	u, err := url.Parse(s)
	if err != nil {
		return false
	}
	scheme := strings.ToLower(u.Scheme)
	return (scheme == "http" || scheme == "https") && u.Hostname() != ""
}

func sortedKeys[V any](m map[string]V) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
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
	// Model prices are set by administrators in the core (CONTRACTS §17);
	// a manifest that still declares them is rejected rather than ignored.
	var raw map[string]json.RawMessage
	if json.Unmarshal(v.files["manifest.json"], &raw) == nil {
		if _, ok := raw["pricing"]; ok {
			v.add("pricing", "unsupported", "plugins cannot declare model prices; administrators set prices in the core")
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

// scheduler validates manifest.scheduler (scheduling extension points).
// Rank.Match protocols are deliberately not checked: a plugin may match a
// protocol declared by another plugin's platform, which need not be installed
// yet; the registry warns at runtime instead. Rank.Order is unconstrained,
// like hook order.
func (v *validator) scheduler() {
	s := v.m.Scheduler
	if s == nil {
		return
	}
	if s.Rank == nil {
		return
	}
	v.needPerm("scheduler.rank", "scheduler.rank", "rewriting account scheduling parameters")
	v.needCap("scheduler.rank", manifest.CapSchedulerRank)
	if t := s.Rank.TimeoutMs; t != 0 && (t < MinRankTimeout || t > MaxRankTimeout) {
		v.add("scheduler.rank.timeoutMs", "invalid",
			"timeoutMs must be 0 (host default) or between %d and %d", MinRankTimeout, MaxRankTimeout)
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

// coreMenuSections are the sidebar groups of the console a plugin menu may
// join (authz/menus.go).
var coreMenuSections = map[string]bool{"overview": true, "gateway": true, "finance": true, "system": true, "me": true}

func (v *validator) ui() {
	u := v.m.UI
	if u == nil {
		return
	}
	if len(u.Menus) > 0 || len(u.Pages) > 0 {
		v.needPerm("ui", "ui.menu", "menus and pages")
	}
	sectionIDs := map[string]bool{}
	for i, sec := range u.Sections {
		f := fmt.Sprintf("ui.sections[%d]", i)
		if !idRe.MatchString(sec.ID) {
			v.add(f+".id", "invalid_format", "section id %q is invalid", sec.ID)
		} else if coreMenuSections[sec.ID] || sec.ID == "plugins" {
			v.add(f+".id", "invalid", "section id %q is reserved for the core sidebar", sec.ID)
		} else if sectionIDs[sec.ID] {
			v.add(f+".id", "duplicate", "section %q declared twice", sec.ID)
		}
		sectionIDs[sec.ID] = true
		if firstText(sec.Label) == "" {
			v.add(f+".label", "required", "label is required")
		}
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
		if mn.Section != "plugins" && !coreMenuSections[mn.Section] && !sectionIDs[mn.Section] {
			v.add(f+".section", "invalid", "section must be \"plugins\", a core section (overview, gateway, finance, system, me) or one of ui.sections")
		}
		if firstText(mn.Label) == "" {
			v.add(f+".label", "required", "label is required")
		}
		if _, ok := u.Pages[mn.Page]; !ok {
			v.add(f+".page", "unknown", "page %q is not declared in ui.pages", mn.Page)
		}
		v.menuIcon(f+".icon", mn.Icon)
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
			} else {
				v.pageRouteRef(f+".source", pg.Source, "GET")
			}
		case "form":
			v.needFile(f+".schema", pg.Schema)
			if pg.Source != "" {
				// Optional on a form: it pre-fills the fields.
				v.pageRouteRef(f+".source", pg.Source, "GET")
			}
			// Without submit the console's Save button does nothing and says
			// nothing (DeclarativeForm returns early when the reference does
			// not parse), so a form page without it is a page that cannot be
			// used, not a read-only one.
			if pg.Submit == "" {
				v.add(f+".submit", "required", "form pages require submit (the route the form posts to)")
			} else {
				v.pageRouteRef(f+".submit", pg.Submit, "POST")
			}
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
		v.pageSearch(f+".search", pg)
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
		if !v.opt.Tooling {
			// The entry is produced by the native UI build, not written by
			// the author; tooling checks for it at packaging time instead.
			v.needFile("ui.native.entry", u.Native.Entry)
		} else if u.Native.Entry == "" {
			v.add("ui.native.entry", "required", "file path is required")
		}
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

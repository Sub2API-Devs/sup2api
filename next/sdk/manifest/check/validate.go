package check

import (
	"encoding/json"
	"fmt"
	"net/url"
	"reflect"
	"regexp"
	"runtime"
	"sort"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/robfig/cron/v3"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

var (
	keyRe           = regexp.MustCompile(`^[a-z][a-z0-9_]{1,29}$`)
	userPermKeyRe   = regexp.MustCompile(`^[a-z0-9_]+(:[a-z0-9_]+)+$`)
	idRe            = regexp.MustCompile(`^[a-z0-9][a-z0-9_.-]{0,63}$`)
	accountTypeIDRe = regexp.MustCompile(`^[a-z][a-z0-9_]{1,49}$`)
	subscriptionRe  = regexp.MustCompile(`^[a-z][a-z0-9_]{0,31}$`)
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
	manifest.CapGatewayObserve:    true,
	manifest.CapAppJobs:           true,
	manifest.CapAccountLifecycle:  true,
	manifest.CapAppEvents:         true,
	manifest.CapHTTPRoutes:        true,
	manifest.CapMigrationData:     true,
	manifest.CapSchedulerRank:     true,
	manifest.CapAppBroadcast:      true,
	manifest.CapNotifyChannel:     true,
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
	Endpoints []manifest.Endpoint
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
			pfs = append(pfs, PlatformOwner{PluginKey: m.Key, ID: p.ID, Endpoints: p.Endpoints})
			for _, e := range p.Endpoints {
				eps = append(eps, EndpointOwner{PluginKey: m.Key, Platform: p.ID, Method: e.Method, Path: e.Path})
			}
		}
	}
	return pfs, eps
}

// Conflicts reports only the exclusive resources of m that other plugins or
// the core already hold: platform ids and gateway endpoints of other plugins
// (platform_conflict, endpoint_conflict), built-in platform ids
// (builtin_platform) and paths the core reserves (invalid_path). The host
// runs it again whenever a version starts to hold or use them - approval,
// enable, upgrade - because versions awaiting approval hold nothing and a
// newer core may have taken a path or platform since the upload.
func Conflicts(m *manifest.Manifest, others []PlatformOwner, endpoints []EndpointOwner) []FieldError {
	v := &validator{m: m, opt: ValidateOptions{OtherPlatforms: others, OtherEndpoints: endpoints, Tooling: true},
		perms: map[string]*manifest.HostPermission{}}
	v.platforms()
	var out []FieldError
	for _, e := range v.errs {
		switch e.Code {
		case "platform_conflict", "endpoint_conflict", "builtin_platform", "invalid_path":
			out = append(out, e)
		}
	}
	return out
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
	v.observations()
	v.notifications()
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
		if hp.ID == removedAffinityPermission {
			v.add(f+".id", "sticky_not_for_plugins", "host permission %q was removed: plugins take no part in sticky sessions", hp.ID)
		} else if _, ok := manifest.HostPermissionRisk[hp.ID]; !ok {
			v.add(f+".id", "unknown", "unknown host permission %q", hp.ID)
			continue
		}
		if _, dup := v.perms[hp.ID]; dup {
			v.add(f+".id", "duplicate", "host permission %q requested twice", hp.ID)
			continue
		}
		v.perms[hp.ID] = hp
		if (hp.ID == "accounts.credentials" || hp.ID == "accounts.auto_state") && !reflect.DeepEqual(NormalizeScope(hp.Scope), credentialsScopeOwn) {
			v.add(f+".scope", "invalid", `%s scope must be {"types": "own"}`, hp.ID)
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
		switch {
		case c.ID == removedAffinityCapability:
			v.add(f, "sticky_not_for_plugins", "capability %q was removed: plugins take no part in sticky sessions", c.ID)
		case !KnownCapabilities[c.ID]:
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

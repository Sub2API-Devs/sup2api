// Package registry builds immutable generations of the extensions contributed
// by the plugin instances active on this node, and switches them atomically.
package registry

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"mime"
	"path"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/platforms"
	pluginpkg "github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
)

// Extension is one running plugin version that contributes to a generation.
// Capability accessors return nil when the plugin does not implement the
// capability.
type Extension interface {
	Package() *Package
	Grants() Grants
	Platform() core.PlatformPlugin
	Hook() core.HookPlugin
	App() core.AppPlugin
	HTTP() core.HTTPPlugin
	Scheduler() core.SchedulerPlugin
}

// Grants maps approved host permission ids to their approved scope JSON.
type Grants map[string]json.RawMessage

func (g Grants) Has(permission string) bool {
	_, ok := g[permission]
	return ok
}

// Scope decodes the approved scope of a permission (empty map when none).
func (g Grants) Scope(permission string) map[string]any {
	out := map[string]any{}
	if raw, ok := g[permission]; ok && len(raw) > 0 {
		_ = json.Unmarshal(raw, &out)
	}
	return out
}

// List returns scope[field] as a string list; ok=false when the field is
// absent (meaning "not restricted").
func (g Grants) List(permission, field string) (list []string, ok bool) {
	v, present := g.Scope(permission)[field]
	if !present {
		return nil, false
	}
	arr, _ := v.([]any)
	for _, x := range arr {
		if s, isStr := x.(string); isStr {
			list = append(list, s)
		}
	}
	return list, true
}

// Info builds the core.PluginInfo of a package.
func Info(p *Package) core.PluginInfo {
	return core.PluginInfo{
		Key:       p.Key,
		Version:   p.Version,
		Manifest:  p.Manifest,
		Publisher: p.Publisher,
		Trust:     p.Trust,
		AssetBase: p.AssetBase(),
	}
}

// Registry implements core.PluginRegistry.
type Registry struct {
	cur atomic.Pointer[generation]
	seq atomic.Uint64

	mu        sync.Mutex // serializes Publish and listener changes
	listeners map[int]func(core.Generation)
	nextID    int
}

func New() *Registry {
	r := &Registry{listeners: map[int]func(core.Generation){}}
	r.cur.Store(build(0, nil))
	return r
}

func (r *Registry) Current() core.Generation { return r.cur.Load() }

func (r *Registry) OnChange(fn func(core.Generation)) (cancel func()) {
	r.mu.Lock()
	defer r.mu.Unlock()
	id := r.nextID
	r.nextID++
	r.listeners[id] = fn
	return func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		delete(r.listeners, id)
	}
}

// Publish builds a new generation from exts (at most one per plugin key) and
// switches to it atomically, then notifies listeners in registration order.
func (r *Registry) Publish(exts []Extension) core.Generation {
	r.mu.Lock()
	defer r.mu.Unlock()
	g := build(r.seq.Add(1), exts)
	r.cur.Store(g)
	ids := make([]int, 0, len(r.listeners))
	for id := range r.listeners {
		ids = append(ids, id)
	}
	sort.Ints(ids)
	for _, id := range ids {
		r.listeners[id](g)
	}
	return g
}

// ------------------------------------------------------------------ generation

type generation struct {
	number    uint64
	plugins   []core.PluginInfo
	byKey     map[string]core.PluginInfo
	packages  map[string]*Package
	endpoints []core.EndpointBinding
	platforms []core.PlatformBinding // built-in (by id), then plugin platforms
	platByID  map[string]core.PlatformBinding
	byProto   map[string]core.PlatformBinding
	accTypes  []core.AccountTypeBinding // sorted by plugin key, type id
	atByKey   map[core.AccountTypeKey]core.AccountTypeBinding
	atByPlat  map[string][]core.AccountTypeBinding // platform id -> types, same order
	hooks     map[string][]core.HookBinding
	scheds    map[string]core.SchedulerPlugin
	routes    map[string][]core.RouteBinding
	jobs      []core.JobBinding
	subs      []core.SubscriptionBinding
	assets    sync.Map // key + "\x00" + path -> asset
}

type asset struct {
	data []byte
	ct   string
}

// maxCachedAsset bounds the size of a single cached asset.
const maxCachedAsset = 4 << 20

// addPlatform registers a platform and its endpoints unless its id, one of
// its protocols or one of its endpoints is already taken (install-time
// validation rejects these; this is the fallback for packages installed
// concurrently or before the check existed). Returns the reason on refusal.
func (g *generation) addPlatform(b core.PlatformBinding) string {
	p := b.Platform
	if p.ID == "" {
		return "empty platform id"
	}
	if other, taken := g.platByID[p.ID]; taken {
		return fmt.Sprintf("platform id %q is already registered by %s", p.ID, platformOwner(other))
	}
	protos := map[string]bool{}
	for i, e := range p.Endpoints {
		if other, taken := g.byProto[e.Protocol]; taken {
			return fmt.Sprintf("protocol %q is already registered by %s", e.Protocol, platformOwner(other))
		}
		protos[e.Protocol] = true
		for _, eb := range g.endpoints {
			if pluginpkg.EndpointsConflict(eb.Endpoint, e) {
				return fmt.Sprintf("endpoint %s %s conflicts with %s %s of platform %q",
					e.Method, e.Path, eb.Endpoint.Method, eb.Endpoint.Path, eb.Platform)
			}
		}
		for _, o := range p.Endpoints[:i] {
			if pluginpkg.EndpointsConflict(o, e) {
				return fmt.Sprintf("endpoint %s %s conflicts with %s %s of the same platform", e.Method, e.Path, o.Method, o.Path)
			}
		}
	}
	g.platforms = append(g.platforms, b)
	g.platByID[p.ID] = b
	for proto := range protos {
		g.byProto[proto] = b
	}
	for _, e := range p.Endpoints {
		g.endpoints = append(g.endpoints, core.EndpointBinding{Plugin: b.Plugin, Platform: p.ID, Endpoint: e})
	}
	return ""
}

func platformOwner(b core.PlatformBinding) string {
	if b.Builtin {
		return "the core (built-in)"
	}
	return fmt.Sprintf("plugin %q", b.Plugin.Key)
}

func build(number uint64, exts []Extension) *generation {
	g := &generation{
		number:   number,
		byKey:    map[string]core.PluginInfo{},
		packages: map[string]*Package{},
		platByID: map[string]core.PlatformBinding{},
		byProto:  map[string]core.PlatformBinding{},
		atByKey:  map[core.AccountTypeKey]core.AccountTypeBinding{},
		atByPlat: map[string][]core.AccountTypeBinding{},
		hooks:    map[string][]core.HookBinding{},
		scheds:   map[string]core.SchedulerPlugin{},
		routes:   map[string][]core.RouteBinding{},
	}
	// Built-in platforms always exist (ARCHITECTURE 6.6).
	for _, p := range platforms.Builtin() {
		if reason := g.addPlatform(core.PlatformBinding{Builtin: true, Platform: p}); reason != "" {
			slog.Error("plugin registry: built-in platform skipped", "platform", p.ID, "reason", reason)
		}
	}
	sorted := append([]Extension(nil), exts...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Package().Key < sorted[j].Package().Key })
	for _, ext := range sorted {
		pkg := ext.Package()
		if _, dup := g.byKey[pkg.Key]; dup {
			continue
		}
		info := Info(pkg)
		m := pkg.Manifest
		grants := ext.Grants()
		g.plugins = append(g.plugins, info)
		g.byKey[pkg.Key] = info
		g.packages[pkg.Key] = pkg

		// Plugin platforms: ids are unique across built-in and plugin
		// platforms and endpoints never overlap; a conflicting platform is
		// skipped as a whole (first plugin by key wins).
		for _, p := range m.Platforms {
			if reason := g.addPlatform(core.PlatformBinding{Plugin: info, Platform: p}); reason != "" {
				slog.Warn("plugin registry: platform skipped", "plugin", pkg.Key, "version", pkg.Version,
					"platform", p.ID, "reason", reason)
			}
		}
		pf := ext.Platform()
		// Account types are served by the declaring plugin, which must
		// implement platform.adapter.v1 (ARCHITECTURE 6.6) and hold the
		// accounts.credentials grant: without it the plugin never receives
		// credentials, so its account types are not offered or scheduled.
		if pf != nil && grants.Has("accounts.credentials") {
			for _, at := range m.AccountTypes {
				key := core.AccountTypeKey{PluginKey: pkg.Key, Type: at.ID}
				if _, dup := g.atByKey[key]; dup {
					continue
				}
				atb := core.AccountTypeBinding{Plugin: info, Type: at, Client: pf}
				if at.Form.Mode == "schema" {
					atb.FormSchema = readJSON(pkg, at.Form.Schema)
					atb.FormUI = readJSON(pkg, at.Form.UISchema)
				}
				g.atByKey[key] = atb
				g.accTypes = append(g.accTypes, atb)
			}
		}
		if hk := ext.Hook(); hk != nil && grants.Has("gateway.hook") {
			points, pointsLimited := grants.List("gateway.hook", "points")
			fields, fieldsLimited := grants.List("gateway.hook", "fields")
			for i, h := range m.Hooks {
				if pointsLimited && !contains(points, h.Point) {
					continue
				}
				if h.ID == "" {
					h.ID = strconv.Itoa(i)
				}
				granted := make([]string, 0, len(h.Needs))
				for _, n := range h.Needs {
					if !fieldsLimited || contains(fields, n) {
						granted = append(granted, n)
					}
				}
				g.hooks[h.Point] = append(g.hooks[h.Point], core.HookBinding{Plugin: info, Hook: h, GrantedFields: granted, Client: hk})
			}
		}
		if sc := ext.Scheduler(); sc != nil {
			g.scheds[pkg.Key] = sc
		}
		if hx := ext.HTTP(); hx != nil {
			for _, rt := range m.Routes {
				if !grants.Has("routes." + rt.Scope) {
					continue
				}
				g.routes[pkg.Key] = append(g.routes[pkg.Key], core.RouteBinding{Plugin: info, Route: rt, Client: hx})
			}
		}
		if app := ext.App(); app != nil {
			if grants.Has("jobs") {
				for _, j := range m.Jobs {
					g.jobs = append(g.jobs, core.JobBinding{Plugin: info, Job: j, Client: app})
				}
			}
			if m.Events != nil && len(m.Events.Subscribe) > 0 && grants.Has("events") {
				ev := *m.Events
				if allowed, limited := grants.List("events", "subscribe"); limited {
					ev.Subscribe = nil
					for _, s := range m.Events.Subscribe {
						if eventAllowed(allowed, s) {
							ev.Subscribe = append(ev.Subscribe, s)
						}
					}
				}
				if len(ev.Subscribe) > 0 {
					g.subs = append(g.subs, core.SubscriptionBinding{Plugin: info, Events: ev, Client: app})
				}
			}
		}
	}
	for point := range g.hooks {
		hs := g.hooks[point]
		sort.SliceStable(hs, func(i, j int) bool {
			if hs[i].Hook.Order != hs[j].Hook.Order {
				return hs[i].Hook.Order < hs[j].Hook.Order
			}
			return hs[i].Plugin.Key < hs[j].Plugin.Key
		})
	}
	sort.SliceStable(g.accTypes, func(i, j int) bool {
		a, b := g.accTypes[i], g.accTypes[j]
		if a.Plugin.Key != b.Plugin.Key {
			return a.Plugin.Key < b.Plugin.Key
		}
		return a.Type.ID < b.Type.ID
	})
	for _, atb := range g.accTypes {
		seen := map[string]bool{}
		for _, ap := range atb.Type.Platforms {
			if ap.Platform == "" || seen[ap.Platform] {
				continue
			}
			seen[ap.Platform] = true
			g.atByPlat[ap.Platform] = append(g.atByPlat[ap.Platform], atb)
		}
	}
	return g
}

func (g *generation) Number() uint64                            { return g.number }
func (g *generation) Plugins() []core.PluginInfo                { return g.plugins }
func (g *generation) Endpoints() []core.EndpointBinding         { return g.endpoints }
func (g *generation) AccountTypes() []core.AccountTypeBinding   { return g.accTypes }
func (g *generation) Jobs() []core.JobBinding                   { return g.jobs }
func (g *generation) Subscriptions() []core.SubscriptionBinding { return g.subs }

func (g *generation) Plugin(key string) (core.PluginInfo, bool) {
	p, ok := g.byKey[key]
	return p, ok
}

func (g *generation) Platforms() []core.PlatformBinding { return g.platforms }

func (g *generation) Platform(platformID string) (core.PlatformBinding, bool) {
	b, ok := g.platByID[platformID]
	return b, ok
}

func (g *generation) PlatformForProtocol(protocol string) (core.PlatformBinding, bool) {
	b, ok := g.byProto[protocol]
	return b, ok
}

func (g *generation) AccountType(pluginKey, typeID string) (core.AccountTypeBinding, bool) {
	b, ok := g.atByKey[core.AccountTypeKey{PluginKey: pluginKey, Type: typeID}]
	return b, ok
}

// AccountTypesForPlatform lists the registered account types declaring
// platformID (whether or not the platform currently exists), sorted by
// plugin key and type id.
func (g *generation) AccountTypesForPlatform(platformID string) []core.AccountTypeBinding {
	return g.atByPlat[platformID]
}

func (g *generation) Hooks(point string) []core.HookBinding { return g.hooks[point] }

func (g *generation) Scheduler(pluginKey string) (core.SchedulerPlugin, bool) {
	s, ok := g.scheds[pluginKey]
	return s, ok
}

func (g *generation) Routes(pluginKey string) []core.RouteBinding { return g.routes[pluginKey] }

// ErrAssetNotFound is returned by ReadAsset for missing files or plugins.
var ErrAssetNotFound = core.ErrNotFound.WithMessage("asset not found")

func (g *generation) ReadAsset(pluginKey, name string) ([]byte, string, error) {
	pkg, ok := g.packages[pluginKey]
	if !ok {
		return nil, "", ErrAssetNotFound
	}
	name = strings.TrimPrefix(path.Clean("/"+name), "/")
	if name == "" {
		return nil, "", ErrAssetNotFound
	}
	ck := pluginKey + "\x00" + name
	if a, ok := g.assets.Load(ck); ok {
		a := a.(asset)
		return a.data, a.ct, nil
	}
	data, err := pkg.ReadFile(name)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, "", ErrAssetNotFound
		}
		return nil, "", fmt.Errorf("read asset %s/%s: %w", pluginKey, name, err)
	}
	ct := ContentType(name)
	if len(data) <= maxCachedAsset {
		g.assets.Store(ck, asset{data: data, ct: ct})
	}
	return data, ct, nil
}

// ContentType maps a package file name to its MIME type.
func ContentType(name string) string {
	switch strings.ToLower(path.Ext(name)) {
	case ".js", ".mjs":
		return "text/javascript; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".html", ".htm":
		return "text/html; charset=utf-8"
	case ".json", ".map":
		return "application/json; charset=utf-8"
	case ".svg":
		return "image/svg+xml"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".ico":
		return "image/x-icon"
	case ".woff":
		return "font/woff"
	case ".woff2":
		return "font/woff2"
	case ".ttf":
		return "font/ttf"
	case ".txt", ".md":
		return "text/plain; charset=utf-8"
	case ".wasm":
		return "application/wasm"
	}
	if ct := mime.TypeByExtension(path.Ext(name)); ct != "" {
		return ct
	}
	return "application/octet-stream"
}

func readJSON(pkg *Package, name string) json.RawMessage {
	if name == "" {
		return nil
	}
	data, err := pkg.ReadFile(name)
	if err != nil || !json.Valid(data) {
		return nil
	}
	return json.RawMessage(data)
}

func contains(list []string, s string) bool {
	for _, x := range list {
		if x == s || x == "*" {
			return true
		}
	}
	return false
}

// eventAllowed reports whether subscription s ("type" or "prefix.*") is
// covered by the approved list (exact, "*" or "prefix.*" entries).
func eventAllowed(allowed []string, s string) bool {
	for _, a := range allowed {
		if a == s || a == "*" {
			return true
		}
		if p, ok := strings.CutSuffix(a, "*"); ok && strings.HasPrefix(s, p) {
			return true
		}
	}
	return false
}

// Ensure the generation satisfies the contract.
var _ core.Generation = (*generation)(nil)
var _ core.PluginRegistry = (*Registry)(nil)

// HookByID finds a manifest hook by id or by its index (as a string).
func HookByID(m *manifest.Manifest, id string) (manifest.Hook, bool) {
	for i, h := range m.Hooks {
		if h.ID == id || (h.ID == "" && strconv.Itoa(i) == id) {
			return h, true
		}
	}
	return manifest.Hook{}, false
}

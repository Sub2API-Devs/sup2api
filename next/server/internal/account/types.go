package account

import (
	"bytes"
	"encoding/json"
	"sort"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/platforms"
)

// AccountTypeView is one entry of GET /account-types (CONTRACTS §12, §13).
type AccountTypeView struct {
	PluginKey     string                 `json:"plugin_key"`
	PluginName    manifest.LocalizedText `json:"plugin_name"`
	PluginVersion string                 `json:"plugin_version"`
	// AssetBase prefixes form.page / form.component for iframe and native forms.
	AssetBase       string                 `json:"asset_base"`
	Trust           string                 `json:"trust"`
	Type            string                 `json:"type"`
	Label           manifest.LocalizedText `json:"label"`
	Description     manifest.LocalizedText `json:"description,omitempty"`
	Form            FormView               `json:"form"`
	SensitiveFields []string               `json:"sensitive_fields"`
	// Platforms the account type declares, in declaration order.
	Platforms []TypePlatformView `json:"platforms"`
	// Endpoints lists the gateway endpoints this type can serve now.
	Endpoints []EndpointView `json:"endpoints"`
}

// TypePlatformView is a platform declared by an account type. Available is
// false when the platform is not in the current generation (its plugin is
// disabled or not installed); Label is then null.
type TypePlatformView struct {
	ID        string                 `json:"id"`
	Label     manifest.LocalizedText `json:"label"`
	Builtin   bool                   `json:"builtin"`
	Available bool                   `json:"available"`
}

// FormView describes how the console renders the credentials form.
type FormView struct {
	Mode      string `json:"mode"`
	Page      string `json:"page,omitempty"`
	Component string `json:"component,omitempty"`
}

// EndpointView is a gateway endpoint an account type can serve. Native is
// false when the core converts the endpoint protocol to a protocol of one of
// the type's platforms.
type EndpointView struct {
	Method   string `json:"method"`
	Path     string `json:"path"`
	Protocol string `json:"protocol"`
	Platform string `json:"platform"`
	Native   bool   `json:"native"`
}

func typeView(g core.Generation, b core.AccountTypeBinding, conv core.ProtocolConverters) AccountTypeView {
	v := AccountTypeView{
		PluginKey:       b.Plugin.Key,
		PluginVersion:   b.Plugin.Version,
		AssetBase:       b.Plugin.AssetBase,
		Trust:           b.Plugin.Trust,
		Type:            b.Type.ID,
		Label:           b.Type.Label,
		Description:     b.Type.Description,
		Form:            FormView{Mode: b.Type.Form.Mode, Page: b.Type.Form.Page, Component: b.Type.Form.Component},
		SensitiveFields: b.Type.SensitiveFields,
		Platforms:       typePlatforms(g, b),
		Endpoints:       servedEndpoints(g, b, conv),
	}
	if b.Plugin.Manifest != nil {
		v.PluginName = b.Plugin.Manifest.Name
	}
	if v.PluginName == nil {
		v.PluginName = manifest.LocalizedText{"en": b.Plugin.Key}
	}
	if v.SensitiveFields == nil {
		v.SensitiveFields = []string{}
	}
	return v
}

// typePlatforms lists the platforms declared by the account type.
func typePlatforms(g core.Generation, b core.AccountTypeBinding) []TypePlatformView {
	out := []TypePlatformView{}
	seen := map[string]bool{}
	for _, ap := range b.Type.Platforms {
		if seen[ap.Platform] {
			continue
		}
		seen[ap.Platform] = true
		v := TypePlatformView{ID: ap.Platform, Builtin: platforms.IsBuiltin(ap.Platform)}
		if pb, ok := g.Platform(ap.Platform); ok {
			v.Available, v.Builtin, v.Label = true, pb.Builtin, pb.Platform.Label
		}
		out = append(out, v)
	}
	return out
}

// servedEndpoints lists the endpoints of the platforms the account type
// supports (native), plus endpoints of other platforms whose protocol the
// core can convert to a protocol of a supported, available platform.
func servedEndpoints(g core.Generation, b core.AccountTypeBinding, conv core.ProtocolConverters) []EndpointView {
	// Protocols the type's upstream speaks: those of its available platforms.
	var upstream []string
	for _, ap := range b.Type.Platforms {
		if pb, ok := g.Platform(ap.Platform); ok {
			upstream = append(upstream, pb.Platform.Protocols()...)
		}
	}
	out := []EndpointView{}
	for _, e := range g.Endpoints() {
		proto := e.Endpoint.Protocol
		_, native := b.Supports(e.Platform)
		if !native && !convertible(conv, proto, upstream) {
			continue
		}
		out = append(out, EndpointView{Method: e.Endpoint.Method, Path: e.Endpoint.Path, Protocol: proto,
			Platform: e.Platform, Native: native})
	}
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.Native != b.Native {
			return a.Native
		}
		if a.Platform != b.Platform {
			return a.Platform < b.Platform
		}
		if a.Path != b.Path {
			return a.Path < b.Path
		}
		return a.Method < b.Method
	})
	return out
}

// convertible reports whether the core can convert the client protocol to
// one of the upstream protocols.
func convertible(conv core.ProtocolConverters, client string, upstream []string) bool {
	if conv == nil {
		return false
	}
	for _, y := range upstream {
		if y != client && conv.CanConvert(client, y) {
			return true
		}
	}
	return false
}

func (s *Service) listTypes(c *gin.Context) {
	out := []AccountTypeView{}
	if g := s.gen(); g != nil {
		for _, b := range g.AccountTypes() {
			out = append(out, typeView(g, b, s.d.Converters))
		}
	}
	sort.Slice(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.PluginKey != b.PluginKey {
			return a.PluginKey < b.PluginKey
		}
		return a.Type < b.Type
	})
	httpapi.OK(c, out)
}

// PlatformView is one entry of GET /platforms (CONTRACTS §13).
type PlatformView struct {
	ID      string                 `json:"id"`
	Label   manifest.LocalizedText `json:"label"`
	Builtin bool                   `json:"builtin"`
	// PluginKey is the declaring plugin; null for built-in platforms.
	PluginKey *string `json:"plugin_key"`
	// PluginName is the declaring plugin's name; null for built-in platforms.
	PluginName   manifest.LocalizedText `json:"plugin_name"`
	Endpoints    []PlatformEndpointView `json:"endpoints"`
	AccountTypes []PlatformTypeView     `json:"account_types"`
}

// PlatformEndpointView is a gateway endpoint declared by a platform.
type PlatformEndpointView struct {
	Method   string `json:"method"`
	Path     string `json:"path"`
	Protocol string `json:"protocol"`
	Billing  string `json:"billing"`
}

// PlatformTypeView is a registered account type serving a platform natively.
type PlatformTypeView struct {
	PluginKey string                 `json:"plugin_key"`
	Type      string                 `json:"type"`
	Label     manifest.LocalizedText `json:"label"`
}

// platformViews lists the platforms of the generation: built-in ones first,
// then plugin platforms, each sorted by id.
func platformViews(g core.Generation) []PlatformView {
	out := []PlatformView{}
	if g == nil {
		return out
	}
	for _, pb := range g.Platforms() {
		v := PlatformView{ID: pb.Platform.ID, Label: pb.Platform.Label, Builtin: pb.Builtin,
			Endpoints: []PlatformEndpointView{}, AccountTypes: []PlatformTypeView{}}
		if v.Label == nil {
			v.Label = manifest.LocalizedText{"en": pb.Platform.ID}
		}
		if !pb.Builtin {
			key := pb.Plugin.Key
			v.PluginKey = &key
			if pb.Plugin.Manifest != nil {
				v.PluginName = pb.Plugin.Manifest.Name
			}
		}
		for _, e := range pb.Platform.Endpoints {
			v.Endpoints = append(v.Endpoints, PlatformEndpointView{Method: e.Method, Path: e.Path,
				Protocol: e.Protocol, Billing: e.Billing})
		}
		for _, b := range g.AccountTypesForPlatform(pb.Platform.ID) {
			v.AccountTypes = append(v.AccountTypes, PlatformTypeView{PluginKey: b.Plugin.Key, Type: b.Type.ID,
				Label: b.Type.Label})
		}
		sort.Slice(v.AccountTypes, func(i, j int) bool {
			a, b := v.AccountTypes[i], v.AccountTypes[j]
			if a.PluginKey != b.PluginKey {
				return a.PluginKey < b.PluginKey
			}
			return a.Type < b.Type
		})
		out = append(out, v)
	}
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.Builtin != b.Builtin {
			return a.Builtin
		}
		return a.ID < b.ID
	})
	return out
}

func (s *Service) listPlatforms(c *gin.Context) {
	httpapi.OK(c, platformViews(s.gen()))
}

// MyPlatformView is one entry of GET /me/platforms (CONTRACTS §14.1): a
// platform available now, without account types or plugin details, so any
// signed-in user can preview the endpoints a key will reach.
type MyPlatformView struct {
	ID        string                 `json:"id"`
	Label     manifest.LocalizedText `json:"label"`
	Builtin   bool                   `json:"builtin"`
	Endpoints []PlatformEndpointView `json:"endpoints"`
}

// myPlatformViews lists the platforms of the generation in the order of
// platformViews (built-in first, then by id).
func myPlatformViews(g core.Generation) []MyPlatformView {
	all := platformViews(g)
	out := make([]MyPlatformView, 0, len(all))
	for _, v := range all {
		out = append(out, MyPlatformView{ID: v.ID, Label: v.Label, Builtin: v.Builtin, Endpoints: v.Endpoints})
	}
	return out
}

func (s *Service) listMyPlatforms(c *gin.Context) {
	httpapi.OK(c, myPlatformViews(s.gen()))
}

func rawOrNull(b json.RawMessage) json.RawMessage {
	if len(bytes.TrimSpace(b)) == 0 {
		return json.RawMessage("null")
	}
	return b
}

func (s *Service) typeForm(c *gin.Context) {
	ctx := c.Request.Context()
	b, ok := s.accountType(c.Param("plugin_key"), c.Param("type"))
	if !ok {
		httpapi.Fail(c, core.ErrNotFound.WithMessage(t(ctx, "account type not found", "账号类型不存在")))
		return
	}
	httpapi.OK(c, gin.H{"schema": rawOrNull(b.FormSchema), "ui_schema": rawOrNull(b.FormUI)})
}

// typeLabel returns the label of an account type, or nil when the type is not
// registered in the current generation.
func (s *Service) typeLabel(pluginKey, typ string) manifest.LocalizedText {
	if b, ok := s.accountType(pluginKey, typ); ok {
		return b.Type.Label
	}
	return nil
}

package account

import (
	"bytes"
	"encoding/json"
	"sort"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// AccountTypeView is one entry of GET /account-types (CONTRACTS §12).
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
	// Protocols the upstream of this account type speaks natively.
	Protocols []string `json:"protocols"`
	// Endpoints lists the enabled gateway endpoints this type can serve now.
	Endpoints []EndpointView `json:"endpoints"`
}

// FormView describes how the console renders the credentials form.
type FormView struct {
	Mode      string `json:"mode"`
	Page      string `json:"page,omitempty"`
	Component string `json:"component,omitempty"`
}

// EndpointView is a gateway endpoint an account type can serve. Native is
// false when the core converts the endpoint protocol to one of the type's.
type EndpointView struct {
	Method   string `json:"method"`
	Path     string `json:"path"`
	Protocol string `json:"protocol"`
	Platform string `json:"platform"`
	Native   bool   `json:"native"`
}

func typeView(b core.AccountTypeBinding, eps []core.EndpointBinding, conv core.ProtocolConverters) AccountTypeView {
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
		Protocols:       []string{},
		Endpoints:       servedEndpoints(b, eps, conv),
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
	for _, p := range b.Type.Protocols {
		v.Protocols = append(v.Protocols, p.Protocol)
	}
	return v
}

// servedEndpoints lists the endpoints whose protocol the account type speaks
// natively, or that the core can convert to one of its protocols.
func servedEndpoints(b core.AccountTypeBinding, eps []core.EndpointBinding, conv core.ProtocolConverters) []EndpointView {
	out := []EndpointView{}
	for _, e := range eps {
		proto := e.Endpoint.Protocol
		_, native := b.Protocol(proto)
		if !native {
			if conv == nil {
				continue
			}
			convertible := false
			for _, q := range b.Type.Protocols {
				if conv.CanConvert(proto, q.Protocol) {
					convertible = true
					break
				}
			}
			if !convertible {
				continue
			}
		}
		platform := ""
		if m := e.Plugin.Manifest; m != nil && m.Platform != nil {
			platform = m.Platform.ID
		}
		out = append(out, EndpointView{Method: e.Endpoint.Method, Path: e.Endpoint.Path, Protocol: proto,
			Platform: platform, Native: native})
	}
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.Native != b.Native {
			return a.Native
		}
		if a.Path != b.Path {
			return a.Path < b.Path
		}
		return a.Method < b.Method
	})
	return out
}

func (s *Service) listTypes(c *gin.Context) {
	out := []AccountTypeView{}
	if g := s.gen(); g != nil {
		eps := g.Endpoints()
		for _, b := range g.AccountTypes() {
			out = append(out, typeView(b, eps, s.d.Converters))
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

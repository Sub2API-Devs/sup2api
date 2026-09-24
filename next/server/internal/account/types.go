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

// AccountTypeView is one entry of GET /account-types.
type AccountTypeView struct {
	PluginKey       string                 `json:"plugin_key"`
	PluginName      manifest.LocalizedText `json:"plugin_name"`
	PluginVersion   string                 `json:"plugin_version"`
	Platform        string                 `json:"platform"`
	Type            string                 `json:"type"`
	Label           manifest.LocalizedText `json:"label"`
	Description     manifest.LocalizedText `json:"description,omitempty"`
	Form            FormView               `json:"form"`
	SensitiveFields []string               `json:"sensitive_fields"`
	// AssetBase prefixes form.page / form.component for iframe and native forms.
	AssetBase string `json:"asset_base"`
}

// FormView describes how the console renders the credentials form.
type FormView struct {
	Mode      string `json:"mode"`
	Page      string `json:"page,omitempty"`
	Component string `json:"component,omitempty"`
}

func typeView(b core.AccountTypeBinding) AccountTypeView {
	v := AccountTypeView{
		PluginKey:       b.Plugin.Key,
		PluginVersion:   b.Plugin.Version,
		Platform:        b.Platform,
		Type:            b.Type.ID,
		Label:           b.Type.Label,
		Description:     b.Type.Description,
		Form:            FormView{Mode: b.Type.Form.Mode, Page: b.Type.Form.Page, Component: b.Type.Form.Component},
		SensitiveFields: b.Type.SensitiveFields,
		AssetBase:       b.Plugin.AssetBase,
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

func (s *Service) listTypes(c *gin.Context) {
	out := []AccountTypeView{}
	if g := s.gen(); g != nil {
		for _, b := range g.AccountTypes() {
			out = append(out, typeView(b))
		}
	}
	sort.Slice(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.Platform != b.Platform {
			return a.Platform < b.Platform
		}
		if a.Type != b.Type {
			return a.Type < b.Type
		}
		return a.PluginKey < b.PluginKey
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
	b, ok := s.accountType(c.Param("platform"), c.Param("type"))
	if !ok {
		httpapi.Fail(c, core.ErrNotFound.WithMessage(t(ctx, "account type not found", "账号类型不存在")))
		return
	}
	httpapi.OK(c, gin.H{"schema": rawOrNull(b.FormSchema), "ui_schema": rawOrNull(b.FormUI)})
}

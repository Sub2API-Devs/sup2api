package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"sort"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Mask replaces secret setting values in responses; sending it back in a
// PUT keeps the stored value.
const Mask = "******"

// ConfigAAD binds plugins.config_enc to its plugin (shared with the runtime).
func ConfigAAD(key string) []byte { return []byte("plugin-config:" + key) }

func isNoRows(err error) bool { return store.IsNoRows(err) }

// SettingsView is GET /plugins/:key/settings.
type SettingsView struct {
	Mode      string          `json:"mode"` // schema | iframe | native | none
	Schema    json.RawMessage `json:"schema"`
	UISchema  json.RawMessage `json:"ui_schema"`
	Page      string          `json:"page,omitempty"`
	Component string          `json:"component,omitempty"`
	Values    map[string]any  `json:"values"`
	Secrets   []string        `json:"secret_fields"`
}

func (a *API) settingsForm(c *gin.Context, key string) (*SettingsView, bool) {
	m, version, ok := a.currentManifest(c, key)
	if !ok {
		return nil, false
	}
	v := &SettingsView{Mode: "none", Schema: json.RawMessage("null"), UISchema: json.RawMessage("null"), Values: map[string]any{}, Secrets: []string{}}
	if m.UI == nil || m.UI.Settings == nil {
		return v, true
	}
	f := m.UI.Settings
	v.Mode, v.Page, v.Component = f.Mode, f.Page, f.Component
	if f.Mode != "schema" {
		return v, true
	}
	p, err := a.d.Install.Package(c.Request.Context(), key, version)
	if err != nil {
		httpapi.Fail(c, err)
		return nil, false
	}
	if b, ok := p.Files[f.Schema]; ok {
		v.Schema = b
		v.Secrets = secretFields(b)
	}
	if f.UISchema != "" {
		if b, ok := p.Files[f.UISchema]; ok {
			v.UISchema = b
		}
	}
	return v, true
}

// secretFields lists top-level properties marked writeOnly, format
// password or x-sensitive.
func secretFields(schema []byte) []string {
	var s struct {
		Properties map[string]struct {
			WriteOnly bool   `json:"writeOnly"`
			Format    string `json:"format"`
			Sensitive bool   `json:"x-sensitive"`
		} `json:"properties"`
	}
	_ = json.Unmarshal(schema, &s)
	out := []string{}
	for k, p := range s.Properties {
		if p.WriteOnly || p.Format == "password" || p.Sensitive {
			out = append(out, k)
		}
	}
	sort.Strings(out)
	return out
}

func (a *API) loadValues(c *gin.Context, q store.Querier, key string, forUpdate bool) (map[string]any, error) {
	sql := `SELECT config_enc FROM plugins WHERE key = $1`
	if forUpdate {
		sql += ` FOR UPDATE`
	}
	var enc []byte
	if err := q.QueryRow(c.Request.Context(), sql, key).Scan(&enc); err != nil {
		if isNoRows(err) {
			return nil, core.ErrNotFound.WithMessage("plugin not found")
		}
		return nil, err
	}
	values := map[string]any{}
	if len(enc) == 0 {
		return values, nil
	}
	if a.d.Cipher == nil {
		return nil, core.ErrUnavailable.WithMessage("settings encryption unavailable")
	}
	plain, err := a.d.Cipher.Decrypt(enc, ConfigAAD(key))
	if err != nil {
		return nil, fmt.Errorf("decrypt plugin settings: %w", err)
	}
	if err := json.Unmarshal(plain, &values); err != nil {
		return nil, fmt.Errorf("decode plugin settings: %w", err)
	}
	return values, nil
}

func (a *API) getSettings(c *gin.Context) {
	key := c.Param("key")
	v, ok := a.settingsForm(c, key)
	if !ok {
		return
	}
	values, err := a.loadValues(c, a.d.DB.Pool, key, false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	for _, s := range v.Secrets {
		if val, ok := values[s]; ok && val != nil && val != "" {
			values[s] = Mask
		}
	}
	v.Values = values
	httpapi.OK(c, v)
}

func (a *API) putSettings(c *gin.Context) {
	key := c.Param("key")
	var in struct {
		Values map[string]any `json:"values"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if in.Values == nil {
		httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: "values", Code: "required", Message: "values must be an object"}))
		return
	}
	if a.d.Cipher == nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("settings encryption unavailable"))
		return
	}
	form, ok := a.settingsForm(c, key)
	if !ok {
		return
	}
	var changed []string
	err := a.d.DB.Tx(c.Request.Context(), func(tx pgx.Tx) error {
		old, err := a.loadValues(c, tx, key, true)
		if err != nil {
			return err
		}
		for _, s := range form.Secrets {
			if in.Values[s] == Mask {
				if ov, ok := old[s]; ok {
					in.Values[s] = ov
				} else {
					delete(in.Values, s)
				}
			}
		}
		if form.Mode == "schema" && len(form.Schema) > 0 && string(form.Schema) != "null" {
			if err := validateSettings(form.Schema, in.Values); err != nil {
				return err
			}
		}
		for k, v := range in.Values {
			ob, _ := json.Marshal(old[k])
			nb, _ := json.Marshal(v)
			if _, had := old[k]; !had || !bytes.Equal(ob, nb) {
				changed = append(changed, k)
			}
		}
		for k := range old {
			if _, ok := in.Values[k]; !ok {
				changed = append(changed, k)
			}
		}
		sort.Strings(changed)
		plain, err := json.Marshal(in.Values)
		if err != nil {
			return err
		}
		enc, err := a.d.Cipher.Encrypt(plain, ConfigAAD(key))
		if err != nil {
			return err
		}
		if _, err := tx.Exec(c.Request.Context(), `UPDATE plugins SET config_enc = $2, updated_at = now(),
			row_version = row_version + 1 WHERE key = $1`, key, enc); err != nil {
			return err
		}
		// Only key names are audited; values may be secret.
		return audit.Audit(ctx(c), tx, actor(c), "plugin.settings.update", "plugin", key, map[string]any{"changed_keys": changed})
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	install.Notify(c.Request.Context(), a.d.Bus, key)
	a.getSettings(c)
}

type denyLoader struct{}

func (denyLoader) Load(url string) (any, error) {
	return nil, fmt.Errorf("external schema references are not allowed: %s", url)
}

// validateSettings checks values against the plugin's JSON Schema.
func validateSettings(schema []byte, values map[string]any) error {
	doc, err := jsonschema.UnmarshalJSON(bytes.NewReader(schema))
	if err != nil {
		return core.ErrInternal.WithMessage("plugin settings schema is invalid").WithCause(err)
	}
	comp := jsonschema.NewCompiler()
	comp.UseLoader(denyLoader{})
	const loc = "plugin-settings.json"
	if err := comp.AddResource(loc, doc); err != nil {
		return core.ErrInternal.WithMessage("plugin settings schema is invalid").WithCause(err)
	}
	sch, err := comp.Compile(loc)
	if err != nil {
		return core.ErrInternal.WithMessage("plugin settings schema is invalid").WithCause(err)
	}
	raw, _ := json.Marshal(values)
	inst, err := jsonschema.UnmarshalJSON(bytes.NewReader(raw))
	if err != nil {
		return err
	}
	if err := sch.Validate(inst); err != nil {
		var ve *jsonschema.ValidationError
		if errors.As(err, &ve) {
			return core.InvalidFields(schemaErrors(ve)...)
		}
		return core.ErrInvalidArgument.WithMessage(err.Error())
	}
	return nil
}

func schemaErrors(ve *jsonschema.ValidationError) []core.FieldError {
	out := ve.BasicOutput()
	var errs []core.FieldError
	for _, u := range out.Errors {
		if u.Error == nil {
			continue
		}
		field := u.InstanceLocation
		if field == "" {
			field = "values"
		} else {
			field = "values" + field
		}
		errs = append(errs, core.FieldError{Field: field, Code: "schema", Message: u.Error.String()})
	}
	if len(errs) == 0 {
		errs = append(errs, core.FieldError{Field: "values", Code: "schema", Message: ve.Error()})
	}
	return errs
}

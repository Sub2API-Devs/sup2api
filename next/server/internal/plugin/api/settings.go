package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"slices"
	"sort"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
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
	// Secrets lists the masked fields as pointers below values ("a/b" for
	// nested ones), credentials and sensitive addresses alike.
	Secrets []string               `json:"secret_fields"`
	fields  []manifest.SecretField // the schema's own, classified
	// maskAll: every top-level setting is a credential, because no schema
	// says which ones are (or the schema marks secrets where no top-level
	// setting can be named for them).
	maskAll bool

	// Permission is the RBAC key of ui.settings.permission: its holders may
	// read and edit these settings too (CONTRACTS §75.1).
	Permission string `json:"permission,omitempty"`
}

// settingsForm loads the settings form of the plugin after checking that the
// caller holds corePerm or the permission the plugin names for its settings.
// The permission check comes first: a caller holding neither gets 403 whether
// or not the plugin exists.
func (a *API) settingsForm(c *gin.Context, key, corePerm string) (*SettingsView, bool) {
	m, version, err := a.loadCurrentManifest(c.Request.Context(), key)
	v := &SettingsView{Mode: "none", Schema: json.RawMessage("null"), UISchema: json.RawMessage("null"), Values: map[string]any{}, Secrets: []string{}, maskAll: true}
	var f *manifest.Form
	if m != nil && m.UI != nil {
		f = m.UI.Settings
	}
	if f != nil && f.Permission != "" {
		v.Permission = manifest.PermissionKey(key, f.Permission)
	}
	if !httpapi.CanAny(c, a.d.Authz, corePerm, v.Permission) {
		return nil, false
	}
	if err != nil {
		httpapi.Fail(c, err)
		return nil, false
	}
	if f == nil {
		return v, true
	}
	v.Mode, v.Page, v.Component = f.Mode, f.Page, f.Component
	// A schema form, or a native one that carries its schema (edited on the
	// plugin's own page, §75.5): the schema validates and masks either way.
	if f.Mode != "schema" && f.Schema == "" {
		return v, true
	}
	p, err := a.d.Install.Package(c.Request.Context(), key, version)
	if err != nil {
		httpapi.Fail(c, err)
		return nil, false
	}
	if b, ok := p.Files[f.Schema]; ok {
		v.Schema = b
		v.fields, v.maskAll = schemaSecrets(b)
	}
	if f.UISchema != "" {
		if b, ok := p.Files[f.UISchema]; ok {
			v.UISchema = b
		}
	}
	return v, true
}

// schemaSecrets is what a settings schema masks (manifest.SettingsSecrets).
// The packaging check refuses a schema with markers no value path leads to;
// for a package installed before that check, the top-level settings holding
// such markers are masked whole as credentials, and all settings are when a
// marker belongs to no single one or the file is no JSON object.
func schemaSecrets(schema []byte) (fields []manifest.SecretField, maskAll bool) {
	fields, unreachable := manifest.SettingsSecrets(schema)
	whole, all := manifest.UnmaskableFields(unreachable)
	if all {
		return nil, true
	}
	if len(whole) == 0 {
		return fields, false
	}
	fields = slices.DeleteFunc(fields, func(f manifest.SecretField) bool { return slices.Contains(whole, f.Path[0]) })
	return sortSecrets(append(fields, topLevelCredentials(whole)...)), false
}

// topLevelCredentials makes each named top-level setting a credential.
func topLevelCredentials(names []string) []manifest.SecretField {
	out := make([]manifest.SecretField, len(names))
	for i, name := range names {
		out[i] = manifest.SecretField{Path: []string{name}, Credential: true}
	}
	return out
}

func sortSecrets(fields []manifest.SecretField) []manifest.SecretField {
	sort.Slice(fields, func(i, j int) bool { return fields[i].Pointer() < fields[j].Pointer() })
	return fields
}

// secrets are the masked fields of the form given the values at hand (stored,
// submitted): the schema's, or under maskAll every top-level key of them.
func (v *SettingsView) secrets(values ...map[string]any) []manifest.SecretField {
	if !v.maskAll {
		return v.fields
	}
	seen := map[string]bool{}
	for _, m := range values {
		for k := range m {
			seen[k] = true
		}
	}
	return sortSecrets(topLevelCredentials(slices.Collect(maps.Keys(seen))))
}

// valueAt returns the value at path inside nested objects.
func valueAt(m map[string]any, path []string) (any, bool) {
	var cur any = m
	for _, p := range path {
		obj, ok := cur.(map[string]any)
		if !ok {
			return nil, false
		}
		if cur, ok = obj[p]; !ok {
			return nil, false
		}
	}
	return cur, true
}

// parentOf returns the object holding the last element of path.
func parentOf(m map[string]any, path []string) (map[string]any, bool) {
	if len(path) == 0 {
		return nil, false
	}
	v, ok := valueAt(m, path[:len(path)-1])
	if !ok {
		return nil, false
	}
	obj, ok := v.(map[string]any)
	return obj, ok
}

// maskValues replaces every non-empty secret value in values with Mask.
func maskValues(fields []manifest.SecretField, values map[string]any) {
	for _, f := range fields {
		if obj, ok := parentOf(values, f.Path); ok {
			if val, ok := obj[f.Path[len(f.Path)-1]]; ok && val != nil && val != "" {
				obj[f.Path[len(f.Path)-1]] = Mask
			}
		}
	}
}

// mergeSettings resolves masked values in in against the stored old values
// and returns the top-level keys that change. A caller holding only the
// plugin's own permission (manager false) keeps a stored credential only
// when nothing at all changes: re-entering another credential, editing a
// sensitive address or any plain setting needs every kept credential typed
// again, or it could point an address at itself and have the stored
// credential sent there. A masked sensitive address is kept freely: it is
// not a credential and stays where it was (CONTRACTS §75.1).
func mergeSettings(fields []manifest.SecretField, old, in map[string]any, manager bool, validate func(map[string]any) error) ([]string, error) {
	var kept []manifest.SecretField
	for _, f := range fields {
		obj, ok := parentOf(in, f.Path)
		name := f.Path[len(f.Path)-1]
		if !ok || obj[name] != Mask {
			continue
		}
		if ov, ok := valueAt(old, f.Path); ok {
			obj[name] = ov
			if f.Credential {
				kept = append(kept, f)
			}
		} else {
			delete(obj, name)
		}
	}
	if validate != nil {
		if err := validate(in); err != nil {
			return nil, err
		}
	}
	var changed []string
	for k, v := range in {
		ob, _ := json.Marshal(old[k])
		nb, _ := json.Marshal(v)
		if _, had := old[k]; !had || !bytes.Equal(ob, nb) {
			changed = append(changed, k)
		}
	}
	for k := range old {
		if _, ok := in[k]; !ok {
			changed = append(changed, k)
		}
	}
	sort.Strings(changed)
	if !manager && len(kept) > 0 && len(changed) > 0 {
		errs := make([]core.FieldError, 0, len(kept))
		for _, f := range kept {
			errs = append(errs, core.FieldError{Field: "values/" + f.Pointer(), Code: "reenter",
				Message: "re-enter this secret to change settings"})
		}
		return nil, core.InvalidFields(errs...)
	}
	return changed, nil
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
	v, ok := a.settingsForm(c, key, PermRead)
	if !ok {
		return
	}
	a.renderSettings(c, key, v)
}

// renderSettings answers the form v with the stored values, secrets masked.
func (a *API) renderSettings(c *gin.Context, key string, v *SettingsView) {
	values, err := a.loadValues(c, a.d.DB.Pool, key, false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	fields := v.secrets(values)
	maskValues(fields, values)
	v.Values, v.Secrets = values, make([]string, len(fields))
	for i, f := range fields {
		v.Secrets[i] = f.Pointer()
	}
	httpapi.OK(c, v)
}

func (a *API) putSettings(c *gin.Context) {
	key := c.Param("key")
	form, ok := a.settingsForm(c, key, PermManage)
	if !ok {
		return
	}
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
	manager := core.HasGranted(c.Request.Context(), PermManage)
	var changed []string
	err := a.d.DB.Tx(c.Request.Context(), func(tx pgx.Tx) error {
		old, err := a.loadValues(c, tx, key, true)
		if err != nil {
			return err
		}
		var validate func(map[string]any) error
		if len(form.Schema) > 0 && string(form.Schema) != "null" {
			validate = func(v map[string]any) error { return validateSettings(form.Schema, v) }
		}
		if changed, err = mergeSettings(form.secrets(old, in.Values), old, in.Values, manager, validate); err != nil {
			return err
		}
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
		return audit.Audit(ctx(c), tx, actor(c), "plugin.settings.update", "plugin", key, map[string]any{"changed_keys": changed, "request_id": core.RequestID(c.Request.Context())})
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	install.Notify(c.Request.Context(), a.d.Bus, key)
	a.renderSettings(c, key, form)
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

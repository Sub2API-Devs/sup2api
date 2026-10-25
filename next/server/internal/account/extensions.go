package account

import (
	"bytes"
	"context"
	"encoding/json"
	"reflect"
	"slices"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/santhosh-tekuri/jsonschema/v6"
)

func extensionKeys(bt core.AccountTypeBinding) []string {
	if len(bt.Type.ExtensionsSchema) == 0 {
		return containerSettingKeys(bt.Plugin.Key)
	}
	var schema struct {
		Properties map[string]json.RawMessage `json:"properties"`
	}
	if json.Unmarshal(bt.Type.ExtensionsSchema, &schema) != nil {
		return nil
	}
	keys := make([]string, 0, len(schema.Properties))
	for key := range schema.Properties {
		keys = append(keys, key)
	}
	slices.Sort(keys)
	return keys
}

func (s *Service) mergeExtensions(ctx context.Context, bt core.AccountTypeBinding, base, patch []byte) ([]byte, error) {
	if len(bt.Type.ExtensionsSchema) == 0 {
		return mergeContainerSettings(ctx, bt.Plugin.Key, base, patch)
	}
	settings, err := parseObject(base)
	if err != nil {
		return nil, err
	}
	keys, owned := extensionKeys(bt), readOnlyExtensionKeys(bt)
	if len(patch) > 0 {
		var changes fields
		if len(patch) > 65536 || json.Unmarshal(patch, &changes) != nil || changes == nil {
			return nil, core.InvalidFields(core.FieldError{Field: "settings", Code: "invalid", Message: "Settings must be a bounded JSON object"})
		}
		for key, value := range changes {
			if !slices.Contains(keys, key) {
				return nil, core.InvalidFields(core.FieldError{Field: "settings." + key, Code: "unsupported", Message: "Field is not a declared extension"})
			}
			// A read-only extension is the plugin's (applyExtensionsPatch).
			if slices.Contains(owned, key) {
				return nil, core.InvalidFields(core.FieldError{Field: "settings." + key, Code: "read_only", Message: "Field is set by the plugin"})
			}
			settings[key] = value
		}
	}
	extensions, admin := fields{}, fields{}
	for _, key := range keys {
		if value, ok := settings[key]; ok {
			extensions[key] = value
			if !slices.Contains(owned, key) {
				admin[key] = value
			}
		}
	}
	if err := s.validateExtensions(bt, mustJSON(extensions)); err != nil {
		return nil, err
	}
	// The plugin validates the admin's extensions; its read-only ones are
	// its own facts, not input.
	out, err := s.accountLifecycle(ctx, bt, &pluginv1.AccountLifecycleRequest{
		Phase: "validate", Account: &pluginv1.Account{Type: bt.Type.ID, SettingsJson: string(mustJSON(admin))},
	})
	if err != nil {
		return nil, err
	}
	if out != nil && out.SettingsJson != "" {
		if err := s.validateExtensions(bt, []byte(out.SettingsJson)); err != nil {
			return nil, core.ErrPluginUnavailable.WithMessage("Plugin returned invalid extensions").WithCause(err)
		}
		normalized, _ := parseObject([]byte(out.SettingsJson))
		for _, key := range keys {
			if !slices.Contains(owned, key) {
				delete(settings, key)
			}
		}
		for key, value := range normalized {
			// The plugin's normalization covers the admin's extensions; its
			// read-only ones keep their stored values.
			if !slices.Contains(owned, key) {
				settings[key] = value
			}
		}
	}
	return mustJSON(settings), nil
}

func (s *Service) validateExtensions(bt core.AccountTypeBinding, raw []byte) error {
	schema, err := s.compiled(bt.Type.ExtensionsSchema)
	if err != nil {
		return core.ErrPluginUnavailable.WithMessage("Invalid extension schema").WithCause(err)
	}
	value, err := jsonschema.UnmarshalJSON(bytes.NewReader(raw))
	if err == nil {
		err = schema.Validate(value)
	}
	if err != nil {
		return core.InvalidFields(core.FieldError{Field: "settings", Code: "invalid", Message: "Settings do not match the extension schema"})
	}
	return nil
}

func (s *Service) accountLifecycle(ctx context.Context, bt core.AccountTypeBinding, in *pluginv1.AccountLifecycleRequest) (*pluginv1.AccountLifecycleResponse, error) {
	if bt.Type.Lifecycle == nil {
		return nil, nil
	}
	client, ok := bt.Client.(core.AccountLifecyclePlugin)
	if !ok {
		return nil, core.ErrPluginUnavailable.WithMessage("Account lifecycle is unavailable")
	}
	out, err := client.OnAccountLifecycle(ctx, in)
	if err != nil {
		return nil, err
	}
	if out == nil {
		return nil, core.ErrPluginUnavailable.WithMessage("Invalid account lifecycle response")
	}
	if len(out.Errors) > 0 {
		fields := make([]core.FieldError, 0, len(out.Errors))
		for _, field := range out.Errors {
			fields = append(fields, core.FieldError{Field: field.GetField(), Code: field.GetCode(), Message: field.GetMessage()})
		}
		return nil, core.InvalidFields(fields...)
	}
	return out, nil
}

// readOnlyExtensionKeys are the extensions the plugin owns: properties of the
// type's extensionsSchema with "readOnly": true (CONTRACTS §59). The admin
// cannot set them; the plugin writes them through AccountPatch.extensions_json.
func readOnlyExtensionKeys(bt core.AccountTypeBinding) []string {
	var schema struct {
		Properties map[string]struct {
			ReadOnly bool `json:"readOnly"`
		} `json:"properties"`
	}
	if len(bt.Type.ExtensionsSchema) == 0 || json.Unmarshal(bt.Type.ExtensionsSchema, &schema) != nil {
		return nil
	}
	var keys []string
	for key, property := range schema.Properties {
		if property.ReadOnly {
			keys = append(keys, key)
		}
	}
	slices.Sort(keys)
	return keys
}

// applyExtensionsPatch applies the plugin's read-only extension values of a
// before_create/update answer to settings, validated against the type's
// extension schema. Only declared read-only keys may be given; a null value
// removes one. It reports whether settings changed.
func (s *Service) applyExtensionsPatch(bt core.AccountTypeBinding, settings []byte, out *pluginv1.AccountLifecycleResponse) ([]byte, bool, error) {
	raw := out.GetAccountPatch().GetExtensionsJson()
	if raw == "" {
		return settings, false, nil
	}
	var values fields
	if len(raw) > 65536 || json.Unmarshal([]byte(raw), &values) != nil || values == nil {
		return nil, false, invalidPatch([]core.FieldError{{Field: "extensions", Code: "invalid", Message: "Extensions must be a bounded JSON object"}})
	}
	current, err := parseObject(settings)
	if err != nil {
		return nil, false, err
	}
	owned := readOnlyExtensionKeys(bt)
	next := fields{}
	for key, value := range current {
		next[key] = value
	}
	for key, value := range values {
		if !slices.Contains(owned, key) {
			return nil, false, invalidPatch([]core.FieldError{{Field: "extensions." + key, Code: "unsupported", Message: "Field is not a read-only extension"}})
		}
		if bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
			delete(next, key)
		} else {
			next[key] = value
		}
	}
	extensions := fields{}
	for _, key := range extensionKeys(bt) {
		if value, ok := next[key]; ok {
			extensions[key] = value
		}
	}
	if err := s.validateExtensions(bt, mustJSON(extensions)); err != nil {
		return nil, false, invalidPatch([]core.FieldError{{Field: "extensions", Code: "invalid", Message: "Extensions do not match the extension schema"}})
	}
	if len(extensionKeysChanged(settings, mustJSON(next), owned)) == 0 {
		return settings, false, nil
	}
	return mustJSON(next), true, nil
}

// extensionKeysChanged are the keys among keys whose JSON values differ
// between two settings objects (compared as decoded values).
func extensionKeysChanged(before, after []byte, keys []string) []string {
	a, _ := parseObject(before)
	b, _ := parseObject(after)
	var changed []string
	for _, key := range keys {
		var x, y any
		_ = json.Unmarshal(a[key], &x)
		_ = json.Unmarshal(b[key], &y)
		if _, inA := a[key]; inA != (b[key] != nil) || !reflect.DeepEqual(x, y) {
			changed = append(changed, key)
		}
	}
	return changed
}

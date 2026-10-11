package account

import (
	"bytes"
	"context"
	"encoding/json"
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
	keys := extensionKeys(bt)
	if len(patch) > 0 {
		var changes fields
		if len(patch) > 65536 || json.Unmarshal(patch, &changes) != nil || changes == nil {
			return nil, core.InvalidFields(core.FieldError{Field: "settings", Code: "invalid", Message: "Settings must be a bounded JSON object"})
		}
		for key, value := range changes {
			if !slices.Contains(keys, key) {
				return nil, core.InvalidFields(core.FieldError{Field: "settings." + key, Code: "unsupported", Message: "Field is not a declared extension"})
			}
			settings[key] = value
		}
	}
	extensions := fields{}
	for _, key := range keys {
		if value, ok := settings[key]; ok {
			extensions[key] = value
		}
	}
	if err := s.validateExtensions(bt, mustJSON(extensions)); err != nil {
		return nil, err
	}
	out, err := s.accountLifecycle(ctx, bt, &pluginv1.AccountLifecycleRequest{
		Phase: "validate", Account: &pluginv1.Account{Type: bt.Type.ID, SettingsJson: string(mustJSON(extensions))},
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
			delete(settings, key)
		}
		for key, value := range normalized {
			settings[key] = value
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

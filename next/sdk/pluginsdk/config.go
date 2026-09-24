package pluginsdk

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Config is the plugin configuration passed to Configurer.Configure.
type Config struct {
	// JSON holds the plugin settings as edited in the console ("{}" when unset).
	JSON json.RawMessage
	// Grants are the host permissions the administrator approved.
	Grants []Grant
}

// Grant is one approved host permission with its scope.
type Grant struct {
	Permission string
	Scope      json.RawMessage // "{}" when none
}

// Decode unmarshals the settings JSON into v.
func (c Config) Decode(v any) error {
	if len(c.JSON) == 0 {
		return nil
	}
	return json.Unmarshal(c.JSON, v)
}

// HasGrant reports whether permission was granted.
func (c Config) HasGrant(permission string) bool {
	_, ok := c.Grant(permission)
	return ok
}

// Grant returns the grant for permission.
func (c Config) Grant(permission string) (Grant, bool) {
	for _, g := range c.Grants {
		if g.Permission == permission {
			return g, true
		}
	}
	return Grant{}, false
}

func configFromProto(in *pluginv1.ConfigureRequest) Config {
	cfg := Config{JSON: json.RawMessage(strings.TrimSpace(in.GetConfigJson()))}
	if len(cfg.JSON) == 0 {
		cfg.JSON = json.RawMessage("{}")
	}
	for _, g := range in.GetGrants() {
		scope := strings.TrimSpace(g.GetScopeJson())
		if scope == "" {
			scope = "{}"
		}
		cfg.Grants = append(cfg.Grants, Grant{Permission: g.GetPermission(), Scope: json.RawMessage(scope)})
	}
	return cfg
}

// FieldErrors is an error carrying per-field validation problems. Returned
// from Configurer.Configure it becomes ConfigureResponse.errors.
type FieldErrors []*pluginv1.FieldError

func (e FieldErrors) Error() string {
	parts := make([]string, 0, len(e))
	for _, f := range e {
		parts = append(parts, fmt.Sprintf("%s: %s", f.GetField(), f.GetMessage()))
	}
	return "invalid configuration: " + strings.Join(parts, "; ")
}

// Add appends a field error and returns the updated slice.
func (e FieldErrors) Add(field, code, message string) FieldErrors {
	return append(e, &pluginv1.FieldError{Field: field, Code: code, Message: message})
}

// Err returns e as an error, or nil when empty.
func (e FieldErrors) Err() error {
	if len(e) == 0 {
		return nil
	}
	return e
}

// AsFieldErrors extracts FieldErrors from err.
func AsFieldErrors(err error) (FieldErrors, bool) {
	var fe FieldErrors
	if errors.As(err, &fe) {
		return fe, true
	}
	return nil, false
}

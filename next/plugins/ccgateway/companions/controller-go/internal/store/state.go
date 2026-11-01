package store

import (
	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/pyjson"
)

// Account runtime statuses (S10).
const (
	StatusPending     = "pending"
	StatusSyncing     = "syncing"
	StatusReady       = "ready"
	StatusBlocked     = "blocked"
	StatusEgressError = "egress_error"
)

// Disk quota statuses (S13).
const (
	QuotaEnforced        = "enforced"
	QuotaUnbounded       = "unbounded"
	QuotaLegacyUnbounded = "legacy_unbounded"
)

// LegacyOwnEgressFields are the sing-box era state fields PV13 removes (S23).
var LegacyOwnEgressFields = []string{"uplink_ip", "legacy_gateway_ip", "egress_migration"}

// Environment is {"locale", "timezone"} (S17-S20); "" means not set.
type Environment struct {
	Locale   string
	Timezone string
}

// PyValue keeps Python's key order.
func (e Environment) PyValue() any {
	return pyjson.Ordered{{Key: "locale", Value: e.Locale}, {Key: "timezone", Value: e.Timezone}}
}

func environmentOf(v any) (Environment, error) {
	o, err := asObject(v)
	if err != nil {
		return Environment{}, err
	}
	var e Environment
	if x, ok := o.Get("locale"); ok {
		if e.Locale, err = asString(x); err != nil {
			return Environment{}, err
		}
	}
	if x, ok := o.Get("timezone"); ok {
		if e.Timezone, err = asString(x); err != nil {
			return Environment{}, err
		}
	}
	return e, nil
}

// DiskQuota is {"limit_bytes", "status"} (S13).
type DiskQuota struct {
	LimitBytes int64
	Status     string
}

// PyValue keeps Python's key order.
func (d DiskQuota) PyValue() any {
	return pyjson.Ordered{{Key: "limit_bytes", Value: d.LimitBytes}, {Key: "status", Value: d.Status}}
}

func diskQuotaOf(v any) (DiskQuota, error) {
	o, err := asObject(v)
	if err != nil {
		return DiskQuota{}, err
	}
	var d DiskQuota
	if x, ok := o.Get("limit_bytes"); ok {
		if d.LimitBytes, err = asInt(x); err != nil {
			return DiskQuota{}, err
		}
	}
	if x, ok := o.Get("status"); ok {
		if d.Status, err = asString(x); err != nil {
			return DiskQuota{}, err
		}
	}
	return d, nil
}

func policyOf(v any) (netplan.Policy, error) {
	o, err := asObject(v)
	if err != nil {
		return netplan.Policy{}, err
	}
	var p netplan.Policy
	if x, ok := o.Get("pool"); ok {
		if p.Pool, err = asString(x); err != nil {
			return p, err
		}
	}
	if x, ok := o.Get("allocation"); ok {
		if p.Allocation, err = asString(x); err != nil {
			return p, err
		}
	}
	return p, nil
}

// AccountState is <root>/<key>/state.json (S5-S23). Known keys are typed;
// every other key (sing-box leftovers, fields of a newer controller) is kept
// in Extra and written back in place. CLI, ActiveRuntime and
// MigrationFailed are kept as decoded JSON (pyjson values): their content is
// compared and copied, never re-shaped.
type AccountState struct {
	APIKey    string
	AdminKey  string
	AppIP     string
	GatewayIP string
	Revision  string
	Status    string
	CreatedAt string

	Network            Opt[netplan.Policy]
	DiskQuota          Opt[DiskQuota]
	AuthMode           Opt[string]
	CLI                Opt[any]
	Environment        Opt[Environment]
	EnvironmentCreated Opt[Environment]
	EnvironmentPending Opt[bool]
	EnvironmentDesired Opt[Environment]
	ActiveRuntime      Opt[any]
	EgressBackend      Opt[string]
	MigrationFailed    Opt[any]

	object
}

// NewAccountState is the dict _record_runtime creates for a new runtime:
// {api_key, admin_key, app_ip, gateway_ip, revision: "", status: pending,
// created_at}, in that key order.
func NewAccountState(apiKey, adminKey, appIP, gatewayIP, createdAt string) *AccountState {
	s := &AccountState{APIKey: apiKey, AdminKey: adminKey, AppIP: appIP, GatewayIP: gatewayIP,
		Status: StatusPending, CreatedAt: createdAt}
	s.mark("api_key", "admin_key", "app_ip", "gateway_ip", "revision", "status", "created_at")
	return s
}

func envEnc(e Environment) any { return e }

func (s *AccountState) specs() []spec {
	o := &s.object
	return []spec{
		strField(o, "api_key", &s.APIKey),
		strField(o, "admin_key", &s.AdminKey),
		strField(o, "app_ip", &s.AppIP),
		strField(o, "gateway_ip", &s.GatewayIP),
		strField(o, "revision", &s.Revision),
		strField(o, "status", &s.Status),
		strField(o, "created_at", &s.CreatedAt),
		optField("network", &s.Network, policyOf, func(p netplan.Policy) any { return p }),
		optField("disk_quota", &s.DiskQuota, diskQuotaOf, func(d DiskQuota) any { return d }),
		optField("auth_mode", &s.AuthMode, asString, nil),
		optField("cli", &s.CLI, anyConv, nil),
		optField("environment", &s.Environment, environmentOf, envEnc),
		optField("environment_created", &s.EnvironmentCreated, environmentOf, envEnc),
		optField("environment_pending", &s.EnvironmentPending, asBool, nil),
		optField("environment_desired", &s.EnvironmentDesired, environmentOf, envEnc),
		optField("active_runtime", &s.ActiveRuntime, anyConv, nil),
		optField("egress_backend", &s.EgressBackend, asString, nil),
		optField("migration_failed", &s.MigrationFailed, anyConv, nil),
	}
}

// Decode reads a state document (a decoded JSON object).
func (s *AccountState) Decode(raw pyjson.Ordered) error { return s.object.decode(raw, s.specs()) }

// PyValue is the state as a Python dict, in key order.
func (s *AccountState) PyValue() any { return s.object.encode(s.specs()) }

// Marshal is json.dumps(state).
func (s *AccountState) Marshal() ([]byte, error) { return pyjson.Marshal(s) }

// Keys in output order.
func (s *AccountState) Keys() []string { return s.object.keysOf(s.specs()) }

// Pop is state.pop(key, None) for a known or unknown key.
func (s *AccountState) Pop(key string) {
	for _, sp := range s.specs() {
		if sp.key == key {
			sp.unset()
		}
	}
	s.Extra.Delete(key)
	s.object.pop(key)
}

// Mark records that keys were assigned now, in this order (Python dict
// insertion order). Assigning a typed field without Mark appends a new key
// in the canonical field order at the next write; Mark is only needed where
// several new keys are assigned in a different order. Keys assigned before
// (present but not yet ordered) are placed first, in canonical order.
func (s *AccountState) Mark(keys ...string) {
	s.object.mark(s.object.keysOf(s.specs())...)
	s.object.mark(keys...)
}

// Has reports whether key would be written.
func (s *AccountState) Has(key string) bool {
	for _, k := range s.Keys() {
		if k == key {
			return true
		}
	}
	return false
}

// DropLegacyOwnEgress pops the sing-box era fields (S23); it reports whether
// any was present.
func (s *AccountState) DropLegacyOwnEgress() bool {
	found := false
	for _, k := range LegacyOwnEgressFields {
		if s.Has(k) {
			found = true
		}
		s.Pop(k)
	}
	return found
}

// Clone is a deep copy (json.loads(json.dumps(state))).
func (s *AccountState) Clone() *AccountState {
	b, err := s.Marshal()
	if err != nil {
		panic(err)
	}
	c, err := ParseAccountState(b)
	if err != nil {
		panic(err)
	}
	return c
}

// ParseAccountState decodes state.json bytes.
func ParseAccountState(data []byte) (*AccountState, error) {
	raw, err := pyjson.DecodeObject(data)
	if err != nil {
		return nil, err
	}
	s := &AccountState{}
	if err := s.Decode(raw); err != nil {
		return nil, err
	}
	return s, nil
}

// DiskQuotaOrLegacy is state.get('disk_quota', {limit_bytes: 0, status: legacy_unbounded}).
func (s *AccountState) DiskQuotaOrLegacy() DiskQuota {
	return s.DiskQuota.Or(DiskQuota{LimitBytes: 0, Status: QuotaLegacyUnbounded})
}

// AuthModeOrOAuth is state.get('auth_mode', 'oauth').
func (s *AccountState) AuthModeOrOAuth() string { return s.AuthMode.Or("oauth") }

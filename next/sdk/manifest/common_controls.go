package manifest

import (
	"bytes"
	"encoding/json"
	"math/big"
	"reflect"
	"time"
)

// Common account controls (CONTRACTS §87): the account settings the core
// edits and enforces for every account type. An account type declares in
// AccountType.CommonControls, per control name, a default and whether an
// operator may see and change the setting; the core applies the default to
// new accounts and refuses writes the declaration does not allow.

// AccountCommonControl is the declaration of one common control. Every
// field may be left out.
type AccountCommonControl struct {
	// Visible false hides the control in the console only; the API still
	// accepts what Configurable and Locked allow. Default true.
	Visible *bool `json:"visible,omitempty"`
	// Configurable false makes the setting read-only: a new account gets
	// Default (the core default without one), an existing one keeps its
	// value. Default true.
	Configurable *bool `json:"configurable,omitempty"`
	// Default is the value of a new account, in the shape of the account API
	// field (CommonControlSpecs). Absent or null: the core default.
	Default json.RawMessage `json:"default,omitempty"`
	// Locked pins the setting to Default on every account, new or existing.
	// It needs a Default.
	Locked bool `json:"locked,omitempty"`
	// Required only applies to the "proxy" control: an account must have a
	// proxy.
	Required bool `json:"required,omitempty"`
}

// IsVisible reports whether the console shows the control.
func (c AccountCommonControl) IsVisible() bool { return c.Visible == nil || *c.Visible }

// IsConfigurable reports whether the configurable flag allows changes;
// Fixed also counts Locked.
func (c AccountCommonControl) IsConfigurable() bool { return c.Configurable == nil || *c.Configurable }

// Fixed reports whether an operator cannot choose the value.
func (c AccountCommonControl) Fixed() bool { return c.Locked || !c.IsConfigurable() }

// HasDefault reports whether a default is declared (null counts as none).
func (c AccountCommonControl) HasDefault() bool {
	d := bytes.TrimSpace(c.Default)
	return len(d) > 0 && string(d) != "null"
}

// DefaultValue is the default of a bool control: true (the core default of
// schedulable and auto_disable) unless false is declared.
func (c AccountCommonControl) DefaultValue() bool {
	var v bool
	if !c.HasDefault() || json.Unmarshal(c.Default, &v) != nil {
		return true
	}
	return v
}

// ControlKind is the value shape of a common control.
type ControlKind string

const (
	ControlBool ControlKind = "bool"
	// ControlInt is an integer within CommonControlSpec.Min..Max.
	ControlInt ControlKind = "int"
	// ControlModelLimits is the account model_limits array.
	ControlModelLimits ControlKind = "model_limits"
	// ControlUsageLimit is the usage limit object (PUT /accounts/:id/usage-limit).
	ControlUsageLimit ControlKind = "usage_limit"
	// ControlModelMapping is the client → upstream model object.
	ControlModelMapping ControlKind = "model_mapping"
	// ControlParamOverride is a request parameter override (§84, sdk/paramoverride).
	ControlParamOverride ControlKind = "param_override"
	// ControlHeaderPassthrough is the list of header passthrough rules (§81).
	ControlHeaderPassthrough ControlKind = "header_passthrough"
	// ControlEnvironment is the account layer of the environment variables (§74.3).
	ControlEnvironment ControlKind = "environment"
	// ControlProxy is proxy_id / proxy_url; it only takes Required.
	ControlProxy ControlKind = "proxy"
)

// CommonControlSpec is a known common control.
type CommonControlSpec struct {
	Kind     ControlKind
	Min, Max int64 // ControlInt only
}

// Ranges of the account scheduling and limit fields, shared by the account
// API and manifest/check. 0 is unlimited for the limits.
const (
	MaxAccountPriority    = 1_000_000
	MinAccountWeight      = 1
	MaxAccountWeight      = 1000
	MaxAccountConcurrency = 100_000
	// MaxAccountRateLimit bounds rpm_limit and spm_limit.
	MaxAccountRateLimit = 10_000_000
	// MaxAccountTokenLimit bounds tpm_limit.
	MaxAccountTokenLimit = 1_000_000_000_000
	// MaxAccountModels bounds models, model_mapping and the models of one
	// model limit list (CONTRACTS §18, §68).
	MaxAccountModels = 500
	// MaxAccountModelLimits bounds the model limit lists of an account.
	MaxAccountModelLimits = 50
)

// Usage limit bounds (CONTRACTS §73), shared by the account API and
// manifest/check.
const (
	// MaxUsageLimitAmount is the largest amount, USD.
	MaxUsageLimitAmount = 1_000_000_000
	// UsageLimitAmountDecimals is the most decimals of an amount.
	UsageLimitAmountDecimals = 8
	// UsagePeriodNone is a lifetime limit: no reset, period_count is 1.
	UsagePeriodNone = "none"
)

// UsageLimitMaxPeriodCount is the largest period_count of each period, so
// that one period lasts at most 366 days.
var UsageLimitMaxPeriodCount = map[string]int{
	"hour": 366 * 24, "day": 366, "week": 52, "month": 12, UsagePeriodNone: 1,
}

// Usage limit anchors are accepted in [UsageLimitMinAnchor,
// UsageLimitMaxAnchor), so window math never nears the limits of
// time.Duration.
var (
	UsageLimitMinAnchor = time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
	UsageLimitMaxAnchor = time.Date(2100, 1, 1, 0, 0, 0, 0, time.UTC)
)

// CommonControlSpecs are the known controls by name; the name is the account
// API field (usage_limit: the usage limit endpoint; proxy: proxy_id and
// proxy_url).
var CommonControlSpecs = map[string]CommonControlSpec{
	"schedulable":        {Kind: ControlBool},
	"auto_disable":       {Kind: ControlBool},
	"priority":           {Kind: ControlInt, Max: MaxAccountPriority},
	"weight":             {Kind: ControlInt, Min: MinAccountWeight, Max: MaxAccountWeight},
	"max_concurrency":    {Kind: ControlInt, Max: MaxAccountConcurrency},
	"rpm_limit":          {Kind: ControlInt, Max: MaxAccountRateLimit},
	"tpm_limit":          {Kind: ControlInt, Max: MaxAccountTokenLimit},
	"spm_limit":          {Kind: ControlInt, Max: MaxAccountRateLimit},
	"model_limits":       {Kind: ControlModelLimits},
	"usage_limit":        {Kind: ControlUsageLimit},
	"model_mapping":      {Kind: ControlModelMapping},
	"param_override":     {Kind: ControlParamOverride},
	"header_passthrough": {Kind: ControlHeaderPassthrough},
	"environment":        {Kind: ControlEnvironment},
	"proxy":              {Kind: ControlProxy},
}

// LegacyCommonControls are the controls cores before CommonControlsFirstCore
// already enforce (configurable and default only).
var LegacyCommonControls = []string{"schedulable", "auto_disable"}

// ModelLimitValue is one model limit list in the account API shape
// (model_limits[]); it converts to and from DefaultModelLimit.
type ModelLimitValue struct {
	Models         []string `json:"models"`
	MaxConcurrency int      `json:"max_concurrency"`
	RPMLimit       int      `json:"rpm_limit"`
	TPMLimit       int64    `json:"tpm_limit"`
	SPMLimit       int      `json:"spm_limit"`
}

// ControlDefaults are the declared limits under their common control names,
// in the account API shape, to compare with commonControls defaults.
func (d *AccountDefaultLimits) ControlDefaults() map[string]any {
	out := map[string]any{}
	if d == nil {
		return out
	}
	put := func(name string, set bool, v any) {
		if set {
			out[name] = v
		}
	}
	put("priority", d.Priority != nil, d.Priority)
	put("weight", d.Weight != nil, d.Weight)
	put("max_concurrency", d.MaxConcurrency != nil, d.MaxConcurrency)
	put("rpm_limit", d.RPMLimit != nil, d.RPMLimit)
	put("tpm_limit", d.TPMLimit != nil, d.TPMLimit)
	put("spm_limit", d.SPMLimit != nil, d.SPMLimit)
	if len(d.ModelLimits) > 0 {
		lists := make([]ModelLimitValue, len(d.ModelLimits))
		for i, l := range d.ModelLimits {
			lists[i] = ModelLimitValue(l)
		}
		out["model_limits"] = lists
	}
	return out
}

// SameControlValue compares two control values as JSON: formatting, key
// order, the spelling of numbers (0.5, 0.50, 5e-1) and null against an empty
// list or object do not matter.
func SameControlValue(a, b any) bool {
	return reflect.DeepEqual(canonicalJSON(a), canonicalJSON(b))
}

// canonicalJSON decodes v's JSON with exact numbers; an empty list or object
// is nil.
func canonicalJSON(v any) any {
	b, err := json.Marshal(v)
	if err != nil {
		return err.Error()
	}
	d := json.NewDecoder(bytes.NewReader(b))
	d.UseNumber()
	var out any
	if d.Decode(&out) != nil {
		return string(b)
	}
	switch o := out.(type) {
	case []any:
		if len(o) == 0 {
			return nil
		}
	case map[string]any:
		if len(o) == 0 {
			return nil
		}
	}
	return exactNumbers(out)
}

// exactNumbers replaces every number of a decoded value by its exact
// rational spelling.
func exactNumbers(v any) any {
	switch x := v.(type) {
	case json.Number:
		if r, ok := new(big.Rat).SetString(string(x)); ok {
			return r.RatString()
		}
	case []any:
		for i := range x {
			x[i] = exactNumbers(x[i])
		}
	case map[string]any:
		for k := range x {
			x[k] = exactNumbers(x[k])
		}
	}
	return v
}

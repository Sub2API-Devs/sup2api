package check

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/big"
	"reflect"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/paramoverride"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// camelLimitNames are the defaultLimits keys of the common controls they
// prefill; a control default uses the control names themselves.
var camelLimitNames = map[string]string{
	"priority": "priority", "weight": "weight", "max_concurrency": "maxConcurrency",
	"rpm_limit": "rpmLimit", "tpm_limit": "tpmLimit", "spm_limit": "spmLimit",
}

// commonControls validates accountTypes[].commonControls (CONTRACTS §87):
// known names, the fields each kind takes, and every default with the rules
// of the account API field it sets.
func (v *validator) commonControls(f string, at manifest.AccountType) {
	limits := at.DefaultLimits.ControlDefaults()
	for _, name := range sortedKeys(at.CommonControls) {
		cf, c := f+".commonControls."+name, at.CommonControls[name]
		spec, ok := manifest.CommonControlSpecs[name]
		if !ok {
			v.add(cf, "unsupported", "unknown common account control %q", name)
			continue
		}
		if spec.Kind == manifest.ControlProxy {
			if c.Visible != nil || c.Configurable != nil || c.HasDefault() || c.Locked {
				v.add(cf, "unsupported", "the proxy control only takes required")
			}
			continue
		}
		if c.Required {
			v.add(cf+".required", "unsupported", "required only applies to the proxy control")
		}
		if c.Locked && c.Configurable != nil && *c.Configurable {
			v.add(cf+".configurable", "conflict", "a locked control is not configurable")
		}
		if !c.HasDefault() {
			if c.Locked {
				v.add(cf+".default", "required", "a locked control needs a default")
			}
			continue
		}
		v.controlDefault(cf+".default", name, spec, c.Default)
		if limit, ok := limits[name]; ok && !sameAs(limit, c.Default) {
			v.add(cf+".default", "conflict", "differs from defaultLimits; the commonControls default wins, declare one value")
		}
	}
}

// controlDefault checks a declared default against the kind of the control.
func (v *validator) controlDefault(f, name string, spec manifest.CommonControlSpec, raw json.RawMessage) {
	var err error
	switch spec.Kind {
	case manifest.ControlBool:
		var b bool
		err = decodeStrict(raw, &b)
	case manifest.ControlInt:
		var n int64
		if err = decodeStrict(raw, &n); err == nil {
			v.controlRange(f, name, n)
		}
	case manifest.ControlModelLimits:
		var lists []manifest.ModelLimitValue
		if err = decodeStrict(raw, &lists); err == nil {
			v.modelLimitLists(f, lists, nil)
		}
	case manifest.ControlModelMapping:
		var m map[string]string
		if err = decodeStrict(raw, &m); err == nil {
			v.modelMapping(f, m)
		}
	case manifest.ControlParamOverride:
		_, errs := paramoverride.Compile(f, raw, false)
		v.addAll(errs)
	case manifest.ControlHeaderPassthrough:
		var rules []string
		if err = decodeStrict(raw, &rules); err == nil {
			_, errs := paramoverride.NormalizePassthrough(f, rules, false)
			v.addAll(errs)
		}
	case manifest.ControlEnvironment:
		var env map[string]int64
		if err = decodeStrict(raw, &env); err == nil {
			v.environment(f, env)
		}
	case manifest.ControlUsageLimit:
		v.usageLimit(f, raw)
	}
	if err != nil {
		v.add(f, "invalid", "not a valid %s value: %v", spec.Kind, err)
	}
}

// sameAs reports whether raw, decoded into the type of value (so that
// omitted fields read as zero), equals value. A raw that does not decode is
// reported by controlDefault, not here.
func sameAs(value any, raw json.RawMessage) bool {
	typed := reflect.New(reflect.TypeOf(value))
	return json.Unmarshal(raw, typed.Interface()) != nil || manifest.SameControlValue(value, typed.Elem().Interface())
}

// decodeStrict decodes one JSON value, refusing unknown object keys.
func decodeStrict(raw json.RawMessage, out any) error {
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	return d.Decode(out)
}

func (v *validator) addAll(errs []paramoverride.FieldError) {
	for _, e := range errs {
		v.add(e.Field, e.Code, "%s", e.Message)
	}
}

func widen(p *int) *int64 {
	if p == nil {
		return nil
	}
	n := int64(*p)
	return &n
}

// controlRange records an integer outside the range of an int control.
func (v *validator) controlRange(field, control string, value int64) {
	if s := manifest.CommonControlSpecs[control]; value < s.Min || value > s.Max {
		v.add(field, "invalid", "%s must be %d-%d", control, s.Min, s.Max)
	}
}

// modelLimitLists checks model limit lists with the account rules: complete
// model ids, a model in one list only, the limits in range. names maps the
// limit keys of the account API to the keys the declaration spells (nil: the
// same keys).
func (v *validator) modelLimitLists(f string, lists []manifest.ModelLimitValue, names map[string]string) {
	key := func(control string) string {
		if n, ok := names[control]; ok {
			return n
		}
		return control
	}
	if len(lists) > manifest.MaxAccountModelLimits {
		v.add(f, "too_many", "at most %d model lists", manifest.MaxAccountModelLimits)
	}
	owner := map[string]bool{}
	for i, l := range lists {
		lf := fmt.Sprintf("%s[%d]", f, i)
		if len(l.Models) == 0 {
			v.add(lf+".models", "required", "a model list needs at least one model")
		}
		if len(l.Models) > manifest.MaxAccountModels {
			v.add(lf+".models", "too_many", "at most %d models per list", manifest.MaxAccountModels)
		}
		for j, m := range l.Models {
			mf := fmt.Sprintf("%s.models[%d]", lf, j)
			switch {
			case !manifest.ValidModelID(m):
				v.add(mf, "invalid", "%q is not a complete model id", m)
			case owner[m]:
				v.add(mf, "duplicate", "model %q is in more than one list", m)
			}
			owner[m] = true
		}
		for _, x := range []struct {
			control string
			value   int64
		}{{"max_concurrency", int64(l.MaxConcurrency)}, {"rpm_limit", int64(l.RPMLimit)}, {"tpm_limit", l.TPMLimit}, {"spm_limit", int64(l.SPMLimit)}} {
			v.controlRange(lf+"."+key(x.control), x.control, x.value)
		}
	}
}

// modelMapping checks a client → upstream model mapping.
func (v *validator) modelMapping(f string, m map[string]string) {
	if len(m) > manifest.MaxAccountModels {
		v.add(f, "too_many", "at most %d mapping entries", manifest.MaxAccountModels)
	}
	for _, from := range sortedKeys(m) {
		if !manifest.ValidModelID(from) || !manifest.ValidModelID(m[from]) {
			v.add(f+"."+from, "invalid", "%q -> %q: both sides must be complete model ids", from, m[from])
		}
	}
}

// environment checks the account layer of the environment variables.
func (v *validator) environment(f string, env map[string]int64) {
	for _, key := range sortedKeys(env) {
		r, ok := protocol.AccountEnvVars[key]
		switch {
		case !ok:
			v.add(f+"."+key, "invalid", "%q is not an environment variable of the account layer", key)
		case env[key] != 0 && (env[key] < r.Min || env[key] > r.Max):
			v.add(f+"."+key, "invalid", "must be 0 (follow) or %d-%d", r.Min, r.Max)
		}
	}
}

// usageLimitValue is the body of PUT /accounts/:id/usage-limit (§73.3); the
// account API starts from a monthly limit of one period.
type usageLimitValue struct {
	RawCost     bool        `json:"raw_cost_accounting"`
	Enabled     bool        `json:"enabled"`
	Amount      json.Number `json:"amount"`
	Period      string      `json:"period"`
	PeriodCount int         `json:"period_count"`
	Anchor      *time.Time  `json:"anchor"`
	Timezone    string      `json:"timezone"`
}

// usageLimit checks a usage limit with the rules of the account API.
func (v *validator) usageLimit(f string, raw json.RawMessage) {
	l := usageLimitValue{Period: "month", PeriodCount: 1}
	if err := decodeStrict(raw, &l); err != nil {
		v.add(f, "invalid", "not a valid usage limit: %v", err)
		return
	}
	maxCount, ok := manifest.UsageLimitMaxPeriodCount[l.Period]
	switch {
	case !ok:
		v.add(f+".period", "invalid", "period must be hour, day, week, month or none")
	case l.Period != manifest.UsagePeriodNone && (l.PeriodCount < 1 || l.PeriodCount > maxCount):
		v.add(f+".period_count", "invalid", "period count must be 1-%d", maxCount)
	}
	v.usageAmount(f+".amount", string(l.Amount), l.Enabled)
	if l.Anchor != nil && (l.Anchor.Before(manifest.UsageLimitMinAnchor) || !l.Anchor.Before(manifest.UsageLimitMaxAnchor)) {
		v.add(f+".anchor", "invalid", "anchor must be between 2000 and 2100")
	}
	if _, err := time.LoadLocation(l.Timezone); err != nil || l.Timezone == "" || l.Timezone == "Local" || len(l.Timezone) > 64 {
		v.add(f+".timezone", "invalid", "timezone is required and must be an IANA time zone name")
	}
}

// usageAmount checks the amount of a usage limit, a decimal number of USD
// ("" is 0).
func (v *validator) usageAmount(f, s string, enabled bool) {
	amount := new(big.Rat)
	if s != "" {
		if _, ok := amount.SetString(s); !ok {
			v.add(f, "invalid", "amount must be a number")
			return
		}
	}
	scale := new(big.Rat).SetInt(new(big.Int).Exp(big.NewInt(10), big.NewInt(manifest.UsageLimitAmountDecimals), nil))
	switch {
	case amount.Sign() < 0 || amount.Cmp(big.NewRat(manifest.MaxUsageLimitAmount, 1)) > 0 || !new(big.Rat).Mul(amount, scale).IsInt():
		v.add(f, "invalid", "amount must be 0-%d USD with at most %d decimals", manifest.MaxUsageLimitAmount, manifest.UsageLimitAmountDecimals)
	case enabled && amount.Sign() == 0:
		v.add(f, "invalid", "an enabled usage limit needs an amount above 0")
	}
}

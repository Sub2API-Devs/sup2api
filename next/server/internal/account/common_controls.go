package account

import (
	"context"
	"encoding/json"
	"fmt"
	"maps"
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Common account controls (CONTRACTS §87): an account type declares per
// control (manifest.CommonControlSpecs) a default and whether the caller may
// choose the value. A new account gets the declared default, else the core
// default; a fixed control (configurable false or locked) accepts only that
// value on create, and on update only the current value (locked: only the
// default). usage_limit is enforced by its own endpoint, proxy only takes
// required.

// commonControl binds a control to its field of the account API.
type commonControl struct {
	// value is the field in the request; false when absent.
	value func(in *input) (any, bool)
	// current is the field of a saved account.
	current func(a *row) any
	// set decodes a declared default into the request field.
	set func(in *input, raw json.RawMessage) error
	// copy sets the field of dst to the one of src.
	copy func(dst, src *input)
	// coreDefault is the value of a new account without a declared default
	// (scope: the caller's own-level scope); nil for none.
	coreDefault func(scope *int64) any
	// fillCore sets an absent field to the core default.
	fillCore func(in *input, scope *int64)
}

// fieldControl is the control of a pointer field of input.
func fieldControl[T any](field func(*input) **T, current func(*row) T, coreDefault func(*int64) T) commonControl {
	return commonControl{
		value: func(in *input) (any, bool) {
			if p := *field(in); p != nil {
				return *p, true
			}
			return nil, false
		},
		current: func(a *row) any { return current(a) },
		set: func(in *input, raw json.RawMessage) error {
			v := new(T)
			if err := json.Unmarshal(raw, v); err != nil {
				return err
			}
			*field(in) = v
			return nil
		},
		copy:        func(dst, src *input) { *field(dst) = *field(src) },
		coreDefault: func(scope *int64) any { return coreDefault(scope) },
		fillCore: func(in *input, scope *int64) {
			if *field(in) == nil {
				v := coreDefault(scope)
				*field(in) = &v
			}
		},
	}
}

func always[T any](v T) func(*int64) T { return func(*int64) T { return v } }

// paramOverrideControl is the control of param_override, a raw JSON field
// whose core default is none.
var paramOverrideControl = commonControl{
	value: func(in *input) (any, bool) { return in.ParamOverride, len(in.ParamOverride) > 0 },
	current: func(a *row) any {
		if len(a.ParamOverride) == 0 {
			return nil
		}
		return json.RawMessage(a.ParamOverride)
	},
	set: func(in *input, raw json.RawMessage) error {
		in.ParamOverride = raw
		return nil
	},
	copy:        func(dst, src *input) { dst.ParamOverride = src.ParamOverride },
	coreDefault: func(*int64) any { return nil },
	fillCore:    func(*input, *int64) {},
}

// commonControlFields are the controls of account fields, keyed by control
// name; the remaining manifest.CommonControlSpecs (usage_limit, proxy) are
// handled where their values are written.
var commonControlFields = map[string]commonControl{
	"schedulable": fieldControl(func(in *input) **bool { return &in.Schedulable },
		func(a *row) bool { return a.Schedulable }, always(true)),
	"auto_disable": fieldControl(func(in *input) **bool { return &in.AutoDisable },
		func(a *row) bool { return a.AutoDisable }, always(true)),
	"priority": fieldControl(func(in *input) **int { return &in.Priority },
		func(a *row) int { return a.Priority }, always(10)),
	"weight": fieldControl(func(in *input) **int { return &in.Weight },
		func(a *row) int { return a.Weight }, always(1)),
	"max_concurrency": fieldControl(func(in *input) **int { return &in.MaxConcurrency },
		func(a *row) int { return a.MaxConcurrency }, defaultConcurrency),
	"rpm_limit": fieldControl(func(in *input) **int { return &in.RPMLimit },
		func(a *row) int { return a.RPMLimit }, always(0)),
	"tpm_limit": fieldControl(func(in *input) **int64 { return &in.TPMLimit },
		func(a *row) int64 { return a.TPMLimit }, always(int64(0))),
	"spm_limit": fieldControl(func(in *input) **int { return &in.SPMLimit },
		func(a *row) int { return a.SPMLimit }, always(0)),
	"model_limits": fieldControl(func(in *input) **[]core.ModelLimit { return &in.ModelLimits },
		(*row).modelLimits, always([]core.ModelLimit{})),
	"model_mapping": fieldControl(func(in *input) **map[string]string { return &in.ModelMapping },
		(*row).mapping, always(map[string]string{})),
	"environment": fieldControl(func(in *input) **core.EnvironmentValues { return &in.Environment },
		func(a *row) core.EnvironmentValues { return a.Environment }, always(core.EnvironmentValues{})),
	"header_passthrough": fieldControl(func(in *input) **[]string { return &in.HeaderPassthrough },
		func(a *row) []string { return a.HeaderPassthrough }, always([]string{})),
	"param_override": paramOverrideControl,
}

// declaredControl is a field control an account type declares.
type declaredControl struct {
	name    string
	control commonControl
	decl    manifest.AccountCommonControl
	// def holds the declared default as a validated request would carry it;
	// nil without one.
	def *input
}

// expected is the only value a fixed control accepts: on create the
// default, on update the current value (locked: the default).
func (c declaredControl) expected(current *row, scope *int64) any {
	switch {
	case c.def != nil && (current == nil || c.decl.Locked):
		v, _ := c.control.value(c.def)
		return v
	case current != nil:
		return c.control.current(current)
	default:
		return c.control.coreDefault(scope)
	}
}

// controlPlan is what the declarations of an account type ask of a write.
type controlPlan struct {
	fields        []declaredControl // by name
	proxyRequired bool
	// usageLimit is the declared default usage limit, nil without one;
	// usageLimitLocked pins every account to it.
	usageLimit       *UsageLimit
	usageLimitLocked bool
}

// planControls resolves the declarations of an account type, normalizing
// each default with the validation of the account API (manifest/check has
// already accepted them, so an error here is a broken package).
func planControls(ctx context.Context, at manifest.AccountType) (controlPlan, error) {
	var plan controlPlan
	for _, name := range slices.Sorted(maps.Keys(at.CommonControls)) {
		decl := at.CommonControls[name]
		switch control, ok := commonControlFields[name]; {
		case name == "proxy":
			plan.proxyRequired = decl.Required
		case name == "usage_limit" && decl.HasDefault():
			l, err := parseUsageLimit(ctx, decl.Default)
			if err != nil {
				return plan, err
			}
			plan.usageLimit, plan.usageLimitLocked = &l, decl.Locked
		case ok:
			c := declaredControl{name: name, control: control, decl: decl}
			if decl.HasDefault() {
				var err error
				if c.def, err = normalizedDefault(ctx, name, control, decl.Default); err != nil {
					return plan, err
				}
			}
			plan.fields = append(plan.fields, c)
		}
	}
	return plan, nil
}

// normalizedDefault is a request carrying only the default, validated.
func normalizedDefault(ctx context.Context, name string, control commonControl, raw json.RawMessage) (*input, error) {
	def := &input{}
	if err := control.set(def, raw); err != nil {
		return nil, core.InvalidFields(core.FieldError{Field: name, Code: "invalid",
			Message: t(ctx, "the account type declares an invalid default", "该账号类型声明的默认值无效")})
	}
	if fe := def.validate(ctx, false); len(fe) > 0 {
		return nil, core.InvalidFields(fe...)
	}
	return def, nil
}

// check refuses the request fields the declarations do not let the caller
// choose, and a missing required proxy. current is the locked row on update,
// nil on create.
func (p controlPlan) check(ctx context.Context, in *input, current *row, scope *int64) []core.FieldError {
	var fe []core.FieldError
	for _, c := range p.fields {
		if got, ok := c.control.value(in); ok && c.decl.Fixed() && !manifest.SameControlValue(got, c.expected(current, scope)) {
			fe = append(fe, readOnlyControl(ctx, c.name))
		}
	}
	if p.proxyRequired && in.leavesNoProxy(current) {
		fe = append(fe, core.FieldError{Field: "proxy_id", Code: "required",
			Message: t(ctx, "this account type requires a proxy", "该账号类型必须配置代理")})
	}
	return fe
}

func readOnlyControl(ctx context.Context, field string) core.FieldError {
	return core.FieldError{Field: field, Code: "read_only",
		Message: t(ctx, "this account setting is not configurable for this account type", "该账号类型不允许修改此通用配置")}
}

// fillDefaults gives every control field the request of a new account
// leaves out the declared default, else the core default.
func (p controlPlan) fillDefaults(in *input, scope *int64) {
	for name, control := range commonControlFields {
		if _, ok := control.value(in); ok {
			continue
		}
		if def := p.declaredDefault(name); def != nil {
			control.copy(in, def)
		} else {
			control.fillCore(in, scope)
		}
	}
}

// declared is the declaration of a field control (zero when none).
func (p controlPlan) declared(name string) declaredControl {
	if i := slices.IndexFunc(p.fields, func(c declaredControl) bool { return c.name == name }); i >= 0 {
		return p.fields[i]
	}
	return declaredControl{}
}

// declaredDefault is the normalized default of a field control, nil when
// none is declared.
func (p controlPlan) declaredDefault(name string) *input { return p.declared(name).def }

// converge gives each locked field the request leaves out its default when
// the account holds another value: a locked setting is always its default
// (CONTRACTS §87), so an older account takes it on its next save. Runs after
// the own-level restrictions, which judge only what the caller sent.
func (p controlPlan) converge(in *input, current *row) {
	for _, c := range p.fields {
		if _, set := c.control.value(in); set || !c.decl.Locked || c.def == nil {
			continue
		}
		if v, _ := c.control.value(c.def); !manifest.SameControlValue(v, c.control.current(current)) {
			c.control.copy(in, c.def)
		}
	}
}

// convergeUsageLimit stores a locked usage limit on an account holding
// another one, reporting whether it did.
func (p controlPlan) convergeUsageLimit(ctx context.Context, q store.Querier, id int64) (bool, error) {
	if !p.usageLimitLocked || p.usageLimit == nil {
		return false, nil
	}
	limits, err := usageLimits(ctx, q, []int64{id})
	if err != nil {
		return false, err
	}
	if l, ok := limits[id]; ok && l.same(*p.usageLimit) {
		return false, nil
	}
	return true, saveUsageLimit(ctx, q, id, *p.usageLimit)
}

// ownCap is a field an own-level caller is capped on (H3.2): they may set
// it within [min, max].
type ownCap struct {
	name, zh string // the field, and its name in the Chinese message
	field    func(*input) **int
	min, max int
	// below is what a default under min clamps to: min, or for
	// max_concurrency (0 = unlimited, which own-level callers cannot set)
	// ownDefaultConcurrency.
	below int
}

var ownCapped = []ownCap{
	{"priority", "优先级", func(in *input) **int { return &in.Priority }, 0, ownMaxPriority, 0},
	{"weight", "权重", func(in *input) **int { return &in.Weight }, 1, ownMaxWeight, 1},
	{"max_concurrency", "最大并发", func(in *input) **int { return &in.MaxConcurrency }, 1, ownMaxConcurrency, ownDefaultConcurrency},
}

// clamp fits v into the cap.
func (f ownCap) clamp(v int) int {
	if v < f.min {
		return f.below
	}
	return min(v, f.max)
}

// restricted is the error of a sent value outside the cap, nil otherwise.
func (f ownCap) restricted(ctx context.Context, in *input) error {
	if v := *f.field(in); v == nil || (*v >= f.min && *v <= f.max) {
		return nil
	}
	return core.InvalidFields(core.FieldError{Field: f.name, Code: "restricted",
		Message: t(ctx, fmt.Sprintf("own-level users can only set %s between %d-%d", f.name, f.min, f.max),
			fmt.Sprintf("own 级用户只能设置 %d-%d 的%s", f.min, f.max, f.zh))})
}

// clampOwnDefaults fits the type's defaults of a new account into an
// own-level caller's caps: an omitted field with a declared default, and a
// sent value equal to the default the console prefills (the declared one,
// else defaultLimits). Other values stay for the own-level restrictions to
// judge; fixed controls keep the declaration's value.
func (p controlPlan) clampOwnDefaults(in *input, limits *manifest.AccountDefaultLimits, scope *int64) {
	if scope == nil {
		return
	}
	suggested := limits.ControlDefaults()
	for _, f := range ownCapped {
		c := p.declared(f.name)
		if c.decl.Fixed() {
			continue
		}
		var def *int
		if c.def != nil {
			def = *f.field(c.def)
		} else if v, ok := suggested[f.name].(*int); ok {
			def = v
		}
		switch sent := *f.field(in); {
		case def == nil:
		case sent == nil && c.def != nil, sent != nil && *sent == *def:
			*f.field(in) = new(f.clamp(*def))
		}
	}
}

// leavesNoProxy reports a write that leaves the account without a proxy: a
// new account without one, or an update clearing it. An existing account
// that never had one can still be edited otherwise.
func (in *input) leavesNoProxy(current *row) bool {
	if in.ProxyURL != nil || in.ProxyID.Valid {
		return false
	}
	return current == nil || in.ProxyID.Set
}

// patchFields drop the field of a control from an account_patch target.
var patchFields = map[string]func(*patchTarget){
	"model_mapping": func(t *patchTarget) { t.Mapping = nil }, "priority": func(t *patchTarget) { t.Priority = nil },
	"weight": func(t *patchTarget) { t.Weight = nil }, "max_concurrency": func(t *patchTarget) { t.MaxConcurrency = nil },
	"rpm_limit": func(t *patchTarget) { t.RPMLimit = nil }, "tpm_limit": func(t *patchTarget) { t.TPMLimit = nil },
	"spm_limit": func(t *patchTarget) { t.SPMLimit = nil }, "model_limits": func(t *patchTarget) { t.ModelLimits = nil },
}

// guardPatch keeps the plugin's account_patch off the fixed controls: their
// fields leave the target, so a locked or non-configurable field keeps the
// value the caller was held to.
func (p controlPlan) guardPatch(t patchTarget) patchTarget {
	for _, c := range p.fields {
		if drop, ok := patchFields[c.name]; ok && c.decl.Fixed() {
			drop(&t)
		}
	}
	return t
}

// controlsView is the declarations as GET /account-types serves them, each
// default in the shape the core stores it (normalized like a request), so
// the console compares a saved account's values with it as the core does.
// A declaration the core refuses is served as declared.
func controlsView(decls map[string]manifest.AccountCommonControl) map[string]manifest.AccountCommonControl {
	plan, err := planControls(context.Background(), manifest.AccountType{CommonControls: decls})
	if err != nil {
		return decls
	}
	out := maps.Clone(decls)
	normalize := func(name string, v any) {
		d := out[name]
		d.Default, _ = json.Marshal(v)
		out[name] = d
	}
	for _, c := range plan.fields {
		if c.def != nil {
			v, _ := c.control.value(c.def)
			normalize(c.name, v)
		}
	}
	if plan.usageLimit != nil {
		normalize("usage_limit", *plan.usageLimit)
	}
	return out
}

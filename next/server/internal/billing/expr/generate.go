package expr

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// Billing modes (model_prices.mode).
const (
	ModePerRequest = "per_request"
	ModePerToken   = "per_token"
	ModeExpression = "expression"
)

// Num is a JSON number that also accepts numeric strings ("3.75").
type Num float64

func (n *Num) UnmarshalJSON(b []byte) error {
	b = bytes.TrimSpace(b)
	if len(b) > 0 && b[0] == '"' {
		var s string
		if err := json.Unmarshal(b, &s); err != nil {
			return err
		}
		f, err := strconv.ParseFloat(strings.TrimSpace(s), 64)
		if err != nil {
			return fmt.Errorf("invalid number %q", s)
		}
		*n = Num(f)
		return nil
	}
	var f float64
	if err := json.Unmarshal(b, &f); err != nil {
		return err
	}
	*n = Num(f)
	return nil
}

// TokenPrices are USD per million tokens. p and c are always emitted; a
// cache price that is absent (nil) is not emitted, so those tokens are billed
// as input. An explicit 0 prices them as free.
type TokenPrices struct {
	P    *Num `json:"p,omitempty"`
	C    *Num `json:"c,omitempty"`
	CR   *Num `json:"cr,omitempty"`
	CC   *Num `json:"cc,omitempty"`
	CC1h *Num `json:"cc1h,omitempty"`
}

// PerRequestConfig is mode=per_request.
type PerRequestConfig struct {
	Price *Num `json:"price"`
}

// TierConfig is one tier of the visual editor. Prices may be nested under
// "prices" or given directly on the tier.
type TierConfig struct {
	Name   string       `json:"name"`
	MaxLen *Num         `json:"max_len"` // nil = the rest
	Prices *TokenPrices `json:"prices,omitempty"`
	TokenPrices
	Flat *Num `json:"flat,omitempty"`
}

// RuleConfig is one request surcharge of the visual editor.
type RuleConfig struct {
	Source     string          `json:"source,omitempty"` // header | param | time
	Kind       string          `json:"kind,omitempty"`   // alias of source
	Name       string          `json:"name,omitempty"`   // header name
	Path       string          `json:"path,omitempty"`   // body path
	Op         string          `json:"op,omitempty"`     // contains | eq | range
	Value      json.RawMessage `json:"value,omitempty"`
	TZ         string          `json:"tz,omitempty"`
	FromHour   *int            `json:"from_hour,omitempty"`
	ToHour     *int            `json:"to_hour,omitempty"`
	Multiplier *Num            `json:"multiplier"`
}

// ExpressionConfig is mode=expression edited visually.
type ExpressionConfig struct {
	Tiers []TierConfig `json:"tiers"`
	Rules []RuleConfig `json:"rules,omitempty"`
}

// ConfigError is a generator failure bound to a config field.
type ConfigError struct {
	Field string
	Issue Issue
}

func (e *ConfigError) Error() string { return e.Field + ": " + e.Issue.Detail }

func cfgErr(field, format string, args ...any) *ConfigError {
	return &ConfigError{Field: field, Issue: issuef(CodeConfig, "%s: "+format, append([]any{field}, args...)...)}
}

// HasVisualConfig reports whether an expression-mode config carries tiers.
func HasVisualConfig(config json.RawMessage) bool {
	var c ExpressionConfig
	return json.Unmarshal(config, &c) == nil && len(c.Tiers) > 0
}

// Generate builds the expression for a visual configuration. Errors are
// *ConfigError.
func Generate(mode string, config json.RawMessage) (string, error) {
	if len(bytes.TrimSpace(config)) == 0 {
		config = json.RawMessage("{}")
	}
	switch mode {
	case ModePerRequest:
		var c PerRequestConfig
		if err := json.Unmarshal(config, &c); err != nil {
			return "", cfgErr("config", "%v", err)
		}
		if c.Price == nil {
			return "", cfgErr("config.price", "required")
		}
		if err := checkNum("config.price", float64(*c.Price)); err != nil {
			return "", err
		}
		return fmt.Sprintf(`tier("base", flat(%s))`, fmtNum(float64(*c.Price))), nil
	case ModePerToken:
		var c TokenPrices
		if err := json.Unmarshal(config, &c); err != nil {
			return "", cfgErr("config", "%v", err)
		}
		body, err := tokenBody("config", c, nil)
		if err != nil {
			return "", err
		}
		return fmt.Sprintf(`tier("base", %s)`, body), nil
	case ModeExpression:
		var c ExpressionConfig
		if err := json.Unmarshal(config, &c); err != nil {
			return "", cfgErr("config", "%v", err)
		}
		return generateExpression(c)
	}
	return "", cfgErr("mode", "unknown mode %q", mode)
}

func checkNum(field string, f float64) *ConfigError {
	if math.IsNaN(f) || math.IsInf(f, 0) || f < 0 {
		return cfgErr(field, "must be a finite, non-negative number")
	}
	return nil
}

// fmtNum prints the shortest decimal form without exponent.
func fmtNum(f float64) string { return strconv.FormatFloat(f, 'f', -1, 64) }

func tokenBody(field string, c TokenPrices, flat *Num) (string, *ConfigError) {
	var terms []string
	if flat != nil && *flat != 0 {
		if err := checkNum(field+".flat", float64(*flat)); err != nil {
			return "", err
		}
		terms = append(terms, fmt.Sprintf("flat(%s)", fmtNum(float64(*flat))))
	}
	zero := Num(0)
	for _, x := range []struct {
		name     string
		v        *Num
		required bool
	}{{"p", c.P, true}, {"c", c.C, true}, {"cr", c.CR, false}, {"cc", c.CC, false}, {"cc1h", c.CC1h, false}} {
		v := x.v
		if v == nil {
			if !x.required {
				continue
			}
			v = &zero
		}
		if err := checkNum(field+"."+x.name, float64(*v)); err != nil {
			return "", err
		}
		terms = append(terms, fmt.Sprintf("%s*%s", x.name, fmtNum(float64(*v))))
	}
	return strings.Join(terms, " + "), nil
}

var (
	tierNameRe   = regexp.MustCompile(`^[A-Za-z0-9_.\-]{1,64}$`)
	headerNameRe = regexp.MustCompile(`^[A-Za-z0-9!#$%&'*+.^_|~\-]{1,100}$`)
)

func generateExpression(c ExpressionConfig) (string, error) {
	if len(c.Tiers) == 0 {
		return "", cfgErr("config.tiers", "at least one tier is required")
	}
	type tb struct {
		name   string
		maxLen *float64
		body   string
	}
	tiers := make([]tb, 0, len(c.Tiers))
	names := map[string]bool{}
	rest := 0
	for i, t := range c.Tiers {
		field := fmt.Sprintf("config.tiers[%d]", i)
		if !tierNameRe.MatchString(t.Name) {
			return "", cfgErr(field+".name", "must match %s", tierNameRe.String())
		}
		if names[t.Name] {
			return "", cfgErr(field+".name", "duplicate tier %q", t.Name)
		}
		names[t.Name] = true
		prices := t.TokenPrices
		if t.Prices != nil {
			prices = *t.Prices
		}
		body, err := tokenBody(field, prices, t.Flat)
		if err != nil {
			return "", err
		}
		x := tb{name: t.Name, body: body}
		if t.MaxLen != nil {
			m := float64(*t.MaxLen)
			if err := checkNum(field+".max_len", m); err != nil {
				return "", err
			}
			x.maxLen = &m
		} else {
			rest++
		}
		tiers = append(tiers, x)
	}
	sort.SliceStable(tiers, func(i, j int) bool {
		a, b := tiers[i].maxLen, tiers[j].maxLen
		if a == nil || b == nil {
			return a != nil && b == nil
		}
		return *a < *b
	})
	if len(tiers) > 1 && rest != 1 {
		return "", cfgErr("config.tiers", "exactly one tier must have no max_len (the rest)")
	}
	for i := 1; i < len(tiers); i++ {
		if tiers[i].maxLen != nil && *tiers[i].maxLen == *tiers[i-1].maxLen {
			return "", cfgErr("config.tiers", "duplicate max_len %s", fmtNum(*tiers[i].maxLen))
		}
	}
	call := func(t tb) string { return fmt.Sprintf("tier(%s, %s)", strconv.Quote(t.name), t.body) }
	var base string
	if len(tiers) == 1 {
		base = call(tiers[0])
	} else {
		// Build right to left: len <= a ? A : (len <= b ? B : C)
		base = call(tiers[len(tiers)-1])
		for i := len(tiers) - 2; i >= 0; i-- {
			if i < len(tiers)-2 {
				base = "(" + base + ")"
			}
			base = fmt.Sprintf("len <= %s ? %s : %s", fmtNum(*tiers[i].maxLen), call(tiers[i]), base)
		}
	}
	parts := []string{base}
	for i, r := range c.Rules {
		s, err := ruleExpr(fmt.Sprintf("config.rules[%d]", i), r)
		if err != nil {
			return "", err
		}
		parts = append(parts, s)
	}
	return strings.Join(parts, " "+RuleSeparator+" "), nil
}

func ruleExpr(field string, r RuleConfig) (string, *ConfigError) {
	if r.Multiplier == nil {
		return "", cfgErr(field+".multiplier", "required")
	}
	m := float64(*r.Multiplier)
	if err := checkNum(field+".multiplier", m); err != nil {
		return "", err
	}
	source := r.Source
	if source == "" {
		source = r.Kind
	}
	op := r.Op
	var cond string
	switch source {
	case "header":
		name := strings.ToLower(strings.TrimSpace(r.Name))
		if !headerNameRe.MatchString(name) {
			return "", cfgErr(field+".name", "invalid header name")
		}
		h := fmt.Sprintf("header(%s)", strconv.Quote(name))
		s, err := stringValue(field, r.Value)
		if err != nil {
			return "", err
		}
		switch op {
		case "contains", "":
			cond = fmt.Sprintf("has(%s, %s)", h, strconv.Quote(s))
		case "eq":
			cond = fmt.Sprintf("%s == %s", h, strconv.Quote(s))
		default:
			return "", cfgErr(field+".op", "header rules support contains and eq")
		}
	case "param":
		path := strings.TrimSpace(r.Path)
		if path == "" {
			path = strings.TrimSpace(r.Name)
		}
		if path == "" || len(path) > 200 {
			return "", cfgErr(field+".path", "required")
		}
		pr := fmt.Sprintf("param(%s)", strconv.Quote(path))
		switch op {
		case "contains":
			s, err := stringValue(field, r.Value)
			if err != nil {
				return "", err
			}
			cond = fmt.Sprintf("has(%s, %s)", pr, strconv.Quote(s))
		case "eq", "":
			lit, err := literal(field, r.Value)
			if err != nil {
				return "", err
			}
			cond = fmt.Sprintf("%s == %s", pr, lit)
		case "range":
			var bounds []*Num
			if err := json.Unmarshal(r.Value, &bounds); err != nil || len(bounds) != 2 {
				return "", cfgErr(field+".value", "range needs [min, max] (null for open)")
			}
			num := fmt.Sprintf("(%s ?? 0)", pr)
			var cs []string
			if bounds[0] != nil {
				cs = append(cs, fmt.Sprintf("%s >= %s", num, fmtNum(float64(*bounds[0]))))
			}
			if bounds[1] != nil {
				cs = append(cs, fmt.Sprintf("%s <= %s", num, fmtNum(float64(*bounds[1]))))
			}
			if len(cs) == 0 {
				return "", cfgErr(field+".value", "range needs at least one bound")
			}
			cond = strings.Join(cs, " && ")
		default:
			return "", cfgErr(field+".op", "unknown op %q", op)
		}
	case "time":
		tz := strings.TrimSpace(r.TZ)
		if tz == "" {
			tz = "UTC"
		}
		if _, err := loadLocation(tz); err != nil {
			return "", cfgErr(field+".tz", "unknown time zone %q", tz)
		}
		if r.FromHour == nil || r.ToHour == nil {
			return "", cfgErr(field, "from_hour and to_hour are required")
		}
		from, to := *r.FromHour, *r.ToHour
		if from < 0 || from > 23 || to < 0 || to > 24 || from == to {
			return "", cfgErr(field, "hours must satisfy 0 <= from_hour <= 23, 0 <= to_hour <= 24, from_hour != to_hour")
		}
		h := fmt.Sprintf("hour(%s)", strconv.Quote(tz))
		switch {
		case from < to:
			cond = fmt.Sprintf("%s >= %d && %s < %d", h, from, h, to)
		default: // wraps midnight
			cond = fmt.Sprintf("(%s >= %d || %s < %d)", h, from, h, to)
		}
	default:
		return "", cfgErr(field+".source", "must be header, param or time")
	}
	return fmt.Sprintf("%s ? %s : 1", cond, fmtNum(m)), nil
}

func stringValue(field string, raw json.RawMessage) (string, *ConfigError) {
	var s string
	if err := json.Unmarshal(raw, &s); err != nil || s == "" {
		return "", cfgErr(field+".value", "must be a non-empty string")
	}
	return s, nil
}

func literal(field string, raw json.RawMessage) (string, *ConfigError) {
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return "", cfgErr(field+".value", "required")
	}
	switch x := v.(type) {
	case string:
		return strconv.Quote(x), nil
	case float64:
		return fmtNum(x), nil
	case bool:
		return strconv.FormatBool(x), nil
	}
	return "", cfgErr(field+".value", "must be a string, number or boolean")
}

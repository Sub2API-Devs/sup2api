// Package expr implements the v1 price expression language (ARCHITECTURE
// 7.3). It is a pure package: no database, no network, no clock except the
// request time passed in by the caller.
//
// An expression has the shape
//
//	[v1:] <base> [||| <rule>]...
//
// where <base> computes the price in "micro-dollars" (token coefficients are
// USD per million tokens, so the value divided by 1e6 is USD) and every
// <rule> is a request surcharge of the form `cond ? multiplier : 1`.
//
// The engine is built on github.com/expr-lang/expr. The design follows the
// ideas of new-api's billing expressions, but the implementation is original.
package expr

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/expr-lang/expr"
	"github.com/expr-lang/expr/vm"
)

// Version1 is the only expression language version so far.
const Version1 = 1

// Scale converts an expression value to USD (value / Scale). flat(x) returns
// x * Scale so that it cancels out.
const Scale = 1_000_000

// TokenVars are the token variables of v1, in display order.
var TokenVars = []string{"p", "c", "cr", "cc", "cc1h", "img", "img_o", "ai", "ao"}

// RuleSeparator separates the base expression from request rules.
const RuleSeparator = "|||"

var versionPrefix = regexp.MustCompile(`^v(\d+)\s*:`)

// splitVersion strips an optional "vN:" prefix.
func splitVersion(src string) (version int, body string, err error) {
	s := strings.TrimSpace(src)
	m := versionPrefix.FindStringSubmatch(s)
	if m == nil {
		return Version1, s, nil
	}
	v, _ := strconv.Atoi(m[1])
	if v != Version1 {
		return 0, "", fmt.Errorf("unsupported expression version v%d", v)
	}
	return v, strings.TrimSpace(s[len(m[0]):]), nil
}

// Hash returns the canonical hash of an expression: sha256 hex of
// "v<version>:<body>" with surrounding whitespace removed, so "v1:x" and
// "x" hash the same. Unsupported versions hash their raw text.
func Hash(src string) string {
	v, body, err := splitVersion(src)
	canon := strings.TrimSpace(src)
	if err == nil {
		canon = fmt.Sprintf("v%d:%s", v, body)
	}
	sum := sha256.Sum256([]byte(canon))
	return hex.EncodeToString(sum[:])
}

// Version returns the expression version (1 when no prefix is present).
func Version(src string) (int, error) {
	v, _, err := splitVersion(src)
	return v, err
}

// splitRules splits on "|||" outside string literals.
func splitRules(body string) []string {
	var parts []string
	var quote byte
	start := 0
	for i := 0; i < len(body); i++ {
		ch := body[i]
		if quote != 0 {
			if ch == '\\' && quote != '`' {
				i++
				continue
			}
			if ch == quote {
				quote = 0
			}
			continue
		}
		switch ch {
		case '"', '\'', '`':
			quote = ch
		case '|':
			if strings.HasPrefix(body[i:], RuleSeparator) {
				parts = append(parts, strings.TrimSpace(body[start:i]))
				i += len(RuleSeparator) - 1
				start = i + 1
			}
		}
	}
	return append(parts, strings.TrimSpace(body[start:]))
}

// ---------------------------------------------------------------- program

// Program is a compiled, analysed expression. It is immutable and safe for
// concurrent use.
type Program struct {
	version int
	source  string // canonical "v1:<body>"
	hash    string

	base  *vm.Program
	rules []*rule
	tiers []*tierDef // tier() calls of the base expression, source order

	used      map[string]bool // token variables and "len"
	params    []string
	headers   []string
	facts     []string
	lenBounds []float64
	issues    []Issue // non-fatal findings (warnings) from analysis
}

type rule struct {
	cond      string // canonical condition text
	condProg  *vm.Program
	multProg  *vm.Program
	multConst *float64 // set when the multiplier is a numeric literal
}

type tierDef struct {
	name  string
	terms []*term
}

type term struct {
	label   string   // variable name, "flat", "u:<key>" or "other"
	varName string   // token variable when the term prices exactly one variable
	rate    *float64 // coefficient when the term is `var * number`
	expr    string
	prog    *vm.Program
}

// Hash is the canonical expression hash (see Hash).
func (p *Program) Hash() string { return p.hash }

// Version is the language version.
func (p *Program) Version() int { return p.version }

// Expression is the canonical source "v1:<body>".
func (p *Program) Expression() string { return p.source }

// Uses reports whether the expression reads a token variable (or "len").
func (p *Program) Uses(name string) bool { return p.used[name] }

// UsedVars lists the token variables (and "len") the expression reads.
func (p *Program) UsedVars() []string {
	var out []string
	for _, v := range append(append([]string{}, TokenVars...), "len") {
		if p.used[v] {
			out = append(out, v)
		}
	}
	return out
}

// Params lists the request body paths read through param().
func (p *Program) Params() []string { return append([]string(nil), p.params...) }

// Headers lists the lower-case header names read through header().
func (p *Program) Headers() []string { return append([]string(nil), p.headers...) }

// Facts lists the plugin metering keys read through u().
func (p *Program) Facts() []string { return append([]string(nil), p.facts...) }

// TierNames lists the literal tier names in source order (deduplicated).
func (p *Program) TierNames() []string {
	seen := map[string]bool{}
	var out []string
	for _, t := range p.tiers {
		if !seen[t.name] {
			seen[t.name] = true
			out = append(out, t.name)
		}
	}
	return out
}

// RuleConds lists the request rule conditions.
func (p *Program) RuleConds() []string {
	out := make([]string, len(p.rules))
	for i, r := range p.rules {
		out[i] = r.cond
	}
	return out
}

// LenBoundaries lists numeric literals compared against len.
func (p *Program) LenBoundaries() []float64 { return append([]float64(nil), p.lenBounds...) }

// ---------------------------------------------------------------- compile

var builtins = []string{"max", "min", "abs", "ceil", "floor"}

func options(extra ...expr.Option) []expr.Option {
	ops := []expr.Option{expr.Env(env{}), expr.DisableAllBuiltins(), expr.MaxNodes(5000)}
	for _, b := range builtins {
		ops = append(ops, expr.EnableBuiltin(b))
	}
	return append(ops, extra...)
}

// CompileError describes why an expression failed to compile.
type CompileError struct {
	Issue Issue
}

func (e *CompileError) Error() string {
	if e.Issue.Detail != "" {
		return e.Issue.Message["en"] + ": " + e.Issue.Detail
	}
	return e.Issue.Message["en"]
}

func compileErr(code, detail string) *CompileError {
	return &CompileError{Issue: newIssue(code, detail)}
}

// Compile parses, checks and analyses an expression. Errors are
// *CompileError.
func Compile(src string) (*Program, error) {
	version, body, err := splitVersion(src)
	if err != nil {
		return nil, compileErr(CodeVersion, err.Error())
	}
	if body == "" {
		return nil, compileErr(CodeEmpty, "")
	}
	parts := splitRules(body)
	p := &Program{
		version: version,
		source:  fmt.Sprintf("v%d:%s", version, body),
		used:    map[string]bool{},
	}
	p.hash = Hash(p.source)
	a := newAnalyzer(p)

	baseSrc := parts[0]
	if baseSrc == "" {
		return nil, compileErr(CodeEmpty, "")
	}
	if p.base, err = expr.Compile(baseSrc, options(expr.AsFloat64())...); err != nil {
		return nil, compileErr(CodeSyntax, err.Error())
	}
	if err := a.analyzeBase(baseSrc); err != nil {
		return nil, err
	}
	for i, rs := range parts[1:] {
		r, err := a.analyzeRule(rs)
		if err != nil {
			err.Issue.Detail = fmt.Sprintf("rule %d: %s", i+1, err.Issue.Detail)
			return nil, err
		}
		p.rules = append(p.rules, r)
	}
	a.finish()
	return p, nil
}

// ---------------------------------------------------------------- cache

const maxCached = 4096

var (
	cacheMu sync.RWMutex
	cache   = map[string]*Program{}
)

// CompileCached compiles through a process-wide cache keyed by Hash.
func CompileCached(src string) (*Program, error) {
	h := Hash(src)
	cacheMu.RLock()
	p := cache[h]
	cacheMu.RUnlock()
	if p != nil {
		return p, nil
	}
	p, err := Compile(src)
	if err != nil {
		return nil, err
	}
	cacheMu.Lock()
	if len(cache) >= maxCached {
		cache = map[string]*Program{}
	}
	cache[h] = p
	cacheMu.Unlock()
	return p, nil
}

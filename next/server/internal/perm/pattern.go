package perm

import (
	"errors"
	"slices"
	"strconv"
	"strings"
)

// Scoped permission keys (CONTRACTS §21, wildcard permissions): an action
// key may end in a scope, "<action>:<scope>", that limits the rows it
// reaches:
//
//	scope = "*" | "own" | path
//	path  = account actions: "group/" seg [ "/account/" seg ] | "account/" id
//	        proxy actions:   "proxy/" id
//	seg   = id | "*"
//
// A missing scope is "*": every row, so every unscoped key keeps its
// meaning. The last segment of a key is a scope only when it is "*", "own"
// or holds a "/"; no catalog action ends that way.

// Resource is the row kind the scope of an action ranges over.
type Resource string

const (
	ResourceAccount Resource = "account"
	ResourceProxy   Resource = "proxy"
)

// scopable lists the actions that take a scope, with their resource.
var scopable = map[Key]Resource{
	AccountRead:           ResourceAccount,
	AccountCreate:         ResourceAccount,
	AccountUpdate:         ResourceAccount,
	AccountDelete:         ResourceAccount,
	AccountTest:           ResourceAccount,
	AccountCredentialView: ResourceAccount,
	ProxyRead:             ResourceProxy,
	ProxyManage:           ResourceProxy,
}

// ScopeType is the resource the scope of action ranges over, "" when the
// action takes no scope (the permissions.scope_type column).
func ScopeType(action Key) Resource { return scopable[action] }

// legacyOwn maps the former own-level keys to their scoped form. They stay
// accepted as aliases (R2a); this table is the only place they are spelled.
var legacyOwn = map[string]Key{
	"account:own:read":            AccountRead + ":own",
	"account:own:create":          AccountCreate + ":own",
	"account:own:update":          AccountUpdate + ":own",
	"account:own:delete":          AccountDelete + ":own",
	"account:own:test":            AccountTest + ":own",
	"account:own:credential:view": AccountCredentialView + ":own",
	"proxy:own:read":              ProxyRead + ":own",
	"proxy:own:manage":            ProxyManage + ":own",
}

// LegacyOwnKeys lists the former own-level keys with their scoped form.
func LegacyOwnKeys() map[string]Key {
	out := make(map[string]Key, len(legacyOwn))
	for k, v := range legacyOwn {
		out[k] = v
	}
	return out
}

// LegacyOwnKey is the former own-level key of action ("account:own:read"
// for account:read), "" when it had none.
func LegacyOwnKey(action Key) string {
	for old, k := range legacyOwn {
		if k == action+":own" {
			return old
		}
	}
	return ""
}

// ErrInvalidKey: a scope that does not parse, on an action that takes none,
// or that the action does not accept.
var ErrInvalidKey = errors.New("invalid permission key")

// Wildcard is a group segment of "*": any group.
const Wildcard int64 = -1

// Scope is a parsed, canonical scope. At most one of All and Own is set,
// and then Group and ID are 0. Otherwise:
//   - Group > 0: group/<Group>; Group == Wildcard: group/*; 0: no group part.
//   - ID > 0: the row id, account/<ID> or proxy/<ID> (after a group part,
//     group/<g>/account/<ID>).
type Scope struct {
	All, Own  bool
	Group, ID int64
}

// Pattern is a canonical permission key split into action and scope; build
// it with Parse (a zero Scope is not a valid one).
// Unscoped keys (every action that takes no scope, plugin keys) have
// Scope.All set.
type Pattern struct {
	Action Key
	Scope  Scope
}

// Parse reads a key, aliases and trailing wildcards included, into its
// canonical pattern.
func Parse(k string) (Pattern, error) {
	if alias, ok := legacyOwn[k]; ok {
		k = string(alias)
	}
	i := strings.LastIndexByte(k, ':')
	if i < 0 {
		return Pattern{Action: Key(k), Scope: Scope{All: true}}, nil
	}
	action, last := Key(k[:i]), k[i+1:]
	if last != "*" && last != "own" && !strings.Contains(last, "/") {
		return Pattern{Action: Key(k), Scope: Scope{All: true}}, nil
	}
	res := scopable[action]
	if res == "" {
		return Pattern{}, ErrInvalidKey
	}
	s, err := parseScope(res, action == AccountCreate, last)
	if err != nil {
		return Pattern{}, err
	}
	return Pattern{Action: action, Scope: s}, nil
}

// Canonical is the canonical spelling of k: aliases rewritten, trailing
// "/*" dropped, a scope of everything left out.
func Canonical(k string) (Key, error) {
	p, err := Parse(k)
	if err != nil {
		return "", err
	}
	return p.Key(), nil
}

func parseScope(res Resource, create bool, raw string) (Scope, error) {
	switch raw {
	case "*":
		return Scope{All: true}, nil
	case "own":
		return Scope{Own: true}, nil
	}
	parts := trimWildcards(res, strings.Split(raw, "/"))
	if len(parts)%2 != 0 {
		return Scope{}, ErrInvalidKey
	}
	var s Scope
	var err error
	switch {
	case len(parts) == 0:
		return Scope{All: true}, nil
	case res == ResourceProxy:
		if len(parts) != 2 || parts[0] != "proxy" {
			return Scope{}, ErrInvalidKey
		}
		s.ID, err = id(parts[1], false)
	case parts[0] == "account" && len(parts) == 2:
		s.ID, err = id(parts[1], false)
	case parts[0] == "group" && (len(parts) == 2 || len(parts) == 4 && parts[2] == "account"):
		if s.Group, err = id(parts[1], true); err == nil && len(parts) == 4 {
			s.ID, err = id(parts[3], false)
		}
	default:
		return Scope{}, ErrInvalidKey
	}
	if err != nil || create && s.ID != 0 {
		// An id range means nothing for creating a row.
		return Scope{}, ErrInvalidKey
	}
	return s, nil
}

// trimWildcards drops the trailing "/*" of a scope path of res: a lone
// "*" ("group/12/*") and the row type of res with "*" ("group/12/account/*",
// "account/*"), but not a group's "*" ("group/*" is any group, not
// everything) and nothing else ("foo/*" stays, and fails to parse).
func trimWildcards(res Resource, parts []string) []string {
	for n := len(parts); n > 0 && parts[n-1] == "*"; n = len(parts) {
		switch {
		case n%2 == 1:
			parts = parts[:n-1]
		case parts[n-2] == string(res):
			parts = parts[:n-2]
		default:
			return parts
		}
	}
	return parts
}

// id parses a positive decimal id without leading zeros, or "*" when
// wildcard is allowed.
func id(raw string, wildcard bool) (int64, error) {
	if wildcard && raw == "*" {
		return Wildcard, nil
	}
	if raw == "" || raw[0] == '0' || raw[0] == '+' {
		return 0, ErrInvalidKey
	}
	n, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || n <= 0 {
		return 0, ErrInvalidKey
	}
	return n, nil
}

// Suffix is the canonical scope text of p, "" for everything (stored in
// role_permission_scopes.scope).
func (p Pattern) Suffix() string {
	s := p.Scope
	switch {
	case s.All:
		return ""
	case s.Own:
		return "own"
	}
	seg := func(n int64) string {
		if n == Wildcard {
			return "*"
		}
		return strconv.FormatInt(n, 10)
	}
	var b strings.Builder
	if s.Group != 0 {
		b.WriteString("group/" + seg(s.Group))
		if s.ID == 0 {
			return b.String()
		}
		b.WriteString("/")
	}
	b.WriteString(string(scopable[p.Action]) + "/" + seg(s.ID))
	return b.String()
}

// Key is the canonical key of p.
func (p Pattern) Key() Key {
	if suffix := p.Suffix(); suffix != "" {
		return p.Action + ":" + Key(suffix)
	}
	return p.Action
}

// Implies reports whether holding have grants want: the same action, and a
// scope reaching at least what want reaches, judged by the text alone, never
// by where rows are now (group/12 does not imply account/125 even while
// account 125 is in group 12).
func Implies(have, want Pattern) bool {
	h, w := have.Scope, want.Scope
	switch {
	case have.Action != want.Action:
		return false
	case h.All:
		return true
	case w.All:
		return false
	case h.Own || w.Own:
		return h.Own && w.Own
	case h.Group == 0: // account/X or proxy/X: that row, with or without a group
		return h.ID == w.ID
	case w.Group == 0: // a group range never covers an ungrouped id
		return false
	case h.Group != Wildcard && h.Group != w.Group:
		return false
	default: // the group matches; an id in have must be want's
		return h.ID == 0 || h.ID == w.ID
	}
}

// ImpliesAny reports whether one of have implies want.
func ImpliesAny(have []Pattern, want Pattern) bool {
	for _, h := range have {
		if Implies(h, want) {
			return true
		}
	}
	return false
}

// AccountAction is the account action key of action ("read" → account:read).
func AccountAction(action string) Key { return "account:" + Key(action) }

// CanonicalSet is keys canonical, sorted, without duplicates; a key that
// does not parse is dropped.
func CanonicalSet(keys []string) []string {
	out := make([]string, 0, len(keys))
	for _, k := range keys {
		if c, err := Canonical(k); err == nil {
			out = append(out, string(c))
		}
	}
	slices.Sort(out)
	return slices.Compact(out)
}

// WithLegacyOwn is keys followed by the former own-level key of each
// <action>:own among them that had one, for readers of the previous
// version (R2a: access keys a previous core verifies, GET /me for plugin
// pages). The next version drops it.
func WithLegacyOwn(keys []string) []string {
	out := slices.Clone(keys)
	for old, k := range legacyOwn {
		if slices.Contains(keys, string(k)) && !slices.Contains(keys, old) {
			out = append(out, old)
		}
	}
	slices.Sort(out)
	return out
}

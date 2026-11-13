// Package lookup serves GET /lookup/:kind (CONTRACTS §96): the console's
// entity picker finds users, groups, API keys, accounts, models and proxies
// by name or id, and turns ids back into names.
//
// The protocol (parameters, matching, order, response) is implemented once,
// here. A kind is an Entity: where its rows are and who may see them
// (entities.go). A new kind is one more Entity.
package lookup

import (
	"context"
	"slices"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

const (
	defaultLimit = 20
	maxLimit     = 50
	maxIDs       = 100
	maxText      = 256 // bytes of q, as the usage log's "contains" filters

	// contains matches a store.Like pattern, so %, _ and \ in q are literal.
	contains = ` ILIKE ? ESCAPE E'\\'`
)

// Entity describes one kind of row. Columns and conditions are SQL over the
// aliases of From; conditions take "?" placeholders (store.Filter).
type Entity struct {
	Kind string // path segment: /lookup/<kind>
	From string // FROM clause
	ID   string // numeric id column; "" when the name is the id (models)
	Name string // column q matches, returned as name
	// Search are further columns q matches, for a kind people know by more
	// than its name.
	Search []string
	Hint   string // optional expression: text that tells rows of one name apart
	Status string // optional column, returned as stored
	Live   string // optional condition leaving out soft-deleted rows

	// Read reaches every row. OwnRead (kinds without a Table: groups, by
	// account:group:bind) reaches the caller's rows only: a holder of
	// OwnRead alone is narrowed by Mine instead of refused.
	Read, OwnRead string
	// Table makes Read a scoped action (CONTRACTS §21.0): the caller sees
	// the rows of its scope of Read, any scope will do, and OwnRead is
	// unused.
	Table *core.ScopeTable
	// Mine serves mine=true; nil when no row of the kind is the caller's own.
	Mine *Mine

	Narrow []Ref // parameters that drop the rows not matching them
	Prefer []Ref // parameters that list the matching rows first
}

// Mine is the part of a kind that belongs to the caller.
type Mine struct {
	// Perms allow mine=true, any one of them; none means every signed-in user.
	Perms []string
	// Scope adds the conditions that leave only the caller's rows.
	Scope func(ctx context.Context, q store.Querier, uid int64, f *store.Filter) error
	// Hint replaces Entity.Hint when set.
	Hint string
}

// Ref is a query parameter holding the id of another entity.
type Ref struct {
	Param string
	Cond  string // true for the rows the id selects; one "?" takes the id
}

// key is the expression of the row's id.
func (e *Entity) key() string {
	if e.ID == "" {
		return e.Name
	}
	return e.ID
}

// Item is one row of the answer.
type Item struct {
	ID     any    `json:"id"` // a number; the model name for models
	Name   string `json:"name"`
	Hint   string `json:"hint,omitempty"`
	Status string `json:"status,omitempty"`
}

// Result is the answer of GET /lookup/:kind. More says that the limit cut
// further matches off.
type Result struct {
	Items []Item `json:"items"`
	More  bool   `json:"more"`
}

// Service serves the lookup endpoint.
type Service struct {
	db    *store.DB
	authz core.Authorizer
	kinds map[string]*Entity
}

// New builds the service over the kinds of entities.go.
func New(db *store.DB, authz core.Authorizer) *Service {
	s := &Service{db: db, authz: authz, kinds: make(map[string]*Entity, len(entities))}
	for _, e := range entities {
		s.kinds[e.Kind] = e
	}
	return s
}

// RegisterRoutes mounts the endpoint. The permission depends on the kind and
// on mine, so the handler checks it (allow); like the other read-only lists
// an access key may call it, within the key's own permissions.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.AuthedRead("/lookup/:kind", s.lookup)
}

func (s *Service) lookup(c *gin.Context) {
	e, ok := s.kinds[c.Param("kind")]
	if !ok {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	p, err := parse(c, e)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	own, ok := s.allow(c, e, p.mine)
	if !ok {
		return
	}
	ctx := c.Request.Context()
	var f store.Filter
	if e.Live != "" {
		f.And(e.Live)
	}
	if e.Table != nil {
		scope, err := core.Scope(ctx, s.authz, perm.Key(e.Read))
		if err == nil && scope.Empty() {
			err = core.ErrPermissionDenied.WithDetails(map[string]any{"permission": e.Read})
		}
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		f.And(e.Table.Cond(), e.Table.Args(scope)...)
	}
	hint := e.Hint
	if own {
		uid, _ := core.UserID(ctx)
		if err := e.Mine.Scope(ctx, s.db.Pool, uid, &f); err != nil {
			httpapi.Fail(c, err)
			return
		}
		if e.Mine.Hint != "" {
			hint = e.Mine.Hint
		}
	}
	sql, args := e.statement(p, &f, hint)
	rows, err := s.db.Pool.Query(ctx, sql, args...)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	items, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (it Item, err error) {
		err = r.Scan(&it.ID, &it.Name, &it.Hint, &it.Status)
		return it, err
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	// statement asked for one row more than the limit to learn this.
	more := p.ids == nil && len(items) > p.limit
	if more {
		items = items[:p.limit]
	}
	httpapi.OK(c, Result{Items: items, More: more})
}

// allow checks the caller's permission for the kind and reports whether the
// lookup is limited to the caller's own rows. When ok is false the error has
// been rendered.
func (s *Service) allow(c *gin.Context, e *Entity, mine bool) (own, ok bool) {
	if mine && e.Mine == nil {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("mine is not supported for "+e.Kind))
		return false, false
	}
	if e.Table != nil { // checked and narrowed by its scope
		return mine, true
	}
	if !mine {
		if !httpapi.CanAny(c, s.authz, e.Read, e.OwnRead) {
			return false, false
		}
		return !core.HasGranted(c.Request.Context(), perm.Key(e.Read)), true
	}
	return true, len(e.Mine.Perms) == 0 || httpapi.CanAny(c, s.authz, e.Mine.Perms...)
}

// params are the parsed query parameters of one request.
type params struct {
	text  string // q
	id    *int64 // q read as an id: all digits, on a kind with numeric ids
	ids   any    // []int64, or []string for models; nil when not given
	limit int
	mine  bool
	refs  map[string]int64 // the given Narrow and Prefer parameters
}

func invalid(param string) error {
	return core.ErrInvalidArgument.WithMessage("invalid " + param)
}

// validText reports whether PostgreSQL takes s as text.
func validText(s string) bool {
	return utf8.ValidString(s) && !strings.ContainsRune(s, 0)
}

func parse(c *gin.Context, e *Entity) (*params, error) {
	p := &params{text: strings.TrimSpace(c.Query("q")), limit: defaultLimit, refs: map[string]int64{}}
	if len(p.text) > maxText || !validText(p.text) {
		return nil, invalid("q")
	}
	// A q of digits is also an id. One too long for an id can still be part
	// of a name.
	if e.ID != "" && p.text != "" && strings.Trim(p.text, "0123456789") == "" {
		if id, err := strconv.ParseInt(p.text, 10, 64); err == nil {
			p.id = &id
		}
	}
	if v := c.Query("ids"); v != "" {
		ids, err := parseIDs(v, e.ID != "")
		if err != nil {
			return nil, err
		}
		p.ids = ids
	}
	if v := c.Query("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > maxLimit {
			return nil, invalid("limit")
		}
		p.limit = n
	}
	if v := c.Query("mine"); v != "" {
		mine, err := strconv.ParseBool(v)
		if err != nil {
			return nil, invalid("mine")
		}
		p.mine = mine
	}
	for _, r := range slices.Concat(e.Narrow, e.Prefer) {
		v := c.Query(r.Param)
		if v == "" {
			continue
		}
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			return nil, invalid(r.Param)
		}
		p.refs[r.Param] = id
	}
	return p, nil
}

// parseIDs reads ids=a,b,c: positive integers, or names when the kind has no
// numeric id.
func parseIDs(v string, numeric bool) (any, error) {
	parts := strings.Split(v, ",")
	if len(parts) > maxIDs {
		return nil, core.ErrInvalidArgument.WithMessage("ids accepts at most " + strconv.Itoa(maxIDs) + " ids")
	}
	if !numeric {
		for i, part := range parts {
			parts[i] = strings.TrimSpace(part)
			if parts[i] == "" || !validText(parts[i]) {
				return nil, invalid("ids")
			}
		}
		return parts, nil
	}
	ids := make([]int64, len(parts))
	for i, part := range parts {
		id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64)
		if err != nil || id <= 0 {
			return nil, invalid("ids")
		}
		ids[i] = id
	}
	return ids, nil
}

// search adds the condition of q to f: the name or a Search column contains
// it, or it is the id. It returns the order that lists the row of that id
// first.
func (e *Entity) search(p *params, f *store.Filter) []string {
	pattern := "%" + store.Like(p.text) + "%"
	var conds []string
	var args []any
	for _, col := range slices.Concat([]string{e.Name}, e.Search) {
		conds = append(conds, col+contains)
		args = append(args, pattern)
	}
	if p.id == nil {
		f.And("("+strings.Join(conds, " OR ")+")", args...)
		return nil
	}
	f.And("("+strings.Join(append(conds, e.ID+" = ?"), " OR ")+")", append(args, *p.id)...)
	return []string{"(" + e.ID + " = $" + strconv.Itoa(f.Len()) + ") DESC"}
}

// statement builds the query of one request on top of f, which holds the
// conditions of the caller's range. Order: the row whose id is q, the rows a
// Prefer parameter selects, then by name and id.
func (e *Entity) statement(p *params, f *store.Filter, hint string) (string, []any) {
	for _, r := range e.Narrow {
		if id, ok := p.refs[r.Param]; ok {
			f.And(r.Cond, id)
		}
	}
	var order []string
	switch {
	case p.ids != nil: // exactly these rows: q and limit do not apply
		f.And(e.key()+" = ANY(?)", p.ids)
	case p.text != "":
		order = e.search(p, f)
	}
	args := f.Args()
	for _, r := range e.Prefer {
		if id, ok := p.refs[r.Param]; ok {
			args = append(args, id)
			order = append(order, "("+strings.Replace(r.Cond, "?", "$"+strconv.Itoa(len(args)), 1)+") DESC")
		}
	}
	order = append(order, e.Name)
	if e.ID != "" {
		order = append(order, e.ID)
	}
	sql := "SELECT " + e.key() + ", " + e.Name + ", " + orEmpty(hint) + ", " + orEmpty(e.Status) +
		" FROM " + e.From + f.Cond() + " ORDER BY " + strings.Join(order, ", ")
	if p.ids != nil {
		return sql, args
	}
	// One row more than asked tells whether the limit cut matches off.
	return sql + " LIMIT $" + strconv.Itoa(len(args)+1), append(args, p.limit+1)
}

// orEmpty is the SQL of an optional text expression.
func orEmpty(expr string) string {
	if expr == "" {
		return "''"
	}
	return expr
}

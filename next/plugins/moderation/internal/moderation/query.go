package moderation

import (
	"strconv"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// sqlFilter accumulates a WHERE clause and its arguments from query
// parameters; errs collects the invalid parameters.
type sqlFilter struct {
	conds []string
	args  []any
	errs  pluginsdk.FieldErrors
}

func (f *sqlFilter) arg(v any) string {
	f.args = append(f.args, v)
	return "$" + strconv.Itoa(len(f.args))
}

func (f *sqlFilter) where() string { return strings.Join(f.conds, " AND ") }

// id adds "column = $n" for a non-negative integer parameter.
func (f *sqlFilter) id(req *pluginv1.HTTPRequest, name, column string) {
	if v, ok := f.queryID(req, name); ok {
		f.cond(column+" = ", v)
	}
}

// queryID is queryID collecting the error in f.errs.
func (f *sqlFilter) queryID(req *pluginv1.HTTPRequest, name string) (int64, bool) {
	id, ok, bad := queryID(req, name)
	if bad != nil {
		f.errs = append(f.errs, bad)
	}
	return id, ok
}

// queryID reads a non-negative integer parameter; ok = present and valid,
// bad = present and invalid.
func queryID(req *pluginv1.HTTPRequest, name string) (id int64, ok bool, bad *pluginv1.FieldError) {
	v := pluginsdk.Query(req, name)
	if v == "" {
		return 0, false, nil
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id < 0 {
		return 0, false, &pluginv1.FieldError{Field: name, Code: "invalid", Message: name + " must be a non-negative integer / " + name + " 必须是非负整数"}
	}
	return id, true, nil
}

// queryTime reads an RFC 3339 parameter; zero when absent or invalid.
func (f *sqlFilter) queryTime(req *pluginv1.HTTPRequest, name string) time.Time {
	v := pluginsdk.Query(req, name)
	if v == "" {
		return time.Time{}
	}
	t, err := time.Parse(time.RFC3339, v)
	if err != nil {
		f.errs = f.errs.Add(name, "format", name+" must be RFC 3339 / "+name+" 必须是 RFC 3339 时间")
		return time.Time{}
	}
	return t.UTC()
}

// times adds "created_at >= from" and "created_at < to" for the parameters
// from and to.
func (f *sqlFilter) times(req *pluginv1.HTTPRequest) (from, to time.Time) {
	from, to = f.queryTime(req, "from"), f.queryTime(req, "to")
	if !from.IsZero() {
		f.cond("created_at >= ", from)
	}
	if !to.IsZero() {
		f.cond("created_at < ", to)
	}
	return from, to
}

// cond adds prefix followed by the placeholder of v ("group_id = $3").
func (f *sqlFilter) cond(prefix string, v any) {
	f.conds = append(f.conds, prefix+f.arg(v))
}

// maxIDList caps the ids of a list parameter.
const maxIDList = 500

// idList adds "column = ANY($n)" for a comma list of user ids (the
// console's username search resolved through the core). "0" matches
// nobody: the search found no user.
func (f *sqlFilter) idList(req *pluginv1.HTTPRequest, name, column string) {
	v := pluginsdk.Query(req, name)
	if v == "" {
		return
	}
	ids, ok := parseIDList(v)
	if !ok {
		f.errs = f.errs.Add(name, "invalid", name+" is a comma list of up to 500 user ids (0 = none) / "+name+" 为逗号分隔的用户 id，最多 500 个（0 表示无匹配）")
		return
	}
	f.conds = append(f.conds, column+" = ANY("+f.arg(ids)+")")
}

// parseIDList reads a comma list of at most maxIDList ids (>= 0).
func parseIDList(v string) ([]int64, bool) {
	parts := strings.Split(v, ",")
	if len(parts) > maxIDList {
		return nil, false
	}
	ids := make([]int64, 0, len(parts))
	for _, part := range parts {
		id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64)
		if err != nil || id < 0 {
			return nil, false
		}
		ids = append(ids, id)
	}
	return ids, true
}

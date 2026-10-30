package moderation

import (
	"strconv"
	"strings"

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
		f.conds = append(f.conds, column+" = "+f.arg(v))
	}
}

// queryID reads a non-negative integer parameter; ok = present and valid.
func (f *sqlFilter) queryID(req *pluginv1.HTTPRequest, name string) (int64, bool) {
	v := pluginsdk.Query(req, name)
	if v == "" {
		return 0, false
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id < 0 {
		f.errs = f.errs.Add(name, "invalid", name+" must be a non-negative integer / "+name+" 必须是非负整数")
		return 0, false
	}
	return id, true
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
	parts := strings.Split(v, ",")
	ids := make([]int64, 0, len(parts))
	for _, part := range parts {
		id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64)
		if err != nil || id < 0 || len(ids) >= maxIDList {
			f.errs = f.errs.Add(name, "invalid", name+" is a comma list of up to 500 user ids (0 = none) / "+name+" 为逗号分隔的用户 id，最多 500 个（0 表示无匹配）")
			return
		}
		ids = append(ids, id)
	}
	f.conds = append(f.conds, column+" = ANY("+f.arg(ids)+")")
}

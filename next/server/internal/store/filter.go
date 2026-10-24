package store

import "strconv"

// Filter builds a parameterized WHERE clause. Conditions are written with
// "?" placeholders in the caller's own numbering-free form; And appends the
// arguments in order and rewrites each "?" to the next $n, so callers append
// LIMIT/OFFSET after the filter without renumbering anything by hand.
//
// It is a value type used inside one query construction; it is not safe for
// concurrent use.
type Filter struct {
	where []string
	args  []any
}

// And appends cond with its arguments. Placeholders are the next $n values in
// cond. Conditions are joined with AND.
func (f *Filter) And(cond string, args ...any) {
	f.args = append(f.args, args...)
	out := make([]byte, 0, len(cond)+8*len(args))
	next := 0
	for i := 0; i < len(cond); i++ {
		if cond[i] != '?' {
			out = append(out, cond[i])
			continue
		}
		next++
		out = append(out, '$')
		out = strconv.AppendInt(out, int64(len(f.args)-len(args)+next), 10)
	}
	f.where = append(f.where, string(out))
}

// Cond returns " WHERE ..." joined with AND, or "" when no condition was
// added. The leading space lets callers concatenate it to a query directly.
func (f *Filter) Cond() string {
	if len(f.where) == 0 {
		return ""
	}
	out := " WHERE "
	for i, c := range f.where {
		if i > 0 {
			out += " AND "
		}
		out += c
	}
	return out
}

// Args returns the collected arguments in placeholder order. Callers append
// their own pagination arguments after them.
func (f *Filter) Args() []any { return f.args }

// Len reports how many arguments the filter has collected so far.
func (f *Filter) Len() int { return len(f.args) }

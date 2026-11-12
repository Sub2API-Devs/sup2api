package moderation

// Audit scopes (flows.scope, CONTRACTS §72.4, 0.10.0): what of a request a
// flow moderates. The scope is a column of the flow and not a field of its
// spec, because a 0.9.3 node drops a published spec with a field it does not
// know (ParseSpec), and like enabled and the bindings it takes effect at once,
// without a publish. NULL is all: every flow did that before the scope
// existed, and a flow nobody chose a scope for keeps doing it (design D1).
const (
	ScopeInput = "input" // system, developer and user text, the user's images and documents
	ScopeTools = "tools" // input and the tool results
	ScopeAll   = "all"   // everything the client sent, assistant turns and tool definitions too
	// ScopeNew is the scope of a flow created without one.
	ScopeNew = ScopeInput
)

// scopeRank orders the scopes from the narrowest; a scope keeps the pieces
// whose role is ranked at or below it (roleScope).
var scopeRank = map[string]int{ScopeInput: 0, ScopeTools: 1, ScopeAll: 2}

// roleScope is the narrowest scope that keeps a role. A document is a
// document wherever it is (a tool result can hold one): the role of a piece
// is all the filter sees, and extractPieces stays as it is. A role not
// listed - one the client made up - is kept by every scope, so a request
// cannot leave the input scope by naming its turns differently.
var roleScope = map[string]string{
	RoleTool:      ScopeTools,
	RoleAssistant: ScopeAll,
	RoleTools:     ScopeAll,
}

// validScope reports whether s is a scope a flow can be given.
func validScope(s string) bool {
	_, ok := scopeRank[s]
	return ok
}

// auditScope is the scope a flow runs with: its column, all when NULL.
func auditScope(column *string) string {
	if column == nil || !validScope(*column) {
		return ScopeAll
	}
	return *column
}

// scopeFilter keeps the pieces scope moderates (in place).
func scopeFilter(scope string, pieces []piece) []piece {
	if scope == ScopeAll {
		return pieces
	}
	limit := scopeRank[scope]
	kept := pieces[:0]
	for _, p := range pieces {
		if s, ok := roleScope[p.role]; !ok || scopeRank[s] <= limit {
			kept = append(kept, p)
		}
	}
	return kept
}

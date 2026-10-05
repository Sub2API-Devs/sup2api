package core

// AllowsModel applies the group policy to the request model, before account mapping.
// Empty lists preserve the legacy unrestricted behavior in either mode.
func (g GroupInfo) AllowsModel(model string) bool {
	if g.ModelFilterMode != "" && g.ModelFilterMode != "whitelist" && g.ModelFilterMode != "blacklist" {
		return false
	}
	if len(g.ModelAllowlist) == 0 {
		return true
	}
	matched := false
	for _, pattern := range g.ModelAllowlist {
		if globMatch(pattern, model) {
			matched = true
			break
		}
	}
	if g.ModelFilterMode == "blacklist" {
		return !matched
	}
	return matched
}

func globMatch(pattern, s string) bool {
	p, i := 0, 0
	star, mark := -1, 0
	for i < len(s) {
		switch {
		case p < len(pattern) && (pattern[p] == '?' || pattern[p] == s[i]):
			p++
			i++
		case p < len(pattern) && pattern[p] == '*':
			star, mark = p, i
			p++
		case star >= 0:
			p = star + 1
			mark++
			i = mark
		default:
			return false
		}
	}
	for p < len(pattern) && pattern[p] == '*' {
		p++
	}
	return p == len(pattern)
}

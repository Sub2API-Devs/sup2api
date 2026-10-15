package gateway

import (
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

// Compile during policy validation/loading, never for each failure decision.
// Keep Go syntax and case intact: lowercasing changes escapes such as \D and \P.
func (v *policyValidation) regexKeywords(base string, m *FailureMatch) {
	field := base + ".keywords"
	if !v.regex {
		v.add(base+".keyword_regex", "regular expressions require policy version 4", "正则表达式需要策略版本 4")
		return
	}
	lines := strings.Split(strings.ReplaceAll(strings.Join(m.Keywords, "\n"), "\r\n", "\n"), "\n")
	keywords := []string{}
	seen := map[string]bool{}
	for i, line := range lines {
		if strings.TrimSpace(line) == "" || seen[line] {
			continue
		}
		if len(keywords) >= 100 || utf8.RuneCountInString(line) > 200 {
			v.add(field, fmt.Sprintf("line %d: at most 100 expressions, 200 characters each", i+1), fmt.Sprintf("第 %d 行：最多 100 条表达式，每条不超过 200 字符", i+1))
			return
		}
		pattern, err := regexp.Compile(line)
		if err != nil {
			v.add(field, fmt.Sprintf("line %d: invalid Go regular expression: %v", i+1, err), fmt.Sprintf("第 %d 行：Go 正则表达式无效：%v", i+1, err))
			return
		}
		seen[line] = true
		keywords = append(keywords, line)
		m.patterns = append(m.patterns, pattern)
	}
	m.Keywords = keywords
}

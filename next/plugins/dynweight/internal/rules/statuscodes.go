package rules

import (
	"fmt"
	"slices"
	"strconv"
	"strings"
)

// codeRange is an inclusive range of HTTP status codes.
type codeRange struct{ start, end int }

// parseStatusCodes parses a list such as "400, 500-503": codes and ranges
// separated by commas, 100..999 (an administrator may write "500-600" for
// every 5xx). The ranges come back sorted and merged.
func parseStatusCodes(text string) ([]codeRange, error) {
	var ranges []codeRange
	var invalid []string
	for _, token := range strings.Split(strings.ReplaceAll(text, "，", ","), ",") {
		token = strings.ReplaceAll(strings.TrimSpace(token), " ", "")
		if token == "" {
			continue
		}
		r, ok := parseCodeToken(token)
		if !ok {
			invalid = append(invalid, token)
			continue
		}
		ranges = append(ranges, r)
	}
	if len(invalid) > 0 {
		return nil, fmt.Errorf("invalid status codes: %s", strings.Join(invalid, ", "))
	}
	slices.SortFunc(ranges, func(a, b codeRange) int {
		if a.start != b.start {
			return a.start - b.start
		}
		return a.end - b.end
	})
	var merged []codeRange
	for _, r := range ranges {
		if n := len(merged); n > 0 && r.start <= merged[n-1].end+1 {
			merged[n-1].end = max(merged[n-1].end, r.end)
			continue
		}
		merged = append(merged, r)
	}
	return merged, nil
}

func parseCodeToken(token string) (codeRange, bool) {
	lo, hi, isRange := strings.Cut(token, "-")
	start, err := strconv.Atoi(lo)
	if err != nil {
		return codeRange{}, false
	}
	end := start
	if isRange {
		if end, err = strconv.Atoi(hi); err != nil {
			return codeRange{}, false
		}
	}
	return codeRange{start, end}, start >= 100 && end <= 999 && start <= end
}

// NormalizeStatusCodes validates a status code list and returns its
// canonical form ("400,500-503").
func NormalizeStatusCodes(text string) (string, error) {
	ranges, err := parseStatusCodes(text)
	if err != nil {
		return "", err
	}
	parts := make([]string, len(ranges))
	for i, r := range ranges {
		parts[i] = strconv.Itoa(r.start)
		if r.end != r.start {
			parts[i] += "-" + strconv.Itoa(r.end)
		}
	}
	return strings.Join(parts, ","), nil
}

// expandStatusCodes lists the codes of a validated list in ascending order.
// Observations put status codes above 599 in bucket 0, so the expansion stops
// at 599.
func expandStatusCodes(text string) []int {
	ranges, _ := parseStatusCodes(text)
	var codes []int
	for _, r := range ranges {
		for code := r.start; code <= min(r.end, 599); code++ {
			codes = append(codes, code)
		}
	}
	return codes
}

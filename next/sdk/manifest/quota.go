package manifest

import (
	"math"
	"strconv"
	"strings"
	"time"
)

// Values of a quota window status (CONTRACTS §44).
const (
	QuotaAllowed        = "allowed"
	QuotaAllowedWarning = "allowed_warning"
	QuotaRejected       = "rejected"
)

// QuotaReading is one quota window read from upstream response headers.
type QuotaReading struct {
	Key string
	// Utilization is in percent (0-100, more with overage); 0 when the
	// header was absent.
	Utilization float64
	// ResetsAt is nil when unknown.
	ResetsAt *time.Time
	// Status is QuotaAllowed, QuotaAllowedWarning, QuotaRejected or empty.
	Status string
}

// ReadQuotaHeaders applies quota header declarations to one response. get
// returns a header value by name (http.Header.Get, which is
// case-insensitive). Windows none of whose headers carries a usable value
// are left out, so the result is empty for a response without quota
// headers.
func ReadQuotaHeaders(decls []QuotaHeader, get func(name string) string, now time.Time) []QuotaReading {
	var out []QuotaReading
	for _, d := range decls {
		r := QuotaReading{Key: d.Key}
		found := false
		if d.Utilization != "" {
			if u, ok := parseUtilization(get(d.Utilization), d.UtilizationUnit); ok {
				r.Utilization, found = u, true
			}
		}
		if d.Reset != "" {
			if t, ok := ParseQuotaReset(get(d.Reset), d.ResetFormat, now); ok {
				r.ResetsAt, found = &t, true
			}
		}
		if d.Status != "" {
			if s := strings.TrimSpace(get(d.Status)); s != "" {
				r.Status, found = NormalizeQuotaStatus(s), true
			}
		}
		if found {
			out = append(out, r)
		}
	}
	return out
}

func parseUtilization(raw, unit string) (float64, bool) {
	raw = strings.TrimSpace(strings.TrimSuffix(strings.TrimSpace(raw), "%"))
	if raw == "" {
		return 0, false
	}
	u, err := strconv.ParseFloat(raw, 64)
	if err != nil || math.IsNaN(u) || math.IsInf(u, 0) || u < 0 {
		return 0, false
	}
	if unit != QuotaUnitPercent {
		u *= 100
	}
	return u, true
}

// ParseQuotaReset reads a reset time in one of the QuotaReset* formats
// ("" = unix). Unix values above 1e11 are taken as milliseconds (as
// sub2api does for Anthropic's headers); non-positive values are rejected.
func ParseQuotaReset(raw, format string, now time.Time) (time.Time, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}, false
	}
	switch format {
	case QuotaResetRFC3339:
		t, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			return time.Time{}, false
		}
		return t.UTC(), true
	case QuotaResetDelta:
		s, err := strconv.ParseFloat(raw, 64)
		if err != nil || math.IsNaN(s) || math.IsInf(s, 0) || s < 0 || s > 400*24*3600 {
			return time.Time{}, false
		}
		return now.Add(time.Duration(s * float64(time.Second))).UTC().Truncate(time.Second), true
	default:
		ts, err := strconv.ParseFloat(raw, 64)
		if err != nil || math.IsNaN(ts) || math.IsInf(ts, 0) || ts <= 0 {
			return time.Time{}, false
		}
		if ts > 1e11 {
			ts /= 1000
		}
		return time.Unix(int64(ts), 0).UTC(), true
	}
}

// NormalizeQuotaStatus lower-cases a status and maps anything but the three
// known values to "".
func NormalizeQuotaStatus(s string) string {
	switch s = strings.ToLower(strings.TrimSpace(s)); s {
	case QuotaAllowed, QuotaAllowedWarning, QuotaRejected:
		return s
	}
	return ""
}

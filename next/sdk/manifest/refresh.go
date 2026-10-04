package manifest

import (
	"encoding/json"
	"math"
	"strconv"
	"strings"
	"time"
)

// Defaults and bounds of AccountRefresh (CONTRACTS §48).
const (
	DefaultRefreshExpiresAtField = "expires_at"
	DefaultRefreshBeforeExpiry   = 1800
	MinRefreshBeforeExpiry       = 60
	MaxRefreshBeforeExpiry       = 86400
)

// Field returns ExpiresAtField or its default.
func (r *AccountRefresh) Field() string {
	if r == nil || r.ExpiresAtField == "" {
		return DefaultRefreshExpiresAtField
	}
	return r.ExpiresAtField
}

// Before returns BeforeExpirySec or its default as a duration.
func (r *AccountRefresh) Before() time.Duration {
	if r == nil || r.BeforeExpirySec <= 0 {
		return DefaultRefreshBeforeExpiry * time.Second
	}
	return time.Duration(r.BeforeExpirySec) * time.Second
}

// ExpiresAt reads the expiry of decoded credentials: field holds Unix
// seconds as a JSON number or a numeric string; values above 1e11 are taken
// as milliseconds. ok is false when the field is absent or unreadable.
func (r *AccountRefresh) ExpiresAt(creds map[string]any) (time.Time, bool) {
	var f float64
	switch v := creds[r.Field()].(type) {
	case float64:
		f = v
	case json.Number:
		n, err := v.Float64()
		if err != nil {
			return time.Time{}, false
		}
		f = n
	case string:
		n, err := strconv.ParseFloat(strings.TrimSpace(v), 64)
		if err != nil {
			return time.Time{}, false
		}
		f = n
	default:
		return time.Time{}, false
	}
	if math.IsNaN(f) || math.IsInf(f, 0) || f <= 0 {
		return time.Time{}, false
	}
	if f > 1e11 {
		f /= 1000
	}
	return time.Unix(int64(f), 0).UTC(), true
}

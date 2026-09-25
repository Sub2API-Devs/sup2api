package core

import (
	"bytes"
	"context"
	"encoding/json"
)

type ctxKey int

const (
	ctxUserID ctxKey = iota
	ctxRequestID
	ctxLocale
	ctxGranted
)

// WithUserID stores the authenticated console user id.
func WithUserID(ctx context.Context, id int64) context.Context {
	return context.WithValue(ctx, ctxUserID, id)
}

// UserID returns the authenticated console user id, if any.
func UserID(ctx context.Context) (int64, bool) {
	id, ok := ctx.Value(ctxUserID).(int64)
	return id, ok
}

// WithGranted records the permission keys the route middleware matched for
// the caller (CONTRACTS §21.1). Router.Perm stores its single key,
// Router.PermAny every key the caller holds among the accepted ones.
func WithGranted(ctx context.Context, keys []string) context.Context {
	return context.WithValue(ctx, ctxGranted, keys)
}

// Granted returns the permission keys matched by the route middleware; nil
// on routes without a permission requirement. Callers must not modify it.
func Granted(ctx context.Context) []string {
	keys, _ := ctx.Value(ctxGranted).([]string)
	return keys
}

// OwnerScope tells a handler which rows the caller may reach on a route
// registered with Router.PermAny(allKey, ownKey): nil when the caller holds
// allKey (every row), otherwise a pointer to the caller id (rows whose
// created_by equals it). The value is meant to go straight into SQL, e.g.
// `WHERE ($2::bigint IS NULL OR created_by = $2)`; rows with created_by
// NULL are then only reachable through allKey (CONTRACTS §21.1).
func OwnerScope(ctx context.Context, allKey string) *int64 {
	for _, k := range Granted(ctx) {
		if k == allKey {
			return nil
		}
	}
	uid, _ := UserID(ctx)
	return &uid
}

func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, ctxRequestID, id)
}

func RequestID(ctx context.Context) string {
	id, _ := ctx.Value(ctxRequestID).(string)
	return id
}

func WithLocale(ctx context.Context, locale string) context.Context {
	return context.WithValue(ctx, ctxLocale, locale)
}

// Locale returns "zh" or "en" (default).
func Locale(ctx context.Context) string {
	if l, ok := ctx.Value(ctxLocale).(string); ok && l != "" {
		return l
	}
	return "en"
}

// LocalizedText is {"en": "...", "zh": "..."}; a bare JSON string decodes as
// {"en": s}.
type LocalizedText map[string]string

func (t *LocalizedText) UnmarshalJSON(b []byte) error {
	b = bytes.TrimSpace(b)
	if len(b) > 0 && b[0] == '"' {
		var s string
		if err := json.Unmarshal(b, &s); err != nil {
			return err
		}
		*t = LocalizedText{"en": s}
		return nil
	}
	var m map[string]string
	if err := json.Unmarshal(b, &m); err != nil {
		return err
	}
	*t = m
	return nil
}

// Get returns the text for locale, falling back to "en" then any value.
func (t LocalizedText) Get(locale string) string {
	if s, ok := t[locale]; ok && s != "" {
		return s
	}
	if s, ok := t["en"]; ok {
		return s
	}
	for _, s := range t {
		return s
	}
	return ""
}

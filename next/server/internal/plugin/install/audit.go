package install

import (
	"context"
	"encoding/json"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

type ipKey struct{}

// WithClientIP stores the client IP for audit records.
func WithClientIP(ctx context.Context, ip string) context.Context {
	return context.WithValue(ctx, ipKey{}, ip)
}

func clientIP(ctx context.Context) string {
	ip, _ := ctx.Value(ipKey{}).(string)
	return ip
}

// Audit writes one audit_logs row. actorID 0 means system.
func Audit(ctx context.Context, q store.Querier, actorID int64, action, targetType, targetID string, detail any) error {
	var uid *int64
	if actorID > 0 {
		uid = &actorID
	}
	if detail == nil {
		detail = map[string]any{}
	}
	b, err := json.Marshal(detail)
	if err != nil {
		return err
	}
	ip := clientIP(ctx)
	if len(ip) > 64 {
		ip = ip[:64]
	}
	_, err = q.Exec(ctx, `
		INSERT INTO audit_logs (user_id, action, target_type, target_id, detail, ip)
		VALUES ($1, $2, $3, $4, $5, $6)`, uid, action, targetType, targetID, b, ip)
	return err
}

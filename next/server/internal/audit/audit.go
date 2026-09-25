// Package audit writes audit_logs rows (CONTRACTS §21.2). It is shared by
// every module that records console actions: plugin lifecycle, publishers,
// accounts and proxies.
package audit

import (
	"context"
	"encoding/json"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

type ipKey struct{}

// WithClientIP stores the client IP for audit records.
func WithClientIP(ctx context.Context, ip string) context.Context {
	return context.WithValue(ctx, ipKey{}, ip)
}

// ClientIP returns the IP stored by WithClientIP ("" when absent).
func ClientIP(ctx context.Context) string {
	ip, _ := ctx.Value(ipKey{}).(string)
	return ip
}

// Context returns the request context carrying the client IP, for handlers
// that audit: pass it to Audit (and to everything else in the handler, so
// nested audits see the IP too).
func Context(c *gin.Context) context.Context {
	return WithClientIP(c.Request.Context(), c.ClientIP())
}

// Audit writes one audit_logs row. actorID 0 means system. detail nil is
// written as {}. q may be the pool or a transaction.
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
	ip := ClientIP(ctx)
	if len(ip) > 64 {
		ip = ip[:64]
	}
	_, err = q.Exec(ctx, `
		INSERT INTO audit_logs (user_id, action, target_type, target_id, detail, ip)
		VALUES ($1, $2, $3, $4, $5, $6)`, uid, action, targetType, targetID, b, ip)
	return err
}

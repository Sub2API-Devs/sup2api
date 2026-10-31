package audit

import (
	"context"
	"encoding/json"
	"log/slog"
	"sort"
	"strings"
	"sync/atomic"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// ActionPluginWrite is the audit_logs action of a write served by a plugin's
// admin route (target_type "plugin", target_id the plugin key; CONTRACTS
// §74.2).
const ActionPluginWrite = "plugin.route.write"

// PluginWriteRetention is how long PluginWrites keeps its rows by default.
const PluginWriteRetention = 180 * 24 * time.Hour

// Bounds of the request body summary kept in a PluginWrite row.
const (
	maxSummaryBytes  = 4096
	maxSummaryString = 200
	maxSummaryItems  = 20
	maxSummaryDepth  = 4
)

// PluginWrite is one write a plugin admin route served.
type PluginWrite struct {
	UserID    int64
	Plugin    string
	Method    string
	Path      string // the request path under /api/v1/p/<plugin>
	Route     string // the manifest route pattern it matched
	Status    int    // the status the console answered
	RequestID string
	Body      []byte
}

// PluginWrites records PluginWrite rows and deletes them after Retention
// (default PluginWriteRetention). Purging is lazy: at most once an hour per
// node, on the next write.
type PluginWrites struct {
	DB        *store.DB
	Retention time.Duration
	purgedAt  atomic.Int64
}

// AuditPluginWrite writes the row; failures are logged, never returned, so
// that the plugin's answer still reaches the caller.
func (p *PluginWrites) AuditPluginWrite(ctx context.Context, w PluginWrite) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	detail := map[string]any{"method": w.Method, "path": w.Path, "route": w.Route, "status": w.Status, "request_id": w.RequestID}
	if len(w.Body) > 0 {
		detail["body"] = bodySummary(w.Body)
	}
	if err := Audit(ctx, p.DB.Pool, w.UserID, ActionPluginWrite, "plugin", w.Plugin, detail); err != nil {
		slog.WarnContext(ctx, "audit: plugin route write", "plugin", w.Plugin, "err", err)
	}
	last, now := p.purgedAt.Load(), time.Now().Unix()
	if now-last < 3600 || !p.purgedAt.CompareAndSwap(last, now) {
		return
	}
	retention := p.Retention
	if retention <= 0 {
		retention = PluginWriteRetention
	}
	if _, err := p.DB.Pool.Exec(ctx, `DELETE FROM audit_logs WHERE id IN (SELECT id FROM audit_logs
		WHERE action = $1 AND created_at < now() - make_interval(secs => $2) ORDER BY id LIMIT 10000)`,
		ActionPluginWrite, retention.Seconds()); err != nil {
		slog.WarnContext(ctx, "audit: purge plugin route writes", "err", err)
	}
}

// bodySummary is a bounded copy of a JSON request body that is safe to keep:
// values under secret-looking names are replaced with "[REDACTED]", strings
// are cut at 200 bytes, arrays at 20 items and nesting at 4 levels. A summary
// still over 4 KiB keeps only the sorted top-level field names; a body that
// is not JSON only its size.
func bodySummary(body []byte) any {
	var v any
	if json.Unmarshal(body, &v) != nil {
		return map[string]any{"non_json": true, "bytes": len(body)}
	}
	v = summarize(v, 0)
	if b, err := json.Marshal(v); err == nil && len(b) <= maxSummaryBytes {
		return v
	}
	fields := []string{}
	if m, ok := v.(map[string]any); ok {
		for k := range m {
			fields = append(fields, k)
		}
		sort.Strings(fields)
	}
	return map[string]any{"truncated": true, "bytes": len(body), "fields": fields}
}

func summarize(v any, depth int) any {
	switch x := v.(type) {
	case string:
		if len(x) > maxSummaryString {
			return x[:maxSummaryString] + "…"
		}
		return x
	case map[string]any:
		if depth >= maxSummaryDepth {
			return "{…}"
		}
		for k, e := range x {
			if secretName(k) {
				x[k] = "[REDACTED]"
			} else {
				x[k] = summarize(e, depth+1)
			}
		}
		return x
	case []any:
		if depth >= maxSummaryDepth {
			return "[…]"
		}
		if len(x) > maxSummaryItems {
			x = append(x[:maxSummaryItems:maxSummaryItems], "…")
		}
		for i, e := range x {
			x[i] = summarize(e, depth+1)
		}
		return x
	}
	return v
}

// secretWords mark a field name as secret wherever they appear in it.
var secretWords = []string{"password", "passwd", "secret", "token", "credential", "authorization", "cookie", "private"}

// secretName reports whether a field name looks like it holds a secret: it
// contains one of secretWords, ends in "key" (api_key, apiKey, access_key) or
// is "code" (OAuth authorization codes).
func secretName(name string) bool {
	n := strings.ToLower(name)
	if strings.HasSuffix(n, "key") || n == "code" {
		return true
	}
	for _, w := range secretWords {
		if strings.Contains(n, w) {
			return true
		}
	}
	return false
}

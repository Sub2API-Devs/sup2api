package audit

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/url"
	"slices"
	"sort"
	"strings"
	"time"
	"unicode"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/x"
)

// ActionPluginWrite is the audit_logs action of a write served by a plugin's
// admin route (target_type "plugin", target_id the plugin key; CONTRACTS
// §75.2).
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

// purgeInterval is how often PluginWrites.Run deletes expired rows.
const purgeInterval = time.Hour

// PluginWrites records core.PluginWrite rows (core.PluginWriteAuditor) and,
// while Run runs, deletes them after Retention (default
// PluginWriteRetention).
type PluginWrites struct {
	DB        *store.DB
	Locker    core.Locker
	Retention time.Duration
	// CanRun gates the purge (background admission); nil always runs it.
	CanRun func() bool
}

// AuditPluginWrite writes the row; failures are logged, never returned, so
// that the plugin's answer still reaches the caller.
func (p *PluginWrites) AuditPluginWrite(ctx context.Context, w core.PluginWrite) {
	ctx, cancel := context.WithTimeout(WithClientIP(context.WithoutCancel(ctx), w.ClientIP), 5*time.Second)
	defer cancel()
	detail := map[string]any{"method": w.Method, "path": w.Path, "route": w.Route, "status": w.Status, "request_id": w.RequestID}
	if len(w.Body) > 0 {
		detail["body"] = bodySummary(w.Body)
	}
	if err := Audit(ctx, p.DB.Pool, w.UserID, ActionPluginWrite, "plugin", w.Plugin, detail); err != nil {
		slog.WarnContext(ctx, "audit: plugin route write", "plugin", w.Plugin, "err", err)
	}
}

// Run deletes expired rows once per purgeInterval, on the node that wins
// lock audit:plugin-writes (left to expire so other nodes skip the period),
// until ctx ends.
func (p *PluginWrites) Run(ctx context.Context) {
	t := time.NewTimer(time.Minute)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
		t.Reset(purgeInterval)
		if p.CanRun != nil && !p.CanRun() {
			continue
		}
		if _, ok, err := p.Locker.TryLock(ctx, "audit:plugin-writes", purgeInterval-purgeInterval/10); err != nil || !ok {
			continue
		}
		if err := p.Purge(ctx); err != nil {
			slog.WarnContext(ctx, "audit: purge plugin route writes", "err", err)
		}
	}
}

// Purge deletes the rows older than the retention, 10000 at a time. It does
// not take the lock.
func (p *PluginWrites) Purge(ctx context.Context) error {
	retention := p.Retention
	if retention <= 0 {
		retention = PluginWriteRetention
	}
	for {
		tag, err := p.DB.Pool.Exec(ctx, `DELETE FROM audit_logs WHERE id IN (SELECT id FROM audit_logs
			WHERE action = $1 AND created_at < now() - make_interval(secs => $2) ORDER BY id LIMIT 10000)`,
			ActionPluginWrite, retention.Seconds())
		if err != nil || tag.RowsAffected() < 10000 {
			return err
		}
	}
}

// bodySummary is a bounded copy of a JSON request body that is safe to keep:
// values under secret-looking names (and the value of a {name, value} pair
// naming a secret) are replaced with "[REDACTED]", URLs lose their userinfo
// and query (URL fields keep only scheme and host), strings are cut at 200
// bytes, arrays at 20 items and nesting at 4 levels. A summary still over
// 4 KiB keeps only the sorted top-level field names; a body that is not JSON
// only its size.
func bodySummary(body []byte) any {
	var v any
	if json.Unmarshal(body, &v) != nil {
		return map[string]any{"non_json": true, "bytes": len(body)}
	}
	v = summarize(v, "", 0)
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

// summarize bounds v, the value of field name ("" at the top).
func summarize(v any, name string, depth int) any {
	switch t := v.(type) {
	case string:
		return x.TruncateEllipsis(redactURL(name, t), maxSummaryString)
	case map[string]any:
		if depth >= maxSummaryDepth {
			return "{…}"
		}
		// {"name": "Authorization", "value": "Bearer …"} (headers, env lists)
		pairName, _ := t["name"].(string)
		if k, ok := t["key"].(string); ok && pairName == "" {
			pairName = k
		}
		for k, e := range t {
			if secretName(k) || (k == "value" && secretName(pairName)) {
				t[k] = redacted
			} else {
				t[k] = summarize(e, k, depth+1)
			}
		}
		return t
	case []any:
		if depth >= maxSummaryDepth {
			return "[…]"
		}
		if len(t) > maxSummaryItems {
			t = append(t[:maxSummaryItems:maxSummaryItems], "…")
		}
		for i, e := range t {
			t[i] = summarize(e, name, depth+1)
		}
		return t
	}
	return v
}

const redacted = "[REDACTED]"

// secretWords mark a field name as secret wherever they appear in it.
var secretWords = []string{"password", "passwd", "passphrase", "secret", "token", "credential", "authorization",
	"bearer", "cookie", "session", "signature", "private"}

// secretParts mark a field name as secret when they are a whole word of it
// (db_dsn, authHeader, smtp-pass, user.pwd): inside other words they are too
// common (author, compass).
var secretParts = []string{"auth", "pass", "pwd", "dsn", "sig"}

// secretName reports whether a field name looks like it holds a secret: it
// contains one of secretWords or a word of secretParts, ends in "key" or
// "keys" (api_key, apiKeys, access_key) or is "code" (OAuth authorization
// codes).
func secretName(name string) bool {
	n := strings.ToLower(name)
	if strings.HasSuffix(n, "key") || strings.HasSuffix(n, "keys") || n == "code" {
		return true
	}
	for _, w := range secretWords {
		if strings.Contains(n, w) {
			return true
		}
	}
	for _, w := range nameWords(name) {
		if slices.Contains(secretParts, w) {
			return true
		}
	}
	return false
}

// nameWords splits a field name into lower-case words at non-alphanumerics
// and camelCase boundaries (authHeader -> auth, header).
func nameWords(name string) []string {
	var words []string
	var word []rune
	prev := rune(0)
	for _, r := range name {
		switch {
		case !unicode.IsLetter(r) && !unicode.IsDigit(r):
			words, word = appendWord(words, word), nil
		case unicode.IsUpper(r) && unicode.IsLower(prev):
			words, word = appendWord(words, word), []rune{r}
		default:
			word = append(word, r)
		}
		prev = r
	}
	return appendWord(words, word)
}

func appendWord(words []string, word []rune) []string {
	if len(word) == 0 {
		return words
	}
	return append(words, strings.ToLower(string(word)))
}

// urlWords mark a field as holding an address whose path may itself carry a
// secret (webhook and callback URLs): such a URL keeps only scheme and host.
var urlWords = []string{"url", "uri", "webhook", "endpoint", "callback"}

// redactURL drops what in s, when s is an absolute URL, may carry a secret:
// the userinfo and query everywhere, and everything past the host in a field
// named like urlWords.
func redactURL(name, s string) string {
	u, err := url.Parse(s)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return s
	}
	n := strings.ToLower(name)
	if slices.ContainsFunc(urlWords, func(w string) bool { return strings.Contains(n, w) }) {
		return u.Scheme + "://" + u.Host
	}
	u.User, u.RawQuery, u.ForceQuery, u.Fragment, u.RawFragment = nil, "", false, "", ""
	return u.String()
}

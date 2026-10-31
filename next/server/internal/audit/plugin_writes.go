package audit

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/url"
	"regexp"
	"slices"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
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

// Bounds of the background writer.
const (
	defaultWriteQueue = 1024
	writeTimeout      = 5 * time.Second
	// drainTimeout bounds how long Run, when stopped, waits for the rows
	// still queued.
	drainTimeout = 5 * time.Second
)

// PluginWrites records core.PluginWrite rows (core.PluginWriteAuditor) and,
// while Run runs, deletes them after Retention (default
// PluginWriteRetention).
//
// AuditPluginWrite never waits on the database: it summarizes the body and
// hands the row to a bounded queue that one background goroutine writes
// (started on first use). A full queue drops the row, counts it (Dropped)
// and logs; the request is never held up by its audit row (CONTRACTS
// §75.2).
type PluginWrites struct {
	DB        *store.DB
	Locker    core.Locker
	Retention time.Duration
	// CanRun gates the purge (background admission); nil always runs it.
	CanRun func() bool
	// QueueSize bounds the rows waiting to be written (default 1024).
	QueueSize int

	once    sync.Once
	queue   chan pluginWriteRow
	dropped atomic.Int64
}

// pluginWriteRow is a queued row, or (done set) a flush barrier.
type pluginWriteRow struct {
	userID   int64
	plugin   string
	clientIP string
	detail   map[string]any
	done     chan struct{}
}

// Dropped is how many rows were discarded because the queue was full.
func (p *PluginWrites) Dropped() int64 { return p.dropped.Load() }

func (p *PluginWrites) start() {
	p.once.Do(func() {
		n := p.QueueSize
		if n <= 0 {
			n = defaultWriteQueue
		}
		p.queue = make(chan pluginWriteRow, n)
		go p.writeLoop()
	})
}

// AuditPluginWrite queues the row and returns at once; failures and drops
// are logged, never returned, so that the plugin's answer still reaches the
// caller without waiting.
func (p *PluginWrites) AuditPluginWrite(ctx context.Context, w core.PluginWrite) {
	p.start()
	detail := map[string]any{"method": w.Method, "path": w.Path, "route": w.Route, "status": w.Status, "request_id": w.RequestID}
	if len(w.Body) > 0 {
		detail["body"] = bodySummary(w.Body)
	}
	select {
	case p.queue <- pluginWriteRow{userID: w.UserID, plugin: w.Plugin, clientIP: w.ClientIP, detail: detail}:
	default:
		n := p.dropped.Add(1)
		slog.WarnContext(ctx, "audit: plugin route write dropped, queue full", "plugin", w.Plugin,
			"method", w.Method, "path", w.Path, "request_id", w.RequestID, "dropped_total", n)
	}
}

// writeLoop is the one writer: rows are written in queue order, so a
// barrier is reached only after every row queued before it.
func (p *PluginWrites) writeLoop() {
	for r := range p.queue {
		if r.done != nil {
			close(r.done)
			continue
		}
		p.write(r)
	}
}

func (p *PluginWrites) write(r pluginWriteRow) {
	ctx, cancel := context.WithTimeout(WithClientIP(context.Background(), r.clientIP), writeTimeout)
	defer cancel()
	if err := Audit(ctx, p.DB.Pool, r.userID, ActionPluginWrite, "plugin", r.plugin, r.detail); err != nil {
		slog.WarnContext(ctx, "audit: plugin route write", "plugin", r.plugin, "request_id", r.detail["request_id"], "err", err)
	}
}

// Flush waits until every row queued before the call is written (or
// failed), or ctx ends; it reports whether they were.
func (p *PluginWrites) Flush(ctx context.Context) bool {
	p.start()
	done := make(chan struct{})
	select {
	case p.queue <- pluginWriteRow{done: done}:
	case <-ctx.Done():
		return false
	}
	select {
	case <-done:
		return true
	case <-ctx.Done():
		return false
	}
}

// Run deletes expired rows once per purgeInterval, on the node that wins
// lock audit:plugin-writes (left to expire so other nodes skip the period),
// until ctx ends. Then it waits (at most drainTimeout) for the queued rows
// to be written, so a node shutting down keeps its last audit rows.
func (p *PluginWrites) Run(ctx context.Context) {
	defer func() {
		dctx, cancel := context.WithTimeout(context.Background(), drainTimeout)
		defer cancel()
		if !p.Flush(dctx) {
			slog.Warn("audit: plugin route writes still queued at shutdown")
		}
	}()
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
		return x.TruncateEllipsis(redactValue(name, t), maxSummaryString)
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
	"bearer", "cookie", "session", "signature", "private", "jwt", "apikey"}

// secretParts mark a field name as secret when they are a whole word of it
// (db_dsn, authHeader, smtp-pass, user.pwd): inside other words they are too
// common (author, compass).
var secretParts = []string{"auth", "pass", "pwd", "dsn", "sig"}

// keyValueWords follow "key" in names of a key's value (license_key_value,
// signingKeyData).
var keyValueWords = []string{"value", "val", "data", "material"}

// secretName reports whether a field name looks like it holds a secret: it
// contains one of secretWords or a word of secretParts, ends in "key" or
// "keys" (api_key, apiKeys, access_key), has the words "api key" anywhere
// (api_key_v2, API-Key-Primary) or "key value" (license_key_value), or is
// "code" (OAuth authorization codes).
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
	words := nameWords(name)
	for i, w := range words {
		if slices.Contains(secretParts, w) {
			return true
		}
		if w != "key" && w != "keys" {
			continue
		}
		if i > 0 && words[i-1] == "api" || i+1 < len(words) && slices.Contains(keyValueWords, words[i+1]) {
			return true
		}
	}
	return false
}

// nameWords splits a field name into lower-case words at non-alphanumerics,
// camelCase boundaries (authHeader -> auth, header) and the end of an
// acronym (SMTPPass -> smtp, pass).
func nameWords(name string) []string {
	var words []string
	var word []rune
	rs := []rune(name)
	for i, r := range rs {
		var prev, next rune
		if i > 0 {
			prev = rs[i-1]
		}
		if i+1 < len(rs) {
			next = rs[i+1]
		}
		switch {
		case !unicode.IsLetter(r) && !unicode.IsDigit(r):
			words, word = appendWord(words, word), nil
		case unicode.IsUpper(r) && (unicode.IsLower(prev) || unicode.IsUpper(prev) && unicode.IsLower(next)):
			words, word = appendWord(words, word), []rune{r}
		default:
			word = append(word, r)
		}
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

// redactValue is s with whatever looks like a credential masked, whatever
// the field is named: URLs (redactWholeURL, also inside longer text), JWTs,
// "Bearer <token>" and well-known API key formats.
func redactValue(name, s string) string {
	if out, ok := redactWholeURL(name, s); ok {
		return out
	}
	if strings.Contains(s, "://") {
		s = embeddedURLRe.ReplaceAllStringFunc(s, func(u string) string {
			out, _ := redactWholeURL(name, u)
			return out
		})
	}
	s = bearerRe.ReplaceAllString(s, "${1} "+redacted)
	for _, re := range tokenRes {
		s = re.ReplaceAllString(s, redacted)
	}
	return s
}

var (
	embeddedURLRe = regexp.MustCompile(`[A-Za-z][A-Za-z0-9+.\-]*://[^\s"'<>]+`)
	// bearerRe: an Authorization header value, alone or inside text.
	bearerRe = regexp.MustCompile(`(?i)\b(bearer)\s+[A-Za-z0-9\-._~+/]{8,}=*`)
	tokenRes = []*regexp.Regexp{
		// JWT / JWS: three base64url parts, the header a JSON object ("{" is
		// "eyJ" in base64url); an unsigned token has an empty third part.
		regexp.MustCompile(`eyJ[A-Za-z0-9_\-]{6,}\.[A-Za-z0-9_\-]{6,}\.[A-Za-z0-9_\-]*`),
		regexp.MustCompile(`\bsk-[A-Za-z0-9_\-]{16,}`),                      // OpenAI / Anthropic style
		regexp.MustCompile(`\bxox[abposr]-[A-Za-z0-9\-]{10,}`),              // Slack
		regexp.MustCompile(`\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}`), // GitHub
		regexp.MustCompile(`\bAKIA[0-9A-Z]{16}\b`),                          // AWS access key id
		regexp.MustCompile(`\bAIza[0-9A-Za-z_\-]{35}`),                      // Google API key
	}
)

// webhookHosts carry the webhook's secret in its path: URLs to them keep
// only scheme and host, whatever the field is called.
var webhookHosts = []struct{ host, pathPrefix string }{
	{"hooks.slack.com", ""},
	{"discord.com", "/api/webhooks"},
	{"discordapp.com", "/api/webhooks"},
	{"canary.discord.com", "/api/webhooks"},
	{"ptb.discord.com", "/api/webhooks"},
	{"api.telegram.org", "/bot"},
	{"open.feishu.cn", "/open-apis/bot"},
	{"open.larksuite.com", "/open-apis/bot"},
	{"outlook.office.com", "/webhook"},
	{"chat.googleapis.com", "/v1/spaces"},
}

func webhookURL(u *url.URL) bool {
	host := strings.ToLower(u.Hostname())
	for _, h := range webhookHosts {
		if host == h.host && strings.HasPrefix(u.Path, h.pathPrefix) {
			return true
		}
	}
	// Microsoft Teams incoming webhooks: <tenant>.webhook.office.com.
	return strings.HasSuffix(host, ".webhook.office.com")
}

// tokenSegment reports whether a path segment looks like a token rather than
// a name: long, and mixing letters with digits.
func tokenSegment(seg string) bool {
	if len(seg) < 24 {
		return false
	}
	var letters, digits bool
	for _, r := range seg {
		switch {
		case r >= '0' && r <= '9':
			digits = true
		case r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z':
			letters = true
		case r == '-' || r == '_' || r == '.' || r == '~' || r == ':':
		default:
			return false
		}
	}
	return letters && digits
}

// redactWholeURL drops what in s, when s is an absolute URL, may carry a
// secret: the userinfo, query and fragment everywhere; everything past the
// host in a field named like urlWords or for a known webhook host; and any
// path segment that looks like a token. ok is false when s is not an
// absolute URL.
func redactWholeURL(name, s string) (string, bool) {
	u, err := url.Parse(s)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return s, false
	}
	n := strings.ToLower(name)
	if webhookURL(u) || slices.ContainsFunc(urlWords, func(w string) bool { return strings.Contains(n, w) }) {
		return u.Scheme + "://" + u.Host, true
	}
	u.User, u.RawQuery, u.ForceQuery, u.Fragment, u.RawFragment = nil, "", false, "", ""
	segs := strings.Split(u.EscapedPath(), "/")
	changed := false
	for i, seg := range segs {
		if tokenSegment(seg) {
			segs[i], changed = redacted, true
		}
	}
	if changed {
		// Built by hand: url.URL.String would escape the brackets.
		return u.Scheme + "://" + u.Host + strings.Join(segs, "/"), true
	}
	return u.String(), true
}

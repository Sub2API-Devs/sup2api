package gateway

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Rule sources: the core's defaults of the built-in platforms and the
// administrator's rules. Plugins take no part in sticky sessions
// (CONTRACTS §5.6).
const (
	sourceBuiltin = "builtin"
	sourceAdmin   = "admin"

	onFailureFailover = "failover"
	onFailureStick    = "stick"

	rulesTTL             = 30 * time.Second
	rulesErrorTTL        = 3 * time.Second
	stickyRedisTimeout   = 200 * time.Millisecond
	maxStickyValueBytes  = 4 << 10
	stickyStatsKeyPrefix = "sticky:stats:"
)

var defaultKeyIncludes = []string{"group", "model", "rule"}

// sourceRank orders rule sources for same-name shadowing.
func sourceRank(source string) int {
	if source == sourceAdmin {
		return 2
	}
	return 1
}

// stickyRule is one sticky_rules row.
type stickyRule struct {
	ID          int64
	Name        string
	Source      string
	Enabled     bool
	Priority    int
	Match       manifest.StickyMatch
	KeySources  []manifest.StickyKeySource
	ValueRegex  string
	TTLSeconds  int
	KeyIncludes []string
	OnFailure   string
	UpdatedBy   *int64
	UpdatedAt   time.Time

	re *regexp.Regexp
}

func (r *stickyRule) matches(protocol, model, userAgent string) bool {
	m := r.Match
	if !matchList(m.Protocols, protocol) || !anyGlob(m.Models, model) {
		return false
	}
	if len(m.UserAgentContains) == 0 {
		return true
	}
	ua := strings.ToLower(userAgent)
	for _, s := range m.UserAgentContains {
		if s != "" && strings.Contains(ua, strings.ToLower(s)) {
			return true
		}
	}
	return false
}

func (r *stickyRule) includes(dim string) bool {
	inc := r.KeyIncludes
	if len(inc) == 0 {
		inc = defaultKeyIncludes
	}
	for _, d := range inc {
		if d == dim {
			return true
		}
	}
	return false
}

var unsafeKeyChars = regexp.MustCompile(`[^A-Za-z0-9_.\-]`)

// keySegment makes a rule name safe inside Redis keys and SCAN patterns.
func keySegment(name string) string {
	s := unsafeKeyChars.ReplaceAllString(name, "_")
	if s == "stats" {
		s = "stats_"
	}
	return s
}

func stickyStatsKey(rule string) string { return stickyStatsKeyPrefix + keySegment(rule) }

func stickyBindingPattern(rule string) string { return "sticky:" + keySegment(rule) + ":*" }

// stickyKey is sticky:{rule}:{group}:{model}:{sha256(value)}; dimensions not
// listed in keyIncludes are replaced by "_".
func stickyKey(r *stickyRule, groupID int64, model, value string) string {
	rule, group, mdl := "_", "_", "_"
	if r.includes("rule") {
		rule = keySegment(r.Name)
	}
	if r.includes("group") {
		group = itoa(groupID)
	}
	if r.includes("model") && model != "" {
		mdl = model
	}
	sum := sha256.Sum256([]byte(value))
	return "sticky:" + rule + ":" + group + ":" + mdl + ":" + hex.EncodeToString(sum[:])
}

// stickyKeyServes reports whether a binding key of stickyKey's shape could
// route a request of the group and model. The stats hashes (sticky:stats:
// {rule}) have too few segments to match.
func stickyKeyServes(key, group, model string) bool {
	rest, ok := strings.CutPrefix(key, "sticky:")
	if !ok {
		return false
	}
	// The rule segment never contains ':' (keySegment) and the hash is the
	// last segment; the model in between may contain ':'.
	_, rest, ok = strings.Cut(rest, ":")
	if !ok {
		return false
	}
	g, rest, ok := strings.Cut(rest, ":")
	if !ok {
		return false
	}
	end := strings.LastIndexByte(rest, ':')
	if end < 0 {
		return false
	}
	m := rest[:end]
	return (g == group || g == "_") && (m == model || m == "_")
}

// stickyScanCount is the SCAN batch over binding keys.
const stickyScanCount = 500

// scanStickyKeys calls fn with each SCAN batch of the keys matching pattern.
func scanStickyKeys(ctx context.Context, rdb redis.UniversalClient, pattern string, fn func([]string) error) error {
	var cursor uint64
	for {
		keys, next, err := rdb.Scan(ctx, cursor, pattern, stickyScanCount).Result()
		if err != nil {
			return err
		}
		if len(keys) > 0 {
			if err := fn(keys); err != nil {
				return err
			}
		}
		if next == 0 {
			return nil
		}
		cursor = next
	}
}

// ---------------------------------------------------------------- rule cache

type ruleCache struct {
	db *store.DB
	mu sync.Mutex
	// list is served until until; a failed load is cached as no rules for
	// rulesErrorTTL, so a database outage is not queried on every request.
	until time.Time
	list  []*stickyRule
	epoch uint64
	// override replaces the DB in tests.
	override []*stickyRule
}

func newRuleCache(db *store.DB) *ruleCache { return &ruleCache{db: db} }

func (c *ruleCache) invalidate() {
	c.mu.Lock()
	c.epoch++
	c.list, c.until = nil, time.Time{}
	c.mu.Unlock()
}

// get returns the enabled rules in evaluation order. A built-in rule is
// shadowed by an admin rule with the same name.
func (c *ruleCache) get(ctx context.Context) []*stickyRule {
	c.mu.Lock()
	if c.override != nil {
		l := c.override
		c.mu.Unlock()
		return l
	}
	if time.Now().Before(c.until) {
		l := c.list
		c.mu.Unlock()
		return l
	}
	epoch := c.epoch
	c.mu.Unlock()
	if c.db == nil {
		return nil
	}
	var list []*stickyRule
	ttl := rulesTTL
	if all, err := listRules(ctx, c.db.Pool); err != nil {
		if ctx.Err() != nil {
			return nil // this request went away; the database may be fine
		}
		slog.WarnContext(ctx, "gateway: load sticky rules", "err", err)
		ttl = rulesErrorTTL
	} else {
		list = activeRules(all)
	}
	c.mu.Lock()
	if c.epoch == epoch {
		c.list, c.until = list, time.Now().Add(ttl)
	}
	c.mu.Unlock()
	return list
}

func activeRules(all []*stickyRule) []*stickyRule {
	// Among rules with the same name only the highest ranked source is
	// active: admin, then built-in.
	best := map[string]int{}
	for _, r := range all {
		if rk := sourceRank(r.Source); rk > best[r.Name] {
			best[r.Name] = rk
		}
	}
	list := make([]*stickyRule, 0, len(all))
	for _, r := range all {
		if !r.Enabled || sourceRank(r.Source) < best[r.Name] {
			continue
		}
		if r.ValueRegex != "" {
			re, err := regexp.Compile(r.ValueRegex)
			if err != nil {
				slog.Warn("gateway: sticky rule with invalid regex skipped", "rule", r.Name, "err", err)
				continue
			}
			r.re = re
		}
		list = append(list, r)
	}
	return list
}

const ruleColumns = `id, name, source, enabled, priority, match, key_sources,
	value_regex, ttl_seconds, key_includes, on_failure, updated_by, updated_at`

func scanRule(row interface{ Scan(...any) error }) (*stickyRule, error) {
	var r stickyRule
	var match, sources, includes []byte
	if err := row.Scan(&r.ID, &r.Name, &r.Source, &r.Enabled, &r.Priority, &match, &sources,
		&r.ValueRegex, &r.TTLSeconds, &includes, &r.OnFailure, &r.UpdatedBy, &r.UpdatedAt); err != nil {
		return nil, err
	}
	if len(match) > 0 {
		_ = json.Unmarshal(match, &r.Match)
	}
	if len(sources) > 0 {
		_ = json.Unmarshal(sources, &r.KeySources)
	}
	if len(includes) > 0 {
		_ = json.Unmarshal(includes, &r.KeyIncludes)
	}
	return &r, nil
}

func listRules(ctx context.Context, q store.Querier) ([]*stickyRule, error) {
	rows, err := q.Query(ctx, `SELECT `+ruleColumns+` FROM sticky_rules ORDER BY priority, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*stickyRule
	for rows.Next() {
		r, err := scanRule(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// ---------------------------------------------------------------- per-request state

// stickySession is the sticky state of one request.
type stickySession struct {
	rule         *stickyRule
	key          string
	ttl          time.Duration
	bound        int64 // account id bound before this request, 0 = none
	tried        bool  // the bound account was considered
	hit          bool  // the bound account served (or is serving) the request
	keep         bool  // keep bindings of disabled accounts
	policyValue  string
	initialBound int64
}

// resolveSticky finds the first enabled rule that matches the request and
// yields a session value, and reads its binding.
func (c *call) resolveSticky(ctx context.Context) *stickySession {
	g := c.g
	if !c.stickyCfg.Enabled {
		return nil
	}
	if g.d.Redis == nil {
		if c.failurePolicy != nil {
			c.failureState.stickyErr = fmt.Errorf("sticky store unavailable")
		}
		return nil
	}
	r, key := c.stickyMatch(ctx)
	if r == nil {
		return nil
	}
	ttl := r.TTLSeconds
	if ttl <= 0 {
		ttl = c.stickyCfg.DefaultTTLSeconds
	}
	s := &stickySession{rule: r, key: key, ttl: time.Duration(ttl) * time.Second, keep: c.stickyCfg.KeepOnAccountDisabled}
	if c.failurePolicy != nil {
		c.failureState.stickyErr = c.readPolicyBinding(ctx, s)
		return s
	}
	rctx, cancel := context.WithTimeout(ctx, stickyRedisTimeout)
	raw, err := g.d.Redis.Get(rctx, s.key).Result()
	cancel()
	if err == nil {
		s.bound, _ = strconv.ParseInt(raw, 10, 64)
		s.policyValue = raw
		s.initialBound = s.bound
	}
	return s
}

// stickyMatched is a stickyMatch answer and the model and body it was
// derived from.
type stickyMatched struct {
	rule        *stickyRule
	key         string
	model       string
	bodyVersion uint64
}

// stickyMatch returns the first rule that matches the request and yields a
// session value, with the binding key it derives; nil when none does. The
// answer is kept while the model and body stay the same, so the fingerprint
// (before the hooks) and resolveSticky (after them) usually derive it once.
func (c *call) stickyMatch(ctx context.Context) (*stickyRule, string) {
	if m := c.matched; m != nil && m.model == c.model && m.bodyVersion == c.bodyVersion {
		return m.rule, m.key
	}
	c.matched = &stickyMatched{model: c.model, bodyVersion: c.bodyVersion}
	ua := c.c.Request.UserAgent()
	for _, r := range c.g.rules.get(ctx) {
		if !r.matches(c.ep.Protocol, c.model, ua) {
			continue
		}
		if v := c.stickyValue(ctx, r); v != "" {
			c.matched.rule, c.matched.key = r, stickyKey(r, c.principal.Group.ID, c.model, v)
			break
		}
	}
	return c.matched.rule, c.matched.key
}

// sessionFingerprint is RequestMeta.session_fingerprint: the HMAC-SHA-256 of
// the request's sticky key under the installation's fingerprintKey, so
// plugins can tell sessions apart without seeing, or being able to confirm a
// guess of, the client's session value. Empty when no rule yields a session
// value.
func (c *call) sessionFingerprint(ctx context.Context) string {
	_, key := c.stickyMatch(ctx)
	if key == "" {
		return ""
	}
	mac := hmac.New(sha256.New, c.g.fingerprintKey)
	mac.Write([]byte(key))
	return hex.EncodeToString(mac.Sum(nil))
}

func (c *call) stickyValue(ctx context.Context, r *stickyRule) string {
	for _, src := range r.KeySources {
		var v string
		switch src.Type {
		case "body":
			res := gjson.GetBytes(c.body, src.Path)
			switch {
			case res.Type == gjson.String:
				v = res.String()
			case res.Exists() && res.Type != gjson.Null:
				v = res.Raw
			}
		case "header":
			v = c.c.GetHeader(src.Name)
		case "api_key":
			v = itoa(c.principal.KeyID)
		case "user":
			v = itoa(c.principal.UserID)
		}
		v = strings.TrimSpace(v)
		if v != "" && r.re != nil {
			m := r.re.FindStringSubmatch(v)
			switch {
			case m == nil:
				v = ""
			case len(m) > 1 && m[1] != "":
				v = m[1]
			default:
				v = m[0]
			}
		}
		if v != "" {
			return truncateUTF8(v, maxStickyValueBytes)
		}
	}
	return ""
}

// stickyDeleteIfValue deletes a binding only while it still holds the value
// that was read, so a session rebound meanwhile keeps its new binding.
const stickyDeleteIfValue = `if (redis.call('GET',KEYS[1]) or '') == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0`

// dropBinding deletes the session binding unless bindings of disabled
// accounts are kept.
func (c *call) dropBinding(ctx context.Context, s *stickySession) {
	if s == nil || s.keep || c.g.d.Redis == nil {
		return
	}
	rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), stickyRedisTimeout)
	defer cancel()
	deleted, err := c.g.d.Redis.Eval(rctx, stickyDeleteIfValue, []string{s.key}, s.policyValue).Int()
	if err != nil {
		slog.WarnContext(ctx, "gateway: drop sticky binding", "err", err)
	}
	if deleted == 1 {
		s.policyValue = ""
	}
	s.bound = 0
}

// finishSticky updates hit/miss/rebind counters and writes or refreshes
// the binding after a successful request.
func (c *call) finishSticky(ctx context.Context, accountID int64, success bool) {
	s := c.sticky
	if s == nil || c.g.d.Redis == nil {
		return
	}
	c.rec.StickyRule = s.rule.Name
	c.rec.StickyHit = s.hit
	rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 500*time.Millisecond)
	defer cancel()
	pipe := c.g.d.Redis.Pipeline()
	stats := stickyStatsKey(s.rule.Name)
	if s.hit {
		pipe.HIncrBy(rctx, stats, "hits", 1)
	} else {
		pipe.HIncrBy(rctx, stats, "misses", 1)
	}
	if success && accountID > 0 {
		previous := s.bound
		if c.failurePolicy != nil {
			previous = s.initialBound
		}
		if c.failurePolicy == nil {
			pipe.Eval(rctx, `if (redis.call('GET',KEYS[1]) or '') ~= ARGV[1] then return 0 end redis.call('SET',KEYS[1],ARGV[2],'PX',ARGV[3]) return 1`, []string{s.key}, s.policyValue, strconv.FormatInt(accountID, 10), s.ttl.Milliseconds())
		} else if !c.failureState.preserveSticky {
			if err := c.writePolicyBinding(rctx, s, accountID); err != nil {
				slog.InfoContext(ctx, "gateway: sticky success not written", "request_id", c.rid, "err", err)
			}
		}
		if previous != 0 && previous != accountID && !c.failureState.preserveSticky {
			pipe.HIncrBy(rctx, stats, "rebinds", 1)
		}
	}
	if _, err := pipe.Exec(rctx); err != nil {
		slog.WarnContext(ctx, "gateway: update sticky binding", "err", err)
	}
}

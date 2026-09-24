package gateway

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

const (
	sourcePluginDefault = "plugin_default"
	sourceAdmin         = "admin"

	onFailureFailover = "failover"
	onFailureStick    = "stick"

	rulesTTL             = 30 * time.Second
	affinityTimeout      = 200 * time.Millisecond
	stickyRedisTimeout   = 200 * time.Millisecond
	maxStickyValueBytes  = 4 << 10
	stickyStatsKeyPrefix = "sticky:stats:"
)

var defaultKeyIncludes = []string{"group", "model", "rule"}

// stickyRule is one sticky_rules row.
type stickyRule struct {
	ID          int64
	Name        string
	Source      string
	PluginKey   string
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

// ---------------------------------------------------------------- rule cache

type ruleCache struct {
	db   *store.DB
	mu   sync.Mutex
	at   time.Time
	list []*stickyRule
	// override replaces the DB in tests.
	override []*stickyRule
}

func newRuleCache(db *store.DB) *ruleCache { return &ruleCache{db: db} }

func (c *ruleCache) invalidate() {
	c.mu.Lock()
	c.list, c.at = nil, time.Time{}
	c.mu.Unlock()
}

// get returns the enabled rules in evaluation order. A plugin default rule
// is shadowed by an admin rule with the same name.
func (c *ruleCache) get(ctx context.Context) []*stickyRule {
	c.mu.Lock()
	if c.override != nil {
		l := c.override
		c.mu.Unlock()
		return l
	}
	if c.list != nil && time.Since(c.at) < rulesTTL {
		l := c.list
		c.mu.Unlock()
		return l
	}
	c.mu.Unlock()
	if c.db == nil {
		return nil
	}
	all, err := listRules(ctx, c.db.Pool)
	if err != nil {
		slog.WarnContext(ctx, "gateway: load sticky rules", "err", err)
		return nil
	}
	list := activeRules(all)
	c.mu.Lock()
	c.list, c.at = list, time.Now()
	c.mu.Unlock()
	return list
}

func activeRules(all []*stickyRule) []*stickyRule {
	admin := map[string]bool{}
	for _, r := range all {
		if r.Source == sourceAdmin {
			admin[r.Name] = true
		}
	}
	list := make([]*stickyRule, 0, len(all))
	for _, r := range all {
		if !r.Enabled || (r.Source != sourceAdmin && admin[r.Name]) {
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

const ruleColumns = `id, name, source, COALESCE(plugin_key, ''), enabled, priority, match, key_sources,
	value_regex, ttl_seconds, key_includes, on_failure, updated_by, updated_at`

func scanRule(row interface{ Scan(...any) error }) (*stickyRule, error) {
	var r stickyRule
	var match, sources, includes []byte
	if err := row.Scan(&r.ID, &r.Name, &r.Source, &r.PluginKey, &r.Enabled, &r.Priority, &match, &sources,
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
	rule  *stickyRule
	key   string
	ttl   time.Duration
	bound int64 // account id bound before this request, 0 = none
	tried bool  // the bound account was considered
	hit   bool  // the bound account served (or is serving) the request
	keep  bool  // keep bindings of disabled accounts
}

// resolveSticky finds the first enabled rule that matches the request and
// yields a session value, and reads its binding.
func (c *call) resolveSticky(ctx context.Context) *stickySession {
	g := c.g
	if g.d.Redis == nil || !c.stickyCfg.Enabled {
		return nil
	}
	ua := c.c.Request.UserAgent()
	for _, r := range g.rules.get(ctx) {
		if !r.matches(c.ep.Protocol, c.model, ua) {
			continue
		}
		v := c.stickyValue(ctx, r)
		if v == "" {
			continue
		}
		ttl := r.TTLSeconds
		if ttl <= 0 {
			ttl = c.stickyCfg.DefaultTTLSeconds
		}
		s := &stickySession{rule: r, key: stickyKey(r, c.principal.Group.ID, c.model, v),
			ttl: time.Duration(ttl) * time.Second, keep: c.stickyCfg.KeepOnAccountDisabled}
		rctx, cancel := context.WithTimeout(ctx, stickyRedisTimeout)
		raw, err := g.d.Redis.Get(rctx, s.key).Result()
		cancel()
		if err == nil {
			s.bound, _ = strconv.ParseInt(raw, 10, 64)
		}
		return s
	}
	return nil
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
		case "plugin":
			v = c.affinityFromPlugin(ctx, r, src)
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

// affinityFromPlugin asks SchedulerService.ResolveAffinityKey of the rule's
// plugin (or the first platform of the protocol that implements it).
func (c *call) affinityFromPlugin(ctx context.Context, r *stickyRule, src manifest.StickyKeySource) string {
	keys := []string{r.PluginKey}
	if r.PluginKey == "" {
		keys = keys[:0]
		for _, pb := range c.gen.PlatformsForProtocol(c.ep.Protocol) {
			keys = append(keys, pb.Plugin.Key)
		}
	}
	for _, key := range keys {
		sch, ok := c.gen.Scheduler(key)
		if !ok || sch == nil {
			continue
		}
		fields := map[string]string{}
		for _, p := range src.Needs {
			if res := gjson.GetBytes(c.body, p); res.Exists() {
				fields[p] = res.Raw
			}
		}
		headers := map[string]string{}
		if pi, ok := c.gen.Plugin(key); ok && pi.Manifest != nil && pi.Manifest.Platform != nil {
			headers = c.passHeaders(pi.Manifest.Platform.PassHeaders)
		}
		actx, cancel := context.WithTimeout(ctx, affinityTimeout)
		resp, err := sch.ResolveAffinityKey(actx, &pluginv1.ResolveAffinityKeyRequest{
			Meta: c.meta(), RuleName: r.Name, Fields: fields, InboundHeaders: headers})
		cancel()
		if err != nil {
			slog.DebugContext(ctx, "gateway: resolve affinity key", "plugin", key, "rule", r.Name, "err", err)
			return ""
		}
		return resp.GetValue()
	}
	return ""
}

// dropBinding deletes the session binding unless bindings of disabled
// accounts are kept.
func (c *call) dropBinding(ctx context.Context, s *stickySession) {
	if s == nil || s.keep || c.g.d.Redis == nil {
		return
	}
	rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), stickyRedisTimeout)
	defer cancel()
	if err := c.g.d.Redis.Del(rctx, s.key).Err(); err != nil {
		slog.WarnContext(ctx, "gateway: drop sticky binding", "err", err)
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
		pipe.Set(rctx, s.key, strconv.FormatInt(accountID, 10), s.ttl)
		if s.bound != 0 && s.bound != accountID {
			pipe.HIncrBy(rctx, stats, "rebinds", 1)
		}
	}
	if _, err := pipe.Exec(rctx); err != nil {
		slog.WarnContext(ctx, "gateway: update sticky binding", "err", err)
	}
}

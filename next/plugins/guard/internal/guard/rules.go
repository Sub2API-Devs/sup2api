package guard

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Rule kinds.
const (
	KindKeyword = "keyword"
	KindRegex   = "regex"
)

const (
	maxRules      = 500
	maxPatternLen = 1000
	maxNameLen    = 100
)

// Rule is one blocking rule as stored in plg_guard.rules.
type Rule struct {
	ID        int64     `json:"id,omitempty"`
	Name      string    `json:"name"`
	Kind      string    `json:"kind"`
	Pattern   string    `json:"pattern"`
	Enabled   bool      `json:"enabled"`
	UpdatedAt time.Time `json:"updated_at,omitzero"`
}

// compiledRule is a rule ready for matching.
type compiledRule struct {
	Rule
	lower string         // keyword, lower-cased
	re    *regexp.Regexp // regex
}

// match returns the byte offset of the first match or -1.
func (r *compiledRule) match(text, lowerText string) int {
	if r.re != nil {
		if loc := r.re.FindStringIndex(text); loc != nil {
			return loc[0]
		}
		return -1
	}
	return strings.Index(lowerText, r.lower)
}

// ruleSet is an immutable snapshot of the enabled rules.
type ruleSet struct {
	rules []*compiledRule
}

func compile(rules []Rule) (*ruleSet, error) {
	rs := &ruleSet{}
	for _, r := range rules {
		if !r.Enabled {
			continue
		}
		cr := &compiledRule{Rule: r}
		switch r.Kind {
		case KindRegex:
			re, err := regexp.Compile(r.Pattern)
			if err != nil {
				return nil, fmt.Errorf("rule %d: %w", r.ID, err)
			}
			cr.re = re
		default:
			cr.lower = strings.ToLower(r.Pattern)
		}
		rs.rules = append(rs.rules, cr)
	}
	return rs, nil
}

// ruleInput accepts "type" as an alias of "kind" and an optional name.
type ruleInput struct {
	ID      int64  `json:"id,omitempty"`
	Name    string `json:"name"`
	Kind    string `json:"kind"`
	Type    string `json:"type"`
	Pattern string `json:"pattern"`
	Enabled *bool  `json:"enabled"`
}

// validateRules normalizes and validates a PUT /rules payload.
func validateRules(in []ruleInput) ([]Rule, pluginsdk.FieldErrors) {
	var errs pluginsdk.FieldErrors
	if len(in) > maxRules {
		return nil, errs.Add("rules", "too_many", fmt.Sprintf("at most %d rules / 最多 %d 条规则", maxRules, maxRules))
	}
	out := make([]Rule, 0, len(in))
	seen := map[int64]bool{}
	for i, r := range in {
		f := func(name string) string { return fmt.Sprintf("rules[%d].%s", i, name) }
		kind := strings.ToLower(strings.TrimSpace(r.Kind))
		if kind == "" {
			kind = strings.ToLower(strings.TrimSpace(r.Type))
		}
		if kind == "" {
			kind = KindKeyword
		}
		rule := Rule{ID: r.ID, Name: strings.TrimSpace(r.Name), Kind: kind, Pattern: r.Pattern, Enabled: r.Enabled == nil || *r.Enabled}
		if rule.ID < 0 || (rule.ID > 0 && seen[rule.ID]) {
			errs = errs.Add(f("id"), "invalid", "duplicate or invalid id / id 重复或无效")
		}
		seen[rule.ID] = true
		switch kind {
		case KindKeyword:
			rule.Pattern = strings.TrimSpace(rule.Pattern)
		case KindRegex:
			if _, err := regexp.Compile(rule.Pattern); err != nil {
				errs = errs.Add(f("pattern"), "regex", "invalid regular expression: "+err.Error()+" / 正则表达式无效")
			}
		default:
			errs = errs.Add(f("kind"), "enum", "kind must be keyword or regex / 类型必须是 keyword 或 regex")
		}
		if rule.Pattern == "" {
			errs = errs.Add(f("pattern"), "required", "pattern is required / 请填写匹配内容")
		} else if len(rule.Pattern) > maxPatternLen {
			errs = errs.Add(f("pattern"), "too_long", fmt.Sprintf("pattern exceeds %d bytes / 匹配内容超过 %d 字节", maxPatternLen, maxPatternLen))
		}
		if rule.Name == "" {
			rule.Name = truncateRunes(rule.Pattern, 40)
		}
		if utf8.RuneCountInString(rule.Name) > maxNameLen {
			errs = errs.Add(f("name"), "too_long", fmt.Sprintf("name exceeds %d characters / 名称超过 %d 个字符", maxNameLen, maxNameLen))
		}
		out = append(out, rule)
	}
	return out, errs
}

func truncateRunes(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	r := []rune(s)
	return string(r[:n])
}

func (p *Plugin) loadRules(ctx context.Context) ([]Rule, error) {
	db, err := p.db(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `SELECT id, name, kind, pattern, enabled, updated_at FROM rules ORDER BY id`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (Rule, error) {
		var r Rule
		err := row.Scan(&r.ID, &r.Name, &r.Kind, &r.Pattern, &r.Enabled, &r.UpdatedAt)
		return r, err
	})
}

// reloadRules reads the rules table and swaps the matcher snapshot.
func (p *Plugin) reloadRules(ctx context.Context) error {
	rules, err := p.loadRules(ctx)
	if err != nil {
		return err
	}
	rs, err := compile(rules)
	if err != nil {
		return err
	}
	p.rules.Store(rs)
	return nil
}

// getRules serves GET /rules.
func (p *Plugin) getRules(ctx context.Context, _ *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	rules, err := p.loadRules(ctx)
	if err != nil {
		return pluginsdk.ErrorResponse(http.StatusServiceUnavailable, "unavailable", err.Error()), nil
	}
	return pluginsdk.DataResponse(rules), nil
}

// putRules serves PUT /rules: replaces the whole rule set. Body is
// {"rules": [...]} or a bare array. Rules without id are created; existing
// rules missing from the list are deleted.
func (p *Plugin) putRules(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in []ruleInput
	body := strings.TrimSpace(string(req.GetBody()))
	if strings.HasPrefix(body, "[") {
		if err := json.Unmarshal([]byte(body), &in); err != nil {
			return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "invalid JSON body / 请求体不是合法 JSON"), nil
		}
	} else {
		var wrapper struct {
			Rules []ruleInput `json:"rules"`
		}
		if err := json.Unmarshal([]byte(body), &wrapper); err != nil {
			return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "invalid JSON body / 请求体不是合法 JSON"), nil
		}
		in = wrapper.Rules
	}
	rules, errs := validateRules(in)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid rules / 规则无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.ErrorResponse(http.StatusServiceUnavailable, "unavailable", err.Error()), nil
	}
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		keep := make([]int64, 0, len(rules))
		for _, r := range rules {
			if r.ID > 0 {
				keep = append(keep, r.ID)
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM rules WHERE NOT (id = ANY($1))`, keep); err != nil {
			return err
		}
		for _, r := range rules {
			if r.ID > 0 {
				tag, err := tx.Exec(ctx, `UPDATE rules SET name=$2, kind=$3, pattern=$4, enabled=$5, updated_at=now()
					WHERE id=$1 AND (name, kind, pattern, enabled) IS DISTINCT FROM ($2, $3, $4, $5)`,
					r.ID, r.Name, r.Kind, r.Pattern, r.Enabled)
				if err != nil {
					return err
				}
				if tag.RowsAffected() > 0 {
					continue
				}
				var exists bool
				if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM rules WHERE id=$1)`, r.ID).Scan(&exists); err != nil {
					return err
				}
				if exists {
					continue
				}
				// Unknown id (deleted meanwhile): create it as a new rule.
			}
			if _, err := tx.Exec(ctx, `INSERT INTO rules (name, kind, pattern, enabled) VALUES ($1, $2, $3, $4)`,
				r.Name, r.Kind, r.Pattern, r.Enabled); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	// Committed: the other nodes reload now (best effort), this one below.
	p.publishRulesChanged(ctx)
	if err := p.reloadRules(ctx); err != nil {
		return nil, err
	}
	return p.getRules(ctx, req)
}

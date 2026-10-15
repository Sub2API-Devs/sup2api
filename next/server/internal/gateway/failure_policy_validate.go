package gateway

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type policyValidation struct {
	ctx     context.Context
	errors  []core.FieldError
	unified bool
}

func (v *policyValidation) add(field, en, zh string) {
	if core.Locale(v.ctx) == "zh" {
		en = zh
	}
	v.errors = append(v.errors, core.FieldError{Field: field, Code: "invalid", Message: en})
}
func (v *policyValidation) number(field string, n, lo, hi int) {
	if n < lo || n > hi {
		v.add(field, fmt.Sprintf("must be %d-%d", lo, hi), fmt.Sprintf("范围为 %d–%d", lo, hi))
	}
}
func (p *FailurePolicy) validate(ctx context.Context) []core.FieldError {
	v := &policyValidation{ctx: ctx, unified: p.SchemaVersion >= 2}
	if p.SchemaVersion != 1 && p.SchemaVersion != 2 {
		v.add("schema_version", "unsupported policy version", "不支持的策略版本")
	}
	v.number("max_retries", p.MaxRetries, 0, 9)
	if v.unified {
		v.number("retries_per_account", p.RetriesPerAccount, 0, 9)
		v.egress("egress", &p.Egress)
	}
	v.number("backoff_ms", p.BackoffMS, 0, 30000)
	v.number("max_wait_ms", p.MaxWaitMS, 0, 120000)
	v.rules("retry_rules", &p.RetryRules, false)
	v.rules("account_rules", &p.AccountRules, true)
	return v.errors
}
func (v *policyValidation) rules(name string, rules *[]FailureRule, account bool) {
	if *rules == nil {
		*rules = []FailureRule{}
	}
	if len(*rules) > 100 {
		v.add(name, "at most 100 rules", "最多 100 条规则")
		return
	}
	ids := map[string]bool{}
	for i := range *rules {
		r := &(*rules)[i]
		base := fmt.Sprintf("%s.%d.", name, i)
		if r.ID == "" || len(r.ID) > 80 || ids[r.ID] {
			v.add(base+"id", "rule ID must be unique and 1-80 bytes", "规则 ID 必须唯一且为 1–80 字节")
		}
		ids[r.ID] = true
		if strings.TrimSpace(r.Name) == "" || utf8.RuneCountInString(r.Name) > 100 {
			v.add(base+"name", "name must be 1-100 characters", "名称为 1–100 个字符")
		}
		v.match(base+"match", &r.Match)
		if account {
			v.accountAction(base, r)
		} else {
			v.requestAction(base, r)
		}
	}
}
func (v *policyValidation) match(base string, m *FailureMatch) {
	if !slices.Contains([]string{"upstream", "transport", "core"}, m.Source) {
		v.add(base+".source", "select an error source", "请选择错误来源")
	}
	if m.Mode == "" {
		m.Mode = "all"
	}
	if m.Mode != "all" && m.Mode != "any" {
		v.add(base+".mode", "select AND or OR", "请选择 AND 或 OR")
	}
	rs, err := parseStatusRanges(m.StatusCodes)
	if err != nil {
		v.add(base+".status_codes", "invalid HTTP status ranges", "HTTP 状态码或区间无效")
	}
	for _, r := range rs {
		if r.lo < 400 {
			v.add(base+".status_codes", "only HTTP errors 400-599", "仅支持 HTTP 错误 400–599")
			break
		}
	}
	m.ranges, m.StatusCodes = rs, formatStatusRanges(rs)
	m.Keywords = normalizeKeywords(m.Keywords)
	if len(m.Keywords) > 100 {
		v.add(base+".keywords", "at most 100 keywords", "最多 100 个关键词")
	}
	for _, k := range m.Keywords {
		if utf8.RuneCountInString(k) > 200 {
			v.add(base+".keywords", "keyword exceeds 200 characters", "关键词不能超过 200 字符")
			break
		}
	}
	if len(rs) == 0 && len(m.Keywords) == 0 && m.Source != "transport" {
		v.add(base, "enter status codes or keywords", "请填写状态码或关键词")
	}
	if m.Source == "transport" && len(rs) != 0 {
		v.add(base+".status_codes", "transport errors have no HTTP status", "传输错误没有 HTTP 状态码")
	}
	v.scope(base, m)
}
func (v *policyValidation) scope(base string, m *FailureMatch) {
	if len(m.Groups) > 100 || len(m.Models) > 100 || len(m.Protocols) > 100 {
		v.add(base, "at most 100 values per scope", "每个范围最多 100 项")
	}
	for _, id := range m.Groups {
		if id <= 0 {
			v.add(base+".groups", "group IDs must be positive", "分组 ID 必须为正数")
			break
		}
	}
	for _, value := range append(append([]string{}, m.Models...), m.Protocols...) {
		if strings.TrimSpace(value) == "" || len(value) > 200 {
			v.add(base, "scope values must be 1-200 bytes", "范围值为 1–200 字节")
			break
		}
	}
}
func (v *policyValidation) accountAction(base string, r *FailureRule) {
	if !slices.Contains([]string{"none", "cooldown", "disable"}, r.Action) {
		v.add(base+"action", "invalid account action", "无效的账号动作")
	}
	if r.Action == "cooldown" {
		v.number(base+"cooldown_seconds", r.CooldownSeconds, 1, 86400)
	}
}
func (v *policyValidation) requestAction(base string, r *FailureRule) {
	if v.unified {
		if r.Action != failureReturn && r.Action != failureRetry {
			v.add(base+"action", "select return or retry with the shared plan", "请选择直接返回或按统一计划重试")
		}
		return
	}
	if !slices.Contains([]string{failureReturn, failureRetry, failureSwitch, failureReset}, r.Action) {
		v.add(base+"action", "invalid request action", "无效的请求动作")
	}
	if r.Action == failureRetry {
		v.number(base+"same_account_retries", r.SameAccountRetries, 1, 9)
		if !slices.Contains([]string{failureReturn, failureSwitch, failureReset}, r.ExhaustedAction) {
			v.add(base+"exhausted_action", "select action after retry limit", "请选择原账号重试耗尽后的动作")
		}
	}
	v.egress(base+"egress", &r.Egress)
}

func (v *policyValidation) egress(field string, value *string) {
	if *value == "" {
		*value = "same_proxy"
	}
	if !slices.Contains([]string{"same_proxy", "proxy_only", "account_configured"}, *value) {
		v.add(field, "invalid egress constraint", "无效的出口约束")
	}
}

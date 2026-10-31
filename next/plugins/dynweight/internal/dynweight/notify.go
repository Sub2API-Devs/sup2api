package dynweight

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

// notifyDedupeSeconds: a turning point is notified once even if a retried
// evaluation reports it again.
const notifyDedupeSeconds = 3600

// messages are the notification texts by language.
var messages = map[string]struct {
	kinds                                           map[string]string
	subject, account, group, rules, window, noRules string
}{
	"zh": {
		kinds: map[string]string{rules.EventWeightDown: "权重下调", rules.EventWeightUpStart: "开始回升",
			rules.EventWeightRestored: "已恢复到基准", rules.EventWeightRevived: "从 0 复活"},
		subject: "动态权重：账号 %s %s %s → %s", account: "账号：%s (#%d)", group: "分组：#%d    模型：%s",
		rules: "触发规则：%s", noRules: "无", window: "评估窗口：%s 起，%d 次尝试，%d 次失败（向前累积 %d 个窗口）",
	},
	"en": {
		kinds: map[string]string{rules.EventWeightDown: "weight degraded", rules.EventWeightUpStart: "weight climbing",
			rules.EventWeightRestored: "weight restored to the base", rules.EventWeightRevived: "weight revived from 0"},
		subject: "Dynamic weight: account %s %s %s → %s", account: "Account: %s (#%d)", group: "Group: #%d    Model: %s",
		rules: "Rules fired: %s", noRules: "none", window: "Window: from %s, %d attempts, %d failed (%d windows looked back over)",
	},
}

// notify sends a turning point of a key's weight on the configured channel.
// The core queues, deduplicates and rate limits; a failure is only logged.
func (p *Plugin) notify(ctx context.Context, cfg *compiledConfig, k key, b base, ev rules.Event) {
	n := cfg.Notify
	if !n.Enabled {
		return
	}
	m := messages[n.Language]
	name := b.Name
	if name == "" {
		name = fmt.Sprintf("#%d", k.AccountID)
	}
	body := []string{fmt.Sprintf(m.account, name, k.AccountID), fmt.Sprintf(m.group, k.GroupID, k.Model)}
	fired := m.noRules
	if len(ev.Rules) > 0 {
		fired = strings.Join(ev.Rules, ", ")
	}
	body = append(body, fmt.Sprintf(m.rules, fired))
	var window int64
	if w := ev.Window; w != nil {
		window = w.Start
		start := time.Unix(w.Start, 0).UTC().Format(time.RFC3339)
		body = append(body, fmt.Sprintf(m.window, start, w.Total, w.Fail, w.LookbackWindows))
	}
	severity := protocol.SeverityInfo
	switch {
	case ev.Kind == rules.EventWeightDown && rules.IsZero(ev.To):
		severity = protocol.SeverityCritical
	case ev.Kind == rules.EventWeightDown:
		severity = protocol.SeverityWarning
	}
	dedupe := sha1.Sum(fmt.Appendf(nil, "%d|%d|%s|%s|%d", k.AccountID, k.GroupID, k.Model, ev.Kind, window))
	_, err := pluginsdk.Notify(ctx, p.host, &pluginv1.NotifyRequest{Channel: n.Channel, Recipients: n.Recipients,
		Subject:   fmt.Sprintf(m.subject, name, m.kinds[ev.Kind], formatWeight(ev.From), formatWeight(ev.To)),
		Body:      strings.Join(body, "\n"),
		Severity:  severity,
		DedupeKey: hex.EncodeToString(dedupe[:]), DedupeSeconds: notifyDedupeSeconds})
	if err != nil {
		p.log.Warn("dynweight: notification failed", "account_id", k.AccountID, "kind", ev.Kind, "error", err.Error())
	}
}

func formatWeight(w float64) string { return fmt.Sprint(effectiveWeight(w)) }

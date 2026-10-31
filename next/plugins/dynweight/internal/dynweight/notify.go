package dynweight

import (
	"cmp"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"slices"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

const (
	// notifyDedupeSeconds: a digest is notified once even if a retried
	// evaluation reports the same turning points again.
	notifyDedupeSeconds = 3600
	// maxDigestItems bounds the turning points listed in one digest; the
	// rest are counted.
	maxDigestItems = 50
)

// notice is a turning point of a key's weight, waiting for its run's digest.
type notice struct {
	k    key
	name string // the account's name, may be empty
	ev   rules.Event
}

// severities are the notification levels, indexed by severity.
var severities = [...]string{protocol.SeverityInfo, protocol.SeverityWarning, protocol.SeverityCritical}

// severity grades a turning point: a degrade to 0 is critical, any other
// degrade a warning, the rest info.
func (n notice) severity() int {
	switch {
	case n.ev.Kind == rules.EventWeightDown && rules.IsZero(n.ev.To):
		return 2
	case n.ev.Kind == rules.EventWeightDown:
		return 1
	}
	return 0
}

// notifyText is the notification text of one language.
type notifyText struct {
	kinds                                                        map[string]string
	subject, digest, change, group, rules, window, noRules, more string
}

var messages = map[string]notifyText{
	"zh": {
		kinds: map[string]string{rules.EventWeightDown: "权重下调", rules.EventWeightUpStart: "开始回升",
			rules.EventWeightRestored: "已恢复到基准", rules.EventWeightRevived: "从 0 复活"},
		subject: "动态权重：%s", digest: "动态权重：%d 处权重变化", change: "账号 %s：%s %s → %s",
		group: "分组：#%d    模型：%s", rules: "触发规则：%s", noRules: "无",
		window: "评估窗口：%s 起，%d 次尝试，%d 次失败（向前累积 %d 个窗口）", more: "另有 %d 处变化未列出",
	},
	"en": {
		kinds: map[string]string{rules.EventWeightDown: "weight degraded", rules.EventWeightUpStart: "weight climbing",
			rules.EventWeightRestored: "weight restored to the base", rules.EventWeightRevived: "weight revived from 0"},
		subject: "Dynamic weight: %s", digest: "Dynamic weight: %d weight changes", change: "Account %s: %s %s → %s",
		group: "Group: #%d    Model: %s", rules: "Rules fired: %s", noRules: "none",
		window: "Window: from %s, %d attempts, %d failed (%d windows looked back over)", more: "and %d more",
	},
}

// headline is the one-line summary of a turning point.
func (m notifyText) headline(n notice) string {
	account := fmt.Sprintf("#%d", n.k.AccountID)
	if n.name != "" {
		account = fmt.Sprintf("%s (#%d)", n.name, n.k.AccountID)
	}
	return fmt.Sprintf(m.change, account, m.kinds[n.ev.Kind], formatWeight(n.ev.From), formatWeight(n.ev.To))
}

// detail is a turning point's headline and its evidence.
func (m notifyText) detail(n notice) string {
	fired := m.noRules
	if len(n.ev.Rules) > 0 {
		fired = strings.Join(n.ev.Rules, ", ")
	}
	lines := []string{m.headline(n), fmt.Sprintf(m.group, n.k.GroupID, n.k.Model), fmt.Sprintf(m.rules, fired)}
	if w := n.ev.Window; w != nil {
		start := time.Unix(w.Start, 0).UTC().Format(time.RFC3339)
		lines = append(lines, fmt.Sprintf(m.window, start, w.Total, w.Fail, w.LookbackWindows))
	}
	return strings.Join(lines, "\n")
}

// notify sends the turning points of one evaluation run as one digest, the
// worst first: the core rate limits each source (20 per 5 minutes), so one
// notification per key would lose most of a mass degrade. The core queues
// and deduplicates; a failure is only logged.
func (p *Plugin) notify(ctx context.Context, cfg *compiledConfig, notices []notice) {
	n := cfg.Notify
	if !n.Enabled || len(notices) == 0 {
		return
	}
	slices.SortFunc(notices, func(a, b notice) int {
		return cmp.Or(cmp.Compare(b.severity(), a.severity()), compareKeys(a.k, b.k), cmp.Compare(a.ev.Kind, b.ev.Kind))
	})
	m := messages[n.Language]
	dedupe := sha1.New()
	blocks := make([]string, 0, min(len(notices), maxDigestItems)+1)
	for i, nt := range notices {
		var window int64
		if nt.ev.Window != nil {
			window = nt.ev.Window.Start
		}
		fmt.Fprintf(dedupe, "%d|%d|%s|%s|%d\n", nt.k.AccountID, nt.k.GroupID, nt.k.Model, nt.ev.Kind, window)
		if i < maxDigestItems {
			blocks = append(blocks, m.detail(nt))
		}
	}
	if more := len(notices) - maxDigestItems; more > 0 {
		blocks = append(blocks, fmt.Sprintf(m.more, more))
	}
	subject := fmt.Sprintf(m.digest, len(notices))
	if len(notices) == 1 {
		subject = fmt.Sprintf(m.subject, m.headline(notices[0]))
	}
	_, err := pluginsdk.Notify(ctx, p.host, &pluginv1.NotifyRequest{Channel: n.Channel, Recipients: n.Recipients,
		Subject: subject, Body: strings.Join(blocks, "\n\n"), Severity: severities[notices[0].severity()],
		DedupeKey: hex.EncodeToString(dedupe.Sum(nil)), DedupeSeconds: notifyDedupeSeconds})
	if err != nil {
		p.log.Warn("dynweight: notification failed", "turning_points", len(notices), "error", err.Error())
	}
}

func formatWeight(w float64) string { return fmt.Sprint(effectiveWeight(w)) }

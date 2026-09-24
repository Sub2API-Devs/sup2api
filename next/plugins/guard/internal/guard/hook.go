package guard

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// DenyCode is returned to clients when a rule blocks a request.
const DenyCode = "guard_blocked"

const snippetRadius = 60

// blockEvent is one blocked request, persisted asynchronously.
type blockEvent struct {
	At        time.Time
	RuleID    int64
	RuleName  string
	RequestID string
	UserID    int64
	GroupID   int64
	Model     string
	Snippet   string
}

// alert is one webhook notification.
type alert struct {
	URL   string
	Event blockEvent
}

// fieldString decodes a hook field: JSON string when possible, raw otherwise.
func fieldString(raw string) string {
	if strings.HasPrefix(raw, `"`) {
		var s string
		if json.Unmarshal([]byte(raw), &s) == nil {
			return s
		}
	}
	return raw
}

// snippetAround returns up to snippetRadius bytes around offset, on rune
// boundaries.
func snippetAround(text string, offset, length int) string {
	start := offset - snippetRadius
	if start < 0 {
		start = 0
	}
	end := offset + length + snippetRadius
	if end > len(text) {
		end = len(text)
	}
	for start > 0 && !isRuneStart(text[start]) {
		start--
	}
	for end < len(text) && !isRuneStart(text[end]) {
		end++
	}
	return text[start:end]
}

func isRuneStart(b byte) bool { return b&0xC0 != 0x80 }

// OnGatewayRequest implements pluginsdk.Hook.
func (p *Plugin) OnGatewayRequest(_ context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
	p.stats.checked.Add(1)
	text := fieldString(in.GetFields()["prompt_text"])
	allow := &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW}
	if text == "" {
		return allow, nil
	}
	lower := strings.ToLower(text)
	for _, r := range p.rules.Load().rules {
		off := r.match(text, lower)
		if off < 0 {
			continue
		}
		p.stats.blocked.Add(1)
		meta := in.GetMeta()
		model := fieldString(in.GetFields()["model"])
		if model == "" {
			model = meta.GetModel()
		}
		ev := blockEvent{
			At: p.now().UTC(), RuleID: r.ID, RuleName: r.Name, RequestID: meta.GetRequestId(),
			UserID: meta.GetUserId(), GroupID: meta.GetGroupId(), Model: model,
		}
		settings := p.settings.Load()
		if settings.RecordSnippets {
			ev.Snippet = snippetAround(text, off, len(r.Pattern))
		}
		select {
		case p.blocks <- ev:
		default:
			p.stats.droppedBlocks.Add(1)
		}
		if settings.WebhookURL != "" {
			select {
			case p.alerts <- alert{URL: settings.WebhookURL, Event: ev}:
			default:
				p.stats.droppedAlerts.Add(1)
			}
		}
		return &pluginv1.GatewayRequestHookResponse{
			Decision:    pluginv1.GatewayRequestHookResponse_DECISION_DENY,
			DenyStatus:  http.StatusForbidden,
			DenyCode:    DenyCode,
			DenyMessage: fmt.Sprintf("Request blocked by guard rule %q / 请求被拦截规则「%s」拒绝", r.Name, r.Name),
			Note:        fmt.Sprintf("guard: rule %d (%s)", r.ID, truncateRunes(r.Name, 60)),
		}, nil
	}
	return allow, nil
}

// blockWriter persists block events in batches: block_log rows plus the
// blocked counter of stats_minutely.
func (p *Plugin) blockWriter(ctx context.Context) {
	defer p.wg.Done()
	const maxBatch = 200
	t := time.NewTicker(time.Second)
	defer t.Stop()
	var batch []blockEvent
	flush := func() {
		if len(batch) == 0 {
			return
		}
		fctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
		defer cancel()
		if err := p.writeBlocks(fctx, batch); err != nil {
			p.stats.droppedBlocks.Add(int64(len(batch)))
			p.log.Warn("guard: write block log failed", "error", err.Error(), "events", len(batch))
		}
		batch = batch[:0]
	}
	for {
		select {
		case <-ctx.Done():
			// Drain what is already queued, then stop.
			for {
				select {
				case ev := <-p.blocks:
					batch = append(batch, ev)
					if len(batch) >= maxBatch {
						flush()
					}
				default:
					flush()
					return
				}
			}
		case ev := <-p.blocks:
			batch = append(batch, ev)
			if len(batch) >= maxBatch {
				flush()
			}
		case <-t.C:
			flush()
		}
	}
}

func (p *Plugin) writeBlocks(ctx context.Context, evs []blockEvent) error {
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	return pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		b := &pgx.Batch{}
		for _, ev := range evs {
			var snippet *string
			if ev.Snippet != "" {
				snippet = &ev.Snippet
			}
			b.Queue(`INSERT INTO block_log (occurred_at, rule_id, rule_name, request_id, user_id, group_id, model, snippet)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				ev.At, ev.RuleID, ev.RuleName, ev.RequestID, ev.UserID, ev.GroupID, ev.Model, snippet)
			b.Queue(`INSERT INTO stats_minutely (minute, group_id, model, requests, blocked)
				VALUES (date_trunc('minute', $1::timestamptz), $2, $3, 0, 1)
				ON CONFLICT (minute, group_id, model) DO UPDATE SET blocked = stats_minutely.blocked + 1`,
				ev.At, ev.GroupID, ev.Model)
		}
		return tx.SendBatch(ctx, b).Close()
	})
}

// alertSender posts webhook alerts with plain http.Post semantics (the
// default transport goes through the egress tunnel in strict mode).
func (p *Plugin) alertSender(ctx context.Context) {
	defer p.wg.Done()
	client := &http.Client{Timeout: 5 * time.Second}
	for {
		select {
		case <-ctx.Done():
			return
		case a := <-p.alerts:
			body, _ := json.Marshal(map[string]any{
				"plugin":     "guard",
				"event":      "request.blocked",
				"rule_id":    a.Event.RuleID,
				"rule_name":  a.Event.RuleName,
				"request_id": a.Event.RequestID,
				"user_id":    a.Event.UserID,
				"group_id":   a.Event.GroupID,
				"model":      a.Event.Model,
				"snippet":    a.Event.Snippet,
				"at":         a.Event.At.Format(time.RFC3339),
			})
			resp, err := client.Post(a.URL, "application/json", bytes.NewReader(body))
			if err != nil {
				p.stats.alertErrors.Add(1)
				p.log.Warn("guard: webhook failed", "error", err.Error())
				continue
			}
			_ = resp.Body.Close()
			if resp.StatusCode >= 300 {
				p.stats.alertErrors.Add(1)
				p.log.Warn("guard: webhook rejected", "status", resp.StatusCode)
			}
		}
	}
}

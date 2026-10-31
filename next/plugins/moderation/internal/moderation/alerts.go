package moderation

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Alerts and notifications (CONTRACTS §72.14.5): JSON webhooks to
// notify_webhook_url, sent the way guard's alertSender does (plain POST on
// the default transport, 5 s timeout, failures only logged). They never
// carry user text.

// JobAlerts is the job id declared in manifest.json.
const JobAlerts = "alerts"

const (
	EventFlowErrorRate   = "moderation.flow_error_rate"
	EventWatchAutoChange = "moderation.watch_auto_change"
)

// alertKVNamespace keeps which flows were above the threshold at the last
// check: jobs run on one node at a time, but not always the same one.
const alertKVNamespace = "alerts"

// notify posts one event in the background; nothing is sent without a URL.
func (p *Plugin) notify(event string, fields map[string]any) {
	url := p.cfg.Load().NotifyWebhookURL
	if url == "" {
		return
	}
	body := map[string]any{"plugin": "moderation", "event": event, "at": p.now().UTC().Format(time.RFC3339)}
	for k, v := range fields {
		body[k] = v
	}
	raw, _ := json.Marshal(body)
	p.wg.Add(1)
	go func() {
		defer p.wg.Done()
		ctx, cancel := context.WithTimeout(p.bg, 5*time.Second)
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(raw))
		if err != nil {
			return
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := p.httpClient.Do(req)
		if err != nil {
			p.log.Warn("moderation: webhook failed", "event", event, "error", err.Error())
			return
		}
		_ = resp.Body.Close()
		if resp.StatusCode >= 300 {
			p.log.Warn("moderation: webhook rejected", "event", event, "status", resp.StatusCode)
		}
	}()
}

// notifyAutoChange tells administrators about a watch list change made by
// the AI analysis (no summary: it may quote the user).
func (p *Plugin) notifyAutoChange(uid int64, action, from, to string, a *Analysis, analysisID int64) {
	p.notify(EventWatchAutoChange, map[string]any{"user_id": uid, "action": action, "from_level": from, "to_level": to,
		"trend": a.Trend, "suggestion": a.Suggestion, "analysis_id": analysisID})
}

// runAlertsJob checks every flow's last-hour error rate and alerts once when
// one crosses error_rate_alert_percent.
func (p *Plugin) runAlertsJob(ctx context.Context) (*pluginv1.RunJobResponse, error) {
	c := p.cfg.Load()
	db, err := p.db(ctx)
	if err != nil {
		return nil, err
	}
	p.flushStats(ctx)
	now := p.now().UTC()
	rows, err := queryStatRows(ctx, db, statsFilter{from: lastHour(now), to: now, group: -1})
	if err != nil {
		return nil, err
	}
	flows := map[int64]*counters{}
	for i := range rows {
		if rows[i].kind() == kindFlow {
			mergeInto(flows, rows[i].flow, &rows[i].c)
		}
	}
	names, err := flowNames(ctx, db)
	if err != nil {
		return nil, err
	}
	sent := 0
	for id := range names {
		key := "flow:" + strconv.FormatInt(id, 10)
		f := flows[id]
		over := f != nil && flagged(f.errors, f.audited, c.ErrorRateAlertPercent)
		_, was, err := p.host.KV().Get(ctx, alertKVNamespace, key)
		if err != nil {
			return nil, err
		}
		switch {
		case over && !was:
			if err := p.host.KV().Set(ctx, alertKVNamespace, key, []byte{1}, 7*24*time.Hour); err != nil {
				return nil, err
			}
			p.notify(EventFlowErrorRate, map[string]any{"flow_id": id, "flow_name": names[id], "errors": f.errors, "audited": f.audited,
				"error_rate": ratio(f.errors, f.audited), "threshold_percent": c.ErrorRateAlertPercent,
				"note": "审核异常时请求会直接放行 / requests pass when moderation errors"})
			sent++
		case !over && was:
			if err := p.host.KV().Delete(ctx, alertKVNamespace, key); err != nil {
				return nil, err
			}
		}
	}
	return &pluginv1.RunJobResponse{Message: fmt.Sprintf("%d flow alerts", sent)}, nil
}

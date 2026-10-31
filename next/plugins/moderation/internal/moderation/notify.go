package moderation

import (
	"bytes"
	"cmp"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Notifications (CONTRACTS §72.14, new-api escalate.go notifyAutoChange and
// stats.go alertErrorRate). The core's Notify (CONTRACTS §73.4) sends to a
// channel and explicit recipients, not to the administrators holding a
// permission, so the plugin still posts signed JSON to notify_webhook_url like
// the guard plugin's alerts; moving to Notify waits on the owner's decision.
// A notice never carries moderated text or an analysis summary (it may quote
// the user).

// JobAlerts is the job id declared in manifest.json.
const JobAlerts = "alerts"

// Notice events.
const (
	NoticeFlowErrorRate = "flow.error_rate"
	NoticeWatchChanged  = "watch.auto_changed"
)

// notice is one webhook body.
type notice struct {
	Plugin string         `json:"plugin"`
	Event  string         `json:"event"`
	At     time.Time      `json:"at"`
	Title  string         `json:"title"`
	Text   string         `json:"text"`
	Data   map[string]any `json:"data"`
}

// notify queues a notice for the sender; dropped when no webhook is set or
// the queue is full.
func (p *Plugin) notify(event, title, text string, data map[string]any) {
	if p.cfg.Load().NotifyWebhookURL == "" {
		return
	}
	n := notice{Plugin: "moderation", Event: event, At: p.now().UTC(), Title: title, Text: text, Data: data}
	select {
	case p.notices <- n:
	default:
		p.stats.droppedNotices.Add(1)
	}
}

// noticeSender posts the queued notices. http.DefaultTransport is what the
// SDK routes through the egress tunnel in strict mode.
func (p *Plugin) noticeSender(ctx context.Context) {
	defer p.wg.Done()
	client := &http.Client{Timeout: 10 * time.Second}
	for {
		select {
		case <-ctx.Done():
			return
		case n := <-p.notices:
			c := p.cfg.Load()
			if c.NotifyWebhookURL == "" {
				continue
			}
			if err := postNotice(ctx, client, c.NotifyWebhookURL, c.NotifyWebhookSecret, n); err != nil {
				p.stats.noticeErrors.Add(1)
				p.log.Warn("moderation: notification webhook failed", "event", n.Event, "error", err.Error())
			}
		}
	}
}

func postNotice(ctx context.Context, client *http.Client, url, secret string, n notice) error {
	body, err := json.Marshal(n)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if secret != "" {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write(body)
		req.Header.Set("X-Signature", "sha256="+hex.EncodeToString(mac.Sum(nil)))
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	_ = resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("webhook answered %d", resp.StatusCode)
	}
	return nil
}

// notifyWatchChange tells administrators about a watch list change the AI
// analysis made (auto_upgrade, auto_downgrade, auto_remove).
// The user's name comes from the core when it can tell (users.read).
func (p *Plugin) notifyWatchChange(uid int64, action, from, to, trend, suggestion string, analysisID int64) {
	if p.cfg.Load().NotifyWebhookURL == "" {
		return
	}
	ctx, cancel := context.WithTimeout(p.bg, 3*time.Second)
	users, _, _ := p.lookupUsers(ctx, []int64{uid})
	cancel()
	name, who := "", fmt.Sprintf("#%d", uid)
	if len(users) > 0 {
		name = cmp.Or(users[0].GetDisplayName(), users[0].GetEmail())
		who = name + " " + who
	}
	levelName := map[string]string{LevelObserve: "观察 observe", LevelEnforce: "拦截 enforce", "": "移出名单 removed"}
	title := fmt.Sprintf("提示词审核：AI 分析自动调整了用户 %s 的观察级别 / Moderation: AI analysis changed the watch level of user %s", who, who)
	text := fmt.Sprintf("用户 %s：%s → %s（趋势 %s，建议 %s）。详情见提示词审核 → 观察名单。\nUser %s: %s → %s (trend %s, suggestion %s). See Moderation → Watch list.",
		who, levelName[from], levelName[to], trend, suggestion, who, levelName[from], levelName[to], trend, suggestion)
	p.notify(NoticeWatchChanged, title, text, map[string]any{
		"user_id": uid, "user_name": name, "action": action, "from_level": from, "to_level": to, "trend": trend, "suggestion": suggestion,
		"analysis_id": analysisID, "path": "/p/moderation/dashboard?tab=watch&user_id=" + strconv.FormatInt(uid, 10),
	})
}

// ---------------------------------------------------------------- error rate alerts

// alertKey remembers in KV that a flow is above the threshold, so a notice
// goes out only on the way up whichever node runs the job.
func alertKey(flow int64) string { return "alert:flow:" + strconv.FormatInt(flow, 10) }

// runAlertsJob checks the last-hour error rate of every flow (jobs run on
// one node per tick).
func (p *Plugin) runAlertsJob(ctx context.Context) (*pluginv1.RunJobResponse, error) {
	c := p.cfg.Load()
	if !c.enabled {
		return &pluginv1.RunJobResponse{Message: "moderation is off"}, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	now := p.now().UTC()
	rows, err := p.loadStats(ctx, db, statFilter{from: now.Truncate(time.Hour).Add(-time.Hour), to: now.Add(time.Hour)})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "alerts: %v", err)
	}
	flows, _ := flowCounters(rows, time.Time{})
	names, err := p.flowNames(ctx, db)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "alerts: %v", err)
	}
	sent := 0
	for id, fc := range flows {
		over := flagged(fc.errors, fc.audited, c.ErrorRateAlertPercent)
		was, err := p.alerted(ctx, id)
		if err != nil {
			// KV unavailable: better no notice than one per minute.
			p.log.Warn("moderation: alert state unavailable", "flow_id", id, "error", err.Error())
			continue
		}
		if over && !was {
			p.notifyFlowAlert(id, names[id], fc.errors, fc.audited, c.ErrorRateAlertPercent)
			sent++
		}
		if over || was { // refreshed while over: one notice per episode
			p.setAlerted(ctx, id, over)
		}
	}
	return &pluginv1.RunJobResponse{Message: fmt.Sprintf("checked %d flows, %d alerts", len(flows), sent)}, nil
}

func (p *Plugin) alerted(ctx context.Context, flow int64) (bool, error) {
	_, found, err := p.host.KV().Get(ctx, kvNamespace, alertKey(flow))
	if err != nil {
		p.stats.kvErrors.Add(1)
	}
	return found, err
}

// setAlerted stores the state for two hours, refreshed every tick while the
// flow stays over: a flow without traffic for that long starts from "not
// alerted" again, like new-api drops idle flows.
func (p *Plugin) setAlerted(ctx context.Context, flow int64, over bool) {
	var err error
	if over {
		err = p.host.KV().Set(ctx, kvNamespace, alertKey(flow), []byte{1}, 2*time.Hour)
	} else {
		err = p.host.KV().Delete(ctx, kvNamespace, alertKey(flow))
	}
	if err != nil {
		p.stats.kvErrors.Add(1)
	}
}

func (p *Plugin) notifyFlowAlert(id int64, name string, failed, audited int64, percent int) {
	if name == "" {
		name = "#" + strconv.FormatInt(id, 10)
	}
	rate := float64(failed) * 100 / float64(audited)
	title := fmt.Sprintf("提示词审核：流程「%s」异常率 %.1f%% 超过阈值 %d%% / Moderation: flow %q error rate %.1f%% is above %d%%",
		name, rate, percent, name, rate, percent)
	text := fmt.Sprintf("流程「%s」（#%d）近 1 小时异常 %d / %d 次，异常率 %.1f%%，阈值 %d%%。审核异常时请求会直接放行，请检查审核器和渠道。\n"+
		"Flow %q (#%d) failed %d of %d runs in the last hour (%.1f%%, threshold %d%%). Failed moderation lets requests through; check the auditors and channels.",
		name, id, failed, audited, rate, percent, name, id, failed, audited, rate, percent)
	p.notify(NoticeFlowErrorRate, title, text, map[string]any{
		"flow_id": id, "flow_name": name, "errors": failed, "audited": audited, "error_rate": rate / 100, "threshold_percent": percent,
	})
}

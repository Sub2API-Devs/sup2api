// Package guard implements the guard demo plugin: a gateway.request hook that
// blocks prompts matching keyword/regex rules, usage statistics from
// usage.recorded events, rollup/cleanup jobs, admin routes for rules and
// stats, and webhook alerts.
package guard

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Settings is the plugin configuration (forms/settings.schema.json).
type Settings struct {
	WebhookURL     string `json:"webhook_url"`
	RecordSnippets bool   `json:"record_snippets"`
}

// Plugin is the guard plugin. It implements pluginsdk.Hook, pluginsdk.App,
// pluginsdk.HTTP and the lifecycle interfaces.
type Plugin struct {
	*pluginsdk.Router

	host     pluginsdk.Host
	log      *slog.Logger
	settings atomic.Pointer[Settings]
	rules    atomic.Pointer[ruleSet]
	now      func() time.Time

	// reloadEvery is the rule refresh period (other nodes may change rules).
	reloadEvery time.Duration

	blocks chan blockEvent
	alerts chan alert

	stats struct {
		checked, blocked, droppedBlocks, droppedAlerts, alertErrors atomic.Int64
	}

	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// debugRoutes is set by the guardtest build (debug_guardtest.go).
var debugRoutes func(p *Plugin)

// New returns the plugin.
func New() *Plugin {
	p := &Plugin{
		Router:      pluginsdk.NewRouter(),
		now:         time.Now,
		reloadEvery: 5 * time.Second,
		blocks:      make(chan blockEvent, 1024),
		alerts:      make(chan alert, 256),
		log:         slog.Default(),
	}
	p.settings.Store(&Settings{})
	p.rules.Store(&ruleSet{})
	p.Handle("GET", "/rules", p.getRules)
	p.Handle("PUT", "/rules", p.putRules)
	p.Handle("GET", "/stats", p.getStats)
	if debugRoutes != nil {
		debugRoutes(p)
	}
	return p
}

// Init implements pluginsdk.Initializer: loads rules and starts the
// background workers.
func (p *Plugin) Init(ctx context.Context, h pluginsdk.Host) error {
	p.host = h
	p.log = h.Logger()
	if err := p.reloadRules(ctx); err != nil {
		// Keep running with no rules; the refresher retries.
		p.log.Warn("guard: initial rule load failed", "error", err.Error())
	}
	bg, cancel := context.WithCancel(context.Background())
	p.cancel = cancel
	p.wg.Add(3)
	go p.refreshLoop(bg)
	go p.blockWriter(bg)
	go p.alertSender(bg)
	return nil
}

// Configure implements pluginsdk.Configurer.
func (p *Plugin) Configure(_ context.Context, cfg pluginsdk.Config) error {
	var s Settings
	if err := cfg.Decode(&s); err != nil {
		return pluginsdk.FieldErrors{}.Add("", "invalid_json", "settings must be a JSON object / 设置必须是 JSON 对象").Err()
	}
	s.WebhookURL = strings.TrimSpace(s.WebhookURL)
	if s.WebhookURL != "" {
		u, err := url.Parse(s.WebhookURL)
		if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
			return pluginsdk.FieldErrors{}.Add("webhook_url", "format", "webhook_url must be an http(s) URL / webhook 地址必须是 http(s) URL").Err()
		}
	}
	p.settings.Store(&s)
	return nil
}

// Health implements pluginsdk.HealthChecker.
func (p *Plugin) Health(context.Context) (*pluginv1.HealthResponse, error) {
	rs := p.rules.Load()
	return &pluginv1.HealthResponse{Healthy: true, Metrics: map[string]float64{
		"rules":          float64(len(rs.rules)),
		"checked":        float64(p.stats.checked.Load()),
		"blocked":        float64(p.stats.blocked.Load()),
		"dropped_blocks": float64(p.stats.droppedBlocks.Load()),
		"dropped_alerts": float64(p.stats.droppedAlerts.Load()),
		"alert_errors":   float64(p.stats.alertErrors.Load()),
	}}, nil
}

// Shutdown implements pluginsdk.Shutdowner: flushes pending block records.
func (p *Plugin) Shutdown(ctx context.Context) error {
	if p.cancel == nil {
		return nil
	}
	p.cancel()
	done := make(chan struct{})
	go func() { p.wg.Wait(); close(done) }()
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(5 * time.Second):
		return errors.New("guard: workers did not stop in time")
	}
}

// db returns the plugin database pool.
func (p *Plugin) db(ctx context.Context) (*pgxpool.Pool, error) {
	if p.host == nil {
		return nil, errors.New("guard: host not initialised")
	}
	pool, err := p.host.DB(ctx)
	if err != nil {
		return nil, fmt.Errorf("guard: database unavailable: %w", err)
	}
	return pool, nil
}

func (p *Plugin) refreshLoop(ctx context.Context) {
	defer p.wg.Done()
	t := time.NewTicker(p.reloadEvery)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			rctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			if err := p.reloadRules(rctx); err != nil && ctx.Err() == nil {
				p.log.Debug("guard: rule reload failed", "error", err.Error())
			}
			cancel()
		}
	}
}

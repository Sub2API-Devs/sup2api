// Package dynweight is the dynamic weight plugin (CONTRACTS §73.5). It
// counts the attempts of every (account, group, client model) per window,
// evaluates the closed windows against configurable rules and strategies,
// and rewrites the scheduling weight of the candidates with the effective
// weight: degraded on errors or slowness, climbing back when healthy.
package dynweight

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

// Broadcast topics.
const (
	TopicConfig  = "dynweight.config"  // the configuration changed
	TopicWeights = "dynweight.weights" // an evaluation changed effective weights
)

const (
	// flushEvery is how often a node writes its counters and the base
	// weights it saw; windows close CloseGraceSeconds after their end.
	flushEvery = time.Second
	// refreshEvery reloads the configuration and the weights in case a
	// broadcast was missed.
	refreshEvery = 15 * time.Second
)

// Plugin implements pluginsdk.Observer, pluginsdk.AccountRanker,
// pluginsdk.JobRunner, pluginsdk.HTTP, pluginsdk.BroadcastHandler and the
// lifecycle interfaces.
type Plugin struct {
	*pluginsdk.Router
	*pluginsdk.BroadcastMux

	host pluginsdk.Host
	log  *slog.Logger
	now  func() time.Time

	cfg     atomic.Pointer[compiledConfig]
	weights atomic.Pointer[map[key]weight]
	obs     *aggregator
	bases   *baseTracker
	// reload serializes the configuration and weight reloads.
	reload sync.Mutex

	bg     context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// compiledConfig is the configuration in force and its stored version.
type compiledConfig struct {
	*rules.Compiled
	version int64
}

// New returns the plugin.
func New() *Plugin {
	p := &Plugin{
		Router:       pluginsdk.NewRouter(),
		BroadcastMux: pluginsdk.NewBroadcastMux(),
		log:          slog.Default(),
		now:          time.Now,
		obs:          newAggregator(),
		bases:        newBaseTracker(),
	}
	p.bg, p.cancel = context.WithCancel(context.Background())
	p.cfg.Store(&compiledConfig{Compiled: rules.Compile(rules.DefaultConfig())})
	p.weights.Store(&map[key]weight{})
	p.routes()
	p.OnTopic(TopicConfig, p.onBroadcast(p.reloadConfig))
	p.OnTopic(TopicWeights, p.onBroadcast(p.reloadWeights))
	return p
}

// Init implements pluginsdk.Initializer: loads the configuration and the
// weights and starts the flush loop.
func (p *Plugin) Init(ctx context.Context, h pluginsdk.Host) error {
	p.host = h
	p.log = h.Logger()
	if err := p.reloadConfig(ctx); err != nil {
		p.log.Warn("dynweight: initial configuration load failed", "error", err.Error())
	}
	if err := p.reloadWeights(ctx); err != nil {
		p.log.Warn("dynweight: initial weight load failed", "error", err.Error())
	}
	p.wg.Add(1)
	go p.loop()
	return nil
}

// Shutdown implements pluginsdk.Shutdowner: writes what is left.
func (p *Plugin) Shutdown(context.Context) error {
	p.cancel()
	p.wg.Wait()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	p.flush(ctx)
	return nil
}

// Health implements pluginsdk.HealthChecker.
func (p *Plugin) Health(context.Context) (*pluginv1.HealthResponse, error) {
	return &pluginv1.HealthResponse{Healthy: true, Metrics: map[string]float64{
		"degraded_keys":    float64(len(*p.weights.Load())),
		"pending_keys":     float64(p.obs.pending()),
		"dropped_counters": float64(p.obs.dropped.Load()),
	}}, nil
}

func (p *Plugin) store(ctx context.Context) (store, error) {
	if p.host == nil {
		return store{}, pluginsdk.ErrHostNotReady
	}
	db, err := p.host.DB(ctx)
	return store{db: db}, err
}

func (p *Plugin) loop() {
	defer p.wg.Done()
	flush, refresh := time.NewTicker(flushEvery), time.NewTicker(refreshEvery)
	defer flush.Stop()
	defer refresh.Stop()
	for {
		select {
		case <-p.bg.Done():
			return
		case <-flush.C:
			ctx, cancel := context.WithTimeout(p.bg, 10*time.Second)
			p.flush(ctx)
			cancel()
		case <-refresh.C:
			ctx, cancel := context.WithTimeout(p.bg, 10*time.Second)
			p.refresh(ctx)
			cancel()
		}
	}
}

// flush writes the counters and the base weights this node collected.
func (p *Plugin) flush(ctx context.Context) {
	s, err := p.store(ctx)
	if err != nil {
		return
	}
	if deltas := p.obs.take(); len(deltas) > 0 {
		if err := s.addObs(ctx, deltas); err != nil {
			p.obs.dropped.Add(int64(len(deltas)))
			p.log.Warn("dynweight: write counters failed, dropped", "error", err.Error(), "keys", len(deltas))
		}
	}
	if changed := p.bases.take(); len(changed) > 0 {
		if err := s.saveBases(ctx, changed); err != nil {
			p.bases.retry(changed)
			p.log.Warn("dynweight: write base weights failed", "error", err.Error())
		}
	}
}

// refresh reloads the configuration when its version moved, and the weights.
func (p *Plugin) refresh(ctx context.Context) {
	s, err := p.store(ctx)
	if err != nil {
		return
	}
	if v, err := s.configVersion(ctx); err == nil && v != p.cfg.Load().version {
		if err := p.reloadConfig(ctx); err != nil {
			p.log.Warn("dynweight: reload configuration failed", "error", err.Error())
		}
	}
	if err := p.reloadWeights(ctx); err != nil {
		p.log.Warn("dynweight: reload weights failed", "error", err.Error())
	}
}

func (p *Plugin) reloadConfig(ctx context.Context) error {
	s, err := p.store(ctx)
	if err != nil {
		return err
	}
	p.reload.Lock()
	defer p.reload.Unlock()
	c, version, err := s.loadConfig(ctx)
	if err != nil {
		return err
	}
	// A stored configuration was normalized when saved; this only fills
	// what an older version may have left out.
	if _, err := c.Normalize(); err != nil {
		return err
	}
	p.cfg.Store(&compiledConfig{Compiled: rules.Compile(c), version: version})
	return nil
}

func (p *Plugin) reloadWeights(ctx context.Context) error {
	s, err := p.store(ctx)
	if err != nil {
		return err
	}
	p.reload.Lock()
	defer p.reload.Unlock()
	w, err := s.loadWeights(ctx)
	if err != nil {
		return err
	}
	p.weights.Store(&w)
	return nil
}

func (p *Plugin) onBroadcast(reload func(context.Context) error) pluginsdk.BroadcastFunc {
	return func(ctx context.Context, _ pluginsdk.Broadcast) error {
		rctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		return reload(rctx)
	}
}

// publish tells the other nodes to reload, and reloads this one.
func (p *Plugin) publish(ctx context.Context, topic string, reload func(context.Context) error) {
	if err := reload(ctx); err != nil {
		p.log.Warn("dynweight: reload failed", "topic", topic, "error", err.Error())
	}
	if err := p.host.Publish(ctx, topic, nil); err != nil {
		p.log.Warn("dynweight: broadcast failed", "topic", topic, "error", err.Error())
	}
}

package observation

import (
	"context"
	"errors"
	"reflect"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	contract "github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"google.golang.org/protobuf/proto"
)

type Consumer struct {
	Namespace   string
	Version     string
	PluginKey   string
	AllAccounts bool
	Phases      []string
	Metrics     []string
	Client      core.ObservationPlugin
}

type Hub struct {
	registry core.PluginRegistry
	store    core.ObservationMetricStore
	mu       sync.RWMutex
	workers  []*worker
	closed   bool
	stop     chan struct{}
	changed  chan struct{}
	done     chan struct{}
	wg       sync.WaitGroup
	unsub    func()
}

type worker struct {
	h        *Hub
	consumer Consumer
	queue    chan *pluginv1.RequestObservation
	ctx      context.Context
	cancel   context.CancelFunc
	lost     atomic.Uint64
}

func New(registry core.PluginRegistry, store core.ObservationMetricStore, builtin Consumer) *Hub {
	h := &Hub{registry: registry, store: store, stop: make(chan struct{}), changed: make(chan struct{}, 1), done: make(chan struct{})}
	h.workers = append(h.workers, h.startWorker(builtin))
	if registry != nil {
		h.unsub = registry.OnChange(func(core.Generation) {
			select {
			case h.changed <- struct{}{}:
			default:
			}
		})
		h.reconcile()
	}
	go h.watch()
	return h
}

func (h *Hub) startWorker(c Consumer) *worker {
	ctx, cancel := context.WithCancel(context.Background())
	capacity := 256
	if c.Namespace == contract.CoreNamespace {
		capacity = 4096
	}
	w := &worker{h: h, consumer: c, queue: make(chan *pluginv1.RequestObservation, capacity), ctx: ctx, cancel: cancel}
	h.wg.Add(1)
	go func() { defer h.wg.Done(); w.run() }()
	return w
}

func (h *Hub) PublishObservation(event *pluginv1.RequestObservation) {
	if event == nil || event.Id == "" || event.AccountId <= 0 || !contract.ValidPhase(event.Phase) {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	if h.closed {
		return
	}
	for _, w := range h.workers {
		c := w.consumer
		if !slices.Contains(c.Phases, event.Phase) || (!c.AllAccounts && event.AccountPluginKey != c.PluginKey) {
			continue
		}
		if len(w.queue) == cap(w.queue) {
			w.lost.Add(1)
			continue
		}
		copy := proto.Clone(event).(*pluginv1.RequestObservation)
		select {
		case w.queue <- copy:
		default:
			w.lost.Add(1)
		}
	}
}

func (h *Hub) reconcile() {
	gen, ok := h.registry.Current().(core.ObservationGeneration)
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.closed {
		return
	}
	previous := make(map[string]*worker, len(h.workers)-1)
	for _, w := range h.workers[1:] {
		previous[w.consumer.Namespace] = w
	}
	h.workers = h.workers[:1]
	if ok {
		for _, b := range gen.Observers() {
			if b.Client == nil {
				continue
			}
			c := Consumer{Namespace: contract.PluginNamespace(b.Plugin.Key), Version: b.Plugin.Version, PluginKey: b.Plugin.Key,
				AllAccounts: b.AllAccounts, Phases: slices.Clone(b.Declaration.Events), Metrics: slices.Clone(b.Declaration.Metrics), Client: b.Client}
			old := previous[c.Namespace]
			if old != nil && old.consumer.Version == c.Version && old.consumer.AllAccounts == c.AllAccounts && slices.Equal(old.consumer.Phases, c.Phases) && slices.Equal(old.consumer.Metrics, c.Metrics) &&
				reflect.ValueOf(old.consumer.Client).Comparable() && reflect.ValueOf(c.Client).Comparable() && old.consumer.Client == c.Client {
				h.workers = append(h.workers, old)
				delete(previous, c.Namespace)
				continue
			}
			h.workers = append(h.workers, h.startWorker(c))
		}
	}
	for _, w := range previous {
		w.cancel()
	}
}

func (h *Hub) watch() {
	defer close(h.done)
	for {
		select {
		case <-h.changed:
			h.reconcile()
		case <-h.stop:
			return
		}
	}
}

func (h *Hub) Close(ctx context.Context) {
	h.mu.Lock()
	if !h.closed {
		h.closed = true
		close(h.stop)
		for _, w := range h.workers {
			close(w.queue)
		}
	}
	h.mu.Unlock()
	if h.unsub != nil {
		h.unsub()
	}
	select {
	case <-h.done:
	case <-ctx.Done():
	}
	done := make(chan struct{})
	go func() { h.wg.Wait(); close(done) }()
	select {
	case <-done:
	case <-ctx.Done():
		h.mu.RLock()
		for _, w := range h.workers {
			w.cancel()
		}
		h.mu.RUnlock()
	}
}

func (w *worker) run() {
	defer w.cancel()
	tick := time.NewTicker(200 * time.Millisecond)
	defer tick.Stop()
	batch := make([]*pluginv1.RequestObservation, 0, contract.MaxBatch)
	var dropped uint64
	flush := func() {
		lost := w.lost.Swap(0)
		dropped += lost
		if lost > 0 {
			w.h.store.MarkObservationGap(w.consumer.Namespace)
		}
		if len(batch) == 0 {
			return
		}
		ctx, cancel := context.WithTimeout(w.ctx, 2*time.Second)
		err := w.deliver(ctx, &pluginv1.ObservationBatch{Observations: batch, Dropped: dropped})
		cancel()
		if err != nil {
			dropped += uint64(len(batch))
			w.h.store.MarkObservationGap(w.consumer.Namespace)
		} else {
			dropped = 0
		}
		batch = batch[:0]
	}
	for {
		select {
		case <-w.ctx.Done():
			if len(batch) > 0 || len(w.queue) > 0 || w.lost.Load() > 0 {
				w.h.store.MarkObservationGap(w.consumer.Namespace)
			}
			return
		case event, ok := <-w.queue:
			if !ok {
				flush()
				return
			}
			batch = append(batch, event)
			if len(batch) == contract.MaxBatch {
				flush()
			}
		case <-tick.C:
			flush()
		}
	}
}

func (w *worker) deliver(ctx context.Context, in *pluginv1.ObservationBatch) (err error) {
	defer func() {
		if recover() != nil {
			err = errors.New("observation consumer panicked")
		}
	}()
	trusted := make(map[string]*pluginv1.RequestObservation, len(in.Observations))
	order := make([]string, 0, len(in.Observations))
	for _, event := range in.Observations {
		if old := trusted[event.Id]; old != nil {
			if old.Revision >= event.Revision {
				continue
			}
		} else {
			order = append(order, event.Id)
		}
		trusted[event.Id] = proto.Clone(event).(*pluginv1.RequestObservation)
	}
	batch := &pluginv1.ObservationBatch{Dropped: in.Dropped, Observations: make([]*pluginv1.RequestObservation, 0, len(order))}
	for _, id := range order {
		batch.Observations = append(batch.Observations, proto.Clone(trusted[id]).(*pluginv1.RequestObservation))
	}
	out, err := w.consumer.Client.OnObservations(ctx, batch)
	if err != nil {
		return err
	}
	if len(out.GetContributions()) > len(trusted) {
		return errors.New("too many observation contributions")
	}
	seen := map[string]bool{}
	samples := make([]core.ObservationMetricSample, 0, len(out.GetContributions()))
	for _, contribution := range out.GetContributions() {
		if contribution == nil {
			return errors.New("missing contribution")
		}
		event := trusted[contribution.ObservationId]
		if event == nil || seen[event.Id] || len(contribution.Metrics) > contract.MaxMetrics {
			return errors.New("contribution is outside observation scope")
		}
		seen[event.Id] = true
		metrics := make(map[string]int64, len(contribution.Metrics))
		for name, value := range contribution.Metrics {
			if !slices.Contains(w.consumer.Metrics, name) || !contract.ValidMetric(name) || value < 0 || value > contract.MaxValue {
				return errors.New("invalid observation metric")
			}
			metrics[name] = value
		}
		at := event.OccurredAtUnixMs
		if event.Phase == contract.UsageFinalized {
			at = event.CompletedAtUnixMs
		}
		if at <= 0 || event.Revision == 0 || event.Revision > uint64(contract.MaxValue) {
			return errors.New("invalid observation identity")
		}
		samples = append(samples, core.ObservationMetricSample{Namespace: w.consumer.Namespace, ID: event.Id, AccountID: event.AccountId, At: time.UnixMilli(at), Revision: event.Revision, Metrics: metrics})
	}
	for _, sample := range samples {
		if !w.h.store.RecordObservationMetrics(sample) {
			return errors.New("observation storage queue unavailable")
		}
	}
	return nil
}

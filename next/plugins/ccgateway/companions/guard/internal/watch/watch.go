// Package watch follows Docker events, debounces them into firewall
// recomputations, runs the 60 s reconciliation, and checks who holds the
// controller address on the control network (03 §8).
package watch

import (
	"context"
	"net/netip"
	"sort"
	"strings"
	"sync"
	"time"

	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/obs"
)

// Docker is what the watcher reads.
type Docker interface {
	ContainerInspect(ctx context.Context, id string) (dockerapi.Raw, *dockerapi.ContainerInfo, error)
	NetworkInspect(ctx context.Context, id string) (dockerapi.Raw, *dockerapi.NetworkInfo, error)
	Events(ctx context.Context, since time.Time, f dockerapi.Filters) (<-chan dockerapi.Event, <-chan error)
}

// Firewall is the part of firewall.Engine the watcher drives.
type Firewall interface {
	Recompute(reason string, aids ...string)
	Reconcile()
	ForgetContainer(id string)
}

// Config is the watcher's view of the instance.
type Config struct {
	Prefix         string
	ControlNetwork string
	ControllerIP   netip.Addr
	Project        string
	Quiet          time.Duration // 200 ms
	Max            time.Duration // 1 s
	Period         time.Duration // 60 s
}

// ControlEndpoint is the holder of the controller address.
type ControlEndpoint struct {
	ID      string
	Name    string
	Project string
	Service string
}

// State is what the API reads: whether .2 is the compose controller.
type State struct {
	mu         sync.RWMutex
	ok         bool
	controller ControlEndpoint
	foreign    []string
	checked    bool
}

// ControllerOK reports §8.4's condition.
func (s *State) ControllerOK() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.ok
}

// Set replaces the state (also used by tests and the contract runner).
func (s *State) Set(ok bool, ep ControlEndpoint, foreign []string) {
	s.mu.Lock()
	s.ok, s.controller, s.foreign, s.checked = ok, ep, foreign, true
	s.mu.Unlock()
}

// Snapshot returns the endpoint and the foreign endpoint names.
func (s *State) Snapshot() (ControlEndpoint, []string) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.controller, append([]string(nil), s.foreign...)
}

// Watcher runs the event loop.
type Watcher struct {
	C      Config
	D      Docker
	FW     Firewall
	S      *State
	Log    *obs.Logger
	OnTick func(ctx context.Context) // the 60 s housekeeping (stale jobs, loads)

	n          names.Names
	lastWarn   time.Time
	lastEvent  time.Time
	pending    map[string]bool
	pendingAll bool
}

func (w *Watcher) init() {
	w.n = names.Names{Prefix: w.C.Prefix}
	if w.C.Quiet == 0 {
		w.C.Quiet = 200 * time.Millisecond
	}
	if w.C.Max == 0 {
		w.C.Max = time.Second
	}
	if w.C.Period == 0 {
		w.C.Period = 60 * time.Second
	}
	if w.Log == nil {
		w.Log = obs.Discard()
	}
	if w.pending == nil {
		w.pending = map[string]bool{}
	}
}

// CheckControl inspects the control network (03 §8.4).
func (w *Watcher) CheckControl(ctx context.Context) {
	w.init()
	ok, ep, foreign := w.checkControl(ctx)
	w.S.Set(ok, ep, foreign)
	now := time.Now()
	if (!ok || len(foreign) > 0) && now.Sub(w.lastWarn) >= time.Minute {
		w.lastWarn = now
		if !ok {
			w.Log.Warn("controller_unguarded", obs.Fields{"holder": ep.Name})
		}
		if len(foreign) > 0 {
			w.Log.Warn("control_network_foreign", obs.Fields{"names": foreign})
		}
	}
}

func (w *Watcher) checkControl(ctx context.Context) (bool, ControlEndpoint, []string) {
	_, net, err := w.D.NetworkInspect(ctx, w.C.ControlNetwork)
	if err != nil || net.Name != w.C.ControlNetwork {
		return false, ControlEndpoint{}, nil
	}
	var holder string
	var foreign []string
	for id, ep := range net.Containers {
		addr, _, _ := strings.Cut(ep.IPv4Address, "/")
		if a, err := netip.ParseAddr(addr); err == nil && a == w.C.ControllerIP {
			if holder != "" {
				foreign = append(foreign, ep.Name)
				continue
			}
			holder = id
			continue
		}
		foreign = append(foreign, ep.Name)
	}
	sort.Strings(foreign)
	if holder == "" {
		return false, ControlEndpoint{}, foreign
	}
	_, c, err := w.D.ContainerInspect(ctx, holder)
	if err != nil {
		return false, ControlEndpoint{ID: holder}, foreign
	}
	ep := ControlEndpoint{ID: c.ID, Name: c.TrimName(), Project: c.Label(names.LabelComposeProject), Service: c.Label(names.LabelComposeService)}
	ok := ep.Name == w.n.Controller() && ep.Project == w.C.Project && ep.Service == "controller" && c.State.Running
	for _, f := range foreign {
		if f == w.n.Controller() {
			ok = false
		}
	}
	return ok, ep, foreign
}

// Route decides what an event affects: an account key, all accounts
// (the gateway), the control network, or nothing.
func (w *Watcher) Route(e dockerapi.Event) (aid string, all, control bool) {
	w.init()
	name := e.Actor.Attributes["name"]
	switch e.Type {
	case "container":
		switch e.Action {
		case "start", "die", "stop", "kill", "destroy", "rename", "create", "pause", "unpause":
		default:
			return "", false, false
		}
		if a, role, ok := w.n.ParseContainer(name); ok && role == "app" {
			return a, false, false
		}
		if name == w.n.Gateway() {
			return "", true, false
		}
		if name == w.n.Controller() {
			return "", false, true
		}
	case "network":
		switch e.Action {
		case "connect", "disconnect", "destroy", "create":
		default:
			return "", false, false
		}
		if name == w.C.ControlNetwork {
			return "", false, true
		}
		if a, role, ok := w.n.ParseNetwork(name); ok && role == "net" {
			return a, false, false
		}
	}
	return "", false, false
}

func (w *Watcher) handle(ctx context.Context, e dockerapi.Event) bool {
	if e.TimeNano > 0 {
		w.lastEvent = time.Unix(0, e.TimeNano)
	} else if e.Time > 0 {
		w.lastEvent = time.Unix(e.Time, 0)
	}
	if e.Type == "container" && e.Action == "destroy" {
		w.FW.ForgetContainer(e.Actor.ID)
	}
	aid, all, control := w.Route(e)
	if control {
		w.CheckControl(ctx)
	}
	switch {
	case all:
		w.pendingAll = true
		return true
	case aid != "":
		w.pending[aid] = true
		return true
	}
	return false
}

func (w *Watcher) flush() {
	if w.pendingAll {
		w.FW.Recompute("events")
	} else if len(w.pending) > 0 {
		aids := make([]string, 0, len(w.pending))
		for a := range w.pending {
			aids = append(aids, a)
		}
		sort.Strings(aids)
		w.FW.Recompute("events", aids...)
	}
	w.pending = map[string]bool{}
	w.pendingAll = false
}

func (w *Watcher) tick(ctx context.Context) {
	w.FW.Reconcile()
	w.CheckControl(ctx)
	if w.OnTick != nil {
		w.OnTick(ctx)
	}
}

// Run subscribes from since and loops until ctx ends: events are
// debounced (Quiet without a new event, at most Max after the first),
// the stream is resubscribed after 1 s (backing off to 10 s) with since =
// last event - 1 s and a full reconciliation, and every Period the
// reconciliation runs.
func (w *Watcher) Run(ctx context.Context, since time.Time) {
	w.init()
	w.lastEvent = since
	backoff := time.Second
	period := time.NewTicker(w.C.Period)
	defer period.Stop()
	filters := dockerapi.Filters{"type": {"container", "network"}}
	for ctx.Err() == nil {
		sub, cancel := context.WithCancel(ctx)
		evs, errs := w.D.Events(sub, w.lastEvent, filters)
		got := false
		w.loop(ctx, evs, period, &got)
		cancel()
		for range evs {
		}
		if err, ok := <-errs; ok && err != nil && ctx.Err() == nil {
			w.Log.Warn("events_disconnected", obs.Fields{"type": "stream"})
		}
		if ctx.Err() != nil {
			return
		}
		if got {
			backoff = time.Second
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
		if backoff < 10*time.Second {
			backoff *= 2
			if backoff > 10*time.Second {
				backoff = 10 * time.Second
			}
		}
		if !w.lastEvent.IsZero() {
			w.lastEvent = w.lastEvent.Add(-time.Second)
		}
		w.tick(ctx)
	}
}

func (w *Watcher) loop(ctx context.Context, evs <-chan dockerapi.Event, period *time.Ticker, got *bool) {
	var quiet <-chan time.Time
	var batchStart time.Time
	var qt *time.Timer
	stopQuiet := func() {
		if qt != nil {
			qt.Stop()
		}
		quiet = nil
	}
	for {
		select {
		case <-ctx.Done():
			stopQuiet()
			return
		case <-period.C:
			stopQuiet()
			w.flush()
			batchStart = time.Time{}
			w.tick(ctx)
		case <-quiet:
			quiet = nil
			w.flush()
			batchStart = time.Time{}
		case e, ok := <-evs:
			if !ok {
				stopQuiet()
				w.flush()
				return
			}
			*got = true
			if !w.handle(ctx, e) {
				continue
			}
			now := time.Now()
			if batchStart.IsZero() {
				batchStart = now
			}
			if now.Sub(batchStart) >= w.C.Max {
				stopQuiet()
				w.flush()
				batchStart = time.Time{}
				continue
			}
			stopQuiet()
			wait := w.C.Quiet
			if rest := w.C.Max - now.Sub(batchStart); rest < wait {
				wait = rest
			}
			qt = time.NewTimer(wait)
			quiet = qt.C
		}
	}
}

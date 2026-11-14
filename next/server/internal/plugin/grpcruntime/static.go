package grpcruntime

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
)

// StaticInstance is a plugin version of runtime "none" (manifest.RuntimeNone,
// docs/UPSTREAM-DECLARATIVE.md §4.2): a package without a process, whose
// account types the core serves from their upstream declarations. It is
// ready from the start and stays so; it calls nothing, so it has no
// capability clients, restarts, data migrations or drain. Only its grants
// change, re-read by Refresh like those of a running Instance.
type StaticInstance struct {
	rt        *Runtime
	pkg       *registry.Package
	settings  atomic.Pointer[settings]
	refreshMu sync.Mutex // serializes the settings reads of Refresh
}

// LoadStatic loads a runtime "none" package: the host compatibility check of
// Load and the plugin's settings, without extracting or starting anything.
func (r *Runtime) LoadStatic(ctx context.Context, pkg *registry.Package) (*StaticInstance, error) {
	if err := r.checkHostCompat(pkg); err != nil {
		return nil, err
	}
	st, err := r.loadSettings(ctx, pkg)
	if err != nil {
		return nil, fmt.Errorf("plugin %s@%s: load settings: %w", pkg.Key, pkg.Version, err)
	}
	i := &StaticInstance{rt: r, pkg: pkg}
	i.settings.Store(st)
	return i, nil
}

func (i *StaticInstance) Package() *registry.Package      { return i.pkg }
func (i *StaticInstance) Grants() registry.Grants         { return i.settings.Load().grants }
func (i *StaticInstance) Platform() core.PlatformPlugin   { return nil }
func (i *StaticInstance) Hook() core.HookPlugin           { return nil }
func (i *StaticInstance) App() core.AppPlugin             { return nil }
func (i *StaticInstance) HTTP() core.HTTPPlugin           { return nil }
func (i *StaticInstance) Scheduler() core.SchedulerPlugin { return nil }

// State is always ready: there is no process to start or lose.
func (i *StaticInstance) State() (state, lastErr string) { return StateReady, "" }

// Restarts is always 0.
func (i *StaticInstance) Restarts() int { return 0 }

// Refresh re-reads the plugin's settings; the new grants apply at once.
func (i *StaticInstance) Refresh(ctx context.Context) error {
	i.refreshMu.Lock()
	defer i.refreshMu.Unlock()
	st, err := i.rt.loadSettings(ctx, i.pkg)
	if err != nil {
		return err
	}
	i.settings.Store(st)
	return nil
}

// LimitsStale is always false: resource limits apply to processes only, so
// a resources message never restarts a static instance.
func (i *StaticInstance) LimitsStale() bool { return false }

// MigrateData does nothing: runtime "none" declares no data migration.
func (i *StaticInstance) MigrateData(context.Context, string, string) error { return nil }

// Drain does nothing: no call is ever in flight in the plugin.
func (i *StaticInstance) Drain(time.Duration) {}

// Stop does nothing.
func (i *StaticInstance) Stop() {}

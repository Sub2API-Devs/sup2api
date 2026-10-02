package app

import (
	"context"
	"log/slog"
	"sync/atomic"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
)

func startBuiltinConvergence(ctx context.Context, s *install.Service, locker core.Locker, reg core.PluginRegistry, dir string, log *slog.Logger) (*atomic.Bool, func(context.Context)) {
	return builtinConvergence(ctx, s, locker, reg, dir, log, false)
}

// A managed bootstrap imports the initial bundle once. After convergence the
// plugin catalog is independent: uninstalling or replacing a plugin must not
// cause this core process to restore the bundled copy.
func startBuiltinBootstrap(ctx context.Context, s *install.Service, locker core.Locker, reg core.PluginRegistry, dir string, log *slog.Logger) (*atomic.Bool, func(context.Context)) {
	return builtinConvergence(core.WithPluginBootstrap(ctx), s, locker, reg, dir, log, true)
}

func builtinConvergence(ctx context.Context, s *install.Service, locker core.Locker, reg core.PluginRegistry, dir string, log *slog.Logger, once bool) (*atomic.Bool, func(context.Context)) {
	ready := &atomic.Bool{}
	ctx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	go func() {
		defer close(done)
		var requirements map[string]install.BuiltinRequirement
		for ctx.Err() == nil {
			if requirements == nil {
				var err error
				requirements, err = s.BuiltinRequirements(dir)
				if err != nil {
					log.Warn("read builtin requirements failed", "err", err)
				}
			}
			if requirements != nil {
				rctx, rcancel := context.WithTimeout(ctx, 10*time.Second)
				ok, err := s.BuiltinsReady(rctx, requirements, reg.Current())
				rcancel()
				ready.Store(err == nil && ok)
				if ready.Load() && once {
					return
				}
				if !ready.Load() {
					lk, held, err := locker.TryLock(ctx, "plugins:builtin", time.Minute)
					if err != nil {
						log.Warn("builtin install lock failed", "err", err)
					} else if held {
						ictx, icancel := context.WithTimeout(ctx, 10*time.Minute)
						work, stop := core.KeepLock(ictx, lk)
						if err := s.EnsureBuiltin(work, dir, log); err != nil {
							log.Warn("builtin install incomplete; will retry", "err", err)
						}
						stop()
						icancel()
						lk.Release()
					}
				}
			}
			t := time.NewTimer(5 * time.Second)
			select {
			case <-ctx.Done():
				t.Stop()
				return
			case <-t.C:
			}
		}
	}()
	return ready, func(stopCtx context.Context) {
		cancel()
		select {
		case <-done:
		case <-stopCtx.Done():
		}
	}
}

// startBuiltinUpgrade brings the plugins of a managed core's bundle up to the
// versions it carries, so a core update upgrades its bundled plugins with
// it. It waits until this node may coordinate plugins; plugin changes are
// refused while a core plan is running or paused, so the upgrade starts when
// the plan has completed and every node runs this release. It installs
// bundled plugins never seen before, upgrades enabled ones that are older
// than the bundle, and never downgrades, re-enables or overrides a newer
// version an operator installed. It stops once the cluster runs the bundle;
// a node whose own instance lags behind catches up by itself (§36).
func startBuiltinUpgrade(ctx context.Context, s *install.Service, locker core.Locker, dir string, allowed func() bool, log *slog.Logger) func(context.Context) {
	ctx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	go func() {
		defer close(done)
		if dir == "" {
			return
		}
		want, err := s.BuiltinRequirements(dir)
		if err != nil {
			log.Warn("read builtin requirements failed; bundled plugins are not upgraded", "err", err)
			return
		}
		for {
			if allowed == nil || allowed() {
				rctx, rcancel := context.WithTimeout(ctx, 10*time.Second)
				committed, err := s.BuiltinsCommitted(rctx, want)
				rcancel()
				if err == nil && committed {
					log.Info("bundled plugins run the versions of this release")
					return
				}
				if lk, held, err := locker.TryLock(ctx, "plugins:builtin", time.Minute); err != nil {
					log.Warn("builtin upgrade lock failed", "err", err)
				} else if held {
					work, stop := core.KeepLock(ctx, lk)
					ictx, icancel := context.WithTimeout(work, 10*time.Minute)
					if err := s.EnsureBuiltin(ictx, dir, log); err != nil {
						log.Info("bundled plugin upgrade not finished; will retry", "err", err)
					}
					icancel()
					stop()
					lk.Release()
				}
			}
			t := time.NewTimer(10 * time.Second)
			select {
			case <-ctx.Done():
				t.Stop()
				return
			case <-t.C:
			}
		}
	}()
	return func(stopCtx context.Context) {
		cancel()
		select {
		case <-done:
		case <-stopCtx.Done():
		}
	}
}

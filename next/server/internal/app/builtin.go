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
	stop := runBuiltinLoop(ctx, func(ctx context.Context) {
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
					ensureBuiltinOnce(ctx, s, locker, dir, log, "builtin install lock failed",
						func(err error) { log.Warn("builtin install incomplete; will retry", "err", err) })
				}
			}
			if !waitOrDone(ctx, 5*time.Second) {
				return
			}
		}
	})
	return ready, stop
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
	return runBuiltinLoop(ctx, func(ctx context.Context) {
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
				ensureBuiltinOnce(ctx, s, locker, dir, log, "builtin upgrade lock failed",
					func(err error) { log.Info("bundled plugin upgrade not finished; will retry", "err", err) })
			}
			if !waitOrDone(ctx, 10*time.Second) {
				return
			}
		}
	})
}

// runBuiltinLoop starts loop in its own goroutine and returns the stop
// function both builtin loops hand to the app teardown: cancel, then wait for
// the goroutine or for the caller's shutdown deadline.
func runBuiltinLoop(ctx context.Context, loop func(context.Context)) func(context.Context) {
	ctx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	go func() {
		defer close(done)
		loop(ctx)
	}()
	return func(stopCtx context.Context) {
		cancel()
		select {
		case <-done:
		case <-stopCtx.Done():
		}
	}
}

// waitOrDone sleeps for d and reports whether d elapsed; false means ctx
// ended first, so the caller's loop should stop. The timer is always stopped.
func waitOrDone(ctx context.Context, d time.Duration) bool {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-t.C:
		return true
	}
}

// ensureBuiltinOnce takes the builtin install lock without waiting and runs
// one EnsureBuiltin pass under it, bounded by the 10 minute install timeout.
// It reports whether the pass ran at all: false means another node holds the
// lock and the caller's loop should simply try again on its next tick.
func ensureBuiltinOnce(ctx context.Context, s *install.Service, locker core.Locker, dir string, log *slog.Logger, lockMsg string, incomplete func(error)) bool {
	lk, held, err := locker.TryLock(ctx, "plugins:builtin", time.Minute)
	if err != nil {
		log.Warn(lockMsg, "err", err)
		return false
	}
	if !held {
		return false
	}
	defer lk.Release()
	work, stop := core.KeepLock(ctx, lk)
	defer stop()
	ictx, icancel := context.WithTimeout(work, 10*time.Minute)
	defer icancel()
	if err := s.EnsureBuiltin(ictx, dir, log); err != nil {
		incomplete(err)
	}
	return true
}

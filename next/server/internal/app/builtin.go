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

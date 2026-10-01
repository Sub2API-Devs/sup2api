package cluster

import (
	"context"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

type PluginMutations struct {
	DB     *store.DB
	Locker core.Locker
	// AllowBootstrap is evaluated together with a host-only context marker.
	AllowBootstrap func() bool
}
type mutationScopeKey struct{}

func (g *PluginMutations) Begin(ctx context.Context) (context.Context, func(), error) {
	noop := func() {}
	if ctx.Value(mutationScopeKey{}) == g {
		return ctx, noop, ctx.Err()
	}
	if core.IsPluginBootstrap(ctx) && g.AllowBootstrap != nil && g.AllowBootstrap() {
		return ctx, noop, nil
	}
	if g.Locker == nil {
		return ctx, noop, core.ErrUnavailable.WithMessage("cluster change lock unavailable")
	}
	work, cancel := context.WithTimeout(ctx, 25*time.Second)
	lk, ok, err := g.Locker.TryLock(work, rc.ClusterChangeLock, 30*time.Second)
	if err != nil || !ok {
		cancel()
		if err != nil {
			return ctx, noop, err
		}
		return ctx, noop, core.ErrConflict.WithMessage("another cluster change is being submitted; retry")
	}
	work, stop := core.KeepLock(work, lk)
	done := func() { stop(); cancel(); lk.Release() }
	// An ordinary deployment has no updater schema. Do not create it here.
	var installed bool
	if err = g.DB.Pool.QueryRow(work, `SELECT to_regclass('updater.upgrades') IS NOT NULL`).Scan(&installed); err == nil && installed {
		var busy bool
		err = g.DB.Pool.QueryRow(work, `SELECT EXISTS(SELECT 1 FROM updater.upgrades WHERE status IN ('running','paused'))`).Scan(&busy)
		if err == nil && busy {
			err = core.ErrConflict.WithMessage("core update is running or paused; finish or cancel it before changing plugins")
		}
	}
	if err != nil {
		done()
		return ctx, noop, err
	}
	return context.WithValue(work, mutationScopeKey{}, g), done, nil
}

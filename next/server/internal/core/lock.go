package core

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/runtime-contract/locklease"
)

var ErrLockLost = locklease.ErrLockLost

// KeepLock renews a Redis lock until cancellation, deadline or loss of ownership.
// Core and shell share this exact implementation; it does not fence external effects.
func KeepLock(ctx context.Context, lk Lock) (context.Context, context.CancelFunc) {
	return locklease.KeepLock(ctx, lk)
}

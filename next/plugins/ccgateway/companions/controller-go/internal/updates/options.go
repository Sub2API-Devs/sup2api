// Package updates is the in-place Worker update and the paired Worker+CLI
// activation (Python worker_update.py, runtime_updates.py; W1-W13, P1-P11).
// Writer B implements it; see IMPLEMENTATION.md.
package updates

// This file is FROZEN (foundation writer).

import (
	"errors"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/rnd"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/workeradmin"
)

// Options are the dependencies of New (implemented by writer B:
// func New(opts Options) (contract.Updates, error)).
type Options struct {
	Host   contract.UpdateHost
	Guard  guardapi.Client
	Store  *store.Store        // worker backups, .spool for large blobs
	Worker *workeradmin.Client // admin/runtime maintenance calls
	Clock  clock.Clock         // idle wait 120 s / 2 s, health wait 30 s / 1 s, lease expiry
	Rand   rnd.Source          // .next-<hex> names, release directory suffix
	Log    *logx.Logger
}

// Defaults fills the nil fields and checks the required ones.
func (o *Options) Defaults() error {
	if o.Host == nil || o.Guard == nil || o.Store == nil {
		return errors.New("updates: Host, Guard and Store are required")
	}
	if o.Worker == nil {
		o.Worker = workeradmin.New()
	}
	if o.Clock == nil {
		o.Clock = clock.Real()
	}
	if o.Rand == nil {
		o.Rand = rnd.Crypto()
	}
	if o.Log == nil {
		o.Log = logx.Discard()
	}
	return nil
}

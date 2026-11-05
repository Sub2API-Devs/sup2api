package accounts

// This file is FROZEN (written by the foundation writer). Writer A
// implements the Manager in the other files of this package and must not
// change Options; changes go through the coordinator.

import (
	"errors"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/config"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/hoststate"
	"ccgateway/controller/internal/keylock"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/rnd"
	"ccgateway/controller/internal/sessionstate"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/workeradmin"
)

// Options are the Manager's dependencies; every test double the Python
// tests patched is a field here (02 §8.4).
type Options struct {
	Config config.Config
	Store  *store.Store
	Guard  guardapi.Client

	// Images are the target images (shared with admin); DiskQuota the
	// observed quota support (shared with admin's /health).
	Images    *hoststate.Images
	DiskQuota *hoststate.DiskQuota

	// Locks are the account locks (shared with updates and cleanup through
	// the Manager's Lock method). nil: keylock.New().
	Locks *keylock.Locks
	// Clock drives every wait (activation 30 x 0.2 s, Xray readiness
	// 40 x 0.25 s, background loops). nil: clock.Real().
	Clock clock.Clock
	// Rand picks subnets, addresses, keys and names. nil: rnd.Crypto().
	Rand rnd.Source
	// Resolver pins proxy hosts (N5, Q2). nil: netplan.SystemResolver().
	Resolver netplan.Resolver
	// Worker calls Workers' admin ports; its Port is the WorkerPort
	// (patch('manager.ACCOUNT_PORT')) and its Dial the WorkerTransport.
	// nil: workeradmin.New() (port 8787).
	Worker *workeradmin.Client
	// BusinessRules is the account firewall text (patch('manager.business_rules')).
	// nil: netplan.BusinessRules.
	BusinessRules func(gatewayIP string) (string, error)
	// Log is the controller log. nil: logx.Discard().
	Log *logx.Logger
	// SessionState manages the accounts' session Valkey users
	// (SESSION-MEMORY-TOOLS-USED-DESIGN.md §7.5). nil: no session state
	// (no password, no ACL user, no Worker settings).
	SessionState sessionstate.Admin
}

// Defaults fills the nil fields and checks the required ones.
func (o *Options) Defaults() error {
	if o.Store == nil || o.Guard == nil || o.Images == nil {
		return errors.New("accounts: Store, Guard and Images are required")
	}
	if o.DiskQuota == nil {
		o.DiskQuota = &hoststate.DiskQuota{}
	}
	if o.Locks == nil {
		o.Locks = keylock.New()
	}
	if o.Clock == nil {
		o.Clock = clock.Real()
	}
	if o.Rand == nil {
		o.Rand = rnd.Crypto()
	}
	if o.Resolver == nil {
		o.Resolver = netplan.SystemResolver()
	}
	if o.Worker == nil {
		o.Worker = workeradmin.New()
	}
	if o.BusinessRules == nil {
		o.BusinessRules = netplan.BusinessRules
	}
	if o.Log == nil {
		o.Log = logx.Discard()
	}
	return nil
}

// Package admin is health, the target images, the controller self-upgrade
// through the guard and the explicit gateway recreation (Python
// runtime_admin.py; R1, R17-R19, I1-I4, C1, C2, 02 §7.4, §7.5). Writer B
// implements it; see IMPLEMENTATION.md.
package admin

// This file is FROZEN (foundation writer).

import (
	"errors"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/config"
	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/hoststate"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/store"
)

// Options are the dependencies of New (implemented by writer B:
// func New(opts Options) (contract.Admin, error)).
type Options struct {
	Config    config.Config
	Host      contract.AdminHost
	Guard     guardapi.Client
	Store     *store.Store
	Images    *hoststate.Images
	DiskQuota *hoststate.DiskQuota
	Clock     clock.Clock // the 30 s cache of the gateway health fields
	Log       *logx.Logger
}

// Defaults fills the nil fields and checks the required ones.
func (o *Options) Defaults() error {
	if o.Host == nil || o.Guard == nil || o.Store == nil || o.Images == nil {
		return errors.New("admin: Host, Guard, Store and Images are required")
	}
	if o.DiskQuota == nil {
		o.DiskQuota = &hoststate.DiskQuota{}
	}
	if o.Clock == nil {
		o.Clock = clock.Real()
	}
	if o.Log == nil {
		o.Log = logx.Discard()
	}
	return nil
}

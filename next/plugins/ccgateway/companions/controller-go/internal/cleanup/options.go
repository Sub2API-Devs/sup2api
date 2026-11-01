// Package cleanup is the owned runtime inventory and the identity-checked
// keep-list cleanup (Python cleanup.py; X1-X5, R20, R21). Writer B
// implements it; see IMPLEMENTATION.md.
package cleanup

// This file is FROZEN (foundation writer).

import (
	"errors"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/store"
)

// Options are the dependencies of New (implemented by writer B:
// func New(opts Options) (contract.Cleanup, error)).
type Options struct {
	Host   contract.CleanupHost
	Guard  guardapi.Client
	Store  *store.Store
	Prefix string
	Log    *logx.Logger
}

// Defaults fills the nil fields and checks the required ones.
func (o *Options) Defaults() error {
	if o.Host == nil || o.Guard == nil || o.Store == nil || o.Prefix == "" {
		return errors.New("cleanup: Host, Guard, Store and Prefix are required")
	}
	if o.Log == nil {
		o.Log = logx.Discard()
	}
	return nil
}

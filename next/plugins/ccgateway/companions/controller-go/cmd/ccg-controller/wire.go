//go:build ccgwired

package main

import (
	"errors"

	"ccgateway/controller/internal/accounts"
	"ccgateway/controller/internal/admin"
	"ccgateway/controller/internal/cleanup"
	"ccgateway/controller/internal/updates"
	"ccgateway/controller/internal/uploads"
)

// errNotWired is never returned by this build.
var errNotWired = errors.New("serve is not wired")

// build wires the business packages (IMPLEMENTATION.md §1). The accounts
// Manager is the host of updates, cleanup and admin. accounts.New reads the
// shared gateway state (an unknown schema fails the start).
//
// The coordinator removes the ccgwired tag (and wire_pending.go) after
// merging writers A and B.
func build(d deps) (*services, error) {
	m, err := accounts.New(accounts.Options{Config: d.Config, Store: d.Store, Guard: d.Guard, Images: d.Images,
		DiskQuota: d.DiskQuota, Worker: d.Worker, Log: d.Log})
	if err != nil {
		return nil, err
	}
	up, err := updates.New(updates.Options{Host: m, Guard: d.Guard, Store: d.Store, Worker: d.Worker, Log: d.Log})
	if err != nil {
		return nil, err
	}
	dir, err := d.Store.UploadsPath()
	if err != nil {
		return nil, err
	}
	ul, err := uploads.New(uploads.Options{Dir: dir, Images: d.Guard, Log: d.Log})
	if err != nil {
		return nil, err
	}
	cl, err := cleanup.New(cleanup.Options{Host: m, Guard: d.Guard, Store: d.Store, Prefix: d.Config.Prefix, Log: d.Log})
	if err != nil {
		return nil, err
	}
	ad, err := admin.New(admin.Options{Config: d.Config, Host: m, Guard: d.Guard, Store: d.Store, Images: d.Images,
		DiskQuota: d.DiskQuota, Log: d.Log})
	if err != nil {
		return nil, err
	}
	return &services{Accounts: m, Updates: up, Uploads: ul, Cleanup: cl, Admin: ad}, nil
}

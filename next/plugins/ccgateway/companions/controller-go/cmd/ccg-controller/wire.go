package main

import (
	"ccgateway/controller/internal/accounts"
	"ccgateway/controller/internal/admin"
	"ccgateway/controller/internal/cleanup"
	"ccgateway/controller/internal/updates"
	"ccgateway/controller/internal/uploads"
)

// build wires the business packages (IMPLEMENTATION.md §1). The accounts
// Manager is the host of updates, cleanup and admin. accounts.New reads the
// shared gateway state (an unknown schema fails the start).
func build(d deps) (*services, error) {
	m, err := accounts.New(accounts.Options{Config: d.Config, Store: d.Store, Guard: d.Guard, Images: d.Images,
		DiskQuota: d.DiskQuota, Worker: d.Worker, Log: d.Log, SessionState: d.SessionState})
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
		DiskQuota: d.DiskQuota, Log: d.Log, SessionState: d.SessionState})
	if err != nil {
		return nil, err
	}
	return &services{Accounts: m, Updates: up, Uploads: ul, Cleanup: cl, Admin: ad}, nil
}

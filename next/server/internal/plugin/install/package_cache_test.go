package install

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/blobs"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
)

// Every node checks its own cache against the package store: a package
// removed from the store is gone on each node that had it unpacked, also
// while many requests read it at once, and is back on each once stored
// again. Concurrent reads racing a removal and a re-store see either the
// package or ErrPackageGone, nothing else.
func TestPackageCacheFollowsTheStoreOnEveryNode(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	m := pkgtest.Minimal("mini", "0.1.0", "sub2api")
	m.Description = manifest.LocalizedText{"en": "package cache across nodes"} // a package no other test shares
	data := pkgtest.Build(m, e.root)
	r, err := e.svc.Upload(ctx, data, e.admin, UploadOptions{})
	if err != nil {
		t.Fatal(err)
	}
	other := New(e.svc.d, e.svc.opt) // another node: same database and store, its own cache
	nodes := []*Service{e.svc, other}
	store := e.svc.d.Packages.Store
	file := filepath.Join(string(store.(blobs.Dir)), r.PackageSHA256[:2], r.PackageSHA256)

	read := func(want bool) {
		t.Helper()
		var wg sync.WaitGroup
		errs := make(chan error, 16*len(nodes))
		for _, n := range nodes {
			for range 16 {
				wg.Add(1)
				go func() {
					defer wg.Done()
					_, err := n.Package(ctx, "mini", "0.1.0")
					errs <- err
				}()
			}
		}
		wg.Wait()
		close(errs)
		for err := range errs {
			if want && !isGone(err) || !want && err != nil {
				t.Fatalf("package = %v, want gone %v", err, want)
			}
		}
	}
	read(false) // both nodes cache it
	if err := os.Remove(file); err != nil {
		t.Fatal(err)
	}
	read(true)
	if err := store.Put(ctx, r.PackageSHA256, data); err != nil {
		t.Fatal(err)
	}
	read(false)

	var wg sync.WaitGroup
	stop := make(chan struct{})
	wg.Add(1)
	go func() {
		defer wg.Done()
		for range 20 {
			_ = os.Remove(file)
			_ = store.Put(ctx, r.PackageSHA256, data)
		}
		close(stop)
	}()
	for _, n := range nodes {
		for range 4 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for {
					select {
					case <-stop:
						return
					default:
					}
					if _, err := n.Package(ctx, "mini", "0.1.0"); err != nil && !isGone(err) {
						t.Errorf("package while it is removed and stored again: %v", err)
						return
					}
				}
			}()
		}
	}
	wg.Wait()
}

func isGone(err error) bool {
	var ce *core.Error
	return errors.As(err, &ce) && ce.Code == ErrPackageGone.Code
}

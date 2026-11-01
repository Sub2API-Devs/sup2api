// Package hoststate is controller-wide state that several business packages
// share: the target images for new containers (with the 30 s cache of the
// app image's ID) and the observed disk quota support. Package admin writes
// the targets (PUT /runtime/images); accounts reads them; admin reports both
// in /health.
//
// FROZEN.
package hoststate

import (
	"context"
	"sync"
	"time"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/store"
)

// ImageCacheTTL is IMAGE_CACHE_SECONDS.
const ImageCacheTTL = 30 * time.Second

// Disk quota support values (R1 disk_quota.support).
const (
	QuotaUnknown     = "unknown"
	QuotaAvailable   = "available"
	QuotaUnavailable = "unavailable"
)

// Images are the target images (M3, M7, S4, I1-I4).
type Images struct {
	mu        sync.Mutex
	clock     clock.Clock
	envApp    string
	envEgress string
	app       string
	egress    string
	seenAt    time.Time
	seenID    string
}

// NewImages restores the targets from runtime.json against the
// environment's CCG_APP_IMAGE and CCG_EGRESS_IMAGE (store.RestoreRuntimeImages).
func NewImages(st *store.Store, envApp, envEgress string, c clock.Clock) (*Images, error) {
	app, egress, err := st.RestoreRuntimeImages(envApp, envEgress)
	if err != nil {
		return nil, err
	}
	return &Images{clock: c, envApp: envApp, envEgress: envEgress, app: app, egress: egress}, nil
}

// Targets are the current (app, egress) targets.
func (i *Images) Targets() (app, egress string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.app, i.egress
}

// App is the current app target.
func (i *Images) App() string {
	a, _ := i.Targets()
	return a
}

// Egress is the current egress target.
func (i *Images) Egress() string {
	_, e := i.Targets()
	return e
}

// Env is the environment's (app, egress) at start.
func (i *Images) Env() (app, egress string) { return i.envApp, i.envEgress }

// Set persists new targets (runtime.json) and clears the image ID cache.
// The caller holds the runtime lock and has validated both images.
func (i *Images) Set(st *store.Store, app, egress string) error {
	i.mu.Lock()
	defer i.mu.Unlock()
	if err := st.SaveRuntimeImages(app, egress, i.envApp, i.envEgress); err != nil {
		return err
	}
	i.app, i.egress = app, egress
	i.seenAt, i.seenID = time.Time{}, ""
	return nil
}

// AppImageID is Manager.app_image_id: the target app image's ID, resolved
// at most every 30 s through inspect (which must not pull). An error is
// returned as is and not cached.
func (i *Images) AppImageID(ctx context.Context, inspect func(ctx context.Context, ref string) (string, error)) (string, error) {
	i.mu.Lock()
	now := i.clock.Now()
	if i.seenID != "" && now.Sub(i.seenAt) <= ImageCacheTTL {
		id := i.seenID
		i.mu.Unlock()
		return id, nil
	}
	ref := i.app
	i.mu.Unlock()
	id, err := inspect(ctx, ref)
	if err != nil {
		return "", err
	}
	i.mu.Lock()
	if i.app == ref {
		i.seenAt, i.seenID = i.clock.Now(), id
	}
	i.mu.Unlock()
	return id, nil
}

// DiskQuota is the disk quota support observed by this process.
type DiskQuota struct {
	mu    sync.Mutex
	value string
}

// Get is unknown, available or unavailable.
func (d *DiskQuota) Get() string {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.value == "" {
		return QuotaUnknown
	}
	return d.value
}

// Set records an observation.
func (d *DiskQuota) Set(v string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.value = v
}

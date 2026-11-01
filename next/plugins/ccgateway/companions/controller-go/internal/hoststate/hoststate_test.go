package hoststate

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/store"
)

// covers: M3 I1 I2 I3 S4 (targets, persistence, the 30 s image ID cache)
func TestImages(t *testing.T) {
	st, err := store.Open(filepath.Join(t.TempDir(), "r"))
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	fc := clock.NewFake(time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC))
	im, err := NewImages(st, "app:1", "egress:1", fc)
	if err != nil {
		t.Fatal(err)
	}
	if a, e := im.Targets(); a != "app:1" || e != "egress:1" || im.App() != "app:1" || im.Egress() != "egress:1" {
		t.Fatal("environment")
	}
	calls := 0
	inspect := func(_ context.Context, ref string) (string, error) {
		calls++
		return "sha256:" + ref, nil
	}
	for i := 0; i < 3; i++ {
		if id, _ := im.AppImageID(context.Background(), inspect); id != "sha256:app:1" {
			t.Fatal(id)
		}
	}
	fc.Advance(31 * time.Second)
	im.AppImageID(context.Background(), inspect)
	if calls != 2 {
		t.Fatalf("cached for 30 s: %d calls", calls)
	}
	if err := im.Set(st, "app:2", "egress:2"); err != nil {
		t.Fatal(err)
	}
	if id, _ := im.AppImageID(context.Background(), inspect); id != "sha256:app:2" || calls != 3 {
		t.Fatal("Set clears the cache")
	}
	again, _ := NewImages(st, "app:1", "egress:1", fc)
	if again.App() != "app:2" {
		t.Fatal("restored across restart")
	}
	if a, e := again.Env(); a != "app:1" || e != "egress:1" {
		t.Fatal("Env")
	}
	failing := func(context.Context, string) (string, error) { return "", errors.New("guard down") }
	fresh, _ := NewImages(st, "app:9", "egress:9", fc)
	if _, err := fresh.AppImageID(context.Background(), failing); err == nil {
		t.Fatal("errors are returned")
	}
	if id, _ := fresh.AppImageID(context.Background(), inspect); id != "sha256:app:9" {
		t.Fatal("errors are not cached")
	}
}

// covers: R1 PV9 (disk quota support is unknown until observed)
func TestDiskQuota(t *testing.T) {
	var d DiskQuota
	if d.Get() != QuotaUnknown {
		t.Fatal(d.Get())
	}
	d.Set(QuotaUnavailable)
	if d.Get() != QuotaUnavailable {
		t.Fatal(d.Get())
	}
}

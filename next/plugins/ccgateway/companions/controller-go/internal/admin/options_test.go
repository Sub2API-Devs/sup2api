package admin

import (
	"path/filepath"
	"testing"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/hoststate"
	"ccgateway/controller/internal/store"
)

type host struct{ contract.AdminHost }

// covers: 02-§8.4 (admin's dependencies and defaults)
func TestOptionsDefaults(t *testing.T) {
	var o Options
	if o.Defaults() == nil {
		t.Fatal("required fields")
	}
	st, err := store.Open(filepath.Join(t.TempDir(), "r"))
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	im, _ := hoststate.NewImages(st, "a:1", "e:1", clock.Real())
	o = Options{Host: &host{}, Guard: fakeguard.New().Client(), Store: st, Images: im}
	if err := o.Defaults(); err != nil || o.DiskQuota == nil || o.Clock == nil || o.Log == nil {
		t.Fatal(o, err)
	}
}

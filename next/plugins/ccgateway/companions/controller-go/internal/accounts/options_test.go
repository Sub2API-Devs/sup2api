package accounts

import (
	"path/filepath"
	"testing"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/hoststate"
	"ccgateway/controller/internal/store"
)

// covers: 02-§8.4 (every patched dependency has a production default)
func TestOptionsDefaults(t *testing.T) {
	var o Options
	if o.Defaults() == nil {
		t.Fatal("Store, Guard and Images are required")
	}
	st, err := store.Open(filepath.Join(t.TempDir(), "r"))
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	im, _ := hoststate.NewImages(st, "app:1", "egress:1", clock.Real())
	o = Options{Store: st, Guard: fakeguard.New().Client(), Images: im}
	if err := o.Defaults(); err != nil {
		t.Fatal(err)
	}
	if o.Locks == nil || o.Clock == nil || o.Rand == nil || o.Resolver == nil || o.Worker == nil || o.Worker.Port != 8787 ||
		o.BusinessRules == nil || o.Log == nil || o.DiskQuota == nil {
		t.Fatalf("%+v", o)
	}
	if rules, err := o.BusinessRules("10.0.0.2"); err != nil || rules == "" {
		t.Fatal("netplan.BusinessRules is the default")
	}
}

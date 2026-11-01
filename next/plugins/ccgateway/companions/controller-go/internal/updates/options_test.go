package updates

import (
	"path/filepath"
	"testing"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/store"
)

type host struct{ contract.UpdateHost }

// covers: 02-§8.4 (updates' dependencies and defaults)
func TestOptionsDefaults(t *testing.T) {
	var o Options
	if o.Defaults() == nil {
		t.Fatal("Host, Guard and Store are required")
	}
	st, err := store.Open(filepath.Join(t.TempDir(), "r"))
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	o = Options{Host: &host{}, Guard: fakeguard.New().Client(), Store: st}
	if err := o.Defaults(); err != nil || o.Worker == nil || o.Clock == nil || o.Rand == nil || o.Log == nil {
		t.Fatal(o, err)
	}
}

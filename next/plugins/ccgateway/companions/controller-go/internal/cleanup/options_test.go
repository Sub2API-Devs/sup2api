package cleanup

import (
	"path/filepath"
	"testing"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/store"
)

type host struct{ contract.CleanupHost }

// covers: 02-§8.4 (cleanup's dependencies and defaults)
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
	o = Options{Host: &host{}, Guard: fakeguard.New().Client(), Store: st, Prefix: "ccg"}
	if err := o.Defaults(); err != nil || o.Log == nil {
		t.Fatal(o, err)
	}
}

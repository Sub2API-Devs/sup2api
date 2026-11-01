package uploads

import (
	"testing"

	"ccgateway/controller/internal/guardapi/fakeguard"
)

// covers: 02-§8.4 (uploads' dependencies and defaults)
func TestOptionsDefaults(t *testing.T) {
	var o Options
	if o.Defaults() == nil {
		t.Fatal("Dir and Images are required")
	}
	o = Options{Dir: t.TempDir(), Images: fakeguard.New().Client()}
	if err := o.Defaults(); err != nil || o.Clock == nil || o.Rand == nil || o.Log == nil {
		t.Fatal(o, err)
	}
}

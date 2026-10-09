package blobs

import (
	"context"
	"errors"
	"testing"
)

// Packages may be 1 GiB (the ccgateway runtime images, CONTRACTS §53.10).
func TestLimitsDefaultToOneGiB(t *testing.T) {
	s := NewShell("unused.sock", "", 0)
	if s.max != 1<<30 || s.client.Timeout != shellTimeout || shellTimeout.Minutes() < 30 {
		t.Fatalf("shell: max %d, timeout %s", s.max, s.client.Timeout)
	}
	if s = NewShell("unused.sock", "", 2<<30); s.max != 2<<30 {
		t.Fatalf("configured max: %d", s.max)
	}
	var limit int64
	src := &Source{Store: Dir(t.TempDir()), Download: func(_ context.Context, _ string, l int64) ([]byte, error) {
		limit = l
		return nil, errors.New("offline")
	}}
	_, _ = src.Fetch(context.Background(), sumOf([]byte("x")), "https://market/x")
	if limit != 1<<30 {
		t.Fatalf("download limit without MaxBytes: %d", limit)
	}
	src.MaxBytes = 300 << 20
	_, _ = src.Fetch(context.Background(), sumOf([]byte("x")), "https://market/x")
	if limit != 300<<20 {
		t.Fatalf("configured download limit: %d", limit)
	}
}

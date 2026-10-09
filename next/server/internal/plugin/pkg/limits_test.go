package pkg

import (
	"archive/zip"
	"bytes"
	"io"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
)

// The ccgateway package carries its runtime images (CONTRACTS §53.10):
// packages up to 1 GiB compressed and 2 GiB unpacked.
func TestDefaultLimitsFitBundledImages(t *testing.T) {
	if DefaultMaxPackageBytes != 1<<30 || DefaultMaxUnpackedBytes != 2<<30 {
		t.Fatalf("defaults: %d / %d", DefaultMaxPackageBytes, DefaultMaxUnpackedBytes)
	}
	if config.DefaultPluginMaxPackageBytes != DefaultMaxPackageBytes {
		t.Fatalf("config default %d differs from the unpack default %d", config.DefaultPluginMaxPackageBytes, DefaultMaxPackageBytes)
	}
	l := Limits{}.withDefaults()
	if l.MaxPackageBytes != 1<<30 || l.MaxUnpackedBytes != 2<<30 {
		t.Fatalf("zero limits: %+v", l)
	}
}

// zeroZip is a zip with one stored entry of size zero bytes.
func zeroZip(t *testing.T, size int64) []byte {
	t.Helper()
	var buf bytes.Buffer
	buf.Grow(int(size) + 1024)
	zw := zip.NewWriter(&buf)
	w, err := zw.CreateHeader(&zip.FileHeader{Name: "images/app.tar.gz", Method: zip.Store})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := io.CopyN(w, zeros{}, size); err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

type zeros struct{}

func (zeros) Read(p []byte) (int, error) {
	clear(p)
	return len(p), nil
}

// A package above the former 200 MiB limit unpacks with the default limits.
func TestUnpackAcceptsPackagesAboveTheFormerLimit(t *testing.T) {
	data := zeroZip(t, 201<<20)
	if len(data) <= 200<<20 || len(data) >= 1<<30 {
		t.Fatalf("package size %d", len(data))
	}
	files, err := Unpack(data, Limits{})
	if err != nil {
		t.Fatalf("default limits: %v", err)
	}
	if n := len(files["images/app.tar.gz"]); n != 201<<20 {
		t.Fatalf("entry size %d", n)
	}
}

// The limits are inclusive: exactly the limit passes, one byte more fails.
func TestUnpackLimitBoundaries(t *testing.T) {
	data := zeroZip(t, 4096)
	if _, err := Unpack(data, Limits{MaxPackageBytes: int64(len(data))}); err != nil {
		t.Fatalf("package at the limit: %v", err)
	}
	if _, err := Unpack(data, Limits{MaxPackageBytes: int64(len(data)) - 1}); err == nil {
		t.Fatal("package above the limit accepted")
	}
	if _, err := Unpack(data, Limits{MaxUnpackedBytes: 4096}); err != nil {
		t.Fatalf("unpacked at the limit: %v", err)
	}
	if _, err := Unpack(data, Limits{MaxUnpackedBytes: 4095}); err == nil {
		t.Fatal("unpacked above the limit accepted")
	}
}

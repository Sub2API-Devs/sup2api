package proxy

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"testing"
)

func TestIsBlockedUpstreamIP(t *testing.T) {
	t.Parallel()
	blocked := []string{
		"127.0.0.1", "127.9.9.9", "::1",
		"10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1",
		"fc00::1", "fd12:3456::1", // IPv6 ULA
		"169.254.169.254", "fe80::1", "fe80::1%eth0",
		"0.0.0.0", "::", "0.1.2.3",
		"224.0.0.1", "239.255.255.250", "ff02::1", "ff05::2",
		"100.64.0.1", "255.255.255.255", "240.0.0.1",
		"::ffff:127.0.0.1", "::ffff:10.0.0.1", "::127.0.0.1",
		"2002:0a00:0001::1", "fec0::1",
	}
	allowed := []string{
		"8.8.8.8", "1.1.1.1", "104.18.32.7", "172.32.0.1", "192.169.0.1", "100.128.0.1",
		"2606:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8",
	}
	for _, s := range blocked {
		if !IsBlockedUpstreamIP(netip.MustParseAddr(s)) {
			t.Errorf("%s should be blocked", s)
		}
	}
	for _, s := range allowed {
		if IsBlockedUpstreamIP(netip.MustParseAddr(s)) {
			t.Errorf("%s should be allowed", s)
		}
	}
	if !IsBlockedUpstreamIP(netip.Addr{}) {
		t.Error("invalid address allowed")
	}
}

func TestGuardControl(t *testing.T) {
	t.Parallel()
	for addr, want := range map[string]bool{
		"127.0.0.1:443":         false,
		"[::1]:443":             false,
		"[fe80::1%eth0]:80":     false,
		"10.0.0.8:80":           false,
		"not-an-address":        false,
		"93.184.215.14:443":     true,
		"[2606:4700::1111]:443": true,
	} {
		err := guardControl("tcp", addr, nil)
		var pe *PrivateAddressError
		if want && err != nil {
			t.Errorf("%s: unexpected %v", addr, err)
		}
		if !want && !errors.As(err, &pe) {
			t.Errorf("%s: want PrivateAddressError, got %v", addr, err)
		}
	}
}

// TestDirectClientGuard: the direct client refuses a loopback upstream unless
// AllowPrivate is set.
func TestDirectClientGuard(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = io.WriteString(w, "ok")
	}))
	defer srv.Close()
	ctx := context.Background()

	guarded, err := New(nil, nil, nil, Options{}).HTTPClient(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL, nil)
	resp, err := guarded.Do(req)
	if err == nil {
		_ = resp.Body.Close()
		t.Fatal("loopback upstream reached through the guarded direct client")
	}
	var pe *PrivateAddressError
	if !errors.As(err, &pe) {
		t.Fatalf("want PrivateAddressError, got %v", err)
	}

	open, err := New(nil, nil, nil, Options{AllowPrivate: true}).HTTPClient(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	req, _ = http.NewRequestWithContext(ctx, http.MethodGet, srv.URL, nil)
	resp, err = open.Do(req)
	if err != nil {
		t.Fatalf("AllowPrivate: %v", err)
	}
	b, _ := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if string(b) != "ok" {
		t.Fatalf("body %q", b)
	}
}

package netguard

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"testing"
)

func TestBlockedAddr(t *testing.T) {
	t.Parallel()
	blocked := []string{
		"127.0.0.1", "127.9.9.9", "::1",
		"10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1",
		"fc00::1", "fd12:3456::1",
		"169.254.169.254", "fe80::1", "fe80::1%eth0",
		"0.0.0.0", "::", "0.1.2.3",
		"224.0.0.1", "239.255.255.250", "ff02::1", "ff05::2",
		"100.64.0.1", "255.255.255.255", "240.0.0.1",
		"::ffff:127.0.0.1", "::ffff:10.0.0.1", "::127.0.0.1",
		// Ranges that embed IPv4 (one list used to miss each of these).
		"2002:7f00:1::", "2002:0a00:0001::1", "64:ff9b::7f00:1", "64:ff9b:1::1", "2001:0:4136:e378::1",
		"fec0::1", "100::1", "192.0.2.1", "198.51.100.7", "203.0.113.9", "2001:db8::1",
	}
	allowed := []string{
		"8.8.8.8", "1.1.1.1", "104.18.32.7", "172.32.0.1", "192.169.0.1", "100.128.0.1",
		"2606:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8",
	}
	for _, s := range blocked {
		if !BlockedAddr(netip.MustParseAddr(s)) {
			t.Errorf("%s should be blocked", s)
		}
	}
	for _, s := range allowed {
		if BlockedAddr(netip.MustParseAddr(s)) {
			t.Errorf("%s should be allowed", s)
		}
	}
	if !BlockedAddr(netip.Addr{}) {
		t.Error("invalid address allowed")
	}
}

func TestDialControl(t *testing.T) {
	t.Parallel()
	for addr, want := range map[string]bool{
		"127.0.0.1:443":         false,
		"[::1]:443":             false,
		"[fe80::1%eth0]:80":     false,
		"10.0.0.8:80":           false,
		"[2002:7f00:1::]:80":    false,
		"not-an-address":        false,
		"93.184.215.14:443":     true,
		"[2606:4700::1111]:443": true,
	} {
		err := DialControl("tcp", addr, nil)
		if want && err != nil {
			t.Errorf("%s: unexpected %v", addr, err)
		}
		if !want && !errors.Is(err, ErrPrivate) {
			t.Errorf("%s: want ErrPrivate, got %v", addr, err)
		}
	}
}

func staticLookup(m map[string][]string) Lookup {
	return func(_ context.Context, host string) ([]net.IP, error) {
		ips, ok := m[host]
		if !ok {
			return nil, &net.DNSError{Err: "no such host", Name: host, IsNotFound: true}
		}
		out := make([]net.IP, 0, len(ips))
		for _, s := range ips {
			out = append(out, net.ParseIP(s))
		}
		return out, nil
	}
}

func TestCheckURLAndHost(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	look := staticLookup(map[string][]string{
		"public.example": {"93.184.215.14"},
		"rebind.example": {"93.184.215.14", "127.0.0.1"},
		"six.example":    {"2002:7f00:1::"},
	})
	cases := map[string]error{
		"https://public.example/x":   nil,
		"https://rebind.example/x":   ErrPrivate,
		"https://six.example/x":      ErrPrivate,
		"http://127.0.0.1:6379/":     ErrPrivate,
		"http://[::1]/":              ErrPrivate,
		"http://localhost/":          ErrPrivate,
		"http://a.localhost/":        ErrPrivate,
		"http://169.254.169.254/":    ErrPrivate,
		"ftp://public.example/":      ErrBadURL,
		"https://u:p@public.example": ErrBadURL,
	}
	for raw, want := range cases {
		_, err := CheckURL(ctx, raw, false, look)
		if want == nil && err != nil || want != nil && !errors.Is(err, want) {
			t.Errorf("%s: got %v, want %v", raw, err, want)
		}
	}
	// Unresolvable names are refused rather than let through.
	if err := CheckHost(ctx, "missing.example", look); err == nil {
		t.Error("unresolvable host accepted")
	}
	if _, err := CheckURL(ctx, "http://127.0.0.1/", true, look); err != nil {
		t.Errorf("allowPrivate: %v", err)
	}
	for host, want := range map[string]bool{
		"127.0.0.1": true, "[::1]": true, "LOCALHOST.": true, "x.localhost": true, "": true, "10.0.0.1": true,
		"8.8.8.8": false, "proxy.example": false, "2606:4700::1111": false,
	} {
		if got := LiteralPrivate(host); got != want {
			t.Errorf("LiteralPrivate(%q) = %v", host, got)
		}
	}
}

func TestClientRefusesPrivateTargetsAndRedirects(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("secret"))
	}))
	defer srv.Close()

	c := NewClient(ClientOptions{})
	resp, err := c.Get(srv.URL)
	if err == nil {
		resp.Body.Close()
		t.Fatal("guarded client reached a loopback server")
	}
	if !errors.Is(err, ErrPrivate) {
		t.Fatalf("want ErrPrivate, got %v", err)
	}

	// With private targets allowed, a redirect to another private target is
	// still checked hop by hop (here: allowed), and the hop limit applies.
	loop := httptest.NewServer(nil)
	loop.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, loop.URL+"/again", http.StatusFound)
	})
	defer loop.Close()
	open := NewClient(ClientOptions{AllowPrivate: true, MaxRedirects: 2})
	if resp, err := open.Get(loop.URL); err == nil {
		resp.Body.Close()
		t.Fatal("redirect loop followed")
	} else if !errors.Is(err, ErrTooManyRedirects) {
		t.Fatalf("want ErrTooManyRedirects, got %v", err)
	}

	// A redirect from an allowed hop to a private one is refused before dialing.
	look := staticLookup(map[string][]string{"internal.example": {"10.0.0.5"}})
	check := redirectCheck(ClientOptions{Lookup: look, MaxRedirects: 5})
	req, _ := http.NewRequest(http.MethodGet, "http://internal.example/", nil)
	if err := check(req, []*http.Request{{}}); !errors.Is(err, ErrPrivate) {
		t.Fatalf("redirect to private name: %v", err)
	}
}

package netguard

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/netip"
	"syscall"
	"time"
)

// AddrError is returned by DialControl when a connection would reach a
// non-public address. It matches ErrPrivate with errors.Is. The check runs
// on the resolved address at dial time, so DNS rebinding cannot bypass it.
type AddrError struct {
	Address string // "ip:port" the dialer was about to connect to
}

func (e *AddrError) Error() string {
	return "address " + e.Address + " is private, loopback or otherwise non-public and not allowed"
}

// Is makes errors.Is(err, ErrPrivate) true.
func (e *AddrError) Is(target error) bool { return target == ErrPrivate }

// DialControl is a net.Dialer.Control that refuses non-public addresses.
// address is the resolved "ip:port"; anything unparsable is refused.
func DialControl(_, address string, _ syscall.RawConn) error {
	ap, err := netip.ParseAddrPort(address)
	if err != nil || BlockedAddr(ap.Addr()) {
		return &AddrError{Address: address}
	}
	return nil
}

// Dialer returns a dialer that refuses non-public addresses unless
// allowPrivate.
func Dialer(timeout time.Duration, allowPrivate bool) *net.Dialer {
	d := &net.Dialer{Timeout: timeout, KeepAlive: 30 * time.Second}
	if !allowPrivate {
		d.Control = DialControl
	}
	return d
}

// ClientOptions configure NewClient. Zero values select the defaults.
type ClientOptions struct {
	// AllowPrivate disables the address checks (test setups only).
	AllowPrivate bool
	// Timeout bounds a whole request (default 30 s).
	Timeout time.Duration
	// MaxRedirects is the number of redirects followed (default 5; <0 = none).
	MaxRedirects int
	// Lookup resolves names for the per-hop redirect check (default
	// DefaultLookup).
	Lookup Lookup
}

// ErrTooManyRedirects is returned when a guarded client stops following.
var ErrTooManyRedirects = errors.New("too many redirects")

// NewClient returns an http.Client for server-side fetches of addresses an
// operator or a plugin supplied: direct connections only (no environment
// proxy), every dial refused for non-public addresses, and every redirect
// target checked again before it is followed.
func NewClient(o ClientOptions) *http.Client {
	if o.Timeout <= 0 {
		o.Timeout = 30 * time.Second
	}
	if o.MaxRedirects == 0 {
		o.MaxRedirects = 5
	}
	tr := &http.Transport{
		DialContext:           Dialer(15*time.Second, o.AllowPrivate).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          16,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   15 * time.Second,
		ResponseHeaderTimeout: o.Timeout,
	}
	return &http.Client{Transport: tr, Timeout: o.Timeout, CheckRedirect: redirectCheck(o)}
}

func redirectCheck(o ClientOptions) func(*http.Request, []*http.Request) error {
	return func(req *http.Request, via []*http.Request) error {
		if len(via) > o.MaxRedirects {
			return ErrTooManyRedirects
		}
		ctx := req.Context()
		if ctx == nil {
			ctx = context.Background()
		}
		_, err := CheckURL(ctx, req.URL.String(), o.AllowPrivate, o.Lookup)
		return err
	}
}

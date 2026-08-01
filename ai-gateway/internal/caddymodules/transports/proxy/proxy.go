package proxy

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/caddyserver/caddy/v2"
)

func init() {
	caddy.RegisterModule(new(Transport))
}

// Transport pools connections per opaque proxy URL. Proxy credentials arrive
// only in the short-lived execution plan and cache keys are SHA-256 digests so
// plaintext credentials are never used as map keys or log fields.
type Transport struct {
	ResponseHeaderTimeout caddy.Duration `json:"response_header_timeout,omitempty"`
	MaxIdleConns          int            `json:"max_idle_conns,omitempty"`
	MaxIdleConnsPerHost   int            `json:"max_idle_conns_per_host,omitempty"`
	MaxProfiles           int            `json:"max_profiles,omitempty"`

	mu         sync.Mutex
	transports map[[sha256.Size]byte]*http.Transport
}

func (*Transport) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "sup2api.transports.proxy", New: func() caddy.Module { return new(Transport) }}
}

func (t *Transport) Provision(caddy.Context) error {
	if t.ResponseHeaderTimeout == 0 {
		t.ResponseHeaderTimeout = caddy.Duration(10 * time.Minute)
	}
	if t.MaxIdleConns == 0 {
		t.MaxIdleConns = 2048
	}
	if t.MaxIdleConnsPerHost == 0 {
		t.MaxIdleConnsPerHost = 128
	}
	if t.MaxProfiles == 0 {
		t.MaxProfiles = 1024
	}
	if t.ResponseHeaderTimeout < 0 || t.MaxIdleConns < 0 || t.MaxIdleConnsPerHost < 0 || t.MaxProfiles <= 0 {
		return fmt.Errorf("invalid proxy transport limits")
	}
	t.transports = make(map[[sha256.Size]byte]*http.Transport)
	return nil
}

func (t *Transport) Transport(plan *controlv1.ExecutionPlan) (http.RoundTripper, error) {
	if t == nil || t.transports == nil {
		return nil, fmt.Errorf("proxy transport is not provisioned")
	}
	raw := strings.TrimSpace(plan.GetProxyUrl())
	proxyURL, err := url.Parse(raw)
	if err != nil || proxyURL.Host == "" {
		return nil, fmt.Errorf("execution plan contains an invalid proxy URL")
	}
	switch strings.ToLower(proxyURL.Scheme) {
	case "http", "https", "socks5", "socks5h":
	default:
		return nil, fmt.Errorf("execution plan contains an unsupported proxy scheme")
	}
	if proxyURL.Fragment != "" {
		return nil, fmt.Errorf("execution plan proxy URL must not contain a fragment")
	}
	digest := sha256.Sum256([]byte(raw))
	t.mu.Lock()
	defer t.mu.Unlock()
	if existing := t.transports[digest]; existing != nil {
		return existing, nil
	}
	if len(t.transports) >= t.MaxProfiles {
		return nil, fmt.Errorf("proxy transport profile capacity reached")
	}
	transport := &http.Transport{
		Proxy:                 http.ProxyURL(proxyURL),
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          t.MaxIdleConns,
		MaxIdleConnsPerHost:   t.MaxIdleConnsPerHost,
		IdleConnTimeout:       120 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: time.Duration(t.ResponseHeaderTimeout),
		ExpectContinueTimeout: time.Second,
	}
	t.transports[digest] = transport
	return transport, nil
}

func (t *Transport) Cleanup() error {
	if t == nil {
		return nil
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	for digest, transport := range t.transports {
		transport.CloseIdleConnections()
		delete(t.transports, digest)
	}
	return nil
}

var (
	_ caddy.Module       = (*Transport)(nil)
	_ caddy.Provisioner  = (*Transport)(nil)
	_ caddy.CleanerUpper = (*Transport)(nil)
)

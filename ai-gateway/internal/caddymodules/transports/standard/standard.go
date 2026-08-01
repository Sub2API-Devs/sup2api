package standard

import (
	"fmt"
	"net/http"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/caddyserver/caddy/v2"
)

func init() {
	caddy.RegisterModule(Transport{})
}

// Transport is the default pooled HTTP/1.1 + HTTP/2 upstream transport.
type Transport struct {
	ResponseHeaderTimeout caddy.Duration `json:"response_header_timeout,omitempty"`
	MaxIdleConns          int            `json:"max_idle_conns,omitempty"`
	MaxIdleConnsPerHost   int            `json:"max_idle_conns_per_host,omitempty"`

	transport *http.Transport
}

func (Transport) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "sup2api.transports.standard",
		New: func() caddy.Module { return new(Transport) },
	}
}

func (t *Transport) Provision(caddy.Context) error {
	responseHeaderTimeout := time.Duration(t.ResponseHeaderTimeout)
	if responseHeaderTimeout == 0 {
		responseHeaderTimeout = 10 * time.Minute
	}
	if responseHeaderTimeout < 0 {
		return fmt.Errorf("response_header_timeout must not be negative")
	}
	if t.MaxIdleConns == 0 {
		t.MaxIdleConns = 2048
	}
	if t.MaxIdleConnsPerHost == 0 {
		t.MaxIdleConnsPerHost = 512
	}
	if t.MaxIdleConns < 0 || t.MaxIdleConnsPerHost < 0 {
		return fmt.Errorf("idle connection limits must not be negative")
	}
	t.transport = &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          t.MaxIdleConns,
		MaxIdleConnsPerHost:   t.MaxIdleConnsPerHost,
		IdleConnTimeout:       120 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: responseHeaderTimeout,
		ExpectContinueTimeout: time.Second,
	}
	return nil
}

func (t *Transport) Transport(*controlv1.ExecutionPlan) (http.RoundTripper, error) {
	if t.transport == nil {
		return nil, fmt.Errorf("standard transport is not provisioned")
	}
	return t.transport, nil
}

func (t *Transport) Cleanup() error {
	if t.transport != nil {
		t.transport.CloseIdleConnections()
	}
	return nil
}

var (
	_ caddy.Module       = (*Transport)(nil)
	_ caddy.Provisioner  = (*Transport)(nil)
	_ caddy.CleanerUpper = (*Transport)(nil)
)

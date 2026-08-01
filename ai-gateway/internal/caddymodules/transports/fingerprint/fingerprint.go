package fingerprint

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/tlsfingerprint"
	"github.com/caddyserver/caddy/v2"
	"google.golang.org/protobuf/proto"
)

func init() {
	caddy.RegisterModule(new(Transport))
}

// Transport pools uTLS transports by an opaque digest of the immutable
// fingerprint snapshot and optional proxy credential. Plaintext proxy
// credentials are never retained as map keys or emitted to logs.
type Transport struct {
	ResponseHeaderTimeout caddy.Duration `json:"response_header_timeout,omitempty"`
	MaxIdleConns          int            `json:"max_idle_conns,omitempty"`
	MaxIdleConnsPerHost   int            `json:"max_idle_conns_per_host,omitempty"`
	MaxProfiles           int            `json:"max_profiles,omitempty"`

	mu         sync.Mutex
	transports map[[sha256.Size]byte]*http.Transport
}

func (*Transport) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "sup2api.transports.fingerprint", New: func() caddy.Module { return new(Transport) }}
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
		return fmt.Errorf("invalid TLS fingerprint transport limits")
	}
	t.transports = make(map[[sha256.Size]byte]*http.Transport)
	return nil
}

func (t *Transport) Transport(plan *controlv1.ExecutionPlan) (http.RoundTripper, error) {
	if t == nil || t.transports == nil {
		return nil, fmt.Errorf("TLS fingerprint transport is not provisioned")
	}
	if plan == nil || plan.GetTlsFingerprint() == nil {
		return nil, fmt.Errorf("execution plan does not contain a TLS fingerprint snapshot")
	}
	upstream, err := url.Parse(plan.GetUpstreamUrl())
	if err != nil || !strings.EqualFold(upstream.Scheme, "https") || upstream.Host == "" {
		return nil, fmt.Errorf("TLS fingerprint transport requires an HTTPS upstream")
	}
	profile, err := decodeProfile(plan.GetTlsFingerprint())
	if err != nil {
		return nil, err
	}
	proxyURL, err := parseProxyURL(plan.GetProxyUrl())
	if err != nil {
		return nil, err
	}
	digest, err := planDigest(plan.GetTlsFingerprint(), plan.GetProxyUrl())
	if err != nil {
		return nil, err
	}

	t.mu.Lock()
	defer t.mu.Unlock()
	if existing := t.transports[digest]; existing != nil {
		return existing, nil
	}
	if len(t.transports) >= t.MaxProfiles {
		return nil, fmt.Errorf("TLS fingerprint transport profile capacity reached")
	}
	transport, err := t.newTransport(profile, proxyURL)
	if err != nil {
		return nil, err
	}
	t.transports[digest] = transport
	return transport, nil
}

func (t *Transport) newTransport(profile *tlsfingerprint.Profile, proxyURL *url.URL) (*http.Transport, error) {
	transport := &http.Transport{
		ForceAttemptHTTP2:     false,
		MaxIdleConns:          t.MaxIdleConns,
		MaxIdleConnsPerHost:   t.MaxIdleConnsPerHost,
		IdleConnTimeout:       120 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: time.Duration(t.ResponseHeaderTimeout),
		ExpectContinueTimeout: time.Second,
	}
	if proxyURL == nil {
		transport.DialTLSContext = tlsfingerprint.NewDialer(profile, nil).DialTLSContext
		return transport, nil
	}
	switch strings.ToLower(proxyURL.Scheme) {
	case "http":
		transport.DialTLSContext = tlsfingerprint.NewHTTPProxyDialer(profile, proxyURL).DialTLSContext
	case "socks5", "socks5h":
		transport.DialTLSContext = tlsfingerprint.NewSOCKS5ProxyDialer(profile, proxyURL).DialTLSContext
	default:
		return nil, fmt.Errorf("TLS fingerprint transport does not support proxy scheme %q", proxyURL.Scheme)
	}
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

func parseProxyURL(raw string) (*url.URL, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" || parsed.Fragment != "" {
		return nil, fmt.Errorf("execution plan contains an invalid proxy URL")
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "socks5", "socks5h":
		return parsed, nil
	case "https":
		return nil, fmt.Errorf("HTTPS proxies cannot preserve the configured upstream TLS fingerprint")
	default:
		return nil, fmt.Errorf("execution plan contains an unsupported proxy scheme")
	}
}

func planDigest(profile *controlv1.TLSFingerprintProfile, proxyURL string) ([sha256.Size]byte, error) {
	encoded, err := proto.MarshalOptions{Deterministic: true}.Marshal(profile)
	if err != nil {
		return [sha256.Size]byte{}, fmt.Errorf("encode TLS fingerprint profile: %w", err)
	}
	encoded = append(encoded, 0)
	encoded = append(encoded, proxyURL...)
	return sha256.Sum256(encoded), nil
}

func decodeProfile(input *controlv1.TLSFingerprintProfile) (*tlsfingerprint.Profile, error) {
	if input == nil {
		return nil, fmt.Errorf("TLS fingerprint snapshot is required")
	}
	if len(input.GetAlpnProtocols()) > 16 {
		return nil, fmt.Errorf("TLS fingerprint contains too many ALPN protocols")
	}
	for _, protocol := range input.GetAlpnProtocols() {
		if protocol == "" || len(protocol) > 64 {
			return nil, fmt.Errorf("TLS fingerprint contains an invalid ALPN protocol")
		}
		if protocol != "http/1.1" {
			return nil, fmt.Errorf("TLS fingerprint transport currently requires HTTP/1.1 ALPN")
		}
	}
	convert := func(name string, values []uint32) ([]uint16, error) {
		if len(values) > 256 {
			return nil, fmt.Errorf("TLS fingerprint %s exceeds the item limit", name)
		}
		result := make([]uint16, len(values))
		for index, value := range values {
			if value > 0xffff {
				return nil, fmt.Errorf("TLS fingerprint %s contains an out-of-range value", name)
			}
			result[index] = uint16(value)
		}
		return result, nil
	}
	cipherSuites, err := convert("cipher suites", input.GetCipherSuites())
	if err != nil {
		return nil, err
	}
	curves, err := convert("curves", input.GetCurves())
	if err != nil {
		return nil, err
	}
	pointFormats, err := convert("point formats", input.GetPointFormats())
	if err != nil {
		return nil, err
	}
	signatures, err := convert("signature algorithms", input.GetSignatureAlgorithms())
	if err != nil {
		return nil, err
	}
	versions, err := convert("supported versions", input.GetSupportedVersions())
	if err != nil {
		return nil, err
	}
	keyShares, err := convert("key share groups", input.GetKeyShareGroups())
	if err != nil {
		return nil, err
	}
	pskModes, err := convert("PSK modes", input.GetPskModes())
	if err != nil {
		return nil, err
	}
	extensions, err := convert("extensions", input.GetExtensions())
	if err != nil {
		return nil, err
	}
	return &tlsfingerprint.Profile{
		Name: input.GetProfileKey(), EnableGREASE: input.GetEnableGrease(),
		CipherSuites: cipherSuites, Curves: curves, PointFormats: pointFormats,
		SignatureAlgorithms: signatures, ALPNProtocols: append([]string(nil), input.GetAlpnProtocols()...),
		SupportedVersions: versions, KeyShareGroups: keyShares, PSKModes: pskModes, Extensions: extensions,
	}, nil
}

var (
	_ caddy.Module       = (*Transport)(nil)
	_ caddy.Provisioner  = (*Transport)(nil)
	_ caddy.CleanerUpper = (*Transport)(nil)
)

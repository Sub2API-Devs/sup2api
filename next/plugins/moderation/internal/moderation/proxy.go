package moderation

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/jackc/pgx/v5"
)

// Channel proxies (new-api service/moderation/channel.go). The proxy URL may
// carry credentials, so it is sealed like the key (context channel:<id>:proxy)
// and shown redacted. A channel's client clones http.DefaultTransport after
// Init, which the SDK routes through the egress tunnel in strict mode, so the
// proxy itself is reached through the tunnel too.

// proxySchemes are the proxy URL schemes net/http supports.
var proxySchemes = map[string]bool{"http": true, "https": true, "socks5": true, "socks5h": true}

// parseProxy validates a proxy URL ("" = none).
func parseProxy(s string) (*url.URL, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}
	u, err := url.Parse(s)
	if err != nil || !proxySchemes[u.Scheme] || u.Host == "" || len(s) > 1000 {
		return nil, fmt.Errorf("proxy must be an http, https, socks5 or socks5h URL")
	}
	return u, nil
}

// redactProxy hides the password of a proxy URL.
func redactProxy(s string) string {
	u, err := url.Parse(s)
	if err != nil {
		return ""
	}
	return u.Redacted()
}

// proxyClients shares one client per proxy URL so reloading the snapshot
// does not leave connection pools behind.
type proxyClients struct {
	mu sync.Mutex
	m  map[string]*http.Client
}

// clientFor returns the client of a channel: the shared default client, or
// one going through the proxy.
func (p *Plugin) clientFor(proxy string) *http.Client {
	u, err := parseProxy(proxy)
	if err != nil || u == nil {
		return p.httpClient
	}
	pc := &p.proxies
	pc.mu.Lock()
	defer pc.mu.Unlock()
	if c := pc.m[proxy]; c != nil {
		return c
	}
	var t *http.Transport
	if dt, ok := http.DefaultTransport.(*http.Transport); ok {
		t = dt.Clone()
	} else {
		t = &http.Transport{}
	}
	t.Proxy = http.ProxyURL(u)
	c := &http.Client{Transport: t}
	if pc.m == nil {
		pc.m = map[string]*http.Client{}
	}
	pc.m[proxy] = c
	return c
}

// openProxy opens a sealed proxy ("" when none).
func (p *Plugin) openProxy(ctx context.Context, id int64, enc []byte) (string, error) {
	if len(enc) == 0 {
		return "", nil
	}
	b, err := p.host.OpenSecret(ctx, secretContext(id, "proxy"), enc)
	if err != nil {
		return "", fmt.Errorf("open channel proxy: %w", err)
	}
	return string(b), nil
}

// storeProxy seals and stores the proxy: nil keeps it, "" removes it.
func (p *Plugin) storeProxy(ctx context.Context, tx pgx.Tx, id int64, proxy *string) error {
	if proxy == nil {
		return nil
	}
	v := strings.TrimSpace(*proxy)
	if v == "" {
		_, err := tx.Exec(ctx, `UPDATE channels SET proxy_enc = NULL WHERE id = $1`, id)
		return err
	}
	enc, err := p.host.SealSecret(ctx, secretContext(id, "proxy"), []byte(v))
	if err != nil {
		return fmt.Errorf("seal channel proxy: %w", err)
	}
	_, err = tx.Exec(ctx, `UPDATE channels SET proxy_enc = $2 WHERE id = $1`, id, enc)
	return err
}

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

// Channel proxies (CONTRACTS §72.14.6). The proxy URL is sealed like the key
// (context channel:<id>:proxy) and never returned. Proxied calls use a clone
// of http.DefaultTransport, which the SDK has pointed at the egress tunnel by
// then, so strict network mode still applies to the proxy connection.

var proxySchemes = map[string]bool{"http": true, "https": true, "socks5": true}

// validProxy reports whether s is an http(s) or socks5 proxy URL.
func validProxy(s string) bool {
	u, err := url.Parse(s)
	return err == nil && proxySchemes[u.Scheme] && u.Host != "" && (u.Path == "" || u.Path == "/")
}

// proxyClients keeps one client per proxy URL, so reloading the
// configuration reuses connections.
type proxyClients struct {
	mu sync.Mutex
	m  map[string]*http.Client
}

// clientFor returns the client of a channel: the shared one without a proxy.
func (p *Plugin) clientFor(proxy string) *http.Client {
	if proxy == "" {
		return p.httpClient
	}
	pc := &p.proxies
	pc.mu.Lock()
	defer pc.mu.Unlock()
	if c := pc.m[proxy]; c != nil {
		return c
	}
	u, err := url.Parse(proxy)
	if err != nil {
		return p.httpClient
	}
	t, ok := http.DefaultTransport.(*http.Transport)
	if !ok {
		t = &http.Transport{}
	}
	t = t.Clone()
	t.Proxy = http.ProxyURL(u)
	c := &http.Client{Transport: t}
	if pc.m == nil {
		pc.m = map[string]*http.Client{}
	}
	pc.m[proxy] = c
	return c
}

// pruneProxies drops the clients of proxies no live channel uses any more
// (a console read may add one back for the call it makes).
func (p *Plugin) pruneProxies(inUse map[string]bool) {
	pc := &p.proxies
	pc.mu.Lock()
	defer pc.mu.Unlock()
	for proxy, c := range pc.m {
		if !inUse[proxy] {
			c.CloseIdleConnections()
			delete(pc.m, proxy)
		}
	}
}

// openProxy opens a sealed proxy URL ("" when none is stored).
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

// proxyChanged reports whether want differs from the stored proxy; a proxy
// that does not open counts as changed.
func (p *Plugin) proxyChanged(ctx context.Context, tx pgx.Tx, id int64, want string) (bool, error) {
	var enc []byte
	if err := tx.QueryRow(ctx, `SELECT proxy_enc FROM channels WHERE id = $1`, id).Scan(&enc); err != nil {
		return false, err
	}
	cur, err := p.openProxy(ctx, id, enc)
	return err != nil || cur != want, nil
}

// storeProxy seals and stores a proxy; "" removes it, nil keeps it.
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

package moderation

import (
	"context"
	"errors"
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
		return nil, errors.New("proxy must be an http, https, socks5 or socks5h URL")
	}
	return u, nil
}

// redactProxy hides the password of a proxy URL (url.URL.Redacted).
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

// get returns the client of a channel: def without a proxy, or one going
// through the proxy. A stored proxy that no longer parses is an error: the
// channel must not silently go direct.
func (pc *proxyClients) get(proxy string, def *http.Client) (*http.Client, error) {
	u, err := parseProxy(proxy)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return def, nil
	}
	pc.mu.Lock()
	defer pc.mu.Unlock()
	if c := pc.m[proxy]; c != nil {
		return c, nil
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
	return c, nil
}

// retain closes the idle connections of the proxies no channel uses any more
// and forgets them.
func (pc *proxyClients) retain(used map[string]bool) {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	for proxy, c := range pc.m {
		if !used[proxy] {
			c.CloseIdleConnections()
			delete(pc.m, proxy)
		}
	}
}

// channelClient opens a channel's sealed proxy and returns its client.
func (p *Plugin) channelClient(ctx context.Context, id int64, enc []byte) (*http.Client, string, error) {
	proxy, err := p.openProxy(ctx, id, enc)
	if err != nil {
		return nil, "", err
	}
	c, err := p.proxies.get(proxy, p.httpClient)
	return c, proxy, err
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

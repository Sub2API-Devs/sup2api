package ccgateway

import (
	"context"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

const VirtualURL = "https://ccgateway.internal/v1/messages"

func IsManaged(plugin, kind, raw string) bool {
	return plugin == "ccgateway" && (kind == "managed" || kind == "apikey") && raw == VirtualURL
}
func (s *Service) open(ctx context.Context, c Config) (*http.Client, string, func() error, error) {
	if c.Mode == "ssh" {
		client, close, e := remotedocker.NewHTTPClient(ctx, c.SSH(), "127.0.0.1:8787")
		return client, "http://127.0.0.1:8787", close, e
	}
	if c.Mode != "local" {
		return nil, "", nil, errors.New("CCGateway is not configured")
	}
	base := strings.TrimRight(os.Getenv("CCGATEWAY_URL"), "/")
	if base == "" {
		base = "http://127.0.0.1:8787"
	}
	u, e := url.Parse(base)
	if e != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Scheme != "http" && u.Scheme != "https") || u.Path != "" {
		return nil, "", nil, errors.New("invalid configured CCGateway address")
	}
	tr := &http.Transport{Proxy: nil, MaxResponseHeaderBytes: 64 << 10}
	client := &http.Client{Transport: tr, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	return client, base, func() error { tr.CloseIdleConnections(); return nil }, nil
}
func (s *Service) OpenClient(ctx context.Context) (*http.Client, string, string, func() error, error) {
	c, e := s.Load(ctx)
	if e != nil {
		return nil, "", "", nil, errors.New("cannot read CCGateway configuration")
	}
	if c.APIKey == "" {
		return nil, "", "", nil, errors.New("CCGateway API key is not configured")
	}
	client, base, close, e := s.open(ctx, c)
	return client, base, c.APIKey, close, e
}

// ModelClient is used only after the caller checks plugin/type/URL identity.
// Connection lifetime follows response-body Close, including streaming bodies.
func (s *Service) ModelClient(accountIDs ...int64) *http.Client {
	var id int64
	if len(accountIDs) > 0 {
		id = accountIDs[0]
	}
	return &http.Client{Transport: modelTransport{s: s, accountID: id, proxySelected: len(accountIDs) > 1 && accountIDs[1] > 0}, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
}

func (s *Service) ModelClientFor(id int64, proxyID *int64) *http.Client {
	var proxy int64
	if proxyID != nil {
		proxy = *proxyID
	}
	return s.ModelClient(id, proxy)
}

type modelTransport struct {
	s             *Service
	accountID     int64
	proxySelected bool
}

func (t modelTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.URL.String() != VirtualURL || req.Method != "POST" {
		return nil, errors.New("invalid managed CCGateway request")
	}
	ctx, cancel := context.WithTimeout(req.Context(), 4*time.Minute)
	cfg, e := t.s.Load(ctx)
	if e != nil {
		cancel()
		return nil, e
	}
	var revision, key string
	if !cfg.AccountRuntimes && t.accountID > 0 {
		var kind string
		if err := t.s.DB.Pool.QueryRow(ctx, "SELECT type FROM accounts WHERE id=$1 AND plugin_key='ccgateway'", t.accountID).Scan(&kind); err != nil || kind == "apikey" {
			cancel()
			return nil, errors.New("API key accounts require per-account runtimes")
		}
	}
	if t.proxySelected && !cfg.AccountRuntimes {
		cancel()
		return nil, errors.New("account proxy requires per-account runtimes")
	}
	if cfg.AccountRuntimes {
		d, err := t.s.desired(ctx, t.accountID, false)
		if err != nil || !d.Enabled {
			cancel()
			return nil, errors.New("account egress unavailable")
		}
		revision, key = d.Revision, d.Key
	}
	if (!cfg.AccountRuntimes && cfg.APIKey == "") || (cfg.AccountRuntimes && cfg.AdminKey == "") {
		cancel()
		return nil, errors.New("CCGateway key is not configured")
	}
	client, base, close, e := t.s.open(ctx, cfg)
	if e != nil {
		cancel()
		return nil, errors.New("CCGateway is unavailable")
	}
	var once sync.Once
	finish := func() { once.Do(func() { _ = close(); cancel() }) }
	clone := req.Clone(ctx)
	clone.URL, _ = url.Parse(base + "/v1/messages")
	if cfg.AccountRuntimes {
		// The account's runtime key: the adopted draft key or the id.
		clone.URL.Path = "/accounts/" + key + "/v1/messages"
	}
	clone.Host = ""
	clone.Header = clone.Header.Clone()
	clone.Header.Del("Authorization")
	clone.Header.Set("x-api-key", cfg.APIKey)
	clone.Header.Del("X-CCG-Revision")
	if cfg.AccountRuntimes {
		clone.Header.Del("x-api-key")
		clone.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
		clone.Header.Set("X-CCG-Revision", revision)
	}
	res, e := client.Do(clone)
	if e != nil {
		finish()
		return nil, errors.New("CCGateway model request failed")
	}
	res.Body = &modelBody{ReadCloser: res.Body, finish: finish}
	return res, nil
}

type modelBody struct {
	io.ReadCloser
	finish func()
}

func (b *modelBody) Close() error { e := b.ReadCloser.Close(); b.finish(); return e }

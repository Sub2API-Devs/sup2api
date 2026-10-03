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
	return plugin == "ccgateway" && kind == "managed" && raw == VirtualURL
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
func (s *Service) ModelClient() *http.Client {
	return &http.Client{Transport: modelTransport{s: s}, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
}

type modelTransport struct{ s *Service }

func (t modelTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.URL.String() != VirtualURL || req.Method != "POST" {
		return nil, errors.New("invalid managed CCGateway request")
	}
	ctx, cancel := context.WithTimeout(req.Context(), 4*time.Minute)
	client, base, key, close, e := t.s.OpenClient(ctx)
	if e != nil {
		cancel()
		return nil, errors.New("CCGateway is unavailable")
	}
	var once sync.Once
	finish := func() { once.Do(func() { _ = close(); cancel() }) }
	clone := req.Clone(ctx)
	clone.URL, _ = url.Parse(base + "/v1/messages")
	clone.Host = ""
	clone.Header = clone.Header.Clone()
	clone.Header.Del("Authorization")
	clone.Header.Set("x-api-key", key)
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

package gateway

import (
	"context"
	"io"
	"net/http"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type fakeKeyUsage struct{ keys []int64 }

func (f *fakeKeyUsage) KeyUsage(_ context.Context, p *core.APIKeyPrincipal) (any, error) {
	f.keys = append(f.keys, p.KeyID)
	return map[string]any{"remaining": 6.5, "unit": "USD"}, nil
}

// GET /v1/usage authenticates the key from any header clients send it in and
// answers with its report (CONTRACTS §62), never as a plugin endpoint.
func TestKeyUsageEndpoint(t *testing.T) {
	e := newEnv(t)
	reporter := &fakeKeyUsage{}
	e.gw.d.KeyUsage = reporter
	get := func(method, path string, headers map[string]string) (int, string) {
		t.Helper()
		req, _ := http.NewRequest(method, e.srv.URL+path, nil)
		for k, v := range headers {
			req.Header.Set(k, v)
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		b, _ := io.ReadAll(resp.Body)
		return resp.StatusCode, string(b)
	}
	for _, h := range []map[string]string{{"Authorization": "Bearer " + testKey}, {"x-api-key": testKey}, {"x-goog-api-key": testKey}} {
		if status, body := get(http.MethodGet, "/v1/usage", h); status != 200 || body != `{"remaining":6.5,"unit":"USD"}` {
			t.Fatalf("%v: %d %s", h, status, body)
		}
	}
	if len(reporter.keys) != 3 || reporter.keys[0] != 5 {
		t.Fatalf("reported keys %v", reporter.keys)
	}
	for _, c := range []struct {
		method, path string
		headers      map[string]string
		status       int
	}{
		{http.MethodGet, "/v1/usage", nil, 401},
		{http.MethodGet, "/v1/usage", map[string]string{"x-api-key": "sk-s2a-unknown"}, 401},
		{http.MethodPost, "/v1/usage", map[string]string{"x-api-key": testKey}, 405},
		{http.MethodGet, "/v1/usage/x", map[string]string{"x-api-key": testKey}, 404},
	} {
		if status, body := get(c.method, c.path, c.headers); status != c.status {
			t.Fatalf("%s %s: %d %s", c.method, c.path, status, body)
		}
	}
	if len(e.up.keys()) != 0 {
		t.Fatal("the usage endpoint reached an upstream")
	}
}

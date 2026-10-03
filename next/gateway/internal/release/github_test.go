package release

import (
	"context"
	"io"
	"net/http"
	"net/netip"
	"strings"
	"testing"
)

type githubRoundTrip func(*http.Request) (*http.Response, error)

func (f githubRoundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func githubResponse(r *http.Request, status int, body string) *http.Response {
	return &http.Response{StatusCode: status, Status: http.StatusText(status), Header: make(http.Header), Body: io.NopCloser(strings.NewReader(body)), Request: r}
}

func TestGitHubRedirectPolicy(t *testing.T) {
	for _, target := range []string{"https://release-assets.githubusercontent.com/asset?signature=secret", "https://objects.githubusercontent.com/asset", "https://evil.test/asset", "http://release-assets.githubusercontent.com/asset", "https://release-assets.githubusercontent.com:443/asset", "https://user@objects.githubusercontent.com/asset", "https://release-assets.githubusercontent.com.evil.test/asset"} {
		t.Run(target, func(t *testing.T) {
			calls := 0
			c := &http.Client{Transport: githubRoundTrip(func(r *http.Request) (*http.Response, error) {
				calls++
				if calls == 1 {
					res := githubResponse(r, 302, "")
					res.Header.Set("Location", target)
					return res, nil
				}
				if r.Header.Get("Authorization") != "" || r.Header.Get("X-Peer-Key") != "" {
					t.Fatal("credentials forwarded")
				}
				return githubResponse(r, 200, "ok"), nil
			})}
			res, err := GitHubGet(context.Background(), c, "https://github.com/owner/repo/releases/download/v1.2.3/bundle.tar.gz")
			allowed := target == "https://release-assets.githubusercontent.com/asset?signature=secret" || target == "https://objects.githubusercontent.com/asset"
			if allowed {
				if err != nil {
					t.Fatal(err)
				}
				res.Body.Close()
				if calls != 2 {
					t.Fatal(calls)
				}
			} else {
				if err == nil {
					res.Body.Close()
					t.Fatal("unsafe redirect allowed")
				}
				if calls != 1 {
					t.Fatal("unsafe host contacted")
				}
				if strings.Contains(err.Error(), "secret") {
					t.Fatal("URL secret in error")
				}
			}
		})
	}
}

func TestOrdinaryReleaseStillRejectsRedirects(t *testing.T) {
	calls := 0
	m := &Manager{Client: &http.Client{Transport: githubRoundTrip(func(r *http.Request) (*http.Response, error) {
		calls++
		res := githubResponse(r, 302, "")
		res.Header.Set("Location", "https://objects.githubusercontent.com/asset")
		return res, nil
	})}}
	if _, err := m.get(context.Background(), "https://publisher.example/releases/manifest.json"); err == nil {
		t.Fatal("ordinary publisher followed redirect")
	}
	if calls != 1 {
		t.Fatal(calls)
	}
}

func TestGitHubPrepareStillEnforcesSignedSizeAndDigest(t *testing.T) {
	signed, bundle, keys := fixture(t)
	for _, body := range []string{string(bundle[:len(bundle)-1]), strings.Repeat("x", len(bundle))} {
		m := &Manager{Root: t.TempDir(), TrustedKeys: keys, OS: "linux", Arch: "amd64", RuntimeABI: "linux-static-v1", GitHubClient: &http.Client{Transport: githubRoundTrip(func(r *http.Request) (*http.Response, error) { return githubResponse(r, 200, body), nil })}}
		if _, err := m.Prepare(context.Background(), signed, "https://github.com/owner/repo/releases/download/v1.0.0/bundle.tar.gz"); err == nil {
			t.Fatal("corrupt GitHub bundle installed")
		}
	}
}

func TestGitHubPublicAddressPolicy(t *testing.T) {
	for _, s := range []string{"127.0.0.1", "10.0.0.1", "169.254.169.254", "100.64.0.1", "192.0.2.1", "::1", "fd00::1", "::ffff:127.0.0.1"} {
		if publicIP(netip.MustParseAddr(s)) {
			t.Fatalf("unsafe address accepted: %s", s)
		}
	}
	if !publicIP(netip.MustParseAddr("1.1.1.1")) {
		t.Fatal("public address rejected")
	}
}

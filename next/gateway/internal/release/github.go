package release

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strings"
	"time"
)

// GitHubClient never inherits proxy credentials or cluster mTLS credentials.
// Resolve and pin a public address on each new connection to reject rebinding.
func GitHubClient() *http.Client {
	tr := http.DefaultTransport.(*http.Transport).Clone()
	tr.Proxy = nil
	tr.DialContext = func(ctx context.Context, network, address string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(address)
		if err != nil {
			return nil, err
		}
		ips, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
		if err != nil {
			return nil, err
		}
		for _, ip := range ips {
			if !publicIP(ip) {
				return nil, errors.New("GitHub host resolved to a non-public address")
			}
		}
		var last error
		for _, ip := range ips {
			c, e := (&net.Dialer{Timeout: 10 * time.Second}).DialContext(ctx, network, net.JoinHostPort(ip.String(), port))
			if e == nil {
				return c, nil
			}
			last = e
		}
		if last == nil {
			last = errors.New("GitHub hostname has no addresses")
		}
		return nil, last
	}
	return &http.Client{Transport: tr, Timeout: 10 * time.Minute}
}

func publicIP(ip netip.Addr) bool {
	ip = ip.Unmap()
	if !ip.IsGlobalUnicast() || ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() {
		return false
	}
	for _, s := range []string{"0.0.0.0/8", "100.64.0.0/10", "192.0.0.0/24", "192.0.2.0/24", "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "240.0.0.0/4", "2001:db8::/32"} {
		if netip.MustParsePrefix(s).Contains(ip) {
			return false
		}
	}
	return true
}

func githubHTTPS(u *url.URL) bool {
	return u != nil && u.Scheme == "https" && u.User == nil && u.Port() == "" && u.Fragment == ""
}

// IsGitHubAssetURL accepts only GitHub release assets, never general GitHub URLs.
func IsGitHubAssetURL(raw string) bool {
	u, e := url.Parse(raw)
	if e != nil || !githubHTTPS(u) || u.Host != "github.com" || u.RawQuery != "" {
		return false
	}
	p := strings.Split(strings.TrimPrefix(u.EscapedPath(), "/"), "/")
	return len(p) == 6 && p[0] != "" && p[1] != "" && p[2] == "releases" && p[3] == "download" && p[4] != "" && p[5] != ""
}

// GitHubGet is a deliberately separate policy. Ordinary release sources retain
// their no-redirect policy. A GitHub request may redirect only to GitHub's two
// release asset CDNs; it carries no bearer token or authenticated peer headers.
func GitHubGet(ctx context.Context, client *http.Client, raw string) (*http.Response, error) {
	u, err := url.Parse(raw)
	if err != nil || !githubHTTPS(u) || u.RawQuery != "" || !(IsGitHubAssetURL(raw) || (u.Host == "api.github.com" && strings.HasPrefix(u.Path, "/repos/"))) {
		return nil, errors.New("invalid GitHub release source")
	}
	if client == nil {
		client = GitHubClient()
	}
	c := *client
	c.CheckRedirect = func(req *http.Request, via []*http.Request) error {
		if len(via) >= 3 || !githubHTTPS(req.URL) || (req.URL.Host != "release-assets.githubusercontent.com" && req.URL.Host != "objects.githubusercontent.com") {
			return errors.New("GitHub release redirect rejected")
		}
		req.Header = make(http.Header)
		req.Header.Set("Accept-Encoding", "identity")
		return nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, raw, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Accept-Encoding", "identity")
	req.Header.Set("User-Agent", "sub2api-gateway-updater")
	res, err := c.Do(req)
	if err != nil {
		return nil, errors.New("GitHub release request failed")
	}
	if res.StatusCode != http.StatusOK {
		res.Body.Close()
		return nil, errors.New("GitHub release source returned HTTP " + res.Status)
	}
	return res, nil
}

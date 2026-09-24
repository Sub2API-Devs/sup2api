package account

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// TestResult is returned by POST /accounts/:id/test.
type TestResult struct {
	OK        bool   `json:"ok"`
	Status    int    `json:"status"`
	LatencyMs int64  `json:"latency_ms"`
	Message   string `json:"message"`
}

func (s *Service) test(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		Model string `json:"model"`
	}
	if raw, err := c.GetRawData(); err == nil && len(strings.TrimSpace(string(raw))) > 0 {
		if err := json.Unmarshal(raw, &in); err != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage(err.Error()))
			return
		}
	}
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	bt, ok := s.accountType(a.PluginKey, a.Type)
	if !ok || bt.Client == nil {
		httpapi.Fail(c, core.ErrPluginUnavailable.WithMessage(t(ctx,
			"the plugin providing this account type is not enabled", "提供该账号类型的插件未启用")))
		return
	}
	plain, err := s.decrypt(a.PluginKey, a.CredEnc)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	ctx, cancel := context.WithTimeout(ctx, testTimeout)
	defer cancel()
	// A test request is not served by a client endpoint, so Account.platform
	// is empty; the declaring plugin builds a request for the account type.
	req, err := bt.Client.BuildTestRequest(ctx, &pluginv1.BuildTestRequestRequest{
		Account: &pluginv1.Account{Id: a.ID, Name: a.Name, Type: a.Type,
			CredentialsJson: string(plain), SettingsJson: string(a.Settings)},
		Model: in.Model,
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, s.runTest(ctx, a.ProxyID, req))
}

func (s *Service) runTest(ctx context.Context, proxyID *int64, tr *pluginv1.BuildTestRequestResponse) TestResult {
	u, err := url.Parse(tr.GetUrl())
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return TestResult{Message: "plugin built an invalid test URL"}
	}
	if err := s.checkUpstream(ctx, u, proxyID != nil); err != nil {
		return TestResult{Message: err.Error()}
	}
	method := strings.ToUpper(tr.GetMethod())
	if method == "" {
		method = http.MethodPost
	}
	var body io.Reader
	if tr.GetBodyJson() != "" {
		body = strings.NewReader(tr.GetBodyJson())
	}
	req, err := http.NewRequestWithContext(ctx, method, u.String(), body)
	if err != nil {
		return TestResult{Message: err.Error()}
	}
	for k, v := range tr.GetHeaders() {
		req.Header.Set(k, v)
	}
	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}
	hc, err := s.d.Proxies.HTTPClient(ctx, proxyID)
	if err != nil {
		return TestResult{Message: core.AsError(err).Message}
	}
	start := time.Now()
	resp, err := hc.Do(req)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		return TestResult{LatencyMs: latency, Message: err.Error()}
	}
	defer resp.Body.Close()
	snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	res := TestResult{OK: resp.StatusCode >= 200 && resp.StatusCode < 300, Status: resp.StatusCode, LatencyMs: latency}
	if !res.OK {
		res.Message = truncate(string(snippet), 1024)
		if res.Message == "" {
			res.Message = resp.Status
		}
	}
	return res
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	s = s[:n]
	for !utf8.ValidString(s) && len(s) > 0 {
		s = s[:len(s)-1]
	}
	return s + "…"
}

// errPrivate is returned when a test URL points at a private address.
type errPrivate struct{ host string }

func (e errPrivate) Error() string {
	return "upstream address " + e.host + " is private or loopback and not allowed"
}

// checkUpstream rejects loopback/private/link-local targets unless allowed.
// Through a proxy, names that cannot be resolved locally are left to the proxy.
func (s *Service) checkUpstream(ctx context.Context, u *url.URL, proxied bool) error {
	if s.d.AllowPrivateUpstream {
		return nil
	}
	host := u.Hostname()
	var ips []net.IP
	if ip := net.ParseIP(host); ip != nil {
		ips = []net.IP{ip}
	} else {
		addrs, err := net.DefaultResolver.LookupIPAddr(ctx, host)
		if err != nil {
			if proxied {
				return nil
			}
			return err
		}
		for _, a := range addrs {
			ips = append(ips, a.IP)
		}
	}
	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
			ip.IsUnspecified() || ip.IsMulticast() || ip.IsInterfaceLocalMulticast() {
			return errPrivate{host: host}
		}
	}
	return nil
}

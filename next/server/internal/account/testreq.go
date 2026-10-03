package account

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usagerules"
)

// TestResult is returned by POST /accounts/:id/test.
type TestResult struct {
	OK        bool   `json:"ok"`
	Status    int    `json:"status"`
	LatencyMs int64  `json:"latency_ms"`
	Message   string `json:"message"`
	// Model actually requested: the model the plugin reported, else the
	// requested model after the account's mapping.
	Model string `json:"model,omitempty"`
	// Upstream is the address the test reached, without query or fragment:
	// they may carry the credential (Gemini style "?key=...").
	Upstream string `json:"upstream,omitempty"`
	// Body is a prefix of the upstream response, on success and on failure.
	Body string `json:"body,omitempty"`
	// Usage holds the token counts the platform's usage rules found in the
	// response; nil when the plugin named no usage protocol, the rules do not
	// cover JSON responses or nothing was found.
	Usage *TestUsage `json:"usage,omitempty"`
	// Reason is the plugin's explanation of a failure (ClassifyError).
	Reason string `json:"reason,omitempty"`
	// Effect is the account effect the plugin would apply in the gateway:
	// "cooldown", "disable" or empty. Shown to the operator only: a test
	// never changes the account (see classifyTest).
	Effect string `json:"effect,omitempty"`
}

// TestUsage is the token usage read from a test response. Fields follow the
// usage rule names (manifest.Usage*); cache_creation_tokens is the total
// cache write (5 minute + 1 hour entries).
type TestUsage struct {
	InputTokens         int64 `json:"input_tokens,omitempty"`
	OutputTokens        int64 `json:"output_tokens,omitempty"`
	CacheReadTokens     int64 `json:"cache_read_tokens,omitempty"`
	CacheCreationTokens int64 `json:"cache_creation_tokens,omitempty"`
}

const (
	// maxTestBody is read from the upstream test response, maxTestBodyOut is
	// reported back (the whole prefix is used for usage extraction).
	maxTestBody    = 8 << 10
	maxTestBodyOut = 4 << 10
	// classifyTimeout bounds the ClassifyError call of a failed test; the
	// test context may already be done (timeout), so it is not inherited.
	classifyTimeout = 5 * time.Second
)

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
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, core.OwnerScope(ctx, "account:test"), false)
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
	// The account's model mapping applies to test calls too (CONTRACTS §18).
	model := strings.TrimSpace(in.Model)
	if model != "" {
		ref := core.AccountRef{ModelMapping: a.mapping()}
		model = ref.MapModel(model)
	}
	acct := &pluginv1.Account{Id: a.ID, Name: a.Name, Type: a.Type,
		CredentialsJson: string(plain), SettingsJson: string(a.Settings)}
	// A test request is not served by a client endpoint, so Account.platform
	// is empty; the declaring plugin builds a request for the account type.
	req, err := bt.Client.BuildTestRequest(ctx, &pluginv1.BuildTestRequestRequest{
		Account: acct,
		Model:   model,
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, s.runTest(ctx, bt, acct, a.ProxyID, model, req))
}

// runTest sends the request the plugin built and reports what came back: the
// status and latency, the model and (credential-free) address it reached, a
// prefix of the response body, the token usage the platform's rules find in
// it and, for a failure, the plugin's classification.
func (s *Service) runTest(ctx context.Context, bt core.AccountTypeBinding, acct *pluginv1.Account,
	proxyID *int64, model string, tr *pluginv1.BuildTestRequestResponse) TestResult {
	res := TestResult{Model: model}
	if m := strings.TrimSpace(tr.GetModel()); m != "" {
		res.Model = m
	}
	u, err := url.Parse(tr.GetUrl())
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		res.Message = "plugin built an invalid test URL"
		return res
	}
	res.Upstream = upstreamAddr(u)
	managedCCG := ccgateway.IsManaged(bt.Plugin.Key, bt.Type.ID, tr.GetUrl()) && s.d.CCGateway != nil && proxyID == nil
	if !managedCCG {
		if err := s.checkUpstream(ctx, u, proxyID != nil); err != nil {
			res.Message = err.Error()
			return res
		}
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
		res.Message = transportError(res.Upstream, err)
		return res
	}
	for k, v := range tr.GetHeaders() {
		req.Header.Set(k, v)
	}
	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}
	var hc *http.Client
	if managedCCG {
		hc = s.d.CCGateway.ModelClient()
	} else {
		hc, err = s.d.Proxies.HTTPClient(ctx, proxyID)
	}
	if err != nil {
		res.Message = core.AsError(err).Message
		return res
	}
	start := time.Now()
	resp, err := hc.Do(req)
	res.LatencyMs = time.Since(start).Milliseconds()
	if err != nil {
		res.Message = transportError(res.Upstream, err)
		res.Reason, res.Effect = s.classifyTest(ctx, bt, acct, res.Model, 0, nil, nil, res.Message)
		return res
	}
	defer resp.Body.Close()
	snippet, _ := io.ReadAll(io.LimitReader(resp.Body, maxTestBody))
	res.OK = resp.StatusCode >= 200 && resp.StatusCode < 300
	res.Status = resp.StatusCode
	res.Body = truncate(strings.TrimSpace(string(snippet)), maxTestBodyOut)
	if res.OK {
		res.Usage = s.testUsage(bt, tr.GetUsageProtocol(), snippet)
		return res
	}
	res.Message = truncate(string(snippet), 1024)
	if res.Message == "" {
		res.Message = resp.Status
	}
	res.Reason, res.Effect = s.classifyTest(ctx, bt, acct, res.Model, resp.StatusCode, resp.Header, snippet, "")
	return res
}

// upstreamAddr renders the address a test reached without the query and
// fragment: they may carry the credential (a Gemini style "?key=...") and
// this value is shown in the console.
func upstreamAddr(u *url.URL) string {
	return (&url.URL{Scheme: u.Scheme, Host: u.Host, Path: u.Path}).String()
}

// transportError renders a transport failure with the credential-free
// address instead of the request URL net/http puts in the message (it keeps
// the query, which may carry the key). The plugin classifying the failure
// sees the same text, since it may repeat it in its reason.
func transportError(addr string, err error) string {
	var ue *url.Error
	if errors.As(err, &ue) {
		return strings.TrimSpace(ue.Op+" "+addr) + ": " + ue.Err.Error()
	}
	return err.Error()
}

// testUsage reads the token counts of a successful test response. The plugin
// names the protocol whose usage rules describe its test response; the rules
// are resolved exactly like the gateway resolves them for a forwarded
// request (usagerules.For). Only non-streaming JSON responses are covered:
// anything unknown or unparsable yields nil, which never fails the test.
func (s *Service) testUsage(bt core.AccountTypeBinding, protocol string, body []byte) *TestUsage {
	protocol = strings.TrimSpace(protocol)
	if protocol == "" || len(body) == 0 {
		return nil
	}
	g := s.gen()
	if g == nil {
		return nil
	}
	pb, ok := g.PlatformForProtocol(protocol)
	if !ok {
		return nil
	}
	// A zero AccountPlatform (the type does not serve this platform) simply
	// has no override, leaving the endpoint and platform rules.
	ap, _ := bt.Supports(pb.Platform.ID)
	var ep *manifest.Endpoint
	for i := range pb.Platform.Endpoints {
		if pb.Platform.Endpoints[i].Protocol == protocol {
			ep = &pb.Platform.Endpoints[i]
			break
		}
	}
	acc := usagerules.New(usagerules.For(ap, ep, &pb.Platform, protocol))
	if !acc.HasJSON() {
		return nil
	}
	acc.ApplyJSON(body)
	tk := acc.Tokens()
	if tk == (core.UsageTokens{}) {
		return nil
	}
	return &TestUsage{
		InputTokens:         tk.Input,
		OutputTokens:        tk.Output,
		CacheReadTokens:     tk.CacheRead,
		CacheCreationTokens: tk.CacheCreation + tk.CacheCreation1h,
	}
}

// classifyTest asks the plugin what a failed test means and returns the
// reason and the account effect it would have in the gateway ("cooldown",
// "disable" or empty).
//
// It deliberately applies NO side effect: a console test never puts the
// account into cooldown and never disables it (that is the gateway's
// scheduling decision, gateway.call.classify); the effect is reported for
// display only. Plugins that do not implement ClassifyError, or fail, leave
// both values empty.
func (s *Service) classifyTest(ctx context.Context, bt core.AccountTypeBinding, acct *pluginv1.Account,
	model string, status int, header http.Header, body []byte, transportErr string) (reason, effect string) {
	headers := map[string]string{}
	for k, v := range header {
		if len(v) > 0 {
			headers[strings.ToLower(k)] = v[0]
		}
	}
	prefix := body
	if len(prefix) > classifyPrefix {
		prefix = prefix[:classifyPrefix]
	}
	cctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), classifyTimeout)
	defer cancel()
	cls, err := bt.Client.ClassifyError(cctx, &pluginv1.ClassifyErrorRequest{
		Meta:    &pluginv1.RequestMeta{Model: model},
		Account: acct, Status: int32(status), Headers: headers,
		BodyPrefix: prefix, TransportError: transportErr,
	})
	if err != nil || cls == nil {
		slog.DebugContext(ctx, "account: test classification unavailable", "plugin", bt.Plugin.Key, "err", err)
		return "", ""
	}
	switch cls.GetAccountEffect() {
	case pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN:
		effect = "cooldown"
	case pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE:
		effect = "disable"
	}
	return truncate(cls.GetReason(), 512), effect
}

// classifyPrefix is the body prefix given to ClassifyError, as in the
// gateway.
const classifyPrefix = 4 << 10

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

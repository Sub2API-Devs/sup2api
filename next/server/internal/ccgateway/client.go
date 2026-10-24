package ccgateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/requestfailure"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

const VirtualURL = "https://ccgateway.internal/v1/messages"
const VirtualTestURL = "https://ccgateway.internal/v1/ccgateway/probe"

// managedURL accepts the model endpoint and the internal account probe.
// CCGateway offers no token counting endpoint.
func managedURL(raw string) bool { return raw == VirtualURL || raw == VirtualTestURL }

func IsManaged(plugin, kind, raw string) bool {
	return plugin == "ccgateway" && (kind == "managed" || kind == "apikey") && managedURL(raw)
}
func (s *Service) open(ctx context.Context, c Config) (*http.Client, string, func() error, error) {
	if c.Mode == "ssh" {
		client, close, e := remotedocker.NewHTTPClient(ctx, c.SSH(), "127.0.0.1:8787")
		return client, "http://127.0.0.1:8787", close, e
	}
	if c.Mode == "controller" {
		return openControllerPanel(c)
	}
	if c.Mode == localInstallMode {
		// A local installation's controller (§53.9): host networking, loopback.
		tr := &http.Transport{Proxy: nil, MaxResponseHeaderBytes: 64 << 10}
		tr.DialContext = func(ctx context.Context, network, address string) (net.Conn, error) {
			if network != "tcp" || address != localControllerAddress {
				return nil, errors.New("controller destination rejected")
			}
			return (&net.Dialer{Timeout: controllerDialTimeout}).DialContext(ctx, network, address)
		}
		client := newNoRedirectClient(fixedTarget{rt: tr, scheme: "http", host: localControllerAddress})
		return client, "http://" + localControllerAddress, func() error { tr.CloseIdleConnections(); return nil }, nil
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
	client := newNoRedirectClient(tr)
	return client, base, func() error { tr.CloseIdleConnections(); return nil }, nil
}

// ModelClient is used only after the caller checks plugin/type/URL identity.
// Connection lifetime follows response-body Close, including streaming bodies.
// It carries no request group, so the CC feature policy it sends is the global
// one (ModelPolicyScope): no group and no account override applies. Model
// requests from API keys use ModelClientForRequest instead.
func (s *Service) ModelClient(accountIDs ...int64) *http.Client {
	var id int64
	if len(accountIDs) > 0 {
		id = accountIDs[0]
	}
	return newNoRedirectClient(modelTransport{s: s, accountID: id, proxySelected: len(accountIDs) > 1 && accountIDs[1] > 0})
}

// ModelPolicyScope names the CC feature policy layers a ModelClient /
// ModelClientFor request is resolved with: the global policy only (audit
// A10). The account test reports it, since a test that passes says nothing of
// the account's group policy (a level none group, high injection, ...).
const ModelPolicyScope = "global"

func (s *Service) ModelClientFor(id int64, proxyID *int64) *http.Client {
	var proxy int64
	if proxyID != nil {
		proxy = *proxyID
	}
	return s.ModelClient(id, proxy)
}

// ModelRequestContext carries the authenticated API key group, never a client
// header. Other callers (notably probes) retain global-only semantics.
type ModelRequestContext struct {
	AccountID int64
	ProxyID   *int64
	GroupID   int64
}

func (s *Service) ModelClientForRequest(in ModelRequestContext) *http.Client {
	return newNoRedirectClient(modelTransport{s: s, accountID: in.AccountID, groupID: in.GroupID, proxySelected: in.ProxyID != nil && *in.ProxyID > 0})
}

type modelTransport struct {
	s             *Service
	accountID     int64
	groupID       int64
	proxySelected bool
}

func (t modelTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if !managedURL(req.URL.String()) || req.Method != "POST" {
		return nil, errors.New("invalid managed CCGateway request")
	}
	return t.forwardManaged(req, req.URL.Path, false)
}

// Both callers validate a closed operation surface before entering this
// shared account discovery and SSH transport. A resource is always tied to
// one account; the legacy shared gateway is not a resource issuer boundary.
func (t modelTransport) forwardManaged(req *http.Request, path string, resource bool) (*http.Response, error) {
	// Allow the runtime's one-hour execution deadline to report its result.
	ctx, cancel := context.WithTimeout(req.Context(), time.Hour+time.Minute)
	res, stale, e := t.forwardAttempt(ctx, cancel, req, req.Body, path, resource)
	if stale && (req.Body == nil || req.Body == http.NoBody || req.GetBody != nil) {
		// The cached revision was not the controller's: once more with the
		// account read again (it was dropped from the cache).
		body := req.Body
		if req.GetBody != nil {
			if req.Body != nil {
				_ = req.Body.Close()
			}
			if body, e = req.GetBody(); e != nil {
				cancel()
				return nil, e
			}
		}
		res, stale, e = t.forwardAttempt(ctx, cancel, req, body, path, resource)
	}
	if stale {
		cancel()
		return notSynchronizedResponse(req), nil
	}
	return res, e
}

// forwardAttempt sends req once. stale reports a refusal of the runtime
// revision that came from the request cache; the caller may retry, and the
// answer is notSynchronizedResponse otherwise.
func (t modelTransport) forwardAttempt(ctx context.Context, cancel context.CancelFunc, req *http.Request, body io.ReadCloser, path string, resource bool) (*http.Response, bool, error) {
	a := &attempt{t: t, ctx: ctx, cancel: cancel, req: req}
	if o := a.resolveRoute(resource); o != nil {
		return o.values()
	}
	clone := a.clone(body, path)
	if !resource {
		if o := a.attachPolicy(clone, path); o != nil {
			return o.values()
		}
	}
	return a.send(clone).values()
}

// attempt is one forwardAttempt: where it goes (resolveRoute) and how it
// ends. Every step either continues (nil outcome) or ends the attempt.
type attempt struct {
	t      modelTransport
	ctx    context.Context
	cancel context.CancelFunc
	req    *http.Request
	cfg    Config
	// key, revision and cached: the runtime asked and whether its revision
	// came from the request cache (per-account runtimes only).
	key, revision string
	cached        bool
	// route is nil for the shared runtime.
	route          *accountRoute
	client         *http.Client
	base, modelKey string
	close          func() error
	// finish closes the connection and the context once, when the answer
	// body is closed or the attempt ends before sending.
	finish func()
}

type outcome struct {
	res   *http.Response
	stale bool
	err   error
}

func (o *outcome) values() (*http.Response, bool, error) { return o.res, o.stale, o.err }

func (a *attempt) fail(e error) *outcome {
	a.end()
	return &outcome{err: e}
}

// refuse answers the core's own refusals (the account, the configuration,
// the policy) as Anthropic errors marked X-CCGateway-Error-Source: core
// (audit A6), not as transport failures: the plugin then cools the account
// down for the stated reason and the client reads it, instead of "upstream
// connection failed".
func (a *attempt) refuse(reason, message string) *outcome {
	a.end()
	return &outcome{res: coreRefusal(a.req, reason, message)}
}

// end ends an attempt that sends nothing: it closes the connection once one
// is open (finish), and the context.
func (a *attempt) end() {
	if a.finish != nil {
		a.finish()
		return
	}
	a.cancel()
}

// notSynchronized: the runtime is not at the revision the core wants. The
// account is read again next time and its runtime reconciled now; a revision
// from the cache is retried by the caller (the context stays for it).
func (a *attempt) notSynchronized() *outcome {
	a.t.s.forgetAccount(a.t.accountID, a.key)
	a.t.s.Kick(a.key)
	if a.cached {
		return &outcome{stale: true, err: errAccountNotSynchronized}
	}
	a.cancel()
	return &outcome{res: notSynchronizedResponse(a.req)}
}

// resolveRoute reads the configuration and the account and opens the
// connection to its runtime.
func (a *attempt) resolveRoute(resource bool) *outcome {
	cfg, e := a.t.s.requestConfig(a.ctx)
	if e != nil {
		return a.fail(e)
	}
	a.cfg = cfg
	if resource && (!cfg.AccountRuntimes || a.t.accountID <= 0) {
		return a.fail(errors.New("provider resources require per-account runtimes"))
	}
	if !cfg.AccountRuntimes {
		return a.resolveShared()
	}
	d, fromCache, err := a.t.s.requestDesired(a.ctx, a.t.accountID)
	if err != nil {
		return a.fail(transportError(err))
	}
	if reason := d.unavailable(); reason != "" {
		return a.refuse(reason, reasonError(core.ErrUnavailable, reason).Message)
	}
	a.revision, a.key, a.cached = d.Revision, d.Key, fromCache
	if cfg.AdminKey == "" {
		return a.refuse("not_configured", reasonMessages["not_configured"])
	}
	r, err := a.t.s.route(a.ctx, cfg, a.key, a.revision)
	if err == nil {
		a.route, a.base, a.modelKey = r, r.base, r.modelKey
		a.client, a.close, err = a.t.s.openRoute(a.ctx, cfg, r)
	}
	if err != nil {
		if errors.Is(err, errAccountNotSynchronized) {
			return a.notSynchronized()
		}
		return a.fail(transportError(err))
	}
	a.finishOnce()
	return nil
}

// resolveShared opens the shared runtime of a configuration saved without
// per-account runtimes (a mode §53.9 retired; a stored one keeps working
// until it is migrated).
func (a *attempt) resolveShared() *outcome {
	if a.t.accountID > 0 {
		var kind string
		if err := a.t.s.DB.Pool.QueryRow(a.ctx, "SELECT type FROM accounts WHERE id=$1 AND plugin_key='ccgateway'", a.t.accountID).Scan(&kind); err != nil || kind == "apikey" {
			return a.fail(errors.New("API key accounts require per-account runtimes"))
		}
	}
	if a.t.proxySelected {
		return a.fail(errors.New("account proxy requires per-account runtimes"))
	}
	if a.cfg.APIKey == "" {
		return a.refuse("not_configured", reasonMessages["not_configured"])
	}
	client, base, closeFn, e := a.t.s.open(a.ctx, a.cfg)
	if e != nil {
		return a.fail(transportError(e))
	}
	a.client, a.base, a.close, a.modelKey = client, base, closeFn, a.cfg.APIKey
	a.finishOnce()
	return nil
}

func (a *attempt) finishOnce() {
	var once sync.Once
	a.finish = func() { once.Do(func() { _ = a.close(); a.cancel() }) }
}

// clone is req addressed to the runtime with body.
func (a *attempt) clone(body io.ReadCloser, path string) *http.Request {
	clone := a.req.Clone(a.ctx)
	clone.Body = body
	clone.URL, _ = url.Parse(a.base + path)
	clone.URL.RawQuery = a.req.URL.RawQuery
	clone.Host = ""
	clone.Header = clone.Header.Clone()
	return clone
}

// attachPolicy resolves the account's CC feature policy, confirms the Worker
// can apply it and puts it on clone (X-CCGateway-Request-Policy).
func (a *attempt) attachPolicy(clone *http.Request, path string) *outcome {
	policy, err := a.t.s.resolvedWorkerPolicy(a.ctx, a.cfg, a.t.accountID, a.t.groupID)
	if err != nil {
		return a.fail(err)
	}
	if err := policy.Validate(); err != nil {
		return a.refuse("invalid_request_policy", "The CC feature policy is invalid: "+err.Error()+".")
	}
	// Every policy carries a request level (request_levels_v1), so each model
	// request and probe confirms the Worker/CLI first, whatever the global,
	// group or account settings resolved to.
	if path == "/v1/messages" || path == "/v1/ccgateway/probe" {
		if err := a.t.s.requireRequestPolicyCapabilities(a.ctx, a.client, a.base, a.modelKey, a.route, policy); err != nil {
			if a.cfg.AccountRuntimes && errors.Is(err, errAccountNotSynchronized) {
				// Refused like the model request would be: read the account
				// again (the context stays for the retry).
				_ = a.close()
				return a.notSynchronized()
			}
			return a.refuse("configuration_error", core.AsError(err).Message)
		}
	}
	policyJSON, _ := json.Marshal(policy)
	clone.Header.Set("X-CCGateway-Request-Policy", string(policyJSON))
	return nil
}

// send forwards clone with the Worker key; the answer body closes the
// connection (finish).
func (a *attempt) send(clone *http.Request) *outcome {
	clone.Header.Del("Authorization")
	clone.Header.Set("x-api-key", a.modelKey)
	clone.Header.Del("X-CCG-Revision")
	res, e := a.client.Do(clone)
	if e != nil {
		_ = a.close()
		if a.cfg.AccountRuntimes {
			if errors.Is(e, errAccountNotSynchronized) {
				return a.notSynchronized()
			}
			// The runtime may have moved: ask the controller again next time.
			a.t.s.forgetAccount(a.t.accountID, a.key)
		}
		a.cancel()
		return &outcome{err: errors.New("CCGateway model request failed")}
	}
	if a.cfg.AccountRuntimes && res.StatusCode == http.StatusUnauthorized {
		// A recreated runtime has a new Worker key; an upstream 401 only
		// costs one connection lookup.
		a.t.s.forgetAccount(a.t.accountID, a.key)
	}
	res.Body = &modelBody{ReadCloser: res.Body, finish: a.finish}
	return &outcome{res: res}
}

// notSynchronizedResponse is the core's refusal while a runtime is
// reconciled: the plugin fails over to another account and cools this one
// down briefly.
func notSynchronizedResponse(req *http.Request) *http.Response {
	return coreRefusal(req, "not_synchronized", reasonMessages["not_synchronized"])
}

// coreRefusal is an Anthropic 503 api_error the core answers itself, before
// any Worker is asked, marked with its source (requestfailure.SourceCore) and
// reason (requestfailure.ReasonHeader) so the plugin classifies it as the
// gateway's own failure, not the upstream's, and the client reads why.
func coreRefusal(req *http.Request, reason, message string) *http.Response {
	body, _ := json.Marshal(map[string]any{"type": "error", "error": map[string]string{"type": "api_error", "message": message}})
	header := http.Header{"Content-Type": []string{"application/json"}}
	header.Set(requestfailure.SourceHeader, requestfailure.SourceCore)
	header.Set(requestfailure.ReasonHeader, reason)
	return &http.Response{StatusCode: http.StatusServiceUnavailable, Status: "503 Service Unavailable", Header: header, Body: io.NopCloser(bytes.NewReader(body)), Request: req}
}

type modelBody struct {
	io.ReadCloser
	finish func()
}

func (b *modelBody) Close() error { e := b.ReadCloser.Close(); b.finish(); return e }

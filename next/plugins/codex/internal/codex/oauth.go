package codex

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/textutil"
)

// Authorization routes (manifest routes, scope admin, permission
// codex:manage). The console's CodexAuthForm drives both flows; every route
// call sends at most one request to OpenAI and never waits in a loop.
//
// Sessions live in the plugin KV (shared by every node), keyed by a random
// session id. Answers follow CONTRACTS §3.1: a success is {"data": ...}
// (pluginsdk.DataResponse); a malformed request is 400 invalid_argument with
// details.fields (pluginsdk.BadRequest); a refusal of the flow itself keeps
// its own code ({"error":{"code","message"}}, e.g. device_auth_disabled,
// state_mismatch). Every message is "English / 中文".

const (
	kvDevice = "device_session"
	kvSIWC   = "siwc_session"

	// deviceTTL is how long a device code stays valid (Codex: 15 minutes).
	deviceTTL = 15 * time.Minute
	// siwcTTL is how long a Sign in with ChatGPT session waits for the
	// pasted callback.
	siwcTTL = 30 * time.Minute
	// defaultInterval / maxInterval bound the device code poll interval.
	defaultInterval = 5
	maxInterval     = 60
	// slowDownStep is added to the interval when the issuer answers 429.
	slowDownStep = 5
	// maxAuthBody caps what the plugin reads from the issuer.
	maxAuthBody = 1 << 20
	// authTimeout bounds one request to the issuer.
	authTimeout = 20 * time.Second
	// pollLockTTL covers one poll under its lock: the status request and the
	// token exchange, each bounded by authTimeout, plus slack.
	pollLockTTL = 2*authTimeout + 10*time.Second
	// lockReleaseTimeout bounds giving the poll lock back.
	lockReleaseTimeout = 5 * time.Second
)

// ---------------------------------------------------------------- helpers

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// pkceChallenge is the S256 code challenge of verifier.
func pkceChallenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// newHostID returns urn:uuid:<random UUIDv4>.
func newHostID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	b[6] = b[6]&0x0f | 0x40
	b[8] = b[8]&0x3f | 0x80
	h := hex.EncodeToString(b[:])
	return "urn:uuid:" + h[0:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:], nil
}

// authAnswer is one response of the authorization server.
type authAnswer struct {
	status int
	body   []byte
}

// post sends one request to the authorization server.
func (p *Plugin) post(ctx context.Context, rawURL, contentType string, body []byte) (authAnswer, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, rawURL, bytes.NewReader(body))
	if err != nil {
		return authAnswer{}, err
	}
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", UserAgent)
	req.Header.Set("Originator", Originator)
	resp, err := p.client.Do(req)
	if err != nil {
		return authAnswer{}, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, maxAuthBody))
	if err != nil {
		return authAnswer{}, err
	}
	return authAnswer{status: resp.StatusCode, body: raw}, nil
}

func (p *Plugin) postJSON(ctx context.Context, rawURL string, v any) (authAnswer, error) {
	b, _ := json.Marshal(v)
	return p.post(ctx, rawURL, "application/json", b)
}

func (p *Plugin) postForm(ctx context.Context, rawURL string, form url.Values) (authAnswer, error) {
	return p.post(ctx, rawURL, "application/x-www-form-urlencoded", []byte(form.Encode()))
}

func (a authAnswer) ok() bool { return a.status >= 200 && a.status <= 299 }

// describe is a short "status N: <error>" for messages.
func (a authAnswer) describe() string {
	detail := oauthErrorCode(a.body)
	if d := gjson.GetBytes(a.body, "error_description").String(); d != "" {
		detail += ": " + d
	} else if m := gjson.GetBytes(a.body, "error.message").String(); m != "" {
		detail += ": " + m
	}
	if strings.TrimSpace(detail) == "" {
		detail = textutil.Clip(strings.TrimSpace(string(a.body)), 200)
	}
	return fmt.Sprintf("status %d: %s", a.status, textutil.Clip(detail, 300))
}

func (p *Plugin) kv() (pluginsdk.KV, error) {
	if p.host == nil {
		return nil, pluginsdk.ErrHostNotReady
	}
	return p.host.KV(), nil
}

func (p *Plugin) loadSession(ctx context.Context, ns, id string, v any) (bool, error) {
	kv, err := p.kv()
	if err != nil {
		return false, err
	}
	raw, found, err := kv.Get(ctx, ns, id)
	if err != nil || !found {
		return false, err
	}
	return true, json.Unmarshal(raw, v)
}

func (p *Plugin) saveSession(ctx context.Context, ns, id string, v any, ttl time.Duration) error {
	kv, err := p.kv()
	if err != nil {
		return err
	}
	b, _ := json.Marshal(v)
	return kv.Set(ctx, ns, id, b, ttl)
}

// deleteSession ends a session. A failure is only logged: the session
// expires with its ttl, and every code is single-use on OpenAI's side.
func (p *Plugin) deleteSession(ctx context.Context, ns, id string) {
	kv, err := p.kv()
	if err == nil {
		err = kv.Delete(ctx, ns, id)
	}
	if err != nil {
		p.log.Warn("codex: delete authorization session", "kind", ns, "error", err.Error())
	}
}

// decodeOptional reads an optional JSON body ("" or {} are both fine).
func decodeOptional(req *pluginv1.HTTPRequest, v any) error {
	if len(bytes.TrimSpace(req.GetBody())) == 0 {
		return nil
	}
	return json.Unmarshal(req.GetBody(), v)
}

// errInvalidJSON and errNoSession are malformed route requests
// (pluginsdk.BadRequest: 400 invalid_argument with details.fields).
func errInvalidJSON() *pluginv1.HTTPResponse {
	return pluginsdk.BadRequest("body", "invalid_json", "the request body is not valid JSON / 请求体不是合法 JSON")
}

func errNoSession() *pluginv1.HTTPResponse {
	return pluginsdk.BadRequest("session_id", "required", "session_id is required / 缺少 session_id")
}

// flowError is a 400 refusal of the authorization flow with its own code.
func flowError(code, msg string) *pluginv1.HTTPResponse {
	return pluginsdk.ErrorResponse(http.StatusBadRequest, code, msg)
}

func upstreamError(code, msg string) *pluginv1.HTTPResponse {
	return pluginsdk.ErrorResponse(http.StatusBadGateway, code, msg)
}

// internalError is a 500 for a local failure; msg is "English / 中文".
func internalError(msg string, err error) *pluginv1.HTTPResponse {
	return pluginsdk.ErrorResponse(http.StatusInternalServerError, "internal", msg+": "+err.Error())
}

const (
	msgSessionID = "cannot create the session id / 无法生成会话 ID"
	msgRandom    = "cannot generate random values / 无法生成随机数"
	msgHostID    = "cannot create the host id / 无法生成宿主 ID"
)

// ---------------------------------------------------------------- credentials

// Credentials is the credential object both flows return: the fields the
// console stores on the account (docs/PLUGIN-CODEX.md §4).
type Credentials struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	IDToken      string `json:"id_token,omitempty"`
	ExpiresAt    int64  `json:"expires_at,omitempty"`
	Email        string `json:"email,omitempty"`
	PlanType     string `json:"plan_type,omitempty"`
	// codex_device
	ChatGPTAccountID string `json:"chatgpt_account_id,omitempty"`
	// chatgpt_siwc
	ClientID       string `json:"client_id,omitempty"`
	ExtAgentHostID string `json:"ext_agent_host_id,omitempty"`
	// Scopes is the granted scope, space separated as OAuth sends it.
	Scopes string `json:"scopes,omitempty"`
}

func (p *Plugin) credentialsFrom(tr tokenResponse) Credentials {
	id := parseIdentity(tr.IDToken, tr.AccessToken)
	return Credentials{
		AccessToken:  strings.TrimSpace(tr.AccessToken),
		RefreshToken: strings.TrimSpace(tr.RefreshToken),
		IDToken:      strings.TrimSpace(tr.IDToken),
		ExpiresAt:    p.expiresAt(tr),
		Email:        id.Email,
		PlanType:     id.PlanType,
	}
}

func readToken(a authAnswer) (tokenResponse, error) {
	var tr tokenResponse
	if err := json.Unmarshal(a.body, &tr); err != nil {
		return tr, fmt.Errorf("unreadable token response / 无法解析令牌响应: %w", err)
	}
	if strings.TrimSpace(tr.AccessToken) == "" {
		return tr, errors.New("token response has no access_token / 令牌响应中没有 access_token")
	}
	return tr, nil
}

// ---------------------------------------------------------------- device code

// deviceSession is the KV state of one device code login.
type deviceSession struct {
	DeviceAuthID string `json:"device_auth_id"`
	UserCode     string `json:"user_code"`
	Interval     int    `json:"interval"`
	ExpiresAt    int64  `json:"expires_at"` // Unix seconds
	// LastPollMs is when the plugin last asked the issuer (Unix ms).
	LastPollMs int64 `json:"last_poll_ms,omitempty"`
}

// DeviceStartResponse answers POST /auth/device/start.
type DeviceStartResponse struct {
	SessionID       string `json:"session_id"`
	VerificationURL string `json:"verification_url"`
	UserCode        string `json:"user_code"`
	Interval        int    `json:"interval"`
	ExpiresIn       int    `json:"expires_in"`
}

// DevicePollResponse answers POST /auth/device/poll.
type DevicePollResponse struct {
	Status      string       `json:"status"` // pending | done | expired | error
	Credentials *Credentials `json:"credentials,omitempty"`
	Message     string       `json:"message,omitempty"`
	// Interval is the poll interval in seconds, on pending answers.
	Interval int `json:"interval,omitempty"`
}

// parseInterval reads the issuer's interval (a string of seconds, or a number).
func parseInterval(r gjson.Result) int {
	n := 0
	switch r.Type {
	case gjson.Number:
		n = int(r.Int())
	case gjson.String:
		n, _ = strconv.Atoi(strings.TrimSpace(r.String()))
	}
	if n <= 0 {
		return defaultInterval
	}
	return min(n, maxInterval)
}

// handleDeviceStart asks the issuer for a user code (one request).
func (p *Plugin) handleDeviceStart(ctx context.Context, _ *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	a, err := p.postJSON(ctx, p.ep.Auth+"/api/accounts/deviceauth/usercode", map[string]string{"client_id": CodexClientID})
	if err != nil {
		return upstreamError("upstream_unavailable", "cannot reach the OpenAI authorization server / 无法连接 OpenAI 授权服务器: "+err.Error()), nil
	}
	if a.status == http.StatusNotFound {
		return flowError("device_auth_disabled", "device code login is not enabled for this ChatGPT account or workspace: turn on Device code authorization in ChatGPT Settings → Security (a workspace admin must allow it) / 该 ChatGPT 账号或工作区未开启设备码登录：请在 ChatGPT 设置 → 安全 中开启“设备码授权”（企业工作区需管理员开启）"), nil
	}
	if !a.ok() {
		return upstreamError("upstream_error", "device code request failed / 申请设备码失败 ("+a.describe()+")"), nil
	}
	deviceAuthID := strings.TrimSpace(gjson.GetBytes(a.body, "device_auth_id").String())
	userCode := strings.TrimSpace(gjson.GetBytes(a.body, "user_code").String())
	if userCode == "" {
		userCode = strings.TrimSpace(gjson.GetBytes(a.body, "usercode").String())
	}
	if deviceAuthID == "" || userCode == "" {
		return upstreamError("upstream_error", "the device code answer has no device_auth_id or user_code / 设备码响应缺少 device_auth_id 或 user_code"), nil
	}
	sessionID, err := randomToken(24)
	if err != nil {
		return internalError(msgSessionID, err), nil
	}
	s := deviceSession{
		DeviceAuthID: deviceAuthID, UserCode: userCode,
		Interval:  parseInterval(gjson.GetBytes(a.body, "interval")),
		ExpiresAt: p.now().Add(deviceTTL).Unix(),
	}
	if err := p.saveSession(ctx, kvDevice, sessionID, s, deviceTTL); err != nil {
		return pluginsdk.Unavailable("store the session / 保存会话失败: " + err.Error()), nil
	}
	return pluginsdk.DataResponse(DeviceStartResponse{
		SessionID: sessionID, VerificationURL: p.ep.Auth + "/codex/device", UserCode: userCode,
		Interval: s.Interval, ExpiresIn: int(deviceTTL / time.Second),
	}), nil
}

type sessionRequest struct {
	SessionID string `json:"session_id"`
}

// handleDevicePoll asks the issuer ONCE whether the user has approved the
// code. A poll that comes sooner than the interval after the previous one is
// answered "pending" without asking. On approval it exchanges the code for
// tokens (a second request, once) and ends the session.
//
// The session's read-modify-write runs under a cluster lock per session
// (Host.Locks), so two polls racing (two tabs, two nodes) cannot both see the
// approval and both spend the single-use code: the one that finds the lock
// taken answers "pending" and polls again later.
func (p *Plugin) handleDevicePoll(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in sessionRequest
	if err := decodeOptional(req, &in); err != nil {
		return errInvalidJSON(), nil
	}
	id := strings.TrimSpace(in.SessionID)
	if id == "" {
		return errNoSession(), nil
	}
	if p.host == nil {
		return pluginsdk.Unavailable("the plugin is not ready / 插件尚未就绪: " + pluginsdk.ErrHostNotReady.Error()), nil
	}
	lock, ok, err := p.host.Locks().TryAcquire(ctx, pollLockName(id), pollLockTTL)
	if err != nil {
		p.log.Warn("codex: lock the device code session", "error", err.Error())
		return pluginsdk.Unavailable("lock the session / 锁定会话失败: " + err.Error()), nil
	}
	if !ok {
		return pollAnswer(DevicePollResponse{Status: pollPending}), nil
	}
	defer p.releaseLock(ctx, lock)
	return p.pollDevice(ctx, id), nil
}

// Device code poll states (DevicePollResponse.Status).
const (
	pollPending = "pending"
	pollDone    = "done"
	pollExpired = "expired"
	pollError   = "error"
)

func pollAnswer(r DevicePollResponse) *pluginv1.HTTPResponse { return pluginsdk.DataResponse(r) }

func pollFailed(msg string) *pluginv1.HTTPResponse {
	return pollAnswer(DevicePollResponse{Status: pollError, Message: msg})
}

// pollLockName is the lock of one device code session. The session id is
// hashed: it is a secret, and base64url ids carry "_", which lock names do
// not allow.
func pollLockName(sessionID string) string {
	sum := sha256.Sum256([]byte(sessionID))
	return "device_poll:" + hex.EncodeToString(sum[:16])
}

// releaseLock gives a lock back, even when ctx has ended; a failure is
// logged and the lock lapses after its ttl.
func (p *Plugin) releaseLock(ctx context.Context, l *pluginsdk.Lock) {
	rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), lockReleaseTimeout)
	defer cancel()
	if err := l.Release(rctx); err != nil {
		p.log.Warn("codex: release the device code session lock", "error", err.Error())
	}
}

// pollDevice is one poll of session id, under its lock.
func (p *Plugin) pollDevice(ctx context.Context, id string) *pluginv1.HTTPResponse {
	var s deviceSession
	found, err := p.loadSession(ctx, kvDevice, id, &s)
	if err != nil {
		return pluginsdk.Unavailable("read the session / 读取会话失败: " + err.Error())
	}
	now := p.now()
	if !found || now.Unix() >= s.ExpiresAt {
		if found {
			p.deleteSession(ctx, kvDevice, id)
		}
		return pollAnswer(DevicePollResponse{Status: pollExpired, Message: "the device code expired; start again / 设备码已过期，请重新开始"})
	}
	pending := func(msg string) *pluginv1.HTTPResponse {
		return pollAnswer(DevicePollResponse{Status: pollPending, Interval: s.Interval, Message: msg})
	}
	// One second of slack for timer jitter in the browser.
	if s.LastPollMs > 0 && now.UnixMilli()-s.LastPollMs < int64(s.Interval-1)*1000 {
		return pending("")
	}
	s.LastPollMs = now.UnixMilli()
	ttl := max(time.Unix(s.ExpiresAt, 0).Sub(now), time.Second)
	if err := p.saveSession(ctx, kvDevice, id, s, ttl); err != nil {
		return pluginsdk.Unavailable("store the session / 保存会话失败: " + err.Error())
	}

	a, err := p.postJSON(ctx, p.ep.Auth+"/api/accounts/deviceauth/token", map[string]string{"device_auth_id": s.DeviceAuthID, "user_code": s.UserCode})
	if err != nil {
		// A network blip must not end the login: the next poll asks again.
		p.log.Warn("codex: device code status request failed", "error", err.Error())
		return pending("cannot reach the OpenAI authorization server, retrying / 暂时无法连接 OpenAI 授权服务器，稍后重试")
	}
	switch {
	case a.status == http.StatusForbidden || a.status == http.StatusNotFound:
		return pending("")
	case a.status == http.StatusTooManyRequests:
		s.Interval = min(s.Interval+slowDownStep, maxInterval)
		if err := p.saveSession(ctx, kvDevice, id, s, ttl); err != nil {
			p.log.Warn("codex: store the slowed-down device code session", "error", err.Error())
		}
		return pending("")
	case !a.ok():
		p.deleteSession(ctx, kvDevice, id)
		p.log.Warn("codex: device code login refused", "status", a.status, "oauth_error", oauthErrorCode(a.body))
		return pollFailed("device code login failed / 设备码登录失败 (" + a.describe() + ")")
	}
	// The code is single-use: whatever happens next, this session is done.
	p.deleteSession(ctx, kvDevice, id)
	return p.exchangeDeviceCode(ctx, a)
}

// exchangeDeviceCode turns an approval answer into credentials (one request).
func (p *Plugin) exchangeDeviceCode(ctx context.Context, approval authAnswer) *pluginv1.HTTPResponse {
	code := strings.TrimSpace(gjson.GetBytes(approval.body, "authorization_code").String())
	verifier := strings.TrimSpace(gjson.GetBytes(approval.body, "code_verifier").String())
	if code == "" || verifier == "" {
		p.log.Warn("codex: device code approval without authorization_code or code_verifier")
		return pollFailed("the approval answer has no authorization_code or code_verifier / 授权响应缺少 authorization_code 或 code_verifier")
	}
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", p.ep.Auth+"/deviceauth/callback")
	form.Set("client_id", CodexClientID)
	form.Set("code_verifier", verifier)
	t, err := p.postForm(ctx, p.ep.Auth+"/oauth/token", form)
	if err != nil {
		p.log.Warn("codex: device code token exchange failed", "error", err.Error())
		return pollFailed("token exchange failed, start again / 换取令牌失败，请重新开始: " + err.Error())
	}
	if !t.ok() {
		p.log.Warn("codex: device code token exchange refused", "status", t.status, "oauth_error", oauthErrorCode(t.body))
		return pollFailed("token exchange failed, start again / 换取令牌失败，请重新开始 (" + t.describe() + ")")
	}
	tr, err := readToken(t)
	if err != nil {
		p.log.Warn("codex: device code token answer unusable", "error", err.Error())
		return pollFailed(err.Error())
	}
	c := p.credentialsFrom(tr)
	c.ChatGPTAccountID = parseIdentity(tr.IDToken, tr.AccessToken).AccountID
	return pollAnswer(DevicePollResponse{Status: pollDone, Credentials: &c})
}

// ---------------------------------------------------------------- Sign in with ChatGPT

// siwcSession is the KV state of one Sign in with ChatGPT authorization.
type siwcSession struct {
	State    string `json:"state"`
	Nonce    string `json:"nonce"`
	Verifier string `json:"code_verifier"`
	HostID   string `json:"ext_agent_host_id"`
	// ClientID is the issued client of a re-authorization ("" for a new
	// registration, which uses dynamic_agent_client).
	ClientID string `json:"client_id,omitempty"`
}

// SIWCStartRequest is the body of POST /auth/siwc/start; a re-authorization
// sends the account's client_id and ext_agent_host_id.
type SIWCStartRequest struct {
	ClientID       string `json:"client_id"`
	ExtAgentHostID string `json:"ext_agent_host_id"`
}

// SIWCStartResponse answers POST /auth/siwc/start.
type SIWCStartResponse struct {
	SessionID    string `json:"session_id"`
	AuthorizeURL string `json:"authorize_url"`
}

// SIWCExchangeRequest is the body of POST /auth/siwc/exchange.
type SIWCExchangeRequest struct {
	SessionID   string `json:"session_id"`
	CallbackURL string `json:"callback_url"`
}

// SIWCExchangeResponse answers POST /auth/siwc/exchange.
type SIWCExchangeResponse struct {
	Credentials Credentials `json:"credentials"`
}

// validClientID accepts an issued client id: printable, no spaces.
func validClientID(s string) bool {
	if s == "" || len(s) > 256 {
		return false
	}
	for _, r := range s {
		if r <= ' ' || r > '~' {
			return false
		}
	}
	return true
}

// handleSIWCStart creates the PKCE session and returns the authorize URL.
// It sends nothing to OpenAI.
func (p *Plugin) handleSIWCStart(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in SIWCStartRequest
	if err := decodeOptional(req, &in); err != nil {
		return errInvalidJSON(), nil
	}
	clientID := strings.TrimSpace(in.ClientID)
	if clientID == SIWCDynamicClient {
		clientID = ""
	}
	if clientID != "" && !validClientID(clientID) {
		return pluginsdk.BadRequest("client_id", "pattern", "client_id is not a valid client id / client_id 格式不正确"), nil
	}
	hostID := strings.TrimSpace(in.ExtAgentHostID)
	if hostID != "" && !hostIDPattern.MatchString(hostID) {
		return pluginsdk.BadRequest("ext_agent_host_id", "pattern", "ext_agent_host_id must be urn:uuid:<UUID> / ext_agent_host_id 必须是 urn:uuid:<UUID>"), nil
	}
	var err error
	if hostID == "" {
		if hostID, err = newHostID(); err != nil {
			return internalError(msgHostID, err), nil
		}
	}
	s := siwcSession{HostID: hostID, ClientID: clientID}
	for _, f := range []*string{&s.State, &s.Nonce} {
		if *f, err = randomToken(24); err != nil {
			return internalError(msgRandom, err), nil
		}
	}
	if s.Verifier, err = randomToken(48); err != nil { // 64 characters
		return internalError(msgRandom, err), nil
	}
	sessionID, err := randomToken(24)
	if err != nil {
		return internalError(msgSessionID, err), nil
	}
	if err := p.saveSession(ctx, kvSIWC, sessionID, s, siwcTTL); err != nil {
		return pluginsdk.Unavailable("store the session / 保存会话失败: " + err.Error()), nil
	}
	q := url.Values{}
	if clientID == "" {
		q.Set("client_id", SIWCDynamicClient)
		q.Set("agent_name_hint", SIWCAgentName)
	} else {
		q.Set("client_id", clientID)
	}
	q.Set("ext_agent_host_id", hostID)
	q.Set("response_type", "code")
	q.Set("redirect_uri", SIWCRedirectURI)
	q.Set("scope", SIWCScope)
	q.Set("resource", SIWCResource)
	q.Set("state", s.State)
	q.Set("nonce", s.Nonce)
	q.Set("code_challenge_method", "S256")
	q.Set("code_challenge", pkceChallenge(s.Verifier))
	return pluginsdk.DataResponse(SIWCStartResponse{
		SessionID: sessionID, AuthorizeURL: p.ep.Auth + "/api/accounts/authorize?" + q.Encode(),
	}), nil
}

// callbackParams are the parameters of the redirect to the local callback.
type callbackParams struct {
	Code, State, ClientID, Scope string
	Error, ErrorDescription      string
}

// parseCallback reads what the operator pasted: the whole address of the
// page the browser could not open (http://127.0.0.1:1455/auth/callback?...),
// the address without its scheme, or only the query ("?code=..." or
// "code=..."). Parameters in a fragment are read when the query has none.
// HTML-escaped ampersands and surrounding quotes or angle brackets are
// tolerated. The first value of a repeated parameter counts.
func parseCallback(raw string) (callbackParams, error) {
	s := strings.TrimSpace(raw)
	s = strings.Trim(s, "\"'<>` \t\r\n")
	s = strings.ReplaceAll(s, "&amp;", "&")
	if s == "" {
		return callbackParams{}, errors.New("the callback address is empty / 回调网址为空")
	}
	var query, fragment string
	if i := strings.IndexByte(s, '#'); i >= 0 {
		s, fragment = s[:i], s[i+1:]
	}
	switch i := strings.IndexByte(s, '?'); {
	case i >= 0:
		query = s[i+1:]
	case strings.Contains(s, "://") || (!strings.Contains(s, "=") && strings.Contains(s, "/")):
		query = "" // an address without a query
	default:
		query = s
	}
	values, err := url.ParseQuery(query)
	if err != nil {
		return callbackParams{}, fmt.Errorf("cannot read the callback address / 无法解析回调网址: %w", err)
	}
	if values.Get("code") == "" && values.Get("error") == "" && fragment != "" {
		if fv, ferr := url.ParseQuery(fragment); ferr == nil {
			values = fv
		}
	}
	cb := callbackParams{
		Code: strings.TrimSpace(values.Get("code")), State: strings.TrimSpace(values.Get("state")),
		ClientID: strings.TrimSpace(values.Get("client_id")), Scope: strings.TrimSpace(values.Get("scope")),
		Error: strings.TrimSpace(values.Get("error")), ErrorDescription: strings.TrimSpace(values.Get("error_description")),
	}
	if cb.Code == "" && cb.Error == "" {
		return cb, errors.New("the callback address has no code: paste the whole address of the page that failed to open / 回调网址中没有 code：请粘贴打不开的那个页面的完整地址")
	}
	return cb, nil
}

// hasScope reports whether the space separated scope list grants want.
func hasScope(scopes, want string) bool {
	return slices.Contains(strings.Fields(scopes), want)
}

// handleSIWCExchange checks the pasted callback against the session and
// exchanges the code for tokens (one request).
func (p *Plugin) handleSIWCExchange(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in SIWCExchangeRequest
	if err := decodeOptional(req, &in); err != nil {
		return errInvalidJSON(), nil
	}
	id := strings.TrimSpace(in.SessionID)
	if id == "" {
		return errNoSession(), nil
	}
	cb, err := parseCallback(in.CallbackURL)
	if err != nil {
		return flowError("invalid_callback", err.Error()), nil
	}
	var s siwcSession
	found, err := p.loadSession(ctx, kvSIWC, id, &s)
	if err != nil {
		return pluginsdk.Unavailable("read the session / 读取会话失败: " + err.Error()), nil
	}
	if !found {
		return pluginsdk.ErrorResponse(http.StatusNotFound, "session_expired", "the authorization session expired; generate a new link / 授权会话已过期，请重新生成链接"), nil
	}
	if cb.Error != "" {
		msg := cb.Error
		if cb.ErrorDescription != "" {
			msg += ": " + cb.ErrorDescription
		}
		p.log.Warn("codex: Sign in with ChatGPT authorization failed", "oauth_error", cb.Error)
		if cb.Error == "access_denied" {
			p.deleteSession(ctx, kvSIWC, id)
			return flowError("access_denied", "authorization was denied / 授权被拒绝 ("+msg+")"), nil
		}
		return flowError("authorization_failed", "authorization failed / 授权失败 ("+msg+")"), nil
	}
	if cb.State != s.State {
		return flowError("state_mismatch", "the callback does not belong to this authorization (state mismatch); paste the address from the latest link / 回调与本次授权不匹配（state 不一致），请粘贴最新链接的回调地址"), nil
	}
	clientID := s.ClientID
	switch issued := cb.ClientID; {
	case clientID == "" && (issued == "" || issued == SIWCDynamicClient):
		return flowError("registration_incomplete", "the callback has no issued client_id: the registration did not complete; authorize again / 回调中没有发放的 client_id，注册未完成，请重新授权"), nil
	case clientID == "":
		if !validClientID(issued) {
			return flowError("invalid_callback", "the callback client_id is not valid / 回调中的 client_id 格式不正确"), nil
		}
		clientID = issued
	case issued != "" && issued != clientID:
		return flowError("client_mismatch", "the callback client_id differs from the account's; re-authorize with the same ChatGPT account / 回调中的 client_id 与账号已有的不同，请用同一个 ChatGPT 账号重新授权"), nil
	}

	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("client_id", clientID)
	form.Set("code", cb.Code)
	form.Set("code_verifier", s.Verifier)
	form.Set("redirect_uri", SIWCRedirectURI)
	form.Set("resource", SIWCResource)
	a, err := p.postForm(ctx, p.ep.Auth+"/api/accounts/oauth/token", form)
	if err != nil {
		p.log.Warn("codex: Sign in with ChatGPT token exchange failed", "error", err.Error())
		return upstreamError("upstream_unavailable", "cannot reach the OpenAI authorization server / 无法连接 OpenAI 授权服务器: "+err.Error()), nil
	}
	if !a.ok() {
		p.log.Warn("codex: Sign in with ChatGPT token exchange refused", "status", a.status, "oauth_error", oauthErrorCode(a.body))
		return upstreamError("token_exchange_failed", "token exchange failed; generate a new link if the code was used / 换取令牌失败，授权码已用过时请重新生成链接 ("+a.describe()+")"), nil
	}
	tr, err := readToken(a)
	if err != nil {
		p.log.Warn("codex: Sign in with ChatGPT token answer unusable", "error", err.Error())
		return upstreamError("token_exchange_failed", err.Error()), nil
	}
	scopes := strings.TrimSpace(tr.Scope)
	if scopes == "" {
		scopes = cb.Scope
	}
	if !hasScope(scopes, ScopeDirect) {
		p.log.Warn("codex: Sign in with ChatGPT authorization lacks the direct-use scope", "scopes", scopes)
		return flowError("scope_missing", "the authorization did not grant "+ScopeDirect+" (ChatGPT plan usage); authorize again and allow it / 授权未包含 "+ScopeDirect+"（ChatGPT 套餐用量），请重新授权并允许 (granted: "+strconv.Quote(scopes)+")"), nil
	}
	p.deleteSession(ctx, kvSIWC, id)
	c := p.credentialsFrom(tr)
	c.ClientID = clientID
	c.ExtAgentHostID = s.HostID
	c.Scopes = scopes
	return pluginsdk.DataResponse(SIWCExchangeResponse{Credentials: c}), nil
}

// Package codex implements the codex plugin: two account types for the
// built-in openai platform that use the operator's OWN ChatGPT subscription
// (docs/PLUGIN-CODEX.md):
//
//   - codex_device: the Codex device code login (the public flow of the Codex
//     CLI's --device-auth); requests go to the ChatGPT Codex backend;
//   - chatgpt_siwc: OpenAI's Sign in with ChatGPT for third-party tools
//     (authorization code + PKCE); requests go to api.openai.com.
//
// Requests identify themselves truthfully: originator "sup2api" and
// User-Agent "sup2api-codex/<version>". The plugin does not imitate the
// Codex CLI (no Codex user agent, x-codex-* headers or TLS fingerprint) and
// does not add the Codex system prompt.
package codex

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

const (
	// Version is the plugin version (manifest.json "version"); it is part of
	// the User-Agent every request sends.
	Version = "0.1.3"
	// UserAgent and Originator name sup2api as the client, truthfully.
	UserAgent  = "sup2api-codex/" + Version
	Originator = "sup2api"

	// Account types (manifest accountTypes[].id).
	TypeDevice = "codex_device"
	TypeSIWC   = "chatgpt_siwc"

	// PlatformID is the built-in platform both types serve.
	PlatformID = "openai"
	// Upstream protocols BuildUpstreamRequest speaks (manifest endpoints
	// "responses" and "responses_websocket"; chat completions reach the
	// plugin converted to Responses by the core).
	ProtocolResponses   = "openai.responses"
	ProtocolResponsesWS = "openai.responses_ws"

	// Default service roots; tests point them at fake servers (Endpoints).
	DefaultAuthBase    = "https://auth.openai.com"
	DefaultChatGPTBase = "https://chatgpt.com"
	DefaultAPIBase     = "https://api.openai.com"

	// CodexClientID is the Codex CLI's public OAuth client (device code
	// flow and its refresh).
	CodexClientID = "app_EMoamEEZ73f0CkXaXp7hrann"
	// RefreshScope is the scope of a codex_device refresh.
	RefreshScope = "openid profile email"

	// Sign in with ChatGPT.
	SIWCDynamicClient = "dynamic_agent_client"
	SIWCAgentName     = "sup2api"
	SIWCRedirectURI   = "http://127.0.0.1:1455/auth/callback"
	SIWCScope         = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct"
	SIWCResource      = "https://api.openai.com/v1"
	// ScopeDirect must be granted for a Sign in with ChatGPT account to call
	// the Responses API on the user's plan.
	ScopeDirect = "chatgpt.tokens.use.direct"

	// WebSocketBeta opts the upstream connection into the Responses
	// WebSocket mode.
	WebSocketBeta = "responses_websockets=2026-02-06"

	// DefaultTestModel is used by BuildTestRequest when no model is given
	// (the smallest model of manifest defaultModels: the test uses the
	// owner's plan).
	DefaultTestModel = "gpt-5.1-codex-mini"
)

// Endpoints are the service roots the plugin talks to (no trailing slash).
type Endpoints struct {
	// Auth is the OpenAI issuer: device code, token and authorize endpoints.
	Auth string
	// ChatGPT serves the Codex backend (codex_device upstream).
	ChatGPT string
	// API serves the Responses API (chatgpt_siwc upstream, model list).
	API string
}

// DefaultEndpoints are the production roots.
var DefaultEndpoints = Endpoints{Auth: DefaultAuthBase, ChatGPT: DefaultChatGPTBase, API: DefaultAPIBase}

// Plugin is the codex plugin. It implements pluginsdk.Platform, Executor,
// ModelLister, CredentialRefresher, QuotaReader (codex_device usage
// windows), HTTP (authorization and usage reset routes) and Initializer.
type Plugin struct {
	*pluginsdk.Router
	host pluginsdk.Host
	ep   Endpoints
	// client sends the plugin's own requests (authorization routes only).
	// Its transport is the default one, which the SDK routes through the
	// host's egress tunnel in strict network mode.
	client *http.Client
	now    func() time.Time
	// log is the host log (Init); it discards until then. Never log tokens,
	// authorization codes, PKCE verifiers, state or session ids.
	log *slog.Logger
}

// New returns the plugin talking to the production endpoints.
func New() *Plugin { return NewWithEndpoints(DefaultEndpoints) }

// NewWithEndpoints returns the plugin talking to ep (tests).
func NewWithEndpoints(ep Endpoints) *Plugin {
	p := &Plugin{
		Router: pluginsdk.NewRouter(),
		ep: Endpoints{
			Auth:    strings.TrimRight(ep.Auth, "/"),
			ChatGPT: strings.TrimRight(ep.ChatGPT, "/"),
			API:     strings.TrimRight(ep.API, "/"),
		},
		client: &http.Client{Timeout: authTimeout},
		now:    time.Now,
		log:    slog.New(slog.DiscardHandler),
	}
	p.Handle(http.MethodPost, "/auth/device/start", p.handleDeviceStart)
	p.Handle(http.MethodPost, "/auth/device/poll", p.handleDevicePoll)
	p.Handle(http.MethodPost, "/auth/siwc/start", p.handleSIWCStart)
	p.Handle(http.MethodPost, "/auth/siwc/exchange", p.handleSIWCExchange)
	p.Handle(http.MethodPost, "/reset-credits/list", p.handleResetList)
	p.Handle(http.MethodPost, "/reset-credits/consume", p.handleResetConsume)
	p.Handle(http.MethodPost, "/reset-credits/summary", p.handleResetSummary)
	return p
}

// Init implements pluginsdk.Initializer.
func (p *Plugin) Init(_ context.Context, h pluginsdk.Host) error {
	p.host = h
	if l := h.Logger(); l != nil {
		p.log = l
	}
	return nil
}

// ---------------------------------------------------------------- credentials

// credentials are the stored fields BuildUpstreamRequest and the refresh
// need. The full set is documented in docs/PLUGIN-CODEX.md §4.
type credentials struct {
	AccessToken      string `json:"access_token"`
	RefreshToken     string `json:"refresh_token"`
	IDToken          string `json:"id_token"`
	ChatGPTAccountID string `json:"chatgpt_account_id"`
	ClientID         string `json:"client_id"`
	ExtAgentHostID   string `json:"ext_agent_host_id"`
}

func parseCredentials(raw string) (credentials, error) {
	var c credentials
	if strings.TrimSpace(raw) == "" {
		return c, nil
	}
	err := json.Unmarshal([]byte(raw), &c)
	c.AccessToken = strings.TrimSpace(c.AccessToken)
	c.RefreshToken = strings.TrimSpace(c.RefreshToken)
	c.IDToken = strings.TrimSpace(c.IDToken)
	c.ChatGPTAccountID = strings.TrimSpace(c.ChatGPTAccountID)
	c.ClientID = strings.TrimSpace(c.ClientID)
	c.ExtAgentHostID = strings.TrimSpace(c.ExtAgentHostID)
	return c, err
}

// hostIDPattern is ext_agent_host_id: urn:uuid:<UUID>.
var hostIDPattern = regexp.MustCompile(`^urn:uuid:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// masked is the value the core shows (and sends back) for a stored
// sensitive field; it means "keep the stored value".
const masked = "******"

// ValidateCredentials implements pluginsdk.Platform. Only access_token is
// required: the refresh token and the identity fields are optional (an
// account without them simply cannot be renewed or shows no email). String
// fields are trimmed, expires_at becomes a number, and email /
// chatgpt_account_id / plan_type missing from the credentials are filled in
// from the id_token payload (see jwtClaims for why it is not verified).
func (p *Plugin) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	typ := in.GetAccountType()
	if typ != TypeDevice && typ != TypeSIWC {
		return invalid("account_type", "unsupported", "unsupported account type "+strconv.Quote(typ)+" / 不支持的账号类型"), nil
	}
	var m credMap
	if err := json.Unmarshal([]byte(orEmptyObject(in.GetCredentialsJson())), &m); err != nil || m == nil {
		return invalid("access_token", "invalid", "credentials must be a JSON object / 凭证必须是 JSON 对象"), nil
	}
	changed := m.trimStrings()
	if bad := m.checkStrings(); bad != nil {
		return bad, nil
	}
	expChanged, bad := m.normalizeExpiresAt()
	if bad != nil {
		return bad, nil
	}
	if typ == TypeSIWC {
		if bad := m.checkSIWC(); bad != nil {
			return bad, nil
		}
	}
	filled := m.fillIdentity(typ)
	out := &pluginv1.ValidateCredentialsResponse{}
	if changed || expChanged || filled {
		b, _ := json.Marshal(m)
		out.NormalizedCredentialsJson = string(b)
	}
	return out, nil
}

// credMap is the submitted credential object ValidateCredentials checks and
// normalizes in place.
type credMap map[string]any

// stringFields are the optional credential fields that must be strings.
var stringFields = []string{"refresh_token", "id_token", "email", "chatgpt_account_id", "plan_type", "client_id", "ext_agent_host_id"}

// str reads a string field: ("", true) when absent or null, ok=false when
// the value is not a string.
func (m credMap) str(k string) (string, bool) {
	v, present := m[k]
	if !present || v == nil {
		return "", true
	}
	s, ok := v.(string)
	return s, ok
}

// trimStrings trims every string value and reports whether one changed.
func (m credMap) trimStrings() bool {
	changed := false
	for k, v := range m {
		if s, ok := v.(string); ok && strings.TrimSpace(s) != s {
			m[k] = strings.TrimSpace(s)
			changed = true
		}
	}
	return changed
}

// checkStrings requires a non-empty access_token and string-typed optional
// fields.
func (m credMap) checkStrings() *pluginv1.ValidateCredentialsResponse {
	at, ok := m.str("access_token")
	if !ok {
		return invalid("access_token", "pattern", "access_token must be a string / access_token 必须是字符串")
	}
	if at == "" {
		return invalid("access_token", "required", "access_token is required: authorize the account first / 请先完成授权以获取 access_token")
	}
	for _, k := range stringFields {
		if _, ok := m.str(k); !ok {
			return invalid(k, "pattern", k+" must be a string / "+k+" 必须是字符串")
		}
	}
	return nil
}

// normalizeExpiresAt turns a string expires_at into a number (an empty one is
// dropped) and refuses anything that is not Unix seconds.
func (m credMap) normalizeExpiresAt() (changed bool, bad *pluginv1.ValidateCredentialsResponse) {
	const msg = "expires_at must be Unix seconds / expires_at 必须是 Unix 秒"
	switch v := m["expires_at"].(type) {
	case nil, float64:
		return false, nil
	case string:
		if v == "" {
			delete(m, "expires_at")
			return true, nil
		}
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil || n < 0 {
			return false, invalid("expires_at", "pattern", msg)
		}
		m["expires_at"] = n
		return true, nil
	default:
		return false, invalid("expires_at", "pattern", msg)
	}
}

// checkSIWC requires the issued client_id and a well-formed host id.
func (m credMap) checkSIWC() *pluginv1.ValidateCredentialsResponse {
	if c, _ := m.str("client_id"); c == "" {
		return invalid("client_id", "required", "client_id is required: authorize the account with Sign in with ChatGPT first / 请先通过 Sign in with ChatGPT 完成授权")
	}
	if h, _ := m.str("ext_agent_host_id"); h != "" && !hostIDPattern.MatchString(h) {
		return invalid("ext_agent_host_id", "pattern", "ext_agent_host_id must be urn:uuid:<UUID> / ext_agent_host_id 必须是 urn:uuid:<UUID>")
	}
	return nil
}

// fillIdentity fills email, plan_type and (codex_device) chatgpt_account_id
// from the submitted id_token where the credentials leave them empty. A
// masked id_token ("******", the stored one) is not read.
func (m credMap) fillIdentity(typ string) bool {
	idt, _ := m.str("id_token")
	if idt == "" || idt == masked {
		return false
	}
	id := parseIdentity(idt, "")
	changed := false
	fill := func(k, v string) {
		if cur, _ := m.str(k); cur == "" && v != "" {
			m[k] = v
			changed = true
		}
	}
	fill("email", id.Email)
	fill("plan_type", id.PlanType)
	if typ == TypeDevice {
		fill("chatgpt_account_id", id.AccountID)
	}
	return changed
}

func invalid(field, code, msg string) *pluginv1.ValidateCredentialsResponse {
	return &pluginv1.ValidateCredentialsResponse{Errors: []*pluginv1.FieldError{{Field: field, Code: code, Message: msg}}}
}

func orEmptyObject(s string) string {
	if strings.TrimSpace(s) == "" {
		return "{}"
	}
	return s
}

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
	Version = "0.1.1"
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
// ModelLister, CredentialRefresher, HTTP (authorization routes) and
// Initializer.
type Plugin struct {
	*pluginsdk.Router
	host pluginsdk.Host
	ep   Endpoints
	// client sends the plugin's own requests (authorization routes only).
	// Its transport is the default one, which the SDK routes through the
	// host's egress tunnel in strict network mode.
	client *http.Client
	now    func() time.Time
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
		client: &http.Client{Timeout: 20 * time.Second},
		now:    time.Now,
	}
	p.Handle(http.MethodPost, "/auth/device/start", p.handleDeviceStart)
	p.Handle(http.MethodPost, "/auth/device/poll", p.handleDevicePoll)
	p.Handle(http.MethodPost, "/auth/siwc/start", p.handleSIWCStart)
	p.Handle(http.MethodPost, "/auth/siwc/exchange", p.handleSIWCExchange)
	return p
}

// Init implements pluginsdk.Initializer.
func (p *Plugin) Init(_ context.Context, h pluginsdk.Host) error {
	p.host = h
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
// from the id_token payload.
func (p *Plugin) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	typ := in.GetAccountType()
	if typ != TypeDevice && typ != TypeSIWC {
		return invalid("account_type", "unsupported", "unsupported account type "+strconv.Quote(typ)+" / 不支持的账号类型"), nil
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(orEmptyObject(in.GetCredentialsJson())), &m); err != nil || m == nil {
		return invalid("access_token", "invalid", "credentials must be a JSON object / 凭证必须是 JSON 对象"), nil
	}
	changed := false
	for k, v := range m {
		if s, ok := v.(string); ok && strings.TrimSpace(s) != s {
			m[k] = strings.TrimSpace(s)
			changed = true
		}
	}
	str := func(k string) (string, bool) {
		v, present := m[k]
		if !present || v == nil {
			return "", true
		}
		s, ok := v.(string)
		return s, ok
	}
	at, ok := str("access_token")
	if !ok {
		return invalid("access_token", "pattern", "access_token must be a string / access_token 必须是字符串"), nil
	}
	if at == "" {
		return invalid("access_token", "required", "access_token is required: authorize the account first / 请先完成授权以获取 access_token"), nil
	}
	for _, k := range []string{"refresh_token", "id_token", "email", "chatgpt_account_id", "plan_type", "client_id", "ext_agent_host_id"} {
		if _, ok := str(k); !ok {
			return invalid(k, "pattern", k+" must be a string / "+k+" 必须是字符串"), nil
		}
	}
	switch v := m["expires_at"].(type) {
	case nil, float64:
	case string:
		if v == "" {
			delete(m, "expires_at")
		} else if n, err := strconv.ParseInt(v, 10, 64); err == nil && n >= 0 {
			m["expires_at"] = n
		} else {
			return invalid("expires_at", "pattern", "expires_at must be Unix seconds / expires_at 必须是 Unix 秒"), nil
		}
		changed = true
	default:
		return invalid("expires_at", "pattern", "expires_at must be Unix seconds / expires_at 必须是 Unix 秒"), nil
	}
	if typ == TypeSIWC {
		if c, _ := str("client_id"); c == "" {
			return invalid("client_id", "required", "client_id is required: authorize the account with Sign in with ChatGPT first / 请先通过 Sign in with ChatGPT 完成授权"), nil
		}
		if h, _ := str("ext_agent_host_id"); h != "" && !hostIDPattern.MatchString(h) {
			return invalid("ext_agent_host_id", "pattern", "ext_agent_host_id must be urn:uuid:<UUID> / ext_agent_host_id 必须是 urn:uuid:<UUID>"), nil
		}
	}
	if idt, _ := str("id_token"); idt != "" && idt != masked {
		id := parseIdentity(idt, "")
		fill := func(k, v string) {
			if cur, _ := str(k); cur == "" && v != "" {
				m[k] = v
				changed = true
			}
		}
		fill("email", id.Email)
		fill("plan_type", id.PlanType)
		if typ == TypeDevice {
			fill("chatgpt_account_id", id.AccountID)
		}
	}
	out := &pluginv1.ValidateCredentialsResponse{}
	if changed {
		b, _ := json.Marshal(m)
		out.NormalizedCredentialsJson = string(b)
	}
	return out, nil
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

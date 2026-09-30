// Package volcengine implements the "Volcengine Ark" plugin: the apikey
// account type for the core's built-in openai platform (ARCHITECTURE 6.6),
// i.e. credential validation, upstream request construction and error
// classification for Volcengine Ark (火山方舟 / 豆包).
//
// Ark speaks the OpenAI protocol, but its compatible API lives under
// /api/v3 instead of /v1, so this plugin exists mainly to rewrite the
// upstream path and to read Ark's own error codes. For chat, responses and
// embeddings it declares no endpoint of its own: the client keeps calling
// /v1/chat/completions, /v1/responses and /v1/embeddings and Ark accounts
// are scheduled next to plain OpenAI accounts in the same group.
//
// Image generation (Seedream) has no built-in platform, so the manifest
// declares the "volcengine" platform with one endpoint, POST
// /ark/v3/images/generations. It declares no price: the images fact
// (usage.generated_images) and the output tokens are the metering keys an
// administrator writes a price expression against (ARCHITECTURE 7.3).
//
// Scope so far (docs/PLUGIN-VOLCENGINE-ARK.md §6): chat, responses,
// embeddings (stage one), synchronous images (stage two) and the asset
// library (stage three: assets.go, arkapi.go, store.go, routes.go - the
// plugin's own admin routes over the Ark asset OpenAPI, with a local index in
// plg_volcengine). Video (Seedance) comes later.
package volcengine

import (
	"context"
	"encoding/json"
	"log/slog"
	"net"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/apikey"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/egress"
)

// PlatformID is the built-in platform the apikey account type serves.
const PlatformID = "openai"

// PlatformVolcengine is the platform this plugin declares itself
// (manifest platforms[]): Ark capabilities that have no built-in platform.
const PlatformVolcengine = "volcengine"

// PlatformAnthropic is the second built-in platform the apikey account type
// serves. Ark exposes an Anthropic-Messages-compatible surface, and the core
// registers no protocol converters at all (gateway/convert: the list is
// empty), so a client speaking Anthropic can only reach an Ark account if the
// account type declares this platform and the plugin forwards the body as it
// arrived - protocol in, same protocol out.
const PlatformAnthropic = "anthropic"

// Protocol ids of the built-in openai platform's endpoints
// (server/internal/platforms/openai.json).
const (
	ProtocolChat       = "openai.chat"
	ProtocolResponses  = "openai.responses"
	ProtocolEmbeddings = "openai.embeddings"
)

// Protocol ids of the built-in anthropic platform's endpoints
// (sdk/platforms/anthropic.json).
const (
	ProtocolMessages = "anthropic.messages"
	// ProtocolCountTokens is declared by the platform and therefore routed to
	// this account type whether we want it or not: AccountPlatform has no
	// per-endpoint filter, so declaring the platform accepts both endpoints.
	// Ark documents no token-counting endpoint, so BuildUpstreamRequest
	// refuses it by name rather than inventing a path that 404s.
	ProtocolCountTokens = "anthropic.count_tokens"
)

// Protocol ids of the volcengine platform declared in manifest.json.
const (
	// ProtocolImages is synchronous image generation (Seedream), served to
	// clients at POST /ark/v3/images/generations. Text-to-image and
	// image-to-image share this one upstream path.
	ProtocolImages = "volcengine.images"
)

// Protocols lists the protocols of the built-in openai platform that
// BuildUpstreamRequest supports, in that platform's endpoint order.
var Protocols = []string{ProtocolChat, ProtocolResponses, ProtocolEmbeddings}

// AnthropicProtocols lists the protocols of the built-in anthropic platform
// this plugin supports. count_tokens is deliberately absent - the platform
// declares it and routing therefore offers it to this account type anyway
// (AccountPlatform has no per-endpoint filter), but Ark has no such endpoint,
// so it is refused by name instead of sent somewhere that would 404.
var AnthropicProtocols = []string{ProtocolMessages}

// OwnProtocols lists the protocols of the plugin's own volcengine platform,
// in manifest endpoint order.
var OwnProtocols = []string{ProtocolImages, ProtocolVideoSubmit, ProtocolVideoQuery}

const (
	// AccountTypeAPIKey is the official account type: a key of Ark itself, at
	// one of Ark's own endpoints, serving Ark's own path layout.
	AccountTypeAPIKey = "apikey"
	// AccountTypeRelay is the Ark-compatible relay account type, named for
	// what people use it for: Doubao video through an aggregator. Its base URL
	// is free text and its paths are configurable, because a relay mounts the
	// Ark shapes wherever it likes.
	//
	// The two types exist so that "official or relay" is DECLARED rather than
	// guessed. An earlier version had one type and derived the layout from the
	// host of base_url; that works until it does not, and it made every field
	// of both cases share one form. The same split already exists one level up
	// in this repo - the anthropic plugin guards base_url to api.anthropic.com
	// while the relay plugin's relay_key type leaves it free - and for the same
	// reason: a relay's address cannot be expressed as an allow-list, so it
	// cannot share an account type with an upstream whose address is pinned.
	AccountTypeRelay = "relay"

	// DefaultBaseURL is used when an apikey account has no base_url: the
	// official Chinese Ark endpoint. The overseas BytePlus endpoint
	// (BytePlusBaseURL) is the other value guardedSettings allows.
	DefaultBaseURL = "https://ark.cn-beijing.volces.com"
	// BytePlusBaseURL is Ark's overseas (BytePlus) endpoint.
	BytePlusBaseURL = "https://ark.ap-southeast.bytepluses.com"

	// APIPrefix is the root of Ark's own OpenAI-compatible API, and the whole
	// layout of an apikey account: not configurable there, because Ark serves
	// one layout and an account of that type is by definition on Ark.
	APIPrefix = "/api/v3"

	// RelayAPIPrefix is the default layout of a relay account: the standard
	// OpenAI and Anthropic paths (/v1/chat/completions, /v1/messages), which is
	// what every Ark-compatible relay measured so far serves.
	RelayAPIPrefix = "/v1"

	// FieldAPIPrefix overrides a relay's text-surface layout, for a relay that
	// mirrors Ark's own paths under its own host. FieldVideoAPIPrefix is
	// separate because Ark's native video tasks are the thing a relay most
	// often mounts in a namespace of its own. Neither is offered on the apikey
	// type.
	FieldAPIPrefix      = "api_prefix"
	FieldVideoAPIPrefix = "video_api_prefix"

	// MaxPrefixLen bounds a prefix. Long enough for a namespaced relay path
	// ("/doubao/api/v3"), short enough that the field cannot carry a payload.
	MaxPrefixLen = 128

	// DefaultTestModel is used by BuildTestRequest when the operator names
	// no model. doubao-seed-1-6-250615 is Ark's long-standing general chat
	// model: a dated snapshot id (so it cannot drift under us), enabled by
	// default on accounts created through the normal console flow, and the
	// id the official quick-start uses. The console test dialog can always
	// override it (CONTRACTS §15.9), which is the escape hatch for accounts
	// that only opened other models.
	DefaultTestModel = "doubao-seed-1-6-250615"
	// testMaxTokens keeps the probe as cheap as possible while staying
	// above the minimum a thinking-capable Doubao model accepts: the
	// default test model may spend its budget on reasoning tokens, and a
	// max_tokens of 1 is rejected by some Ark models. 16 output tokens are
	// negligible and the test only needs a 2xx.
	testMaxTokens = 16

	// BotModelPrefix marks an Ark "bot" (application) id, which is served
	// by a different path than a plain model. Ark ids look like
	// "bot-20250101...".
	BotModelPrefix = "bot"

	// DefaultAnthropicVersion is sent on Anthropic-protocol requests whose
	// client sent none. Anthropic's API requires the header; the value is the
	// one its own docs and every current SDK use, and the same default the
	// anthropic plugin applies.
	DefaultAnthropicVersion = "2023-06-01"
)

// spec describes the apikey (official Ark) account type. A trailing /api/v3 of
// base_url is removed: operators paste the Ark SDK base URL
// ("https://ark.cn-beijing.volces.com/api/v3"), while guardedSettings
// (CONTRACTS §21.3) compares against the bare host, and the paths below add
// the prefix themselves.
var spec = apikey.Spec{AccountType: AccountTypeAPIKey, DefaultBaseURL: DefaultBaseURL, StripSuffixes: []string{APIPrefix}}

// relaySpec describes the relay account type. Two deliberate differences from
// spec:
//
//   - No DefaultBaseURL. A relay has no default address, so an account with no
//     base_url is a misconfiguration rather than an official account, and
//     relayBaseURL below says so instead of quietly sending a relay's key to
//     Ark.
//   - No StripSuffixes. On the apikey type, stripping /api/v3 undoes a paste of
//     Ark's documented SDK base URL. Here the base URL is the relay's root and
//     the layout is named by api_prefix, so stripping anything would silently
//     move an operator's request: "https://r/api/v3" with the default prefix
//     would become "https://r/v1/...". validateRelayBaseURL refuses that shape
//     with a message pointing at api_prefix, which is the value that expresses
//     it.
var relaySpec = apikey.Spec{AccountType: AccountTypeRelay}

// specFor returns the credential spec of an account type. An empty type means
// the official one: that is what an account row carried before the split, and
// what a caller that did not fill Account.type means.
func specFor(accountType string) (apikey.Spec, error) {
	switch accountType {
	case AccountTypeAPIKey, "":
		return spec, nil
	case AccountTypeRelay:
		return relaySpec, nil
	default:
		return apikey.Spec{}, status.Errorf(codes.FailedPrecondition, "unsupported account type %q", accountType)
	}
}

// accountConfig reads an account of either type: its credentials through the
// matching spec, and the upstream path layout the type implies.
func accountConfig(acc *pluginv1.Account) (*apikey.Config, prefixes, error) {
	sp, err := specFor(acc.GetType())
	if err != nil {
		return nil, prefixes{}, err
	}
	cfg, err := sp.FromAccount(acc)
	if err != nil {
		return nil, prefixes{}, err
	}
	if acc.GetType() == AccountTypeRelay && cfg.BaseURL == "" {
		return nil, prefixes{}, status.Errorf(codes.FailedPrecondition,
			"account %d: a %s account needs a base_url - there is no default relay address", acc.GetId(), AccountTypeRelay)
	}
	px, err := prefixesOf(acc.GetType(), acc.GetSettingsJson())
	if err != nil {
		return nil, prefixes{}, status.Errorf(codes.FailedPrecondition, "account %d settings: %v", acc.GetId(), err)
	}
	return cfg, px, nil
}

// forwardHeaders are the client headers copied verbatim to the upstream
// request. It must stay equal to the account type's passHeaders override in
// manifest.json: Ark ignores OpenAI's org/project and x-stainless-* headers,
// so only the user agent is passed on.
var forwardHeaders = []string{"user-agent"}

// anthropicForwardHeaders are the client headers copied on the Anthropic
// surface. It must stay equal to the anthropic entry's passHeaders override in
// manifest.json - that list REPLACES the platform's rather than merging with
// it, so the two have to be written the same on both sides or the header a
// client sent is dropped at one of them.
//
// anthropic-version and anthropic-beta are here because they change how the
// upstream reads the body: a client that asked for a beta shape and had the
// header dropped would get its request interpreted under different rules.
var anthropicForwardHeaders = []string{"anthropic-version", "anthropic-beta", "user-agent"}

// ForwardHeaders returns the client headers copied to the upstream request.
func ForwardHeaders() []string { return append([]string(nil), forwardHeaders...) }

// AnthropicForwardHeaders returns the client headers copied on the Anthropic
// surface.
func AnthropicForwardHeaders() []string {
	return append([]string(nil), anthropicForwardHeaders...)
}

// Plugin is the volcengine plugin. It implements pluginsdk.Platform and,
// since stage three, pluginsdk.HTTP (the asset library routes in routes.go)
// plus the lifecycle interfaces they need.
//
// It deliberately does not implement pluginsdk.ModelLister: Ark documents no
// API-key-authenticated "list models" endpoint, so BuildModelsRequest
// answers UNIMPLEMENTED (CONTRACTS §19) instead of pointing the core at a
// guessed URL.
type Plugin struct {
	*pluginsdk.Router

	now  func() time.Time
	host pluginsdk.Host
	log  *slog.Logger

	// dial is how the asset library reaches upstream. Init sets it to the
	// host egress tunnel (or a direct dialler when the SDK did not install
	// the tunnel, i.e. outside strict network mode); a test may preset it.
	dial DialFunc
	ark  *arkAPI
}

// New returns the plugin.
func New() *Plugin {
	p := &Plugin{Router: pluginsdk.NewRouter(), now: time.Now, log: slog.Default()}
	p.routes()
	return p
}

// SetDialer overrides how the asset library dials upstream. Only for tests;
// it must be called before Init, which leaves a preset dialler alone.
func (p *Plugin) SetDialer(d DialFunc) { p.dial = d }

// Init implements pluginsdk.Initializer: it wires the asset library's
// outbound network to the host egress tunnel. Every asset library request is
// dialled through it, because a plugin in strict network mode cannot open a
// socket of its own (sdk/pluginsdk/egress).
func (p *Plugin) Init(_ context.Context, h pluginsdk.Host) error {
	p.host = h
	p.log = h.Logger()
	if p.dial == nil {
		if h.EgressInstalled() {
			p.dial = egress.DialContext
		} else {
			// The SDK did not install the tunnel (strict network off, or a
			// test harness): dial directly. In production on Linux this
			// branch is not taken - and if it were, the sandbox would refuse
			// the socket rather than letting traffic escape unlogged.
			d := &net.Dialer{Timeout: 10 * time.Second, KeepAlive: 30 * time.Second}
			p.dial = d.DialContext
		}
	}
	p.ark = newArkAPI(p.dial)
	return nil
}

// Shutdown implements pluginsdk.Shutdowner.
func (p *Plugin) Shutdown(context.Context) error {
	if p.ark != nil {
		p.ark.close()
	}
	return nil
}

// ValidateCredentials implements pluginsdk.Platform: api_key is required,
// base_url is optional and, when given, must be an absolute http(s) URL, and
// the asset library fields are checked on top (assets.go): the AK/SK pair has
// to be complete or completely absent. The normalized values come back in
// normalized_{credentials,settings}_json.
func (p *Plugin) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return p.validateWithAssets(in), nil
}

// chatPath returns the chat completions path for an upstream model: Ark
// serves bots (applications) under <prefix>/bots/chat/completions and plain
// models under <prefix>/chat/completions.
func chatPath(prefix, model string) string {
	if strings.HasPrefix(model, BotModelPrefix) {
		return prefix + "/bots/chat/completions"
	}
	return prefix + "/chat/completions"
}

// upstreamPath maps the upstream protocol (RequestMeta.protocol, which may
// differ from the client endpoint's protocol when the core converts the
// request) and the upstream model to the Ark path. An empty protocol means
// chat completions.
//
// The image path is the same for text-to-image and image-to-image: Ark
// decides from the request body, not the URL. Note the asymmetry with the
// client-facing path: the gateway endpoint is /ark/v3/images/generations
// because "api" is a reserved first path segment of the core, while upstream
// it stays Ark's own <prefix>/images/generations.
func upstreamPath(px prefixes, protocol, model string) (string, error) {
	switch protocol {
	case ProtocolChat, "":
		return chatPath(px.api, model), nil
	case ProtocolResponses:
		return px.api + "/responses", nil
	case ProtocolEmbeddings:
		return px.api + "/embeddings", nil
	case ProtocolImages:
		return px.api + "/images/generations", nil
	case ProtocolMessages:
		// Forwarded as it arrived: the core has no Anthropic-to-OpenAI
		// converter, so the body reaching us is already Anthropic-shaped and
		// the only decision is where to send it.
		//
		// Only the relay account type declares the anthropic platform, so in
		// practice px.anthropic is always set when this runs. The refusal is
		// the defensive half: Ark's own endpoints were measured on 2026-09-30
		// not to serve this protocol at all (/api/v3/messages answers 404 with
		// a zero-byte body, exactly like a path that was never registered,
		// while a real route answers 404 with a JSON error), so if routing ever
		// does hand an official account an Anthropic request, saying so beats
		// posting to a path known not to exist.
		if px.anthropic == "" {
			return "", status.Errorf(codes.InvalidArgument,
				"Ark's own endpoints do not serve Anthropic Messages, so %q needs a %q account pointed at an "+
					"Ark-compatible relay that does", protocol, AccountTypeRelay)
		}
		return px.anthropic + "/messages", nil
	case ProtocolCountTokens:
		// The relay type declares the anthropic platform, which makes it a
		// candidate for both of that platform's endpoints: AccountPlatform has
		// no per-endpoint filter. Neither Ark nor any relay measured so far
		// serves token counting. Failing by name beats guessing a path: the
		// client gets a reason and the core fails over to an account that does
		// serve it.
		return "", status.Errorf(codes.InvalidArgument,
			"Ark has no token-counting endpoint, so %q cannot be served by an Ark account", protocol)
	default:
		return "", status.Errorf(codes.InvalidArgument, "unsupported upstream protocol %q", protocol)
	}
}

// upstreamTarget maps the upstream protocol and model to the Ark method and
// path. Everything but the video line is a POST; video_query is a GET whose
// task id comes from the matched path parameter, which is why this takes the
// whole meta rather than just the protocol.
func upstreamTarget(px prefixes, meta *pluginv1.RequestMeta, model string) (method, path string, err error) {
	if m, p, ok, err := videoUpstream(px.video, meta); ok {
		return m, p, err
	}
	p, err := upstreamPath(px, meta.GetProtocol(), model)
	if err != nil {
		return "", "", err
	}
	return "POST", p, nil
}

// upstreamHeaders builds the upstream request headers for one protocol.
//
// Authorization: Bearer for every surface, including Anthropic Messages: Ark
// authenticates its whole API with the one key, and an Ark-compatible relay
// accepts the bearer form on the Anthropic route too. Sending x-api-key
// instead - the way api.anthropic.com wants it - would mean this plugin
// carried two notions of "the key" for one key.
//
// Anthropic requires a version header and rejects a request without one, so an
// Anthropic-protocol request that the client sent none for gets the default.
// The client's own value wins when it sent one: it knows which beta shape its
// body is in, and we must not silently downgrade it.
func upstreamHeaders(protocol, apiKey string, inbound map[string]string) map[string]string {
	h := map[string]string{
		"authorization": "Bearer " + apiKey,
		"content-type":  "application/json",
	}
	names := forwardHeaders
	if protocol == ProtocolMessages || protocol == ProtocolCountTokens {
		names = anthropicForwardHeaders
		if strings.TrimSpace(inbound["anthropic-version"]) == "" {
			h["anthropic-version"] = DefaultAnthropicVersion
		}
	}
	apikey.ForwardHeaders(h, inbound, names)
	return h
}

// requestModel returns the model to send upstream: the body field when the
// core forwarded one (requestFields), else meta.model. The core has already
// applied the account's model mapping (CONTRACTS §18).
func requestModel(in *pluginv1.BuildUpstreamRequestRequest) string {
	model := in.GetMeta().GetModel()
	if raw, ok := in.GetFields()["model"]; ok && raw != "" {
		var s string
		if json.Unmarshal([]byte(raw), &s) == nil && s != "" {
			model = s
		}
	}
	return model
}

// BuildUpstreamRequest implements pluginsdk.Platform: POST
// {base_url}{api_prefix}/... following meta.protocol and, for chat
// completions, the model (bots have their own path). Streaming chat
// completions get stream_options.include_usage=true so the upstream reports
// usage in the last chunk (CONTRACTS 14.1); Ark is OpenAI-compatible here.
func (p *Plugin) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	cfg, px, err := accountConfig(in.GetAccount())
	if err != nil {
		return nil, err
	}
	meta := in.GetMeta()
	model := requestModel(in)
	method, ep, err := upstreamTarget(px, meta, model)
	if err != nil {
		return nil, err
	}
	u, err := upstreamURL(cfg.BaseURL, ep)
	if err != nil {
		return nil, err
	}
	resp := &pluginv1.BuildUpstreamRequestResponse{
		Method:        method,
		Url:           u,
		Headers:       upstreamHeaders(meta.GetProtocol(), cfg.APIKey, in.GetInboundHeaders()),
		UpstreamModel: model,
	}
	if meta.GetStream() && (meta.GetProtocol() == ProtocolChat || meta.GetProtocol() == "") {
		resp.Patches = append(resp.Patches, &pluginv1.BodyPatch{Op: pluginv1.BodyPatch_OP_SET, Path: "stream_options.include_usage", ValueJson: "true"})
	}
	return resp, nil
}

// BuildTestRequest implements pluginsdk.Platform: a minimal chat completion.
// The response names the model really used and openai.chat as the protocol
// whose usage rules read the token counts, so the console test can show the
// token usage (account/testreq.go testUsage).
func (p *Plugin) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	cfg, px, err := accountConfig(in.GetAccount())
	if err != nil {
		return nil, err
	}
	model := strings.TrimSpace(in.GetModel())
	if model == "" {
		model = DefaultTestModel
	}
	// The test must use the same prefix real traffic will, or "test account"
	// answers a question nobody asked.
	u, err := upstreamURL(cfg.BaseURL, chatPath(px.api, model))
	if err != nil {
		return nil, err
	}
	body, _ := json.Marshal(map[string]any{
		"model":      model,
		"max_tokens": testMaxTokens,
		"messages":   []map[string]string{{"role": "user", "content": "ping"}},
	})
	return &pluginv1.BuildTestRequestResponse{
		Method:        "POST",
		Url:           u,
		Headers:       upstreamHeaders(ProtocolChat, cfg.APIKey, nil),
		BodyJson:      string(body),
		Model:         model,
		UsageProtocol: ProtocolChat,
	}, nil
}

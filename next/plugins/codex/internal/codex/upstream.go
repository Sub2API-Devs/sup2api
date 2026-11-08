package codex

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Request fields the manifest asks the core for (accountTypes[].platforms[]
// .requestFields), besides "model". They are gjson queries, so the plugin
// learns what it needs without being handed the whole prompt:
//
//   - FieldHasInstructions is 1 when the body has an instructions field,
//     0 when not (codex_device only: the Codex backend requires one);
//   - FieldStringInput is the input when it is a JSON string, and absent
//     when it is an array (both upstreams require an array);
//   - FieldSystemRoles has one entry per item of an array input, in order:
//     ["system"] for an item whose role is "system", [] for any other item
//     (another role, no role, not an object). It is absent when the input is
//     not an array. Only "system" is ever echoed, so the field stays at about
//     three bytes per item whatever the items hold.
const (
	FieldHasInstructions = "[instructions]|#"
	FieldStringInput     = `[input]|#(%"*")`
	FieldSystemRoles     = `input.#.[role].#(=="system")#`
)

// maxRoleRewrites caps the role patches of one request. Each patch is a copy
// of the body in the core, so a body made of thousands of system items would
// cost thousands of copies; real requests carry a few. Items past the cap are
// left as they are (the upstream answers its own error).
const maxRoleRewrites = 256

// unsupportedDevice are body fields the ChatGPT Codex backend rejects
// ("Unsupported parameter"); they are removed, not reinterpreted.
var unsupportedDevice = []string{
	"max_output_tokens", "max_completion_tokens", "temperature", "top_p",
	"frequency_penalty", "presence_penalty", "user", "metadata",
	"safety_identifier", "stream_options", "truncation", "prompt_cache_retention",
	"stop_sequences",
}

// unsupportedSIWC are body fields Sign in with ChatGPT's Responses API does
// not accept (docs/PLUGIN-CODEX.md §2.2.6). previous_response_id is only
// refused over HTTP; in the WebSocket mode it continues a turn on the same
// connection, so WebSocket messages keep it (httpOnlyUnsupported).
var unsupportedSIWC = []string{"temperature", "top_p", "max_output_tokens", "metadata", "user", "truncation", "previous_response_id"}

// httpOnlyUnsupported are fields of the lists above that a WebSocket message
// keeps: stream fields (a response.create has no stream; the plugin leaves
// stream settings alone there) and previous_response_id (valid within one
// upstream connection).
var httpOnlyUnsupported = map[string]bool{"stream_options": true, "previous_response_id": true}

// unsupportedFields are the fields removed from a request of the account
// type, over HTTP or in a WebSocket message.
func unsupportedFields(typ string, ws bool) []string {
	list := unsupportedSIWC
	if typ == TypeDevice {
		list = unsupportedDevice
	}
	if !ws {
		return list
	}
	out := make([]string, 0, len(list))
	for _, f := range list {
		if !httpOnlyUnsupported[f] {
			out = append(out, f)
		}
	}
	return out
}

// upstreamHeaders are the upstream headers of an account: the bearer token,
// the ChatGPT account (codex_device) and sup2api's own, truthful
// identification. No client header is forwarded.
func upstreamHeaders(typ string, c credentials) map[string]string {
	h := map[string]string{
		"authorization": "Bearer " + c.AccessToken,
		"originator":    Originator,
		"user-agent":    UserAgent,
	}
	if typ == TypeDevice && c.ChatGPTAccountID != "" {
		h["chatgpt-account-id"] = c.ChatGPTAccountID
	}
	return h
}

// responsesURL is the HTTP Responses endpoint of the account type.
func (p *Plugin) responsesURL(typ string) string {
	if typ == TypeDevice {
		return p.ep.ChatGPT + "/backend-api/codex/responses"
	}
	return p.ep.API + "/v1/responses"
}

// accountCredentials checks the account type and reads the credentials.
func accountCredentials(acc *pluginv1.Account) (string, credentials, error) {
	typ := acc.GetType()
	if typ != TypeDevice && typ != TypeSIWC {
		return "", credentials{}, status.Errorf(codes.FailedPrecondition, "account %d: unsupported account type %q", acc.GetId(), typ)
	}
	c, err := parseCredentials(acc.GetCredentialsJson())
	if err != nil {
		return "", c, status.Errorf(codes.InvalidArgument, "account %d: parse credentials: %v", acc.GetId(), err)
	}
	if c.AccessToken == "" {
		return "", c, status.Errorf(codes.FailedPrecondition, "account %d has no access_token; authorize it again / 账号没有 access_token，请重新授权", acc.GetId())
	}
	return typ, c, nil
}

func set(path, valueJSON string) *pluginv1.BodyPatch {
	return &pluginv1.BodyPatch{Op: pluginv1.BodyPatch_OP_SET, Path: path, ValueJson: valueJSON}
}

func del(path string) *pluginv1.BodyPatch {
	return &pluginv1.BodyPatch{Op: pluginv1.BodyPatch_OP_DELETE, Path: path}
}

// userMessage is a Responses input array holding one user text message.
func userMessage(text string) string {
	b, _ := json.Marshal([]map[string]any{{
		"type": "message", "role": "user",
		"content": []map[string]string{{"type": "input_text", "text": text}},
	}})
	return string(b)
}

// BuildUpstreamRequest implements pluginsdk.Platform.
//
// HTTP (openai.responses): POST to the account type's Responses endpoint
// with the body patches of bodyPatches. stream is not touched: both
// upstreams only stream, and the core turns a non-streaming request into a
// streaming one for account types that declare streamOnly (CONTRACTS §83).
//
// WebSocket (openai.responses_ws): GET on the wss URL with the beta header.
// The core calls this for every turn's response.create message (the first
// call also opens the connection, CONTRACTS §83.6), so the same patches are
// returned for that message, without the stream fields and keeping
// previous_response_id.
func (p *Plugin) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	typ, c, err := accountCredentials(in.GetAccount())
	if err != nil {
		return nil, err
	}
	resp := &pluginv1.BuildUpstreamRequestResponse{
		Method:        http.MethodPost,
		Url:           p.responsesURL(typ),
		Headers:       upstreamHeaders(typ, c),
		UpstreamModel: pluginsdk.RequestModel(in),
	}
	ws := false
	switch proto := in.GetMeta().GetProtocol(); proto {
	case ProtocolResponsesWS:
		if err := webSocketRequest(resp); err != nil {
			return nil, err
		}
		ws = true
	case ProtocolResponses:
		resp.Headers["accept"] = "text/event-stream"
		resp.Headers["content-type"] = "application/json"
	default:
		return nil, status.Errorf(codes.InvalidArgument, "unsupported upstream protocol %q", proto)
	}
	resp.Patches = bodyPatches(typ, ws, in.GetFields())
	return resp, nil
}

// bodyPatches make a Responses body (an HTTP request or a WebSocket
// response.create message) one the account type's upstream accepts:
//
//   - store=false (both upstreams refuse stored responses);
//   - a string input becomes an array holding one user message (both
//     require an array; a blank (whitespace-only) string becomes []);
//   - input items with role "system" get role "developer" (Sign in with
//     ChatGPT refuses system items, asking for instructions or developer
//     messages; the Codex backend is treated the same);
//   - codex_device: instructions "" when the body has none (the Codex
//     backend requires the field);
//   - the fields the upstream refuses are removed (unsupportedFields).
func bodyPatches(typ string, ws bool, fields map[string]string) []*pluginv1.BodyPatch {
	patches := []*pluginv1.BodyPatch{set("store", "false")}
	if raw, ok := fields[FieldStringInput]; ok && raw != "" {
		var s string
		if json.Unmarshal([]byte(raw), &s) == nil {
			if strings.TrimSpace(s) == "" {
				patches = append(patches, set("input", "[]"))
			} else {
				patches = append(patches, set("input", userMessage(s)))
			}
		}
	}
	patches = append(patches, systemToDeveloper(fields[FieldSystemRoles])...)
	if typ == TypeDevice && fields[FieldHasInstructions] == "0" {
		patches = append(patches, set("instructions", `""`))
	}
	for _, f := range unsupportedFields(typ, ws) {
		patches = append(patches, del(f))
	}
	return patches
}

// systemToDeveloper turns the FieldSystemRoles value into input.<i>.role
// patches, one per system item, at most maxRoleRewrites.
func systemToDeveloper(raw string) []*pluginv1.BodyPatch {
	if raw == "" {
		return nil
	}
	var items [][]string
	if json.Unmarshal([]byte(raw), &items) != nil {
		return nil
	}
	var out []*pluginv1.BodyPatch
	for i, roles := range items {
		if len(roles) == 1 && roles[0] == "system" {
			out = append(out, set("input."+strconv.Itoa(i)+".role", `"developer"`))
			if len(out) == maxRoleRewrites {
				break
			}
		}
	}
	return out
}

// webSocketRequest turns the HTTP request into the WebSocket handshake.
func webSocketRequest(resp *pluginv1.BuildUpstreamRequestResponse) error {
	switch {
	case strings.HasPrefix(resp.Url, "https://"):
		resp.Url = "wss://" + strings.TrimPrefix(resp.Url, "https://")
	case strings.HasPrefix(resp.Url, "http://"):
		resp.Url = "ws://" + strings.TrimPrefix(resp.Url, "http://")
	default:
		return status.Errorf(codes.Internal, "upstream URL %q has no http(s) scheme", resp.Url)
	}
	resp.Method = http.MethodGet
	resp.Headers["openai-beta"] = WebSocketBeta
	return nil
}

// Execute implements pluginsdk.Executor with the shared SDK flow: build the
// upstream request, forward it through the host and let the host record the
// usage with the declarative rules.
func (p *Plugin) Execute(ctx context.Context, in *pluginv1.ExecuteRequest) (*pluginv1.ExecuteResponse, error) {
	return pluginsdk.ExecuteDefault(ctx, p, in)
}

// BuildTestRequest implements pluginsdk.Platform: the smallest streaming
// Responses request (store=false, stream=true, an input array). Its usage is
// read with the openai.responses rules.
func (p *Plugin) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	typ, c, err := accountCredentials(in.GetAccount())
	if err != nil {
		return nil, err
	}
	model := strings.TrimSpace(in.GetModel())
	if model == "" {
		model = DefaultTestModel
	}
	body := map[string]any{
		"model":  model,
		"input":  json.RawMessage(userMessage("ping")),
		"store":  false,
		"stream": true,
	}
	if typ == TypeDevice {
		body["instructions"] = ""
	}
	b, _ := json.Marshal(body)
	h := upstreamHeaders(typ, c)
	h["accept"] = "text/event-stream"
	h["content-type"] = "application/json"
	return &pluginv1.BuildTestRequestResponse{
		Method:        http.MethodPost,
		Url:           p.responsesURL(typ),
		Headers:       h,
		BodyJson:      string(b),
		Model:         model,
		UsageProtocol: ProtocolResponses,
	}, nil
}

// SIWCModelsPath picks the slugs of the models the user may list from
// GET /v1/models ({"models":[{"slug","display_name","visibility"}]}).
const SIWCModelsPath = `models.#(visibility=="list")#.slug`

// BuildModelsRequest implements pluginsdk.ModelLister for chatgpt_siwc
// accounts. codex_device accounts answer UNIMPLEMENTED: the Codex backend's
// model list is an internal endpoint of the Codex CLI, which the plugin does
// not call; the console keeps the manifest defaults.
func (p *Plugin) BuildModelsRequest(_ context.Context, in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	typ, c, err := accountCredentials(in.GetAccount())
	if err != nil {
		return nil, err
	}
	if typ != TypeSIWC {
		return nil, status.Error(codes.Unimplemented, "codex_device accounts cannot list models; use the preset list")
	}
	h := upstreamHeaders(typ, c)
	h["accept"] = "application/json"
	return &pluginv1.BuildModelsRequestResponse{
		Method:  http.MethodGet,
		Url:     p.ep.API + "/v1/models",
		Headers: h,
		IdsPath: SIWCModelsPath,
	}, nil
}

package manifest

import "encoding/json"

// Values of Manifest.Runtime.
const (
	// RuntimeGRPC is a plugin process speaking the gRPC plugin protocol.
	RuntimeGRPC = "grpc"
	// RuntimeNone is a package without a process: everything it declares is
	// implemented by the core (account types with an upstream declaration,
	// forms, assets). It carries no runtimes and may not declare anything
	// that needs plugin calls.
	RuntimeNone = "none"
)

// Upstream declares how the core itself builds the upstream requests of an
// account type (accountTypes[].upstream, docs/UPSTREAM-DECLARATIVE.md): the
// core then implements ValidateCredentials, BuildUpstreamRequest,
// ClassifyError, BuildTestRequest and BuildModelsRequest without calling the
// plugin. The same structure is a core preset (sdk/platforms/upstream), the
// manifest layer that names the preset and overrides it, and the resolved
// result (sdk/upstream.Resolve).
//
// Layers merge like a JSON merge patch: objects field by field, "headers" by
// header name, "routes" by protocol, an explicit null deletes, anything else
// replaces (a header write and paramOverride are replaced whole). Because a
// null has to survive until the merge, an Upstream decoded from JSON keeps
// the bytes it was decoded from (see Layer).
type Upstream struct {
	// Preset is the core preset this declaration overrides: "openai",
	// "anthropic" or "gemini". Required in a manifest.
	Preset string `json:"preset,omitempty"`
	// Extend makes the core build the request and then pass it to the
	// plugin's BuildUpstreamRequest (field base) to amend: runtime "grpc"
	// and the accounts.credentials permission only.
	Extend bool `json:"extend,omitempty"`
	// AccountConfig lets an account override part of the declaration in its
	// settings field "upstream" (custom upstream types only).
	AccountConfig bool                 `json:"accountConfig,omitempty"`
	BaseURL       *UpstreamBaseURL     `json:"baseURL,omitempty"`
	Credentials   *UpstreamCredentials `json:"credentials,omitempty"`
	Auth          *UpstreamAuth        `json:"auth,omitempty"`
	// Headers are written on every route, keyed by lower-case header name;
	// a nil entry (JSON null) removes the header of a lower layer.
	Headers map[string]*HeaderWrite `json:"headers,omitempty"`
	// Routes are keyed by upstream protocol id (RequestMeta.protocol); a nil
	// entry (JSON null) removes the route of a lower layer.
	Routes map[string]*UpstreamRoute `json:"routes,omitempty"`
	// DefaultProtocol is the route of a request whose meta.protocol is empty.
	DefaultProtocol string `json:"defaultProtocol,omitempty"`
	// FilterFields are top-level request body fields removed before the
	// request is sent (an account layer may allow some again). nil inherits
	// the lower layer; an empty list removes nothing.
	FilterFields []string `json:"filterFields,omitzero"`
	// ParamOverride is a fixed rewrite in the format of an account's
	// parameter override (CONTRACTS §84), applied before the routes' patches.
	ParamOverride json.RawMessage `json:"paramOverride,omitempty"`
	// Classify names the error policy: "openai", "anthropic" or "gemini".
	Classify string          `json:"classify,omitempty"`
	Test     *UpstreamTest   `json:"test,omitempty"`
	Models   *UpstreamModels `json:"models,omitempty"`

	raw json.RawMessage
}

// UnmarshalJSON decodes the declaration and keeps the bytes for Layer.
func (u *Upstream) UnmarshalJSON(b []byte) error {
	type plain Upstream
	var p plain
	if err := json.Unmarshal(b, &p); err != nil {
		return err
	}
	*u = Upstream(p)
	u.raw = append(json.RawMessage(nil), b...)
	return nil
}

// Layer returns the declaration as the JSON object a merge applies: the bytes
// it was decoded from, so an explicit null ("models": null, a removed
// default) still deletes, or its encoding when it was built in Go, where a
// nil field can only mean "inherit".
func (u *Upstream) Layer() json.RawMessage {
	if u.raw != nil {
		return u.raw
	}
	b, _ := json.Marshal(u)
	return b
}

// UpstreamBaseURL is the account's base URL rule (apikey.Spec): the account
// setting base_url, else Default; StripSuffixes are removed from it.
type UpstreamBaseURL struct {
	Default       string   `json:"default,omitempty"`
	Required      bool     `json:"required,omitempty"`
	StripSuffixes []string `json:"stripSuffixes,omitempty"`
}

// UpstreamCredentials is the credential form rule: the api_key validator,
// the wording of a few field errors, and the other credential or settings
// fields templates may read as {credentials.<field>}.
type UpstreamCredentials struct {
	// KeyValidator checks api_key; nil accepts any 8-512 printable
	// characters without spaces.
	KeyValidator *UpstreamKeyValidator `json:"keyValidator,omitempty"`
	Texts        *UpstreamTexts        `json:"texts,omitempty"`
	Fields       []string              `json:"fields,omitempty"`
}

// UpstreamKeyValidator is apikey.Validator for the api_key field.
type UpstreamKeyValidator struct {
	Prefixes  []string `json:"prefixes,omitempty"`
	MinLength int      `json:"minLength,omitempty"`
}

// UpstreamTexts is apikey.Texts: wording of a few credential field errors.
type UpstreamTexts struct {
	UnsupportedAccountType string `json:"unsupportedAccountType,omitempty"`
	KeyNotString           string `json:"keyNotString,omitempty"`
	KeyNotStringCode       string `json:"keyNotStringCode,omitempty"`
	BaseURLRequired        string `json:"baseURLRequired,omitempty"`
	BaseURLFormat          string `json:"baseURLFormat,omitempty"`
}

// Upstream auth types.
const (
	UpstreamAuthHeader = "header"
	UpstreamAuthQuery  = "query"
	UpstreamAuthNone   = "none"
)

// UpstreamAuth is how the upstream authenticates the account: a header or
// a query parameter Name whose Value is a template (normally containing
// {api_key}), or none. Only auth may write a credential header.
type UpstreamAuth struct {
	Type  string `json:"type,omitempty"`
	Name  string `json:"name,omitempty"`
	Value string `json:"value,omitempty"`
}

// HeaderWrite writes one header; exactly one field is set, its value is a
// template. Set overwrites, Default writes only when the header is absent
// (a client header passed through wins), Append adds the value to a
// comma-separated list unless it is already there.
type HeaderWrite struct {
	Set     string `json:"set,omitempty"`
	Default string `json:"default,omitempty"`
	Append  string `json:"append,omitempty"`
}

// Upstream route transports.
const (
	TransportHTTP      = "http"
	TransportWebSocket = "websocket"
)

// UpstreamRoute is the upstream request of one protocol.
type UpstreamRoute struct {
	// Method defaults to POST (GET for a websocket transport).
	Method string `json:"method,omitempty"`
	// Path is appended to the base URL; a template that may carry a query
	// string.
	Path string `json:"path,omitempty"`
	// Transport is "http" (default) or "websocket": a ws(s) URL, GET and no
	// content-type.
	Transport string `json:"transport,omitempty"`
	// Headers are merged over Upstream.Headers by name.
	Headers map[string]*HeaderWrite `json:"headers,omitempty"`
	// Patches are body patches returned with the request; a layer replaces
	// the list whole.
	Patches []UpstreamPatch `json:"patches,omitempty"`
	Model   *RouteModel     `json:"model,omitempty"`
}

// Values of UpstreamPatch.When and RouteModel.From.
const (
	PatchWhenStream  = "stream"
	ModelFromRequest = "request"
	ModelFromMeta    = "meta"
)

// UpstreamPatch is a BodyPatch: Op "set" (with Value) or "delete" at Path,
// always or only When "stream" (meta.stream).
type UpstreamPatch struct {
	Op    string          `json:"op"`
	Path  string          `json:"path"`
	Value json.RawMessage `json:"value,omitempty"`
	When  string          `json:"when,omitempty"`
}

// RouteModel says where the upstream model ({model}, upstream_model) comes
// from: "request" (the body's model field, else meta.model; the default) or
// "meta". TrimPrefix normalizes it (surrounding spaces and the prefix are
// removed); Required rejects a request without one.
type RouteModel struct {
	From       string `json:"from,omitempty"`
	TrimPrefix string `json:"trimPrefix,omitempty"`
	Required   bool   `json:"required,omitempty"`
}

// UpstreamTest is the console's account test: the route of Protocol with
// Model (when the console names none) and Body, a built-in ping
// ("openai.chat_ping", "anthropic.ping", "gemini.ping") or a JSON template
// containing {model}.
type UpstreamTest struct {
	Protocol string `json:"protocol,omitempty"`
	Model    string `json:"model,omitempty"`
	Body     string `json:"body,omitempty"`
}

// UpstreamModels is the model listing request: GET base URL + Path, the ids
// at the gjson path IDPath, StripPrefix removed from each. nil: the upstream
// has no model list.
type UpstreamModels struct {
	Path        string `json:"path,omitempty"`
	IDPath      string `json:"idPath,omitempty"`
	StripPrefix string `json:"stripPrefix,omitempty"`
}

// Package manifest defines manifest.json, the static description of a plugin
// package. It is the single source of truth shared by the host (validation,
// registry, consent screen) and plugin tooling (pack, lint).
package manifest

// APIVersion is the only manifest apiVersion this SDK understands.
const APIVersion = 1

// LocalizedText is either a bare string (treated as {"en": s}) or a map of
// locale -> text that must contain "en". Normalize with Text.Normalize.
type LocalizedText map[string]string

// Manifest is the root of manifest.json.
type Manifest struct {
	APIVersion   int           `json:"apiVersion"`
	Key          string        `json:"key"` // ^[a-z][a-z0-9_]{1,29}$
	Name         LocalizedText `json:"name"`
	Description  LocalizedText `json:"description,omitempty"`
	Version      string        `json:"version"` // semver
	Publisher    string        `json:"publisher"`
	Icon         string        `json:"icon,omitempty"` // path inside the package or "text:<label>"
	Runtime      string        `json:"runtime"`        // "grpc" ("js" reserved)
	Entry        Entry         `json:"entry"`
	HostCompat   string        `json:"hostCompat"`             // semver range, e.g. ">=0.1.0 <0.2.0"
	HostUICompat string        `json:"hostUICompat,omitempty"` // required when ui.native is set

	Capabilities []Capability `json:"capabilities"`

	Platforms    []Platform    `json:"platforms,omitempty"` // new platforms with their endpoints
	AccountTypes []AccountType `json:"accountTypes,omitempty"`
	Hooks        []Hook        `json:"hooks,omitempty"`
	// Scheduler declares how the plugin takes part in gateway scheduling.
	Scheduler *Scheduler `json:"scheduler,omitempty"`
	Events    *Events    `json:"events,omitempty"`
	Jobs      []Job      `json:"jobs,omitempty"`
	Database  *Database  `json:"database,omitempty"`

	UserPermissions []UserPermission `json:"userPermissions,omitempty"`
	Routes          []Route          `json:"routes,omitempty"`
	UI              *UI              `json:"ui,omitempty"`
	Resources       *Resources       `json:"resources,omitempty"`

	HostPermissions  []HostPermission `json:"hostPermissions,omitempty"`
	ExternalServices []string         `json:"externalServices,omitempty"` // display only
}

// Entry locates the runtime artifact inside the package.
type Entry struct {
	GRPC *GRPCEntry `json:"grpc,omitempty"`
	JS   *JSEntry   `json:"js,omitempty"` // reserved
}

type GRPCEntry struct {
	// Path template with {os} and {arch}, e.g. "runtimes/{os}-{arch}/plugin".
	Binaries string `json:"binaries"`
}

type JSEntry struct {
	Source string `json:"source"`
}

// Capability ids understood by host version 0.1.
const (
	CapPlatformAdapter   = "platform.adapter.v1"
	CapPlatformTasks     = "platform.tasks.v1"
	CapPlatformPoll      = "platform.poll.v1"
	CapPlatformExecute   = "platform.execute.v1"
	CapPlatformMonitor   = "platform.monitor.v1"
	CapPlatformWebSocket = "platform.websocket.v1" // upstream requests for websocket endpoints
	CapGatewayHook       = "gateway.hook.v1"
	CapAppJobs           = "app.jobs.v1"
	CapAppEvents         = "app.events.v1"
	CapHTTPRoutes        = "http.routes.v1"
	CapMigrationData     = "migration.data.v1"
	CapSchedulerAffinity = "scheduler.affinity.v1"
	CapSchedulerRank     = "scheduler.rank.v1"
	CapAppBroadcast      = "app.broadcast.v1"
)

type Capability struct {
	ID string `json:"id"`
}

// ---------------------------------------------------------------- platforms and endpoints

// Built-in platform ids provided by the core (ARCHITECTURE 6.6). Plugins
// cannot declare platforms with these ids.
const (
	PlatformAnthropic = "anthropic"
	PlatformOpenAI    = "openai"
	PlatformGemini    = "gemini"
)

// Platform groups client-facing gateway endpoints. The core defines the
// built-in platforms; a plugin may declare new ones (unique id, endpoints
// must not conflict with any other platform). Account types serve platforms.
type Platform struct {
	ID        string        `json:"id"` // ^[a-z][a-z0-9_]{1,29}$
	Label     LocalizedText `json:"label,omitempty"`
	Endpoints []Endpoint    `json:"endpoints"`
	// Defaults for every endpoint of the platform; an endpoint (Usage) or an
	// account type (AccountPlatform) may override them.
	// Request body paths sent to BuildUpstreamRequest (never the whole body).
	RequestFields []string `json:"requestFields,omitempty"`
	// Client headers the host forwards to BuildUpstreamRequest (lower-case).
	PassHeaders []string     `json:"passHeaders,omitempty"`
	Usage       UsageRules   `json:"usage"`
	StickyRules []StickyRule `json:"stickyRules,omitempty"`
}

// Protocols returns the distinct protocols of the platform's endpoints.
func (p *Platform) Protocols() []string {
	var out []string
	seen := map[string]bool{}
	for _, e := range p.Endpoints {
		if !seen[e.Protocol] {
			seen[e.Protocol] = true
			out = append(out, e.Protocol)
		}
	}
	return out
}

type Endpoint struct {
	ID     string `json:"id"`
	Method string `json:"method"` // GET/POST/PUT/PATCH/DELETE
	// Path in gin-like syntax: "/v1/messages", "/v1beta/models/:model:generateContent"
	// (a segment may be ":param" or ":param:suffix" for a literal suffix).
	Path string `json:"path"`
	// Protocol id, "<platform id>.<name>", e.g. "anthropic.messages".
	Protocol    string          `json:"protocol"`
	Kind        string          `json:"kind"` // EndpointKindProxy or EndpointKindWebSocket ("custom" reserved)
	Auth        EndpointAuth    `json:"auth"`
	Request     EndpointRequest `json:"request"`
	Response    EndpointResp    `json:"response"`
	ErrorFormat string          `json:"errorFormat"` // anthropic | openai | gemini | plain
	Billing     string          `json:"billing"`     // usage | free
	// BillingTypes restricts model prices accepted at request admission.
	// Every metered endpoint must declare its supported types explicitly.
	BillingTypes []string `json:"billingTypes,omitempty"` // per_request | per_token | expression | video
	// Task opts into durable host-managed async work. Submission is recorded
	// before a successful response; queries read the shared, owner-checked
	// snapshot. Polling and account affinity belong to the host.
	Task *AsyncTaskEndpoint `json:"task,omitempty"`
	// Usage overrides the platform usage rules for this endpoint.
	Usage *UsageRules `json:"usage,omitempty"`
	// UsageSource decides WHO reads the token usage out of this endpoint's
	// upstream responses: UsageSourceRules (the default, and what "" means)
	// applies the declarative sse/json maps of the usage rules in effect,
	// UsageSourcePlugin asks the plugin declaring the endpoint's platform
	// through PlatformService.ExtractUsage once the response has been
	// forwarded in full.
	//
	// It sits on the endpoint, beside Request.ModelSource, and deliberately
	// NOT on UsageRules. The rules follow the override chain of CONTRACTS
	// §13, whose last link - AccountPlatform.usage[protocol] - belongs to a
	// THIRD plugin and replaces the whole block. A source living there could
	// be redirected by that plugin, and, worse, an override that simply does
	// not mention it would switch the endpoint back to the declarative rules
	// without saying anything. On the endpoint there is exactly one reading
	// of "who answers ExtractUsage", and no ban is needed to keep it.
	UsageSource string `json:"usageSource,omitempty"`
	// UsageStreamEvents are the SSE event names the host collects for
	// ExtractUsage on a streaming response - and the only ones. The whole
	// stream is never buffered. Only read with UsageSource
	// UsageSourcePlugin.
	UsageStreamEvents []string `json:"usageStreamEvents,omitempty"`
	// UsageMaxBytes caps what ExtractUsage receives: the non-streaming body,
	// and the total size of the collected stream events. 0 uses the host
	// default. Also bounds the synchronous parser on task submissions.
	UsageMaxBytes int64 `json:"usageMaxBytes,omitempty"`
	// UsageRequestFields are request body paths (gjson) whose values the host
	// hands to ExtractUsage in ExtractUsageRequest.fields - and the only ones,
	// like Platform.RequestFields for BuildUpstreamRequest. They are for
	// endpoints that only START work: the response is {"id": ...} and the
	// request is where the resolution and the duration of the job are, which
	// is what a pre-charge estimate has to be made from.
	//
	// Declared on the endpoint, not reused from the platform's RequestFields,
	// for two reasons. RequestFields serves BuildUpstreamRequest on every
	// endpoint and is overridden per account type - by a third plugin, which
	// must not decide what the platform's plugin sees in ExtractUsage. And the
	// need is per endpoint: the submit endpoint wants "resolution", nothing
	// else on the platform does, and only the endpoints that ask pay for it.
	// Values are capped per field and in total (check.MaxUsageRequestField*);
	// a request body is never handed over whole. Only read with UsageSource
	// UsageSourcePlugin or TaskSubmit().
	UsageRequestFields []string `json:"usageRequestFields,omitempty"`
}

// PluginUsage reports whether this endpoint's usage is read by the plugin
// declaring its platform (PlatformService.ExtractUsage) instead of by the
// declarative usage rules.
func (e Endpoint) PluginUsage() bool { return e.UsageSource == UsageSourcePlugin }

const (
	TaskActionSubmit = "submit"
	TaskActionQuery  = "query"
)

// AsyncTaskEndpoint pairs one JSON submission and query endpoint of a task
// kind within a plugin. IDPaths are simple dot-separated JSON object paths,
// e.g. "id" or "data.id", whose matching upstream IDs the host replaces.
type AsyncTaskEndpoint struct {
	Action  string   `json:"action"`
	Kind    string   `json:"kind"`
	IDParam string   `json:"idParam,omitempty"`
	IDPaths []string `json:"idPaths"`
}

func (e Endpoint) TaskSubmit() bool { return e.Task != nil && e.Task.Action == TaskActionSubmit }
func (e Endpoint) TaskQuery() bool  { return e.Task != nil && e.Task.Action == TaskActionQuery }

type EndpointAuth struct {
	// Request headers carrying the API key, checked in order. "authorization"
	// accepts the "Bearer <key>" form.
	Headers []string `json:"headers"`
	// Optional query parameter name (e.g. "key" for Gemini style clients).
	Query string `json:"query,omitempty"`
}

type EndpointRequest struct {
	ModelPath string `json:"modelPath,omitempty"` // gjson path in the body
	// ModelReferences declare additional model invocations in the request.
	// The host applies group/account admission and snapshots their prices.
	ModelReferences []RequestModelReference `json:"modelReferences,omitempty"`
	// ModelParam reads the model from a path parameter instead (e.g. "model").
	ModelParam string `json:"modelParam,omitempty"`
	// ModelSource asks a plugin for the model instead of reading it out of the
	// request. The only value is ModelSourcePlugin: the plugin declaring the
	// endpoint's platform answers PlatformService.ResolveModel. Mutually
	// exclusive with ModelPath and ModelParam, and with StreamPath (ResolveModel
	// answers both the model and whether the response streams).
	ModelSource string `json:"modelSource,omitempty"`
	StreamPath  string `json:"streamPath,omitempty"`
	// Stream marks endpoints that always stream (e.g. streamGenerateContent).
	Stream          bool     `json:"stream,omitempty"`
	PromptTextPaths []string `json:"promptTextPaths,omitempty"`
	MaxBodyBytes    int64    `json:"maxBodyBytes,omitempty"` // 0 = host default
	// QueryParams are the query parameter names the host puts in
	// RequestMeta.query, and the only ones - like RequestFields for the body.
	// Matched case-insensitively; the endpoint's Auth.Query parameter may not
	// be listed and is never passed on.
	QueryParams []string `json:"queryParams,omitempty"`
}

// ModelSourcePlugin is the only value of EndpointRequest.ModelSource: the
// plugin declaring the endpoint's platform answers PlatformService.ResolveModel
// with the model (and whether the response streams) for every request.
const ModelSourcePlugin = "plugin"

type EndpointResp struct {
	Stream    string `json:"stream,omitempty"` // "sse", or "websocket" on a websocket endpoint
	NonStream string `json:"nonStream"`        // "json"
}

// AccountType is a kind of upstream credential. Any plugin may declare
// account types (ARCHITECTURE 6.6); the declaring plugin builds upstream
// requests and classifies errors for accounts of this type. An account type
// serves the endpoints of the platforms it lists (built-in or declared by a
// plugin), plus endpoints the core can convert to one of those protocols.
type AccountType struct {
	Icon        string        `json:"icon,omitempty"` // Package asset; falls back to the plugin icon.
	ID          string        `json:"id"`
	Label       LocalizedText `json:"label"`
	Description LocalizedText `json:"description,omitempty"`
	Form        Form          `json:"form"`
	// Optional presentation grouping for authentication variants of one product.
	CreationGroup   string        `json:"creationGroup,omitempty"`
	AuthMethodLabel LocalizedText `json:"authMethodLabel,omitempty"`
	SensitiveFields []string      `json:"sensitiveFields,omitempty"`
	// Top-level credential keys stored as plain settings (not encrypted).
	SettingsFields []string `json:"settingsFields,omitempty"`
	// GuardedSettings restricts the values of some settings fields for
	// callers without the account:settings:custom permission (CONTRACTS
	// §21.3), e.g. base_url may only be the official endpoint. Types that
	// declare none are unrestricted.
	GuardedSettings []GuardedSetting  `json:"guardedSettings,omitempty"`
	Platforms       []AccountPlatform `json:"platforms"`
	// DefaultModels and DefaultModelMapping prefill the core account fields
	// models / model_mapping when the console creates an account of this
	// type (CONTRACTS §41). They are suggestions only: the host never applies
	// them to an account by itself, and an account created through the API
	// without models still serves every model. Complete model ids
	// (ValidModelID), at most MaxDefaultModels each; every mapping key must
	// be in DefaultModels when that list is not empty, or the mapped model
	// could never be scheduled.
	DefaultModels       []string          `json:"defaultModels,omitempty"`
	DefaultModelMapping map[string]string `json:"defaultModelMapping,omitempty"`
	// Quota declares that accounts of this type have subscription quota
	// windows (5-hour / weekly limits and the like) the host can track
	// (CONTRACTS §44). nil: the type has no quota (API keys); the console
	// shows nothing for it.
	Quota *AccountQuota `json:"quota,omitempty"`
	// Balance declares that accounts of this type have a prepaid balance
	// (credits) the plugin can query (CONTRACTS §51). nil: the type has no
	// balance or the plugin does not track it; the console shows nothing.
	Balance *AccountBalance `json:"balance,omitempty"`
	// Refresh declares that the credentials of this type expire and that the
	// plugin implements BuildRefreshRequest / ParseRefreshResponse to renew
	// them (CONTRACTS §48). nil: the host never refreshes them.
	Refresh *AccountRefresh `json:"refresh,omitempty"`
}

// AccountRefresh tells the host when to renew the credentials of an
// account type (CONTRACTS §48).
type AccountRefresh struct {
	// ExpiresAtField is the top-level credentials key holding the expiry,
	// Unix seconds as a number or a numeric string (milliseconds are
	// detected). Default "expires_at". An account without a readable expiry
	// is only refreshed on request.
	ExpiresAtField string `json:"expiresAtField,omitempty"`
	// BeforeExpirySec is how long before the expiry the host renews the
	// credentials, 60-86400 (default 1800).
	BeforeExpirySec int `json:"beforeExpirySec,omitempty"`
}

// AccountQuota is how the host learns the subscription quota of an account
// type (CONTRACTS §44). Headers are read from the gateway's own upstream
// responses (success and 429) at no extra upstream cost; Query says the
// plugin also implements BuildQuotaRequest / ParseQuotaResponse, which the
// host calls when its snapshot is stale. At least one of the two is required.
type AccountQuota struct {
	Headers []QuotaHeader `json:"headers,omitempty"`
	Query   bool          `json:"query,omitempty"`
}

// AccountBalance declares that an account type has a prepaid balance and that
// the host queries it from the plugin (CONTRACTS §51). The host never reads
// the balance from headers; the plugin must register a BalanceProvider.
type AccountBalance struct {
	// Currency is the ISO 4217 three-letter currency code (e.g. "USD", "EUR").
	// Required.
	Currency string `json:"currency"`
	// UpdateInterval is how often the host queries the balance, in seconds.
	// 60-86400 (default 180). The host may query sooner when forced or on
	// state changes.
	UpdateInterval int `json:"updateInterval,omitempty"`
}

// MaxQuotaHeaders bounds AccountQuota.Headers.
const MaxQuotaHeaders = 16

// QuotaHeader maps upstream response headers to one quota window. Header
// names are matched case-insensitively; a header that is absent or does not
// parse leaves that value unknown, and a window none of whose headers is
// present is not reported at all.
type QuotaHeader struct {
	// Key names the window (^[a-z0-9][a-z0-9_]{0,31}$). The console knows
	// "5h", "7d", "7d_sonnet" and "7d_fable"; others are shown as is.
	Key string `json:"key"`
	// Utilization is the header carrying the share of the window used.
	Utilization string `json:"utilization,omitempty"`
	// UtilizationUnit is "ratio" (default: 0-1, e.g. Anthropic's 0.42) or
	// "percent" (0-100).
	UtilizationUnit string `json:"utilizationUnit,omitempty"`
	// Reset is the header carrying when the window resets.
	Reset string `json:"reset,omitempty"`
	// ResetFormat is "unix" (default: Unix seconds, milliseconds detected),
	// "rfc3339" or "delta" (seconds from now).
	ResetFormat string `json:"resetFormat,omitempty"`
	// Status is the header carrying "allowed", "allowed_warning" or
	// "rejected"; other values are recorded as unknown.
	Status string `json:"status,omitempty"`
}

// Values of QuotaHeader.UtilizationUnit and QuotaHeader.ResetFormat.
const (
	QuotaUnitRatio    = "ratio"
	QuotaUnitPercent  = "percent"
	QuotaResetUnix    = "unix"
	QuotaResetRFC3339 = "rfc3339"
	QuotaResetDelta   = "delta"
)

// Supported reports whether the declaration tracks anything.
func (q *AccountQuota) Supported() bool {
	return q != nil && (len(q.Headers) > 0 || q.Query)
}

// MaxDefaultModels bounds AccountType.DefaultModels and DefaultModelMapping;
// it equals the per-account limit of models and model_mapping (CONTRACTS §18).
const MaxDefaultModels = 500

// GuardedSetting is one restricted settings field of an account type
// (CONTRACTS §21.3). Field must be one of SettingsFields; Allowed is the
// non-empty list of absolute http(s) URLs the field may take. The host
// compares values after trimming whitespace and a trailing "/" and
// lower-casing scheme and host; an empty value (the plugin default) and, on
// update, the account's previous value are always accepted.
type GuardedSetting struct {
	Field   string   `json:"field"`
	Allowed []string `json:"allowed"`
}

// AccountPlatform is one platform an account type serves. Empty fields fall
// back to the platform (and endpoint) defaults.
type AccountPlatform struct {
	Platform      string   `json:"platform"`
	RequestFields []string `json:"requestFields,omitempty"`
	PassHeaders   []string `json:"passHeaders,omitempty"`
	// Usage overrides the usage rules per protocol of the platform.
	Usage map[string]UsageRules `json:"usage,omitempty"`
}

// Form describes a console form contributed by a plugin.
type Form struct {
	Mode      string `json:"mode"`               // schema | iframe | native
	Schema    string `json:"schema,omitempty"`   // package path to JSON Schema (mode=schema)
	UISchema  string `json:"uiSchema,omitempty"` // package path to UI hints (mode=schema)
	Page      string `json:"page,omitempty"`     // ui/iframe/... entry (mode=iframe)
	Component string `json:"component,omitempty"`
}

// UsageRules tell the host how to read token usage from upstream responses.
type UsageRules struct {
	// "exclusive": input tokens exclude cache (Anthropic);
	// "inclusive": prompt tokens include cache (OpenAI).
	Semantics string        `json:"semantics"`
	SSE       []SSEUsageMap `json:"sse,omitempty"`
	JSON      *UsageMap     `json:"json,omitempty"`
	// Extra metering facts usable in price expressions as u("key").
	Facts map[string]UsageFact `json:"facts,omitempty"`
	// Additional meters model usage excluded from the main counters. Each
	// observed array is a complete snapshot, never a stream delta to sum.
	Additional []AdditionalUsageRule `json:"additional,omitempty"`
	// Attempts replaces main-counter pricing with verified per-attempt usage.
	Attempts *AttemptUsageRule `json:"attempts,omitempty"`
}

type AdditionalUsageRule struct {
	// UsePrimaryModel takes the admitted upstream identity supplied by the
	// host. A conflicting model reported by the response is rejected.
	UsePrimaryModel bool `json:"usePrimaryModel,omitempty"`
	// Non-null request fields requiring this contract through account overrides.
	RequiredBy []string          `json:"requiredBy,omitempty"`
	Name       string            `json:"name"`
	JSONPath   string            `json:"jsonPath,omitempty"`
	SSEPath    string            `json:"ssePath,omitempty"`
	SSEEvent   string            `json:"sseEvent,omitempty"`
	TypePath   string            `json:"typePath"`
	TypeValue  string            `json:"typeValue"`
	ModelPath  string            `json:"modelPath"`
	Map        map[string]string `json:"map"`
	Semantics  string            `json:"semantics"`
}

// Values of Endpoint.UsageSource.
const (
	// UsageSourceRules is the default: the host reads usage from the
	// declarative sse/json maps of the rules in effect. An empty
	// Endpoint.UsageSource means this.
	UsageSourceRules = "rules"
	// UsageSourcePlugin asks PlatformService.ExtractUsage instead.
	//
	// The declarative rules are not replaced by the plugin: the host keeps
	// applying them while it forwards (they cost nothing extra and detect
	// stream errors), and falls back to what they produced when the plugin
	// call fails.
	UsageSourcePlugin = "plugin"
)

// Usage map values are gjson paths; "a+b" sums several numeric paths
// (missing ones count as 0), e.g. output tokens plus thinking tokens.
type SSEUsageMap struct {
	Event string            `json:"event"` // SSE event name, "" = any
	Map   map[string]string `json:"map"`   // usage field -> gjson path(s) in data
}

type UsageMap struct {
	Map map[string]string `json:"map"` // usage field -> gjson path(s), "+" sums
}

// Standard usage field names produced by UsageRules maps.
const (
	UsageModel               = "model"
	UsageInputTokens         = "input_tokens"
	UsageOutputTokens        = "output_tokens"
	UsageCacheReadTokens     = "cache_read_tokens"
	UsageCacheCreationTokens = "cache_creation_tokens"
	UsageCacheCreation1h     = "cache_creation_1h_tokens"
)

type UsageFact struct {
	Type        string        `json:"type"` // number | boolean | enum | string
	Unit        string        `json:"unit,omitempty"`
	Enum        []string      `json:"enum,omitempty"`
	Path        string        `json:"path,omitempty"`
	Description LocalizedText `json:"description,omitempty"`
}

type StickyRule struct {
	Name        string            `json:"name"`
	Match       StickyMatch       `json:"match"`
	KeySources  []StickyKeySource `json:"keySources"`
	ValueRegex  string            `json:"valueRegex,omitempty"`
	TTLSeconds  int               `json:"ttlSeconds,omitempty"`
	KeyIncludes []string          `json:"keyIncludes,omitempty"` // group | model | rule
	OnFailure   string            `json:"onFailure,omitempty"`   // failover (default) | stick
}

type StickyMatch struct {
	Protocols         []string `json:"protocols,omitempty"`
	Models            []string `json:"models,omitempty"` // globs
	UserAgentContains []string `json:"userAgentContains,omitempty"`
}

type StickyKeySource struct {
	Type  string   `json:"type"` // body | header | api_key | user | plugin
	Path  string   `json:"path,omitempty"`
	Name  string   `json:"name,omitempty"`
	Needs []string `json:"needs,omitempty"` // type=plugin: body paths sent to ResolveAffinityKey
}

// ---------------------------------------------------------------- hooks, events, jobs

type Hook struct {
	ID             string    `json:"id,omitempty"`
	Point          string    `json:"point"` // gateway.request
	Order          int       `json:"order"`
	Match          HookMatch `json:"match"`
	Needs          []string  `json:"needs,omitempty"`
	MaxPromptBytes int       `json:"maxPromptBytes,omitempty"`
	TimeoutMs      int       `json:"timeoutMs,omitempty"`
	Failure        string    `json:"failure,omitempty"` // open (default) | closed
}

type HookMatch struct {
	Protocols []string `json:"protocols,omitempty"`
	Models    []string `json:"models,omitempty"`
	Groups    []string `json:"groups,omitempty"`
}

// ---------------------------------------------------------------- scheduling

// Scheduler is the plugin's part in gateway scheduling. Sticky sessions are
// declared per platform (Platform.StickyRules) and need no entry here; this
// struct carries the extension points that apply to scheduling itself.
type Scheduler struct {
	// Rank lets the plugin rewrite the priority/weight of the candidate
	// accounts of requests that did not hit a sticky binding.
	Rank *SchedulerRank `json:"rank,omitempty"`
}

// SchedulerRank declares SchedulerService.RankAccounts ("scheduler.rank.v1").
// Several plugins declaring it run serially in Order; each sees the values
// left by the previous one. There is deliberately no `failure` field: the
// call is always fail open, because refusing a request over a weight the
// plugin could not compute would be far too aggressive. On error, timeout or
// a malformed answer the host keeps the accounts' own priority and weight.
type SchedulerRank struct {
	// Order sorts plugins that declare rank; the smaller one runs first
	// (ties are broken by plugin key).
	Order int `json:"order,omitempty"`
	// Match restricts the requests the host calls for (protocols / models /
	// groups); empty matches every request.
	Match HookMatch `json:"match,omitempty"`
	// TimeoutMs bounds one call; 0 uses the host default.
	TimeoutMs int `json:"timeoutMs,omitempty"`
}

type Events struct {
	Subscribe []string `json:"subscribe"` // event types or "prefix.*"
	BatchSize int      `json:"batchSize,omitempty"`
}

type Job struct {
	ID         string `json:"id"`
	Schedule   string `json:"schedule"` // cron (5 fields) or "@every <duration>"
	TimeoutSec int    `json:"timeoutSec,omitempty"`
}

type Database struct {
	Schema     string `json:"schema"`     // must be "plg_" + key
	Migrations string `json:"migrations"` // package directory, e.g. "migrations/"
}

// ---------------------------------------------------------------- permissions, routes, ui

// UserPermission is registered into the RBAC catalog as
// "plugin.<key>:<Key>".
type UserPermission struct {
	Key         string        `json:"key"` // ^[a-z0-9_]+(:[a-z0-9_]+)+$
	Label       LocalizedText `json:"label"`
	Description LocalizedText `json:"description,omitempty"`
	Sensitive   bool          `json:"sensitive,omitempty"`
}

// Route is a plugin-owned console endpoint under /api/v1/p/<key>.
type Route struct {
	Method     string `json:"method"`
	Path       string `json:"path"`
	Scope      string `json:"scope"`                // admin | user | public | webhook
	Permission string `json:"permission,omitempty"` // plugin-local key; required for admin/user
}

type UI struct {
	// Sections are sidebar groups of the plugin's own (see Menu.Section).
	Sections []MenuSection   `json:"sections,omitempty"`
	Menus    []Menu          `json:"menus,omitempty"`
	Pages    map[string]Page `json:"pages,omitempty"`
	Slots    []Slot          `json:"slots,omitempty"`
	Native   *NativeUI       `json:"native,omitempty"`
	Settings *Form           `json:"settings,omitempty"`
}

// MenuSection is a sidebar group declared by a plugin. It is shown as its
// own group, placed among the core groups by Order (overview 100, gateway
// 200, finance 300, system 400, me 500, plugins 600).
type MenuSection struct {
	ID    string        `json:"id"`
	Label LocalizedText `json:"label"`
	Order int           `json:"order,omitempty"`
}

type Menu struct {
	ID string `json:"id"`
	// Section is "plugins" (the shared group at the bottom), a core group
	// (overview | gateway | finance | system | me: the item is appended to
	// it) or the id of one of UI.Sections.
	Section    string        `json:"section"`
	Label      LocalizedText `json:"label"`
	Icon       string        `json:"icon,omitempty"`
	Page       string        `json:"page"`
	Permission string        `json:"permission,omitempty"`
	Order      int           `json:"order,omitempty"`
}

// Page is a plugin page. type=table|form are rendered by the host,
// type=iframe loads Page.Src in a sandbox, type=native mounts Component.
type Page struct {
	Type      string        `json:"type"`
	Title     LocalizedText `json:"title,omitempty"`
	Source    string        `json:"source,omitempty"` // "GET /models" (plugin route)
	Columns   []Column      `json:"columns,omitempty"`
	Schema    string        `json:"schema,omitempty"`
	Submit    string        `json:"submit,omitempty"`
	Src       string        `json:"src,omitempty"`
	Component string        `json:"component,omitempty"`
	// Search names the query parameter the page's Source route honours as a
	// free-text search, e.g. "q". The host renders a search box on a table
	// page only when it is set, and sends the typed text as
	// "?<Search>=<text>" (resetting to page 1). Leaving it out means "this
	// route cannot search": no box is rendered.
	//
	// It is a single parameter name, not a list, because it describes the one
	// control the host has - one text box over one route. A list would let a
	// manifest declare a filter set the renderer has no way to draw, which is
	// the same "declared and nobody honours it" shape this field was added to
	// close: before it existed the box was always drawn and filtered either
	// the rows already on screen or nothing at all, depending on how much
	// data there happened to be. A second parameter is not blocked by this
	// choice - per-field filters need a label, a type and, for enums, the
	// options, so they are a different field with a different shape
	// (filters[]) rather than another string in this one, and adding them
	// leaves "search" meaning exactly what it means now.
	Search string `json:"search,omitempty"`
}

type Column struct {
	Key    string        `json:"key"`
	Label  LocalizedText `json:"label"`
	Format string        `json:"format,omitempty"` // text | number | datetime | badge | currency
}

type Slot struct {
	Slot       string `json:"slot"` // dashboard.widgets | account.detail.tabs | account.form.widgets
	Component  string `json:"component"`
	Permission string `json:"permission,omitempty"`
}

type NativeUI struct {
	Entry string `json:"entry"` // e.g. "ui/native/entry.js"
}

type Resources struct {
	MemoryMB     int     `json:"memoryMB,omitempty"`
	CPU          float64 `json:"cpu,omitempty"`
	MaxThreads   int     `json:"maxThreads,omitempty"`
	MaxOpenFiles int     `json:"maxOpenFiles,omitempty"`
}

// HostPermission is a host capability the plugin asks the administrator for.
type HostPermission struct {
	ID       string         `json:"id"`
	Scope    map[string]any `json:"scope,omitempty"`
	Reason   LocalizedText  `json:"reason,omitempty"`
	Optional bool           `json:"optional,omitempty"`
}

// Host permission ids and their risk level.
const (
	RiskLow      = "low"
	RiskMedium   = "medium"
	RiskHigh     = "high"
	RiskCritical = "critical"
)

var HostPermissionRisk = map[string]string{
	"kv":                   RiskLow,
	"config":               RiskLow,
	"log":                  RiskLow,
	"broadcast":            RiskLow,
	"routes.admin":         RiskMedium,
	"routes.user":          RiskMedium,
	"events":               RiskMedium,
	"jobs":                 RiskMedium,
	"ui.menu":              RiskMedium,
	"ui.iframe":            RiskMedium,
	"lock":                 RiskMedium, // not low: low is granted without the administrator (install/consent.go)
	"accounts.read":        RiskMedium,
	"db.schema":            RiskHigh,
	"net":                  RiskHigh,
	"routes.public":        RiskHigh,
	"routes.webhook":       RiskHigh,
	"gateway.hook":         RiskHigh,
	"gateway.endpoint":     RiskHigh,
	"platform.register":    RiskHigh,
	"scheduler.affinity":   RiskHigh,
	"scheduler.rank":       RiskHigh,
	"users.read":           RiskHigh,
	"accounts.credentials": RiskCritical,
	"ledger.credit":        RiskCritical,
	"ledger.debit":         RiskCritical,
	"ui.native":            RiskCritical,
	"users.write":          RiskCritical,
	"db.core_views":        RiskCritical,
}

// Values of Endpoint.Kind.
const (
	// EndpointKindProxy forwards one HTTP request to one upstream request.
	EndpointKindProxy = "proxy"
	// EndpointKindWebSocket upgrades the client connection and keeps one
	// upstream WebSocket per connection. Every client message carrying a model
	// at request.modelPath starts a turn that is scheduled, metered with the
	// usage.sse rules (matched by the message "type") and billed on its own.
	EndpointKindWebSocket = "websocket"
	// ResponseWebSocket is EndpointResp.Stream of a websocket endpoint.
	ResponseWebSocket = "websocket"
)

// WebSocket reports whether the endpoint is a websocket endpoint.
func (e Endpoint) WebSocket() bool { return e.Kind == EndpointKindWebSocket }

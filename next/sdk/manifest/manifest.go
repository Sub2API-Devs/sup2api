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

	Gateway  *Gateway       `json:"gateway,omitempty"`
	Platform *Platform      `json:"platform,omitempty"`
	Pricing  []PricingEntry `json:"pricing,omitempty"`
	Hooks    []Hook         `json:"hooks,omitempty"`
	Events   *Events        `json:"events,omitempty"`
	Jobs     []Job          `json:"jobs,omitempty"`
	Database *Database      `json:"database,omitempty"`

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
	CapGatewayHook       = "gateway.hook.v1"
	CapAppJobs           = "app.jobs.v1"
	CapAppEvents         = "app.events.v1"
	CapHTTPRoutes        = "http.routes.v1"
	CapMigrationData     = "migration.data.v1"
	CapSchedulerAffinity = "scheduler.affinity.v1"
)

type Capability struct {
	ID string `json:"id"`
}

// ---------------------------------------------------------------- gateway

// Gateway declares client-facing gateway endpoints.
type Gateway struct {
	Endpoints []Endpoint `json:"endpoints"`
}

type Endpoint struct {
	ID          string          `json:"id"`
	Method      string          `json:"method"`   // GET/POST/PUT/PATCH/DELETE
	Path        string          `json:"path"`     // gin syntax, e.g. "/v1/messages"
	Protocol    string          `json:"protocol"` // e.g. "anthropic.messages"
	Kind        string          `json:"kind"`     // "proxy" ("custom" reserved)
	Auth        EndpointAuth    `json:"auth"`
	Request     EndpointRequest `json:"request"`
	Response    EndpointResp    `json:"response"`
	ErrorFormat string          `json:"errorFormat"` // anthropic | openai | gemini | plain
	Billing     string          `json:"billing"`     // usage | free
}

type EndpointAuth struct {
	// Request headers carrying the API key, checked in order. "authorization"
	// accepts the "Bearer <key>" form.
	Headers []string `json:"headers"`
	// Optional query parameter name (e.g. "key" for Gemini style clients).
	Query string `json:"query,omitempty"`
}

type EndpointRequest struct {
	ModelPath       string   `json:"modelPath"`
	StreamPath      string   `json:"streamPath,omitempty"`
	PromptTextPaths []string `json:"promptTextPaths,omitempty"`
	MaxBodyBytes    int64    `json:"maxBodyBytes,omitempty"` // 0 = host default
}

type EndpointResp struct {
	Stream    string `json:"stream,omitempty"` // "sse"
	NonStream string `json:"nonStream"`        // "json"
}

// ---------------------------------------------------------------- platform

type Platform struct {
	ID           string        `json:"id"`
	Label        LocalizedText `json:"label,omitempty"`
	Protocols    []string      `json:"protocols"`
	AccountTypes []AccountType `json:"accountTypes"`
	// Request body paths sent to BuildUpstreamRequest (never the whole body).
	RequestFields []string `json:"requestFields,omitempty"`
	// Client headers the host forwards to BuildUpstreamRequest (lower-case).
	PassHeaders []string     `json:"passHeaders,omitempty"`
	Usage       UsageRules   `json:"usage"`
	StickyRules []StickyRule `json:"stickyRules,omitempty"`
}

type AccountType struct {
	ID              string        `json:"id"`
	Label           LocalizedText `json:"label"`
	Description     LocalizedText `json:"description,omitempty"`
	Form            Form          `json:"form"`
	SensitiveFields []string      `json:"sensitiveFields,omitempty"`
	// Top-level credential keys stored as plain settings (not encrypted).
	SettingsFields []string `json:"settingsFields,omitempty"`
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
}

type SSEUsageMap struct {
	Event string            `json:"event"` // SSE event name, "" = any
	Map   map[string]string `json:"map"`   // usage field -> gjson path in data
}

type UsageMap struct {
	Map map[string]string `json:"map"`
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
	Type        string        `json:"type"` // number | boolean | enum
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

// ---------------------------------------------------------------- pricing

type PricingEntry struct {
	Model      string         `json:"model"` // exact or glob
	Platform   string         `json:"platform,omitempty"`
	Mode       string         `json:"mode"` // per_request | per_token | expression
	Config     map[string]any `json:"config,omitempty"`
	Expression string         `json:"expression,omitempty"`
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
	Menus    []Menu          `json:"menus,omitempty"`
	Pages    map[string]Page `json:"pages,omitempty"`
	Slots    []Slot          `json:"slots,omitempty"`
	Native   *NativeUI       `json:"native,omitempty"`
	Settings *Form           `json:"settings,omitempty"`
}

type Menu struct {
	ID         string        `json:"id"`
	Section    string        `json:"section"` // plugins (only section in 0.1)
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
	"routes.admin":         RiskMedium,
	"routes.user":          RiskMedium,
	"events":               RiskMedium,
	"jobs":                 RiskMedium,
	"ui.menu":              RiskMedium,
	"ui.iframe":            RiskMedium,
	"accounts.read":        RiskMedium,
	"db.schema":            RiskHigh,
	"net":                  RiskHigh,
	"routes.public":        RiskHigh,
	"routes.webhook":       RiskHigh,
	"gateway.hook":         RiskHigh,
	"gateway.endpoint":     RiskHigh,
	"platform.register":    RiskHigh,
	"scheduler.affinity":   RiskHigh,
	"users.read":           RiskHigh,
	"accounts.credentials": RiskCritical,
	"ledger.credit":        RiskCritical,
	"ledger.debit":         RiskCritical,
	"ui.native":            RiskCritical,
	"users.write":          RiskCritical,
	"db.core_views":        RiskCritical,
}

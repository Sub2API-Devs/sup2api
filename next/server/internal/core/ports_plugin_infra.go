package core

import (
	"context"
	"encoding/json"
	"os/exec"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// ============================================================ plugin defaults sinks
// Called by the plugin runtime (C1) inside the install/upgrade transaction.
// Rows with source=plugin_default are replaced; admin rows are untouched.
// Model prices are not plugin defaults: administrators set them (CONTRACTS §17).
// Uninstall relies on ON DELETE CASCADE from plugins(key).

// StickyRuleCatalog is implemented by the gateway (G).
type StickyRuleCatalog interface {
	SyncPluginDefaults(ctx context.Context, tx pgx.Tx, pluginKey string, rules []manifest.StickyRule) error
}

// ============================================================ lifecycle <-> runtime (C1 <-> C2)

// Rollout is the API view of one plugin_rollouts row plus live node states.
type Rollout struct {
	ID            int64              `json:"id"`
	PluginKey     string             `json:"plugin_key"`
	Action        string             `json:"action"` // enable | upgrade | disable
	FromVersion   string             `json:"from_version"`
	TargetVersion string             `json:"target_version"`
	Phase         string             `json:"phase"`
	Coordinator   string             `json:"coordinator"`
	Error         string             `json:"error"`
	Nodes         []RolloutNodeState `json:"nodes"`
}

type RolloutNodeState struct {
	NodeID string `json:"node_id"`
	BootID string `json:"boot_id"`
	State  string `json:"state"` // pending | ready | active | failed
	Error  string `json:"error"`
}

// RolloutController (C2) starts and tracks two-phase rollouts.
type RolloutController interface {
	Enable(ctx context.Context, pluginKey string, actorID int64) (*Rollout, error)
	Upgrade(ctx context.Context, pluginKey, version string, actorID int64) (*Rollout, error)
	Disable(ctx context.Context, pluginKey string, actorID int64, reason string) (*Rollout, error)
	Current(ctx context.Context, pluginKey string) (*Rollout, error) // nil when none open
	Cancel(ctx context.Context, pluginKey string, rolloutID, actorID int64) error
}

// PluginSchemaManager (C2) owns plg_<key> schemas, roles and migrations.
type PluginSchemaManager interface {
	// Drop removes schema, role and migration records (uninstall with purge).
	Drop(ctx context.Context, pluginKey string) error
	// DropTx participates in the lifecycle transaction holding the plugin row.
	// A concurrent re-install cannot begin between DROP and plugin deletion.
	DropTx(ctx context.Context, tx pgx.Tx, pluginKey string) error
}

// PluginDefaultsApplier (C1) writes version-scoped defaults (user
// permissions, sticky rules) for a manifest. C1 calls it on
// first install; C2 calls it when an upgrade activates.
type PluginDefaultsApplier interface {
	ApplyDefaults(ctx context.Context, tx pgx.Tx, m *manifest.Manifest, grantNewPermissionsToRoleKeys []string) error
}

// ============================================================ sandbox & egress (owner: D)

// LaunchSpec describes how to start one plugin process.
type LaunchSpec struct {
	PluginKey     string
	Version       string
	BinaryPath    string
	WorkDir       string
	Env           []string // extra env, e.g. SUB2API_PLUGIN_KEY
	MemoryMB      int      // 0 = no limit
	CPU           float64  // cores, informational without cgroup
	MaxOpenFiles  int
	MaxThreads    int
	StrictNetwork bool // seccomp denies AF_INET/AF_INET6 (Linux only)
	Seccomp       bool
	// RunDir is the private 0700 directory of this process: go-plugin
	// sockets and the plugin's TMPDIR live there. Landlock grants it instead
	// of the shared temporary directory.
	RunDir string
}

// ResourceEvent is reported by the watchdog.
type ResourceEvent struct {
	PluginKey string
	PID       int
	Kind      string // memory_exceeded | threads_exceeded | sample
	RSSBytes  int64
	Threads   int
	CPUPct    float64
	Message   string
}

// PluginLauncher builds the sandboxed command for a plugin and watches the
// running process. On non-Linux (dev mode) Command returns a plain command.
type PluginLauncher interface {
	Command(ctx context.Context, spec LaunchSpec) (*exec.Cmd, error)
	// Watch samples the process every 5 s and calls onEvent; the runtime
	// restarts the plugin on memory_exceeded. stop ends the watch.
	Watch(spec LaunchSpec, pid int, onEvent func(ResourceEvent)) (stop func())
}

// EgressPolicy is the per-plugin outbound policy.
type EgressPolicy struct {
	Mode           string   // allow_all | allowlist
	AllowedDomains []string // from the approved "net" grant scope
	// Net: the plugin holds the "net" grant. Without it nothing but the
	// database (below) is reachable, whatever Mode says.
	Net bool
	// Database: the plugin holds "db.schema" and declares a database, so the
	// PostgreSQL address handed out by HostService.GetDSN is reachable.
	Database bool
}

// EgressProvider serves EgressService for one plugin instance; the runtime
// registers the returned server on the plugin's host broker.
type EgressProvider interface {
	ServerFor(pluginKey string, policy func() EgressPolicy) pluginv1.EgressServiceServer
}

// PluginAccountPurger (owner: account) deletes the accounts of a plugin's
// account types; called by uninstall when the operator asks to remove them.
// Returns the number of accounts deleted.
type PluginAccountPurger interface {
	PurgePluginAccounts(ctx context.Context, pluginKey string) (int, error)
}

// ---------------------------------------------------------------- plugin account access

// PluginAccountQuery selects a page of PluginAccountReader.ListPluginAccounts.
type PluginAccountQuery struct {
	// Type restricts the page to one account type id ("" = every type of the
	// plugin). An unknown id matches nothing.
	Type string
	// AfterID is the keyset cursor: only accounts with a greater id are
	// returned, in ascending id order. 0 starts at the beginning.
	AfterID int64
	// Limit is the maximum number of rows; the implementation caps it.
	Limit int
	// IncludeInactive also returns accounts that are disabled, in error or
	// taken out of scheduling.
	IncludeInactive bool
}

// PluginAccountSummary is account metadata without credentials.
type PluginAccountSummary struct {
	ID          int64
	Name        string
	Type        string
	Status      string
	Schedulable bool
	// Settings is the plain (non-encrypted) settings object of the account:
	// the account type's settingsFields, e.g. base_url.
	Settings json.RawMessage
}

// PluginAccountCredentials is one account with its decrypted credentials.
type PluginAccountCredentials struct {
	PluginAccountSummary
	// Credentials is the decrypted non-settings part of the account, the same
	// JSON the plugin receives as Account.credentials_json on the gateway path.
	Credentials json.RawMessage
}

// PluginAccountReader (owner: account) serves HostService.ListAccounts and
// HostService.GetAccountCredentials: it lets a plugin read the accounts of its
// OWN account types outside a gateway request.
//
// Both methods take the calling plugin's key and filter on accounts.plugin_key
// in SQL, which is by construction the plugin that declared the account type.
// That filter is the whole security boundary, so it lives here, in the module
// that owns accounts, and not in the caller: a caller cannot ask for another
// plugin's accounts even by mistake, and there is no "all accounts" variant to
// reach for.
type PluginAccountReader interface {
	// ListPluginAccounts returns one page of the plugin's own accounts,
	// ordered by id. It never returns credentials.
	ListPluginAccounts(ctx context.Context, pluginKey string, q PluginAccountQuery) ([]PluginAccountSummary, error)
	// ReadPluginAccountCredentials returns one of the plugin's own accounts
	// with its decrypted credentials, and writes exactly one audit_logs row
	// per successful call. An account that exists but belongs to another
	// plugin's account type is reported as ErrNotFound, like one that does not
	// exist at all: telling the two apart would leak which account ids exist.
	//
	// The audit row is the price of the pull-style access, so it is not best
	// effort: when it cannot be written the call fails and no credential is
	// handed out.
	ReadPluginAccountCredentials(ctx context.Context, pluginKey string, id int64) (*PluginAccountCredentials, error)
}

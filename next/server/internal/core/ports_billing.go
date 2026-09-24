package core

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

// ============================================================ billing (owner: B billing)

// PriceRule is a resolved model_prices row. Prices are global per model
// (ARCHITECTURE 7.3): the base price, adjusted only by multipliers.
type PriceRule struct {
	ID          int64
	Pattern     string
	Mode        string // per_request | per_token | expression
	Expression  string
	ExprVersion int
	ExprHash    string
}

// Pricer resolves price rules and tells the gateway which request inputs an
// expression reads (param()/header()), so they can be captured at request
// time and evaluated later during settlement.
type Pricer interface {
	// Resolve returns ErrPriceNotConfigured when nothing matches and the
	// missing-price policy is "reject"; (nil, nil) when policy is "free".
	Resolve(ctx context.Context, model string) (*PriceRule, error)
	Inputs(rule *PriceRule) (bodyPaths []string, headerNames []string)
}

// BalanceGate is the pre-request balance check (cached; ErrInsufficientBalance).
type BalanceGate interface {
	CheckBalance(ctx context.Context, userID int64) error
}

// LedgerChange is one balance mutation. Amount is always positive; Kind
// decides the sign (usage/plugin_debit subtract, others add unless noted).
type LedgerChange struct {
	UserID         int64
	Amount         decimal.Decimal
	Credit         bool // true adds, false subtracts
	Kind           string
	RefType        string
	RefID          string
	IdempotencyKey string
	OperatorID     *int64
	PluginKey      string
	Note           string
}

type LedgerResult struct {
	LedgerID     int64
	BalanceAfter decimal.Decimal
	Duplicate    bool
}

// Ledger is the only way to change balances (admin adjust, plugin
// credit/debit, usage settlement). Applies change + ledger row + event in one
// transaction; idempotent on IdempotencyKey.
type Ledger interface {
	Apply(ctx context.Context, ch LedgerChange) (*LedgerResult, error)
	// ApplyTx applies the change inside the caller's transaction (used by
	// settlement so the usage row and the ledger row commit together).
	ApplyTx(ctx context.Context, tx pgx.Tx, ch LedgerChange) (*LedgerResult, error)
}

// UsageTokens are normalized token counts (see ARCHITECTURE 7.3).
type UsageTokens struct {
	Input           int64
	Output          int64
	CacheRead       int64
	CacheCreation   int64
	CacheCreation1h int64
}

// UsageRecord is produced by the gateway for every finished request and
// submitted to the Settler, which persists usage_logs, bills and emits
// usage.recorded asynchronously.
type UsageRecord struct {
	RequestID     string
	UserID        int64
	APIKeyID      int64
	GroupID       int64
	AccountID     *int64
	PluginKey     string
	PluginVersion string
	Platform      string // platform of the client endpoint
	Protocol      string // protocol of the client endpoint
	AccountType   string // type id of the account (declared by PluginKey)
	// UpstreamProtocol is the protocol sent upstream; differs from Protocol
	// when the core converted the request (ARCHITECTURE 6.6).
	UpstreamProtocol string
	Endpoint         string
	Model            string
	UpstreamModel    string
	Stream           bool
	StatusCode       int
	Success          bool
	ErrorType        string // see usage_logs.error_type
	ErrorMessage     string
	Attempts         int
	UsageSemantics   string // exclusive | inclusive
	Tokens           UsageTokens
	Metrics          map[string]any // plugin usage facts for u("key")
	StickyRule       string
	StickyHit        bool
	HookDecisions    []HookDecision
	Billable         bool              // false for endpoint billing=free or zero usage
	Price            *PriceRule        // nil when not billable or free policy
	PriceParams      map[string]string // body path -> raw JSON value captured at request time
	PriceHeaders     map[string]string // lower-case header -> value captured at request time
	RateMultiplier   decimal.Decimal
	LatencyMs        int
	FirstTokenMs     int
	ClientIP         string
	UserAgent        string
	NodeID           string
	CreatedAt        time.Time // request start; time functions evaluate against it
}

type HookDecision struct {
	PluginKey string `json:"plugin_key"`
	HookID    string `json:"hook_id"`
	Decision  string `json:"decision"` // allow | deny | error_open | error_closed | skipped_breaker
	LatencyMs int    `json:"latency_ms"`
	Note      string `json:"note,omitempty"`
}

// Settler accepts usage records without blocking the request path.
type Settler interface {
	Submit(rec *UsageRecord)
}

// ============================================================ events (writer owner: B; delivery owner: H)

// Event types; payload schemas in docs/CONTRACTS.md.
const (
	EventUsageRecorded        = "usage.recorded"
	EventAccountCreated       = "account.created"
	EventAccountUpdated       = "account.updated"
	EventAccountDeleted       = "account.deleted"
	EventAccountStatusChanged = "account.status_changed"
	EventUserCreated          = "user.created"
	EventUserUpdated          = "user.updated"
	EventBalanceChanged       = "balance.changed"
	EventPluginEnabled        = "plugin.enabled"
	EventPluginDisabled       = "plugin.disabled"
	// EventPluginEgressNewDomain: a plugin connected to a host it never used
	// before (payload {plugin_key, host, port, node_id, first_seen_at}).
	EventPluginEgressNewDomain = "plugin.egress_new_domain"
)

type Event struct {
	Type    string
	Payload any // marshalled to JSON
}

// EventPublisher writes to the events outbox. Use Emit inside the business
// transaction so events are never lost or emitted for rolled-back work.
type EventPublisher interface {
	Emit(ctx context.Context, tx pgx.Tx, events ...Event) error
}

// RawJSON is a helper alias for pre-encoded payloads.
type RawJSON = json.RawMessage

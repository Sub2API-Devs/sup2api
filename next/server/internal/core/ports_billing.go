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
	Model       string // complete model id (exact match, no wildcards)
	Mode        string // per_request | per_token | expression
	Expression  string
	ExprVersion int
	ExprHash    string
	VideoOnly   bool // video templates and video_* expressions require declared video support
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

// BalanceGate requires both the cached balance check and atomic precharge;
// a gateway must never silently run with only the cached check.
type BalanceGate interface {
	RequestPrecharger
	CheckBalance(ctx context.Context, userID int64) error
}

// QuoteInputs holds the parameters for calculating a price quote.
type QuoteInputs struct {
	Expression     string
	UsageSemantics string
	Tokens         UsageTokens
	Metrics        map[string]any
	PriceParams    map[string]any
	PriceHeaders   map[string]string
	RateMultiplier decimal.Decimal
	CreatedAt      time.Time
}

// Quoter provides the unified price calculation entry point. Settlement,
// reserve, reconcile and precharge all call Quote to ensure consistent pricing.
type Quoter interface {
	Quote(ctx context.Context, in QuoteInputs) (decimal.Decimal, error)
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
	// UserID, Delta, Kind are returned when Duplicate=true to enable conflict detection
	UserID int64
	Delta  decimal.Decimal
	Kind   string
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
	RequestID string
	// ClientRequestID is the client's X-Request-Id, truncated to 128 chars;
	// recorded only, never used as an idempotency key.
	ClientRequestID string
	UserID          int64
	APIKeyID        int64
	GroupID         int64
	AccountID       *int64
	PluginKey       string
	PluginVersion   string
	Platform        string // platform of the client endpoint
	Protocol        string // protocol of the client endpoint
	AccountType     string // type id of the account (declared by PluginKey)
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
	// PluginDetail is the free-form JSON object a plugin returned from
	// PlatformService.ExtractUsage (usage_logs.plugin_detail). It is the only
	// part of a usage record a plugin writes verbatim, billing never reads
	// it, and it is capped at 4 KiB. nil = "{}".
	PluginDetail RawJSON
	// UsageExtract records how this request's usage was obtained, when that
	// is worth knowing: empty for the declarative rules (the normal case, and
	// nothing is stored), UsageExtractPlugin when a plugin's ExtractUsage
	// answer was used, UsageExtractFallback when the plugin was asked and
	// could not answer, so the request is billed from whatever the
	// declarative rules found - possibly nothing at all. The gateway also
	// warns; this is the part that survives into usage_logs.
	UsageExtract  string
	StickyRule    string
	StickyHit     bool
	HookDecisions []HookDecision
	// SchedDecisions is what the scheduler.rank plugins changed for this
	// request; empty when none took part (CONTRACTS §24).
	SchedDecisions []SchedDecision
	// ResponseMismatch names the way the upstream response shape disagreed
	// with what the endpoint's manifest declares in endpoint.response
	// (ResponseMismatchSSENotDeclared / ResponseMismatchJSONWhileStream);
	// empty when they agree or no endpoint declaration was available. The
	// gateway records it in usage_logs.anomalies and changes nothing
	// else: the request is forwarded and billed exactly as before.
	ResponseMismatch string
	// Reservation is set when the plugin reported that this request only
	// STARTED the work upstream and gave an estimate of it (CONTRACTS §25.4).
	// The settler then charges the estimate, marks the row "reserved" and
	// registers it in pending_settlements for the reconcile loop. nil is the
	// ordinary case: the usage is final when the response ends.
	Reservation *UsageReservation
	// ReservationDropped says why a Reservation the plugin DID return is not
	// on this record: the gateway found the record unbillable (the endpoint
	// bills "free", no price, an empty estimate on a per-token price) and
	// cleared it. Empty in the ordinary case. It is recorded in
	// usage_logs.anomalies because the alternative - a job that was really
	// started upstream, never pre-charged, never reconciled, and nothing
	// anywhere saying so - is the silent kind of wrong (CONTRACTS §25.5).
	ReservationDropped string
	Billable           bool              // false for endpoint billing=free or zero usage
	Price              *PriceRule        // nil when not billable or free policy
	PriceParams        map[string]string // body path -> raw JSON value captured at request time
	PriceHeaders       map[string]string // lower-case header -> value captured at request time
	RateMultiplier     decimal.Decimal
	LatencyMs          int
	FirstTokenMs       int
	ClientIP           string
	UserAgent          string
	NodeID             string
	CreatedAt          time.Time // request start; time functions evaluate against it
}

// Response shape mismatches recorded in usage_logs.anomalies
// ("response_mismatch"). endpoint.request.stream / request.streamPath is what
// the *client* asked for; endpoint.response.stream / response.nonStream is the
// shape the endpoint *promises*. The gateway still picks the forwarding mode
// from the upstream Content-Type - a working client must not break because a
// manifest is incomplete - but an endpoint that never declares the shape it
// actually returns has no usage rules for it either, so its tokens are lost
// silently. These markers make that visible.
const (
	// ResponseMismatchSSENotDeclared: upstream answered text/event-stream but
	// the endpoint declares no response.stream. The dangerous direction: the
	// usage.sse rules are usually missing too, so token usage is not counted.
	ResponseMismatchSSENotDeclared = "sse_not_declared"
	// ResponseMismatchJSONWhileStream: upstream answered JSON but the endpoint
	// declares only response.stream (no response.nonStream, which manifest
	// validation allows for an always-streaming endpoint). Harmless in
	// comparison, recorded for symmetry.
	ResponseMismatchJSONWhileStream = "json_while_stream_declared"
)

// How a usage record's tokens were obtained, recorded in
// usage_logs.anomalies ("usage_extract") for the endpoints that declare
// usage.source "plugin". Endpoints using the declarative rules - every
// endpoint in the tree today - record nothing.
const (
	// UsageExtractPlugin: PlatformService.ExtractUsage answered and its
	// report is what was billed.
	UsageExtractPlugin = "plugin"
	// UsageExtractFallback: the endpoint asked a plugin for its usage and the
	// plugin could not answer (error, timeout, UNIMPLEMENTED, nil, or a
	// response the host would not hand over). The request was billed from
	// whatever the declarative rules produced while forwarding, which for an
	// endpoint that chose usage.source "plugin" is often nothing - it chose
	// that source precisely because the rules cannot express its usage. This
	// marker is the difference between under-billing and *silent*
	// under-billing.
	UsageExtractFallback = "fallback"
)

// MaxPluginDetailBytes caps UsageReport.detail_json.
const MaxPluginDetailBytes = 4 << 10

// Keys of usage_logs.anomalies: facts about how a usage record was produced,
// never about what it costs. The column exists because billing_detail - whose
// name promises a billing breakdown, and which settlement rewrites wholesale -
// had collected two of them (CONTRACTS §26.5).
const (
	// AnomalyResponseMismatch: one of the ResponseMismatch* values above.
	AnomalyResponseMismatch = "response_mismatch"
	// AnomalyUsageExtract: one of the UsageExtract* values above.
	AnomalyUsageExtract = "usage_extract"
	// AnomalyReconcile: the outcome of the reconcile loop for a pre-charged
	// row when that outcome left the ESTIMATE as the charge: ReconcileAbandoned
	// (the upstream never gave an answer) or ReconcileEstimated (the upstream
	// confirmed the work but reported no usage). A row whose real usage came
	// back carries no marker. Both values mean "the tokens and the cost of
	// this row are a plugin's estimate", which is what a revenue summary has
	// to be able to count; they differ in why, which is what an operator
	// looking at the row has to be able to tell.
	AnomalyReconcile = "reconcile"
	// AnomalyReconcileAttempts / AnomalyReconcileError describe that give-up
	// (or, for ReconcileEstimated, the plugin's note on why no usage exists).
	AnomalyReconcileAttempts = "reconcile_attempts"
	AnomalyReconcileError    = "reconcile_error"
	// AnomalyReservation: ReservationDropped - the plugin returned a
	// Reservation the gateway could not honour (UsageRecord.ReservationDropped
	// says why, under AnomalyReservationError). The request was billed as an
	// ordinary one, i.e. for a free endpoint not at all.
	AnomalyReservation      = "reservation"
	AnomalyReservationError = "reservation_error"
)

// Values of AnomalyReconcile.
const (
	// ReconcileAbandoned: the core stopped trying to reconcile (deadline or
	// attempts). The estimate stands as the final charge.
	ReconcileAbandoned = "abandoned"
	// ReconcileEstimated: the plugin answered SETTLED_ESTIMATE - the work
	// finished, the upstream reported no usage. The estimate stands as the
	// final charge.
	ReconcileEstimated = "estimated"
)

// ReservationDropped is the AnomalyReservation value for a reservation the
// gateway received and cleared.
const ReservationDropped = "dropped"

// Anomalies collects the observability markers of a record for
// usage_logs.anomalies; nil when there is nothing unusual to say, which is
// the normal case.
func (r *UsageRecord) Anomalies() map[string]string {
	var m map[string]string
	put := func(k, v string) {
		if v == "" {
			return
		}
		if m == nil {
			m = map[string]string{}
		}
		m[k] = v
	}
	put(AnomalyResponseMismatch, r.ResponseMismatch)
	put(AnomalyUsageExtract, r.UsageExtract)
	if r.ReservationDropped != "" {
		put(AnomalyReservation, ReservationDropped)
		put(AnomalyReservationError, r.ReservationDropped)
	}
	return m
}

// UsageReservation is a plugin's statement that this request started work
// upstream whose real usage is not known yet - a video generation job, say -
// together with its own estimate (PLUGIN-EXECUTES-CORE-RECORDS §3.4,
// UsageReport.reserve). It is filled from what the plugin returned and
// nothing else: the estimate is priced, charged and reconciled by the core.
//
// Its point is a hole the pre-request balance check cannot close: that check
// is a cached read that allows a brief overdraft, so a user with $0 can
// submit a thousand jobs before the first of them settles. A reservation
// charges the estimate up front, at submit time, through the ordinary ledger
// path and the ordinary idempotency key.
//
// The ESTIMATE itself is not in here: it is the record's own Tokens and
// Metrics, because until a reconcile says otherwise it IS this request's
// usage - that is what was priced, charged and recorded, and what stays if
// the core ever gives up asking.
type UsageReservation struct {
	// PluginKey is the plugin the core will ask to reconcile this entry: the
	// one declaring the platform of the response, i.e. the one that answered
	// ExtractUsage. Filled by the gateway, never by the plugin.
	PluginKey string
	// RefID is the plugin's own id for the work (a task id). It is unique
	// per plugin: (plugin_key, ref_id) is the key of pending_settlements.
	RefID string
	// NextCheckAfter is when the plugin expects an answer to be available.
	// Zero (or negative) leaves the delay to the core's backoff.
	NextCheckAfter time.Duration
	// Deadline is an UPSTREAM FACT the plugin states: how long this entry can
	// be asked about at all (an Ark video task is queryable for 7 days). The
	// core clamps it with its own max_reconcile_age_sec; zero takes the
	// core's default.
	Deadline time.Duration
}

type HookDecision struct {
	PluginKey string `json:"plugin_key"`
	HookID    string `json:"hook_id"`
	Decision  string `json:"decision"` // allow | deny | error_open | error_closed | skipped_breaker
	LatencyMs int    `json:"latency_ms"`
	Note      string `json:"note,omitempty"`
}

// SchedDecision is what one scheduler.rank plugin changed while the gateway
// scheduled the request (usage_logs.sched_decisions, CONTRACTS §24). Only
// accounts whose priority or weight the plugin actually moved are listed, and
// only when the rewrite was applied: a run the gateway discarded (every
// candidate excluded) records nothing.
type SchedDecision struct {
	PluginKey string       `json:"plugin"`
	Changed   []RankChange `json:"changed"`
}

// RankChange is the final priority/weight one plugin gave one candidate for
// this request; the account's own configuration is untouched.
type RankChange struct {
	AccountID int64 `json:"account_id"`
	Priority  int   `json:"priority"`
	Weight    int   `json:"weight"` // 0 = not used for this request
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

// Total is the number of tokens processed (all kinds), used by rate limits.
func (t UsageTokens) Total() int64 {
	return t.Input + t.Output + t.CacheRead + t.CacheCreation + t.CacheCreation1h
}

package core

import (
	"context"
	"encoding/json"
	"hash/fnv"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// ============================================================ identity & authz (owner: A core-data)

// TokenVerifier validates console access tokens (JWT).
type TokenVerifier interface {
	VerifyAccessToken(ctx context.Context, token string) (userID int64, err error)
}

// PermissionSet is a user's effective permissions at a given authz version.
type PermissionSet struct {
	Superuser bool
	Keys      map[string]struct{}
	Version   int64
}

func (s PermissionSet) Has(key string) bool {
	if s.Superuser {
		return true
	}
	_, ok := s.Keys[key]
	return ok
}

// AccessKeyPrefix starts every access key, so a bearer token can be told from
// a console JWT without parsing it.
const AccessKeyPrefix = "sak_"

// AccessKeyIdentity is who an access key acts for and what it was given.
type AccessKeyIdentity struct {
	UserID      int64
	KeyID       int64
	Permissions []string
}

// AccessKeyVerifier validates access keys (CONTRACTS §80).
type AccessKeyVerifier interface {
	VerifyAccessKey(ctx context.Context, raw, ip string) (AccessKeyIdentity, error)
}

// AuthenticateBearer resolves a console bearer token to its user: a JWT, or an
// access key, whose limits then travel in the returned context.
func AuthenticateBearer(ctx context.Context, tokens TokenVerifier, token, ip string) (context.Context, int64, error) {
	if !strings.HasPrefix(token, AccessKeyPrefix) {
		uid, err := tokens.VerifyAccessToken(ctx, token)
		if err != nil {
			return ctx, 0, err
		}
		return WithUserID(ctx, uid), uid, nil
	}
	keys, ok := tokens.(AccessKeyVerifier)
	if !ok {
		return ctx, 0, ErrUnauthenticated
	}
	id, err := keys.VerifyAccessKey(ctx, token, ip)
	if err != nil {
		return ctx, 0, err
	}
	return WithAccessKey(WithUserID(ctx, id.UserID), id), id.UserID, nil
}

// Restrict returns the part of the set that keys allow: never more than the
// set itself, and no longer a superuser, whose Has is true for anything.
func (s PermissionSet) Restrict(keys []string) PermissionSet {
	out := PermissionSet{Keys: make(map[string]struct{}, len(keys)), Version: s.Version}
	for _, k := range keys {
		if s.Has(k) {
			out.Keys[k] = struct{}{}
		}
	}
	return out
}

// Authorizer answers permission questions; results are cached per node and
// invalidated through the authz:changed broadcast.
type Authorizer interface {
	Can(ctx context.Context, userID int64, permission string) (bool, error)
	PermissionSet(ctx context.Context, userID int64) (PermissionSet, error)
	// CanGrant validates the actor holds all permissions being granted (CONTRACTS §4.1, SEC-H2).
	CanGrant(ctx context.Context, actorID int64, perms []string) error
	// CanActOn validates the actor may act on a target with the given permissions (CONTRACTS §4.1, SEC-H2).
	CanActOn(ctx context.Context, actorID int64, targetPerms []string) error
}

// PermissionDef describes one permission in the catalog.
type PermissionDef struct {
	Key         string
	Module      string
	Label       LocalizedText
	Description LocalizedText
	Sensitive   bool
	Sort        int
}

// PermissionCatalog is used by the plugin runtime to manage plugin-owned
// permissions ("plugin.<key>:<local>"). Every mutation bumps the authz version
// and broadcasts authz:changed.
type PermissionCatalog interface {
	// SyncPlugin upserts the plugin's permissions (install/upgrade), deleting
	// ones no longer declared, and grants newly created ones to roleKeys.
	SyncPlugin(ctx context.Context, tx pgx.Tx, pluginKey string, defs []PermissionDef, grantNewToRoleKeys []string) error
	// SetPluginActive flips status active/disabled (enable/disable).
	SetPluginActive(ctx context.Context, tx pgx.Tx, pluginKey string, active bool) error
	// DeletePlugin removes the plugin's permissions and grants (uninstall).
	DeletePlugin(ctx context.Context, tx pgx.Tx, pluginKey string) error
}

// ============================================================ api keys & groups (owner: A)

type GroupInfo struct {
	ID              int64
	Name            string
	Status          string
	RateMultiplier  decimal.Decimal
	ModelAllowlist  []string // globs; empty = all
	ModelFilterMode string   // whitelist (default) or blacklist
	// Environment is the group layer of the environment variables (§74.3).
	Environment EnvironmentValues
	// ConversionLossPolicy is the group's conversion loss policy (§88), ""
	// to leave it to the accounts (default allow).
	ConversionLossPolicy string
}

// APIKeyPrincipal is the result of gateway authentication.
type APIKeyPrincipal struct {
	KeyID  int64
	UserID int64
	// KeyLimits and KeyQuota are the caps the key's owner set on it.
	KeyLimits KeyLimits
	KeyQuota  KeyQuota
	Group     GroupInfo
}

// KeyQuota is an API key's spend cap in USD (Limit 0 = unlimited) and what
// its requests were charged so far (CONTRACTS §61).
type KeyQuota struct {
	Limit decimal.Decimal `json:"quota_limit"`
	Used  decimal.Decimal `json:"quota_used"`
}

// Exhausted reports whether a capped key has spent its quota.
func (q KeyQuota) Exhausted() bool { return q.Limit.IsPositive() && q.Used.GreaterThanOrEqual(q.Limit) }

// KeyLimits caps one API key (0 = unlimited): requests and tokens per minute
// and requests in flight, all counted across the nodes.
type KeyLimits struct {
	RPM         int   `json:"rpm_limit"`
	TPM         int64 `json:"tpm_limit"`
	Concurrency int   `json:"max_concurrency"`
}

// KeyUsageReporter answers GET /v1/usage for an authenticated API key: what
// it can still spend, its caps and what it used (CONTRACTS §62). The answer
// is written as JSON.
type KeyUsageReporter interface {
	KeyUsage(ctx context.Context, p *APIKeyPrincipal) (any, error)
}

// KeySlots is the Slots kind of the API keys' requests in flight.
const KeySlots = "apikey"

// AccountWaitSlots is the Slots kind of the requests queueing for an account
// (docs/GATEWAY-CONCURRENCY-DESIGN.md §3).
const AccountWaitSlots = "account-wait"

// RateHold is one admitted request in the rate windows: what it reserved in
// each set of counters of its subject, until Settle replaces that by what the
// request really used. At is the Redis time it was admitted at: the
// reservations sit in the window's segment of that time (CONTRACTS §68.3). A
// hold never settled returns by itself when that segment leaves the window.
type RateHold struct {
	Subject int64
	At      time.Time
	Items   []RateHoldItem
}

// RateHoldItem is what a hold reserved in the counters Sub ("" = the
// subject's own).
type RateHoldItem struct {
	Sub    string
	Tokens int64
}

// RateWindows counts requests and tokens of one kind of subject (API keys)
// over the last 60 seconds, shared by every node. Admit counts one request
// when the subject is under rpm and tpm (0 = unlimited), else returns the time
// until it would pass; Reserve also reserves tokens until Settle; AddTokens
// counts a finished response admitted without a reservation.
type RateWindows interface {
	Admit(ctx context.Context, id int64, rpm int, tpm int64) (ok bool, retry time.Duration, err error)
	Reserve(ctx context.Context, id int64, rpm int, tpm, tokens int64) (hold RateHold, ok bool, retry time.Duration, err error)
	Settle(ctx context.Context, hold RateHold, actual int64)
	AddTokens(ctx context.Context, id, n int64)
	Usage(ctx context.Context, ids []int64) (map[int64]RateUsage, error)
}

// APIKeyAuthenticator resolves a raw client key. Errors: ErrUnauthenticated
// (unknown/disabled/expired key or disabled user), ErrPermissionDenied (user
// lacks gateway:use or the group is not available to the user).
type APIKeyAuthenticator interface {
	Authenticate(ctx context.Context, rawKey string) (*APIKeyPrincipal, error)
}

// ============================================================ accounts & proxies (owner: A)

// AccountRef is the scheduling view of an account (no secrets).
type AccountRef struct {
	ID             int64
	Name           string
	PluginKey      string // declaring plugin of the account type
	Type           string
	Priority       int // higher first
	Weight         int // within a priority, 1-1000
	MaxConcurrency int
	ProxyID        *int64
	// Models the account serves (complete ids); empty = all models.
	Models []string
	// ModelMapping rewrites the client model to the upstream model.
	ModelMapping map[string]string
	// Rate limits; 0 = unlimited (CONTRACTS §18). SPMLimit caps the sticky
	// sessions seen in the last SPMWindowSeconds (0 = 60; CONTRACTS §71).
	RPMLimit         int
	TPMLimit         int64
	SPMLimit         int
	SPMWindowSeconds int
	// ModelLimits cap lists of (client) models on top of the account's own
	// limits (CONTRACTS §68); a model is in at most one list.
	ModelLimits []ModelLimit
	// Environment is the account layer of the environment variables (§74.3).
	Environment EnvironmentValues
	// ConversionLossPolicy is the account's conversion loss policy (§88), ""
	// to inherit the group's.
	ConversionLossPolicy string
}

// ModelLimit caps the requests of a list of models on one account. The
// models of a list share one set of counters; 0 = unlimited. Its sessions
// are counted over SPMWindowSeconds (absent or 0 = 60; CONTRACTS §71).
type ModelLimit struct {
	Models           []string `json:"models"`
	MaxConcurrency   int      `json:"max_concurrency"`
	RPMLimit         int      `json:"rpm_limit"`
	TPMLimit         int64    `json:"tpm_limit"`
	SPMLimit         int      `json:"spm_limit"`
	SPMWindowSeconds int      `json:"spm_window_seconds"`
}

// Key identifies the counters of the list: a hash of its sorted models, so
// changing the limits keeps the counts and changing the models starts anew.
func (l *ModelLimit) Key() string {
	models := slices.Clone(l.Models)
	slices.Sort(models)
	h := fnv.New64a()
	for _, m := range models {
		h.Write([]byte(m))
		h.Write([]byte{0})
	}
	return strconv.FormatUint(h.Sum64(), 36)
}

// ModelLimitSlots is the Slots kind of the requests in flight of one model
// list of an account (the id is the account's).
func ModelLimitSlots(key string) string { return "account-model:" + key }

// ModelSlots is the Slots kind of the requests in flight of one client model
// of an account, taken uncapped: it only counts them.
func ModelSlots(model string) string { return "account-md:" + model }

// ModelLimitFor returns the list holding the (client) model, or nil.
func (a *AccountRef) ModelLimitFor(model string) *ModelLimit {
	if i := a.ModelLimitIndex(model); i >= 0 {
		return &a.ModelLimits[i]
	}
	return nil
}

// ModelLimitIndex returns the index of the list holding the (client) model
// in ModelLimits, or -1.
func (a *AccountRef) ModelLimitIndex(model string) int {
	if model == "" {
		return -1
	}
	return slices.IndexFunc(a.ModelLimits, func(l ModelLimit) bool { return slices.Contains(l.Models, model) })
}

// ServesModel reports whether the account may serve the (client) model.
func (a *AccountRef) ServesModel(model string) bool {
	if len(a.Models) == 0 {
		return true
	}
	for _, m := range a.Models {
		if m == model {
			return true
		}
	}
	return false
}

// MapModel returns the upstream model for the client model.
func (a *AccountRef) MapModel(model string) string {
	if to, ok := a.ModelMapping[model]; ok && to != "" {
		return to
	}
	return model
}

// Limited reports whether the account has any rate limit, its own or one of
// a model list.
func (a *AccountRef) Limited() bool {
	if a.RPMLimit > 0 || a.TPMLimit > 0 || a.SPMLimit > 0 {
		return true
	}
	for _, l := range a.ModelLimits {
		if l.RPMLimit > 0 || l.TPMLimit > 0 || l.SPMLimit > 0 {
			return true
		}
	}
	return false
}

// RateUsage is the usage of a subject's rate limits: requests and tokens of
// the last 60 seconds. Sessions (accounts only) counts the sessions of the
// session window (CONTRACTS §71); Models
// (accounts only) holds the usage of each model list, in the order of the
// account's model_limits.
type RateUsage struct {
	RPM      int64            `json:"rpm"`
	TPM      int64            `json:"tpm"`
	Sessions int64            `json:"sessions"`
	Models   []ModelRateUsage `json:"models,omitempty"`
}

// ModelRateUsage is the usage of one model list of an account.
type ModelRateUsage struct {
	Models   []string `json:"models"`
	InUse    int      `json:"in_use"`
	RPM      int64    `json:"rpm"`
	TPM      int64    `json:"tpm"`
	Sessions int64    `json:"sessions"`
}

// requestSessionPrefix starts the session of a request that is its own
// session (RequestSession).
const requestSessionPrefix = "req:"

// RequestSession is the session of a request no sticky session matched: the
// request alone is a new session (CONTRACTS §71.2), which never comes back.
func RequestSession(requestID string) string { return requestSessionPrefix + requestID }

// IsRequestSession reports whether session is a RequestSession: the limiter
// counts it once and does not remember it.
func IsRequestSession(session string) bool { return strings.HasPrefix(session, requestSessionPrefix) }

// AccountLimiter enforces per-account RPM, TPM and SPM, and those of the
// model list holding the request's (client) model, shared by every node:
// requests and tokens over the last 60 seconds, sessions over each level's
// session window. model "" checks the account's own limits only; any
// other model is also counted apart, uncapped, for GET /accounts/:id/rate-models.
// session is the request's session (CONTRACTS §71: its sticky session key,
// else RequestSession); "" (tasks, downloads) is neither checked against SPM
// nor counted.
type AccountLimiter interface {
	// Exhausted returns the ids among refs that reached a limit for model
	// and session; an account already holding the session passes its SPM.
	// Accounts without limits are never listed.
	Exhausted(ctx context.Context, refs []AccountRef, model, session string) (map[int64]bool, error)
	// TryHit atomically checks the limits for model and session and counts an
	// admitted request (and the session), without reserving tokens.
	TryHit(ctx context.Context, ref AccountRef, model, session string) (bool, error)
	// Reserve is TryHit that also reserves tokens against the TPM caps until
	// Settle (CONTRACTS §78).
	Reserve(ctx context.Context, ref AccountRef, model, session string, tokens int64) (RateHold, bool, error)
	// Settle replaces what hold reserved by the tokens really used; 0 returns
	// the reservation and the request stays counted.
	Settle(ctx context.Context, hold RateHold, actual int64)
	// ReleaseSession takes session off the account's (and its model list's)
	// active sessions: a retry moved the session to another account, which
	// now holds it alone. Best effort.
	ReleaseSession(ctx context.Context, ref AccountRef, model, session string)
	// AddTokens adds the tokens of a finished response to the account and,
	// when list is not "", to the model list of that key (ModelLimit.Key).
	AddTokens(ctx context.Context, id int64, list string, n int64)
	// Usage returns the counters of the accounts and of their model lists:
	// RateUsage.Models[i] is refs[k].ModelLimits[i], so ModelLimitIndex finds
	// a model's list (CONTRACTS §89 limit load).
	Usage(ctx context.Context, refs []AccountRef) (map[int64]RateUsage, error)
	// ModelUsage returns the uncapped counters of the (client) model on each
	// account (Models left empty), what the traffic balance by model compares
	// (CONTRACTS §89); model "" reads nothing and returns an empty map.
	ModelUsage(ctx context.Context, refs []AccountRef, model string) (map[int64]RateUsage, error)
	// CountModelTokens adds the tokens of a finished response to today's
	// tokens of the client model on account id (CONTRACTS §68.7).
	CountModelTokens(ctx context.Context, id int64, model string, n int64)
	// ModelRates returns the figures of the account, then those of each
	// client model it served since the earlier of midnight and an hour ago,
	// the most tokens today first; InUse is left to the caller. Sessions are
	// counted over the account's session window.
	ModelRates(ctx context.Context, ref AccountRef, midnight time.Time) ([]ModelRates, error)
}

// ModelRates are the figures of one client model of an account ("" = the
// account itself): requests in flight, the last minute's requests, tokens
// and sessions, and the tokens since midnight (TPD).
type ModelRates struct {
	Model    string `json:"model,omitempty"`
	InUse    int    `json:"in_use"`
	RPM      int64  `json:"rpm"`
	TPM      int64  `json:"tpm"`
	TPD      int64  `json:"tpd"`
	Sessions int64  `json:"sessions"`
}

// Account adds decrypted credentials and settings.
type Account struct {
	AccountRef
	Status      string
	Schedulable bool
	AutoDisable bool
	Credentials json.RawMessage
	Settings    json.RawMessage
	// HeaderPassthrough lists the client headers copied onto the upstream
	// request (CONTRACTS §81); empty = none beyond the platform's own.
	HeaderPassthrough []string
	// ParamOverride rewrites the upstream body and headers (CONTRACTS §84);
	// nil = none.
	ParamOverride *ParamOverride
}

func (a *Account) PluginAccount(platform string) *pluginv1.Account {
	return &pluginv1.Account{Id: a.ID, Name: a.Name, Platform: platform, Type: a.Type, CredentialsJson: string(a.Credentials), SettingsJson: string(a.Settings), Properties: &pluginv1.AccountProperties{
		Status: a.Status, Schedulable: a.Schedulable, AutoDisable: a.AutoDisable,
		Priority: int32(a.Priority), Weight: int32(a.Weight), MaxConcurrency: int32(a.MaxConcurrency),
		RpmLimit: int32(a.RPMLimit), TpmLimit: a.TPMLimit, SpmLimit: int32(a.SPMLimit), ProxyId: a.ProxyID, Models: a.Models, ModelMapping: a.ModelMapping,
		ModelLimits: PluginModelLimits(a.ModelLimits),
	}}
}

// PluginModelLimits converts model limits for the plugin protocol.
func PluginModelLimits(in []ModelLimit) []*pluginv1.ModelLimit {
	if len(in) == 0 {
		return nil
	}
	out := make([]*pluginv1.ModelLimit, len(in))
	for i, l := range in {
		out[i] = &pluginv1.ModelLimit{Models: l.Models, MaxConcurrency: int32(l.MaxConcurrency), RpmLimit: int32(l.RPMLimit), TpmLimit: l.TPMLimit, SpmLimit: int32(l.SPMLimit)}
	}
	return out
}

// AccountDirectory is the gateway's view of accounts. Candidates are served
// from a per-node snapshot invalidated by account:changed.
type AccountDirectory interface {
	// Candidates returns active, schedulable accounts of the group whose
	// account type is in types, excluding cooling-down ones.
	Candidates(ctx context.Context, groupID int64, types []AccountTypeKey) ([]AccountRef, error)
	// GroupHasType reports whether the group holds any account (not deleted,
	// whatever its status) of one of types: without one the group cannot serve
	// the endpoint at all, which is not a passing shortage.
	GroupHasType(ctx context.Context, groupID int64, types []AccountTypeKey) (bool, error)
	// Load returns one account with decrypted credentials.
	Load(ctx context.Context, id int64) (*Account, error)
	IsCoolingDown(ctx context.Context, id int64) (bool, error)
	SetCooldown(ctx context.Context, id int64, until time.Time, reason string) error
	// AutoDisable sets status=auto_disabled with a reason and emits
	// account.status_changed, unless the account opted out of automatic
	// disabling (CONTRACTS §42.3). It reports whether the account is disabled.
	AutoDisable(ctx context.Context, id int64, reason string) (bool, error)
	// AutoDisableByPolicy executes a decision already authorized by the core's
	// request policy snapshot. It still checks the account's own opt-out, but
	// does not reread the global switch from a newer policy revision.
	AutoDisableByPolicy(ctx context.Context, id int64, reason string) (bool, error)
	// AutoDisableUntil sets status=auto_disabled until release, when the
	// core's sweep makes the account active again: a temporary disable a
	// plugin's ClassifyError asked for (automatic_state with a release time,
	// CONTRACTS §69). The account's opt-out and the global switch still
	// apply. It reports whether the account is disabled.
	AutoDisableUntil(ctx context.Context, id int64, reason string, release time.Time) (bool, error)
	TouchLastUsed(ctx context.Context, id int64)
}

// QuotaObserver receives the subscription quota headers of the gateway's
// upstream responses (CONTRACTS §44). The gateway calls it for every
// response (2xx and 429 matter, the observer ignores the rest) of an account
// type declaring manifest quota.headers, with that declaration. It must not
// block: implementations parse the few declared headers and hand the result
// to an asynchronous, throttled writer.
type QuotaObserver interface {
	ObserveQuotaHeaders(accountID int64, headers []manifest.QuotaHeader, status int, h http.Header)
}

// ProxyDirectory hands out HTTP clients per proxy (nil = direct), cached and
// rebuilt when a proxy changes.
type ProxyDirectory interface {
	HTTPClient(ctx context.Context, proxyID *int64) (*http.Client, error)
	// HTTPClientFor builds a transient client for a proxy that is not (or
	// not yet) stored, e.g. a proxy_url given to a models/fetch request
	// (CONTRACTS §21.4). Nothing is cached or written; the caller should
	// CloseIdleConnections when done. spec must already be validated
	// (proxy.ParseURL).
	HTTPClientFor(ctx context.Context, spec ProxySpec) (*http.Client, error)
}

// ProxySpec is a parsed proxy address (proxy.ParseURL, CONTRACTS §21.4).
// Protocol is http, https or socks5 (socks5h is normalised to socks5);
// Host is lower-case without IPv6 brackets.
type ProxySpec struct {
	Protocol string
	Host     string
	Port     int
	Username string
	Password string
}

// ProxyResolver finds or creates the proxy row matching a parsed proxy URL
// when an account is saved with proxy_url (CONTRACTS §21.4). Implemented by
// proxy.Service, injected into account.Deps.
type ProxyResolver interface {
	// FindOrCreate returns the id of the enabled proxy equal to spec in
	// protocol, host, port, username and password, restricted to rows the
	// caller may see (scope nil = all, otherwise created_by = *scope; NULL
	// created_by rows only match under nil), or inserts a new one owned by
	// ownerID (name "<protocol>://<host>:<port>", status active). It must
	// run inside the caller's transaction (tx) together with the account
	// write; it takes pg_advisory_xact_lock on the match key first so two
	// concurrent saves of the same URL never create duplicates.
	//
	// It writes no audit row and sends no broadcast: the account id the
	// audit detail needs does not exist yet when the account is being
	// created. After the account row is written, callers pass created ==
	// true rows to AuditAutoCreate in the same transaction.
	FindOrCreate(ctx context.Context, tx pgx.Tx, spec ProxySpec, ownerID int64, scope *int64) (id int64, created bool, err error)
	// AuditAutoCreate records the audit row proxy.create {auto:true,
	// account_id} (actor = ownerID, ip from audit.WithClientIP on ctx) for a
	// proxy FindOrCreate just inserted, and announces the new proxy on
	// config:changed. Call it once per created proxy, in the same
	// transaction, after the account id is known.
	AuditAutoCreate(ctx context.Context, tx pgx.Tx, proxyID, ownerID, accountID int64) error
}

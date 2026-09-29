package pluginsdk

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"os"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/egress"
)

// ErrHostNotReady is returned by Host methods before InitHost completed.
var ErrHostNotReady = errors.New("pluginsdk: host not initialised")

// HostInfo is what the host told the plugin in InitHost.
type HostInfo struct {
	NodeID         string
	BootID         string
	HostVersion    string
	HostAPIVersion int32
}

// Host is the plugin's view of the sub2api core. Every call is checked
// against the grants the administrator approved; calls without a grant fail
// with codes.PermissionDenied.
type Host interface {
	Info() HostInfo

	// Logger returns a slog.Logger that forwards records to the host log.
	Logger() *slog.Logger
	// Log sends one record to the host log.
	Log(ctx context.Context, level slog.Level, msg string, attrs map[string]string) error

	// KV is a Redis-backed, per-plugin namespaced store (grant "kv").
	KV() KV

	// DSN returns the restricted database DSN (grant "db.schema").
	DSN(ctx context.Context) (*DSNInfo, error)
	// DB returns a shared pgx pool for the plugin schema, created on first
	// use from DSN. When the egress tunnel is installed (strict network mode)
	// connections are dialled through it (DialFunc = egress.DialContext).
	DB(ctx context.Context) (*pgxpool.Pool, error)

	// AuthzCheck asks whether a console user holds a permission (plugin-local
	// key like "rules:manage" or a fully qualified key).
	AuthzCheck(ctx context.Context, userID int64, permission string) (bool, error)

	// LedgerCredit / LedgerDebit change a user's balance (grants
	// "ledger.credit" / "ledger.debit"), idempotent on IdempotencyKey.
	LedgerCredit(ctx context.Context, ch LedgerChange) (*LedgerResult, error)
	LedgerDebit(ctx context.Context, ch LedgerChange) (*LedgerResult, error)

	// Publish sends payload (<= 64 KiB) under topic (^[a-z0-9_.-]{1,64}$)
	// to this plugin's instances on every other live node, which receive
	// it through BroadcastHandler.OnBroadcast (grant "broadcast"). BEST
	// EFFORT: no acknowledgement, ordering or replay; the publishing node
	// does not receive its own message. A nil error only means the host
	// accepted the message. See BroadcastMux.
	Publish(ctx context.Context, topic string, payload []byte) error

	// ListAccounts returns one page of the accounts of THIS plugin's own
	// account types (grant "accounts.read"), ordered by id and never
	// carrying credentials. Pass the returned cursor to continue; "" means
	// there is no further page. Limit is capped by the host at 200.
	//
	// Use it in the plugin's own HTTP routes, where the host tells it only
	// who the caller is: on the gateway path the account arrives with the
	// request and this call is unnecessary.
	ListAccounts(ctx context.Context, q AccountQuery) (accounts []AccountSummary, next string, err error)
	// AccountCredentials returns one of THIS plugin's own accounts with its
	// decrypted credentials (grant "accounts.credentials" with scope
	// {"types":"own"}).
	//
	// EVERY call is written to the host's audit log, by design: reading a
	// credential without upstream traffic to justify it is exactly what an
	// administrator has to be able to review afterwards. Fetch on use, do not
	// cache the plaintext, and never persist it in the plugin's own schema.
	//
	// An account of another plugin's account type answers NOT_FOUND, the same
	// as an id that does not exist.
	AccountCredentials(ctx context.Context, accountID int64) (*AccountCredentials, error)

	// Client exposes the raw HostService client.
	Client() pluginv1.HostServiceClient
	// Egress exposes the raw EgressService client.
	Egress() pluginv1.EgressServiceClient
	// EgressInstalled reports whether the SDK routed the default network
	// stack through the egress tunnel.
	EgressInstalled() bool
}

// DSNInfo is the restricted database access handed out by the host.
type DSNInfo struct {
	DSN          string
	Schema       string
	RoleIsolated bool
}

// LedgerChange is a balance change request. Amount is a positive decimal
// string in USD with at most 8 decimals.
type LedgerChange struct {
	UserID         int64
	Amount         string
	IdempotencyKey string
	RefType        string
	RefID          string
	Note           string
}

// LedgerResult is the outcome of a ledger change.
type LedgerResult struct {
	LedgerID     int64
	BalanceAfter string
	Duplicate    bool
}

// AccountQuery selects one page of Host.ListAccounts.
type AccountQuery struct {
	// Type restricts the page to one of the plugin's account type ids
	// ("" = all of them).
	Type string
	// Cursor is "" for the first page, else the cursor of the previous one.
	Cursor string
	// Limit is the page size, capped by the host at 200 (0 = host default).
	Limit int
	// IncludeInactive also lists disabled/error accounts and accounts taken
	// out of scheduling. Default: only active, schedulable ones.
	IncludeInactive bool
}

// AccountSummary is account metadata without credentials.
type AccountSummary struct {
	ID   int64
	Name string
	Type string
	// Status is active, disabled or error.
	Status string
	// Enabled reports whether the account takes gateway traffic.
	Enabled bool
	// SettingsJSON holds the non-sensitive settings (base_url ...).
	SettingsJSON string
}

// AccountCredentials is one account with its decrypted credentials.
type AccountCredentials struct {
	AccountSummary
	// CredentialsJSON is the same JSON the plugin gets as
	// Account.credentials_json in BuildUpstreamRequest.
	CredentialsJSON string
}

// KV is the per-plugin key/value store.
type KV interface {
	Get(ctx context.Context, namespace, key string) (value []byte, found bool, err error)
	// Set stores value (<= 64 KiB); ttl 0 means no expiry.
	Set(ctx context.Context, namespace, key string, value []byte, ttl time.Duration) error
	Delete(ctx context.Context, namespace, key string) error
	// List returns keys with prefix; pass the returned cursor to continue,
	// "" means done. limit <= 500.
	List(ctx context.Context, namespace, prefix, cursor string, limit int) (keys []string, next string, err error)
}

// ---------------------------------------------------------------- implementation

type host struct {
	info      HostInfo
	client    pluginv1.HostServiceClient
	egress    pluginv1.EgressServiceClient
	installed bool
	logger    *slog.Logger
	poolSize  int32

	mu   sync.Mutex
	pool *pgxpool.Pool
}

func newHost(info HostInfo, c pluginv1.HostServiceClient, e pluginv1.EgressServiceClient, installed bool, poolSize int32) *host {
	h := &host{info: info, client: c, egress: e, installed: installed, poolSize: poolSize}
	h.logger = slog.New(&hostLogHandler{h: h, level: slog.LevelDebug})
	return h
}

func (h *host) Info() HostInfo                       { return h.info }
func (h *host) Logger() *slog.Logger                 { return h.logger }
func (h *host) KV() KV                               { return hostKV{h.client} }
func (h *host) Client() pluginv1.HostServiceClient   { return h.client }
func (h *host) Egress() pluginv1.EgressServiceClient { return h.egress }
func (h *host) EgressInstalled() bool                { return h.installed }

func (h *host) Log(ctx context.Context, level slog.Level, msg string, attrs map[string]string) error {
	_, err := h.client.Log(ctx, &pluginv1.LogRequest{Level: protoLevel(level), Message: msg, Attrs: attrs})
	return err
}

func protoLevel(l slog.Level) pluginv1.LogRequest_Level {
	switch {
	case l >= slog.LevelError:
		return pluginv1.LogRequest_LEVEL_ERROR
	case l >= slog.LevelWarn:
		return pluginv1.LogRequest_LEVEL_WARN
	case l >= slog.LevelInfo:
		return pluginv1.LogRequest_LEVEL_INFO
	default:
		return pluginv1.LogRequest_LEVEL_DEBUG
	}
}

func (h *host) DSN(ctx context.Context) (*DSNInfo, error) {
	r, err := h.client.GetDSN(ctx, &pluginv1.GetDSNRequest{})
	if err != nil {
		return nil, err
	}
	return &DSNInfo{DSN: r.GetDsn(), Schema: r.GetSchema(), RoleIsolated: r.GetRoleIsolated()}, nil
}

func (h *host) DB(ctx context.Context) (*pgxpool.Pool, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.pool != nil {
		return h.pool, nil
	}
	info, err := h.DSN(ctx)
	if err != nil {
		return nil, fmt.Errorf("pluginsdk: get dsn: %w", err)
	}
	cfg, err := pgxpool.ParseConfig(info.DSN)
	if err != nil {
		return nil, fmt.Errorf("pluginsdk: parse dsn: %w", err)
	}
	if h.poolSize > 0 {
		cfg.MaxConns = h.poolSize
	}
	if h.installed {
		// Let the host resolve the database host name: pass it through
		// unresolved and dial via the tunnel.
		cfg.ConnConfig.LookupFunc = func(_ context.Context, host string) ([]string, error) { return []string{host}, nil }
		cfg.ConnConfig.DialFunc = egress.DialContext
	} else {
		d := &net.Dialer{Timeout: 10 * time.Second, KeepAlive: 30 * time.Second}
		cfg.ConnConfig.DialFunc = d.DialContext
	}
	if info.Schema != "" {
		if _, ok := cfg.ConnConfig.RuntimeParams["search_path"]; !ok {
			cfg.ConnConfig.RuntimeParams["search_path"] = info.Schema
		}
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("pluginsdk: open pool: %w", err)
	}
	h.pool = pool
	return pool, nil
}

func (h *host) closePool() {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.pool != nil {
		h.pool.Close()
		h.pool = nil
	}
}

func (h *host) AuthzCheck(ctx context.Context, userID int64, permission string) (bool, error) {
	r, err := h.client.AuthzCheck(ctx, &pluginv1.AuthzCheckRequest{UserId: userID, Permission: permission})
	if err != nil {
		return false, err
	}
	return r.GetAllowed(), nil
}

func (h *host) LedgerCredit(ctx context.Context, ch LedgerChange) (*LedgerResult, error) {
	return ledgerResult(h.client.LedgerCredit(ctx, ledgerReq(ch)))
}

func (h *host) LedgerDebit(ctx context.Context, ch LedgerChange) (*LedgerResult, error) {
	return ledgerResult(h.client.LedgerDebit(ctx, ledgerReq(ch)))
}

func (h *host) Publish(ctx context.Context, topic string, payload []byte) error {
	return publish(ctx, h.client, topic, payload)
}

func (h *host) ListAccounts(ctx context.Context, q AccountQuery) ([]AccountSummary, string, error) {
	r, err := h.client.ListAccounts(ctx, &pluginv1.ListAccountsRequest{
		Type: q.Type, Cursor: q.Cursor, Limit: int32(q.Limit), IncludeInactive: q.IncludeInactive,
	})
	if err != nil {
		return nil, "", err
	}
	out := make([]AccountSummary, 0, len(r.GetAccounts()))
	for _, a := range r.GetAccounts() {
		out = append(out, accountSummary(a))
	}
	return out, r.GetNextCursor(), nil
}

func (h *host) AccountCredentials(ctx context.Context, accountID int64) (*AccountCredentials, error) {
	r, err := h.client.GetAccountCredentials(ctx, &pluginv1.GetAccountCredentialsRequest{AccountId: accountID})
	if err != nil {
		return nil, err
	}
	return &AccountCredentials{AccountSummary: accountSummary(r.GetAccount()), CredentialsJSON: r.GetCredentialsJson()}, nil
}

func accountSummary(a *pluginv1.AccountSummary) AccountSummary {
	return AccountSummary{ID: a.GetId(), Name: a.GetName(), Type: a.GetType(), Status: a.GetStatus(),
		Enabled: a.GetEnabled(), SettingsJSON: a.GetSettingsJson()}
}

func ledgerReq(ch LedgerChange) *pluginv1.LedgerChangeRequest {
	return &pluginv1.LedgerChangeRequest{
		UserId: ch.UserID, Amount: ch.Amount, IdempotencyKey: ch.IdempotencyKey,
		RefType: ch.RefType, RefId: ch.RefID, Note: ch.Note,
	}
}

func ledgerResult(r *pluginv1.LedgerChangeResponse, err error) (*LedgerResult, error) {
	if err != nil {
		return nil, err
	}
	return &LedgerResult{LedgerID: r.GetLedgerId(), BalanceAfter: r.GetBalanceAfter(), Duplicate: r.GetDuplicate()}, nil
}

type hostKV struct{ c pluginv1.HostServiceClient }

func (k hostKV) Get(ctx context.Context, ns, key string) ([]byte, bool, error) {
	r, err := k.c.KVGet(ctx, &pluginv1.KVGetRequest{Namespace: ns, Key: key})
	if err != nil {
		return nil, false, err
	}
	return r.GetValue(), r.GetFound(), nil
}

func (k hostKV) Set(ctx context.Context, ns, key string, value []byte, ttl time.Duration) error {
	_, err := k.c.KVSet(ctx, &pluginv1.KVSetRequest{Namespace: ns, Key: key, Value: value, TtlSeconds: int64(ttl / time.Second)})
	return err
}

func (k hostKV) Delete(ctx context.Context, ns, key string) error {
	_, err := k.c.KVDelete(ctx, &pluginv1.KVDeleteRequest{Namespace: ns, Key: key})
	return err
}

func (k hostKV) List(ctx context.Context, ns, prefix, cursor string, limit int) ([]string, string, error) {
	r, err := k.c.KVList(ctx, &pluginv1.KVListRequest{Namespace: ns, Prefix: prefix, Cursor: cursor, Limit: int32(limit)})
	if err != nil {
		return nil, "", err
	}
	return r.GetKeys(), r.GetNextCursor(), nil
}

// ---------------------------------------------------------------- slog bridge

type hostLogHandler struct {
	h      *host
	level  slog.Level
	attrs  []slog.Attr
	groups []string
}

func (l *hostLogHandler) Enabled(_ context.Context, lv slog.Level) bool { return lv >= l.level }

func (l *hostLogHandler) Handle(ctx context.Context, r slog.Record) error {
	attrs := make(map[string]string, r.NumAttrs()+len(l.attrs))
	prefix := ""
	for _, g := range l.groups {
		prefix += g + "."
	}
	for _, a := range l.attrs {
		addAttr(attrs, "", a)
	}
	r.Attrs(func(a slog.Attr) bool {
		addAttr(attrs, prefix, a)
		return true
	})
	// Logging must not block plugin work for long; detach from caller
	// cancellation but bound the call.
	cctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
	defer cancel()
	if err := l.h.Log(cctx, r.Level, r.Message, attrs); err != nil {
		// Fall back to stderr, which go-plugin forwards to the host log.
		fmt.Fprintf(os.Stderr, "%s %s %v\n", r.Level, r.Message, attrs)
	}
	return nil
}

func addAttr(dst map[string]string, prefix string, a slog.Attr) {
	a.Value = a.Value.Resolve()
	if a.Value.Kind() == slog.KindGroup {
		p := prefix
		if a.Key != "" {
			p += a.Key + "."
		}
		for _, sub := range a.Value.Group() {
			addAttr(dst, p, sub)
		}
		return
	}
	if a.Key == "" {
		return
	}
	dst[prefix+a.Key] = a.Value.String()
}

func (l *hostLogHandler) WithAttrs(as []slog.Attr) slog.Handler {
	n := *l
	prefix := ""
	for _, g := range l.groups {
		prefix += g + "."
	}
	n.attrs = append(append([]slog.Attr{}, l.attrs...), prefixAttrs(prefix, as)...)
	return &n
}

func prefixAttrs(prefix string, as []slog.Attr) []slog.Attr {
	if prefix == "" {
		return as
	}
	out := make([]slog.Attr, len(as))
	for i, a := range as {
		out[i] = slog.Attr{Key: prefix + a.Key, Value: a.Value}
	}
	return out
}

func (l *hostLogHandler) WithGroup(name string) slog.Handler {
	if name == "" {
		return l
	}
	n := *l
	n.groups = append(append([]string{}, l.groups...), name)
	return &n
}

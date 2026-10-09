package grpcruntime

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Limits enforced by HostService.
const (
	KVMaxValueBytes  = 64 << 10
	KVMaxKeyBytes    = 512
	KVMaxNamespace   = 64
	KVMaxListLimit   = 500
	LogMaxMessage    = 8 << 10
	LogMaxAttrs      = 32
	LedgerMaxIdemKey = 100
	// AccountsMaxListLimit caps one ListAccounts page; 0 or a larger value
	// uses AccountsDefaultListLimit.
	AccountsMaxListLimit     = 200
	AccountsDefaultListLimit = 100
)

// hostServer serves HostService to exactly one plugin instance, so the
// calling plugin is known by construction.
type hostServer struct {
	pluginv1.UnimplementedHostServiceServer
	i *Instance
	p *proc // the broker belongs to this process, never to its replacement
}

func (h *hostServer) key() string { return h.i.pkg.Key }

func (h *hostServer) require(ctx context.Context, permission string) error {
	if !h.i.Grants().Has(permission) {
		return status.Errorf(codes.PermissionDenied, "plugin %s has no %q grant", h.key(), permission)
	}
	// Pub/sub accelerates local convergence but cannot authorize calls made
	// after an emergency revocation has committed in PG. Also reject a stale
	// broader scope until the local settings have refreshed.
	if db := h.i.rt.o.DB; db != nil {
		var allowed bool
		err := db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM plugin_permission_grants WHERE plugin_key=$1 AND permission=$2 AND status='granted' AND scope=$3::jsonb)`, h.key(), permission, []byte(h.i.Grants()[permission])).Scan(&allowed)
		if err != nil {
			return status.Error(codes.Unavailable, "cannot verify current plugin grant")
		}
		if !allowed {
			return status.Errorf(codes.PermissionDenied, "plugin %s grant %q was revoked or changed", h.key(), permission)
		}
	}
	return nil
}

// ------------------------------------------------------------------ log

func (h *hostServer) Log(ctx context.Context, in *pluginv1.LogRequest) (*pluginv1.LogResponse, error) {
	lvl := slog.LevelInfo
	switch in.GetLevel() {
	case pluginv1.LogRequest_LEVEL_DEBUG:
		lvl = slog.LevelDebug
	case pluginv1.LogRequest_LEVEL_WARN:
		lvl = slog.LevelWarn
	case pluginv1.LogRequest_LEVEL_ERROR:
		lvl = slog.LevelError
	}
	msg := in.GetMessage()
	if len(msg) > LogMaxMessage {
		msg = msg[:LogMaxMessage] + "...(truncated)"
	}
	attrs := make([]slog.Attr, 0, len(in.GetAttrs())+1)
	attrs = append(attrs, slog.String("source", "plugin"))
	n := 0
	for k, v := range in.GetAttrs() {
		if n >= LogMaxAttrs {
			break
		}
		n++
		attrs = append(attrs, slog.String("p."+k, v))
	}
	h.i.log.LogAttrs(ctx, lvl, msg, attrs...)
	return &pluginv1.LogResponse{}, nil
}

// ------------------------------------------------------------------ kv

func (h *hostServer) kvKey(ns, k string) (string, error) {
	if err := validNamespace(ns); err != nil {
		return "", err
	}
	if k == "" || len(k) > KVMaxKeyBytes {
		return "", status.Error(codes.InvalidArgument, "key must be 1..512 bytes")
	}
	return "plugin:kv:" + h.key() + ":" + ns + ":" + k, nil
}

func validNamespace(ns string) error {
	if ns == "" || len(ns) > KVMaxNamespace || strings.ContainsAny(ns, ":*?[]\\") {
		return status.Error(codes.InvalidArgument, `namespace must be 1..64 bytes without ':*?[]\'`)
	}
	return nil
}

func (h *hostServer) KVGet(ctx context.Context, in *pluginv1.KVGetRequest) (*pluginv1.KVGetResponse, error) {
	if err := h.require(ctx, "kv"); err != nil {
		return nil, err
	}
	key, err := h.kvKey(in.GetNamespace(), in.GetKey())
	if err != nil {
		return nil, err
	}
	v, err := h.i.rt.o.Redis.Get(ctx, key).Bytes()
	if errors.Is(err, redis.Nil) {
		return &pluginv1.KVGetResponse{}, nil
	}
	if err != nil {
		return nil, status.Error(codes.Unavailable, "kv unavailable")
	}
	return &pluginv1.KVGetResponse{Found: true, Value: v}, nil
}

func (h *hostServer) KVSet(ctx context.Context, in *pluginv1.KVSetRequest) (*pluginv1.KVSetResponse, error) {
	if err := h.require(ctx, "kv"); err != nil {
		return nil, err
	}
	key, err := h.kvKey(in.GetNamespace(), in.GetKey())
	if err != nil {
		return nil, err
	}
	if len(in.GetValue()) > KVMaxValueBytes {
		return nil, status.Errorf(codes.InvalidArgument, "value exceeds %d bytes", KVMaxValueBytes)
	}
	if in.GetTtlSeconds() < 0 {
		return nil, status.Error(codes.InvalidArgument, "ttl_seconds must be >= 0")
	}
	if err := h.i.rt.o.Redis.Set(ctx, key, in.GetValue(), time.Duration(in.GetTtlSeconds())*time.Second).Err(); err != nil {
		return nil, status.Error(codes.Unavailable, "kv unavailable")
	}
	return &pluginv1.KVSetResponse{}, nil
}

func (h *hostServer) KVDelete(ctx context.Context, in *pluginv1.KVDeleteRequest) (*pluginv1.KVDeleteResponse, error) {
	if err := h.require(ctx, "kv"); err != nil {
		return nil, err
	}
	key, err := h.kvKey(in.GetNamespace(), in.GetKey())
	if err != nil {
		return nil, err
	}
	if err := h.i.rt.o.Redis.Del(ctx, key).Err(); err != nil {
		return nil, status.Error(codes.Unavailable, "kv unavailable")
	}
	return &pluginv1.KVDeleteResponse{}, nil
}

func (h *hostServer) KVList(ctx context.Context, in *pluginv1.KVListRequest) (*pluginv1.KVListResponse, error) {
	if err := h.require(ctx, "kv"); err != nil {
		return nil, err
	}
	if err := validNamespace(in.GetNamespace()); err != nil {
		return nil, err
	}
	limit := int(in.GetLimit())
	if limit <= 0 || limit > KVMaxListLimit {
		limit = KVMaxListLimit
	}
	var cursor uint64
	if c := in.GetCursor(); c != "" {
		if _, err := fmt.Sscan(c, &cursor); err != nil {
			return nil, status.Error(codes.InvalidArgument, "invalid cursor")
		}
	}
	base := "plugin:kv:" + h.key() + ":" + in.GetNamespace() + ":"
	match := globEscape(base) + globEscape(in.GetPrefix()) + "*"
	out := &pluginv1.KVListResponse{}
	for {
		keys, next, err := h.i.rt.o.Redis.Scan(ctx, cursor, match, int64(limit)).Result()
		if err != nil {
			return nil, status.Error(codes.Unavailable, "kv unavailable")
		}
		for _, k := range keys {
			out.Keys = append(out.Keys, strings.TrimPrefix(k, base))
		}
		cursor = next
		if cursor == 0 || len(out.Keys) >= limit {
			break
		}
	}
	if cursor != 0 {
		out.NextCursor = fmt.Sprint(cursor)
	}
	return out, nil
}

func globEscape(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch r {
		case '*', '?', '[', ']', '\\':
			b.WriteByte('\\')
		}
		b.WriteRune(r)
	}
	return b.String()
}

// ------------------------------------------------------------------ db

func (h *hostServer) GetDSN(ctx context.Context, _ *pluginv1.GetDSNRequest) (*pluginv1.GetDSNResponse, error) {
	if err := h.require(ctx, "db.schema"); err != nil {
		return nil, err
	}
	if h.i.pkg.Manifest.Database == nil {
		return nil, status.Error(codes.FailedPrecondition, "manifest declares no database")
	}
	if h.i.rt.o.Schemas == nil {
		return nil, status.Error(codes.Unavailable, "database schemas unavailable")
	}
	dsn, st, err := h.i.rt.o.Schemas.DSN(ctx, h.key())
	if err != nil {
		h.i.log.Error("GetDSN failed", "err", err)
		return nil, status.Error(codes.Unavailable, "database schema unavailable")
	}
	return &pluginv1.GetDSNResponse{Dsn: dsn, Schema: st.Schema, RoleIsolated: st.RoleIsolated}, nil
}

// ------------------------------------------------------------------ authz

func (h *hostServer) AuthzCheck(ctx context.Context, in *pluginv1.AuthzCheckRequest) (*pluginv1.AuthzCheckResponse, error) {
	if in.GetUserId() <= 0 || in.GetPermission() == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id and permission are required")
	}
	if h.i.rt.o.Authorizer == nil {
		return nil, status.Error(codes.Unavailable, "authorizer unavailable")
	}
	ok, err := h.i.rt.o.Authorizer.Can(ctx, in.GetUserId(), h.qualify(in.GetPermission()))
	if err != nil {
		return nil, toStatus(err)
	}
	return &pluginv1.AuthzCheckResponse{Allowed: ok}, nil
}

// qualify turns a plugin-local permission key into "plugin.<key>:<local>".
// Keys already starting with "plugin." and keys the plugin does not declare
// (core permissions such as "user:read") are used as given.
func (h *hostServer) qualify(perm string) string {
	if strings.HasPrefix(perm, "plugin.") {
		return perm
	}
	for _, up := range h.i.pkg.Manifest.UserPermissions {
		if up.Key == perm {
			return "plugin." + h.key() + ":" + perm
		}
	}
	return perm
}

// ------------------------------------------------------------------ ledger

func (h *hostServer) LedgerCredit(ctx context.Context, in *pluginv1.LedgerChangeRequest) (*pluginv1.LedgerChangeResponse, error) {
	return h.ledger(ctx, in, true)
}

func (h *hostServer) LedgerDebit(ctx context.Context, in *pluginv1.LedgerChangeRequest) (*pluginv1.LedgerChangeResponse, error) {
	return h.ledger(ctx, in, false)
}

func (h *hostServer) ledger(ctx context.Context, in *pluginv1.LedgerChangeRequest, credit bool) (*pluginv1.LedgerChangeResponse, error) {
	perm, kind, dir := "ledger.debit", "plugin_debit", "debit"
	if credit {
		perm, kind, dir = "ledger.credit", "plugin_credit", "credit"
	}
	if err := h.require(ctx, perm); err != nil {
		return nil, err
	}
	if h.i.rt.o.Ledger == nil {
		return nil, status.Error(codes.Unavailable, "ledger unavailable")
	}
	if in.GetUserId() <= 0 {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}
	idem := strings.TrimSpace(in.GetIdempotencyKey())
	if idem == "" || len(idem) > LedgerMaxIdemKey {
		return nil, status.Errorf(codes.InvalidArgument, "idempotency_key is required (<= %d bytes)", LedgerMaxIdemKey)
	}
	amount, err := decimal.NewFromString(in.GetAmount())
	if err != nil || !amount.IsPositive() || !amount.Equal(amount.Round(8)) {
		return nil, status.Error(codes.InvalidArgument, "amount must be a positive decimal with at most 8 decimals")
	}
	scope := h.i.Grants().Scope(perm)
	if max, ok := scopeDecimal(scope, "maxPerTx"); ok && amount.GreaterThan(max) {
		return nil, status.Errorf(codes.PermissionDenied, "amount exceeds the approved maxPerTx (%s)", max.String())
	}
	// Daily cap: reserve in Redis first, release on failure or duplicate.
	var release func()
	if max, ok := scopeDecimal(scope, "maxPerDay"); ok {
		units := amount.Shift(8).IntPart()
		day := time.Now().UTC().Format("20060102")
		key := "plugin:ledger:" + h.key() + ":" + dir + ":" + day
		rdb := h.i.rt.o.Redis
		total, err := rdb.IncrBy(ctx, key, units).Result()
		if err != nil {
			return nil, status.Error(codes.Unavailable, "ledger limiter unavailable")
		}
		rdb.Expire(ctx, key, 48*time.Hour)
		release = func() { rdb.DecrBy(context.WithoutCancel(ctx), key, units) }
		if total > max.Shift(8).IntPart() {
			release()
			return nil, status.Errorf(codes.PermissionDenied, "daily %s limit (%s) exceeded", dir, max.String())
		}
	}
	refType := in.GetRefType()
	if refType == "" {
		refType = "plugin"
	}
	res, err := h.i.rt.o.Ledger.Apply(ctx, core.LedgerChange{
		UserID:         in.GetUserId(),
		Amount:         amount,
		Credit:         credit,
		Kind:           kind,
		RefType:        refType,
		RefID:          in.GetRefId(),
		IdempotencyKey: "plugin:" + h.key() + ":" + idem,
		PluginKey:      h.key(),
		Note:           in.GetNote(),
	})
	if err != nil {
		if release != nil {
			release()
		}
		return nil, toStatus(err)
	}
	if res.Duplicate && release != nil {
		release()
	}
	return &pluginv1.LedgerChangeResponse{
		LedgerId:     res.LedgerID,
		BalanceAfter: res.BalanceAfter.StringFixed(8),
		Duplicate:    res.Duplicate,
	}, nil
}

// ------------------------------------------------------------------ accounts

// accountsScopeOwn is the only approved scope of accounts.credentials: the
// plugin's own account types. Validate rejects any other scope at install
// time; this re-checks it at call time so a grant row edited or migrated into
// something else cannot silently widen the call.
func (h *hostServer) requireOwnCredentials(ctx context.Context) error {
	if err := h.require(ctx, "accounts.credentials"); err != nil {
		return err
	}
	if v, _ := h.i.Grants().Scope("accounts.credentials")["types"].(string); v != "own" {
		return status.Errorf(codes.PermissionDenied,
			`plugin %s: accounts.credentials scope must be {"types":"own"}`, h.key())
	}
	return nil
}

// ListAccounts returns the metadata of the accounts of this plugin's own
// account types. The response has no credential field: this call is authorised
// by accounts.read, which is not a credential grant.
func (h *hostServer) ListAccounts(ctx context.Context, in *pluginv1.ListAccountsRequest) (*pluginv1.ListAccountsResponse, error) {
	if err := h.require(ctx, "accounts.read"); err != nil {
		return nil, err
	}
	if h.i.rt.o.Accounts == nil {
		return nil, status.Error(codes.Unavailable, "accounts unavailable")
	}
	limit := int(in.GetLimit())
	if limit <= 0 || limit > AccountsMaxListLimit {
		limit = AccountsDefaultListLimit
	}
	var after int64
	if c := in.GetCursor(); c != "" {
		// strconv, not fmt.Sscan: Sscan stops at the first byte it cannot use,
		// so "1;drop" would parse as 1 without an error.
		n, err := strconv.ParseInt(c, 10, 64)
		if err != nil || n < 0 {
			return nil, status.Error(codes.InvalidArgument, "invalid cursor")
		}
		after = n
	}
	rows, err := h.i.rt.o.Accounts.ListPluginAccounts(ctx, h.key(), core.PluginAccountQuery{
		Type: in.GetType(), AfterID: after, Limit: limit, IncludeInactive: in.GetIncludeInactive(),
	})
	if err != nil {
		return nil, toStatus(err)
	}
	out := &pluginv1.ListAccountsResponse{Accounts: make([]*pluginv1.AccountSummary, 0, len(rows))}
	for _, r := range rows {
		out.Accounts = append(out.Accounts, accountSummary(r))
	}
	// A full page may or may not be the last one; the next call settles it.
	if len(rows) == limit {
		out.NextCursor = fmt.Sprint(rows[len(rows)-1].ID)
	}
	return out, nil
}

// GetAccountCredentials returns the decrypted credentials of one account of
// this plugin's own account types. The account module filters by plugin key in
// SQL and writes the audit row; an account of another plugin is NOT_FOUND, not
// PERMISSION_DENIED, so this call cannot be used to probe which ids exist.
func (h *hostServer) GetAccountCredentials(ctx context.Context, in *pluginv1.GetAccountCredentialsRequest) (*pluginv1.GetAccountCredentialsResponse, error) {
	if err := h.requireOwnCredentials(ctx); err != nil {
		return nil, err
	}
	if h.i.rt.o.Accounts == nil {
		return nil, status.Error(codes.Unavailable, "accounts unavailable")
	}
	if in.GetAccountId() <= 0 {
		return nil, status.Error(codes.InvalidArgument, "account_id is required")
	}
	a, err := h.i.rt.o.Accounts.ReadPluginAccountCredentials(ctx, h.key(), in.GetAccountId())
	if err != nil {
		return nil, toStatus(err)
	}
	return &pluginv1.GetAccountCredentialsResponse{
		Account:         accountSummary(a.PluginAccountSummary),
		CredentialsJson: string(a.Credentials),
	}, nil
}

func accountSummary(a core.PluginAccountSummary) *pluginv1.AccountSummary {
	settings := string(a.Settings)
	if settings == "" {
		settings = "{}"
	}
	return &pluginv1.AccountSummary{
		Id: a.ID, Name: a.Name, Type: a.Type, Status: a.Status, Enabled: a.Schedulable, SettingsJson: settings,
	}
}

func scopeDecimal(scope map[string]any, field string) (decimal.Decimal, bool) {
	v, ok := scope[field]
	if !ok || v == nil {
		return decimal.Decimal{}, false
	}
	d, err := decimal.NewFromString(fmt.Sprint(v))
	if err != nil {
		// A malformed limit must not mean "unlimited".
		return decimal.Zero, true
	}
	return d, true
}

// toStatus maps core errors to gRPC status errors for plugins.
func toStatus(err error) error {
	e := core.AsError(err)
	code := codes.Internal
	switch e.Code {
	case "invalid_argument":
		code = codes.InvalidArgument
	case "unauthenticated":
		code = codes.Unauthenticated
	case "permission_denied":
		code = codes.PermissionDenied
	case "not_found":
		code = codes.NotFound
	case "conflict":
		code = codes.AlreadyExists
	case "insufficient_balance":
		code = codes.FailedPrecondition
	case "rate_limited":
		code = codes.ResourceExhausted
	case "unavailable", "plugin_unavailable", "no_available_account":
		code = codes.Unavailable
	}
	msg := e.Message
	if code == codes.Internal {
		msg = "internal error"
	}
	return status.Error(code, e.Code+": "+msg)
}

var _ pluginv1.HostServiceServer = (*hostServer)(nil)

// PurgePluginKV deletes every KV entry of pluginKey (uninstall or key release
// with purge, install.PluginKVPurger).
func (r *Runtime) PurgePluginKV(ctx context.Context, pluginKey string) (int, error) {
	match := globEscape("plugin:kv:"+pluginKey+":") + "*"
	deleted := 0
	var cursor uint64
	for {
		keys, next, err := r.o.Redis.Scan(ctx, cursor, match, 500).Result()
		if err != nil {
			return deleted, err
		}
		if len(keys) > 0 {
			n, err := r.o.Redis.Del(ctx, keys...).Result()
			deleted += int(n)
			if err != nil {
				return deleted, err
			}
		}
		if cursor = next; cursor == 0 {
			return deleted, nil
		}
	}
}

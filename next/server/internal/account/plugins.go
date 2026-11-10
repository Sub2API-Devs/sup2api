package account

import (
	"cmp"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// core.PluginAccountReader: the accounts a plugin may read about its own
// account types (HostService.ListAccounts / GetAccountCredentials).
//
// The security boundary of both methods is one SQL predicate: plugin_key =
// $pluginKey. accounts.plugin_key is the plugin that declared the account
// type, written when the account was created and never rewritten, and it is
// also the AES-GCM associated data of the stored credentials (aad()), so a row
// belonging to another plugin could not even be decrypted here. Keeping the
// predicate in the statement rather than in a post-filter means there is no
// code path in which a row of another plugin is loaded and then discarded.
var (
	_ core.PluginAccountReader    = (*Service)(nil)
	_ core.PluginAccountRequester = (*Service)(nil)
)

// PluginAccountsMaxLimit caps one ListPluginAccounts page. A plugin with many
// accounts must page; there is no "give me everything" call.
const PluginAccountsMaxLimit = 200

// PluginAccountsDefaultLimit is used for Limit <= 0.
const PluginAccountsDefaultLimit = 100

// AuditPluginCredentialsRead is the audit_logs action of one
// GetAccountCredentials call.
const AuditPluginCredentialsRead = "plugin.account.credentials.read"

// AuditPluginAccountRequest is the audit_logs action of one
// SendAccountRequest call.
const AuditPluginAccountRequest = "plugin.account_request"

// ListPluginAccounts returns one page of the accounts of pluginKey's own
// account types, ordered by id. It selects no credential column at all, so no
// later mistake in this file can put one in the result.
func (s *Service) ListPluginAccounts(ctx context.Context, pluginKey string, q core.PluginAccountQuery) ([]core.PluginAccountSummary, error) {
	if pluginKey == "" {
		return nil, core.ErrInvalidArgument.WithMessage("plugin key is required")
	}
	limit := q.Limit
	if limit <= 0 || limit > PluginAccountsMaxLimit {
		limit = PluginAccountsDefaultLimit
	}
	sql := `SELECT a.id, a.name, a.type, a.status, a.schedulable, a.settings
		FROM accounts a
		WHERE a.plugin_key = $1 AND a.deleted_at IS NULL AND a.id > $2
		  AND ($3 = '' OR a.type = $3)`
	if !q.IncludeInactive {
		sql += ` AND a.status = 'active' AND a.schedulable`
	}
	sql += ` ORDER BY a.id LIMIT $4`
	rows, err := s.d.DB.Pool.Query(ctx, sql, pluginKey, q.AfterID, q.Type, limit)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (core.PluginAccountSummary, error) {
		var a core.PluginAccountSummary
		var settings []byte
		if err := r.Scan(&a.ID, &a.Name, &a.Type, &a.Status, &a.Schedulable, &settings); err != nil {
			return a, err
		}
		a.Settings = settingsOrEmpty(settings)
		return a, nil
	})
}

// ReadPluginAccountCredentials returns one account of pluginKey's own account
// types with its decrypted credentials, after writing the audit row.
//
// Order matters: the audit row is committed before the plaintext leaves this
// function. An audit failure is a call failure - the record of "this plugin
// read this credential at this time" is the reason the pull-style access is
// allowed at all, so handing out the secret without it would quietly remove
// the condition the capability was granted under.
func (s *Service) ReadPluginAccountCredentials(ctx context.Context, pluginKey string, id int64) (*core.PluginAccountCredentials, error) {
	if pluginKey == "" {
		return nil, core.ErrInvalidArgument.WithMessage("plugin key is required")
	}
	var (
		out      core.PluginAccountCredentials
		enc      []byte
		settings []byte
	)
	err := s.d.DB.Pool.QueryRow(ctx, `SELECT a.id, a.name, a.type, a.status, a.schedulable, a.settings, a.credentials_enc
		FROM accounts a
		WHERE a.id = $1 AND a.plugin_key = $2 AND a.deleted_at IS NULL`, id, pluginKey).
		Scan(&out.ID, &out.Name, &out.Type, &out.Status, &out.Schedulable, &settings, &enc)
	if store.IsNoRows(err) {
		// Deliberately the same answer for "no such account" and "an account
		// of another plugin's account type": a distinguishable error would
		// turn this call into an account-id oracle.
		return nil, notFound(ctx)
	}
	if err != nil {
		return nil, err
	}
	out.Settings = settingsOrEmpty(settings)
	plain, err := s.decrypt(pluginKey, enc)
	if err != nil {
		return nil, err
	}
	if err := audit.Audit(ctx, s.d.DB.Pool, 0, AuditPluginCredentialsRead, "account", itoa(id), map[string]any{
		// No console user is in this chain: the plugin process asks the host
		// directly, so the actor is the plugin, recorded here.
		"plugin_key":   pluginKey,
		"account_type": out.Type,
		"account_name": out.Name,
		"via":          "host.GetAccountCredentials",
	}); err != nil {
		return nil, fmt.Errorf("audit plugin credential read: %w", err)
	}
	out.Credentials = json.RawMessage(plain)
	return &out, nil
}

// SendPluginAccountRequest sends one request a plugin described for one
// account of pluginKey's own account types through that account's proxy, as
// the quota and refresh requests are sent (sendPluginCall), except that a
// redirect is answered as it is. It is bounded by refreshTimeout.
//
// Unlike a credential read, the audit row is written after the request: it
// records the answer's status, and nothing secret is handed out here that the
// plugin did not already hold, so an audit failure is logged and the answer
// still returned. The row names the method, host and path only - never the
// query, the headers or a body, which carry the plugin's credentials.
func (s *Service) SendPluginAccountRequest(ctx context.Context, pluginKey string, in *pluginv1.SendAccountRequestRequest) (*pluginv1.ExecutionHTTPResponse, error) {
	if pluginKey == "" {
		return nil, core.ErrInvalidArgument.WithMessage("plugin key is required")
	}
	id := in.GetAccountId()
	var proxyID *int64
	err := s.d.DB.Pool.QueryRow(ctx, `SELECT a.proxy_id FROM accounts a
		WHERE a.id = $1 AND a.plugin_key = $2 AND a.deleted_at IS NULL`, id, pluginKey).Scan(&proxyID)
	if store.IsNoRows(err) {
		// The same answer as for a missing id (ReadPluginAccountCredentials).
		return nil, notFound(ctx)
	}
	if err != nil {
		return nil, err
	}
	method := cmp.Or(strings.ToUpper(in.GetMethod()), http.MethodGet)
	sendCtx, cancel := context.WithTimeout(ctx, refreshTimeout)
	defer cancel()
	ans := s.sendPluginCall(sendCtx, pluginCall{what: "account request", method: method, url: in.GetUrl(),
		headers: in.GetHeaders(), body: in.GetBody(), noRedirects: true}, proxyID)
	detail := map[string]any{"plugin_key": pluginKey, "method": method, "status": ans.status, "via": "host.SendAccountRequest"}
	if u, err := url.Parse(in.GetUrl()); err == nil {
		detail["host"], detail["path"] = u.Host, u.Path
	}
	if err := audit.Audit(context.WithoutCancel(ctx), s.d.DB.Pool, 0, AuditPluginAccountRequest, "account", itoa(id), detail); err != nil {
		slog.WarnContext(ctx, "account: audit plugin account request", "plugin", pluginKey, "account", id, "err", err)
	}
	return &pluginv1.ExecutionHTTPResponse{Status: ans.status, Headers: ans.headers, Body: ans.body,
		TransportError: ans.transportError, Truncated: ans.truncated}, nil
}

func settingsOrEmpty(b []byte) json.RawMessage {
	if len(b) == 0 {
		return json.RawMessage("{}")
	}
	return json.RawMessage(b)
}

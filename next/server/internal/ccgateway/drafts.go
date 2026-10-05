package ccgateway

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// Draft runtimes (CONTRACTS §49.9): the account editor starts a runtime
// before the account exists, authorizes Claude Code in it, and POST
// /accounts adopts it. A draft is only visible to its creator unless the
// caller holds settings:manage.

// draftKeys are the permissions of the draft endpoints. account:own:create
// is accepted besides the contract's settings:manage / account:create:
// own-level users may create accounts (POST /accounts), so they must be
// able to prepare the runtime of a Claude Code account too.
var draftKeys = []string{"settings:manage", "account:create", "account:own:create"}

// draftUseKeys are the permissions of the endpoints addressing one draft:
// besides draftKeys, whoever may re-authorize an account (account:update,
// account:own:update, §49.17) drives the re-authorization draft it started.
// Visibility stays the creator or settings:manage either way.
var draftUseKeys = append(append([]string{}, draftKeys...), "account:update", "account:own:update")

func (s *Service) registerDraftRoutes(r *httpapi.Router) {
	r.PermAny("POST", "/system/ccgateway/drafts", s.draftCreate, draftKeys...)
	r.PermAny("PUT", "/system/ccgateway/drafts/:key", s.draftUpdate, draftUseKeys...)
	r.PermAny("DELETE", "/system/ccgateway/drafts/:key", s.draftDelete, draftUseKeys...)
	r.PermAny("GET", "/system/ccgateway/drafts/:key/:action", s.draftAction, draftUseKeys...)
	r.PermAny("POST", "/system/ccgateway/drafts/:key/:action", s.draftAction, draftUseKeys...)
}

func newDraftKey() string {
	var b [8]byte
	if _, e := rand.Read(b[:]); e != nil {
		panic(e) // crypto/rand never fails on supported platforms
	}
	return "d" + hex.EncodeToString(b[:])
}

// draftScope is nil for settings administrators (every draft), otherwise
// the caller id (only drafts it created).
func draftScope(ctx context.Context) *int64 {
	return core.OwnerScope(ctx, "settings:manage")
}

func draftNotFound(base *core.Error) *core.Error { return reasonError(base, "draft_not_found") }

// Draft kinds of touchDraftOf: every open draft, or only the drafts of new
// accounts (for_account NULL); a positive value is the account whose
// re-authorization draft is wanted (§49.17).
const (
	anyDraft     int64 = -1
	accountDraft int64 = 0
)

// touchDraft marks an open draft the caller may see as used (last_seen_at)
// and reports whether it exists. Adopted drafts are accounts now and
// retired runtimes are gone for the API: not found.
func (s *Service) touchDraft(ctx context.Context, key string, scope *int64) (bool, error) {
	return s.touchDraftOf(ctx, key, scope, anyDraft)
}

// touchDraftOf is touchDraft restricted to one kind of draft (anyDraft,
// accountDraft or an account id).
func (s *Service) touchDraftOf(ctx context.Context, key string, scope *int64, kind int64) (bool, error) {
	if !isDraftKey(key) {
		return false, nil
	}
	tag, e := s.DB.Pool.Exec(ctx, `UPDATE ccgateway_runtimes SET last_seen_at=now()
		WHERE key=$1 AND account_id IS NULL AND retired_at IS NULL AND ($2::bigint IS NULL OR created_by=$2)
		AND ($3::bigint = -1 OR COALESCE(for_account, 0) = $3)`, key, scope, kind)
	if e != nil {
		return false, e
	}
	return tag.RowsAffected() == 1, nil
}

// canProxies is the proxy range of a draft caller, the account module's
// rule for POST /accounts (proxyRangeFor "account:create", CONTRACTS
// §21.4): account:create may use every proxy; otherwise proxy:read sees
// every proxy, proxy:own:read / proxy:own:manage the caller's own, anything
// else none.
func (s *Service) canProxies(ctx context.Context) (scope *int64, none bool) {
	if core.OwnerScope(ctx, "account:create") == nil {
		return nil, false
	}
	uid, _ := core.UserID(ctx)
	can := func(key string) bool {
		if s.Authorizer == nil {
			return false
		}
		ok, e := s.Authorizer.Can(ctx, uid, key)
		return e == nil && ok
	}
	if can("proxy:read") {
		return nil, false
	}
	if can("proxy:own:read") || can("proxy:own:manage") {
		return &uid, false
	}
	return nil, true
}

// checkProxy validates a draft's proxy_id: required, visible to the caller
// and not disabled.
func (s *Service) checkProxy(ctx context.Context, id *int64) error {
	if id == nil || *id <= 0 {
		return reasonError(core.ErrInvalidArgument, "no_proxy")
	}
	scope, none := s.canProxies(ctx)
	var status string
	e := s.DB.Pool.QueryRow(ctx, `SELECT status FROM proxies WHERE id=$1 AND NOT $2::boolean
		AND ($3::bigint IS NULL OR created_by=$3)`, *id, none, scope).Scan(&status)
	if store.IsNoRows(e) {
		return reasonError(core.ErrInvalidArgument, "proxy_not_found")
	}
	if e != nil {
		return e
	}
	if status == "disabled" {
		return reasonError(core.ErrInvalidArgument, "proxy_disabled")
	}
	return nil
}

func (s *Service) runtimesOn(ctx context.Context) bool {
	cfg, e := s.Load(ctx)
	return e == nil && cfg.AccountRuntimes
}

type draftInput struct {
	ProxyID *int64 `json:"proxy_id"`
}

// draftCreate serves POST /system/ccgateway/drafts {proxy_id} → 201 {key}.
func (s *Service) draftCreate(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	ctx := c.Request.Context()
	var in draftInput
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if !s.runtimesOn(ctx) {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "not_configured"))
		return
	}
	if e := s.checkProxy(ctx, in.ProxyID); e != nil {
		httpapi.Fail(c, e)
		return
	}
	uid, _ := core.UserID(ctx)
	key := newDraftKey()
	if _, e := s.DB.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key, proxy_id, created_by)
		VALUES($1, $2, NULLIF($3::bigint, 0))`, key, *in.ProxyID, uid); e != nil {
		httpapi.Fail(c, e)
		return
	}
	s.Kick(key)
	s.record(c, "draft."+key+".create")
	httpapi.Created(c, gin.H{"key": key})
}

// draftUpdate serves PUT /system/ccgateway/drafts/:key {proxy_id} → {key}.
// A re-authorization draft keeps the account's proxy: not found.
func (s *Service) draftUpdate(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	ctx := c.Request.Context()
	key := c.Param("key")
	scope := draftScope(ctx)
	if ok, e := s.touchDraftOf(ctx, key, scope, accountDraft); e != nil || !ok {
		httpapi.Fail(c, errOr(e, draftNotFound(core.ErrNotFound)))
		return
	}
	var in draftInput
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if e := s.checkProxy(ctx, in.ProxyID); e != nil {
		httpapi.Fail(c, e)
		return
	}
	tag, e := s.DB.Pool.Exec(ctx, `UPDATE ccgateway_runtimes SET proxy_id=$2, last_seen_at=now()
		WHERE key=$1 AND account_id IS NULL AND retired_at IS NULL AND for_account IS NULL
		AND ($3::bigint IS NULL OR created_by=$3)`, key, *in.ProxyID, scope)
	if e != nil || tag.RowsAffected() != 1 {
		httpapi.Fail(c, errOr(e, draftNotFound(core.ErrNotFound)))
		return
	}
	s.Kick(key)
	s.record(c, "draft."+key+".update")
	httpapi.OK(c, gin.H{"key": key})
}

// draftDelete serves DELETE /system/ccgateway/drafts/:key → 204: the runtime
// is removed from the controller and the row deleted. When the controller
// cannot be reached the draft is marked expired so the sweep retries soon.
func (s *Service) draftDelete(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 90*time.Second)
	defer cancel()
	key := c.Param("key")
	if ok, e := s.touchDraft(ctx, key, draftScope(ctx)); e != nil || !ok {
		httpapi.Fail(c, errOr(e, draftNotFound(core.ErrNotFound)))
		return
	}
	if _, e := s.removeDraft(ctx, key, true); e != nil {
		_, _ = s.DB.Pool.Exec(context.WithoutCancel(ctx), `UPDATE ccgateway_runtimes
			SET last_seen_at = now() - interval '1 day' WHERE key=$1 AND account_id IS NULL AND retired_at IS NULL`, key)
		httpapi.Fail(c, transportError(e))
		return
	}
	s.record(c, "draft."+key+".delete")
	httpapi.NoContent(c)
}

// draftAction serves GET status|health|session and POST
// sync|start|complete|cancel on a draft, like the account endpoints.
func (s *Service) draftAction(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 90*time.Second)
	defer cancel()
	key := c.Param("key")
	if ok, e := s.touchDraft(ctx, key, draftScope(ctx)); e != nil || !ok {
		httpapi.Fail(c, errOr(e, draftNotFound(core.ErrNotFound)))
		return
	}
	d, e := s.draftDesired(ctx, key, false)
	if e != nil {
		httpapi.Fail(c, errOr(onlyUnexpected(e), draftNotFound(core.ErrNotFound)))
		return
	}
	s.serveRuntime(c, ctx, d, true)
}

// errOr is e unless it is nil, then fallback.
func errOr(e error, fallback error) error {
	if e != nil {
		return e
	}
	return fallback
}

// onlyUnexpected drops "no rows" (the draft vanished meanwhile).
func onlyUnexpected(e error) error {
	if store.IsNoRows(e) {
		return nil
	}
	return e
}

// removeDraft deletes an unadopted draft: under the runtime's advisory lock
// (no Reconcile can recreate it meanwhile) the row is deleted, the runtime
// removed on the controller, and only then the deletion committed. wait
// blocks for the lock; otherwise a busy runtime is skipped. removed=false
// with a nil error: busy, adopted or already gone.
func (s *Service) removeDraft(ctx context.Context, key string, wait bool) (removed bool, err error) {
	if !isDraftKey(key) {
		return false, errors.New("not a draft key")
	}
	e := s.lockedTx(ctx, key, wait, func(tx pgx.Tx) error {
		tag, e := tx.Exec(ctx, `DELETE FROM ccgateway_runtimes WHERE key=$1 AND account_id IS NULL AND retired_at IS NULL`, key)
		if e != nil || tag.RowsAffected() == 0 {
			return e
		}
		if e = s.deleteRemote(ctx, key, false); e != nil {
			return e
		}
		removed = true
		return nil
	})
	return removed, e
}

// lockedTx runs fn in a transaction holding the runtime's advisory lock and
// commits when fn succeeds. Without wait a held lock returns nil at once.
func (s *Service) lockedTx(ctx context.Context, key string, wait bool, fn func(pgx.Tx) error) error {
	conn, e := s.DB.Pool.Acquire(ctx)
	if e != nil {
		return e
	}
	defer conn.Release()
	tx, e := conn.Begin(ctx)
	if e != nil {
		return e
	}
	defer func() {
		cleanup, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = tx.Rollback(cleanup)
	}()
	q := tryLockSQL
	if wait {
		q = lockSQL
	}
	var locked bool
	if e = tx.QueryRow(ctx, q, key).Scan(&locked); e != nil {
		return e
	}
	if !locked {
		return nil
	}
	if e = fn(tx); e != nil {
		return e
	}
	return tx.Commit(ctx)
}

// deleteRemote removes a runtime on the controller (DELETE /accounts/<key>,
// idempotent): a draft runtime, or with retired an account-id runtime a
// re-authorization replaced, which the controller only deletes when
// X-CCG-Delete-Account names it again (§49.17). 404 counts as removed: a
// controller without the endpoint predates draft keys and cannot have
// created the runtime.
func (s *Service) deleteRemote(ctx context.Context, key string, retired bool) error {
	var header []string
	switch {
	case isDraftKey(key):
	case retired && accountKeyPattern.MatchString(key):
		header = []string{"X-CCG-Delete-Account", key}
	default:
		return errors.New("only draft and retired runtimes are deleted")
	}
	res, close, e := s.runtimeRequest(ctx, key, "DELETE", "", nil, "", header...)
	if e != nil {
		return e
	}
	defer close()
	defer res.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(res.Body, 4096))
	if res.StatusCode != http.StatusOK && res.StatusCode != http.StatusNotFound {
		return errors.New("controller refused to delete the runtime")
	}
	return nil
}

// CheckDraft is the POST /accounts check of "ccgateway_runtime" (CONTRACTS
// §49.10): the draft exists, the caller may see it (scope nil: every draft),
// it is not adopted, not a re-authorization draft, and Claude Code in its
// container is signed in. Failures are 400 with details.reason
// draft_not_found or draft_not_authorized.
func (s *Service) CheckDraft(ctx context.Context, key string, scope *int64) error {
	return s.checkDraftLogin(ctx, key, scope, accountDraft)
}

// checkDraftLogin checks an open draft of the given kind (accountDraft or an
// account id) and that Claude Code is signed in in it.
func (s *Service) checkDraftLogin(ctx context.Context, key string, scope *int64, kind int64) error {
	if ok, e := s.touchDraftOf(ctx, key, scope, kind); e != nil || !ok {
		return errOr(e, draftNotFound(core.ErrInvalidArgument))
	}
	notAuthorized := reasonError(core.ErrInvalidArgument, "draft_not_authorized")
	d, e := s.draftDesired(ctx, key, false)
	if store.IsNoRows(e) {
		return draftNotFound(core.ErrInvalidArgument)
	}
	if e != nil {
		return e
	}
	if !d.Enabled {
		return notAuthorized
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	res, close, e := s.runtimeRequest(ctx, key, "GET", "admin/status", nil, d.Revision)
	if e != nil {
		return notAuthorized
	}
	defer close()
	defer res.Body.Close()
	var v struct {
		LoggedIn bool `json:"logged_in"`
	}
	if res.StatusCode != 200 || json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(&v) != nil || !v.LoggedIn {
		return notAuthorized
	}
	return nil
}

// AdoptDraft makes the draft key the runtime of account accountID, inside
// the transaction that inserts the account. A draft adopted or removed
// meanwhile (or not the caller's, or a re-authorization draft) fails with
// 400 draft_not_found. A sweep deleting the draft concurrently holds the
// row: the update waits and then finds nothing.
func AdoptDraft(ctx context.Context, tx pgx.Tx, key string, accountID int64, scope *int64) error {
	tag, e := tx.Exec(ctx, `UPDATE ccgateway_runtimes SET account_id=$2, adopted_at=now(), last_seen_at=now()
		WHERE key=$1 AND account_id IS NULL AND retired_at IS NULL AND for_account IS NULL
		AND ($3::bigint IS NULL OR created_by=$3)`, key, accountID, scope)
	if e != nil {
		return e
	}
	if tag.RowsAffected() != 1 {
		return draftNotFound(core.ErrInvalidArgument)
	}
	return nil
}

package ccgateway

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"slices"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/environment"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// Runtime keys (CONTRACTS §49.7): an account's runtime is named after the
// draft key it adopted, else after the account id.
var (
	accountKeyPattern = regexp.MustCompile(`^[1-9][0-9]{0,17}$`)
	draftKeyPattern   = regexp.MustCompile(`^d[0-9a-f]{16}$`)
)

func isDraftKey(key string) bool { return draftKeyPattern.MatchString(key) }

var (
	// errNotConfigured: account runtimes are off (or the configuration
	// cannot be read). errUnreachable: the controller cannot be reached.
	// Both are reported as details.reason = not_configured.
	errNotConfigured = errors.New("account runtimes are not configured")
	errUnreachable   = errors.New("account runtime controller unreachable")
)

type accountDesired struct {
	Deleted        bool `json:"-"`
	PurgeRequested bool `json:"-"`
	// Retained: the deleted account's runtime is kept (blocked) until its
	// purge_after. Purged: it was purged already.
	Retained bool `json:"-"`
	Purged   bool `json:"-"`
	// Parked: the account stayed red for park_after_hours and its runtime
	// is stopped (parking.go) until it is woken or the account changes.
	Parked   bool           `json:"-"`
	CLI      *RuntimeCLI    `json:"cli,omitempty"`
	Network  RuntimeNetwork `json:"network"`
	Revision string         `json:"revision"`
	Enabled  bool           `json:"enabled"`
	Proxy    map[string]any `json:"proxy"`
	// Direct: no proxy is bound, the runtime egresses directly. A controller
	// without direct support blocks such a runtime (proxy null).
	Direct   bool              `json:"direct,omitempty"`
	Auth     map[string]string `json:"auth,omitempty"`
	Locale   string            `json:"locale,omitempty"`
	Timezone string            `json:"timezone,omitempty"`
	Kind     string            `json:"-"`
	// ProxyUnusable: the bound proxy is gone or has no supported protocol
	// (drafts hold no foreign key; the schema permits any protocol). The
	// runtime keeps the egress it has: it is neither stopped nor switched to
	// direct egress.
	ProxyUnusable bool `json:"-"`
	// Key is the runtime key: the adopted draft key or the account id.
	Key string `json:"-"`
	// AccountID is 0 for a draft that is not adopted yet.
	AccountID int64 `json:"-"`
}

// unavailable is why the runtime cannot serve: its account was deleted, or
// its bound proxy is unusable (the runtime keeps running as it was). "" when
// it can.
func (d *accountDesired) unavailable() string {
	switch {
	case d.Deleted:
		return reasonAccountDeleted
	case d.ProxyUnusable:
		return reasonProxyUnavailable
	}
	return ""
}

func (d *accountDesired) applyEnvironment() error {
	if d.Locale != "" {
		_, posix, ok := environment.Locale(d.Locale)
		if !ok {
			return errors.New("unsupported container locale")
		}
		d.Auth["locale"] = posix
	}
	if d.Timezone != "" {
		d.Auth["timezone"] = d.Timezone
	}
	return nil
}

// readEnvironment takes locale and timezone from a draft's settings, which
// the core wrote itself: strictly (environment.Normalize).
func (d *accountDesired) readEnvironment(settings []byte) error {
	values, err := environment.Normalize(settings)
	if err != nil {
		return err
	}
	d.Locale, d.Timezone = values["locale"], values["timezone"]
	return nil
}

// accountEnvironment takes locale and timezone from an account's settings.
// Leniently, unlike readEnvironment: an account's settings may hold keys
// older versions wrote (base_url and the like), and refusing them would keep
// its runtime from ever being configured (audit A12 looked like a
// duplicate; it is not one).
func accountEnvironment(settings []byte) (locale, timezone string) {
	var values map[string]any
	if json.Unmarshal(settings, &values) != nil {
		return "", ""
	}
	locale, _ = values["locale"].(string)
	timezone, _ = values["timezone"].(string)
	return locale, timezone
}

// proxyDesired decrypts the proxy password and builds the controller's
// proxy object. No proxy (empty protocol) is direct egress.
func (s *Service) proxyDesired(d *accountDesired, spec core.ProxySpec, password []byte) error {
	if spec.Protocol == "" {
		d.Proxy, d.Direct = nil, true
		return nil
	}
	if len(password) > 0 {
		plain, e := s.Cipher.Decrypt(password, []byte("proxy"))
		if e != nil {
			return e
		}
		spec.Password = string(plain)
	}
	d.Proxy = map[string]any{"protocol": spec.Protocol, "host": spec.Host, "port": spec.Port, "username": spec.Username, "password": spec.Password}
	return nil
}

func revisionOf(version string) string {
	sum := sha256.Sum256([]byte(version))
	return hex.EncodeToString(sum[:])
}

// desired reads authoritative state: request forwarding never reconfigures an
// egress and never trusts the scheduler's cached proxy binding.
func (s *Service) desired(ctx context.Context, id int64, credentials bool) (accountDesired, error) {
	return s.desiredIn(ctx, s.DB.Pool, id, credentials)
}

// desiredIn is desired read through q (a transaction sees its own changes).
func (s *Service) desiredIn(ctx context.Context, q store.Querier, id int64, credentials bool) (accountDesired, error) {
	var d accountDesired
	var version string
	var spec core.ProxySpec
	var password, accountCredentials []byte
	var settings []byte
	// The version covers what configures the runtime. The plugin's read-only
	// extension account_email (CONTRACTS §59.6) is a fact about its login, not
	// configuration: recording it never makes the controller re-apply.
	err := q.QueryRow(ctx, `SELECT
  a.deleted_at IS NOT NULL,
  r.retired_at IS NOT NULL,
  `+sqlInRetention+`,
  r.purged_at IS NOT NULL,
  a.proxy_id IS NOT NULL AND (p.id IS NULL OR p.protocol NOT IN ('http','https','socks5')),
  concat_ws('|',a.id,a.type,a.proxy_id,a.deleted_at,p.updated_at,encode(a.credentials_enc,'hex'),(a.settings - 'account_email')::text,r.retired_at),
  COALESCE(p.protocol,''),COALESCE(p.host,''),COALESCE(p.port,0),COALESCE(p.username,''),p.password_enc,a.type,a.credentials_enc,
  COALESCE(r.key, a.id::text), a.settings, COALESCE(`+sqlRuntimeParked+`, false)
  FROM accounts a LEFT JOIN proxies p ON p.id=a.proxy_id LEFT JOIN ccgateway_runtimes r ON r.account_id=a.id
  WHERE a.id=$1 AND a.plugin_key='ccgateway' AND a.type IN ('managed','apikey')`, id).
		Scan(&d.Deleted, &d.PurgeRequested, &d.Retained, &d.Purged, &d.ProxyUnusable, &version, &spec.Protocol, &spec.Host, &spec.Port, &spec.Username, &password, &d.Kind, &accountCredentials, &d.Key, &settings, &d.Parked)
	if err != nil {
		return d, err
	}
	d.AccountID = id
	// A parked runtime is blocked like a deleted account's: stopped, its
	// container, volumes and login kept. The revision does not change, so
	// waking it starts the same container.
	d.Enabled = !d.Deleted && !d.Parked
	d.Revision = revisionOf(version)
	d.Locale, d.Timezone = accountEnvironment(settings)
	if d.Enabled && credentials && !d.ProxyUnusable {
		d.Auth = map[string]string{"mode": "oauth"}
		if d.Kind == "apikey" {
			plain, err := s.Cipher.Decrypt(accountCredentials, []byte("account:ccgateway"))
			if err != nil {
				return d, errors.New("cannot decrypt account credentials")
			}
			var auth map[string]string
			if json.Unmarshal(plain, &auth) != nil || auth["api_key"] == "" {
				return d, errors.New("invalid account credentials")
			}
			d.Auth = map[string]string{"mode": "api_key", "api_key": auth["api_key"], "base_url": auth["base_url"]}
		}
		if err := d.applyEnvironment(); err != nil {
			return d, err
		}
		if err := s.proxyDesired(&d, spec, password); err != nil {
			return d, err
		}
	}
	return s.desiredNetwork(ctx, q, d)
}

// draftDesired is the desired state of a draft that is not adopted (nor
// retired) yet: a managed (OAuth) runtime egressing through the draft's
// proxy, or directly without one. The revision only depends on the draft key
// and the proxy, so every node computes the same one. A retired runtime has
// no desired state: it is never reconfigured, only deleted by the sweep.
func (s *Service) draftDesired(ctx context.Context, key string, credentials bool) (accountDesired, error) {
	d := accountDesired{Kind: "managed", Key: key}
	var version string
	var spec core.ProxySpec
	var password, settings []byte
	err := s.DB.Pool.QueryRow(ctx, `SELECT
  r.proxy_id IS NOT NULL AND (p.id IS NULL OR p.protocol NOT IN ('http','https','socks5')),
  concat_ws('|','draft',r.key,r.proxy_id,p.updated_at),
  COALESCE(p.protocol,''),COALESCE(p.host,''),COALESCE(p.port,0),COALESCE(p.username,''),p.password_enc,r.initial_settings
  FROM ccgateway_runtimes r LEFT JOIN proxies p ON p.id=r.proxy_id
  WHERE r.key=$1 AND r.account_id IS NULL AND r.retired_at IS NULL`, key).
		Scan(&d.ProxyUnusable, &version, &spec.Protocol, &spec.Host, &spec.Port, &spec.Username, &password, &settings)
	if err != nil {
		return d, err
	}
	d.Enabled = true
	d.Revision = revisionOf(version)
	if err := d.readEnvironment(settings); err != nil {
		return d, err
	}
	if credentials && !d.ProxyUnusable {
		d.Auth = map[string]string{"mode": "oauth"}
		if err := d.applyEnvironment(); err != nil {
			return d, err
		}
		if err := s.proxyDesired(&d, spec, password); err != nil {
			return d, err
		}
	}
	return s.desiredNetwork(ctx, s.DB.Pool, d)
}

// resolveKey maps an account id to its runtime key (the adopted draft key,
// else the id itself); a draft key is returned unchanged. Only the row the
// account currently uses counts (account_id): a runtime retired by a
// re-authorization never resolves.
func (s *Service) resolveKey(ctx context.Context, key string) (string, error) {
	if isDraftKey(key) {
		return key, nil
	}
	if !accountKeyPattern.MatchString(key) {
		return "", fmt.Errorf("invalid runtime key %q", key)
	}
	id, _ := strconv.ParseInt(key, 10, 64)
	e := s.DB.Pool.QueryRow(ctx, `SELECT COALESCE((SELECT key FROM ccgateway_runtimes WHERE account_id=$1), $1::bigint::text)`, id).Scan(&key)
	return key, e
}

// desiredKey is the desired state of a resolved runtime key: the account
// that adopted the draft, the draft itself, or the account with that id.
func (s *Service) desiredKey(ctx context.Context, key string, credentials bool) (accountDesired, error) {
	if !isDraftKey(key) {
		id, e := strconv.ParseInt(key, 10, 64)
		if e != nil {
			return accountDesired{}, e
		}
		d, e := s.desired(ctx, id, credentials)
		if e == nil && d.Key != key {
			return d, fmt.Errorf("account %d uses runtime %s", id, d.Key)
		}
		return d, e
	}
	var accountID *int64
	if e := s.DB.Pool.QueryRow(ctx, `SELECT account_id FROM ccgateway_runtimes WHERE key=$1`, key).Scan(&accountID); e != nil {
		return accountDesired{}, e
	}
	if accountID != nil {
		return s.desired(ctx, *accountID, credentials)
	}
	return s.draftDesired(ctx, key, credentials)
}

// runtimeRequest calls /accounts/<key>/<path> on the controller (path ""
// addresses the runtime itself). header holds extra name/value pairs.
func (s *Service) runtimeRequest(ctx context.Context, key, method, path string, body []byte, revision string, header ...string) (*http.Response, func() error, error) {
	cfg, e := s.Load(ctx)
	if e != nil || !cfg.AccountRuntimes {
		return nil, nil, errNotConfigured
	}
	client, base, close, e := s.open(ctx, cfg)
	if e != nil {
		return nil, nil, fmt.Errorf("%w: %v", errUnreachable, e)
	}
	target := base + "/accounts/" + key
	if path != "" {
		target += "/" + path
	}
	req, e := http.NewRequestWithContext(ctx, method, target, bytes.NewReader(body))
	if e != nil {
		close()
		return nil, nil, e
	}
	req.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CCG-Revision", revision)
	for i := 0; i+1 < len(header); i += 2 {
		req.Header.Set(header[i], header[i+1])
	}
	res, e := client.Do(req)
	if e != nil {
		close()
		return nil, nil, fmt.Errorf("%w: %v", errUnreachable, e)
	}
	return res, close, nil
}

// lockSQL takes the per-runtime advisory lock of the current transaction.
// The key text is the account id for runtimes named after their account, as
// before runtime keys existed, so mixed-version nodes still serialize.
const (
	tryLockSQL = `SELECT pg_try_advisory_xact_lock(hashtextextended('ccg-account:' || $1::text,0))`
	lockSQL    = `SELECT true FROM (SELECT pg_advisory_xact_lock(hashtextextended('ccg-account:' || $1::text,0))) l`
)

// Reconcile is a control-plane operation for one runtime: key is a runtime
// key or an account id (resolved to the account's runtime key). Multiple
// core nodes serialize via a PG advisory lock held across read/apply,
// preventing stale writes to Docker.
func (s *Service) Reconcile(ctx context.Context, key string) error {
	key, e := s.resolveKey(ctx, key)
	if e != nil {
		return e
	}
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
	var locked bool
	if e = tx.QueryRow(ctx, tryLockSQL, key).Scan(&locked); e != nil {
		return e
	}
	if !locked {
		return nil
	}
	d, e := s.desiredKey(ctx, key, true)
	if e != nil {
		return e
	}
	// A deleted account comes first: neither a blocked mark nor an unusable
	// proxy keeps its runtime from being purged.
	if d.Deleted {
		switch {
		case d.Purged:
			return nil
		case d.PurgeRequested && !d.Retained:
			if e = s.purgeDeleted(ctx, tx, key, d); e != nil {
				return e
			}
			return tx.Commit(ctx)
		}
	}
	if d.ProxyUnusable && !d.Deleted {
		return nil
	}
	if !d.Enabled {
		// A deleted account's or parked runtime was blocked already (a
		// blocked runtime reports "pending", so the status check below would
		// block it every pass).
		if blocked, e := s.blockedRecently(ctx, tx, key, d); e != nil || blocked {
			return e
		}
	}
	// Check remote readiness without rewriting an unchanged configuration.
	res, close, e := s.runtimeRequest(ctx, key, "GET", "status", nil, "")
	if e == nil {
		var status struct {
			Status   string `json:"status"`
			Revision string `json:"revision"`
		}
		_ = json.NewDecoder(res.Body).Decode(&status)
		res.Body.Close()
		close()
		if d.Enabled && status.Status == "ready" && status.Revision == d.Revision {
			return nil
		}
	}
	if e = s.putConfig(ctx, key, d); e != nil || d.Enabled {
		return e
	}
	return s.markBlocked(ctx, tx, key, d)
}

// blockedFor is how long a blocked runtime is not blocked again. The
// controller reports a blocked runtime as "pending", so without it every
// pass rewrote the configuration of every disabled account (2026-10-11).
// Blocking again now and then still stops containers someone started by
// hand.
var blockedFor = 10 * time.Minute

// blockedMark is a block this node sent; it covers runtimes without a row in
// ccgateway_runtimes (legacy runtimes named after their account), which keep
// their mark in memory only.
type blockedMark struct {
	revision  string
	accountID int64
	at        time.Time
}

// blockedRevision is the database form of revision (its first 63 bits).
func blockedRevision(revision string) int64 {
	if len(revision) < 16 {
		return 0
	}
	n, err := strconv.ParseUint(revision[:16], 16, 64)
	if err != nil {
		return 0
	}
	return int64(n >> 1)
}

// blockedRecently reports whether enabled:false was sent to runtime key at
// d's revision less than blockedFor ago, by this node or any other
// (ccgateway_runtimes.blocked_revision / blocked_at, read under the
// runtime's advisory lock), and no change asked to block it again since.
func (s *Service) blockedRecently(ctx context.Context, tx pgx.Tx, key string, d accountDesired) (bool, error) {
	now := time.Now()
	s.blockedMu.Lock()
	m, ok := s.blocked[key]
	forgot := s.forgotAll
	for _, k := range []string{key, strconv.FormatInt(d.AccountID, 10)} {
		if t := s.forgot[k]; t.After(forgot) {
			forgot = t
		}
	}
	s.blockedMu.Unlock()
	if ok && m.revision == d.Revision && now.Sub(m.at) < blockedFor {
		return true, nil
	}
	var revision *int64
	var at *time.Time
	err := tx.QueryRow(ctx, `SELECT blocked_revision, blocked_at FROM ccgateway_runtimes WHERE key = $1`, key).Scan(&revision, &at)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return revision != nil && at != nil && *revision == blockedRevision(d.Revision) &&
		now.Sub(*at) < blockedFor && at.After(forgot), nil
}

// markBlocked records the enabled:false just sent to runtime key, in the
// database for every node (committing tx, which releases the runtime's
// lock) and in memory.
func (s *Service) markBlocked(ctx context.Context, tx pgx.Tx, key string, d accountDesired) error {
	now := time.Now()
	s.blockedMu.Lock()
	if s.blocked == nil {
		s.blocked = map[string]blockedMark{}
	}
	s.blocked[key] = blockedMark{revision: d.Revision, accountID: d.AccountID, at: now}
	s.blockedMu.Unlock()
	if _, err := tx.Exec(ctx, `UPDATE ccgateway_runtimes SET blocked_revision = $2, blocked_at = $3 WHERE key = $1`,
		key, blockedRevision(d.Revision), now); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// forgetBlocked follows an account, proxy or configuration change: a
// runtime blocked again at the same revision (disabled, enabled, disabled) is
// blocked again. With keys (runtime keys or account ids) only those runtimes
// are forgotten: a change of one account does not block every parked
// runtime again. Marks in the database written before now stop counting on
// this node.
func (s *Service) forgetBlocked(keys ...string) {
	now := time.Now()
	s.blockedMu.Lock()
	defer s.blockedMu.Unlock()
	if len(keys) == 0 {
		s.blocked, s.forgot, s.forgotAll = nil, nil, now
		return
	}
	if s.forgot == nil {
		s.forgot = map[string]time.Time{}
	}
	for k, t := range s.forgot {
		if now.Sub(t) >= blockedFor {
			delete(s.forgot, k)
		}
	}
	for _, key := range keys {
		if key != "" {
			s.forgot[key] = now
		}
	}
	for k, m := range s.blocked {
		for _, key := range keys {
			if key != "" && (k == key || (m.accountID > 0 && strconv.FormatInt(m.accountID, 10) == key)) {
				delete(s.blocked, k)
				break
			}
		}
	}
}

// putConfig applies d to the runtime key on the controller (PUT config).
// The core names no CLI (the image decides, cli-from-image-v1); a
// controller without that feature is sent the legacy profile (legacyCLI).
func (s *Service) putConfig(ctx context.Context, key string, d accountDesired) error {
	if d.CLI == nil {
		cfg, err := s.Load(ctx)
		if err != nil {
			return err
		}
		var health struct {
			Features []string `json:"features"`
		}
		if err := s.controllerJSON(ctx, cfg, "GET", "/health", nil, &health); err != nil {
			return err
		}
		switch {
		case slices.Contains(health.Features, cliFromImageFeature):
		case slices.Contains(health.Features, "cli-profile-v1"):
			d.CLI = legacyCLI(cfg)
		default:
			return errors.New("controller upgrade required: cli-profile-v1")
		}
	}
	body, _ := json.Marshal(d)
	res, close, e := s.runtimeRequest(ctx, key, "PUT", "config", body, "")
	if e != nil {
		return e
	}
	defer close()
	defer res.Body.Close()
	if res.StatusCode != 200 {
		raw, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
		return syncError(res.StatusCode, raw)
	}
	return nil
}

// Kick asks this node to reconcile one runtime now instead of waiting for
// the next reconcile pass (account create/update, draft create/update). key is a
// runtime key or an account id. It never blocks; a full queue is dropped
// because the reconcile pass still covers the runtime within a minute.
func (s *Service) Kick(key string) {
	// A kick follows a change: block again even at a revision blocked before.
	s.forgetBlocked(key)
	select {
	case s.kick <- key:
	default:
	}
}

// reconcileKicked serves Kick on its own goroutine so a long sweep (each
// runtime may take up to 90 s) does not delay a freshly created one. A
// failed reconcile is kicked again every kickRetryEvery, kickRetries times,
// before it is left to the reconcile pass.
func (s *Service) reconcileKicked(ctx context.Context) {
	failures := map[string]int{}
	for {
		select {
		case <-ctx.Done():
			return
		case key := <-s.kick:
			if cfg, e := s.Load(ctx); e != nil || !cfg.AccountRuntimes {
				continue
			}
			c, cancel := context.WithTimeout(ctx, 90*time.Second)
			e := s.Reconcile(c, key)
			cancel()
			if e == nil || ctx.Err() != nil {
				delete(failures, key)
				continue
			}
			slog.Warn("CCGateway runtime reconcile failed", "key", key, "err", e)
			if failures[key]++; failures[key] <= kickRetries {
				time.AfterFunc(kickRetryEvery, func() { s.Kick(key) })
			} else {
				delete(failures, key)
			}
		}
	}
}

var (
	kickRetries    = 12
	kickRetryEvery = 5 * time.Second
)

// runtimeKeys lists every runtime the core wants on the controller: one per
// ccgateway account (deleted and disabled ones too, so they get blocked or
// purged; not once purged) and one per draft that is not adopted yet
// (re-authorization drafts included). Retired runtimes are left alone until
// the sweep deletes them.
func (s *Service) runtimeKeys(ctx context.Context) ([]string, error) {
	rows, e := s.DB.Pool.Query(ctx, `SELECT COALESCE(r.key, a.id::text) FROM accounts a
  LEFT JOIN ccgateway_runtimes r ON r.account_id=a.id
  WHERE a.plugin_key='ccgateway' AND a.type IN ('managed','apikey') AND r.purged_at IS NULL
  UNION ALL SELECT key FROM ccgateway_runtimes WHERE account_id IS NULL AND retired_at IS NULL
  ORDER BY 1`)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	var keys []string
	for rows.Next() {
		var key string
		if rows.Scan(&key) == nil {
			keys = append(keys, key)
		}
	}
	return keys, rows.Err()
}

// reconcileEvery is the reconcile pass of every runtime
// (core.ccgateway.runtime_sync). Changes are applied at once (Kick,
// account:changed, config:changed), so the pass only catches what changed on
// the controller side (a runtime restarted or removed) and missed messages
// (2026-10-11; it was every 3 s).
var reconcileEvery = 60 * time.Second

// runtimeSyncWorkers reconcile the runtimes of one pass concurrently.
const runtimeSyncWorkers = 4

// RuntimeSyncTask is the cluster task that reconciles every runtime.
const RuntimeSyncTask = "core.ccgateway.runtime_sync"

func runtimeSyncSpec(s *Service) core.TaskSpec {
	return core.TaskSpec{
		Name:  RuntimeSyncTask,
		Title: core.LocalizedText{"en": "Synchronize every account runtime", "zh": "全量同步账号运行环境"},
		Description: core.LocalizedText{
			"en": "Applies the desired configuration to every account runtime the controller does not run as it should; changes are applied at once, this catches what changed on the controller and missed messages.",
			"zh": "把期望配置应用到控制器上状态不对的每个账号运行环境。变更本来会立即应用，这里补上控制器侧的变化和漏掉的消息。",
		},
		Scope:   core.TaskCluster,
		Every:   reconcileEvery,
		Timeout: 10 * time.Minute,
		Handler: s.syncRuntimes,
	}
}

// syncRuntimes reconciles every runtime, runtimeSyncWorkers at a time, each
// for at most 90 s. A runtime another node is reconciling is skipped (its
// advisory lock). It reports how many runtimes it went through and how many
// failed.
func (s *Service) syncRuntimes(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
	cfg, e := s.Load(ctx)
	if e != nil {
		return core.TaskResult{}, e
	}
	if !cfg.AccountRuntimes {
		return core.TaskResult{Message: "account runtimes are off"}, nil
	}
	keys, e := s.runtimeKeys(ctx)
	if e != nil {
		return core.TaskResult{}, e
	}
	var failed atomic.Int64
	work := make(chan string)
	var wg sync.WaitGroup
	for range min(runtimeSyncWorkers, len(keys)) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for key := range work {
				c, cancel := context.WithTimeout(ctx, 90*time.Second)
				if err := s.Reconcile(c, key); err != nil && ctx.Err() == nil {
					failed.Add(1)
				}
				cancel()
			}
		}()
	}
feed:
	for _, key := range keys {
		select {
		case work <- key:
		case <-ctx.Done():
			break feed
		}
	}
	close(work)
	wg.Wait()
	if err := ctx.Err(); err != nil {
		return core.TaskResult{Count: len(keys)}, err
	}
	msg := ""
	if n := failed.Load(); n > 0 {
		msg = fmt.Sprintf("%d of %d runtimes failed to synchronize", n, len(keys))
	}
	return core.TaskResult{Count: len(keys), Message: msg}, nil
}

// Run serves Kick and the account and configuration messages until ctx is
// done; the pass over every runtime is core.ccgateway.runtime_sync.
func (s *Service) Run(ctx context.Context) {
	if s.kick != nil {
		go s.reconcileKicked(ctx)
	}
	if s.Bus != nil {
		defer s.Bus.Subscribe(core.ChannelAccountChanged, s.onAccountChanged)()
		defer s.Bus.Subscribe(core.ChannelConfigChanged, s.onConfigChanged)()
	}
	<-ctx.Done()
}

// startRetryFor / startRetryEvery bound the "start" retry in serveRuntime.
var (
	startRetryFor   = 30 * time.Second
	startRetryEvery = 2 * time.Second
)

// accountManage serves /system/ccgateway/accounts/:id/:action for whoever
// may read (GET) or update (other methods) the account itself; own-level
// callers only reach accounts they created, others are 404. Arbitrary remote
// paths are never accepted.
//
// Two GETs write on purpose (W1-F7, won't fix): health records the
// subscription type the runtime reports, and a draft status touches
// last_seen_at as its keep-alive. Neither is a change the reader chooses.
func (s *Service) accountManage(c *gin.Context) {
	if c.Param("action") == "cc-features" {
		if c.Request.Method != "GET" {
			httpapi.Fail(c, core.ErrNotFound)
			return
		}
		s.accountFeaturePreview(c)
		return
	}
	httpapi.NoStore(c)
	id, e := strconv.ParseInt(c.Param("id"), 10, 64)
	if e != nil || id <= 0 {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 90*time.Second)
	defer cancel()
	if e = s.authorizeAccount(ctx, c.Request.Method, id); e != nil {
		httpapi.Fail(c, e)
		return
	}
	d, e := s.desired(ctx, id, false)
	if e != nil {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	s.serveRuntime(c, ctx, d, false)
}

// serveRuntime runs one :action on the runtime of d, for an account
// (accountManage) or a draft (draftAction).
func (s *Service) serveRuntime(c *gin.Context, ctx context.Context, d accountDesired, draft bool) {
	action := c.Param("action")
	switch action {
	case "features", "request-logs":
		if draft {
			httpapi.Fail(c, core.ErrNotFound)
		} else if action == "features" {
			s.serveFeatures(c, ctx, d)
		} else {
			s.serveRequestLogs(c, ctx, d)
		}
		return
	}
	read := action == "status" || action == "health" || action == "session"
	if (c.Request.Method == "GET") != read {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	switch action {
	case "sync":
		s.serveSync(c, ctx, d)
		return
	case "status":
		s.serveStatus(c, ctx, d, draft)
		return
	}
	path, failure := runtimeActionPath(action, d, draft)
	if failure != nil {
		httpapi.Fail(c, failure)
		return
	}
	if d.Parked && !d.Deleted {
		// Stopped: start it (sync) or re-authorize / test the account first.
		httpapi.Fail(c, reasonError(core.ErrConflict, reasonRuntimeParked))
		return
	}
	if reason := d.unavailable(); reason != "" {
		// Say why instead of a 409 from a runtime that cannot follow.
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, reason))
		return
	}
	var raw []byte
	if !read {
		if raw, failure = runtimeActionBody(c); failure != nil {
			httpapi.Fail(c, failure)
			return
		}
	}
	out, failure := s.runtimeAction(ctx, d, draft, action, c.Request.Method, path, raw)
	if failure != nil {
		httpapi.Fail(c, failure)
		return
	}
	if c.Request.Method != "GET" {
		if draft {
			s.record(c, "draft."+d.Key+"."+action)
		} else {
			s.record(c, "account."+strconv.FormatInt(d.AccountID, 10)+"."+action)
		}
	}
	httpapi.OK(c, out)
}

// serveSync reconciles the runtime of d now (POST .../sync); a parked one is
// woken first (the runtime list's "Start").
func (s *Service) serveSync(c *gin.Context, ctx context.Context, d accountDesired) {
	if d.Parked {
		if _, e := s.wake(ctx, d.AccountID); e != nil {
			httpapi.Fail(c, e)
			return
		}
	}
	if e := s.Reconcile(ctx, d.Key); e != nil {
		httpapi.Fail(c, syncFailure(e))
		return
	}
	if d.Deleted {
		// The controller stopped the runtime; polling status would otherwise
		// show "pending" forever.
		httpapi.OK(c, map[string]any{"synced": true, "status": "blocked", "reason": reasonAccountDeleted})
		return
	}
	httpapi.OK(c, map[string]any{"synced": true})
}

// syncFailure is the answer of a failed sync: the controller's own reason
// (syncError) is kept; a connection failure or anything unnamed is reported
// as such.
func syncFailure(e error) *core.Error {
	if known := core.AsError(e); known.Code == core.ErrUnavailable.Code && known.Details["reason"] != nil {
		return known
	}
	reason := "sync_failed"
	if errors.Is(e, errNotConfigured) || errors.Is(e, errUnreachable) {
		reason = "not_configured"
	}
	return reasonError(core.ErrUnavailable, reason)
}

// runtimeActionPath is the business container path of action.
func runtimeActionPath(action string, d accountDesired, draft bool) (string, *core.Error) {
	switch action {
	case "health":
		return "admin/status", nil
	case "session":
		return "admin/auth/session", nil
	case "start", "complete", "cancel", "logout":
		if draft && action == "logout" {
			return "", core.ErrNotFound
		}
		if d.Kind != "managed" {
			return "", reasonError(core.ErrInvalidArgument, "api_key_account")
		}
		return "admin/auth/" + action, nil
	}
	return "", core.ErrNotFound
}

// runtimeActionBody is the request body forwarded: only a JSON object (empty
// means {}).
func runtimeActionBody(c *gin.Context) ([]byte, *core.Error) {
	raw, e := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 8192))
	if e != nil {
		return nil, core.ErrInvalidArgument
	}
	body := map[string]any{}
	if len(bytes.TrimSpace(raw)) > 0 && json.Unmarshal(raw, &body) != nil {
		return nil, core.ErrInvalidArgument.WithMessage("The request body must be a JSON object.")
	}
	raw, _ = json.Marshal(body)
	return raw, nil
}

// runtimeAction forwards action to the business container and shapes its
// answer.
func (s *Service) runtimeAction(ctx context.Context, d accountDesired, draft bool, action, method, path string, body []byte) (out any, failure *core.Error) {
	// An account's health also names the Claude Code version its Worker
	// observed, read concurrently so the login check does not wait for it.
	var cliVersion chan string
	if action == "health" && !draft {
		cliVersion = make(chan string, 1)
		go func() { cliVersion <- s.observedCLIVersion(ctx, d) }()
	}
	res, close, e := s.runtimeActionRequest(ctx, d.Key, method, path, body, d.Revision)
	if e != nil {
		return nil, transportError(e)
	}
	defer close()
	defer res.Body.Close()
	raw, e := readBounded(res.Body, 65536)
	if e != nil {
		return nil, reasonError(core.ErrUnavailable, "runtime_unavailable")
	}
	if res.StatusCode != 200 {
		if action == "session" && res.StatusCode == http.StatusNotFound {
			// A business container without GET /admin/auth/session (older
			// image) has no session to resume.
			return nil, nil
		}
		return nil, runtimeError(res.StatusCode, raw)
	}
	switch action {
	case "health":
		out, e = safeResult("/status", raw)
		if e == nil && !draft {
			s.noteFacts(ctx, d.AccountID, raw)
		}
		if e == nil && cliVersion != nil {
			out = withCLIVersion(out, <-cliVersion)
		}
	case "session":
		out, e = sessionResult(raw)
	case "start":
		out, e = safeResult("/auth/start", raw)
	default:
		out, e = safeResult("/auth/"+action, raw)
	}
	if e != nil {
		return nil, reasonError(core.ErrUnavailable, "runtime_unavailable")
	}
	return out, nil
}

// noteFacts keeps the account current from its health answer (CONTRACTS
// §59): the subscription type on the account, and what the plugin keeps of
// the observed facts (the login email).
func (s *Service) noteFacts(ctx context.Context, accountID int64, raw []byte) {
	var status struct {
		SubscriptionType string `json:"subscription_type"`
		RateLimitTier    string `json:"rate_limit_tier"`
		AccountEmail     string `json:"account_email"`
	}
	if json.Unmarshal(raw, &status) != nil {
		return
	}
	if err := recordRateLimitTier(ctx, s.DB.Pool, accountID, status.RateLimitTier); err != nil {
		slog.WarnContext(ctx, "ccgateway: record rate limit tier", "account", accountID, "err", err)
	}
	changed, err := recordSubscription(ctx, s.DB.Pool, accountID, status.SubscriptionType)
	if err != nil {
		slog.WarnContext(ctx, "ccgateway: record subscription type", "account", accountID, "err", err)
		return
	}
	s.factsObserved(ctx, accountID, observedFacts(status.SubscriptionType, status.AccountEmail), changed)
}

func (s *Service) runtimeActionRequest(ctx context.Context, key, method, path string, body []byte, revision string) (*http.Response, func() error, error) {
	res, close, err := s.runtimeRequest(ctx, key, method, path, body, revision)
	if path != "admin/auth/start" {
		return res, close, err
	}
	// Right after the runtime turns ready the controller may still answer
	// 409 (revision not recorded yet) or 503 (the app's HTTP server is not
	// listening yet). Neither reached the CLI, so retrying cannot open a
	// second login session; any other answer is final.
	deadline := time.Now().Add(startRetryFor)
	for err == nil && (res.StatusCode == http.StatusConflict || res.StatusCode == http.StatusServiceUnavailable) && time.Now().Add(startRetryEvery).Before(deadline) {
		res.Body.Close()
		close()
		select {
		case <-ctx.Done():
			return nil, nil, reasonError(core.ErrUnavailable, "not_synchronized")
		case <-time.After(startRetryEvery):
		}
		res, close, err = s.runtimeRequest(ctx, key, method, path, body, revision)
	}
	return res, close, err
}

// serveStatus answers GET .../status. Accounts: {account_id, key, container,
// status: ready|pending|blocked, revision, reason?}. Drafts: {key, container,
// status: creating|ready|blocked, reason?}.
func (s *Service) serveStatus(c *gin.Context, ctx context.Context, d accountDesired, draft bool) {
	accountID := strconv.FormatInt(d.AccountID, 10)
	if d.Deleted {
		httpapi.OK(c, map[string]string{"account_id": accountID, "key": d.Key, "container": "", "status": "blocked", "revision": "", "reason": reasonAccountDeleted})
		return
	}
	if d.Parked {
		httpapi.OK(c, map[string]string{"account_id": accountID, "key": d.Key, "container": "", "status": "blocked", "revision": "", "reason": reasonAccountParked})
		return
	}
	status, failure := s.runtimeStatus(ctx, d)
	if failure != nil {
		httpapi.Fail(c, failure)
		return
	}
	if draft {
		httpapi.OK(c, draftStatus(d, status))
		return
	}
	if status.Revision != d.Revision {
		status.Status = "pending"
	}
	httpapi.OK(c, map[string]any{"account_id": accountID, "key": d.Key, "container": status.Container, "status": status.Status, "revision": status.Revision,
		"current_image": status.CurrentImage, "target_image": status.TargetImage, "image_update_available": status.ImageUpdateAvailable, "target_image_available": status.TargetImageAvailable})
}

// observedStatus is the controller's GET /accounts/<key>/status answer.
type observedStatus struct {
	Container            string `json:"container"`
	Status               string `json:"status"`
	Revision             string `json:"revision"`
	CurrentImage         string `json:"current_image"`
	TargetImage          string `json:"target_image"`
	ImageUpdateAvailable bool   `json:"image_update_available"`
	TargetImageAvailable bool   `json:"target_image_available"`
}

// runtimeStatus reads the controller's status of the runtime of d.
func (s *Service) runtimeStatus(ctx context.Context, d accountDesired) (observedStatus, *core.Error) {
	var status observedStatus
	res, close, e := s.runtimeRequest(ctx, d.Key, "GET", "status", nil, d.Revision)
	if e != nil {
		return status, transportError(e)
	}
	defer close()
	defer res.Body.Close()
	raw, e := readBounded(res.Body, 65536)
	if e != nil {
		return status, reasonError(core.ErrUnavailable, "runtime_unavailable")
	}
	if res.StatusCode != 200 {
		return status, runtimeError(res.StatusCode, raw)
	}
	if json.Unmarshal(raw, &status) != nil {
		return status, reasonError(core.ErrUnavailable, "runtime_unavailable")
	}
	return status, nil
}

// draftStatus is a draft's status: creating until its runtime is ready at
// the draft's revision.
func draftStatus(d accountDesired, status observedStatus) map[string]string {
	phase := "creating"
	if status.Status == "ready" && status.Revision == d.Revision {
		phase = "ready"
	}
	return map[string]string{"key": d.Key, "container": status.Container, "status": phase}
}

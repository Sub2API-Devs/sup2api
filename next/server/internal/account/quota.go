package account

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"slices"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Subscription quota of accounts (CONTRACTS §44), modelled on sub2api's
// AccountUsageService: the snapshot is fed mainly by the quota headers of
// the gateway's own upstream responses (passive, no extra upstream call) and,
// for account types whose plugin can ask the upstream, by an active query
// that runs only when the console asks for a snapshot older than three
// minutes, at most once per account every 30 seconds.

const (
	// quotaFresh: a snapshot younger than this (either source) is served as
	// is (sub2api apiCacheTTL).
	quotaFresh = 3 * time.Minute
	// quotaErrorTTL: after a failed active query the next one waits this long
	// unless forced (sub2api apiErrorCacheTTL).
	quotaErrorTTL = time.Minute
	// quotaQueryFloor is the minimum gap between two active queries of one
	// account, forced or not, on any node (enforced in PG).
	quotaQueryFloor = 30 * time.Second
	// quotaPassiveInterval is the minimum gap between two passive writes of
	// one account on one node; a status change is written at once.
	quotaPassiveInterval = 30 * time.Second
	quotaQueryTimeout    = 20 * time.Second
	maxQuotaBody         = 64 << 10
	maxQuotaError        = 512
	quotaFlushTick       = 5 * time.Second
	quotaIdle            = 10 * time.Minute
)

// quotaKeyOrder orders the windows the console knows; other keys follow the
// account type's declaration, then the alphabet.
var quotaKeyOrder = []string{"5h", "7d", "7d_sonnet", "7d_fable"}

// QuotaSnapshot is the API view of an account's subscription quota. Account
// types without quota have no snapshot (View.quota is null).
type QuotaSnapshot struct {
	Supported bool `json:"supported"`
	// Source of the newest data: "passive", "active", or "" before any.
	Source    string     `json:"source"`
	UpdatedAt *time.Time `json:"updated_at"`
	// Error of the last active query, cleared by the next successful sample.
	Error   string        `json:"error"`
	Windows []QuotaWindow `json:"windows"`
}

// QuotaWindow is one window of a QuotaSnapshot. A window whose reset time
// has passed is shown as reset: utilization 0, no reset time, no status.
type QuotaWindow struct {
	Key         string     `json:"key"`
	Utilization float64    `json:"utilization"`
	ResetsAt    *time.Time `json:"resets_at"`
	Status      string     `json:"status"`
	Used        int64      `json:"used,omitempty"`
	Limit       int64      `json:"limit,omitempty"`
}

// quotaView renders a stored snapshot (nil = none yet) for an account type
// declaring decl.
func quotaView(decl *manifest.AccountQuota, snap *store.QuotaSnapshot, now time.Time) *QuotaSnapshot {
	v := &QuotaSnapshot{Supported: true, Windows: []QuotaWindow{}}
	if snap == nil {
		return v
	}
	v.Source, v.UpdatedAt, v.Error = snap.Source, snap.UpdatedAt, snap.Error
	if snap.UpdatedAt == nil {
		v.Source = ""
	}
	for key, w := range snap.Windows {
		qw := QuotaWindow{Key: key, Utilization: w.Utilization, ResetsAt: w.ResetsAt, Status: w.Status, Used: w.Used, Limit: w.Limit}
		if qw.ResetsAt != nil && !now.Before(*qw.ResetsAt) {
			qw.Utilization, qw.ResetsAt, qw.Status, qw.Used = 0, nil, "", 0
		}
		v.Windows = append(v.Windows, qw)
	}
	rank := func(key string) int {
		if i := slices.Index(quotaKeyOrder, key); i >= 0 {
			return i
		}
		for i, h := range decl.Headers {
			if h.Key == key {
				return len(quotaKeyOrder) + i
			}
		}
		return len(quotaKeyOrder) + len(decl.Headers)
	}
	sort.Slice(v.Windows, func(i, j int) bool {
		ri, rj := rank(v.Windows[i].Key), rank(v.Windows[j].Key)
		if ri != rj {
			return ri < rj
		}
		return v.Windows[i].Key < v.Windows[j].Key
	})
	return v
}

// quotaDecl returns the quota declaration of an account's type, nil when the
// type has none or is not registered (plugin disabled).
func (s *Service) quotaDecl(pluginKey, typ string) (*manifest.AccountQuota, core.AccountTypeBinding) {
	bt, ok := s.accountType(pluginKey, typ)
	if !ok || !bt.Type.Quota.Supported() {
		return nil, bt
	}
	return bt.Type.Quota, bt
}

// fillQuota sets View.Quota for the accounts whose type has quota, from one
// batch read of the stored snapshots. It never calls an upstream.
func (s *Service) fillQuota(ctx context.Context, rows []*row, out []*View) {
	decls := make([]*manifest.AccountQuota, len(rows))
	var ids []int64
	for i, a := range rows {
		if decls[i], _ = s.quotaDecl(a.PluginKey, a.Type); decls[i] != nil {
			ids = append(ids, a.ID)
		}
	}
	if len(ids) == 0 {
		return
	}
	snaps, err := s.d.DB.AccountQuotas(ctx, ids)
	if err != nil {
		slog.WarnContext(ctx, "account: read quota snapshots", "err", err)
		snaps = nil
	}
	now := time.Now()
	for i, a := range rows {
		if decls[i] != nil {
			out[i].Quota = quotaView(decls[i], snaps[a.ID], now)
		}
	}
}

// ---------------------------------------------------------------- active query

// getQuota is GET /accounts/:id/quota[?force=true].
func (s *Service) getQuota(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	force, _ := strconv.ParseBool(c.Query("force"))
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, core.OwnerScope(ctx, "account:read"), false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	v, err := s.accountQuota(ctx, a, force)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

// accountQuota returns the account's snapshot, refreshing it with one active
// query first when the type supports it and the snapshot is stale (or force
// is set, still bounded by the 30-second floor). Concurrent callers for one
// account share the query. Upstream and plugin failures do not fail the
// call: they are recorded on the snapshot (negative cache, quotaErrorTTL).
func (s *Service) accountQuota(ctx context.Context, a *row, force bool) (*QuotaSnapshot, error) {
	decl, bt := s.quotaDecl(a.PluginKey, a.Type)
	if decl == nil {
		return &QuotaSnapshot{Windows: []QuotaWindow{}}, nil
	}
	snap, err := s.d.DB.AccountQuota(ctx, a.ID)
	if err != nil {
		return nil, err
	}
	if decl.Query && bt.Client != nil && shouldQueryQuota(snap, force, time.Now()) {
		v, err, _ := s.quotaFlight.Do(itoa(a.ID), func() (any, error) {
			// Not tied to the first caller: the others wait for the same result.
			qctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), quotaQueryTimeout)
			defer cancel()
			return s.queryQuota(qctx, bt, a)
		})
		if err != nil {
			return nil, err
		}
		snap = v.(*store.QuotaSnapshot)
	}
	return quotaView(decl, snap, time.Now()), nil
}

// shouldQueryQuota decides, on this node's reading of the snapshot, whether
// an active query is worth attempting. ClaimAccountQuotaQuery re-checks the
// floor atomically in PG.
func shouldQueryQuota(snap *store.QuotaSnapshot, force bool, now time.Time) bool {
	if snap == nil {
		return true
	}
	if snap.LastActiveAt != nil && now.Sub(*snap.LastActiveAt) < quotaQueryFloor {
		return false
	}
	if force {
		return true
	}
	if snap.UpdatedAt != nil && now.Sub(*snap.UpdatedAt) < quotaFresh {
		return false
	}
	if snap.Error != "" && snap.LastActiveAt != nil && now.Sub(*snap.LastActiveAt) < quotaErrorTTL {
		return false
	}
	return true
}

// queryQuota claims the account's query slot, asks the plugin for the
// request, sends it through the account's proxy and stores what the plugin
// read out of the answer. It returns the snapshot as stored afterwards; only
// database errors are returned as errors.
func (s *Service) queryQuota(ctx context.Context, bt core.AccountTypeBinding, a *row) (*store.QuotaSnapshot, error) {
	claimed, err := s.d.DB.ClaimAccountQuotaQuery(ctx, a.ID, quotaQueryFloor)
	if err != nil {
		return nil, err
	}
	if claimed {
		if msg := s.runQuotaQuery(ctx, bt, a); msg != "" {
			if err := s.d.DB.SetAccountQuotaError(ctx, a.ID, truncate(msg, maxQuotaError)); err != nil {
				return nil, err
			}
		}
	}
	return s.d.DB.AccountQuota(ctx, a.ID)
}

// runQuotaQuery performs one active query and saves its windows. It returns
// the error to record on the snapshot, "" on success or when the plugin does
// not implement the query after all.
func (s *Service) runQuotaQuery(ctx context.Context, bt core.AccountTypeBinding, a *row) string {
	plain, err := s.decrypt(a.PluginKey, a.CredEnc)
	if err != nil {
		return "credentials: " + err.Error()
	}
	acct := &pluginv1.Account{Id: a.ID, Name: a.Name, Type: a.Type, CredentialsJson: string(plain), SettingsJson: string(a.Settings)}
	built, err := bt.Client.BuildQuotaRequest(ctx, &pluginv1.BuildQuotaRequestRequest{Account: acct})
	if status.Code(err) == codes.Unimplemented {
		slog.DebugContext(ctx, "account: plugin declares quota.query but does not implement it", "plugin", bt.Plugin.Key, "type", a.Type)
		return ""
	}
	if err == nil && built == nil {
		err = errors.New("empty response")
	}
	if err != nil {
		return "plugin: " + err.Error()
	}
	in := s.sendQuotaRequest(ctx, built, a.ProxyID)
	in.Account = acct
	res, err := bt.Client.ParseQuotaResponse(ctx, in)
	if err == nil && res == nil {
		err = errors.New("empty response")
	}
	if err != nil {
		return "plugin: " + err.Error()
	}
	switch res.GetErrorType() {
	case pluginv1.QuotaResult_ERROR_TYPE_UNSPECIFIED:
	case pluginv1.QuotaResult_ERROR_TYPE_AUTH_REJECTED:
		return "auth_rejected: " + res.GetErrorMessage()
	default:
		return "transient: " + res.GetErrorMessage()
	}
	windows := map[string]store.QuotaWindow{}
	for _, w := range res.GetWindows() {
		key := strings.TrimSpace(w.GetKey())
		if !validQuotaKey(key) {
			slog.WarnContext(ctx, "account: plugin returned an invalid quota window key", "plugin", bt.Plugin.Key, "key", key)
			continue
		}
		sw := store.QuotaWindow{Utilization: w.GetUtilization(), Status: manifest.NormalizeQuotaStatus(w.GetStatus()),
			Used: w.GetUsed(), Limit: w.GetLimit()}
		if sw.Utilization <= 0 && sw.Limit > 0 && sw.Used > 0 {
			sw.Utilization = float64(sw.Used) / float64(sw.Limit) * 100
		}
		if sw.Utilization < 0 {
			sw.Utilization = 0
		}
		if r := w.GetResetsAtUnix(); r > 0 {
			t := time.Unix(r, 0).UTC()
			sw.ResetsAt = &t
		}
		windows[key] = sw
	}
	if err := s.d.DB.SaveAccountQuota(ctx, a.ID, store.QuotaActive, windows); err != nil {
		return "store: " + err.Error()
	}
	return ""
}

// validQuotaKey mirrors the manifest rule for window keys.
func validQuotaKey(k string) bool {
	if k == "" || len(k) > 32 {
		return false
	}
	for i, r := range k {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
		case r == '_' && i > 0:
		default:
			return false
		}
	}
	return true
}

// sendQuotaRequest sends the request the plugin built through the account's
// proxy (behind netguard for a direct connection) and collects what the
// plugin needs to read the answer. A failure is not an error: the plugin is
// shown the transport error, as ClassifyError is.
func (s *Service) sendQuotaRequest(ctx context.Context, b *pluginv1.BuildQuotaRequestResponse, proxyID *int64) *pluginv1.ParseQuotaResponseRequest {
	out := &pluginv1.ParseQuotaResponseRequest{}
	u, err := url.Parse(b.GetUrl())
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		out.TransportError = "plugin built an invalid quota URL"
		return out
	}
	if err := s.guardUpstream(ctx, u, proxyID != nil); err != nil {
		out.TransportError = err.Error()
		return out
	}
	method := strings.ToUpper(b.GetMethod())
	if method == "" {
		method = http.MethodGet
	}
	var body io.Reader
	if b.GetBodyJson() != "" {
		body = strings.NewReader(b.GetBodyJson())
	}
	req, err := http.NewRequestWithContext(ctx, method, u.String(), body)
	if err != nil {
		out.TransportError = transportError(upstreamAddr(u), err)
		return out
	}
	for k, v := range b.GetHeaders() {
		req.Header.Set(k, v)
	}
	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}
	hc, err := s.d.Proxies.HTTPClient(ctx, proxyID)
	if err != nil {
		out.TransportError = core.AsError(err).Message
		return out
	}
	resp, err := hc.Do(req)
	if err != nil {
		out.TransportError = transportError(upstreamAddr(u), err)
		return out
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, maxQuotaBody+1))
	if len(raw) > maxQuotaBody {
		raw, out.Truncated = raw[:maxQuotaBody], true
	}
	out.Status, out.Body = int32(resp.StatusCode), raw
	out.Headers = map[string]string{}
	for k, v := range resp.Header {
		if len(v) > 0 {
			out.Headers[strings.ToLower(k)] = v[0]
		}
	}
	return out
}

// ---------------------------------------------------------------- passive samples

// ObserveQuotaHeaders implements core.QuotaObserver: it reads the declared
// quota headers of one gateway upstream response (2xx, 429, or the 101 of a
// WebSocket handshake) and queues them for the throttled writer. Cheap and
// non-blocking.
func (s *Service) ObserveQuotaHeaders(accountID int64, decls []manifest.QuotaHeader, status int, h http.Header) {
	if len(decls) == 0 || (status != http.StatusTooManyRequests && status != http.StatusSwitchingProtocols && (status < 200 || status > 299)) {
		return
	}
	now := time.Now()
	readings := manifest.ReadQuotaHeaders(decls, h.Get, now)
	if len(readings) == 0 {
		return
	}
	windows := make(map[string]store.QuotaWindow, len(readings))
	for _, r := range readings {
		windows[r.Key] = store.QuotaWindow{Utilization: r.Utilization, ResetsAt: r.ResetsAt, Status: r.Status}
	}
	s.quota.observe(accountID, windows, now)
}

var _ core.QuotaObserver = (*Service)(nil)

// quotaRecorder throttles passive quota writes per account on this node: at
// most one write every quotaPassiveInterval, except that a window changing
// status (allowed -> rejected and back) is written at once. Samples arriving
// in between are merged and written by the next flush, so the last sample of
// a burst is never lost.
type quotaRecorder struct {
	save func(ctx context.Context, accountID int64, windows map[string]store.QuotaWindow) error

	mu      sync.Mutex
	entries map[int64]*quotaEntry
	kick    chan struct{}
}

type quotaEntry struct {
	pending   map[string]store.QuotaWindow // nil = nothing to write
	status    map[string]string            // last status seen per window
	urgent    bool
	lastWrite time.Time
	seen      time.Time
}

func newQuotaRecorder(save func(context.Context, int64, map[string]store.QuotaWindow) error) *quotaRecorder {
	return &quotaRecorder{save: save, entries: map[int64]*quotaEntry{}, kick: make(chan struct{}, 1)}
}

// observe merges one sample into the account's pending write and wakes the
// writer when the write is due.
func (r *quotaRecorder) observe(accountID int64, windows map[string]store.QuotaWindow, now time.Time) {
	r.mu.Lock()
	e := r.entries[accountID]
	if e == nil {
		e = &quotaEntry{status: map[string]string{}}
		r.entries[accountID] = e
	}
	if e.pending == nil {
		e.pending = make(map[string]store.QuotaWindow, len(windows))
	}
	for k, w := range windows {
		if prev, ok := e.status[k]; ok && prev != w.Status {
			e.urgent = true
		}
		e.status[k] = w.Status
		e.pending[k] = w
	}
	e.seen = now
	due := e.urgent || now.Sub(e.lastWrite) >= quotaPassiveInterval
	r.mu.Unlock()
	if due {
		select {
		case r.kick <- struct{}{}:
		default:
		}
	}
}

// take removes and returns the pending writes that are due (all of them
// when all is set), and forgets accounts idle for quotaIdle.
func (r *quotaRecorder) take(now time.Time, all bool) map[int64]map[string]store.QuotaWindow {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := map[int64]map[string]store.QuotaWindow{}
	for id, e := range r.entries {
		if e.pending == nil {
			if now.Sub(e.seen) > quotaIdle {
				delete(r.entries, id)
			}
			continue
		}
		if all || e.urgent || now.Sub(e.lastWrite) >= quotaPassiveInterval {
			out[id] = e.pending
			e.pending, e.urgent, e.lastWrite = nil, false, now
		}
	}
	return out
}

// flush writes the due samples. A failed write is logged and dropped: the
// next sample supersedes it.
func (r *quotaRecorder) flush(ctx context.Context, all bool) {
	for id, w := range r.take(time.Now(), all) {
		if err := r.save(ctx, id, w); err != nil {
			slog.WarnContext(ctx, "account: save passive quota", "account", id, "err", err)
		}
	}
}

// run writes due samples on wake-ups and every quotaFlushTick until ctx is
// done, then writes what is left.
func (r *quotaRecorder) run(ctx context.Context) {
	tk := time.NewTicker(quotaFlushTick)
	defer tk.Stop()
	for {
		select {
		case <-ctx.Done():
			fctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			r.flush(fctx, true)
			cancel()
			return
		case <-r.kick:
			r.flush(ctx, false)
		case <-tk.C:
			r.flush(ctx, false)
		}
	}
}

// ---------------------------------------------------------------- reset status

// resetStatus is POST /accounts/:id/reset-status, sub2api's ClearRateLimit:
// it clears the runtime scheduling block of the account - the Redis cooldown
// the gateway sets on rate limits, overloads and failures (one key holds all
// of them here) - so the account is scheduled again at once. Like sub2api it
// does not touch the account status: an account disabled by the gateway
// (CONTRACTS §42) or by an administrator stays disabled (enable it with
// PATCH status=active), and the quota snapshot is left as observed.
func (s *Service) resetStatus(c *gin.Context) {
	ctx := audit.Context(c)
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	scope := core.OwnerScope(ctx, "account:update")
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, scope, false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	cleared := false
	if s.d.Redis != nil {
		n, err := s.d.Redis.Del(ctx, cooldownKey(id)).Result()
		if err != nil {
			httpapi.Fail(c, core.ErrUnavailable.WithCause(err))
			return
		}
		cleared = n > 0
	}
	uid, _ := core.UserID(ctx)
	err = s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		if err := audit.Audit(ctx, tx, uid, "account.reset_status", "account", itoa(id),
			map[string]any{"cooldown_cleared": cleared}); err != nil {
			return err
		}
		if !cleared {
			return nil
		}
		// The account leaves the "cooldown" state it entered with
		// account.status_changed (SetCooldown); report the way out the same way.
		return s.d.Events.Emit(ctx, tx, core.Event{Type: core.EventAccountStatusChanged,
			Payload: statusPayload(id, a.PluginKey, a.Type, a.Name, a.Status, "status reset by administrator", nil)})
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.changed(ctx, id)
	v, err := s.fullView(ctx, id, scope)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

package account

import (
	"context"
	"fmt"
	"math"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type optionalQuotaPlugin struct {
	*runtimeQuotaPlugin
	mode   string
	builds atomic.Int32
}

func (p *optionalQuotaPlugin) BuildQuotaRequest(ctx context.Context, in *pluginv1.BuildQuotaRequestRequest) (*pluginv1.BuildQuotaRequestResponse, error) {
	p.builds.Add(1)
	if p.mode == "builder" {
		return nil, status.Error(codes.Unimplemented, "optional builder absent")
	}
	return p.runtimeQuotaPlugin.BuildQuotaRequest(ctx, in)
}

func (p *optionalQuotaPlugin) ParseQuotaResponse(context.Context, *pluginv1.ParseQuotaResponseRequest) (*pluginv1.QuotaResult, error) {
	if p.mode == "parser" {
		return nil, status.Error(codes.Unimplemented, "optional parser absent")
	}
	return &pluginv1.QuotaResult{}, nil
}

func TestQuotaOptionalReaderAbsentPreservesObservations(t *testing.T) {
	for _, mode := range []string{"builder", "parser"} {
		for _, observed := range []bool{false, true} {
			for _, automatic := range []bool{false, true} {
				t.Run(fmt.Sprintf("%s/observed=%t/automatic=%t", mode, observed, automatic), func(t *testing.T) {
					e := setup(t)
					e.withQuota(&manifest.AccountQuota{Query: true, AutoRefresh: automatic})
					p := &optionalQuotaPlugin{runtimeQuotaPlugin: &runtimeQuotaPlugin{fakePlatform: e.plat}, mode: mode}
					e.gen.types[0].Client = p
					e.svc.d.LifecycleResources = map[string]core.AccountLifecycleResource{"anthropic": &quotaRuntimeFixture{}}
					id := e.mkRawAccount("anthropic", "apikey", "optional", "sk-good-key-123", true)
					require.NoError(t, store.EnsureAccountQuota(t.Context(), e.db.Pool, id, quotaPluginRevision(e.gen.types[0]), automatic))
					if observed {
						require.NoError(t, e.db.SaveAccountQuota(t.Context(), id, store.QuotaPassive, map[string]store.QuotaWindow{"daily": {Utilization: 100, Status: "rejected"}}))
						require.NoError(t, e.db.SetAccountQuotaError(t.Context(), id, "previous error"))
					}
					before, err := e.db.AccountQuota(t.Context(), id)
					require.NoError(t, err)
					path := fmt.Sprintf("/accounts/%d/quota", id)
					code, _ := e.do("GET", path+"?force=true", nil)
					require.Equal(t, 200, code)
					after, err := e.db.AccountQuota(t.Context(), id)
					require.NoError(t, err)
					require.Equal(t, before.Windows, after.Windows)
					require.Equal(t, before.UpdatedAt, after.UpdatedAt)
					require.Equal(t, before.LastPassiveAt, after.LastPassiveAt)
					require.Equal(t, before.Source, after.Source)
					require.Equal(t, before.Error, after.Error)
					require.Equal(t, before.RefreshStatus, after.RefreshStatus)
					require.Equal(t, before.Revision, after.Revision)
					require.Equal(t, before.Generation, after.Generation)
					require.NotNil(t, after.LastActiveAt)
					require.NotNil(t, after.NextCheckAt)
					require.True(t, after.NextCheckAt.After(time.Now().Add(quotaFresh-5*time.Second)))
					var lease *time.Time
					var failures int
					require.NoError(t, e.db.Pool.QueryRow(t.Context(), `SELECT lease_until,failures FROM account_quota_snapshots WHERE account_id=$1`, id).Scan(&lease, &failures))
					require.Nil(t, lease)
					require.Zero(t, failures)
					e.do("GET", path+"?force=true", nil)
					require.EqualValues(t, 2, p.builds.Load(), "manual refresh has no cooldown even when the optional reader is absent")
					retried, err := e.db.AccountQuota(t.Context(), id)
					require.NoError(t, err)
					require.Equal(t, after.Windows, retried.Windows)
					require.Equal(t, after.UpdatedAt, retried.UpdatedAt)
					require.Equal(t, after.Error, retried.Error)
					_, err = e.db.Pool.Exec(t.Context(), `UPDATE account_quota_snapshots SET last_active_at=now()-interval '31 seconds' WHERE account_id=$1`, id)
					require.NoError(t, err)
					e.do("GET", path, nil)
					require.NoError(t, e.svc.sweepQuotas(t.Context()))
					require.EqualValues(t, 2, p.builds.Load(), "non-forced reads and automatic refresh still respect the schedule")
				})
			}
		}
	}
}

func TestQuotaSuccessfulEmptyWindowsPreservesMissing(t *testing.T) {
	e := setup(t)
	e.withQuota(&manifest.AccountQuota{Query: true})
	p := &optionalQuotaPlugin{runtimeQuotaPlugin: &runtimeQuotaPlugin{fakePlatform: e.plat}, mode: "empty"}
	e.gen.types[0].Client = p
	e.svc.d.LifecycleResources = map[string]core.AccountLifecycleResource{"anthropic": &quotaRuntimeFixture{}}
	id := e.mkRawAccount("anthropic", "apikey", "empty", "sk-good-key-123", true)
	windows := map[string]store.QuotaWindow{"daily": {Utilization: 100, Status: "rejected"}, "weekly": {Utilization: 20}}
	require.NoError(t, e.db.SaveAccountQuota(t.Context(), id, store.QuotaPassive, windows))
	require.NoError(t, e.db.SetAccountQuotaError(t.Context(), id, "previous error"))
	before, err := e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	code, _ := e.do("GET", fmt.Sprintf("/accounts/%d/quota?force=true", id), nil)
	require.Equal(t, 200, code)
	after, err := e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.Equal(t, windows, after.Windows)
	require.Equal(t, store.QuotaActive, after.Source)
	require.Empty(t, after.Error)
	require.True(t, after.UpdatedAt.After(*before.UpdatedAt))
	_, err = normalizedQuota(&pluginv1.QuotaResult{ErrorType: pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT})
	require.EqualError(t, err, "transient: quota query failed")
	// The plugin's reason follows the kind: one line, bounded.
	_, err = normalizedQuota(&pluginv1.QuotaResult{ErrorType: pluginv1.QuotaResult_ERROR_TYPE_AUTH_REJECTED, ErrorMessage: " token_revoked:\n refused\x00 here "})
	require.EqualError(t, err, "auth_rejected: token_revoked: refused here")
	_, err = normalizedQuota(&pluginv1.QuotaResult{ErrorType: pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT, ErrorMessage: strings.Repeat("é", 200)})
	require.Equal(t, "transient: "+strings.Repeat("é", 128), err.Error())
}

func TestQuotaAutomaticRecordingLifecycleAndRenewal(t *testing.T) {
	e := setup(t)
	up := newQuotaUpstream(t)
	up.pct.Store(100)
	e.plat.quotaURL = up.srv.URL
	e.withQuota(&manifest.AccountQuota{Query: true, AutoRefresh: true})
	_, err := e.db.Pool.Exec(t.Context(), `INSERT INTO plugins(key,name,status) VALUES('anthropic','{"en":"Fixture"}','enabled')`)
	require.NoError(t, err)
	e.gen.types[0].Type.Lifecycle = &manifest.AccountLifecycle{}
	e.gen.types[0].Client = &preparationPlugin{fakePlatform: e.plat}
	e.svc.d.LifecycleResources = map[string]core.AccountLifecycleResource{"anthropic": &preparationResource{}}
	code, out := e.do("POST", "/accounts", map[string]any{"name": "automatic", "plugin_key": "anthropic", "type": "apikey", "credentials": map[string]any{"api_key": "sk-good-key-123"}})
	require.Equal(t, 201, code, fmt.Sprint(out))
	id := int64(data(out)["id"].(float64))
	snap, err := e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.NotNil(t, snap)
	require.Equal(t, "pending", snap.RefreshStatus)
	require.Nil(t, snap.UpdatedAt)
	require.Zero(t, up.calls.Load())
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.Zero(t, up.calls.Load())
	require.NoError(t, e.svc.deliverAccountLifecycle(t.Context(), id, "anthropic", core.EventAccountCreated, nil))
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.EqualValues(t, 1, up.calls.Load())
	snap, err = e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.Equal(t, "ready", snap.RefreshStatus)
	require.NotNil(t, snap.NextCheckAt)
	require.NoError(t, e.svc.SetCooldown(t.Context(), id, time.Now().Add(time.Hour), "manual hold"))
	code, _ = e.do("PATCH", fmt.Sprintf("/accounts/%d", id), map[string]any{"name": "renamed"})
	require.Equal(t, 200, code)
	require.NoError(t, e.svc.deliverAccountLifecycle(t.Context(), id, "anthropic", core.EventAccountUpdated, []string{"name"}))
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.EqualValues(t, 1, up.calls.Load())
	_, err = e.db.Pool.Exec(t.Context(), `UPDATE account_quota_snapshots SET next_check_at=now()-interval '1 second',last_active_at=now()-interval '31 seconds' WHERE account_id=$1`, id)
	require.NoError(t, err)
	up.failStatus.Store(503)
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.EqualValues(t, 2, up.calls.Load())
	snap, err = e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.Equal(t, "error", snap.RefreshStatus)
	require.NotEmpty(t, snap.Error)
	require.Equal(t, float64(100), snap.Windows["5h"].Utilization)
	require.True(t, snap.NextCheckAt.After(time.Now().Add(50*time.Second)))
	require.True(t, e.mr.Exists(cooldownKey(id)))
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.EqualValues(t, 2, up.calls.Load())
	var state string
	var schedulable bool
	require.NoError(t, e.db.Pool.QueryRow(t.Context(), `SELECT status,schedulable FROM accounts WHERE id=$1`, id).Scan(&state, &schedulable))
	require.Equal(t, "active", state)
	require.True(t, schedulable)
}

func TestQuotaInitialRecordingWithSchedulingOff(t *testing.T) {
	e := setup(t)
	up := newQuotaUpstream(t)
	up.failStatus.Store(503)
	e.plat.quotaURL = up.srv.URL
	e.withQuota(&manifest.AccountQuota{Query: true, AutoRefresh: true})
	_, err := e.db.Pool.Exec(t.Context(), `INSERT INTO plugins(key,name,status,active_version) VALUES('anthropic','{"en":"Fixture"}','enabled','0.1.0')`)
	require.NoError(t, err)
	e.gen.types[0].Type.Lifecycle = &manifest.AccountLifecycle{}
	e.gen.types[0].Client = &preparationPlugin{fakePlatform: e.plat}
	e.svc.d.LifecycleResources = map[string]core.AccountLifecycleResource{"anthropic": &preparationResource{}}
	code, out := e.do("POST", "/accounts", map[string]any{"name": "initial-off", "plugin_key": "anthropic", "type": "apikey", "schedulable": false, "credentials": map[string]any{"api_key": "sk-good-key-123"}})
	require.Equal(t, 201, code, fmt.Sprint(out))
	id := int64(data(out)["id"].(float64))
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.Zero(t, up.calls.Load())
	require.NoError(t, e.svc.deliverAccountLifecycle(t.Context(), id, "anthropic", core.EventAccountCreated, nil))
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.EqualValues(t, 1, up.calls.Load())
	snap, err := e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.Equal(t, "error", snap.RefreshStatus)
	require.Nil(t, snap.UpdatedAt)
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.EqualValues(t, 1, up.calls.Load())
	_, err = e.db.Pool.Exec(t.Context(), `UPDATE account_quota_snapshots SET next_check_at=now()-interval '1 second',last_active_at=now()-interval '31 seconds' WHERE account_id=$1`, id)
	require.NoError(t, err)
	up.failStatus.Store(0)
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.EqualValues(t, 2, up.calls.Load())
	_, err = e.db.Pool.Exec(t.Context(), `UPDATE account_quota_snapshots SET next_check_at=now()-interval '1 second',last_active_at=now()-interval '31 seconds' WHERE account_id=$1`, id)
	require.NoError(t, err)
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.EqualValues(t, 2, up.calls.Load())
	var state string
	var schedulable bool
	require.NoError(t, e.db.Pool.QueryRow(t.Context(), `SELECT status,schedulable FROM accounts WHERE id=$1`, id).Scan(&state, &schedulable))
	require.Equal(t, "active", state)
	require.False(t, schedulable)
}

func TestQuotaAutomaticInactiveAndAdmission(t *testing.T) {
	e := setup(t)
	up := newQuotaUpstream(t)
	e.plat.quotaURL = up.srv.URL
	e.withQuota(&manifest.AccountQuota{Query: true, AutoRefresh: true})
	id := e.mkRawAccount("anthropic", "apikey", "active", "sk-good-key-123", true)
	off := e.mkRawAccount("anthropic", "apikey", "off", "sk-good-key-123", false)
	e.svc.d.CanWork = func() bool { return false }
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.Zero(t, up.calls.Load())
	e.svc.d.CanWork = func() bool { return true }
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	require.EqualValues(t, 1, up.calls.Load())
	snapshots, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id, off})
	require.NoError(t, err)
	require.NotNil(t, snapshots[id])
	require.Nil(t, snapshots[off])
	require.EqualValues(t, 1, up.calls.Load())
}

type heldQuotaPlugin struct {
	*runtimeQuotaPlugin
	started chan struct{}
	release chan struct{}
	once    sync.Once
}

func (p *heldQuotaPlugin) ParseQuotaResponse(ctx context.Context, in *pluginv1.ParseQuotaResponseRequest) (*pluginv1.QuotaResult, error) {
	p.once.Do(func() { close(p.started) })
	<-p.release
	return &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "daily", Utilization: 100, Status: "rejected"}}}, nil
}

func TestQuotaInitialFailureAndStaleAuthResult(t *testing.T) {
	e := setup(t)
	e.withQuota(&manifest.AccountQuota{Query: true, AutoRefresh: true})
	id := e.mkRawAccount("anthropic", "apikey", "race", "sk-good-key-123", true)
	p := &heldQuotaPlugin{runtimeQuotaPlugin: &runtimeQuotaPlugin{fakePlatform: e.plat}, started: make(chan struct{}), release: make(chan struct{})}
	e.gen.types[0].Client = p
	e.svc.d.LifecycleResources = map[string]core.AccountLifecycleResource{"anthropic": &quotaRuntimeFixture{}}
	done := make(chan error, 1)
	go func() { done <- e.svc.sweepQuotas(t.Context()) }()
	<-p.started
	_, err := e.db.Pool.Exec(t.Context(), `UPDATE accounts SET credentials_enc=$2 WHERE id=$1`, id, []byte("changed"))
	require.NoError(t, err)
	close(p.release)
	require.NoError(t, <-done)
	snap, err := e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.Empty(t, snap.Windows)
	require.Nil(t, snap.UpdatedAt)
	require.Equal(t, "pending", snap.RefreshStatus)
	_, err = e.db.Pool.Exec(t.Context(), `UPDATE account_quota_snapshots SET last_active_at=now()-interval '31 seconds' WHERE account_id=$1`, id)
	require.NoError(t, err)
	require.NoError(t, e.svc.sweepQuotas(t.Context()))
	snap, err = e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.Equal(t, "error", snap.RefreshStatus)
	require.Nil(t, snap.UpdatedAt)
	var schedulable bool
	require.NoError(t, e.db.Pool.QueryRow(t.Context(), `SELECT schedulable FROM accounts WHERE id=$1`, id).Scan(&schedulable))
	require.True(t, schedulable)
}

func quotaObservationGeneration(t *testing.T, e *env, id int64) int64 {
	t.Helper()
	e.withQuota(&manifest.AccountQuota{Query: true})
	binding := e.gen.types[0]
	_, err := e.db.Pool.Exec(t.Context(), `INSERT INTO plugins(key,name,status,active_version) VALUES($1,'{"en":"Fixture"}','enabled',$2) ON CONFLICT(key) DO NOTHING`, binding.Plugin.Key, binding.Plugin.Version)
	require.NoError(t, err)
	require.NoError(t, store.EnsureAccountQuota(t.Context(), e.db.Pool, id, quotaPluginRevision(binding), false))
	snapshot, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Positive(t, snapshot[id].Generation)
	return snapshot[id].Generation
}

func TestQuotaObservationValidationAndMissingWindows(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "facts", "sk-good-key-123", true)
	generation := quotaObservationGeneration(t, e, id)
	observation := func(key string, pct float64) *pluginv1.QuotaResult {
		return &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: key, Utilization: pct, Status: "rejected"}}}
	}
	require.NoError(t, e.svc.ApplyAccountQuotaObservation(t.Context(), id, generation, observation("weekly", 100)))
	first, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.NoError(t, e.svc.ApplyAccountQuotaObservation(t.Context(), id, generation, observation("daily", 30)))
	second, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Len(t, second[id].Windows, 2)
	require.Greater(t, second[id].Revision, first[id].Revision)
	require.Zero(t, second[id].UpdatedAtUnix)
	require.Equal(t, generation, second[id].Generation)
	require.NoError(t, e.svc.ApplyAccountQuotaObservation(t.Context(), id, generation, &pluginv1.QuotaResult{}))
	for _, bad := range []*pluginv1.QuotaResult{nil, observation("bad/key", 1), observation("daily", math.NaN()), observation("daily", math.Inf(1)), observation("daily", -1)} {
		require.Error(t, e.svc.ApplyAccountQuotaObservation(t.Context(), id, generation, bad))
	}
	after, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Equal(t, second[id].Revision, after[id].Revision)
}

type zeroQuotaPlugin struct{ *runtimeQuotaPlugin }

func (p *zeroQuotaPlugin) ParseQuotaResponse(context.Context, *pluginv1.ParseQuotaResponseRequest) (*pluginv1.QuotaResult, error) {
	return &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "scoped", Utilization: 0, Status: "allowed"}}}, nil
}

func TestQuotaUnknownScopedObservationRoundTrip(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "unknown", "sk-good-key-123", true)
	generation := quotaObservationGeneration(t, e, id)
	require.NoError(t, e.db.SaveAccountQuota(t.Context(), id, store.QuotaActive, map[string]store.QuotaWindow{"shared": {Utilization: 20, Status: "allowed"}, "scoped": {Utilization: 60}}))
	before, err := e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	result := &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "scoped", Status: "rejected", UtilizationUnknown: true}}}
	require.NoError(t, e.svc.ApplyAccountQuotaObservation(t.Context(), id, generation, result))
	stored, err := e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.Equal(t, before.Windows["shared"], stored.Windows["shared"])
	require.Equal(t, before.UpdatedAt, stored.UpdatedAt)
	for _, known := range []bool{false, true} {
		if known {
			e.gen.types[0].Client = &zeroQuotaPlugin{runtimeQuotaPlugin: &runtimeQuotaPlugin{fakePlatform: e.plat}}
			e.svc.d.LifecycleResources = map[string]core.AccountLifecycleResource{"anthropic": &quotaRuntimeFixture{}}
			code, out := e.do("GET", fmt.Sprintf("/accounts/%d/quota?force=true", id), nil)
			require.Equal(t, 200, code, fmt.Sprint(out))
		}
		snapshots, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
		require.NoError(t, err)
		require.Len(t, snapshots[id].Windows, 2)
		var scoped *pluginv1.QuotaWindow
		for _, window := range snapshots[id].Windows {
			if window.Key == "scoped" {
				scoped = window
			}
		}
		require.NotNil(t, scoped)
		require.Equal(t, !known, scoped.UtilizationUnknown)
		require.Zero(t, scoped.Utilization)
		require.Zero(t, scoped.Used)
		require.Zero(t, scoped.Limit)
		expectedStatus := "rejected"
		if known {
			expectedStatus = "allowed"
		}
		require.Equal(t, expectedStatus, scoped.Status)
		var storedUnknown bool
		require.NoError(t, e.db.Pool.QueryRow(t.Context(), `SELECT COALESCE((windows->'scoped'->>'utilization_unknown')::boolean,false) FROM account_quota_snapshots WHERE account_id=$1`, id).Scan(&storedUnknown))
		require.Equal(t, !known, storedUnknown)
		code, out := e.do("GET", fmt.Sprintf("/accounts/%d", id), nil)
		require.Equal(t, 200, code)
		var scopedView map[string]any
		for _, window := range data(out)["quota"].(map[string]any)["windows"].([]any) {
			item := window.(map[string]any)
			if item["key"] == "scoped" {
				scopedView = item
			}
		}
		require.NotNil(t, scopedView)
		require.Equal(t, float64(0), scopedView["utilization"])
		require.Equal(t, expectedStatus, scopedView["status"])
		if known {
			require.NotContains(t, scopedView, "utilization_unknown")
		} else {
			require.Equal(t, true, scopedView["utilization_unknown"])
		}
		current, err := e.db.AccountQuota(t.Context(), id)
		require.NoError(t, err)
		require.Equal(t, before.Windows["shared"], current.Windows["shared"])
	}
}

func TestQuotaUnknownValidationKeepsLegacyScalars(t *testing.T) {
	for _, window := range []*pluginv1.QuotaWindow{
		{Key: "scoped", UtilizationUnknown: true, Utilization: 1},
		{Key: "scoped", UtilizationUnknown: true, Used: 1},
		{Key: "scoped", UtilizationUnknown: true, Limit: 1},
		{Key: "scoped", UtilizationUnknown: true, Used: 1, Limit: 2},
	} {
		_, err := normalizedQuota(&pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{window}})
		require.Error(t, err)
	}
	windows, err := normalizedQuota(&pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "legacy", Used: 1, Limit: 4}, {Key: "unknown", Status: "rejected", UtilizationUnknown: true}}})
	require.NoError(t, err)
	require.Equal(t, float64(25), windows["legacy"].Utilization)
	require.Zero(t, windows["unknown"].Utilization)
	require.Zero(t, windows["unknown"].Used)
	require.Zero(t, windows["unknown"].Limit)
}

func TestQuotaSourceGenerationAndReadFailures(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "source-generation", "sk-good-key-123", true)
	generation := quotaObservationGeneration(t, e, id)
	require.NoError(t, e.db.SaveAccountQuota(t.Context(), id, store.QuotaActive, map[string]store.QuotaWindow{"daily": {Utilization: 70, Status: "allowed"}}))
	require.NoError(t, store.ResetAccountQuota(t.Context(), e.db.Pool, id))
	require.NoError(t, e.db.SaveAccountQuota(t.Context(), id, store.QuotaActive, map[string]store.QuotaWindow{"daily": {Utilization: 40, Status: "allowed"}}))
	fresh, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.NotEqual(t, generation, fresh[id].Generation)
	for _, expected := range []int64{0, -1, generation} {
		for _, window := range []*pluginv1.QuotaWindow{{Key: "daily", Utilization: 100, Status: "rejected"}, {Key: "daily", Utilization: 0, Status: "allowed"}} {
			require.NoError(t, e.svc.ApplyAccountQuotaObservation(t.Context(), id, expected, &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{window}}))
		}
	}
	after, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Equal(t, fresh, after)
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	failed, err := e.svc.AccountQuotaSnapshots(ctx, []int64{id})
	require.Error(t, err)
	require.Nil(t, failed)
	for _, raw := range []string{`{"daily":"invalid"}`, `null`} {
		_, err = e.db.Pool.Exec(t.Context(), `UPDATE account_quota_snapshots SET windows=$2::jsonb WHERE account_id=$1`, id, raw)
		require.NoError(t, err)
		failed, err = e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
		require.Error(t, err)
		require.Nil(t, failed)
	}
}

type boundedQuotaPlugin struct {
	*runtimeQuotaPlugin
	calls  atomic.Int32
	active atomic.Int32
	peak   atomic.Int32
}

func (p *boundedQuotaPlugin) ParseQuotaResponse(ctx context.Context, in *pluginv1.ParseQuotaResponseRequest) (*pluginv1.QuotaResult, error) {
	p.calls.Add(1)
	active := p.active.Add(1)
	defer p.active.Add(-1)
	for {
		old := p.peak.Load()
		if active <= old || p.peak.CompareAndSwap(old, active) {
			break
		}
	}
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(5 * time.Millisecond):
	}
	return &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "daily", Utilization: 20}}, NextCheckAtUnix: time.Now().Add(time.Hour).Unix()}, nil
}

func TestQuotaSweepBoundedAcrossNodes(t *testing.T) {
	e := setup(t)
	e.svc.d.CanWork = func() bool { return false }
	e.withQuota(&manifest.AccountQuota{Query: true, AutoRefresh: true})
	p := &boundedQuotaPlugin{runtimeQuotaPlugin: &runtimeQuotaPlugin{fakePlatform: e.plat}}
	e.gen.types[0].Client = p
	runtime := &quotaRuntimeFixture{}
	for i := range quotaSweepPage + 2 {
		e.mkRawAccount("anthropic", "apikey", fmt.Sprintf("bounded-%d", i), "sk-good-key-123", true)
	}
	deps := e.svc.d
	deps.CanWork = func() bool { return true }
	deps.LifecycleResources = map[string]core.AccountLifecycleResource{"anthropic": runtime}
	one, two := New(deps), New(deps)
	errs := make(chan error, 2)
	go func() { errs <- one.sweepQuotas(t.Context()) }()
	go func() { errs <- two.sweepQuotas(t.Context()) }()
	require.NoError(t, <-errs)
	require.NoError(t, <-errs)
	require.EqualValues(t, quotaSweepPage, p.calls.Load())
	require.LessOrEqual(t, p.peak.Load(), int32(8))
	require.NoError(t, one.sweepQuotas(t.Context()))
	require.EqualValues(t, quotaSweepPage+2, p.calls.Load())
}

func TestQuotaObservationSupersedesQueuedSample(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "queued", "sk-good-key-123", true)
	generation := quotaObservationGeneration(t, e, id)
	e.svc.quota.observe(id, map[string]store.QuotaWindow{"daily": {Utilization: 0}, "weekly": {Utilization: 12}}, time.Now())
	require.NoError(t, e.svc.ApplyAccountQuotaObservation(t.Context(), id, generation, &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "daily", Utilization: 100, Status: "rejected"}}}))
	e.svc.quota.flush(t.Context(), true)
	snap, err := e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.Equal(t, float64(100), snap.Windows["daily"].Utilization)
	require.Equal(t, float64(12), snap.Windows["weekly"].Utilization)
}

type cancellableQuotaPlugin struct {
	*runtimeQuotaPlugin
	started chan struct{}
}

func (p *cancellableQuotaPlugin) ParseQuotaResponse(ctx context.Context, in *pluginv1.ParseQuotaResponseRequest) (*pluginv1.QuotaResult, error) {
	close(p.started)
	<-ctx.Done()
	return nil, ctx.Err()
}

func TestQuotaSweepCancellation(t *testing.T) {
	for _, reason := range []string{"shutdown", "deleted", "plugin_disabled"} {
		t.Run(reason, func(t *testing.T) {
			e := setup(t)
			e.svc.d.CanWork = func() bool { return false }
			e.withQuota(&manifest.AccountQuota{Query: true, AutoRefresh: true})
			_, err := e.db.Pool.Exec(t.Context(), `INSERT INTO plugins(key,name,status) VALUES('anthropic','{"en":"Test"}','enabled')`)
			require.NoError(t, err)
			p := &cancellableQuotaPlugin{runtimeQuotaPlugin: &runtimeQuotaPlugin{fakePlatform: e.plat}, started: make(chan struct{})}
			e.gen.types[0].Client = p
			id := e.mkRawAccount("anthropic", "apikey", "cancel", "sk-good-key-123", true)
			deps := e.svc.d
			deps.CanWork = func() bool { return true }
			deps.LifecycleResources = map[string]core.AccountLifecycleResource{"anthropic": &quotaRuntimeFixture{}}
			worker := New(deps)
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			done := make(chan error, 1)
			go func() { done <- worker.sweepQuotas(ctx) }()
			<-p.started
			switch reason {
			case "shutdown":
				cancel()
			case "deleted":
				_, err = e.db.Pool.Exec(t.Context(), `UPDATE accounts SET deleted_at=now() WHERE id=$1`, id)
			case "plugin_disabled":
				_, err = e.db.Pool.Exec(t.Context(), `UPDATE plugins SET status='disabled' WHERE key='anthropic'`)
			}
			require.NoError(t, err)
			select {
			case <-done:
			case <-time.After(3 * time.Second):
				t.Fatal("quota work was not cancelled")
			}
			snap, err := e.db.AccountQuota(t.Context(), id)
			require.NoError(t, err)
			require.Empty(t, snap.Windows)
			require.Nil(t, snap.UpdatedAt)
		})
	}
}

func TestQuotaNextCheckBounds(t *testing.T) {
	now := time.Now()
	require.Equal(t, now.Add(quotaQueryFloor), quotaNextCheck(now, &pluginv1.QuotaResult{NextCheckAtUnix: now.Add(-time.Hour).Unix()}, 0, false))
	require.Equal(t, now.Add(24*time.Hour), quotaNextCheck(now, &pluginv1.QuotaResult{NextCheckAtUnix: now.Add(48 * time.Hour).Unix()}, 0, false))
	require.Equal(t, now.Add(30*time.Minute), quotaNextCheck(now, nil, 100, true))
}

func TestQuotaGenericModuleHasNoProviderBranches(t *testing.T) {
	for _, path := range []string{"quota.go", "quota_refresh.go"} {
		raw, err := os.ReadFile(path)
		require.NoError(t, err)
		for _, line := range strings.Split(string(raw), "\n") {
			if strings.HasPrefix(strings.TrimSpace(line), "//") {
				continue
			}
			for _, name := range []string{"ccgateway", "anthropic", "sonnet", "fable"} {
				require.NotContains(t, strings.ToLower(line), name, path)
			}
		}
	}
}

func TestQuotaClaimAcrossNodesAndPassiveWins(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "nodes", "sk-good-key-123", true)
	quotaObservationGeneration(t, e, id)
	require.NoError(t, store.EnsureAccountQuota(t.Context(), e.db.Pool, id, "v1", true))
	var wins atomic.Int32
	var winner *store.QuotaClaim
	var wg sync.WaitGroup
	for range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c, err := e.db.LeaseAccountQuota(t.Context(), id, "v1", quotaQueryFloor, time.Minute, false)
			if err != nil {
				t.Error(err)
			}
			if c != nil {
				winner = c
				wins.Add(1)
			}
		}()
	}
	wg.Wait()
	require.EqualValues(t, 1, wins.Load())
	generation := winner.Generation
	require.NoError(t, e.svc.ApplyAccountQuotaObservation(t.Context(), id, generation, &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "daily", Utilization: 100, Status: "rejected"}}}))
	applied, err := e.db.CompleteAccountQuota(t.Context(), winner, map[string]store.QuotaWindow{"daily": {Utilization: 0}}, "", time.Now().Add(time.Minute))
	require.NoError(t, err)
	require.True(t, applied)
	snap, err := e.db.AccountQuota(t.Context(), id)
	require.NoError(t, err)
	require.Equal(t, float64(100), snap.Windows["daily"].Utilization)
	require.Equal(t, "rejected", snap.Windows["daily"].Status)
}

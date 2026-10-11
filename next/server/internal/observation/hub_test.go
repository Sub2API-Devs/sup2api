package observation

import (
	"context"
	"net"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	contract "github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/account"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type testGeneration struct {
	core.Generation
	bindings []core.ObservationBinding
}

func (g testGeneration) Observers() []core.ObservationBinding { return g.bindings }

type testRegistry struct {
	core.PluginRegistry
	gen core.Generation
}

func (r testRegistry) Current() core.Generation              { return r.gen }
func (r testRegistry) OnChange(func(core.Generation)) func() { return func() {} }

type testObserver func(context.Context, *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error)

func (f testObserver) OnObservations(ctx context.Context, in *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error) {
	return f(ctx, in)
}

type remoteObserver struct {
	client pluginv1.ObservationServiceClient
}

func (r remoteObserver) OnObservations(ctx context.Context, in *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error) {
	return r.client.OnObservations(ctx, in)
}

func builtin() Consumer {
	return Consumer{Namespace: contract.CoreNamespace, AllAccounts: true, Phases: []string{contract.UsageFinalized},
		Metrics: []string{contract.SuccessRequests, contract.SuccessTokens, contract.PendingUsage}, Client: account.StatsConsumer{}}
}

func event(id string, account int64, plugin string) *pluginv1.RequestObservation {
	now := time.Now().UnixMilli()
	return &pluginv1.RequestObservation{Id: id, RequestId: id, Phase: contract.UsageFinalized, AccountId: account, AccountPluginKey: plugin,
		OccurredAtUnixMs: now, CompletedAtUnixMs: now, Revision: 1, Success: true, TotalTokens: 80}
}

func TestObservationCoreAndSDKShareWindowEngine(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	store := account.NewStats(rdb, nil, nil, nil)
	store.Start()
	var delivered atomic.Int64
	plugin := testObserver(func(_ context.Context, in *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error) {
		out := &pluginv1.ObservationResult{}
		for _, e := range in.Observations {
			delivered.Add(1)
			out.Contributions = append(out.Contributions, &pluginv1.ObservationContribution{ObservationId: e.Id, Metrics: map[string]int64{"custom_units": e.TotalTokens * 2}})
		}
		return out, nil
	})
	listener := bufconn.Listen(1 << 20)
	server := pluginsdk.NewGRPCServer(nil)
	require.NoError(t, pluginsdk.Register(server, plugin, nil, pluginsdk.WithInfo("probe", "1.0.0")))
	go func() { _ = server.Serve(listener) }()
	t.Cleanup(server.Stop)
	t.Cleanup(func() { _ = listener.Close() })
	conn, err := grpc.NewClient("passthrough:///observer", grpc.WithTransportCredentials(insecure.NewCredentials()), grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return listener.DialContext(ctx) }))
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	info, err := pluginv1.NewPluginServiceClient(conn).GetInfo(context.Background(), &pluginv1.GetInfoRequest{})
	require.NoError(t, err)
	require.Contains(t, info.Capabilities, contract.Capability)
	binding := core.ObservationBinding{Plugin: core.PluginInfo{Key: "probe"}, Declaration: manifest.Observations{Events: []string{contract.UsageFinalized}, Metrics: []string{"custom_units"}}, Client: remoteObserver{pluginv1.NewObservationServiceClient(conn)}}
	h := New(testRegistry{gen: testGeneration{bindings: []core.ObservationBinding{binding}}}, store, builtin())
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	defer store.Close(ctx)
	defer h.Close(ctx)
	first := event("same", 7, "probe")
	h.PublishObservation(first)
	h.PublishObservation(first)
	first.TotalTokens = 9999
	h.PublishObservation(event("other", 8, "other"))
	h.Close(ctx)
	store.Close(ctx)
	coreStats, err := store.AccountStats(ctx, []int64{7, 8}, 60)
	require.NoError(t, err)
	require.EqualValues(t, 1, *coreStats.Accounts[0].SuccessRequests)
	require.EqualValues(t, 80, *coreStats.Accounts[0].SuccessTokens)
	require.EqualValues(t, 80, *coreStats.Accounts[1].SuccessTokens)
	custom, err := store.ReadObservationMetrics(ctx, contract.PluginNamespace("probe"), []int64{7, 8}, []string{"custom_units"}, 60)
	require.NoError(t, err)
	require.EqualValues(t, 160, custom.Accounts[0].Metrics[0].Sum)
	require.EqualValues(t, 1, custom.Accounts[0].Metrics[0].Count)
	require.Zero(t, custom.Accounts[1].Metrics[0].Sum)
	require.EqualValues(t, 1, delivered.Load())
}

type captureStore struct {
	core.ObservationMetricStore
	samples []core.ObservationMetricSample
}

func (s *captureStore) RecordObservationMetrics(v core.ObservationMetricSample) bool {
	s.samples = append(s.samples, v)
	return true
}
func (*captureStore) MarkObservationGap(string) {}

func TestObservationRejectsForgedMetricsAndFreezesIdentity(t *testing.T) {
	for _, kind := range []string{"foreign_id", "undeclared", "negative", "too_large", "duplicate", "mutated_identity"} {
		t.Run(kind, func(t *testing.T) {
			s := &captureStore{}
			w := &worker{h: &Hub{store: s}, consumer: Consumer{Namespace: "plugin.probe", Metrics: []string{"value"}}}
			w.consumer.Client = testObserver(func(_ context.Context, in *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error) {
				c := &pluginv1.ObservationContribution{ObservationId: in.Observations[0].Id, Metrics: map[string]int64{"value": 3}}
				switch kind {
				case "foreign_id":
					c.ObservationId = "unknown"
				case "undeclared":
					c.Metrics = map[string]int64{contract.SuccessRequests: 100}
				case "negative":
					c.Metrics["value"] = -1
				case "too_large":
					c.Metrics["value"] = contract.MaxValue + 1
				case "duplicate":
					return &pluginv1.ObservationResult{Contributions: []*pluginv1.ObservationContribution{c, c}}, nil
				case "mutated_identity":
					in.Observations[0].AccountId = 999
					in.Observations[0].CompletedAtUnixMs = 1
				}
				return &pluginv1.ObservationResult{Contributions: []*pluginv1.ObservationContribution{c}}, nil
			})
			err := w.deliver(context.Background(), &pluginv1.ObservationBatch{Observations: []*pluginv1.RequestObservation{event("known", 7, "probe")}})
			if kind == "mutated_identity" {
				require.NoError(t, err)
				require.Len(t, s.samples, 1)
				require.EqualValues(t, 7, s.samples[0].AccountID)
				require.Greater(t, s.samples[0].At.UnixMilli(), int64(1))
				return
			}
			require.Error(t, err)
			require.Empty(t, s.samples)
		})
	}
}

func TestObservationSlowPluginCannotBlockCore(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	store := account.NewStats(rdb, nil, nil, nil)
	store.Start()
	entered := make(chan struct{}, 1)
	plugin := testObserver(func(ctx context.Context, _ *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error) {
		select {
		case entered <- struct{}{}:
		default:
		}
		<-ctx.Done()
		return nil, ctx.Err()
	})
	binding := core.ObservationBinding{Plugin: core.PluginInfo{Key: "slow"}, AllAccounts: true, Declaration: manifest.Observations{Events: []string{contract.UsageFinalized}}, Client: plugin}
	h := New(testRegistry{gen: testGeneration{bindings: []core.ObservationBinding{binding}}}, store, builtin())
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
		defer cancel()
		h.Close(ctx)
		store.Close(ctx)
	}()
	for range 600 {
		h.PublishObservation(event("same", 7, "probe"))
	}
	select {
	case <-entered:
	case <-time.After(time.Second):
		t.Fatal("plugin was not invoked")
	}
	require.Eventually(t, func() bool {
		out, err := store.AccountStats(context.Background(), []int64{7}, 60)
		return err == nil && out.Accounts[0].SuccessRequests != nil && *out.Accounts[0].SuccessRequests == 1
	}, 1500*time.Millisecond, 10*time.Millisecond)
	require.Eventually(t, func() bool {
		out, err := store.ReadObservationMetrics(context.Background(), "plugin.slow", []int64{7}, []string{"unused"}, 60)
		return err == nil && out.Status == "incomplete"
	}, 3*time.Second, 10*time.Millisecond)
}

func TestObservationUnchangedGenerationRetainsWorker(t *testing.T) {
	client := &account.StatsConsumer{}
	binding := core.ObservationBinding{Plugin: core.PluginInfo{Key: "probe", Version: "1.0.0"}, Declaration: manifest.Observations{Events: []string{contract.UsageFinalized}}, Client: client}
	reg := &testRegistry{gen: testGeneration{bindings: []core.ObservationBinding{binding}}}
	h := New(reg, &captureStore{}, builtin())
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	defer h.Close(ctx)
	original := h.workers[1]
	h.reconcile()
	require.Same(t, original, h.workers[1])
	binding.AllAccounts = true
	reg.gen = testGeneration{bindings: []core.ObservationBinding{binding}}
	h.reconcile()
	require.NotSame(t, original, h.workers[1])
	select {
	case <-original.ctx.Done():
	default:
		t.Fatal("old observer was not retired")
	}
}

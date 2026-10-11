package grpcruntime

import (
	"context"
	"encoding/json"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type observationReader struct {
	core.PluginAccountReader
	key string
	all bool
}

func (r *observationReader) ReadPluginObservationMetrics(_ context.Context, key string, all bool, _ *pluginv1.ReadObservationMetricsRequest) (*pluginv1.ReadObservationMetricsResponse, error) {
	r.key, r.all = key, all
	return &pluginv1.ReadObservationMetricsResponse{}, nil
}

type observationRPC struct{ called bool }

func (r *observationRPC) OnObservations(context.Context, *pluginv1.ObservationBatch, ...grpc.CallOption) (*pluginv1.ObservationResult, error) {
	r.called = true
	return &pluginv1.ObservationResult{}, nil
}

func TestObservationHostAuthorityAndNamespaces(t *testing.T) {
	ctx := context.Background()
	h, _ := accountsEnv(t, registry.Grants{})
	reader := &observationReader{}
	h.i.rt.o.Accounts = reader
	in := &pluginv1.ReadObservationMetricsRequest{Namespace: "core", AccountIds: []int64{1}, Metrics: []string{observation.SuccessRequests}, WindowSeconds: 60}
	_, err := h.ReadObservationMetrics(ctx, in)
	require.Equal(t, codes.PermissionDenied, status.Code(err))
	require.Empty(t, reader.key)
	h.i.Grants()[observation.Permission] = json.RawMessage(`{"types":"own"}`)
	_, err = h.ReadObservationMetrics(ctx, in)
	require.NoError(t, err)
	require.Equal(t, "volc", reader.key)
	require.False(t, reader.all)
	in.Namespace = "plugin.other"
	_, err = h.ReadObservationMetrics(ctx, in)
	require.Equal(t, codes.InvalidArgument, status.Code(err))
	in.Namespace = "plugin"
	in.Metrics = []string{"undeclared"}
	_, err = h.ReadObservationMetrics(ctx, in)
	require.Equal(t, codes.PermissionDenied, status.Code(err))
	h.i.pkg.Manifest.Observations = &manifest.Observations{Events: []string{observation.UsageFinalized}, Metrics: []string{"custom_units"}}
	in.Metrics = []string{"custom_units"}
	h.i.Grants()[observation.Permission] = json.RawMessage(`{"types":"all"}`)
	_, err = h.ReadObservationMetrics(ctx, in)
	require.NoError(t, err)
	require.True(t, reader.all)
	h.i.Grants()[observation.Permission] = json.RawMessage(`{}`)
	_, err = h.ReadObservationMetrics(ctx, in)
	require.Equal(t, codes.PermissionDenied, status.Code(err))
}

func TestObservationRuntimeRechecksDeliveryScope(t *testing.T) {
	h, _ := accountsEnv(t, registry.Grants{observation.Permission: json.RawMessage(`{"types":"own"}`)})
	h.i.pkg.Manifest.Observations = &manifest.Observations{Events: []string{observation.UsageFinalized}}
	rpc := &observationRPC{}
	h.i.proc.Store(&proc{observer: rpc})
	a := observationAdapter{h.i}
	in := &pluginv1.ObservationBatch{Observations: []*pluginv1.RequestObservation{{Id: "request", AccountPluginKey: "other", Phase: observation.UsageFinalized}}}
	_, err := a.OnObservations(context.Background(), in)
	require.Equal(t, codes.PermissionDenied, status.Code(err))
	require.False(t, rpc.called)
	in.Observations[0].AccountPluginKey = "volc"
	_, err = a.OnObservations(context.Background(), in)
	require.NoError(t, err)
	require.True(t, rpc.called)
	rpc.called = false
	delete(h.i.Grants(), observation.Permission)
	_, err = a.OnObservations(context.Background(), in)
	require.Equal(t, codes.PermissionDenied, status.Code(err))
	require.False(t, rpc.called)
}

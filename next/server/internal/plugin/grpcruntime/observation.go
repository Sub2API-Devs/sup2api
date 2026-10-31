package grpcruntime

import (
	"context"
	"slices"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (i *Instance) Observer() core.ObservationPlugin {
	if !i.has(manifest.CapGatewayObserve) {
		return nil
	}
	return observationAdapter{i}
}

type observationAdapter struct{ i *Instance }

func (a observationAdapter) OnObservations(ctx context.Context, in *pluginv1.ObservationBatch) (out *pluginv1.ObservationResult, err error) {
	err = a.i.call(ctx, classBackground, 2*time.Second, func(ctx context.Context, p *proc) error {
		h := &hostServer{i: a.i, p: p}
		if err := h.require(ctx, observation.Permission); err != nil {
			return err
		}
		types, _ := a.i.Grants().Scope(observation.Permission)["types"].(string)
		decl := a.i.pkg.Manifest.Observations
		if decl == nil || (types != "own" && types != "all") || in == nil || len(in.Observations) > observation.MaxBatch {
			return status.Error(codes.PermissionDenied, "invalid observation authority")
		}
		for _, e := range in.Observations {
			if e == nil || !slices.Contains(decl.Events, e.Phase) || (types == "own" && e.AccountPluginKey != h.key()) {
				return status.Error(codes.PermissionDenied, "observation is outside granted scope")
			}
		}
		out, err = p.observer.OnObservations(ctx, in, grpc.MaxCallRecvMsgSize(128<<10))
		return err
	})
	return
}

func (h *hostServer) ReadObservationMetrics(ctx context.Context, in *pluginv1.ReadObservationMetricsRequest) (*pluginv1.ReadObservationMetricsResponse, error) {
	if err := h.require(ctx, observation.Permission); err != nil {
		return nil, err
	}
	types, _ := h.i.Grants().Scope(observation.Permission)["types"].(string)
	if types != "own" && types != "all" {
		return nil, status.Error(codes.PermissionDenied, "invalid observation scope")
	}
	if in == nil || len(in.AccountIds) > 200 || len(in.Metrics) == 0 || len(in.Metrics) > observation.MaxMetrics || (in.Namespace != "core" && in.Namespace != "plugin") {
		return nil, status.Error(codes.InvalidArgument, "invalid metrics query")
	}
	if len(in.AccountIds)*len(in.Metrics) > 600 || (in.WindowSeconds != 0 && (in.WindowSeconds < 5 || in.WindowSeconds > observation.MaxWindow)) {
		return nil, status.Error(codes.InvalidArgument, "invalid metrics window or query size")
	}
	for _, id := range in.AccountIds {
		if id <= 0 {
			return nil, status.Error(codes.InvalidArgument, "invalid account id")
		}
	}
	allowed := []string{observation.SuccessRequests, observation.SuccessTokens, observation.PendingUsage, observation.FailedRequests}
	if in.Namespace == "plugin" {
		allowed = nil
		if d := h.i.pkg.Manifest.Observations; d != nil {
			allowed = d.Metrics
		}
	}
	for _, name := range in.Metrics {
		if !slices.Contains(allowed, name) {
			return nil, status.Error(codes.PermissionDenied, "metric is not declared")
		}
	}
	reader, ok := h.i.rt.o.Accounts.(core.PluginObservationReader)
	if !ok {
		return nil, status.Error(codes.Unavailable, "observations unavailable")
	}
	out, err := reader.ReadPluginObservationMetrics(ctx, h.key(), types == "all", in)
	if err != nil {
		return nil, toStatus(err)
	}
	return out, nil
}

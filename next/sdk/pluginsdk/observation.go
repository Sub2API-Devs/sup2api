package pluginsdk

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

type Observer interface {
	OnObservations(context.Context, *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error)
}

type observationServer struct {
	pluginv1.UnimplementedObservationServiceServer
	impl Observer
}

func (s observationServer) OnObservations(ctx context.Context, in *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error) {
	return s.impl.OnObservations(ctx, in)
}

func ReadObservationMetrics(ctx context.Context, h Host, in *pluginv1.ReadObservationMetricsRequest) (*pluginv1.ReadObservationMetricsResponse, error) {
	if err := requireHostAPI(h, protocol.ObservationHostAPIVersion, "observation metrics"); err != nil {
		return nil, err
	}
	return h.Client().ReadObservationMetrics(ctx, in)
}

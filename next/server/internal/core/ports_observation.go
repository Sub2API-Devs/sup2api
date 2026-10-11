package core

import (
	"context"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

type ObservationPublisher interface {
	PublishObservation(*pluginv1.RequestObservation)
}

type ObservationPlugin interface {
	OnObservations(context.Context, *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error)
}

type ObservationBinding struct {
	Plugin      PluginInfo
	Declaration manifest.Observations
	AllAccounts bool
	Client      ObservationPlugin
}

type ObservationGeneration interface {
	Observers() []ObservationBinding
}

type ObservationMetricSample struct {
	Namespace string
	ID        string
	AccountID int64
	At        time.Time
	Revision  uint64
	Metrics   map[string]int64
}

type ObservationMetricStore interface {
	RecordObservationMetrics(ObservationMetricSample) bool
	MarkObservationGap(string)
	ReadObservationMetrics(context.Context, string, []int64, []string, int) (*pluginv1.ReadObservationMetricsResponse, error)
}

type PluginObservationReader interface {
	ReadPluginObservationMetrics(context.Context, string, bool, *pluginv1.ReadObservationMetricsRequest) (*pluginv1.ReadObservationMetricsResponse, error)
}

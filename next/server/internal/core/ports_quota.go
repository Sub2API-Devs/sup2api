package core

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

type AccountModelAvailabilityPlugin interface {
	CheckModelAvailability(context.Context, *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error)
}

type AccountQuotaRuntime interface {
	QueryAccountQuota(context.Context, int64, string) (*pluginv1.ParseQuotaResponseRequest, error)
}

type AccountQuotaSource interface {
	AccountQuotaSnapshots(context.Context, []int64) (map[int64]*pluginv1.AccountQuotaSnapshot, error)
	ApplyAccountQuotaObservation(context.Context, int64, int64, *pluginv1.QuotaResult) error
}

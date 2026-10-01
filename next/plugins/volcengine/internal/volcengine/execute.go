package volcengine

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Execute uses the shared SDK flow: build the upstream request, forward it
// through the scoped host transport and report usage for the host to record.
func (p *Plugin) Execute(ctx context.Context, in *pluginv1.ExecuteRequest) (*pluginv1.ExecuteResponse, error) {
	return pluginsdk.ExecuteDefault(ctx, p, in)
}

// Monitor performs one observation and reports it through the current claim.
// The host owns the next run, the shared snapshot and the billing transaction.
func (p *Plugin) Monitor(ctx context.Context, in *pluginv1.PollRequest) error {
	result, err := p.Poll(ctx, in)
	if err != nil {
		return err
	}
	_, err = pluginsdk.ReportTaskProgress(ctx, result)
	return err
}

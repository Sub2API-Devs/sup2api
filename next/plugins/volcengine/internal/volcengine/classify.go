package volcengine

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/providers/volcengine"
)

// ClassifyError implements pluginsdk.Platform.
func (p *Plugin) ClassifyError(_ context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	protocol := in.GetMeta().GetProtocol()
	if protocol == volcengine.ProtocolMessages || protocol == volcengine.ProtocolCountTokens {
		return volcengine.PolicyAnthropic.Classify(p.now(), in), nil
	}
	return volcengine.Policy.Classify(p.now(), in), nil
}

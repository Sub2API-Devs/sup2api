package pluginsdk

import (
	"encoding/json"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// RequestModel returns the model to send upstream: the body field when the
// core forwarded one (requestFields["model"]), else meta.model. The core has
// already applied the account's model mapping (CONTRACTS §18), so a plugin
// only has to prefer the body value over the metadata when both are present.
// A body value that is not a JSON string is ignored, like an empty one.
func RequestModel(in *pluginv1.BuildUpstreamRequestRequest) string {
	model := in.GetMeta().GetModel()
	if raw, ok := in.GetFields()["model"]; ok && raw != "" {
		var s string
		if json.Unmarshal([]byte(raw), &s) == nil && s != "" {
			model = s
		}
	}
	return model
}

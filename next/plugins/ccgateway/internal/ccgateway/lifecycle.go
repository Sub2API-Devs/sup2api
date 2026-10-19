package ccgateway

import (
	"context"
	"encoding/json"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/environment"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (p *Plugin) OnAccountLifecycle(_ context.Context, in *pluginv1.AccountLifecycleRequest) (*pluginv1.AccountLifecycleResponse, error) {
	account := in.GetAccount()
	if account.GetType() != AccountTypeManaged && account.GetType() != AccountTypeAPIKey {
		return nil, status.Error(codes.InvalidArgument, "unsupported account type")
	}
	settings, err := environment.Normalize([]byte(account.GetSettingsJson()))
	if err != nil {
		return &pluginv1.AccountLifecycleResponse{Errors: pluginsdk.FieldErrors{}.Add("settings", "invalid", "Invalid container language or timezone / 容器语言或时区无效")}, nil
	}
	encoded, _ := json.Marshal(settings)
	out := &pluginv1.AccountLifecycleResponse{SettingsJson: string(encoded)}
	switch in.GetPhase() {
	case "before_create", "before_update":
		out.AccountPatch = subscriptionModels(in)
		return out, nil
	case "validate":
		return out, nil
	case "prepare":
		// No proxy is direct egress from the runtime host.
		if account.GetType() != AccountTypeManaged {
			return &pluginv1.AccountLifecycleResponse{Errors: pluginsdk.FieldErrors{}.Add("type", "unsupported", "Only Claude subscription accounts are prepared / 只有 Claude 订阅账号需要授权准备")}, nil
		}
	case "created", "updated", "deleted", "check", "cancel", "action":
	default:
		return nil, status.Error(codes.InvalidArgument, "unsupported lifecycle phase")
	}
	out.RunResource = true
	return out, nil
}

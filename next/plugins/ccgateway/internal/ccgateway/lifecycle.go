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
	case "validate", "before_create", "before_update":
		return out, nil
	case "prepare":
		if account.GetType() != AccountTypeManaged || account.GetProperties().GetProxyId() <= 0 {
			return &pluginv1.AccountLifecycleResponse{Errors: pluginsdk.FieldErrors{}.Add("proxy_id", "required", "Authorization preparation requires an account proxy / 授权准备需要账号代理")}, nil
		}
	case "created", "updated", "deleted", "check", "cancel", "action":
	default:
		return nil, status.Error(codes.InvalidArgument, "unsupported lifecycle phase")
	}
	out.RunResource = true
	return out, nil
}

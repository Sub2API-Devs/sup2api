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
	settings, err := environment.Normalize(adminSettings(account.GetSettingsJson()))
	if err != nil {
		return &pluginv1.AccountLifecycleResponse{Errors: pluginsdk.FieldErrors{}.Add("settings", "invalid", "Invalid container language or timezone / 容器语言或时区无效")}, nil
	}
	encoded, _ := json.Marshal(settings)
	out := &pluginv1.AccountLifecycleResponse{SettingsJson: string(encoded)}
	switch in.GetPhase() {
	case "before_create", "before_update":
		out.AccountPatch = withLoginEmail(subscriptionModels(in), in)
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

// accountEmailExtension is the managed account's read-only extension that
// keeps the email of the Claude login its runtime is signed in with
// (manifest extensionsSchema, CONTRACTS §59). The core reports the email it
// observed (create, re-authorization, health); the admin cannot edit it.
const accountEmailExtension = "account_email"

// adminSettings are the account's settings without the plugin's read-only
// extensions: the container environment the admin chose.
func adminSettings(raw string) []byte {
	var values map[string]json.RawMessage
	if json.Unmarshal([]byte(raw), &values) != nil || values == nil {
		return []byte(raw)
	}
	if _, ok := values[accountEmailExtension]; !ok {
		return []byte(raw)
	}
	delete(values, accountEmailExtension)
	out, _ := json.Marshal(values)
	return out
}

// withLoginEmail adds to patch the login email the core observed for a
// managed account; an unknown email leaves the stored one alone.
func withLoginEmail(patch *pluginv1.AccountPatch, in *pluginv1.AccountLifecycleRequest) *pluginv1.AccountPatch {
	if in.GetAccount().GetType() != AccountTypeManaged {
		return patch
	}
	var facts struct {
		AccountEmail string `json:"account_email"`
	}
	if json.Unmarshal([]byte(in.GetResourceFactsJson()), &facts) != nil || facts.AccountEmail == "" {
		return patch
	}
	if patch == nil {
		patch = &pluginv1.AccountPatch{}
	}
	raw, _ := json.Marshal(map[string]string{accountEmailExtension: facts.AccountEmail})
	patch.ExtensionsJson = string(raw)
	return patch
}

package core

import "context"

// PluginMutationGate serializes submission against core update plans. Durable
// rollout/uninstall rows protect work after the short submission lock ends.
type PluginMutationGate interface {
	Begin(context.Context) (context.Context, func(), error)
}

func BeginPluginMutation(ctx context.Context, gate PluginMutationGate) (context.Context, func(), error) {
	if gate == nil {
		return ctx, func() {}, nil
	}
	return gate.Begin(ctx)
}

type pluginBootstrapKey struct{}
type emergencyRevocationKey struct{}

// WithPluginBootstrap is used only by the explicit first-install host path.
func WithPluginBootstrap(ctx context.Context) context.Context {
	return context.WithValue(ctx, pluginBootstrapKey{}, true)
}
func IsPluginBootstrap(ctx context.Context) bool { return ctx.Value(pluginBootstrapKey{}) == true }

// WithEmergencyRevocation permits removing authority during an update. It
// must never be used for installs, grants or upgrades.
func WithEmergencyRevocation(ctx context.Context) context.Context {
	return context.WithValue(ctx, emergencyRevocationKey{}, true)
}
func IsEmergencyRevocation(ctx context.Context) bool {
	return ctx.Value(emergencyRevocationKey{}) == true
}

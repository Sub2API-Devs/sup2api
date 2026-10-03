// Package ccgatewayremote restricts remote Docker operations to the ccgateway container.
package ccgatewayremote

import (
	"context"
	"github.com/Wei-Shaw/sub2api/internal/remotedocker"
)

type Config = remotedocker.Config

func Validate(cfg Config) error { return remotedocker.Validate(cfg) }

// ProbeFingerprint is unauthenticated; verify the returned key out of band.
func ProbeFingerprint(ctx context.Context, host string, port int) (string, error) {
	return remotedocker.ProbeFingerprint(ctx, host, port)
}

func Execute(ctx context.Context, cfg Config, action string) (string, error) {
	return remotedocker.Execute(ctx, cfg, "ccgateway", action)
}

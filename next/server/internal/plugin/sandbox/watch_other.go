//go:build !linux

package sandbox

import "github.com/Sub2API-Devs/sup2api/next/server/internal/core"

// Watch is a no-op outside Linux (development mode has no /proc).
func (l *Launcher) Watch(core.LaunchSpec, int, func(core.ResourceEvent)) (stop func()) {
	return func() {}
}

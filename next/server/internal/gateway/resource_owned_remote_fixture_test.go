package gateway

import (
	"context"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func (s *memoryResourceStore) FindOwnedRemote(_ context.Context, owner core.ResourceOwner, binding core.ResourceBinding, kind, id string) (core.ProviderResource, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, r := range s.rows {
		if r.Owner == owner && r.Binding == binding && r.PluginKey == "ccgateway" && r.Kind == kind && r.RemoteID == id && r.State == "ready" && (r.ExpiresAt.IsZero() || r.ExpiresAt.After(time.Now())) {
			return r, nil
		}
	}
	return core.ProviderResource{}, core.ErrNotFound
}

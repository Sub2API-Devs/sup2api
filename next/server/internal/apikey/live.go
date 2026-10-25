package apikey

import (
	"context"
	"log/slog"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// KeyLive is a key's current use of its caps: requests and tokens of this
// minute and requests in flight, across the nodes.
type KeyLive struct {
	RPM         int64 `json:"rpm"`
	TPM         int64 `json:"tpm"`
	Concurrency int   `json:"concurrency"`
}

// fill adds the keys' platforms and, when the service counts them, their use.
func (s *Service) fill(ctx context.Context, keys []*APIKey) error {
	if err := s.fillPlatforms(ctx, keys); err != nil {
		return err
	}
	s.fillLive(ctx, keys)
	return nil
}

// fillLive is best effort: without the counters the keys are still listed,
// only without Live.
func (s *Service) fillLive(ctx context.Context, keys []*APIKey) {
	if s.Windows == nil || s.Slots == nil || len(keys) == 0 {
		return
	}
	ids := make([]int64, len(keys))
	for i, k := range keys {
		ids[i] = k.ID
	}
	usage, err := s.Windows.Usage(ctx, ids)
	if err != nil {
		slog.WarnContext(ctx, "apikey: read rate windows", "err", err)
		return
	}
	inFlight, err := s.Slots.InUseMany(ctx, core.KeySlots, ids)
	if err != nil {
		slog.WarnContext(ctx, "apikey: read slots", "err", err)
		return
	}
	for _, k := range keys {
		k.Live = &KeyLive{RPM: usage[k.ID].RPM, TPM: usage[k.ID].TPM, Concurrency: inFlight[k.ID]}
	}
}

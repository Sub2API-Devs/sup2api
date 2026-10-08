package usage

import (
	"context"
	"errors"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type starvationReviewOutbox struct {
	items []core.HelperHistoryUsage
	acked []string
}

func (o *starvationReviewOutbox) PendingUsage(context.Context, int) ([]core.HelperHistoryUsage, error) {
	return o.items, nil
}
func (o *starvationReviewOutbox) AckUsage(_ context.Context, rid, _ string) error {
	o.acked = append(o.acked, rid)
	return nil
}
func (o *starvationReviewOutbox) DeferUsage(context.Context, string, string) error { return nil }

func TestReviewHelperUsageConflictDoesNotStarveNextRecord(t *testing.T) {
	o := &starvationReviewOutbox{}
	for _, id := range []string{"conflict", "valid"} {
		o.items = append(o.items, core.HelperHistoryUsage{RequestID: id, Digest: "digest", Record: &core.UsageRecord{RequestID: id}})
	}
	err := drainHelperUsage(context.Background(), o, func(_ context.Context, r *core.UsageRecord, _ []byte, _ string) error {
		if r.RequestID == "conflict" {
			return errors.New("durable usage receipt conflict")
		}
		return nil
	})
	if err == nil {
		t.Fatal("conflicting usage failure hidden")
	}
	if len(o.acked) != 1 || o.acked[0] != "valid" {
		t.Fatal("one permanently conflicting record blocked unrelated valid usage")
	}
}

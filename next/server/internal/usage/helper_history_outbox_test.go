package usage

import (
	"context"
	"errors"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type reviewHelperOutbox struct {
	items  []core.HelperHistoryUsage
	ackErr error
	acks   int
	defers int
}

func (o *reviewHelperOutbox) DeferUsage(context.Context, string, string) error {
	o.defers++
	return nil
}

func (o *reviewHelperOutbox) PendingUsage(context.Context, int) ([]core.HelperHistoryUsage, error) {
	return o.items, nil
}
func (o *reviewHelperOutbox) AckUsage(_ context.Context, rid, digest string) error {
	if o.ackErr != nil {
		return o.ackErr
	}
	o.acks++
	o.items = nil
	return nil
}

func TestHelperUsageOutboxDoesNotAckUnpersistedOrMismatchedRecord(t *testing.T) {
	for _, mode := range []string{"persist-failure", "wrong-id", "cancel"} {
		t.Run(mode, func(t *testing.T) {
			o := &reviewHelperOutbox{items: []core.HelperHistoryUsage{{RequestID: "one", Digest: "digest", Record: &core.UsageRecord{RequestID: "one"}}}}
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			calls := 0
			if mode == "wrong-id" {
				o.items[0].Record.RequestID = "other"
			}
			if mode == "cancel" {
				cancel()
			}
			err := drainHelperUsage(ctx, o, func(context.Context, *core.UsageRecord, []byte, string) error {
				calls++
				return errors.New("DB unavailable")
			})
			if err == nil || o.acks != 0 || (mode != "persist-failure" && calls != 0) {
				t.Fatal("uncommitted record acknowledged")
			}
		})
	}
}

func TestHelperUsageOutboxAckFailureReplaysSameFrozenRecord(t *testing.T) {
	rec := &core.UsageRecord{RequestID: "one", StatusCode: 503, Success: false, Tokens: core.UsageTokens{Input: 17, Output: 9}}
	o := &reviewHelperOutbox{items: []core.HelperHistoryUsage{{RequestID: "one", Digest: "digest", Record: rec}}, ackErr: errors.New("ack unavailable")}
	seen := map[string]int{}
	persist := func(_ context.Context, r *core.UsageRecord, _ []byte, _ string) error {
		if r != rec || r.Tokens.Input != 17 || r.StatusCode != 503 {
			t.Fatal("frozen usage changed")
		}
		seen[r.RequestID]++
		return nil
	}
	if drainHelperUsage(context.Background(), o, persist) == nil {
		t.Fatal("ack error hidden")
	}
	o.ackErr = nil
	if err := drainHelperUsage(context.Background(), o, persist); err != nil {
		t.Fatal(err)
	}
	if seen["one"] != 2 || o.acks != 1 {
		t.Fatal("replay not delivered")
	}
}

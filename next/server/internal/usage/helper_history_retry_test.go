package usage

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type retryHelperOutbox struct {
	items              []core.HelperHistoryUsage
	delayed, acked     map[string]bool
	ackFail, delayFail string
}

func (s *retryHelperOutbox) PendingUsage(_ context.Context, limit int) ([]core.HelperHistoryUsage, error) {
	var due []core.HelperHistoryUsage
	for _, i := range s.items {
		if !s.delayed[i.RequestID] && !s.acked[i.RequestID] {
			due = append(due, i)
			if len(due) == limit {
				break
			}
		}
	}
	return due, nil
}
func (s *retryHelperOutbox) AckUsage(_ context.Context, id, digest string) error {
	if id == s.ackFail {
		return errors.New("ack unavailable")
	}
	s.acked[id] = true
	return nil
}
func (s *retryHelperOutbox) DeferUsage(_ context.Context, id, digest string) error {
	if id == s.delayFail {
		return errors.New("defer unavailable")
	}
	s.delayed[id] = true
	return nil
}
func retryItems(ids ...string) *retryHelperOutbox {
	s := &retryHelperOutbox{delayed: map[string]bool{}, acked: map[string]bool{}}
	for _, id := range ids {
		s.items = append(s.items, core.HelperHistoryUsage{RequestID: id, Digest: "frozen", Record: &core.UsageRecord{RequestID: id}})
	}
	return s
}
func TestHelperUsageRetryPassesSixtyFourPermanentFailures(t *testing.T) {
	ids := make([]string, 0, 65)
	for i := 0; i < 64; i++ {
		ids = append(ids, fmt.Sprintf("bad-%d", i))
	}
	ids = append(ids, "good")
	s := retryItems(ids...)
	persist := func(_ context.Context, r *core.UsageRecord, _ []byte, _ string) error {
		if strings.HasPrefix(r.RequestID, "bad-") {
			return errors.New("immutable receipt conflict")
		}
		return nil
	}
	if drainHelperUsage(context.Background(), s, persist) == nil || len(s.delayed) != 64 || len(s.acked) != 0 {
		t.Fatal("first page was not deferred intact")
	}
	if err := drainHelperUsage(context.Background(), s, persist); err != nil {
		t.Fatal(err)
	}
	if !s.acked["good"] || len(s.delayed) != 64 {
		t.Fatal("later due row starved or failed rows were acknowledged")
	}
}
func TestHelperUsageRetryMixedFailuresContinueWithoutAcknowledging(t *testing.T) {
	s := retryItems("persist", "ack", "identity", "defer", "good")
	s.ackFail = "ack"
	s.delayFail = "defer"
	s.items[2].Record.RequestID = "wrong"
	err := drainHelperUsage(context.Background(), s, func(_ context.Context, r *core.UsageRecord, _ []byte, _ string) error {
		if r.RequestID == "persist" || r.RequestID == "defer" {
			return errors.New("persist failed")
		}
		return nil
	})
	if err == nil || !strings.Contains(err.Error(), "defer unavailable") || len(s.acked) != 1 || !s.acked["good"] || len(s.delayed) != 3 {
		t.Fatalf("mixed retry outcome: %v ack%v delay%v", err, s.acked, s.delayed)
	}
}
func TestHelperUsageRetryCancellationDoesNotAcknowledgeOrDefer(t *testing.T) {
	s := retryItems("first", "second")
	ctx, cancel := context.WithCancel(context.Background())
	calls := 0
	err := drainHelperUsage(ctx, s, func(context.Context, *core.UsageRecord, []byte, string) error { calls++; cancel(); return nil })
	if !errors.Is(err, context.Canceled) || calls != 1 || len(s.acked) != 0 || len(s.delayed) != 0 {
		t.Fatalf("cancel became permanent failure: %v", err)
	}
}

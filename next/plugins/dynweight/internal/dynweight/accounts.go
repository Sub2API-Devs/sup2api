package dynweight

import (
	"context"
	"encoding/json"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

// EventAccountStatusChanged is the core event the plugin subscribes to
// (CONTRACTS §6); accountActive is the status it resets on.
const (
	EventAccountStatusChanged = "account.status_changed"
	accountActive             = "active"
)

// OnEvents implements pluginsdk.EventHandler: an account that becomes active
// again (enabled by an administrator, its status reset, its automatic
// disable over, re-authorized) starts over from its base, as new-api resets
// a channel on a status change, with the reason status_change.
//
// Only entering active resets. The account is not scheduled in the other
// statuses, so resetting on entry would change nothing new-api's reset on
// the way back does not; and status_changed also reports every cooldown,
// which must not wipe what the failures behind it degraded.
//
// The accounts a batch activates are reset together, in one write and one
// broadcast. A reset is idempotent but for its events: a redelivered batch
// records them again. When the reset fails nothing is acked and the core
// redelivers the batch.
func (p *Plugin) OnEvents(ctx context.Context, in *pluginv1.OnEventsRequest) (*pluginv1.OnEventsResponse, error) {
	events := in.GetEvents()
	if len(events) == 0 {
		return &pluginv1.OnEventsResponse{}, nil
	}
	last := events[len(events)-1].GetId()
	if ids := activated(events); len(ids) > 0 {
		if _, err := p.resetKeys(ctx, filter{AccountIDs: ids}, rules.ReasonStatusChange, 0); err != nil {
			p.log.Warn("dynweight: reset on status change failed", "accounts", len(ids), "through_event_id", last, "error", err.Error())
			return nil, status.Errorf(codes.Unavailable, "events through %d: %v", last, err)
		}
	}
	return &pluginv1.OnEventsResponse{AckedThroughId: last}, nil
}

// activated lists the accounts the events report entering active.
func activated(events []*pluginv1.Event) []int64 {
	var ids []int64
	for _, ev := range events {
		var payload struct {
			AccountID int64  `json:"account_id"`
			Status    string `json:"status"`
		}
		if ev.GetType() == EventAccountStatusChanged && json.Unmarshal([]byte(ev.GetPayloadJson()), &payload) == nil &&
			payload.Status == accountActive && payload.AccountID > 0 {
			ids = append(ids, payload.AccountID)
		}
	}
	return ids
}

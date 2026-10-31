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
// A reset is idempotent but for its event: a redelivered batch records it
// again. An event that fails stops the batch at the one before it.
func (p *Plugin) OnEvents(ctx context.Context, in *pluginv1.OnEventsRequest) (*pluginv1.OnEventsResponse, error) {
	var acked int64
	for _, ev := range in.GetEvents() {
		var payload struct {
			AccountID int64  `json:"account_id"`
			Status    string `json:"status"`
		}
		active := ev.GetType() == EventAccountStatusChanged && json.Unmarshal([]byte(ev.GetPayloadJson()), &payload) == nil &&
			payload.Status == accountActive && payload.AccountID > 0
		if !active {
			acked = ev.GetId()
			continue
		}
		if _, err := p.resetKeys(ctx, filter{AccountID: payload.AccountID}, rules.ReasonStatusChange, 0); err != nil {
			p.log.Warn("dynweight: reset on status change failed", "account_id", payload.AccountID, "event_id", ev.GetId(), "error", err.Error())
			if acked > 0 {
				return &pluginv1.OnEventsResponse{AckedThroughId: acked}, nil
			}
			return nil, status.Errorf(codes.Unavailable, "event %d: %v", ev.GetId(), err)
		}
		acked = ev.GetId()
	}
	return &pluginv1.OnEventsResponse{AckedThroughId: acked}, nil
}

package growth

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/shopspring/decimal"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// OnEvents implements pluginsdk.EventHandler.
func (p *Plugin) OnEvents(ctx context.Context, req *pluginv1.OnEventsRequest) (*pluginv1.OnEventsResponse, error) {
	events := req.GetEvents()
	if len(events) == 0 {
		return &pluginv1.OnEventsResponse{AckedThroughId: 0}, nil
	}
	// A failed event (database or ledger unavailable) stops the batch:
	// acknowledging it would lose a commission for good. The core redelivers
	// from the first unacknowledged event with backoff and dead-letters a
	// batch that keeps failing. Handling is idempotent (event id + ledger
	// idempotency key), so a redelivery credits nothing twice.
	//
	// A refusal by the ledger grant (amount above maxPerTx, the plugin's
	// maxPerDay used up) is skipped instead: retrying for the minutes before
	// the dead letter would not change it and would hold up every later
	// event. The commission is not paid; the error log says which.
	var acked int64
	for _, e := range events {
		if err := p.handleEvent(ctx, e); err != nil {
			if refused(err) {
				p.log.Error("ledger refused the credit; event skipped", "type", e.GetType(), "id", e.GetId(), "err", err)
				acked = e.GetId()
				continue
			}
			p.log.Error("handle event", "type", e.GetType(), "id", e.GetId(), "err", err)
			if acked > 0 {
				return &pluginv1.OnEventsResponse{AckedThroughId: acked}, nil
			}
			return nil, fmt.Errorf("event %d (%s): %w", e.GetId(), e.GetType(), err)
		}
		acked = e.GetId()
	}
	return &pluginv1.OnEventsResponse{AckedThroughId: acked}, nil
}

func (p *Plugin) handleEvent(ctx context.Context, e *pluginv1.Event) error {
	switch e.GetType() {
	case "user.created":
		return p.onUserCreated(ctx, e)
	case "usage.recorded":
		return p.onUsageRecorded(ctx, e)
	case "balance.changed":
		return p.onBalanceChanged(ctx, e)
	}
	return nil
}

func (p *Plugin) onUserCreated(ctx context.Context, e *pluginv1.Event) error {
	var payload struct {
		UserID int64 `json:"user_id"`
	}
	if err := json.Unmarshal([]byte(e.GetPayloadJson()), &payload); err != nil {
		p.log.Warn("skip malformed event", "type", e.GetType(), "id", e.GetId(), "err", err)
		return nil // a redelivery cannot fix it
	}
	if payload.UserID <= 0 {
		return nil
	}
	// Generate referral code for new user.
	_, err := p.ensureCode(ctx, payload.UserID)
	return err
}

func (p *Plugin) onUsageRecorded(ctx context.Context, e *pluginv1.Event) error {
	var payload struct {
		UserID        int64  `json:"user_id"`
		TotalCost     string `json:"total_cost"`
		BillingStatus string `json:"billing_status"`
	}
	if err := json.Unmarshal([]byte(e.GetPayloadJson()), &payload); err != nil {
		p.log.Warn("skip malformed event", "type", e.GetType(), "id", e.GetId(), "err", err)
		return nil // a redelivery cannot fix it
	}
	if payload.UserID <= 0 || payload.BillingStatus != "billed" {
		return nil
	}
	cost, err := decimal.NewFromString(payload.TotalCost)
	if err != nil || cost.Sign() <= 0 {
		return nil
	}
	return p.recordCommission(ctx, payload.UserID, "usage.recorded", e.GetId(), cost)
}

func (p *Plugin) onBalanceChanged(ctx context.Context, e *pluginv1.Event) error {
	var payload struct {
		UserID int64  `json:"user_id"`
		Delta  string `json:"delta"`
		Kind   string `json:"kind"`
	}
	if err := json.Unmarshal([]byte(e.GetPayloadJson()), &payload); err != nil {
		p.log.Warn("skip malformed event", "type", e.GetType(), "id", e.GetId(), "err", err)
		return nil // a redelivery cannot fix it
	}
	// Only credit from admin_adjust and top-ups (kind not usage/plugin_credit/plugin_debit/refund).
	if payload.UserID <= 0 || payload.Kind == "usage" || payload.Kind == "plugin_credit" || payload.Kind == "plugin_debit" || payload.Kind == "refund" {
		return nil
	}
	delta, err := decimal.NewFromString(payload.Delta)
	if err != nil || delta.Sign() <= 0 {
		return nil
	}
	return p.recordCommission(ctx, payload.UserID, "balance.changed", e.GetId(), delta)
}

// RunJob implements pluginsdk.JobRunner.
func (p *Plugin) RunJob(ctx context.Context, req *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	if req.GetJobId() == JobCleanup {
		return p.runCleanup(ctx)
	}
	return &pluginv1.RunJobResponse{Message: "unknown job"}, nil
}

func (p *Plugin) runCleanup(ctx context.Context) (*pluginv1.RunJobResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return nil, err
	}
	// Delete check-in records older than 90 days.
	cutoff := time.Now().AddDate(0, 0, -90).Format("2006-01-02")
	tag, err := db.Exec(ctx, `DELETE FROM checkins WHERE checkin_date < $1`, cutoff)
	if err != nil {
		return nil, err
	}
	return &pluginv1.RunJobResponse{Message: "cleaned " + strconv.FormatInt(tag.RowsAffected(), 10) + " old check-in records"}, nil
}

// refused reports a ledger refusal that a retry cannot fix.
func refused(err error) bool {
	switch status.Code(err) {
	case codes.PermissionDenied, codes.InvalidArgument:
		return true
	}
	return false
}

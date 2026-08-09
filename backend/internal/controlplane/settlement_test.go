package controlplane

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestSettlementAcknowledgesPreviouslyAbortedLeaseWithoutBilling(t *testing.T) {
	mini := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	defer rdb.Close()
	store := NewLeaseStore(&config.Config{DataPlaneControl: config.DataPlaneControlConfig{LeaseTTLSeconds: 60}}, rdb, nil)
	record := testLeaseRecord("lease-1", "request-1", 10)
	record.PricingVersion = "pricing-1"
	record.RequestedModel = "gpt-5.4"
	record.MappedModel = "gpt-5.4"
	if _, _, err := store.Create(context.Background(), record, 100); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if _, _, err := store.Release(context.Background(), record.LeaseID, "aborted"); err != nil {
		t.Fatalf("Release: %v", err)
	}
	controller := &SettlementController{rdb: rdb, leases: store}
	response, err := controller.Settle(context.Background(), &controlv1.SettleRequestRequest{
		DataPlaneId: "node-1", RequestId: record.RequestID, LeaseId: record.LeaseID,
		AccountId: record.AccountID, RequestedModel: record.RequestedModel,
		MappedModel: record.MappedModel, PricingVersion: record.PricingVersion,
	})
	if err != nil || !response.GetDuplicate() {
		t.Fatalf("Settle response=%+v err=%v", response, err)
	}
}

func TestSettlementUsageRejectsNegativeDataPlaneFacts(t *testing.T) {
	valid := &controlv1.Usage{InputTokens: 1, OutputTokens: 2, ReasoningTokens: 1, ResponseBytes: 10}
	if !validSettlementUsage(valid) {
		t.Fatal("valid usage was rejected")
	}
	for _, usage := range []*controlv1.Usage{
		{InputTokens: -1}, {OutputTokens: -1}, {CacheReadTokens: -1},
		{CacheCreationTokens: -1}, {CacheCreation_5MTokens: -1}, {CacheCreation_1HTokens: -1},
		{ReasoningTokens: -1}, {ResponseBytes: -1},
	} {
		if validSettlementUsage(usage) {
			t.Fatalf("negative usage was accepted: %+v", usage)
		}
	}
}

func TestSettlementUsageMetadataNormalization(t *testing.T) {
	if got := settlementServiceTierPtr(" FAST "); got == nil || *got != "priority" {
		t.Fatalf("service tier = %#v", got)
	}
	if got := settlementReasoningEffortPtr("x_high"); got == nil || *got != "xhigh" {
		t.Fatalf("reasoning effort = %#v", got)
	}
	if settlementServiceTierPtr("turbo") != nil || settlementReasoningEffortPtr("extreme") != nil {
		t.Fatal("unsupported usage metadata was accepted")
	}
}

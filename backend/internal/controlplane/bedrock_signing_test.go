package controlplane

import (
	"context"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"google.golang.org/protobuf/proto"
)

func TestBedrockSigningRequiresExactLeaseOwnerAndTarget(t *testing.T) {
	mini := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	defer rdb.Close()
	store := NewLeaseStore(&config.Config{DataPlaneControl: config.DataPlaneControlConfig{LeaseTTLSeconds: 60}}, rdb, nil)
	target := "https://bedrock-runtime.us-east-1.amazonaws.com/model/us.anthropic.claude-opus-4-7-v1/invoke"
	record := testLeaseRecord("lease-bedrock", "request-bedrock", 0)
	record.AccountID = 99
	record.Plan = &controlv1.ExecutionPlan{
		UpstreamUrl: target, UpstreamMethod: "POST", ProtocolProfile: "bedrock",
		ProtocolOptions: map[string]string{"auth_mode": "sigv4", "aws_region": "us-east-1"},
	}
	if _, _, err := store.Create(context.Background(), record, 100); err != nil {
		t.Fatalf("Create: %v", err)
	}
	controller := &AdmissionController{leases: store, gateway: &service.GatewayService{}}
	base := &controlv1.SignBedrockRequestRequest{
		DataPlaneId: "node-1", RequestId: record.RequestID, LeaseId: record.LeaseID,
		Method: "POST", UpstreamUrl: target, PayloadSha256: strings.Repeat("a", 64),
	}

	wrongOwner := proto.Clone(base).(*controlv1.SignBedrockRequestRequest)
	wrongOwner.DataPlaneId = "other-node"
	response, err := controller.SignBedrock(context.Background(), wrongOwner)
	if err != nil || response.GetDecision() != controlv1.Decision_DECISION_DENY || response.GetDenial().GetErrorCode() != "LEASE_OWNERSHIP_MISMATCH" {
		t.Fatalf("wrong-owner response=%+v err=%v", response, err)
	}

	wrongTarget := proto.Clone(base).(*controlv1.SignBedrockRequestRequest)
	wrongTarget.UpstreamUrl = "https://attacker.example/model/x/invoke"
	response, err = controller.SignBedrock(context.Background(), wrongTarget)
	if err != nil || response.GetDecision() != controlv1.Decision_DECISION_DENY || response.GetDenial().GetErrorCode() != "BEDROCK_TARGET_MISMATCH" {
		t.Fatalf("wrong-target response=%+v err=%v", response, err)
	}

	response, err = controller.SignBedrock(context.Background(), base)
	if err != nil || response.GetDecision() != controlv1.Decision_DECISION_DENY || response.GetDenial().GetErrorCode() != "BEDROCK_SIGNING_FAILED" {
		t.Fatalf("missing signing authority response=%+v err=%v", response, err)
	}
}

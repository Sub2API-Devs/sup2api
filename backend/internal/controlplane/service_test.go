package controlplane

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"testing"
	"time"

	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

type resolverStub struct {
	key *service.APIKey
	err error
}

func (r resolverStub) GetByKey(context.Context, string) (*service.APIKey, error) { return r.key, r.err }
func (r resolverStub) GetByID(context.Context, int64) (*service.APIKey, error)   { return r.key, r.err }

func TestResolveAPIKeyIssuesBoundGrantWithoutPlaintextCredential(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	signer, err := NewGrantSigner(strings.Repeat("s", 32), time.Minute)
	if err != nil {
		t.Fatalf("NewGrantSigner: %v", err)
	}
	signer.now = func() time.Time { return now }
	groupID := int64(3)
	rpc := newRPCService(resolverStub{key: &service.APIKey{
		ID:          1,
		UserID:      2,
		GroupID:     &groupID,
		Status:      service.StatusActive,
		IPWhitelist: []string{"10.0.0.0/8"},
		User:        &service.User{ID: 2, Status: service.StatusActive},
		Group:       &service.Group{ID: 3, Status: service.StatusActive, Hydrated: true},
	}}, signer)
	rpc.now = func() time.Time { return now }
	response, err := rpc.ResolveAPIKey(context.Background(), &controlv1.ResolveAPIKeyRequest{
		RequestId: "request-1", DataPlaneId: "data-plane-1", ApiKey: "client-secret",
	})
	if err != nil {
		t.Fatalf("ResolveAPIKey: %v", err)
	}
	if response.GetDecision() != controlv1.Decision_DECISION_ALLOW || response.GetGrant().GetGrantToken() == "" {
		t.Fatalf("response = %+v", response)
	}
	digest := sha256.Sum256([]byte("client-secret"))
	if response.GetGrant().GetCredentialDigest() != hex.EncodeToString(digest[:]) || response.GetGrant().GetGroupId() != 3 {
		t.Fatalf("grant = %+v", response.GetGrant())
	}
	if strings.Contains(response.GetGrant().GetGrantToken(), "client-secret") {
		t.Fatal("AuthGrant leaked plaintext API key")
	}
	claims, err := signer.Verify(response.GetGrant().GetGrantToken())
	if err != nil || claims.APIKeyID != 1 || claims.UserID != 2 || claims.GroupID != 3 {
		t.Fatalf("verified claims=%+v err=%v", claims, err)
	}
}

func TestResolveAPIKeyDeniesInactiveUser(t *testing.T) {
	signer, _ := NewGrantSigner(strings.Repeat("s", 32), time.Minute)
	rpc := newRPCService(resolverStub{key: &service.APIKey{
		ID: 1, Status: service.StatusActive, User: &service.User{ID: 2, Status: service.StatusDisabled},
	}}, signer)
	response, err := rpc.ResolveAPIKey(context.Background(), &controlv1.ResolveAPIKeyRequest{
		RequestId: "request-1", DataPlaneId: "data-plane-1", ApiKey: "client-secret",
	})
	if err != nil {
		t.Fatalf("ResolveAPIKey: %v", err)
	}
	if response.GetDecision() != controlv1.Decision_DECISION_DENY || response.GetDenial().GetErrorCode() != "USER_INACTIVE" {
		t.Fatalf("response = %+v", response)
	}
}

func TestRenewAuthGrantRotatesWithoutPlaintextAPIKey(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	signer, _ := NewGrantSigner(strings.Repeat("r", 32), time.Minute)
	signer.now = func() time.Time { return now }
	groupID := int64(3)
	apiKey := &service.APIKey{
		ID: 1, UserID: 2, GroupID: &groupID, Status: service.StatusActive,
		User:  &service.User{ID: 2, Status: service.StatusActive},
		Group: &service.Group{ID: 3, Status: service.StatusActive, Hydrated: true},
	}
	rpc := newRPCService(resolverStub{key: apiKey}, signer)
	rpc.now = func() time.Time { return now }
	resolved, err := rpc.ResolveAPIKey(context.Background(), &controlv1.ResolveAPIKeyRequest{RequestId: "resolve", DataPlaneId: "dp", ApiKey: "client-secret"})
	if err != nil {
		t.Fatal(err)
	}
	original := resolved.GetGrant()
	now = now.Add(30 * time.Second)
	renewed, err := rpc.RenewAuthGrant(context.Background(), &controlv1.RenewAuthGrantRequest{RequestId: "connection", DataPlaneId: "dp", GrantToken: original.GetGrantToken()})
	if err != nil {
		t.Fatal(err)
	}
	if renewed.GetDecision() != controlv1.Decision_DECISION_ALLOW || renewed.GetGrant().GetGrantToken() == original.GetGrantToken() || renewed.GetGrant().GetExpiresAtUnixMs() <= original.GetExpiresAtUnixMs() {
		t.Fatalf("renewed grant = %+v", renewed)
	}
	if renewed.GetGrant().GetCredentialDigest() != original.GetCredentialDigest() || strings.Contains(renewed.GetGrant().GetGrantToken(), "client-secret") {
		t.Fatalf("renewal leaked or changed credential identity: %+v", renewed.GetGrant())
	}
}

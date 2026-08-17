package controlplane

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func TestGrantSignerIssuesVerifiesAndRejectsTampering(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	signer, err := NewGrantSigner(strings.Repeat("s", 32), time.Minute)
	if err != nil {
		t.Fatalf("NewGrantSigner: %v", err)
	}
	signer.now = func() time.Time { return now }
	token, issued, err := signer.Issue(GrantClaims{
		CredentialDigest: strings.Repeat("a", 64),
		APIKeyID:         7,
		UserID:           8,
		GroupID:          9,
		PolicyVersion:    "policy-1",
	})
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	claims, err := signer.Verify(token)
	if err != nil {
		t.Fatalf("Verify: %v", err)
	}
	if claims != issued || claims.ExpiresAtUnix != now.Add(time.Minute).Unix() {
		t.Fatalf("claims = %+v, issued = %+v", claims, issued)
	}

	tamperedByte := byte('A')
	if token[len(token)-1] == tamperedByte {
		tamperedByte = 'B'
	}
	tampered := token[:len(token)-1] + string(tamperedByte)
	if _, err := signer.Verify(tampered); !errors.Is(err, ErrInvalidGrant) {
		t.Fatalf("tampered Verify error = %v", err)
	}
	signer.now = func() time.Time { return now.Add(2 * time.Minute) }
	if _, err := signer.Verify(token); !errors.Is(err, ErrExpiredGrant) {
		t.Fatalf("expired Verify error = %v", err)
	}
}

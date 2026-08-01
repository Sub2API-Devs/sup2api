package controlplane

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrInvalidGrant = errors.New("invalid AuthGrant")
	ErrExpiredGrant = errors.New("expired AuthGrant")
)

// GrantClaims is the control-plane assertion consumed by OpenRequest. It is
// deliberately small: the data plane may cache it, but only the control plane
// can issue or validate it and it never contains the plaintext API key.
type GrantClaims struct {
	Version          int    `json:"v"`
	CredentialDigest string `json:"credential_digest"`
	APIKeyID         int64  `json:"api_key_id"`
	UserID           int64  `json:"user_id"`
	GroupID          int64  `json:"group_id,omitempty"`
	PolicyVersion    string `json:"policy_version"`
	IssuedAtUnix     int64  `json:"iat"`
	ExpiresAtUnix    int64  `json:"exp"`
}

type GrantSigner struct {
	secret []byte
	ttl    time.Duration
	now    func() time.Time
}

func NewGrantSigner(secret string, ttl time.Duration) (*GrantSigner, error) {
	if len([]byte(secret)) < 32 {
		return nil, fmt.Errorf("AuthGrant secret must be at least 32 bytes")
	}
	if ttl <= 0 {
		return nil, fmt.Errorf("AuthGrant TTL must be positive")
	}
	return &GrantSigner{secret: []byte(secret), ttl: ttl, now: time.Now}, nil
}

func (s *GrantSigner) Issue(claims GrantClaims) (string, GrantClaims, error) {
	if s == nil || claims.CredentialDigest == "" || claims.APIKeyID <= 0 || claims.UserID <= 0 {
		return "", GrantClaims{}, ErrInvalidGrant
	}
	now := s.now().UTC()
	claims.Version = 1
	claims.IssuedAtUnix = now.Unix()
	if claims.ExpiresAtUnix == 0 || claims.ExpiresAtUnix > now.Add(s.ttl).Unix() {
		claims.ExpiresAtUnix = now.Add(s.ttl).Unix()
	}
	if claims.ExpiresAtUnix <= claims.IssuedAtUnix {
		return "", GrantClaims{}, ErrExpiredGrant
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", GrantClaims{}, fmt.Errorf("marshal AuthGrant: %w", err)
	}
	encoded := base64.RawURLEncoding.EncodeToString(payload)
	signature := s.sign(encoded)
	return encoded + "." + base64.RawURLEncoding.EncodeToString(signature), claims, nil
}

func (s *GrantSigner) Verify(token string) (GrantClaims, error) {
	if s == nil || len(token) > 4096 {
		return GrantClaims{}, ErrInvalidGrant
	}
	encoded, signatureText, ok := strings.Cut(token, ".")
	if !ok || encoded == "" || signatureText == "" || strings.Contains(signatureText, ".") {
		return GrantClaims{}, ErrInvalidGrant
	}
	signature, err := base64.RawURLEncoding.DecodeString(signatureText)
	if err != nil || !hmac.Equal(signature, s.sign(encoded)) {
		return GrantClaims{}, ErrInvalidGrant
	}
	payload, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return GrantClaims{}, ErrInvalidGrant
	}
	var claims GrantClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return GrantClaims{}, ErrInvalidGrant
	}
	now := s.now().UTC().Unix()
	if claims.Version != 1 || claims.CredentialDigest == "" || claims.APIKeyID <= 0 || claims.UserID <= 0 || claims.IssuedAtUnix > now+5 {
		return GrantClaims{}, ErrInvalidGrant
	}
	if claims.ExpiresAtUnix <= now {
		return GrantClaims{}, ErrExpiredGrant
	}
	return claims, nil
}

func (s *GrantSigner) sign(encodedPayload string) []byte {
	mac := hmac.New(sha256.New, s.secret)
	_, _ = mac.Write([]byte(encodedPayload))
	return mac.Sum(nil)
}

package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

type ccgConfigRepository struct {
	SettingRepository
	value string
	fail  bool
}

func (r *ccgConfigRepository) GetValue(context.Context, string) (string, error) {
	if r.fail {
		return "", errors.New("secret read failure")
	}
	if r.value == "" {
		return "", ErrSettingNotFound
	}
	return r.value, nil
}
func (r *ccgConfigRepository) Set(_ context.Context, _ string, v string) error {
	if r.fail {
		return errors.New("secret write failure")
	}
	r.value = v
	return nil
}

// A reversible test double makes the entire input to the encryptor inspectable.
// Production cryptography remains the injected SecretEncryptor's responsibility.
type ccgConfigCipher struct{ fail bool }

func (c ccgConfigCipher) Encrypt(v string) (string, error) {
	if c.fail {
		return "", errors.New("password-secret")
	}
	return base64.StdEncoding.EncodeToString([]byte(v)), nil
}
func (c ccgConfigCipher) Decrypt(v string) (string, error) {
	if c.fail {
		return "", errors.New("password-secret")
	}
	b, e := base64.StdEncoding.DecodeString(v)
	return string(b), e
}
func ccgSSHConfig() CCGatewayRemoteConfig {
	return CCGatewayRemoteConfig{Mode: "ssh", Host: "relay.example", Port: 22, User: "operator", AuthMode: "password", Password: "password-secret", HostKeyFingerprint: "SHA256:" + base64.RawStdEncoding.EncodeToString(make([]byte, 32))}
}

func TestCCGatewayRemoteEncryptedPersistenceAndPublicView(t *testing.T) {
	ctx := context.Background()
	repo := &ccgConfigRepository{}
	s := NewCCGatewayRemoteConfig(repo, ccgConfigCipher{})
	if c, e := s.Get(ctx); e != nil || c.Mode != "local" {
		t.Fatalf("default %+v %v", c, e)
	}
	in := ccgSSHConfig()
	saved, e := s.Save(ctx, in)
	if e != nil {
		t.Fatal(e)
	}
	for _, plain := range []string{in.Host, in.User, in.Password, "\"auth_mode\""} {
		if strings.Contains(repo.value, plain) {
			t.Fatalf("plaintext persisted: %s", plain)
		}
	}
	decoded, e := ccgConfigCipher{}.Decrypt(strings.TrimPrefix(repo.value, ccgatewayRemoteEnvelope))
	if e != nil || !strings.HasPrefix(decoded, ccgatewayRemotePurpose) {
		t.Fatal("missing encrypted purpose marker")
	}
	got, e := s.Get(ctx)
	if e != nil || got.Password != in.Password || got.Host != in.Host {
		t.Fatalf("round trip %+v %v", got.Public(), e)
	}
	for _, v := range []any{saved, saved.Public(), got.Public()} {
		b, _ := json.Marshal(v)
		if strings.Contains(string(b), "password-secret") || strings.Contains(string(b), `"password":`) {
			t.Fatal("secret in response")
		}
	}
	if !saved.Public().HasPassword || !got.Public().HasPassword {
		t.Fatal("missing credential indicator")
	}
	if _, e = s.Save(ctx, CCGatewayRemoteConfig{Mode: "local", Password: in.Password}); e != nil {
		t.Fatal(e)
	}
	got, e = s.Get(ctx)
	if e != nil || got.Mode != "local" || got.Password != "" || got.Host != "" {
		t.Fatal("local mode retained remote credentials")
	}
}

func TestCCGatewayRemoteSecretRetentionBoundToTarget(t *testing.T) {
	ctx := context.Background()
	repo := &ccgConfigRepository{}
	s := NewCCGatewayRemoteConfig(repo, ccgConfigCipher{})
	original := ccgSSHConfig()
	if _, e := s.Save(ctx, original); e != nil {
		t.Fatal(e)
	}
	same := original
	same.Password = ""
	same.Host = " RELAY.EXAMPLE "
	same.Port = 0
	if _, e := s.Save(ctx, same); e != nil {
		t.Fatal(e)
	}
	got, _ := s.Get(ctx)
	if got.Password != original.Password {
		t.Fatal("same-target password lost")
	}
	for _, change := range []func(*CCGatewayRemoteConfig){func(c *CCGatewayRemoteConfig) { c.Host = "other.example" }, func(c *CCGatewayRemoteConfig) { c.Port = 2222 }, func(c *CCGatewayRemoteConfig) { c.User = "other" }, func(c *CCGatewayRemoteConfig) { c.AuthMode = "private_key" }, func(c *CCGatewayRemoteConfig) {
		c.HostKeyFingerprint = "SHA256:" + base64.RawStdEncoding.EncodeToString([]byte(strings.Repeat("x", 32)))
	}} {
		candidate := original
		candidate.Password = ""
		change(&candidate)
		before := repo.value
		if _, e := s.Save(ctx, candidate); e == nil {
			t.Fatal("credential reused for a changed target")
		}
		if repo.value != before {
			t.Fatal("failed save modified stored config")
		}
	}
	candidate := original
	candidate.Host = "other.example"
	candidate.Password = "fresh-password"
	if _, e := s.Save(ctx, candidate); e != nil {
		t.Fatal(e)
	}
	got, _ = s.Get(ctx)
	if got.Password != "fresh-password" {
		t.Fatal("fresh credential ignored")
	}
}

func TestCCGatewayRemotePrivateKeyRetention(t *testing.T) {
	ctx := context.Background()
	repo := &ccgConfigRepository{}
	s := NewCCGatewayRemoteConfig(repo, ccgConfigCipher{})
	c := ccgSSHConfig()
	c.AuthMode = "private_key"
	c.PrivateKey = "private-key-secret"
	c.Passphrase = "passphrase-secret"
	if _, e := s.Save(ctx, c); e != nil {
		t.Fatal(e)
	}
	c.PrivateKey, c.Passphrase = "", ""
	c.HasPrivateKey = true
	if _, e := s.Save(ctx, c); e != nil {
		t.Fatal(e)
	}
	got, _ := s.Get(ctx)
	if got.PrivateKey != "private-key-secret" || got.Passphrase != "passphrase-secret" || got.Password != "" {
		t.Fatal("private-key credentials not preserved or inactive password retained")
	}
	c.PrivateKey = "replacement-key"
	if _, e := s.Save(ctx, c); e != nil {
		t.Fatal(e)
	}
	got, _ = s.Get(ctx)
	if got.Passphrase != "" {
		t.Fatal("old passphrase reused for new private key")
	}
}

func TestCCGatewayRemoteRejectsMalformedAndForeignCiphertext(t *testing.T) {
	ctx := context.Background()
	repo := &ccgConfigRepository{}
	s := NewCCGatewayRemoteConfig(repo, ccgConfigCipher{})
	for _, change := range []func(*CCGatewayRemoteConfig){func(c *CCGatewayRemoteConfig) { c.Mode = "other" }, func(c *CCGatewayRemoteConfig) { c.Host = "https://relay.example" }, func(c *CCGatewayRemoteConfig) { c.Host = "host:22" }, func(c *CCGatewayRemoteConfig) { c.User = "bad\nuser" }, func(c *CCGatewayRemoteConfig) { c.Port = 65536 }, func(c *CCGatewayRemoteConfig) { c.AuthMode = "agent" }, func(c *CCGatewayRemoteConfig) { c.HostKeyFingerprint = "" }} {
		c := ccgSSHConfig()
		change(&c)
		if _, e := s.Save(ctx, c); e == nil {
			t.Fatalf("invalid connection accepted: %+v", c.Public())
		}
	}
	for _, raw := range []string{`{"mode":"ssh"}`, ccgatewayRemoteEnvelope + "bad", ccgatewayRemoteEnvelope + base64.StdEncoding.EncodeToString([]byte("other-purpose:{\"mode\":\"local\"}"))} {
		repo.value = raw
		if _, e := s.Get(ctx); e == nil {
			t.Fatal("untrusted/plaintext configuration accepted")
		}
	}
	repo.value = ""
	s.encryptor = ccgConfigCipher{fail: true}
	if _, e := s.Save(ctx, ccgSSHConfig()); e == nil || strings.Contains(e.Error(), "password-secret") {
		t.Fatal("encryption failure leaked secret or accepted")
	}
	if repo.value != "" {
		t.Fatal("unencrypted fallback persisted")
	}
}

func TestCCGatewayRemoteIgnoresUntrustedCredentialIndicators(t *testing.T) {
	ctx := context.Background()
	repo := &ccgConfigRepository{}
	s := NewCCGatewayRemoteConfig(repo, ccgConfigCipher{})
	c := ccgSSHConfig()
	c.Password = ""
	c.HasPassword, c.HasPrivateKey, c.HasPassphrase = true, true, true
	if _, err := s.Save(ctx, c); err == nil || repo.value != "" {
		t.Fatal("client credential flags replaced actual credentials")
	}
	c.Password = "fresh-password"
	result, err := s.Save(ctx, c)
	if err != nil {
		t.Fatal(err)
	}
	view := result.Public()
	if !view.HasPassword || view.HasPrivateKey || view.HasPassphrase {
		t.Fatal("client credential flags leaked into response")
	}
	stored, err := s.Get(ctx)
	if err != nil || stored.HasPassword || stored.HasPrivateKey || stored.HasPassphrase {
		t.Fatal("client credential flags persisted")
	}
}

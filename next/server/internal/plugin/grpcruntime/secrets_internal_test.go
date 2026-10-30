package grpcruntime

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
)

func TestHostSecrets(t *testing.T) {
	ctx := context.Background()
	c, err := secret.New(bytes.Repeat([]byte{7}, 32))
	if err != nil {
		t.Fatal(err)
	}

	i, _ := testInstance(t, nil, nil, registry.Grants{})
	i.rt.o.Cipher = c
	h := &hostServer{i: i}
	if _, err := h.SecretSeal(ctx, &pluginv1.SecretSealRequest{Plaintext: []byte("k")}); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("seal without grant: %v", err)
	}

	i, _ = testInstance(t, nil, nil, registry.Grants{PermSecrets: json.RawMessage(`{}`)})
	i.rt.o.Cipher = c
	h = &hostServer{i: i}
	sealed, err := h.SecretSeal(ctx, &pluginv1.SecretSealRequest{Plaintext: []byte("sk-123"), Context: "channel:1"})
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(sealed.GetCiphertext(), []byte("sk-123")) {
		t.Fatal("ciphertext carries the plaintext")
	}
	opened, err := h.SecretOpen(ctx, &pluginv1.SecretOpenRequest{Ciphertext: sealed.GetCiphertext(), Context: "channel:1"})
	if err != nil || string(opened.GetPlaintext()) != "sk-123" {
		t.Fatalf("open: %q %v", opened.GetPlaintext(), err)
	}
	if _, err := h.SecretOpen(ctx, &pluginv1.SecretOpenRequest{Ciphertext: sealed.GetCiphertext(), Context: "channel:2"}); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("open with another context: %v", err)
	}
	// Bound to the plugin key: another plugin's AAD, the plugin config AAD
	// and an account AAD do not open it.
	for _, aad := range [][]byte{SecretAAD("other", "channel:1"), ConfigAAD(i.pkg.Key), []byte("account:1")} {
		if _, err := c.Decrypt(sealed.GetCiphertext(), aad); err == nil {
			t.Fatalf("opened with AAD %q", aad)
		}
	}
	if _, err := h.SecretSeal(ctx, &pluginv1.SecretSealRequest{Plaintext: make([]byte, SecretMaxBytes+1)}); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("oversize: %v", err)
	}
	if _, err := h.SecretSeal(ctx, &pluginv1.SecretSealRequest{Context: strings.Repeat("x", SecretMaxContextBytes+1)}); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("long context: %v", err)
	}
}

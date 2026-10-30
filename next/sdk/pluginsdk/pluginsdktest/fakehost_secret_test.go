package pluginsdktest

import (
	"context"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestFakeHostSecrets(t *testing.T) {
	f := NewFakeHost()
	ctx := context.Background()
	s, err := f.SecretSeal(ctx, &pluginv1.SecretSealRequest{Plaintext: []byte("sk"), Context: "channel:1"})
	if err != nil {
		t.Fatal(err)
	}
	o, err := f.SecretOpen(ctx, &pluginv1.SecretOpenRequest{Ciphertext: s.GetCiphertext(), Context: "channel:1"})
	if err != nil || string(o.GetPlaintext()) != "sk" {
		t.Fatalf("open: %q %v", o.GetPlaintext(), err)
	}
	if _, err := f.SecretOpen(ctx, &pluginv1.SecretOpenRequest{Ciphertext: s.GetCiphertext(), Context: "channel:2"}); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("other context: %v", err)
	}
}

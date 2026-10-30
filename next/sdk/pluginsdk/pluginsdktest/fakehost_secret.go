package pluginsdktest

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// fakeSecretKey is the fake host's master key: like the real host the
// ciphertext only opens for the same context, but the key is public.
var fakeSecretKey = []byte("pluginsdktest-fake-secret-key-32")

func fakeAEAD() cipher.AEAD {
	b, _ := aes.NewCipher(fakeSecretKey)
	g, _ := cipher.NewGCM(b)
	return g
}

func checkSecretArgs(n int, context string) error {
	if n > 64<<10 {
		return status.Error(codes.InvalidArgument, "secret too large")
	}
	if len(context) > 128 {
		return status.Error(codes.InvalidArgument, "context must be at most 128 bytes")
	}
	return nil
}

func (f *FakeHost) SecretSeal(_ context.Context, in *pluginv1.SecretSealRequest) (*pluginv1.SecretSealResponse, error) {
	if err := checkSecretArgs(len(in.GetPlaintext()), in.GetContext()); err != nil {
		return nil, err
	}
	g := fakeAEAD()
	nonce := make([]byte, g.NonceSize())
	_, _ = rand.Read(nonce)
	return &pluginv1.SecretSealResponse{Ciphertext: g.Seal(nonce, nonce, in.GetPlaintext(), []byte(in.GetContext()))}, nil
}

func (f *FakeHost) SecretOpen(_ context.Context, in *pluginv1.SecretOpenRequest) (*pluginv1.SecretOpenResponse, error) {
	if err := checkSecretArgs(0, in.GetContext()); err != nil {
		return nil, err
	}
	g := fakeAEAD()
	c := in.GetCiphertext()
	if len(c) < g.NonceSize() {
		return nil, status.Error(codes.InvalidArgument, "ciphertext does not open")
	}
	p, err := g.Open(nil, c[:g.NonceSize()], c[g.NonceSize():], []byte(in.GetContext()))
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "ciphertext does not open")
	}
	return &pluginv1.SecretOpenResponse{Plaintext: p}, nil
}

func (f *FakeHost) PriceUsage(ctx context.Context, in *pluginv1.PriceUsageRequest) (*pluginv1.PriceUsageResponse, error) {
	if f.PriceUsageFunc != nil {
		return f.PriceUsageFunc(ctx, in)
	}
	return &pluginv1.PriceUsageResponse{Reason: "no_price"}, nil
}

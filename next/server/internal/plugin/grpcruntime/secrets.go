package grpcruntime

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// PermSecrets grants SecretSeal / SecretOpen (CONTRACTS §72.2).
const PermSecrets = "secrets"

// Limits of SecretSeal / SecretOpen.
const (
	SecretMaxBytes        = 64 << 10
	SecretMaxContextBytes = 128
)

// SecretAAD binds a plugin secret to the plugin and the plugin's context, so
// neither another plugin nor another context (and never a plugin config or an
// account credential, which use other prefixes) opens it.
func SecretAAD(pluginKey, context string) []byte {
	return []byte("plugin-secret:" + pluginKey + ":" + context)
}

func (h *hostServer) SecretSeal(ctx context.Context, in *pluginv1.SecretSealRequest) (*pluginv1.SecretSealResponse, error) {
	if err := h.require(ctx, PermSecrets); err != nil {
		return nil, err
	}
	if len(in.GetPlaintext()) > SecretMaxBytes {
		return nil, status.Error(codes.InvalidArgument, "plaintext must be at most 64 KiB")
	}
	if len(in.GetContext()) > SecretMaxContextBytes {
		return nil, status.Error(codes.InvalidArgument, "context must be at most 128 bytes")
	}
	c, err := h.i.rt.o.Cipher.Encrypt(in.GetPlaintext(), SecretAAD(h.key(), in.GetContext()))
	if err != nil {
		return nil, status.Error(codes.Internal, "seal failed")
	}
	return &pluginv1.SecretSealResponse{Ciphertext: c}, nil
}

func (h *hostServer) SecretOpen(ctx context.Context, in *pluginv1.SecretOpenRequest) (*pluginv1.SecretOpenResponse, error) {
	if err := h.require(ctx, PermSecrets); err != nil {
		return nil, err
	}
	if len(in.GetContext()) > SecretMaxContextBytes {
		return nil, status.Error(codes.InvalidArgument, "context must be at most 128 bytes")
	}
	p, err := h.i.rt.o.Cipher.Decrypt(in.GetCiphertext(), SecretAAD(h.key(), in.GetContext()))
	if err != nil {
		// Wrong plugin, wrong context, a damaged value or a rotated-away key:
		// the plugin cannot tell them apart and must not be told which.
		return nil, status.Error(codes.InvalidArgument, "ciphertext does not open")
	}
	return &pluginv1.SecretOpenResponse{Plaintext: p}, nil
}

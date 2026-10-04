package pluginsdk_test

import (
	"context"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

type quotaPlatform struct{ minimalPlatform }

func (quotaPlatform) BuildQuotaRequest(context.Context, *pluginv1.BuildQuotaRequestRequest) (*pluginv1.BuildQuotaRequestResponse, error) {
	return &pluginv1.BuildQuotaRequestResponse{Url: "https://up.example.com/usage"}, nil
}

func (quotaPlatform) ParseQuotaResponse(context.Context, *pluginv1.ParseQuotaResponseRequest) (*pluginv1.QuotaResult, error) {
	return &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "5h", Utilization: 12}}}, nil
}

// A Platform without QuotaReader answers Unimplemented to both calls
// (CONTRACTS §44); with it, both are served.
func TestQuotaReaderOptional(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	opts := pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest([]byte(platformManifest))}}
	h := pluginsdktest.Start(t, minimalPlatform{}, opts)
	if _, err := h.Platform.BuildQuotaRequest(ctx, &pluginv1.BuildQuotaRequestRequest{}); status.Code(err) != codes.Unimplemented {
		t.Fatalf("BuildQuotaRequest without QuotaReader: %v", err)
	}
	if _, err := h.Platform.ParseQuotaResponse(ctx, &pluginv1.ParseQuotaResponseRequest{}); status.Code(err) != codes.Unimplemented {
		t.Fatalf("ParseQuotaResponse without QuotaReader: %v", err)
	}
	h2 := pluginsdktest.Start(t, quotaPlatform{}, opts)
	if r, err := h2.Platform.BuildQuotaRequest(ctx, &pluginv1.BuildQuotaRequestRequest{}); err != nil || r.GetUrl() == "" {
		t.Fatalf("BuildQuotaRequest: %v %v", r, err)
	}
	if r, err := h2.Platform.ParseQuotaResponse(ctx, &pluginv1.ParseQuotaResponseRequest{}); err != nil || len(r.GetWindows()) != 1 {
		t.Fatalf("ParseQuotaResponse: %v %v", r, err)
	}
}

type refreshPlatform struct{ minimalPlatform }

func (refreshPlatform) BuildRefreshRequest(context.Context, *pluginv1.BuildRefreshRequestRequest) (*pluginv1.BuildRefreshRequestResponse, error) {
	return &pluginv1.BuildRefreshRequestResponse{Url: "https://up.example.com/token"}, nil
}

func (refreshPlatform) ParseRefreshResponse(context.Context, *pluginv1.ParseRefreshResponseRequest) (*pluginv1.RefreshResult, error) {
	return &pluginv1.RefreshResult{CredentialsPatchJson: `{"access_token":"new"}`}, nil
}

// A Platform without CredentialRefresher answers Unimplemented to both
// calls (CONTRACTS §48); with it, both are served.
func TestCredentialRefresherOptional(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	opts := pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest([]byte(platformManifest))}}
	h := pluginsdktest.Start(t, minimalPlatform{}, opts)
	if _, err := h.Platform.BuildRefreshRequest(ctx, &pluginv1.BuildRefreshRequestRequest{}); status.Code(err) != codes.Unimplemented {
		t.Fatalf("BuildRefreshRequest without CredentialRefresher: %v", err)
	}
	if _, err := h.Platform.ParseRefreshResponse(ctx, &pluginv1.ParseRefreshResponseRequest{}); status.Code(err) != codes.Unimplemented {
		t.Fatalf("ParseRefreshResponse without CredentialRefresher: %v", err)
	}
	h2 := pluginsdktest.Start(t, refreshPlatform{}, opts)
	if r, err := h2.Platform.BuildRefreshRequest(ctx, &pluginv1.BuildRefreshRequestRequest{}); err != nil || r.GetUrl() == "" {
		t.Fatalf("BuildRefreshRequest: %v %v", r, err)
	}
	if r, err := h2.Platform.ParseRefreshResponse(ctx, &pluginv1.ParseRefreshResponseRequest{}); err != nil || r.GetCredentialsPatchJson() == "" {
		t.Fatalf("ParseRefreshResponse: %v %v", r, err)
	}
}

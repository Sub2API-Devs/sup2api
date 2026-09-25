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

const platformManifest = `{
  "apiVersion": 1, "key": "plat", "version": "0.1.0", "publisher": "test", "runtime": "grpc",
  "capabilities": [{"id": "platform.adapter.v1"}],
  "hostPermissions": [{"id": "platform.register"}],
  "accountTypes": [{"id": "apikey", "label": {"en": "API key"}, "form": {"mode": "schema"}, "platforms": [{"platform": "anthropic"}]}]
}`

// minimalPlatform implements Platform but not ModelLister.
type minimalPlatform struct{}

func (minimalPlatform) ValidateCredentials(context.Context, *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return &pluginv1.ValidateCredentialsResponse{}, nil
}
func (minimalPlatform) BuildUpstreamRequest(context.Context, *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	return &pluginv1.BuildUpstreamRequestResponse{Url: "https://up.example.com/v1/messages"}, nil
}
func (minimalPlatform) ClassifyError(context.Context, *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	return &pluginv1.ClassifyErrorResponse{}, nil
}
func (minimalPlatform) BuildTestRequest(context.Context, *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	return &pluginv1.BuildTestRequestResponse{Url: "https://up.example.com/v1/messages"}, nil
}

type listingPlatform struct{ minimalPlatform }

func (listingPlatform) BuildModelsRequest(context.Context, *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	return &pluginv1.BuildModelsRequestResponse{Url: "https://up.example.com/v1/models", IdsPath: "data.#.id"}, nil
}

// A Platform without ModelLister answers Unimplemented; with it, the
// request is served.
func TestBuildModelsRequestOptional(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	h := pluginsdktest.Start(t, minimalPlatform{}, pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest([]byte(platformManifest))}})
	if _, err := h.Platform.BuildModelsRequest(ctx, &pluginv1.BuildModelsRequestRequest{}); status.Code(err) != codes.Unimplemented {
		t.Fatalf("without ModelLister: %v", err)
	}
	h2 := pluginsdktest.Start(t, listingPlatform{}, pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest([]byte(platformManifest))}})
	r, err := h2.Platform.BuildModelsRequest(ctx, &pluginv1.BuildModelsRequestRequest{})
	if err != nil || r.GetIdsPath() != "data.#.id" {
		t.Fatalf("with ModelLister: %v %v", r, err)
	}
}

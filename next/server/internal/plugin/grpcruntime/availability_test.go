package grpcruntime

import (
	"context"
	"errors"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type availabilityRPC struct {
	pluginv1.PlatformServiceClient
	got  *pluginv1.CheckModelAvailabilityRequest
	code codes.Code
	wait bool
}

func (p *availabilityRPC) CheckModelAvailability(ctx context.Context, in *pluginv1.CheckModelAvailabilityRequest, _ ...grpc.CallOption) (*pluginv1.CheckModelAvailabilityResponse, error) {
	p.got = in
	if p.wait {
		<-ctx.Done()
		return nil, status.FromContextError(ctx.Err()).Err()
	}
	if p.code != codes.OK {
		return nil, status.Error(p.code, "test")
	}
	return &pluginv1.CheckModelAvailabilityResponse{Results: []*pluginv1.ModelAvailability{{AccountId: 8, Model: "mapped", State: pluginv1.ModelAvailability_AVAILABLE}}}, nil
}

func TestModelAvailabilityAdapter(t *testing.T) {
	i := &Instance{pkg: &registry.Package{Key: "availability", Version: "1"}, caps: map[string]bool{manifest.CapPlatformAdapter: true}, sems: newSemaphores(Concurrency{Hot: 1})}
	rpc := &availabilityRPC{}
	i.proc.Store(&proc{platform: rpc})
	checker, ok := i.Platform().(core.AccountModelAvailabilityPlugin)
	if !ok {
		t.Fatal("optional port missing")
	}
	in := &pluginv1.CheckModelAvailabilityRequest{Candidates: []*pluginv1.ModelAvailabilityCandidate{{AccountId: 8, AccountType: "oauth", Model: "mapped", ClientModel: "client", Quota: &pluginv1.AccountQuotaSnapshot{Revision: 9}}}, NowUnix: 10}
	out, err := checker.CheckModelAvailability(context.Background(), in)
	if err != nil || rpc.got != in || out.GetResults()[0].GetState() != pluginv1.ModelAvailability_AVAILABLE {
		t.Fatalf("adapter: %v %v", out, err)
	}
	for _, code := range []codes.Code{codes.Unimplemented, codes.Unavailable} {
		rpc.code = code
		if _, err := checker.CheckModelAvailability(context.Background(), in); err == nil || core.AsError(err).Code != core.ErrPluginUnavailable.Code {
			t.Fatalf("%s incorrectly treated as success: %v", code, err)
		}
	}
	rpc.wait = true
	ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond)
	defer cancel()
	if _, err := checker.CheckModelAvailability(ctx, in); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("timeout: %v", err)
	}
	i.proc.Store(nil)
	if _, err := checker.CheckModelAvailability(context.Background(), in); err == nil || core.AsError(err).Code != core.ErrPluginUnavailable.Code {
		t.Fatalf("offline: %v", err)
	}
}

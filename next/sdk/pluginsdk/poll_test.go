package pluginsdk

import (
	"context"
	"fmt"
	"slices"
	"sync"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type pollTestPlatform struct {
	Platform
	poll func(context.Context, *pluginv1.PollRequest) (*pluginv1.ReconcileResult, error)
}

func (p pollTestPlatform) Poll(ctx context.Context, in *pluginv1.PollRequest) (*pluginv1.ReconcileResult, error) {
	return p.poll(ctx, in)
}

type pollTestClient struct {
	pluginv1.HostServiceClient
	execute func(context.Context, *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error)
}

func (c pollTestClient) ExecuteHTTP(ctx context.Context, in *pluginv1.ExecutionHTTPRequest, _ ...grpc.CallOption) (*pluginv1.ExecutionHTTPResponse, error) {
	return c.execute(ctx, in)
}

func TestPollHTTPContextIsIsolatedAndExpires(t *testing.T) {
	var mu sync.Mutex
	seen := map[string]string{}
	contexts := map[string]context.Context{}
	client := pollTestClient{execute: func(_ context.Context, in *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
		mu.Lock()
		seen[in.Url] = in.ExecutionToken
		mu.Unlock()
		return &pluginv1.ExecutionHTTPResponse{Status: 200}, nil
	}}
	p := pollTestPlatform{poll: func(ctx context.Context, in *pluginv1.PollRequest) (*pluginv1.ReconcileResult, error) {
		mu.Lock()
		contexts[in.Entry.RefId] = ctx
		mu.Unlock()
		req := &pluginv1.ExecutionHTTPRequest{Url: in.Entry.RefId, ExecutionToken: "wrong-token", Body: []byte("body")}
		_, err := ExecuteHTTP(ctx, req)
		if req.ExecutionToken != "wrong-token" {
			return nil, fmt.Errorf("ExecuteHTTP mutated caller's request")
		}
		return &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_PENDING}, err
	}}
	s := platformServer{impl: p, runtime: &runtime{host: newHost(HostInfo{}, client, nil, false, 0)}}
	var wg sync.WaitGroup
	for _, id := range []string{"one", "two"} {
		wg.Go(func() {
			_, err := s.Poll(context.Background(), &pluginv1.PollRequest{Entry: &pluginv1.ReconcileEntry{RefId: id}, ExecutionToken: "token-" + id})
			if err != nil {
				t.Errorf("Poll(%s): %v", id, err)
			}
		})
	}
	wg.Wait()
	for _, id := range []string{"one", "two"} {
		if seen[id] != "token-"+id {
			t.Errorf("invocation %s used another token: %q", id, seen[id])
		}
		if contexts[id] == nil {
			t.Fatalf("missing context for %s", id)
		}
		_, err := ExecuteHTTP(contexts[id], &pluginv1.ExecutionHTTPRequest{})
		if status.Code(err) != codes.Canceled {
			t.Errorf("permission outlived Poll: %v", err)
		}
	}
}

func TestExecuteHTTPRequiresPollContext(t *testing.T) {
	_, err := ExecuteHTTP(context.Background(), &pluginv1.ExecutionHTTPRequest{})
	if status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("HTTP outside Poll accepted: %v", err)
	}
	ctx := context.WithValue(context.Background(), executionContextKey{}, executionContext{client: pollTestClient{}, token: "valid"})
	_, err = ExecuteHTTP(ctx, nil)
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("nil request accepted: %v", err)
	}
	_, err = (platformServer{impl: ordinaryTestPlatform{}}).Poll(context.Background(), &pluginv1.PollRequest{})
	if status.Code(err) != codes.Unimplemented {
		t.Fatalf("ordinary plugin unexpectedly supports Poll: %v", err)
	}
}

func TestPollRequiresNewHostEvenAfterInitialization(t *testing.T) {
	for _, inited := range []bool{false, true} {
		for _, version := range []int32{0, 1, 2} {
			rt := &runtime{capabilities: []string{manifest.CapPlatformPoll}, inited: inited}
			_, err := rt.InitHost(context.Background(), &pluginv1.InitHostRequest{HostApiVersion: version})
			if status.Code(err) != codes.FailedPrecondition || status.Convert(err).Message() != "polling requires host API version 3 or newer" {
				t.Fatalf("old host %d passed polling gate (inited %v): %v", version, inited, err)
			}
		}
	}
	rt := &runtime{capabilities: []string{manifest.CapPlatformPoll}}
	_, err := rt.InitHost(context.Background(), &pluginv1.InitHostRequest{HostApiVersion: protocol.HostAPIVersion})
	if status.Convert(err).Message() != "no host dialer" {
		t.Fatalf("current host did not reach ordinary initialization: %v", err)
	}
}

func TestPollManifestRequiresImplementation(t *testing.T) {
	m := &manifest.Manifest{}
	caps := map[string]bool{manifest.CapPlatformPoll: true, manifest.CapPlatformAdapter: true}
	if err := checkTaskManifest(ordinaryTestPlatform{}, m, caps); err == nil {
		t.Fatal("declared polling without implementation")
	}
	if err := checkTaskManifest(pollTestPlatform{}, m, caps); err != nil {
		t.Fatal(err)
	}
	delete(caps, manifest.CapPlatformAdapter)
	if err := checkTaskManifest(pollTestPlatform{}, m, caps); err == nil {
		t.Fatal("polling without platform adapter")
	}
}

func TestWebSocketCapabilityIsReportedForPlatforms(t *testing.T) {
	raw := []byte(`{"key":"ws","version":"0.1.0","capabilities":[{"id":"platform.adapter.v1"},{"id":"platform.websocket.v1"}]}`)
	rt, err := newRuntime(ordinaryTestPlatform{}, options{manifestRaw: raw}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Contains(rt.capabilities, manifest.CapPlatformWebSocket) {
		t.Fatalf("declared websocket capability not reported: %v", rt.capabilities)
	}
	if _, err = newRuntime(struct{}{}, options{manifestRaw: raw}, nil); err == nil {
		t.Fatal("websocket capability without a Platform accepted")
	}
}

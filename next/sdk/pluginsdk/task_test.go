package pluginsdk

import (
	"context"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type taskTestPlatform struct{ Platform }

func (taskTestPlatform) ParseTaskSubmission(_ context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.TaskSubmission, error) {
	return &pluginv1.TaskSubmission{UpstreamRefId: string(in.Body), SnapshotJson: `{"id":"job","status":"queued"}`}, nil
}

type ordinaryTestPlatform struct{ Platform }

func TestTaskSubmissionParserIsOptIn(t *testing.T) {
	ctx := context.Background()
	got, err := (platformServer{impl: taskTestPlatform{}}).ParseTaskSubmission(ctx, &pluginv1.ExtractUsageRequest{Body: []byte("job")})
	if err != nil || got.GetUpstreamRefId() != "job" {
		t.Fatalf("task parser failed: %v, %v", got, err)
	}
	_, err = (platformServer{impl: ordinaryTestPlatform{}}).ParseTaskSubmission(ctx, &pluginv1.ExtractUsageRequest{})
	if status.Code(err) != codes.Unimplemented {
		t.Fatalf("ordinary platform must not silently register an empty task: %v", err)
	}
}

type rankOnly struct{ AccountRanker }

func TestCapabilitiesIncludesRankOnlyPlugin(t *testing.T) {
	caps := Capabilities(rankOnly{})
	if len(caps) != 1 || caps[0] != manifest.CapSchedulerRank {
		t.Fatalf("rank-only capability omitted: %v", caps)
	}
}

func TestManagedTasksRejectOldHostBeforeInitialization(t *testing.T) {
	for _, version := range []int32{0, 1} {
		rt := &runtime{capabilities: []string{manifest.CapPlatformTasks}}
		_, err := rt.InitHost(context.Background(), &pluginv1.InitHostRequest{HostApiVersion: version})
		if status.Code(err) != codes.FailedPrecondition || status.Convert(err).Message() != "managed tasks require host API version 2 or newer" {
			t.Fatalf("host API %d was not rejected before opening the broker: %v", version, err)
		}
	}
	// With the required API the ordinary initialization path is reached. No
	// broker is installed in this unit test, so that is the next expected error.
	rt := &runtime{capabilities: []string{manifest.CapPlatformTasks}}
	_, err := rt.InitHost(context.Background(), &pluginv1.InitHostRequest{HostApiVersion: protocol.HostAPIVersion})
	if status.Convert(err).Message() != "no host dialer" {
		t.Fatalf("current host rejected by task gate: %v", err)
	}
	ordinary := &runtime{}
	_, err = ordinary.InitHost(context.Background(), &pluginv1.InitHostRequest{HostApiVersion: 1})
	if status.Convert(err).Message() != "no host dialer" {
		t.Fatalf("ordinary plugin incorrectly requires new host API: %v", err)
	}
}

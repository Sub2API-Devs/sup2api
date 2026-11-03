package pluginsdk

import (
	"context"
	"errors"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestJobMuxDispatches(t *testing.T) {
	m := NewJobMux()
	var got JobRun
	m.HandleJob("evaluate", func(_ context.Context, run JobRun) (JobResult, error) {
		got = run
		return JobResult{Message: "ok", Count: 3, RetryAfter: 1500 * time.Millisecond}, nil
	})
	resp, err := m.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: "evaluate", ScheduledAtUnix: 1_800_000_000,
		Manual: true, Scope: "node", Attempt: 2, RunId: "42", Args: []byte(`{"a":1}`)})
	if err != nil {
		t.Fatal(err)
	}
	if resp.GetMessage() != "ok" || resp.GetCount() != 3 || resp.GetRetryAfterMs() != 1500 {
		t.Fatalf("response %+v", resp)
	}
	want := JobRun{JobID: "evaluate", ScheduledAt: time.Unix(1_800_000_000, 0).UTC(), Manual: true, Scope: "node",
		Attempt: 2, RunID: "42", Args: []byte(`{"a":1}`)}
	if got.JobID != want.JobID || !got.ScheduledAt.Equal(want.ScheduledAt) || got.Manual != want.Manual || got.Scope != want.Scope ||
		got.Attempt != want.Attempt || got.RunID != want.RunID || string(got.Args) != string(want.Args) {
		t.Fatalf("run %+v, want %+v", got, want)
	}
}

// An older core sends only job_id, scheduled_at_unix and manual.
func TestJobMuxOldCoreRequest(t *testing.T) {
	m := NewJobMux()
	var got JobRun
	m.HandleJob("cleanup", func(_ context.Context, run JobRun) (JobResult, error) { got = run; return JobResult{}, nil })
	resp, err := m.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: "cleanup", ScheduledAtUnix: 1})
	if err != nil {
		t.Fatal(err)
	}
	if got.Args != nil || got.Attempt != 0 || got.Scope != "" || resp.GetRetryAfterMs() != 0 {
		t.Fatalf("run %+v resp %+v", got, resp)
	}
}

func TestJobMuxErrors(t *testing.T) {
	m := NewJobMux()
	if _, err := m.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: "missing"}); status.Code(err) != codes.NotFound {
		t.Fatalf("unknown job: %v", err)
	}
	m.HandleJob("boom", func(context.Context, JobRun) (JobResult, error) { return JobResult{}, errors.New("disk full") })
	_, err := m.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: "boom"})
	if status.Code(err) != codes.Internal || status.Convert(err).Message() != "disk full" {
		t.Fatalf("handler error: %v", err)
	}
	m.HandleJob("slow", func(ctx context.Context, _ JobRun) (JobResult, error) {
		<-ctx.Done()
		return JobResult{}, errors.New("stopped")
	})
	ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond)
	defer cancel()
	if _, err := m.RunJob(ctx, &pluginv1.RunJobRequest{JobId: "slow"}); status.Code(err) != codes.DeadlineExceeded {
		t.Fatalf("timed out job: %v", err)
	}
}

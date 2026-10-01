package gateway

import (
	"context"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type failedTaskStore struct {
	core.AsyncTasks
	code string
}

func (s failedTaskStore) FindTask(context.Context, core.TaskQuery) (*core.TaskSnapshot, error) {
	return &core.TaskSnapshot{PublicID: "s2task_failed", UpstreamID: "raw-secret", Model: testModel, State: "failed", ObservationStatus: "closed", FailureCode: s.code, FailureReason: "private upstream details", Body: []byte(`{"id":"raw-secret","status":"running"}`), IDPaths: []string{"id"}}, nil
}
func TestTaskFailureDoesNotServeStaleProgress(t *testing.T) {
	for code, want := range map[string]int{"task_not_found": 404, "task_poll_failed": 502, "task_timeout": 504} {
		t.Run(code, func(t *testing.T) {
			e, p := taskDraftEnv(t, failedTaskStore{code: code}, true)
			r := taskDraftGet(t, e, "s2task_failed", testKey)
			if r.status != want || !strings.Contains(string(r.body), code) || strings.Contains(string(r.body), "private") || strings.Contains(string(r.body), "running") {
				t.Fatalf("%d %s", r.status, r.body)
			}
			if len(e.up.keys()) != 0 || p.buildCount() != 0 {
				t.Fatal("failure query reached upstream")
			}
		})
	}
}

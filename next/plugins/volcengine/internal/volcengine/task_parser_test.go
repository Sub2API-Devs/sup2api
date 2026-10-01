package volcengine

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestManagedVideoSubmission(t *testing.T) {
	p := New() // No host: parsing must not read credentials or write a second ledger.
	for _, body := range []string{
		`{"id":"ark-1"}`, `{"task_id":"ark-1"}`, `{"data":{"id":"ark-1"}}`, `{"result":{"id":"ark-1"}}`,
	} {
		task, err := p.ParseTaskSubmission(context.Background(), &pluginv1.ExtractUsageRequest{
			Meta:    &pluginv1.RequestMeta{Protocol: ProtocolVideoSubmit, Model: "doubao-seedance-2-0-260128", UserId: 42},
			Account: &pluginv1.Account{Id: 7}, Status: 200, Body: []byte(body), Fields: requested(Res720, Ratio169, 5),
		})
		if err != nil {
			t.Fatalf("%s: %v", body, err)
		}
		if task.GetUpstreamRefId() != "ark-1" || task.GetNextCheckAfterSec() != firstCheckSec || task.GetDeadlineSec() != DeadlineSec {
			t.Fatalf("task = %v", task)
		}
		if task.GetUsage().GetReserve().GetRefId() != "ark-1" || task.GetUsage().GetReserve().GetTokens().GetOutputTokens() <= 0 {
			t.Fatalf("missing reservation: %v", task.GetUsage())
		}
		snapshot := task.GetSnapshotJson()
		if !json.Valid([]byte(snapshot)) || gjson.Get(snapshot, "id").String() != "ark-1" ||
			gjson.Get(snapshot, "status").String() != "queued" || gjson.Get(snapshot, "model").String() == "" {
			t.Fatalf("initial query snapshot = %s", snapshot)
		}
	}
}

func TestManagedVideoRejectsIncompleteSubmission(t *testing.T) {
	for _, tc := range []struct {
		body      string
		status    int32
		truncated bool
	}{
		{`{"id":"ark-1"}`, 200, true}, {`{"id":"ark-1"`, 200, false},
		{`{"id":"ark-1"}`, 500, false}, {`{}`, 200, false},
		{`{"id":123}`, 200, false}, {`{"id":{}}`, 200, false}, {`null`, 200, false},
	} {
		_, err := New().ParseTaskSubmission(context.Background(), &pluginv1.ExtractUsageRequest{
			Meta: &pluginv1.RequestMeta{Protocol: ProtocolVideoSubmit}, Body: []byte(tc.body), Status: tc.status, Truncated: tc.truncated,
		})
		if err == nil {
			t.Fatalf("accepted unusable task: %+v", tc)
		}
	}
}

func TestManagedVideoReconcileSnapshot(t *testing.T) {
	for _, tc := range []struct {
		body string
		want pluginv1.ReconcileResult_State
	}{
		{`{"status":"running","progress":0.7}`, pluginv1.ReconcileResult_PENDING},
		{`{"status":"succeeded","usage":{"completion_tokens":10},"content":{"video_url":"https://cdn.invalid/result.mp4"}}`, pluginv1.ReconcileResult_SETTLED},
		{`{"status":"succeeded","content":{"video_url":"https://cdn.invalid/result.mp4"}}`, pluginv1.ReconcileResult_SETTLED_ESTIMATE},
		{`{"status":"failed","error":{"message":"rejected"}}`, pluginv1.ReconcileResult_FAILED},
	} {
		r, err := New().ParseReconcileResponse(context.Background(), &pluginv1.ParseReconcileResponseRequest{
			Entry: &pluginv1.ReconcileEntry{RefId: "ark-1", TaskKind: "video"}, Status: 200, Body: []byte(tc.body),
		})
		if err != nil || r.GetState() != tc.want || !json.Valid([]byte(r.GetTaskSnapshotJson())) {
			t.Fatalf("%s: %v %v", tc.body, r, err)
		}
		var original, snapshot map[string]json.RawMessage
		_ = json.Unmarshal([]byte(tc.body), &original)
		_ = json.Unmarshal([]byte(r.GetTaskSnapshotJson()), &snapshot)
		for key, value := range original {
			if string(value) != string(snapshot[key]) {
				t.Fatalf("snapshot lost %s: %s", key, r.GetTaskSnapshotJson())
			}
		}
		if gjson.Get(r.GetTaskSnapshotJson(), "id").String() != "ark-1" {
			t.Fatalf("snapshot omitted task ID: %s", r.GetTaskSnapshotJson())
		}
	}
}

func TestVideoTruncatedResultCannotSettleOrReplaceSnapshot(t *testing.T) {
	for _, tc := range []struct {
		body      string
		truncated bool
	}{
		{`{"status":"succeeded","usage":{"completion_tokens":10}}`, true},
		{`{"status":"succeeded","usage":{"completion_tokens":10}`, false},
		{`{"status":"failed"`, false}, {`[]`, false},
	} {
		r, err := New().ParseReconcileResponse(context.Background(), &pluginv1.ParseReconcileResponseRequest{
			Entry: &pluginv1.ReconcileEntry{RefId: "ark-1", TaskKind: "video"}, Status: 200, Body: []byte(tc.body), Truncated: tc.truncated,
		})
		if err != nil || r.GetState() != pluginv1.ReconcileResult_POLL_FAILED || r.GetTaskSnapshotJson() != "" {
			t.Fatalf("incomplete response became authoritative: %+v -> %v %v", tc, r, err)
		}
	}
}

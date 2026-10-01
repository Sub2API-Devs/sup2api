package pluginsdk

import (
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"testing"
)

func TestClassifyPollResponse(t *testing.T) {
	for _, tc := range []struct {
		code      int32
		transport string
		truncated bool
		want      pluginv1.ReconcileResult_State
	}{
		{404, "", false, pluginv1.ReconcileResult_NOT_FOUND}, {410, "", false, pluginv1.ReconcileResult_NOT_FOUND},
		{401, "", false, pluginv1.ReconcileResult_POLL_FAILED}, {403, "", false, pluginv1.ReconcileResult_POLL_FAILED},
		{429, "", false, pluginv1.ReconcileResult_POLL_FAILED}, {503, "", false, pluginv1.ReconcileResult_POLL_FAILED},
		{200, "secret transport details", false, pluginv1.ReconcileResult_POLL_FAILED},
		{404, "", true, pluginv1.ReconcileResult_POLL_FAILED}, {200, "", false, pluginv1.ReconcileResult_PENDING},
	} {
		r := ClassifyPollResponse(tc.code, tc.transport, tc.truncated)
		if r.GetState() != tc.want {
			t.Fatalf("%+v: %v", tc, r)
		}
		if r != nil && (r.Reason == "" || r.TaskSnapshotJson != "" || r.Reason == tc.transport) {
			t.Fatalf("unsafe result: %v", r)
		}
	}
}

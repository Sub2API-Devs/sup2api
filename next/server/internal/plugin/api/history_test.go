package api

import (
	"context"
	"testing"
)

func TestHistoryEndpointsPaginationValidationAndPermissions(t *testing.T) {
	h, _ := newHarness(t)
	ctx := context.Background()
	if _, err := h.db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status) VALUES('history','{}','enabled');
        INSERT INTO plugin_rollouts(plugin_key,action,phase,target_version) VALUES('history','enable','active','1.0.0'),('history','upgrade','active','2.0.0')`); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/plugins/rollouts", "/plugins/history/rollouts", "/plugins/history/history"} {
		if code, out := h.do("GET", path+"?page_size=1", "admin", nil); code != 200 {
			t.Fatal(path, code, out)
		} else {
			list, ok := out["data"].([]any)
			if !ok || len(list) != 1 {
				t.Fatal(out)
			}
			page := out["page"].(map[string]any)
			if page["total"] != float64(2) {
				t.Fatal(page)
			}
		}
		if code, _ := h.do("GET", path, "viewer", nil); code != 403 {
			t.Fatal(path, code)
		}
		if code, _ := h.do("GET", path, "", nil); code != 401 {
			t.Fatal(path, code)
		}
	}
	for _, path := range []string{"/plugins/rollouts?since=bad", "/plugins/history/history?rollout_id=-1", "/plugins/history/history?rollout_id=bad"} {
		if code, out := h.do("GET", path, "admin", nil); code != 400 {
			t.Fatal(path, code, out)
		}
	}
	if _, err := h.db.Pool.Exec(ctx, `DELETE FROM plugins WHERE key='history'`); err != nil {
		t.Fatal(err)
	}
	if code, out := h.do("GET", "/plugins/history/history", "admin", nil); code != 200 || len(out["data"].([]any)) != 2 {
		t.Fatal(code, out)
	}
}

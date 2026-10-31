package group

import (
	"fmt"
	"testing"
)

func TestGroupEnvironment(t *testing.T) {
	e := setup(t)
	code, out := e.do(e.admin, "POST", "/groups", map[string]any{"name": "Env",
		"environment": map[string]int64{"relay_timeout_seconds": 90, "stream_idle": 0, "max_request_body_mb": 0}})
	if code != 400 {
		t.Fatalf("unknown key: %d %v", code, out)
	}
	code, out = e.do(e.admin, "POST", "/groups", map[string]any{"name": "Env",
		"environment": map[string]int64{"relay_timeout_seconds": 90, "max_request_body_mb": 0}})
	if code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	g := out["data"].(map[string]any)
	if fmt.Sprint(g["environment"]) != "map[relay_timeout_seconds:90]" {
		t.Fatalf("zero not dropped: %v", g["environment"])
	}
	path := fmt.Sprintf("/groups/%d", int64(g["id"].(float64)))

	// Absent leaves it; a range error is a field error.
	_, out = e.do(e.admin, "PATCH", path, map[string]any{"name": "Env2"})
	if fmt.Sprint(out["data"].(map[string]any)["environment"]) != "map[relay_timeout_seconds:90]" {
		t.Fatalf("absent changed it: %v", out)
	}
	if code, out = e.do(e.admin, "PATCH", path, map[string]any{"environment": map[string]int64{"relay_timeout_seconds": 999999}}); code != 400 {
		t.Fatalf("range: %d %v", code, out)
	}
	code, out = e.do(e.admin, "PATCH", path, map[string]any{"environment": map[string]int64{"task_poll_max_failures": 5}})
	if code != 200 || fmt.Sprint(out["data"].(map[string]any)["environment"]) != "map[task_poll_max_failures:5]" {
		t.Fatalf("replace: %d %v", code, out)
	}
	_, out = e.do(e.admin, "PATCH", path, map[string]any{"environment": map[string]int64{}})
	if fmt.Sprint(out["data"].(map[string]any)["environment"]) != "map[]" {
		t.Fatalf("clear: %v", out)
	}
}

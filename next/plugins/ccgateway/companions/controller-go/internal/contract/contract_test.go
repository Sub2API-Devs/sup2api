package contract

import (
	"errors"
	"testing"

	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

func dumps(v any) string { return string(pyjson.MustMarshal(v)) }

// covers: R5 Y3 (status answer: Python's key order and defaults)
func TestPublic(t *testing.T) {
	p := &Public{AccountID: "21", Container: "ccg-21-app", DiskQuota: store.DiskQuota{Status: store.QuotaLegacyUnbounded},
		Status: "pending", AuthMode: "oauth"}
	want := `{"account_id": "21", "container": "ccg-21-app", "cli": null, "active_runtime": null, "current_image": "", ` +
		`"target_image": "", "image_update_available": false, "target_image_available": false, "environment_pending": false, ` +
		`"disk_quota": {"limit_bytes": 0, "status": "legacy_unbounded"}, "status": "pending", "revision": "", ` +
		`"auth_mode": "oauth", "network": null, "app_ip": "", "gateway_ip": ""}`
	if got := dumps(p); got != want {
		t.Fatalf("\n got  %s\n want %s", got, want)
	}
	p.Network = netplan.Policy{Pool: "10.0.0.0/8", Allocation: "random"}
	if got := dumps(p); !contains(got, `"network": {"pool": "10.0.0.0/8", "allocation": "random"}`) {
		t.Fatal(got)
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

// covers: BL1 R2 R3 R6 R7 D6 (the other account answers)
func TestAnswers(t *testing.T) {
	cases := map[string]any{
		`{"account_id": "21", "status": "blocked", "revision": ""}`: &Blocked{AccountID: "21"},
		`{"runtimes": []}`: &RuntimeList{},
		`{"runtimes": [{"key": "12", "status": "blocked", "created_at": "2026-11-01T00:00:00Z"}]}`:                 &RuntimeList{Runtimes: []RuntimeRow{{"12", "blocked", "2026-11-01T00:00:00Z"}}},
		`{"deleted": true, "removed": {"containers": [], "networks": [], "volume": false}}`:                        &DeleteResult{},
		`{"deleted": true, "removed": {"containers": ["ccg-21-app"], "networks": ["ccg-21-net"], "volume": true}}`: &DeleteResult{Containers: []string{"ccg-21-app"}, Networks: []string{"ccg-21-net"}, Volume: true},
		`{"app_ip": "10.0.0.3", "port": 8787, "api_key": "k", "revision": "r"}`:                                    &Connection{"10.0.0.3", 8787, "k", "r"},
		`{"backend": "shared_xray", "ready": true}`:                                                                &EgressStatus{Ready: true},
	}
	for want, v := range cases {
		if got := dumps(v); got != want {
			t.Errorf("\n got  %s\n want %s", got, want)
		}
	}
}

// covers: H12 U2 R13 (upload errors: {"error"} plus extra keys)
func TestUploadError(t *testing.T) {
	e := &UploadError{Status: 409, Code: "offset_mismatch", Extra: pyjson.Ordered{{Key: "offset", Value: int64(5)}}}
	if dumps(e.Body()) != `{"error": "offset_mismatch", "offset": 5}` || e.Error() != "offset_mismatch" {
		t.Fatal(dumps(e.Body()))
	}
	cause := errors.New("eof")
	w := &UploadError{Status: 400, Code: "invalid_request", Err: cause}
	if !errors.Is(w, cause) || dumps(w.Body()) != `{"error": "invalid_request"}` || w.Error() != "invalid_request: eof" {
		t.Fatal(w)
	}
}

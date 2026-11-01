package scripts

import (
	"encoding/json"
	"testing"

	"ccgateway/controller/internal/pyreftest"
)

// covers: PV17 A8 PV10 W8 P3 P4 P6 P10 PV16 (every program run in a container, byte for byte)
func TestScriptsMatchPython(t *testing.T) {
	want := map[string]string{}
	for _, c := range pyreftest.Cases(t, "texts.json") {
		want[pyreftest.Str(c, "name")] = pyreftest.Str(c, "text")
	}
	telemetry := [][2]string{}
	for _, kv := range Telemetry {
		telemetry = append(telemetry, kv)
	}
	pairs := map[string]string{
		"manager.PREPARE_VOLUME":                 PrepareVolume,
		"manager.NFT_REPLACE":                    NFTReplace,
		"manager.PROBE_SCRIPT":                   Probe,
		"manager.verify_disk_quota(10737418240)": DiskQuota("10737418240"),
		"runtime_updates.TRUST_SCRIPT":           Trust,
		"runtime_updates.INFO_SCRIPT":            Info,
		"runtime_updates.LEGACY_SNAPSHOT_SCRIPT": LegacySnapshot,
		"runtime_updates.HEALTH_SCRIPT":          PairHealth,
		"worker_update.WORKER_HEALTH_SCRIPT":     WorkerHealth,
	}
	for name, got := range pairs {
		w, ok := want[name]
		if !ok {
			t.Fatalf("no vector %s", name)
		}
		if got != w {
			t.Errorf("%s differs:\n got  %q\n want %q", name, got, w)
		}
	}
	var py map[string]string
	if err := json.Unmarshal([]byte(want["json(manager.TELEMETRY_ENV)"]), &py); err != nil {
		t.Fatal(err)
	}
	if len(py) != len(Telemetry) {
		t.Fatal("telemetry count")
	}
	for _, kv := range Telemetry {
		if py[kv[0]] != kv[1] {
			t.Errorf("telemetry %s", kv[0])
		}
	}
	for name, list := range map[string][]string{"json(runtime_updates.REQUIRED)": Required, "json(runtime_updates.HEALTH_REQUIRED)": HealthRequired} {
		var py []string
		json.Unmarshal([]byte(want[name]), &py)
		if len(py) != len(list) {
			t.Fatalf("%s", name)
		}
		for i := range py {
			if py[i] != list[i] {
				t.Errorf("%s[%d]", name, i)
			}
		}
	}
}

package store

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/pyreftest"
)

var fixedNow = time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)

func samples(t *testing.T) map[string]pyreftest.Case {
	out := map[string]pyreftest.Case{}
	for _, c := range pyreftest.Cases(t, "state_samples.json") {
		out[pyreftest.Str(c, "name")] = c
	}
	return out
}

func open(t *testing.T) *Store {
	t.Helper()
	s, err := Open(filepath.Join(t.TempDir(), "root"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

// covers: RB1 S5-S23 (a Python state read and written back is byte-identical)
func TestStateRoundTripIsByteIdentical(t *testing.T) {
	n := 0
	for name, c := range samples(t) {
		file := pyreftest.Str(c, "file")
		if !strings.HasSuffix(file, "/state.json") && !strings.HasPrefix(file, "backups/") {
			continue
		}
		n++
		raw := pyreftest.Str(c, "bytes")
		st, err := ParseAccountState([]byte(raw))
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		out, err := st.Marshal()
		if err != nil || string(out) != raw {
			t.Errorf("%s:\n got  %s\n want %s", name, out, raw)
		}
		if again := st.Clone(); string(pyjson.MustMarshal(again)) != raw {
			t.Errorf("%s: Clone", name)
		}
	}
	if n < 6 {
		t.Fatalf("only %d state samples", n)
	}
}

// covers: RB1 S21 S22 S23 (unknown keys survive a change; known fields typed)
func TestStateFieldsAndUnknownKeys(t *testing.T) {
	c := samples(t)["ready-active-runtime-unknown-keys"]
	st, err := ParseAccountState([]byte(pyreftest.Str(c, "bytes")))
	if err != nil {
		t.Fatal(err)
	}
	if st.Status != StatusReady || st.EgressBackend.V != "shared_xray" || !st.EnvironmentPending.V ||
		st.EnvironmentDesired.V != (Environment{"en_US.UTF-8", "UTC"}) || st.DiskQuota.V.Status != QuotaEnforced ||
		st.Network.V.Pool != "10.20.0.0/16" || !st.ActiveRuntime.Set || !st.MigrationFailed.Set || st.AuthModeOrOAuth() != "oauth" {
		t.Fatalf("%+v", st)
	}
	if !st.Extra.Has("future_field") || !st.Has("uplink_ip") {
		t.Fatal("unknown and legacy keys kept")
	}
	st.Revision = strings.Repeat("b", 64)
	st.Pop("environment_desired")
	st.EnvironmentPending = Some(false)
	if !st.DropLegacyOwnEgress() || st.DropLegacyOwnEgress() {
		t.Fatal("DropLegacyOwnEgress reports presence once")
	}
	out := string(pyjson.MustMarshal(st))
	if !strings.Contains(out, `"future_field": {"x": [1, 2.5, "\u00e9", null], "nested": {"b": 1, "a": 2}}`) {
		t.Fatalf("unknown key changed: %s", out)
	}
	if strings.Contains(out, "environment_desired") || strings.Contains(out, "uplink_ip") || !strings.Contains(out, `"revision": "bbbb`) {
		t.Fatal(out)
	}
	// a popped key assigned again goes to the end, as in a dict
	st.EnvironmentDesired = Some(Environment{"C", ""})
	keys := st.Keys()
	if keys[len(keys)-1] != "environment_desired" {
		t.Fatal(keys)
	}
}

// covers: PV15 S10 S11 (a new state is the Python dict literal)
func TestNewAccountState(t *testing.T) {
	st := NewAccountState("api", "admin", "10.0.0.3", "10.0.0.2", "2026-11-01T00:00:00Z")
	st.Network = Some(netplan.Policy{Pool: "10.0.0.0/8", Allocation: "random"})
	st.DiskQuota = Some(DiskQuota{LimitBytes: 0, Status: QuotaUnbounded})
	want := `{"api_key": "api", "admin_key": "admin", "app_ip": "10.0.0.3", "gateway_ip": "10.0.0.2", "revision": "", ` +
		`"status": "pending", "created_at": "2026-11-01T00:00:00Z", "network": {"pool": "10.0.0.0/8", "allocation": "random"}, ` +
		`"disk_quota": {"limit_bytes": 0, "status": "unbounded"}}`
	if got := string(pyjson.MustMarshal(st)); got != want {
		t.Fatalf("\n got  %s\n want %s", got, want)
	}
	empty := &AccountState{}
	if got := string(pyjson.MustMarshal(empty)); got != "{}" {
		t.Fatal(got)
	}
	if empty.DiskQuotaOrLegacy().Status != QuotaLegacyUnbounded {
		t.Fatal("legacy default")
	}
	st.Mark("cli", "auth_mode")
	st.AuthMode, st.CLI = Some("oauth"), Some[any](pyjson.Ordered{{Key: "version", Value: "2.1.312"}})
	keys := st.Keys()
	if keys[len(keys)-2] != "cli" || keys[len(keys)-1] != "auth_mode" {
		t.Fatal(keys)
	}
	if _, err := ParseAccountState([]byte(`{"revision": 5}`)); err == nil {
		t.Fatal("a typed field of the wrong type is an error")
	}
	if _, err := ParseAccountState([]byte(`[]`)); err == nil {
		t.Fatal("not an object")
	}
}

// covers: S30-S33 RB5 (shared state round trip, unknown keys, schema check)
func TestSharedStateRoundTrip(t *testing.T) {
	raw := pyreftest.Str(samples(t)["shared-state"], "bytes")
	st, err := ParseSharedState([]byte(raw))
	if err != nil {
		t.Fatal(err)
	}
	if got := string(pyjson.MustMarshal(st)); got != raw {
		t.Fatalf("\n got  %s\n want %s", got, raw)
	}
	b, ok := st.Bindings.Get("4")
	if !ok || b.Active || b.Port != 20001 || !b.Extra.Has("future_binding_key") || st.Nodes.Len() != 3 || !st.Extra.Has("future_top_key") {
		t.Fatalf("%+v", st)
	}
	if strings.Join(st.Bindings.Keys(), ",") != "30,4" || strings.Join(st.Bindings.SortedKeys(), ",") != "30,4" {
		t.Fatal("binding order")
	}
	for _, tag := range st.Nodes.Keys() {
		n, _ := st.Nodes.Get(tag)
		if n.Tag() != tag {
			t.Fatalf("node %s tag %s", tag, n.Tag())
		}
	}
	b.Active = true
	st.Bindings.Set("5", NewBinding("10.0.5.2", "10.0.5.3", "n", "c", "eth5", 20002, "t", "r", true))
	st.Bindings.Delete("30")
	st.Nodes.Delete(st.Nodes.Keys()[0])
	again, err := ParseSharedState(pyjson.MustMarshal(st))
	if err != nil || again.Bindings.Len() != 2 || again.Nodes.Len() != 2 {
		t.Fatal(err)
	}
	if c := b.Clone(); !c.Active || c.Port != 20001 {
		t.Fatal("Clone")
	}
	for _, bad := range []string{`{"schema": 2}`, `{"salt": "x"}`, `{"schema": "1"}`, `[1]`, `{"schema": 1, "bindings": []}`} {
		if _, err := ParseSharedState([]byte(bad)); err == nil {
			t.Errorf("%s accepted", bad)
		}
	}
	if st, err := ParseSharedState([]byte(`null`)); st != nil || err != nil {
		t.Fatal("null is no state")
	}
	if st, err := ParseSharedState([]byte(`{"schema": 1.0}`)); err != nil || st == nil {
		t.Fatal("schema 1.0 == 1 in Python")
	}
	fresh := NewSharedState("s")
	if got := string(pyjson.MustMarshal(fresh)); got != `{"schema": 1, "salt": "s", "bindings": {}, "nodes": {}}` {
		t.Fatal(got)
	}
}

// covers: S1 S3 S2 (atomic private writes and the root lock)
func TestStoreFiles(t *testing.T) {
	s := open(t)
	if _, err := Open(s.Dir()); err == nil {
		t.Fatal("a second store on the same root must fail")
	}
	if err := s.EnsureAccountDir("21"); err != nil {
		t.Fatal(err)
	}
	if err := s.EnsureAccountDir("../x"); err == nil {
		t.Fatal("bad key")
	}
	if st, err := s.LoadState("21"); st != nil || err != nil {
		t.Fatal("no state yet")
	}
	st := NewAccountState("a", "b", "10.0.0.3", "10.0.0.2", "t")
	if err := s.SaveState("21", st); err != nil {
		t.Fatal(err)
	}
	if s.Exists("21/state.json.tmp") {
		t.Fatal("temporary file left")
	}
	back, err := s.LoadState("21")
	if err != nil || back.APIKey != "a" {
		t.Fatal(err)
	}
	raw, _ := s.StateBytes("21")
	if err := s.WriteBackup("21", raw); err != nil {
		t.Fatal(err)
	}
	if keys, _ := s.BackupKeys(); strings.Join(keys, ",") != "21" {
		t.Fatal(keys)
	}
	if err := s.RemoveBackup("21"); err != nil || s.Exists("backups/21.json") {
		t.Fatal("RemoveBackup")
	}
	desired := pyjson.Ordered{{Key: "revision", Value: "r"}, {Key: "auth", Value: "secret"}, {Key: "proxy", Value: nil}}
	if err := s.SaveDesired("21", desired); err != nil {
		t.Fatal(err)
	}
	if b, _ := s.ReadFile("21/egress-desired.json"); string(b) != `{"revision": "r", "proxy": null}` {
		t.Fatal(string(b))
	}
	if !desired.Has("auth") {
		t.Fatal("SaveDesired must not change its argument")
	}
	if d, err := s.LoadDesired("21"); err != nil || d.Has("auth") {
		t.Fatal(err)
	}
	if _, err := s.LoadDesired("22"); !errors.Is(err, fs.ErrNotExist) {
		t.Fatal(err)
	}
	os.WriteFile(s.Path("21/sing-box.json"), []byte("{}"), 0o600)
	if err := s.RemoveLegacyOwnEgressFiles("21"); err != nil || s.Exists("21/sing-box.json") {
		t.Fatal("legacy files")
	}
	entries, _ := s.AccountEntries()
	if len(entries) != 1 || entries[0].Name != "21" || !entries[0].IsDir {
		t.Fatal(entries)
	}
	if info, _ := s.Stat("21/state.json"); !info.Exists || info.IsDir {
		t.Fatal(info)
	}
	if info, _ := s.StatFollow("21"); !info.IsDir {
		t.Fatal(info)
	}
	if err := s.RemoveAccountDir("21"); err != nil || s.Exists("21") {
		t.Fatal("RemoveAccountDir")
	}
	if err := s.RemoveAccountDir("21"); err != nil {
		t.Fatal("idempotent")
	}
}

// covers: Y4 (byte order of keys, non-key names ignored)
func TestAccountEntriesOrder(t *testing.T) {
	s := open(t)
	for _, n := range []string{"3", "12", "d0123456789abcdef", "uploads", "backups", "x1"} {
		os.Mkdir(s.Path(n), 0o700)
	}
	os.WriteFile(s.Path("4"), nil, 0o600)
	entries, _ := s.AccountEntries()
	var got []string
	for _, e := range entries {
		got = append(got, e.Name)
	}
	if strings.Join(got, ",") != "12,3,4,d0123456789abcdef" || entries[2].IsDir {
		t.Fatal(got)
	}
}

// covers: S4 I3 (runtime.json restored only against the same environment)
func TestRuntimeImages(t *testing.T) {
	s := open(t)
	app, egress, err := s.RestoreRuntimeImages("app:1", "egress:1")
	if err != nil || app != "app:1" || egress != "egress:1" {
		t.Fatal("no file: the environment")
	}
	if err := s.SaveRuntimeImages("app:2", "egress:2", "app:1", "egress:1"); err != nil {
		t.Fatal(err)
	}
	if b, _ := s.ReadFile(RuntimeFile); string(b) != `{"app": "app:2", "egress": "egress:2", "env": {"app": "app:1", "egress": "egress:1"}}` {
		t.Fatal(string(b))
	}
	if app, egress, _ := s.RestoreRuntimeImages("app:1", "egress:1"); app != "app:2" || egress != "egress:2" {
		t.Fatal("restored")
	}
	if app, _, _ := s.RestoreRuntimeImages("app:9", "egress:1"); app != "app:9" || s.Exists(RuntimeFile) {
		t.Fatal("a changed environment discards the file")
	}
	for _, bad := range []string{`{"app": "Bad!", "egress": "e:1", "env": {"app": "a", "egress": "e"}}`, `[]`, `{`} {
		os.WriteFile(s.Path(RuntimeFile), []byte(bad), 0o600)
		if app, _, _ := s.RestoreRuntimeImages("a", "e"); app != "a" || s.Exists(RuntimeFile) {
			t.Fatalf("%s kept", bad)
		}
	}
	samples := samples(t)
	os.WriteFile(s.Path(RuntimeFile), []byte(pyreftest.Str(samples["runtime-json"], "bytes")), 0o600)
	if app, _, _ := s.RestoreRuntimeImages("app:test", "egress:test"); app != "app:test" || !s.Exists(RuntimeFile) {
		t.Fatal("Python's runtime.json")
	}
}

// covers: RB5 (legacy path migration; both present refuses to start)
func TestSharedStatePaths(t *testing.T) {
	s := open(t)
	if s.SharedExists() {
		t.Fatal("none yet")
	}
	st, created, err := s.LoadShared(func() string { return "fresh" })
	if err != nil || !created || st.Salt != "fresh" || s.Exists(SharedFile) {
		t.Fatal("a new state is not written before its first save")
	}
	raw := pyreftest.Str(samples(t)["shared-state"], "bytes")
	os.Mkdir(s.Path(LegacySharedDir), 0o700)
	os.WriteFile(s.Path(LegacySharedFile), []byte(raw), 0o600)
	st, created, err = s.LoadShared(func() string { t.Fatal("no new salt"); return "" })
	if err != nil || created || st.Bindings.Len() != 2 || s.Exists(LegacySharedFile) || !s.Exists(SharedFile) {
		t.Fatal("legacy file moved", err)
	}
	if err := s.SaveShared(st); err != nil {
		t.Fatal(err)
	}
	if b, _ := s.ReadFile(SharedFile); string(b) != raw {
		t.Fatal("save is byte-identical")
	}
	os.WriteFile(s.Path(LegacySharedFile), []byte(raw), 0o600)
	if _, _, err := s.LoadShared(func() string { return "x" }); !errors.Is(err, ErrSharedConflict) {
		t.Fatal(err)
	}
	os.Remove(s.Path(LegacySharedFile))
	os.WriteFile(s.Path(SharedFile), []byte(`{"schema": 2}`), 0o600)
	if _, _, err := s.LoadShared(func() string { return "x" }); !errors.Is(err, ErrSchema) {
		t.Fatal(err)
	}
}

// covers: S27 W6 (worker backups keep the newest five)
func TestWorkerBackups(t *testing.T) {
	s := open(t)
	s.EnsureAccountDir("21")
	start := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
	for i := 0; i < 7; i++ {
		name, err := s.SaveWorkerBackup("21", start.Add(time.Duration(i)*time.Second), strings.Repeat("ab", 32), strings.NewReader("prog"))
		if err != nil {
			t.Fatal(err)
		}
		if i == 0 && name != "20261101T000000Z-abababababab" {
			t.Fatal(name)
		}
	}
	os.WriteFile(s.Path("21/worker-backups/notes"), nil, 0o600)
	list, _ := s.WorkerBackups("21")
	if len(list) != 5 || list[0] != "20261101T000002Z-abababababab" {
		t.Fatal(list)
	}
	if _, err := s.SaveWorkerBackup("21", start, "short", strings.NewReader("")); err == nil {
		t.Fatal("digest check")
	}
}

// covers: 02-§5.4 (spool emptied at start; uploads directory private)
func TestSpoolAndUploads(t *testing.T) {
	s := open(t)
	f, err := s.CreateSpool()
	if err != nil {
		t.Fatal(err)
	}
	f.Close()
	if err := s.ResetSpool(); err != nil {
		t.Fatal(err)
	}
	if list, _ := os.ReadDir(s.Path(SpoolDir)); len(list) != 0 {
		t.Fatal("spool emptied")
	}
	dir, err := s.UploadsPath()
	if err != nil || filepath.Base(dir) != UploadsDir {
		t.Fatal(err)
	}
}

// TestWriteCompatFixtures writes Go-made state files with the values
// Python must read back (reference_vectors.py --check-go). The directory is
// CCG_COMPAT_OUT when set (the cross-language job), else a temporary one.
// covers: RB1 RB5 RB7
func TestWriteCompatFixtures(t *testing.T) {
	dir := os.Getenv("CCG_COMPAT_OUT")
	if dir == "" {
		dir = t.TempDir()
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	write := func(name string, v any) {
		b := pyjson.MustMarshal(v)
		if err := os.WriteFile(filepath.Join(dir, name+".go.json"), b, 0o644); err != nil {
			t.Fatal(err)
		}
		// the expectation is the same value through encoding/json-free pyjson,
		// sorted, so Python compares values and not bytes
		if err := os.WriteFile(filepath.Join(dir, name+".expect.json"), pyjson.MustMarshalSorted(v), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	for name, c := range samples(t) {
		raw := pyreftest.Str(c, "bytes")
		if name == "shared-state" {
			st, _ := ParseSharedState([]byte(raw))
			b, _ := st.Bindings.Get("4")
			b.Active = true
			write("shared-modified", st)
			continue
		}
		if strings.HasPrefix(name, "desired") || name == "runtime-json" {
			continue
		}
		st, err := ParseAccountState([]byte(raw))
		if err != nil {
			t.Fatal(err)
		}
		st.Revision = strings.Repeat("c", 64)
		st.EgressBackend = Some("shared_xray")
		write("state-"+name, st)
	}
	fresh := NewAccountState("k1", "k2", "10.9.0.3", "10.9.0.2", "2026-11-01T00:00:00Z")
	fresh.Network = Some(netplan.Policy{Pool: "10.9.0.0/16", Allocation: "sequential"})
	fresh.DiskQuota = Some(DiskQuota{LimitBytes: 10 << 30, Status: QuotaEnforced})
	fresh.AuthMode = Some("api_key")
	write("state-go-new", fresh)
	write("shared-go-new", NewSharedState(strings.Repeat("e", 64)))
	if list, _ := filepath.Glob(filepath.Join(dir, "*.go.json")); len(list) < 10 {
		t.Fatalf("only %d files", len(list))
	}
}

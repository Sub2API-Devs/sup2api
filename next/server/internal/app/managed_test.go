package app

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	runtimecontract "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/background"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

type managedGeneration struct {
	core.Generation
	info core.PluginInfo
}

func (g managedGeneration) Plugin(key string) (core.PluginInfo, bool) {
	return g.info, g.info.Key == key
}

type managedRegistry struct {
	core.PluginRegistry
	generation core.Generation
}

func (r managedRegistry) Current() core.Generation { return r.generation }

func TestManagedReadinessFollowsIndependentApprovedPlugins(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	_, err := db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status,active_version) VALUES('thirdparty','{}','enabled','2.0.0');
		INSERT INTO plugin_versions(plugin_key,version,manifest,manifest_hash,package_sha256,package_size,signature_status,consent_status)
		VALUES('thirdparty','2.0.0','{}','hash','hash',5,'valid','approved')`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = approvedPluginsReady(ctx, db, registry.New(), "0.1.0"); err == nil {
		t.Fatal("missing third-party runtime was ready")
	}
	reg := managedRegistry{generation: managedGeneration{info: core.PluginInfo{Key: "thirdparty", Version: "2.0.0", Manifest: &manifest.Manifest{HostCompat: ">=0.1.0 <0.2.0"}}}}
	if _, err = approvedPluginsReady(ctx, db, reg, "0.1.0-dev"); err != nil {
		t.Fatal(err)
	}
	if _, err = approvedPluginsReady(ctx, db, reg, "0.2.0"); err == nil {
		t.Fatal("incompatible core was ready")
	}
	_, err = db.Pool.Exec(ctx, `UPDATE plugin_versions SET consent_status='rejected' WHERE plugin_key='thirdparty'`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = approvedPluginsReady(ctx, db, reg, "0.1.0"); err == nil {
		t.Fatal("revoked plugin was ready")
	}
	_, err = db.Pool.Exec(ctx, `UPDATE plugins SET status='disabled' WHERE key='thirdparty'`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = approvedPluginsReady(ctx, db, registry.New(), "0.1.0"); err != nil {
		t.Fatal("disabled independent plugin blocked core", err)
	}
	// A removed bundled plugin is absent from the authority and is never
	// restored or made a startup requirement by the new core's bundle.
	_, err = db.Pool.Exec(ctx, `DELETE FROM plugins WHERE key='thirdparty'`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = approvedPluginsReady(ctx, db, registry.New(), "0.1.0"); err != nil {
		t.Fatal(err)
	}
}

// An emergency revocation commits in PG first; a node whose loaded generation
// still holds the revoked grant must not report ready until it reloads.
func TestManagedReadinessWaitsForPermissionRevocation(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	_, err := db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status,active_version) VALUES('granted','{}','enabled','1.0.0');
		INSERT INTO plugin_versions(plugin_key,version,manifest,manifest_hash,package_sha256,package_size,signature_status,consent_status)
		VALUES('granted','1.0.0','{}','hash','hash',5,'valid','approved');
		INSERT INTO plugin_permission_grants(plugin_key,permission,status,plugin_version,manifest_hash)
		VALUES('granted','db.schema','granted','1.0.0','hash'),('granted','net.outbound','granted','1.0.0','hash')`)
	if err != nil {
		t.Fatal(err)
	}
	m := &manifest.Manifest{HostCompat: ">=0.1.0 <0.2.0", HostPermissions: []manifest.HostPermission{{ID: "db.schema"}, {ID: "net.outbound", Optional: true}}}
	loaded := func(granted ...string) managedRegistry {
		return managedRegistry{generation: managedGeneration{info: core.PluginInfo{Key: "granted", Version: "1.0.0", Manifest: m, GrantedPermissions: granted}}}
	}
	if _, err = approvedPluginsReady(ctx, db, loaded("db.schema", "net.outbound"), "0.1.0"); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Pool.Exec(ctx, `UPDATE plugin_permission_grants SET status='revoked' WHERE plugin_key='granted' AND permission='net.outbound'`); err != nil {
		t.Fatal(err)
	}
	if _, err = approvedPluginsReady(ctx, db, loaded("db.schema", "net.outbound"), "0.1.0"); err == nil || !strings.Contains(err.Error(), "revocation has not converged") {
		t.Fatalf("stale optional grant kept the node ready: %v", err)
	}
	if _, err = approvedPluginsReady(ctx, db, loaded("db.schema"), "0.1.0"); err != nil {
		t.Fatalf("reloaded generation without the revoked grant: %v", err)
	}
	if _, err = db.Pool.Exec(ctx, `UPDATE plugin_permission_grants SET status='revoked' WHERE plugin_key='granted' AND permission='db.schema'`); err != nil {
		t.Fatal(err)
	}
	if _, err = approvedPluginsReady(ctx, db, loaded(), "0.1.0"); err == nil || !strings.Contains(err.Error(), "required permission") {
		t.Fatalf("revoked required permission kept the node ready: %v", err)
	}
}

func controlCall(h http.Handler, method, path, token string, body any) *httptest.ResponseRecorder {
	b, _ := json.Marshal(body)
	r := httptest.NewRequest(method, path, bytes.NewReader(b))
	r.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestManagedCandidateAuthenticatesAndDoesNoWork(t *testing.T) {
	m := &managedCore{hello: runtimecontract.Hello{Protocol: 1, NodeID: "n", BootID: "boot", ReleaseDigest: "release"}, token: strings.Repeat("t", 32), mode: "candidate", shutdown: make(chan struct{})}
	var starts atomic.Int32
	h := m.handler(func(runtimecontract.PrepareRequest) { starts.Add(1) })
	if w := controlCall(h, "GET", runtimecontract.StatusPath, "wrong", nil); w.Code != 401 {
		t.Fatal(w.Code)
	}
	if w := controlCall(h, "GET", runtimecontract.StatusPath, m.token, nil); w.Code != 200 {
		t.Fatal(w.Code)
	}
	if m.backgroundAllowed() || m.coordinateAllowed() || starts.Load() != 0 {
		t.Fatal("candidate admitted work")
	}
	p := runtimecontract.PrepareRequest{BootID: "other", ReleaseDigest: "release"}
	if w := controlCall(h, "POST", runtimecontract.PreparePath, m.token, p); w.Code != 409 {
		t.Fatal(w.Code)
	}
	p.BootID = "boot"
	for range 2 {
		if w := controlCall(h, "POST", runtimecontract.PreparePath, m.token, p); w.Code != 202 {
			t.Fatal(w.Code)
		}
	}
	if starts.Load() != 1 {
		t.Fatal("duplicate preparation")
	}
	p.AllowMigration = true
	if w := controlCall(h, "POST", runtimecontract.PreparePath, m.token, p); w.Code != 409 {
		t.Fatal("changed permission accepted")
	}
	if w := controlCall(h, "POST", runtimecontract.ShutdownPath, m.token, nil); w.Code != 409 {
		t.Fatal("shutdown before barrier")
	}
}

func TestOnlyExplicitBootstrapCanCoordinateBeforeAdmission(t *testing.T) {
	for _, mode := range []string{"candidate", "preparing", "prepared", "draining", "drained", "failed"} {
		for _, bootstrap := range []bool{false, true} {
			m := &managedCore{mode: mode, prepare: runtimecontract.PrepareRequest{Bootstrap: bootstrap}}
			want := bootstrap && (mode == "preparing" || mode == "prepared")
			if got := m.coordinateAllowed(); got != want {
				t.Errorf("mode=%s bootstrap=%v coordination=%v want=%v", mode, bootstrap, got, want)
			}
			if m.backgroundAllowed() {
				t.Errorf("mode=%s bootstrap=%v admitted background work", mode, bootstrap)
			}
			if m.status(context.Background()).Ready {
				t.Errorf("mode=%s bootstrap=%v admitted HTTP", mode, bootstrap)
			}
		}
	}
	m := &managedCore{mode: "prepared", prepare: runtimecontract.PrepareRequest{Bootstrap: true}, gate: &requestGate{}}
	if !m.coordinateAllowed() {
		t.Fatal("bootstrap cannot complete required plugin rollout")
	}
	m.drain()
	if m.coordinateAllowed() || m.backgroundAllowed() {
		t.Fatal("bootstrap permissions survived drain")
	}
	// Once serving, only the persisted role applies, even to a bootstrap boot.
	m.mu.Lock()
	m.mode = "serving"
	m.admission = runtimecontract.Admission{}
	m.mu.Unlock()
	if m.coordinateAllowed() {
		t.Fatal("bootstrap bypassed serving role revocation")
	}
}

func TestManagedAdmissionUsesPersistedBootAndRoles(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	_, err := db.Pool.Exec(ctx, `CREATE SCHEMA updater; CREATE TABLE updater.node_admissions(
		node_id text PRIMARY KEY,core_boot_id text,release_digest text,revision bigint,
		serve_http bool,claim_background bool,coordinate_plugins bool);
		INSERT INTO updater.node_admissions VALUES('node','boot','release',2,true,true,true)`)
	if err != nil {
		t.Fatal(err)
	}
	m := &managedCore{hello: runtimecontract.Hello{NodeID: "node", BootID: "boot", ReleaseDigest: "release"}, token: strings.Repeat("t", 32), mode: "prepared", gate: &requestGate{}, shutdown: make(chan struct{})}
	m.gate.stop()
	m.validate = func(ctx context.Context, a runtimecontract.Admission) error {
		return verifyAdmission(ctx, db, "node", a)
	}
	m.check = func(ctx context.Context) (string, error) {
		return approvedPluginsReady(ctx, db, registry.New(), "0.1.0")
	}
	var starts atomic.Int32
	m.start = func() error { starts.Add(1); return nil }
	e := background.New(1)
	e.Admitted = m.backgroundAllowed
	g := e.Group(ctx, 1, 0)
	if _, err := g.TryAcquire(ctx); err == nil {
		t.Fatal("prepared node acquired background permit")
	}
	h := m.handler(func(runtimecontract.PrepareRequest) { t.Fatal("unexpected prepare") })
	a := runtimecontract.Admission{BootID: "boot", ReleaseDigest: "release", Revision: 1, ServeHTTP: true, ClaimBackground: true, CoordinatePlugins: true}
	if w := controlCall(h, "POST", runtimecontract.AdmissionPath, m.token, a); w.Code != 409 {
		t.Fatal("stale revision", w.Code)
	}
	a.Revision = 2
	a.ClaimBackground = false
	if w := controlCall(h, "POST", runtimecontract.AdmissionPath, m.token, a); w.Code != 409 {
		t.Fatal("unapproved roles", w.Code)
	}
	a.ClaimBackground = true
	if w := controlCall(h, "POST", runtimecontract.AdmissionPath, m.token, a); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	if starts.Load() != 1 || m.gate.isDraining() {
		t.Fatal("not admitted")
	}
	if _, err = db.Pool.Exec(ctx, `UPDATE updater.node_admissions SET revision=3`); err != nil {
		t.Fatal(err)
	}
	if err = verifyLiveAdmission(ctx, db, "node", a); err != nil {
		t.Fatal("benign permit refresh revoked serving boot", err)
	}
	if err = verifyAdmission(ctx, db, "node", a); err == nil {
		t.Fatal("stale ApplyAdmission accepted")
	}
	if _, err = db.Pool.Exec(ctx, `UPDATE updater.node_admissions SET claim_background=false`); err != nil {
		t.Fatal(err)
	}
	if err = verifyLiveAdmission(ctx, db, "node", a); err == nil {
		t.Fatal("role revocation ignored")
	}
	p, err := g.TryAcquire(ctx)
	if err != nil {
		t.Fatal(err)
	}
	p.Release()
	m.drain()
	if _, err := g.TryAcquire(ctx); err == nil {
		t.Fatal("draining node admitted background")
	}
	if !m.gate.isDraining() || m.status(ctx).DrainComplete {
		t.Fatal("drain barrier bypassed")
	}
	if w := controlCall(h, "POST", runtimecontract.AdmissionPath, m.token, a); w.Code != 409 {
		t.Fatal("drained runtime resumed")
	}
}

func TestManagedSchemaCheckIsReadOnly(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	if err := verifyCoreSchema(ctx, db); err != nil {
		t.Fatal(err)
	}
	_, err := db.Pool.Exec(ctx, `DELETE FROM schema_migrations WHERE id=(SELECT min(id) FROM schema_migrations)`)
	if err != nil {
		t.Fatal(err)
	}
	var before, after int
	_ = db.Pool.QueryRow(ctx, `SELECT count(*) FROM schema_migrations`).Scan(&before)
	if err = verifyCoreSchema(ctx, db); err == nil {
		t.Fatal("missing migration not rejected")
	}
	_ = db.Pool.QueryRow(ctx, `SELECT count(*) FROM schema_migrations`).Scan(&after)
	if before != after {
		t.Fatal("readiness applied migrations")
	}
}

// The shell refuses releases whose Host API differs from runtime-contract; the
// core reports the SDK's value, so the two constants must move together.
func TestManagedHostAPIMatchesRuntimeContract(t *testing.T) {
	if protocol.HostAPIVersion != runtimecontract.HostAPIVersion {
		t.Fatalf("SDK Host API %d differs from runtime-contract %d", protocol.HostAPIVersion, runtimecontract.HostAPIVersion)
	}
}

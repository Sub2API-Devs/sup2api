package install

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/grants"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
)

// revokedEnv runs one plugin ("mini") through versions that ask for the
// low-risk kv (required) and, when withLog, log (optional).
type revokedEnv struct {
	*env
	t *testing.T
}

func (e revokedEnv) manifest(version string, withLog bool) *manifest.Manifest {
	m := pkgtest.Minimal("mini", version, "sub2api")
	if withLog {
		m.HostPermissions = append(m.HostPermissions, manifest.HostPermission{ID: "log", Optional: true})
	}
	return m
}

func (e revokedEnv) upload(version string, withLog bool) *Review {
	e.t.Helper()
	r, err := e.svc.Upload(context.Background(), pkgtest.Build(e.manifest(version, withLog), e.root), e.admin, UploadOptions{})
	if err != nil {
		e.t.Fatalf("upload %s: %v", version, err)
	}
	return r
}

func (e revokedEnv) consent(version string, req ConsentRequest) error {
	_, err := e.svc.Consent(context.Background(), "mini", version, req, e.admin)
	return err
}

// activate is the rollout commit of version.
func (e revokedEnv) activate(version string, withLog bool) {
	e.t.Helper()
	ctx := context.Background()
	if err := e.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := grants.Promote(ctx, tx, "mini", version); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE plugins SET status = 'enabled', active_version = $1 WHERE key = 'mini'`, version); err != nil {
			return err
		}
		return NewDefaultsApplier(nil).ApplyDefaults(ctx, tx, e.manifest(version, withLog), nil)
	}); err != nil {
		e.t.Fatal(err)
	}
}

func (e revokedEnv) statuses(version string) map[string]string {
	e.t.Helper()
	g, err := LoadVersionGrants(context.Background(), e.db.Pool, "mini", version)
	if err != nil {
		e.t.Fatal(err)
	}
	out := map[string]string{}
	for id, gr := range g {
		out[id] = gr.Status
	}
	return out
}

func revokedOf(r *Review) map[string]bool {
	out := map[string]bool{}
	for _, hp := range r.HostPermissions {
		if hp.Revoked {
			out[hp.ID] = true
		}
	}
	return out
}

// A low-risk host permission an administrator revoked is not granted again
// by default in a later consent: only an explicit grant restores it. A
// required one must then be granted explicitly; an optional one the request
// does not grant stays revoked (also when it is listed as denied, as the
// console sends it), in the staged set and after the activation, also
// across a version that no longer asks for it and an abandoned upgrade.
func TestRevokedLowRiskGrantIsNotGrantedByDefault(t *testing.T) {
	e := revokedEnv{env: newEnv(t), t: t}
	ctx := context.Background()

	e.upload("0.1.0", true)
	if err := e.consent("0.1.0", ConsentRequest{}); err != nil {
		t.Fatalf("first consent: %v", err)
	}
	if s := e.statuses("0.1.0"); s["kv"] != GrantGranted || s["log"] != GrantGranted {
		t.Fatalf("low-risk permissions are granted by default on install: %v", s)
	}
	e.activate("0.1.0", true)
	for _, p := range []string{"kv", "log"} {
		if err := e.svc.RevokeGrant(ctx, "mini", p, e.admin); err != nil {
			t.Fatalf("revoke %s: %v", p, err)
		}
	}

	// The upgrade is not approved on upload (the revoked ones count as added)
	// and its review marks them.
	r := e.upload("0.2.0", true)
	if r.ConsentStatus != ConsentAwaiting {
		t.Fatalf("upgrade after a revocation approved on upload: %s", r.ConsentStatus)
	}
	if rv := revokedOf(r); !rv["kv"] || !rv["log"] {
		t.Fatalf("review of 0.2.0 does not mark the revoked permissions: %+v", r.HostPermissions)
	}
	if rr, err := e.svc.Review(ctx, "mini", "0.2.0"); err != nil || !revokedOf(rr)["kv"] {
		t.Fatalf("stored review of 0.2.0: %v %+v", err, rr)
	}

	// kv is required: a consent not naming it fails, the version waits.
	if err := e.consent("0.2.0", ConsentRequest{}); fieldCode(err, "permission:kv") != "consent_required" {
		t.Fatalf("consent to 0.2.0 not naming the revoked kv: %v (staged %v)", err, e.statuses("0.2.0"))
	}
	// Naming kv restores it; log (optional, listed as denied as the console
	// sends an unticked one) stays revoked.
	if err := e.consent("0.2.0", ConsentRequest{Grants: []GrantInput{{Permission: "kv"}}, Denied: []string{"log"}}); err != nil {
		t.Fatalf("consent to 0.2.0 naming kv: %v", err)
	}
	if s := e.statuses("0.2.0"); s["kv"] != GrantGranted || s["log"] != GrantRevoked {
		t.Fatalf("staged grants of 0.2.0: %v", s)
	}
	var carried string
	if err := e.db.Pool.QueryRow(ctx, `SELECT d->>'carried' FROM audit_logs, jsonb_array_elements(detail->'decisions') d
		WHERE action = 'plugin.consent' AND target_id = 'mini' AND detail->>'version' = '0.2.0' AND d->>'permission' = 'kv'`).Scan(&carried); err != nil || carried != "false" {
		t.Fatalf("kv decision audit: %q %v", carried, err)
	}
	e.activate("0.2.0", true)

	// A version that no longer asks for log keeps its revocation; the one
	// after asks again and does not get it by default. kv, restored, is
	// carried over on upload.
	if r := e.upload("0.3.0", false); r.ConsentStatus != ConsentApproved {
		t.Fatalf("0.3.0 (kv restored, log dropped) not approved on upload: %s", r.ConsentStatus)
	}
	e.activate("0.3.0", false)
	if g, _ := LoadGrants(ctx, e.db.Pool, "mini"); g["log"].Status != GrantRevoked {
		t.Fatalf("log after a version without it: %+v", g["log"])
	}
	e.upload("0.4.0", true)
	if err := e.consent("0.4.0", ConsentRequest{}); err != nil {
		t.Fatalf("consent to 0.4.0: %v", err)
	}
	if s := e.statuses("0.4.0"); s["kv"] != GrantGranted || s["log"] != GrantRevoked {
		t.Fatalf("staged grants of 0.4.0: %v", s)
	}

	// Granting log explicitly restores it for later consents too.
	e.upload("0.5.0", true)
	if err := e.consent("0.5.0", ConsentRequest{Grants: []GrantInput{{Permission: "log"}}}); err != nil {
		t.Fatalf("consent to 0.5.0: %v", err)
	}
	e.upload("0.6.0", true)
	if err := e.consent("0.6.0", ConsentRequest{}); err != nil {
		t.Fatalf("consent to 0.6.0: %v", err)
	}
	if s := e.statuses("0.6.0"); s["log"] != GrantGranted {
		t.Fatalf("log after its explicit grant to 0.5.0: %v", s)
	}
}

// A revocation made only in a staged set (the running version does not ask
// for the permission) survives the withdrawal of that set when the upgrade
// is abandoned: consenting to the version again does not grant it by
// default.
func TestRevocationOutlivesAWithdrawnStagedSet(t *testing.T) {
	e := revokedEnv{env: newEnv(t), t: t}
	ctx := context.Background()
	e.upload("0.1.0", false)
	if err := e.consent("0.1.0", ConsentRequest{}); err != nil {
		t.Fatal(err)
	}
	e.activate("0.1.0", false)
	e.upload("0.2.0", true)
	if err := e.consent("0.2.0", ConsentRequest{}); err != nil {
		t.Fatal(err)
	}
	if err := e.svc.RevokeGrant(ctx, "mini", "log", e.admin); err != nil {
		t.Fatal(err)
	}
	if err := e.db.Tx(ctx, func(tx pgx.Tx) error { return grants.Withdraw(ctx, tx, "mini", "0.2.0", "failed") }); err != nil {
		t.Fatal(err)
	}
	if err := e.consent("0.2.0", ConsentRequest{}); err != nil {
		t.Fatalf("consent to 0.2.0 again: %v", err)
	}
	if s := e.statuses("0.2.0"); s["kv"] != GrantGranted || s["log"] != GrantRevoked {
		t.Fatalf("staged grants of 0.2.0 after the withdrawal: %v", s)
	}
	// The running version, which does not ask for log, is not given it.
	if g, err := grants.Granted(ctx, e.db.Pool, "mini", "0.1.0", e.manifest("0.1.0", false).HostPermissions); err != nil || len(g) != 1 {
		t.Fatalf("0.1.0 runs with %v (%v)", g, err)
	}
}

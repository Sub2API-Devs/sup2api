package install

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/dbschema"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
)

// isolationFailingSchemas is a schema manager whose host cannot isolate
// plugin roles (no CREATEROLE).
type isolationFailingSchemas struct{ fakeSchemas }

func (*isolationFailingSchemas) CheckIsolation(context.Context) error {
	return dbschema.ErrIsolationUnavailable
}

// Granting db.schema is refused with the isolation error code when the
// database cannot give the plugin its own role; nothing is granted.
func TestConsentRefusesDBSchemaWithoutIsolation(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	e.svc.d.Schemas = &isolationFailingSchemas{}
	m := pkgtest.Guard("guard", "0.1.0", "sub2api")
	if _, err := e.svc.Upload(ctx, pkgtest.Build(m, e.root), e.admin, UploadOptions{Source: "upload"}); err != nil {
		t.Fatal(err)
	}
	_, err := e.svc.Consent(ctx, "guard", "0.1.0", ConsentRequest{Grants: explicitGuardGrants()}, e.admin)
	if code := core.AsError(err).Code; code != "plugin_db_isolation_unavailable" {
		t.Fatalf("consent: %v", err)
	}
	var n int
	if err := e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM plugin_permission_grants WHERE plugin_key = 'guard' AND status = 'granted'`).Scan(&n); err != nil || n != 0 {
		t.Fatalf("grants recorded: %d %v", n, err)
	}
	// Built-in plugins are not exempt.
	_, err = e.svc.Consent(withSystem(ctx), "guard", "0.1.0", ConsentRequest{Grants: explicitGuardGrants()}, 0)
	if code := core.AsError(err).Code; code != "plugin_db_isolation_unavailable" {
		t.Fatalf("system consent: %v", err)
	}
}

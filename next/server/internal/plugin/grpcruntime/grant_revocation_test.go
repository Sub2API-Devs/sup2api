package grpcruntime

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestHostGrantRevocationRejectsNewCallsBeforeRefresh(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status)VALUES('guard','{}','enabled');INSERT INTO plugin_permission_grants(plugin_key,permission,scope,status,plugin_version,manifest_hash)VALUES('guard','lock','{}','granted','1.0.0','hash')`); err != nil {
		t.Fatal(err)
	}
	i := &Instance{rt: &Runtime{o: Options{DB: db}}, pkg: &registry.Package{Key: "guard"}}
	i.settings.Store(&settings{grants: registry.Grants{"lock": []byte(`{}`)}})
	h := &hostServer{i: i}
	if err := h.require(ctx, "lock"); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE plugin_permission_grants SET status='revoked'`); err != nil {
		t.Fatal(err)
	}
	if err := h.require(ctx, "lock"); status.Code(err) != codes.PermissionDenied {
		t.Fatal("stale cached grant still authorized new call", err)
	}
}

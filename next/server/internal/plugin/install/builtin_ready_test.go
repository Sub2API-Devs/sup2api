package install

import (
	"context"
	"testing"

	"github.com/Masterminds/semver/v3"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
)

type builtinTestGeneration struct {
	core.Generation
	version string
}

func (g builtinTestGeneration) Plugin(key string) (core.PluginInfo, bool) {
	return core.PluginInfo{Key: key, Version: g.version}, g.version != ""
}

func TestBuiltinReadinessDuringUpgrade(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	for _, version := range []string{"0.0.5", "0.1.0", "0.2.0"} {
		data := pkgtest.Build(pkgtest.Guard("guard", version, "sub2api"), e.root)
		if _, err := e.svc.Upload(ctx, data, e.admin, UploadOptions{}); err != nil {
			t.Fatal(err)
		}
	}
	want := map[string]BuiltinRequirement{"guard": {Version: semver.MustParse("0.1.0")}}
	for _, tc := range []struct {
		name, status, active, local, unapproved string
		ready                                   bool
	}{
		{"before upgrade", "enabled", "0.1.0", "0.1.0", "", true},
		{"preparing keeps serving old", "upgrading", "0.1.0", "0.1.0", "", true},
		{"commit before local switch", "upgrading", "0.2.0", "0.1.0", "", true},
		{"local switch before database snapshot", "upgrading", "0.1.0", "0.2.0", "", true},
		{"completion after generation snapshot", "enabled", "0.2.0", "0.1.0", "", true},
		{"after upgrade", "enabled", "0.2.0", "0.2.0", "", true},
		{"missing local instance", "upgrading", "0.2.0", "", "", false},
		{"local below image minimum", "upgrading", "0.2.0", "0.0.5", "", false},
		{"active below image minimum", "enabled", "0.0.5", "0.1.0", "", false},
		{"image version unapproved", "upgrading", "0.2.0", "0.2.0", "0.1.0", false},
		{"active version unapproved", "upgrading", "0.2.0", "0.1.0", "0.2.0", false},
		{"local version unapproved", "upgrading", "0.1.0", "0.2.0", "0.2.0", false},
		{"initial enable still waits", "enabling", "0.1.0", "0.1.0", "", false},
		{"operator disabled remains optional", "disabled", "0.2.0", "", "0.2.0", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := e.db.Pool.Exec(ctx, `UPDATE plugin_versions SET consent_status='approved' WHERE plugin_key='guard'`); err != nil {
				t.Fatal(err)
			}
			if _, err := e.db.Pool.Exec(ctx, `UPDATE plugins SET builtin=true,status=$1,active_version=$2 WHERE key='guard'`, tc.status, tc.active); err != nil {
				t.Fatal(err)
			}
			if tc.unapproved != "" {
				if _, err := e.db.Pool.Exec(ctx, `UPDATE plugin_versions SET consent_status='awaiting_consent' WHERE plugin_key='guard' AND version=$1`, tc.unapproved); err != nil {
					t.Fatal(err)
				}
			}
			ready, err := e.svc.BuiltinsReady(ctx, want, builtinTestGeneration{version: tc.local})
			if err != nil || ready != tc.ready {
				t.Fatalf("ready=%v, err=%v; want ready=%v", ready, err, tc.ready)
			}
		})
	}
}

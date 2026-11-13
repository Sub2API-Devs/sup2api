package authz

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

// The console's generated permission catalog matches the core one; with
// UPDATE_GOLDEN=1 the test rewrites it.
func TestGeneratedPermissionsTS(t *testing.T) {
	t.Parallel()
	path := filepath.Join("..", "..", "..", "web", "src", "generated", "permissions.ts")
	want := PermissionsTS()
	if os.Getenv("UPDATE_GOLDEN") == "1" {
		if err := os.WriteFile(path, []byte(want), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != want {
		t.Fatalf("%s is stale: run UPDATE_GOLDEN=1 go test ./internal/authz -run TestGeneratedPermissionsTS (or sub2api permissions-ts)", path)
	}
}

func TestPermissionsTSNames(t *testing.T) {
	t.Parallel()
	seen := map[string]bool{}
	for _, p := range listedPerms() {
		n := tsName(p.key)
		if seen[n] {
			t.Errorf("constant name %s is taken twice", n)
		}
		seen[n] = true
	}
	for in, want := range map[string]string{"plugin:grant:db_schema_unconfined": "PluginGrantDbSchemaUnconfined", "self:plugin_ui": "SelfPluginUi"} {
		if got := tsName(perm.Key(in)); got != want {
			t.Errorf("tsName(%s) = %s, want %s", in, got, want)
		}
	}
	if got := tsString("it's"); got != `"it's"` {
		t.Errorf("tsString = %s", got)
	}
	if got := tsString(`a'b"c\`); got != `'a\'b"c\\'` {
		t.Errorf("tsString = %s", got)
	}
	if !strings.Contains(PermissionsTS(), "ROLE_KEY_PATTERN = /^[a-z][a-z0-9_]{1,49}$/") {
		t.Error("role key pattern missing")
	}
}

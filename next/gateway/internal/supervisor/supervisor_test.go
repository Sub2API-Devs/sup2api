package supervisor

import (
	"slices"
	"strings"
	"testing"
)

func TestCoreEnvironmentDropsNodeKey(t *testing.T) {
	env := coreEnvironment(
		[]string{"PATH=/bin", "SUB2API_PEER_AUTH_KEY=inherited-secret", "sub2api_peer_auth_key=lower"},
		[]string{"SUB2API_LOG_LEVEL=debug", "SUB2API_PEER_AUTH_KEY=explicit-secret"},
		[]string{"SUB2API_PEER_AUTH_KEY", "sub2api_peer_auth_key"},
	)
	joined := strings.Join(env, "\n")
	if strings.Contains(joined, "secret") || strings.Contains(joined, "lower") {
		t.Fatalf("node key reached the core environment: %v", env)
	}
	if !strings.Contains(joined, "PATH=/bin") || !strings.Contains(joined, "SUB2API_LOG_LEVEL=debug") {
		t.Fatalf("unrelated variables lost: %v", env)
	}
}

// The core inherits only allowlisted shell variables; everything else in the
// shell's environment stays in the shell.
func TestCoreEnvironmentInheritsOnlyAllowlist(t *testing.T) {
	inherited := []string{
		"PATH=/usr/bin",
		"HOME=/var/lib/sub2api",
		"SUB2API_MASTER_KEY=master",
		"SUB2API_JWT_SECRET=jwt",
		"SUB2API_PLUGIN_SECCOMP=true",
		// Shell-only or unrelated variables.
		"DATABASE_URL=postgres://inherited/db",
		"REDIS_URL=redis://inherited",
		"SUB2API_DATABASE_URL=postgres://inherited/db",
		"SUB2API_REDIS_URL=redis://inherited",
		"SUB2API_GATEWAY_POOL_MAX_CONNS=8",
		"SUB2API_PEER_AUTH_KEY=node-secret",
		"AWS_SECRET_ACCESS_KEY=cloud",
		"OPERATOR_TOKEN=x",
		"PATHOLOGICAL=1",
		"EXTRA_FOR_CORE=yes",
		"malformed",
	}
	explicit := []string{"DATABASE_URL=postgres://shell/db", "REDIS_URL=redis://:pw@shell:6379/0", "SUB2API_MANAGED=true", "SUB2API_UPDATER_TOKEN_FILE=/var/lib/sub2api/runtime/shell.token"}
	env := coreEnvironment(inherited, explicit, []string{"EXTRA_FOR_CORE"})

	allowed := map[string]bool{"EXTRA_FOR_CORE": true}
	for _, name := range inheritedEnv {
		allowed[name] = true
	}
	got := map[string][]string{}
	for i, entry := range env {
		key, value, _ := strings.Cut(entry, "=")
		got[key] = append(got[key], value)
		if i < len(env)-len(explicit) && !allowed[key] {
			t.Errorf("inherited variable %q is not allowlisted", key)
		}
	}
	for _, name := range []string{"SUB2API_DATABASE_URL", "SUB2API_REDIS_URL", "SUB2API_GATEWAY_POOL_MAX_CONNS", "SUB2API_PEER_AUTH_KEY", "AWS_SECRET_ACCESS_KEY", "OPERATOR_TOKEN", "PATHOLOGICAL", "malformed"} {
		if _, ok := got[name]; ok {
			t.Errorf("%s reached the core", name)
		}
	}
	for name, want := range map[string]string{"PATH": "/usr/bin", "HOME": "/var/lib/sub2api", "SUB2API_MASTER_KEY": "master", "SUB2API_JWT_SECRET": "jwt", "SUB2API_PLUGIN_SECCOMP": "true", "EXTRA_FOR_CORE": "yes", "SUB2API_MANAGED": "true"} {
		if !slices.Equal(got[name], []string{want}) {
			t.Errorf("%s = %v, want [%s]", name, got[name], want)
		}
	}
	// The shell's resolved stores are the only values the core sees.
	if !slices.Equal(got["DATABASE_URL"], []string{"postgres://shell/db"}) || !slices.Equal(got["REDIS_URL"], []string{"redis://:pw@shell:6379/0"}) {
		t.Errorf("store URLs: %v %v", got["DATABASE_URL"], got["REDIS_URL"])
	}
}

// Every core configuration variable is listed once; a duplicate or a store
// URL in the allowlist would let an inherited value compete with the
// shell's explicit one.
func TestInheritedEnvAllowlistShape(t *testing.T) {
	seen := map[string]bool{}
	for _, name := range inheritedEnv {
		if seen[name] {
			t.Errorf("%s listed twice", name)
		}
		seen[name] = true
		switch name {
		case "DATABASE_URL", "REDIS_URL", "SUB2API_DATABASE_URL", "SUB2API_REDIS_URL", "SUB2API_PEER_AUTH_KEY", "SUB2API_CONTROL_TOKEN", "SUB2API_UPDATER_TOKEN_FILE":
			t.Errorf("%s must come from the shell, not the inherited environment", name)
		}
	}
}

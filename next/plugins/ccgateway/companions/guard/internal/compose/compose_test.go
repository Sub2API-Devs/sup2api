package compose

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"
)

// covers: 03§9.4 C2 .env rewrite keeps every other line, drops both keys, appends one
func TestRewrite(t *testing.T) {
	in := "# installed by core\nCCG_GUARD_IMAGE=ccgateway-guard:1\n  CCG_CONTROLLER_IMAGE=ccgateway-controller:0.1.118\n\n" +
		"CCG_CONTROLLER_VERSION=0.1.118\nCCG_GATEWAY_IMAGE=sha256:" + strings.Repeat("a", 64) + "\nCCG_GUARD_TOKEN=x"
	out, err := Rewrite([]byte(in), "CCG_CONTROLLER_IMAGE", "ccgateway-controller:0.1.119", "CCG_CONTROLLER_VERSION")
	if err != nil {
		t.Fatal(err)
	}
	want := "# installed by core\nCCG_GUARD_IMAGE=ccgateway-guard:1\n\nCCG_GATEWAY_IMAGE=sha256:" + strings.Repeat("a", 64) +
		"\nCCG_GUARD_TOKEN=x\nCCG_CONTROLLER_IMAGE=ccgateway-controller:0.1.119\n"
	if string(out) != want {
		t.Fatalf("%q", out)
	}
	if Value(out, "CCG_CONTROLLER_IMAGE") != "ccgateway-controller:0.1.119" || Value(out, "CCG_CONTROLLER_VERSION") != "" {
		t.Fatal("value")
	}
	// CCG_CONTROLLER_IMAGE_X is another variable.
	out, _ = Rewrite([]byte("CCG_CONTROLLER_IMAGE_X=1\n"), "CCG_CONTROLLER_IMAGE", "a:1")
	if string(out) != "CCG_CONTROLLER_IMAGE_X=1\nCCG_CONTROLLER_IMAGE=a:1\n" {
		t.Fatalf("%q", out)
	}
}

// covers: A18 03§9.4 values cannot break .env (newline, $, quotes, blanks)
func TestRewriteRejectsValues(t *testing.T) {
	for _, v := range []string{"a:1\nCCG_GUARD_IMAGE=evil", "a:${CCG_GUARD_TOKEN}", `a:"1"`, "a 1", "", "A:1"} {
		if _, err := Rewrite([]byte("X=1\n"), "CCG_CONTROLLER_IMAGE", v); !errors.Is(err, ErrValue) {
			t.Errorf("%q accepted", v)
		}
	}
}

type recExec struct {
	calls [][]string
	envs  [][]string
	fail  map[string]error
}

func (r *recExec) Run(ctx context.Context, argv, env []string) (string, error) {
	r.calls = append(r.calls, argv)
	r.envs = append(r.envs, env)
	for k, err := range r.fail {
		if strings.Contains(strings.Join(argv, " "), k) {
			return "boom", err
		}
	}
	return "", nil
}

// covers: 03§9.1 fixed command line, clean four-variable environment, service whitelist, config -q first
func TestUpCommand(t *testing.T) {
	x := &recExec{}
	r := &Runner{Docker: "/usr/bin/docker", Project: "ccgateway", Dir: "/opt/ccgateway", Socket: "/var/run/docker.sock", X: x}
	if err := r.Up(context.Background(), "egress", true); err != nil {
		t.Fatal(err)
	}
	base := []string{"/usr/bin/docker", "compose", "-p", "ccgateway", "--project-directory", "/opt/ccgateway", "-f",
		"/opt/ccgateway/compose.yml", "--env-file", "/opt/ccgateway/.env", "--profile", "egress"}
	if !reflect.DeepEqual(x.calls[0], append(append([]string{}, base...), "config", "-q")) {
		t.Fatalf("%q", x.calls[0])
	}
	if !reflect.DeepEqual(x.calls[1], append(append([]string{}, base...), "up", "-d", "--no-deps", "--force-recreate", "egress")) {
		t.Fatalf("%q", x.calls[1])
	}
	wantEnv := []string{"PATH=/usr/local/bin:/usr/bin:/bin", "HOME=/tmp", "DOCKER_CONFIG=/tmp/.docker", "DOCKER_HOST=unix:///var/run/docker.sock"}
	if !reflect.DeepEqual(x.envs[1], wantEnv) {
		t.Fatalf("%q", x.envs[1])
	}
	x.calls = nil
	_ = r.Up(context.Background(), "controller", false)
	if strings.Contains(strings.Join(x.calls[1], " "), "--profile") || x.calls[1][len(x.calls[1])-1] != "controller" ||
		strings.Contains(strings.Join(x.calls[1], " "), "--force-recreate") {
		t.Fatalf("%q", x.calls[1])
	}
	x.calls = nil
	_ = r.Up(context.Background(), "state", false)
	if len(x.calls) != 2 || strings.Contains(strings.Join(x.calls[1], " "), "--profile") || x.calls[1][len(x.calls[1])-1] != "state" {
		t.Fatalf("state: %q", x.calls)
	}
	for _, s := range []string{"guard", "", "controller egress", "ccg-guard", "state egress", "valkey"} {
		if err := r.Up(context.Background(), s, false); !errors.Is(err, ErrService) {
			t.Errorf("%q allowed", s)
		}
	}
	x2 := &recExec{fail: map[string]error{"config": errors.New("exit 1")}}
	r.X = x2
	var ce *Error
	if err := r.Up(context.Background(), "controller", false); !errors.As(err, &ce) || ce.Step != "config" || len(x2.calls) != 1 {
		t.Fatal("config failure must stop before up")
	}
}

// covers: 03§9.2 SetEnv returns the old file for RestoreEnv
func TestSetRestoreEnv(t *testing.T) {
	m := &MemEnv{Data: []byte("CCG_CONTROLLER_IMAGE=a:1\nCCG_GUARD_TOKEN=t\n")}
	r := &Runner{Env: m}
	old, err := r.SetEnv("CCG_CONTROLLER_IMAGE", "a:2")
	if err != nil {
		t.Fatal(err)
	}
	if v, _ := r.EnvValue("CCG_CONTROLLER_IMAGE"); v != "a:2" {
		t.Fatal(v)
	}
	_ = r.RestoreEnv(old)
	if v, _ := r.EnvValue("CCG_CONTROLLER_IMAGE"); v != "a:1" {
		t.Fatal(v)
	}
}

// covers: 03§3.3 lifecycle mutual exclusion; compose lock waits
func TestLifecycleAndLock(t *testing.T) {
	var l Lifecycle
	if !l.Begin("upgrade") || l.Begin("recreate") || l.Busy() != "upgrade" {
		t.Fatal("exclusion")
	}
	l.End()
	if !l.Begin("recreate") {
		t.Fatal("release")
	}
	var m MutexLocker
	unlock, err := m.Lock(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if _, err := m.Lock(ctx); err == nil {
		t.Fatal("second lock")
	}
	unlock()
	if u, err := m.Lock(context.Background()); err != nil {
		t.Fatal(err)
	} else {
		u()
	}
}

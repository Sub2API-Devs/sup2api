package cliprofile

import (
	"context"
	"errors"
	"strings"
	"testing"

	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/pyreftest"
)

func decode(t *testing.T, s string) any {
	v, err := pyjson.Decode([]byte(s))
	if err != nil {
		t.Fatal(err)
	}
	return v
}

// covers: V7 A2
func TestValidate(t *testing.T) {
	if p, err := Validate(nil); p != nil || err != nil {
		t.Fatal("nil is a legacy configuration")
	}
	p, err := Validate(decode(t, `{"request_mode":"direct","version":"2.1.302","disable_auto_update":true}`))
	if err != nil || p.Version != "2.1.302" || p.RequestMode != ModeDirect {
		t.Fatal(p, err)
	}
	if got := string(pyjson.MustMarshal(p)); got != `{"request_mode": "direct", "version": "2.1.302", "disable_auto_update": true}` {
		t.Fatal("the caller's key order is kept:", got)
	}
	bad := []string{`{}`, `[]`, `"2.1.3"`, `{"version":"2.1.302","request_mode":"build"}`,
		`{"version":"2.1.302","request_mode":"native","disable_auto_update":true}`,
		`{"version":"2.1","request_mode":"build","disable_auto_update":true}`,
		`{"version":"2.1.302","request_mode":"build","disable_auto_update":1}`,
		`{"version":2,"request_mode":"build","disable_auto_update":true}`,
		`{"version":"2.1.302","request_mode":"build","disable_auto_update":true,"x":1}`}
	for _, s := range bad {
		if _, err := Validate(decode(t, s)); err != ErrInvalid {
			t.Errorf("%s: %v", s, err)
		}
	}
	if d, err := Default("2.1.312"); err != nil || string(pyjson.MustMarshal(d)) != `{"version": "2.1.312", "request_mode": "build", "disable_auto_update": true}` {
		t.Fatal(d, err)
	}
	if _, err := Default("x"); err == nil {
		t.Fatal("bad default")
	}
}

// covers: PV19 (the probe script is cli_profiles.PROBE)
func TestProbeScriptMatchesPython(t *testing.T) {
	for _, c := range pyreftest.Cases(t, "texts.json") {
		if pyreftest.Str(c, "name") == "cli_profiles.PROBE" {
			if pyreftest.Str(c, "text") != ProbeScript {
				t.Fatalf("probe differs:\n%q", ProbeScript)
			}
			return
		}
	}
	t.Fatal("no PROBE vector")
}

// covers: PV19 O7 PV8 (the probe job and its answer)
func TestResolve(t *testing.T) {
	g := fakeguard.New()
	g.AddImage("app:1", fakeguard.ImageSpec{})
	c := g.Client()
	p, _ := Validate(decode(t, `{"version":"2.1.312","request_mode":"build","disable_auto_update":true}`))
	out := `{"path":"/opt/ccgateway/cli/2.1.312/claude","version":"2.1.312","sha256":"` + strings.Repeat("a", 64) + `","patch":"ccgateway-x"}`
	code := 0
	g.OnJob(func(aid string, job guardapi.Job) (int, []byte) { return code, []byte(out) })
	env, err := Resolve(context.Background(), c, "21", "app:1", p)
	if err != nil || env["WORKER_CLI_PATH"] != "/opt/ccgateway/cli/2.1.312/claude" || env["CCG_REQUEST_MODE"] != "build" ||
		env["CCG_CLI_PATCH"] != "ccgateway-x" || len(env) != 5 {
		t.Fatal(env, err)
	}
	job := g.Jobs()[0].Job
	if job.User != "0" || job.Volume != "none" || len(job.Caps) != 0 || job.Entrypoint[0] != "node" ||
		job.Argv[1] != ProbeScript || job.Argv[2] != "2.1.312" || job.Argv[3] != "build" {
		t.Fatalf("%+v", job)
	}
	if env, err := Resolve(context.Background(), c, "21", "app:1", nil); err != nil || len(env) != 0 {
		t.Fatal("no profile: no variables")
	}
	for _, tc := range []struct {
		code int
		out  string
	}{{1, out}, {0, strings.Repeat("x", 5000)}, {0, "not json"},
		{0, strings.Replace(out, `"version":"2.1.312"`, `"version":"2.1.311"`, 1)}} {
		code, out = tc.code, tc.out
		if _, err := Resolve(context.Background(), c, "21", "app:1", p); !errors.Is(err, ErrUnavailable) {
			t.Errorf("exit %d %.20s: %v", tc.code, tc.out, err)
		}
	}
	code, out = 0, `{"version":"2.1.312"}`
	if _, err := Resolve(context.Background(), c, "21", "app:1", p); err == nil || errors.Is(err, ErrUnavailable) {
		t.Errorf("a valid answer without its fields is a 503, not 409: %v", err)
	}
	g.Fail("POST /v1/accounts/{aid}/jobs", fakeguard.Fault{Status: 502, Code: "docker_error", Reason: "job_failed"})
	if _, err := Resolve(context.Background(), c, "21", "app:1", p); !errors.Is(err, ErrUnavailable) {
		t.Errorf("a guard error answer (docker error) is 409: %v", err)
	}
	g.Fail("POST /v1/accounts/{aid}/jobs", fakeguard.Fault{})
	if _, err := Resolve(context.Background(), c, "21", "app:1", p); err == nil || errors.Is(err, ErrUnavailable) {
		t.Errorf("an unreachable guard is not a CLI problem: %v", err)
	}
}

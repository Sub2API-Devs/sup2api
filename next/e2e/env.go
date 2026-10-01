// Package e2e holds the end-to-end acceptance tests of sub2api-next
// (docs/ARCHITECTURE.md §17.3). The tests talk to a running deployment
// through one origin that also exposes the /__node1, /__node2 and /__mock
// helper routes; see deploy/README.md.
//
// Environment:
//
//	E2E_BASE_URL          required, e.g. http://127.0.0.1:3120 (no default: a
//	                      stale default silently points the whole suite at a
//	                      deployment that no longer exists)
//	E2E_ADMIN_EMAIL       default admin@sub2api.test
//	E2E_ADMIN_PASSWORD    required for everything past the infrastructure checks
//	E2E_MOCK_URL          mock-upstream control URL, default $E2E_BASE_URL/__mock
//	E2E_MOCK_INTERNAL_URL mock-upstream URL as seen by the nodes, default http://mock-upstream:8080
//	E2E_NODE_URLS         comma separated direct node URLs, default $E2E_BASE_URL/__node1,$E2E_BASE_URL/__node2
//	E2E_DOCKER_HOST       "ovh" (docker via ssh), "local", or empty (tests that
//	                      kill containers / query PG and Redis are skipped)
//	E2E_PROJECT           compose project name, default sub2api-next-e2e
//	E2E_LONG=1            run tests that wait for multi-minute schedules
package e2e

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

// Config is the resolved test environment.
type Config struct {
	BaseURL         string
	AdminEmail      string
	AdminPassword   string
	MockURL         string
	MockInternalURL string
	NodeURLs        []string
	DockerHost      string
	Project         string
	Long            bool
	RunID           string // unique suffix for resources created by this run
}

// errNoBaseURL is reported by Setup when E2E_BASE_URL is not set. There is
// deliberately no default: the previous one (127.0.0.1:3120) outlived the
// deployment it named, so every test skipped as "unreachable" for weeks and
// the suite read as green.
const errNoBaseURL = `E2E_BASE_URL is not set.

The e2e suite needs a running sub2api-next deployment reachable under one
origin: two nodes, mock-upstream, and the /__node1, /__node2, /__mock helper
routes. The isolated deploy/e2e stack provides these routes; the single/
production stack does not satisfy the two-node suite. Start the isolated
stack following deploy/README.md, then configure:

    export E2E_BASE_URL=http://127.0.0.1:3120
    export E2E_ADMIN_EMAIL=...  E2E_ADMIN_PASSWORD=...   # bootstrap admin of that stack
    export E2E_DOCKER_HOST=ovh                           # for PG/Redis/container checks
    export E2E_PROJECT=sub2api-next-e2e

See deploy/README.md and docs/PROGRESS.md for the current test deployment.`

func loadConfig() (*Config, error) {
	base := strings.TrimRight(os.Getenv("E2E_BASE_URL"), "/")
	if base == "" {
		return nil, errors.New(errNoBaseURL)
	}
	c := &Config{
		BaseURL:         base,
		AdminEmail:      env("E2E_ADMIN_EMAIL", "admin@sub2api.test"),
		AdminPassword:   os.Getenv("E2E_ADMIN_PASSWORD"),
		MockURL:         strings.TrimRight(env("E2E_MOCK_URL", base+"/__mock"), "/"),
		MockInternalURL: strings.TrimRight(env("E2E_MOCK_INTERNAL_URL", "http://mock-upstream:8080"), "/"),
		DockerHost:      os.Getenv("E2E_DOCKER_HOST"),
		Project:         env("E2E_PROJECT", "sub2api-next-e2e"),
		Long:            os.Getenv("E2E_LONG") == "1",
		RunID:           fmt.Sprintf("%x", time.Now().UnixNano()/1e6%0xffffffff),
	}
	for _, u := range strings.Split(env("E2E_NODE_URLS", base+"/__node1,"+base+"/__node2"), ",") {
		if u = strings.TrimRight(strings.TrimSpace(u), "/"); u != "" {
			c.NodeURLs = append(c.NodeURLs, u)
		}
	}
	return c, nil
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

var (
	cfgOnce  sync.Once
	cfg      *Config
	setupErr error
)

// Env is the per-test entry point: it resolves the configuration, verifies the
// deployment answers, and exposes the shared fixtures.
type Env struct {
	*Config
	T *testing.T
}

// Setup must be the first call of every test. It fails the test (it does not
// skip) when the target deployment is not configured or does not answer: a
// silent skip here turns the whole suite into 0 assertions while still
// reporting green, which is how the stale :3120 default went unnoticed.
func Setup(t *testing.T) *Env {
	t.Helper()
	cfgOnce.Do(func() {
		cfg, setupErr = loadConfig()
		if setupErr != nil {
			return
		}
		cl := &http.Client{Timeout: 5 * time.Second}
		resp, err := cl.Get(cfg.BaseURL + "/healthz")
		if err != nil {
			setupErr = fmt.Errorf("deployment at %s does not answer (%w); bring the e2e stack up and open the tunnel (deploy/README.md)", cfg.BaseURL, err)
			return
		}
		resp.Body.Close()
		if resp.StatusCode != 200 {
			setupErr = fmt.Errorf("GET %s/healthz: HTTP %d", cfg.BaseURL, resp.StatusCode)
		}
	})
	if setupErr != nil {
		t.Fatal(setupErr)
	}
	return &Env{Config: cfg, T: t}
}

// With returns a copy of e bound to a subtest.
func (e *Env) With(t *testing.T) *Env { return &Env{Config: e.Config, T: t} }

// RequireAdmin skips when admin credentials are not configured.
func (e *Env) RequireAdmin() {
	e.T.Helper()
	if e.AdminPassword == "" {
		e.T.Skip("E2E_ADMIN_PASSWORD not set (see ~/sub2api-next-test/.env on the test server)")
	}
}

// RequireDocker skips when container control is not configured.
func (e *Env) RequireDocker() {
	e.T.Helper()
	if e.DockerHost == "" {
		e.T.Skip("E2E_DOCKER_HOST not set: container control / PG / Redis inspection disabled")
	}
}

// RequireLong skips multi-minute tests unless E2E_LONG=1.
func (e *Env) RequireLong() {
	e.T.Helper()
	if !e.Long {
		e.T.Skip("long-running; set E2E_LONG=1")
	}
}

// Name returns a unique resource name for this run.
func (e *Env) Name(prefix string) string {
	return fmt.Sprintf("%s-%s-%d", prefix, e.RunID, nextSeq())
}

var (
	seqMu sync.Mutex
	seq   int
)

func nextSeq() int {
	seqMu.Lock()
	defer seqMu.Unlock()
	seq++
	return seq
}

// Eventually polls fn every interval until it returns true or timeout passes.
// msg is a string or a func() string evaluated on failure.
func Eventually(t testing.TB, timeout, interval time.Duration, msg any, fn func() bool) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for {
		if fn() {
			return
		}
		if time.Now().After(deadline) {
			if f, ok := msg.(func() string); ok {
				msg = f()
			}
			t.Fatalf("timed out after %s: %v", timeout, msg)
		}
		time.Sleep(interval)
	}
}

// Package e2e holds the end-to-end acceptance tests of sub2api-next
// (docs/ARCHITECTURE.md §17.3). The tests talk to a running deployment
// (deploy/compose.yml) through Caddy; see deploy/README.md.
//
// Environment:
//
//	E2E_BASE_URL          default http://127.0.0.1:3120
//	E2E_ADMIN_EMAIL       default admin@sub2api.test
//	E2E_ADMIN_PASSWORD    required for everything past the infrastructure checks
//	E2E_MOCK_URL          mock-upstream control URL, default $E2E_BASE_URL/__mock
//	E2E_MOCK_INTERNAL_URL mock-upstream URL as seen by the nodes, default http://mock-upstream:8080
//	E2E_NODE_URLS         comma separated direct node URLs, default $E2E_BASE_URL/__node1,$E2E_BASE_URL/__node2
//	E2E_DOCKER_HOST       "ovh" (docker via ssh), "local", or empty (tests that
//	                      kill containers / query PG and Redis are skipped)
//	E2E_PROJECT           compose project name, default sub2api-next-test
//	E2E_RUN_PENDING=1     run tests still marked pending (modules not merged yet)
//	E2E_LONG=1            run tests that wait for multi-minute schedules
package e2e

import (
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
	RunPending      bool
	Long            bool
	RunID           string // unique suffix for resources created by this run
}

func loadConfig() *Config {
	base := strings.TrimRight(env("E2E_BASE_URL", "http://127.0.0.1:3120"), "/")
	c := &Config{
		BaseURL:         base,
		AdminEmail:      env("E2E_ADMIN_EMAIL", "admin@sub2api.test"),
		AdminPassword:   os.Getenv("E2E_ADMIN_PASSWORD"),
		MockURL:         strings.TrimRight(env("E2E_MOCK_URL", base+"/__mock"), "/"),
		MockInternalURL: strings.TrimRight(env("E2E_MOCK_INTERNAL_URL", "http://mock-upstream:8080"), "/"),
		DockerHost:      os.Getenv("E2E_DOCKER_HOST"),
		Project:         env("E2E_PROJECT", "sub2api-next-test"),
		RunPending:      os.Getenv("E2E_RUN_PENDING") == "1",
		Long:            os.Getenv("E2E_LONG") == "1",
		RunID:           fmt.Sprintf("%x", time.Now().UnixNano()/1e6%0xffffffff),
	}
	for _, u := range strings.Split(env("E2E_NODE_URLS", base+"/__node1,"+base+"/__node2"), ",") {
		if u = strings.TrimRight(strings.TrimSpace(u), "/"); u != "" {
			c.NodeURLs = append(c.NodeURLs, u)
		}
	}
	return c
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
	reachErr error
)

// Env is the per-test entry point: it skips the test when the deployment is
// unreachable and exposes the configuration and shared fixtures.
type Env struct {
	*Config
	T *testing.T
}

// Setup must be the first call of every test.
func Setup(t *testing.T) *Env {
	t.Helper()
	cfgOnce.Do(func() {
		cfg = loadConfig()
		cl := &http.Client{Timeout: 5 * time.Second}
		resp, err := cl.Get(cfg.BaseURL + "/healthz")
		if err != nil {
			reachErr = err
			return
		}
		resp.Body.Close()
		if resp.StatusCode != 200 {
			reachErr = fmt.Errorf("GET /healthz: HTTP %d", resp.StatusCode)
		}
	})
	if reachErr != nil {
		t.Skipf("deployment at %s unreachable (%v); start it with deploy/scripts/up.sh and open the tunnel", cfg.BaseURL, reachErr)
	}
	return &Env{Config: cfg, T: t}
}

// With returns a copy of e bound to a subtest.
func (e *Env) With(t *testing.T) *Env { return &Env{Config: e.Config, T: t} }

// Pending skips the test unless E2E_RUN_PENDING=1. reason names the modules
// the test waits for; remove the call once they are merged.
func (e *Env) Pending(reason string) {
	e.T.Helper()
	if !e.RunPending {
		e.T.Skip("pending: " + reason)
	}
}

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

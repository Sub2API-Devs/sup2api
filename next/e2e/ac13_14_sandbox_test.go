package e2e

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

// AC 13: guard's webhook alert shows up on the egress page; the test build's
// direct net.Dial fails under strict mode.
func TestAC13_EgressLogAndStrictNetwork(t *testing.T) {
	e := Setup(t)
	e.Pending("d-sandbox (egress tunnel, seccomp), c2-runtime, e-sdk-plugins (guard webhook, guard test build)")
	admin := e.Admin()
	tn := e.NewTenant(admin, TenantOpts{})
	e.EnsurePlugin(admin, "guard", "")

	hook := e.MockInternalURL + "/__webhook/guard-" + e.RunID
	e.SetGuardSettings(admin, hook)
	e.SetGuardRules(admin, e.ForbiddenRule())
	m := e.Mock()
	mark := m.Mark(t)
	since := time.Now().Add(-time.Minute)
	if g := e.Messages(tn.APIKey, MessagesBody(tn.Model, "trigger "+e.ForbiddenWord(), false), nil); g.Status != 403 {
		t.Fatalf("rule hit: HTTP %d", g.Status)
	}
	// The webhook reached the mock through the egress tunnel.
	Eventually(t, 20*time.Second, time.Second, "webhook delivered", func() bool {
		for _, r := range m.Since(t, mark) {
			if strings.HasPrefix(r.Path, "/__webhook/guard-"+e.RunID) {
				return true
			}
		}
		return false
	})
	// ... and is listed on the "external access" page.
	host := strings.TrimPrefix(strings.Split(strings.TrimPrefix(e.MockInternalURL, "http://"), ":")[0], "https://")
	Eventually(t, 30*time.Second, 2*time.Second, "egress log for "+host, func() bool {
		d := admin.OK(t, http.MethodGet, "/plugins/guard/egress", nil,
			Query("from", since.UTC().Format(time.RFC3339), "to", time.Now().Add(time.Minute).UTC().Format(time.RFC3339)))
		return strings.Contains(d.Raw, host)
	})
	e.SetGuardRules(admin)

	// Test build: direct dialing is refused by seccomp on every node.
	e.EnsureGuardTestBuild(admin)
	defer e.EnsurePlugin(admin, "guard", "")
	e.OnEachNode(admin, func(n int, c *Client) {
		r := c.API(t, http.MethodPost, "/p/guard/debug/dial", map[string]any{"address": "1.1.1.1:443"})
		if r.Status == 200 && r.Data().Get("ok").Bool() {
			t.Fatalf("node-%d: direct net.Dial succeeded under strict mode: %s", n, r)
		}
		if !strings.Contains(strings.ToLower(string(r.Body)), "not permitted") &&
			!strings.Contains(strings.ToLower(string(r.Body)), "denied") {
			t.Logf("node-%d dial error (expected EPERM/EACCES): %s", n, r.Body)
		}
	})
}

// AC 14: over-allocating test build is restarted with the reason shown;
// under container memory pressure the plugin (not the core) is killed;
// resource requests above the global cap are rejected at install time.
func TestAC14_ResourceLimits(t *testing.T) {
	e := Setup(t)
	e.Pending("d-sandbox (watchdog, oom_score_adj), c2-runtime (restart reasons), c1-lifecycle (resource cap), e-sdk-plugins (guard test build)")
	admin := e.Admin()

	t.Run("over-limit allocation restarts the plugin", func(t *testing.T) {
		e := e.With(t)
		e.EnsureGuardTestBuild(admin)
		// memoryMB of the test build is 128; allocate well above 110%.
		r := admin.API(t, http.MethodPost, "/p/guard/debug/alloc", nil, Query("mb", "300"))
		t.Logf("alloc: %s", r)
		Eventually(t, 60*time.Second, 2*time.Second, "restart with memory reason", func() bool {
			d, _ := e.Plugin(admin, "guard")
			s := strings.ToLower(d.Raw)
			return strings.Contains(s, "restart") && strings.Contains(s, "memory")
		})
		e.WaitPlugin(admin, "guard", "enabled", guardTestVersion)
	})

	t.Run("container OOM kills the plugin, not the core", func(t *testing.T) {
		e := e.With(t)
		e.RequireDocker()
		before := e.NodeHealth(1)
		bootBefore := e.NodeExec(1, "cat /proc/1/stat | cut -d' ' -f22")
		// Raise the plugin's own limit so the watchdog does not act first,
		// then allocate more than the node container's mem_limit (1g).
		admin.OK(t, http.MethodPut, "/plugins/guard/resources", map[string]any{"memory_mb": 1024, "cpu": 0.25, "max_threads": 64, "max_open_files": 256})
		c := &Client{Base: e.NodeURLs[0], HTTP: &http.Client{Timeout: 30 * time.Second}, Token: admin.Token}
		c.API(t, http.MethodPost, "/p/guard/debug/alloc", nil, Query("mb", "1500"))
		time.Sleep(5 * time.Second)
		after := e.NodeHealth(1)
		if after.Get("node").String() != before.Get("node").String() {
			t.Fatal("node identity changed")
		}
		if bootAfter := e.NodeExec(1, "cat /proc/1/stat | cut -d' ' -f22"); bootAfter != bootBefore {
			t.Fatalf("core process restarted (start time %s -> %s)", bootBefore, bootAfter)
		}
		admin.OK(t, http.MethodPut, "/plugins/guard/resources", map[string]any{"memory_mb": 128, "cpu": 0.25, "max_threads": 64, "max_open_files": 256})
	})

	t.Run("resource request above the global cap is rejected", func(t *testing.T) {
		e := e.With(t)
		key := NewSigningKey(t, "e2e-verified-"+e.RunID, "e2e-verified-"+e.RunID)
		pubID := e.RegisterPublisher(admin, key, "verified")
		defer admin.API(t, http.MethodPost, fmt.Sprintf("/publishers/%d/revoke", pubID), nil, admin.StepUp(t))
		pkg := e.DerivedGuardPackage("e2e_res", key, false)
		man := pkg.Manifest(t)
		man["resources"] = map[string]any{"memoryMB": 64 * 1024, "cpu": 0.25, "maxProcs": 64, "maxOpenFiles": 256}
		pkg.SetManifest(t, man)
		pkg.Sign(t, key)
		r := e.UploadPlugin(admin, "e2e_res.s2plugin", pkg.Bytes(t))
		if r.Status != 400 || !strings.Contains(strings.ToLower(string(r.Body)), "memory") {
			t.Fatalf("over-cap resources accepted or wrong error: %s", r)
		}
	})
	e.EnsurePlugin(admin, "guard", "")
}

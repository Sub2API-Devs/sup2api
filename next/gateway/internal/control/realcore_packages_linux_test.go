//go:build linux

package control

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// TestRealCorePluginPackagesTravelBetweenNodes checks where plugin package
// bytes come from on real cores: never PostgreSQL. Bundled and uploaded
// packages are kept by the primary's shell and pulled by followers over the
// node network; a market package is downloaded by every node from the market.
// With the primary down, a follower that has its packages restarts and
// serves, while a node without them cannot start until the primary is back.
//
// Besides the real-core variables it needs TEST_UPLOAD_PACKAGE (a signed
// package that is neither bundled nor in the market), TEST_MARKET_DIR (a
// directory with index.json, index.json.sig and its packages) and
// TEST_MARKET_KEY (the base64 public key that signed the index).
func TestRealCorePluginPackagesTravelBetweenNodes(t *testing.T) {
	uploadPath, marketDir, marketKey := os.Getenv("TEST_UPLOAD_PACKAGE"), os.Getenv("TEST_MARKET_DIR"), os.Getenv("TEST_MARKET_KEY")
	if uploadPath == "" || marketDir == "" || marketKey == "" {
		t.Skip("requires TEST_UPLOAD_PACKAGE, TEST_MARKET_DIR and TEST_MARKET_KEY in addition to the real-core variables")
	}
	uploaded, err := os.ReadFile(uploadPath)
	if err != nil {
		t.Fatal(err)
	}
	var marketPackageGets atomic.Int64
	market := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, ".s2plugin") {
			marketPackageGets.Add(1)
		}
		http.FileServer(http.Dir(marketDir)).ServeHTTP(w, r)
	}))
	defer market.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
	defer cancel()
	const adminEmail, adminPassword = "admin@real.test", "Real-core-admin-pass!"
	c := newRealCluster(t, ctx, realOptions{coreEnv: []string{
		"SUB2API_BOOTSTRAP_ADMIN_EMAIL=" + adminEmail, "SUB2API_BOOTSTRAP_ADMIN_PASSWORD=" + adminPassword,
		`SUB2API_MARKET_SOURCES=[{"name":"test","url":"` + market.URL + `/index.json","public_key":"` + marketKey + `"}]`,
	}})
	db := c.db
	tick := time.NewTicker(200 * time.Millisecond)
	defer tick.Stop()
	wait := func(what string, timeout time.Duration, fn func() bool) {
		t.Helper()
		deadline := time.Now().Add(timeout)
		for !fn() {
			if time.Now().After(deadline) {
				t.Fatalf("timed out after %s waiting for %s", timeout, what)
			}
			select {
			case <-ctx.Done():
				t.Fatal(ctx.Err())
			case <-tick.C:
			}
		}
	}
	held := func(node, sum string) bool {
		_, err := os.Stat(filepath.Join(c.roots[node], "plugin-blobs", sum[:2], sum))
		return err == nil
	}
	digestOf := func(key string) string {
		var sum string
		_ = db.QueryRow(ctx, `SELECT lower(package_sha256) FROM plugin_versions v JOIN plugins p ON p.key=v.plugin_key AND p.active_version=v.version WHERE p.key=$1`, key).Scan(&sum)
		return sum
	}
	// Every current core boot of the cluster runs an instance of key.
	enabledEverywhere := func(key string) bool {
		var status string
		var running, cores int
		_ = db.QueryRow(ctx, `SELECT p.status,
			(SELECT count(*) FROM plugin_runtime_nodes r JOIN updater.nodes n ON n.core_boot_id=r.boot_id AND n.cluster_id=$2 WHERE r.plugin_key=p.key AND NOT r.stopped AND n.ready),
			(SELECT count(*) FROM updater.nodes WHERE cluster_id=$2 AND ready)
			FROM plugins p WHERE p.key=$1`, key, c.dbname).Scan(&status, &running, &cores)
		return status == "enabled" && cores >= 3 && running == cores
	}
	probe := func(n *realNode) int {
		res, err := http.Get(n.public.URL + "/api/v1/key/prices")
		if err != nil {
			return 0
		}
		_, _ = io.Copy(io.Discard, res.Body)
		res.Body.Close()
		return res.StatusCode
	}

	for _, id := range []string{"a", "b", "c"} {
		c.startShell(id)
	}
	if err = c.node("a").engine.Recover(ctx, true); err != nil {
		t.Fatal("bootstrap primary", err)
	}
	_ = c.node("a").engine.Heartbeat(ctx)
	for _, id := range []string{"b", "c"} {
		if err = c.node(id).engine.Recover(ctx, false); err != nil {
			t.Fatal("join follower", err)
		}
		_ = c.node(id).engine.Heartbeat(ctx)
	}
	for _, n := range c.list() {
		c.run(n)
	}
	var column bool
	if err = db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='plugin_versions' AND column_name='package')`).Scan(&column); err != nil || column {
		t.Fatalf("plugin_versions still has a package column: %v", err)
	}

	// ---- bundled packages: imported on the primary, pulled by followers
	for _, key := range []string{"anthropic", "volcengine"} {
		wait(key+" enabled on every node", 3*time.Minute, func() bool { return enabledEverywhere(key) })
		sum := digestOf(key)
		for _, id := range []string{"a", "b", "c"} {
			if !held(id, sum) {
				t.Fatalf("%s package %s is not in %s's shell store", key, sum[:12], id)
			}
		}
	}
	t.Log("bundled packages: kept by the primary's shell, pulled by both followers over the node network")

	// ---- an upload through a follower is stored on the primary first
	adminB := newAPIClient(t, c.node("b").public.URL).login(adminEmail, adminPassword)
	review := adminB.upload("/plugins/upload", filepath.Base(uploadPath), uploaded, nil)
	if review.status != 200 && review.status != 201 {
		t.Fatalf("upload through follower b: %s", review)
	}
	uploadKey, _ := adminB.consentAll(review)
	var uploadSum string
	if err = db.QueryRow(ctx, `SELECT lower(package_sha256) FROM plugin_versions WHERE plugin_key=$1`, uploadKey).Scan(&uploadSum); err != nil {
		t.Fatal(err)
	}
	if !held("a", uploadSum) {
		t.Fatal("follower acknowledged the upload before the primary stored it")
	}
	adminB.ok(http.MethodPost, "/plugins/"+uploadKey+"/enable", nil)
	wait(uploadKey+" enabled on every node", 3*time.Minute, func() bool { return enabledEverywhere(uploadKey) })
	if !held("c", uploadSum) {
		t.Fatalf("follower c did not pull the uploaded %s from the primary", uploadKey)
	}
	t.Logf("upload %s through follower b: stored on the primary before the response, pulled by c", uploadKey)

	// ---- a market package is downloaded by every node from the market
	adminC := newAPIClient(t, c.node("c").public.URL).login(adminEmail, adminPassword)
	sources := adminC.ok(http.MethodGet, "/market/sources", nil)
	var sourceID int64
	if list, ok := sources.get("data").([]any); ok && len(list) > 0 {
		if m, ok := list[0].(map[string]any); ok {
			v, _ := m["id"].(float64)
			sourceID = int64(v)
		}
	}
	listing := adminC.ok(http.MethodGet, "/market/plugins?source_id="+strconv.FormatInt(sourceID, 10), nil)
	marketKey2, marketVersion := firstMarketPlugin(t, listing)
	before := marketPackageGets.Load()
	review = adminC.ok(http.MethodPost, "/plugins/install-from-market", map[string]any{"source_id": sourceID, "key": marketKey2, "version": marketVersion})
	adminC.consentAll(review)
	adminC.ok(http.MethodPost, "/plugins/"+marketKey2+"/enable", nil)
	wait(marketKey2+" enabled on every node", 3*time.Minute, func() bool { return enabledEverywhere(marketKey2) })
	var marketSum, packageURL string
	if err = db.QueryRow(ctx, `SELECT lower(package_sha256),package_url FROM plugin_versions WHERE plugin_key=$1 AND version=$2`, marketKey2, marketVersion).Scan(&marketSum, &packageURL); err != nil {
		t.Fatal(err)
	}
	gets := marketPackageGets.Load() - before
	if !strings.HasPrefix(packageURL, market.URL) || gets < 4 {
		t.Fatalf("market package must be fetched by the installer and each node: url=%q gets=%d", packageURL, gets)
	}
	if held("b", marketSum) {
		t.Fatal("follower b pulled a market package from the primary instead of the market")
	}
	if !held("a", marketSum) {
		t.Fatal("the primary keeps no fallback copy of the market package")
	}
	t.Logf("market %s@%s: %d downloads from the market (install + each node); b never used the node network for it", marketKey2, marketVersion, gets)

	// ---- primary down: a follower with its packages restarts and serves
	bootB := ""
	if st, _, err := c.node("b").runtime.Status(ctx); err == nil {
		bootB = st.BootID
	}
	c.stopShell(c.node("a"))
	t.Log("primary a stopped")
	restarted := c.restartShell("b")
	wait("follower b serving without the primary", 3*time.Minute, func() bool {
		st, mode, err := restarted.runtime.Status(ctx)
		return err == nil && st.Ready && mode == "local" && st.BootID != bootB && probe(restarted) == 401
	})
	t.Log("follower b restarted with a new core while the primary was down; it serves from its local release and plugin copies")
	// ---- a node with nothing cached cannot start without the primary
	joined := c.startShell("d")
	if err = joined.engine.Recover(ctx, false); err == nil {
		t.Fatal("a node without the release started while the primary was down")
	}
	c.run(joined)
	time.Sleep(5 * time.Second)
	if joined.supervisor.Status().Running || probe(joined) != 503 {
		t.Fatal("node d runs a core without the primary")
	}
	t.Logf("node d cannot start while the primary is down: %v", err)
	c.restartShell("a")
	wait("node d serving after the primary returned", 5*time.Minute, func() bool {
		st, mode, err := joined.runtime.Status(ctx)
		return err == nil && st.Ready && mode == "local" && probe(joined) == 401
	})
	for _, key := range []string{"anthropic", "volcengine", uploadKey} {
		if !held("d", digestOf(key)) {
			t.Fatalf("node d did not pull %s from the primary", key)
		}
	}
	if held("d", marketSum) {
		t.Fatal("node d pulled the market package from the primary instead of the market")
	}
	t.Log("node d started after the primary returned, pulling bundled and uploaded packages from it and the market package from the market")
}

func firstMarketPlugin(t *testing.T, listing apiResponse) (string, string) {
	t.Helper()
	items, _ := listing.get("data").([]any)
	if m, ok := listing.get("data").(map[string]any); ok {
		items, _ = m["items"].([]any)
	}
	for _, it := range items {
		m, _ := it.(map[string]any)
		key, _ := m["key"].(string)
		versions, _ := m["versions"].([]any)
		if key == "" || len(versions) == 0 {
			continue
		}
		v, _ := versions[0].(map[string]any)
		if version, _ := v["version"].(string); version != "" {
			return key, version
		}
	}
	t.Fatalf("market lists no plugin: %s", listing)
	return "", ""
}

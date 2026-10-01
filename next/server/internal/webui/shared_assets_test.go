package webui

import (
	"context"
	"errors"
	"io/fs"
	"net/http"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

func assetBuild(name, body string) fstest.MapFS {
	return fstest.MapFS{
		"dist/index.html":     {Data: []byte(`<script nonce="__CSP_NONCE__" src="/assets/` + name + `"></script>`)},
		"dist/assets/" + name: {Data: []byte(body)},
		"dist/favicon.svg":    {Data: []byte(`<svg/>`)},
	}
}

func TestSharedAssetsCrossBuildCollisionAndCapacity(t *testing.T) {
	db := testutil.DB(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	aFS, bFS := assetBuild("a-abcdefgh.js", "from-A"), assetBuild("shared/b-12345678.js", "from-B")
	a, err := NewSharedAssets(db, aFS, SharedOptions{})
	if err != nil {
		t.Fatal(err)
	}
	b, err := NewSharedAssets(db, bFS, SharedOptions{})
	if err != nil {
		t.Fatal(err)
	}
	uiA, _ := New(aFS, WithSharedAssets(a))
	uiB, _ := New(bFS, WithSharedAssets(b))
	gin.SetMode(gin.TestMode)
	ea, eb := gin.New(), gin.New()
	ea.NoRoute(uiA.Serve)
	eb.NoRoute(uiB.Serve)
	if w := get(ea, "GET", "/"); w.Code != 503 {
		t.Fatal("unpublished index admitted", w.Code)
	}
	if err = a.Publish(ctx); err != nil {
		t.Fatal(err)
	}
	if err = b.Publish(ctx); err != nil {
		t.Fatal(err)
	}
	if w := get(ea, "GET", "/"); w.Code != 200 || !strings.Contains(w.Body.String(), "a-abcdefgh.js") || strings.Contains(w.Body.String(), NoncePlaceholder) {
		t.Fatal(w.Code, w.Body.String())
	}
	w := get(eb, "GET", "/assets/a-abcdefgh.js")
	if w.Code != 200 || w.Body.String() != "from-A" || !strings.Contains(w.Header().Get("Cache-Control"), "immutable") {
		t.Fatal("cross-build asset unavailable", w.Code, w.Body.String())
	}
	if _, err = a.Read(ctx, "index.html"); !errors.Is(err, fs.ErrNotExist) {
		t.Fatal("index was shared", err)
	}
	if _, err = a.Read(ctx, "favicon.svg"); !errors.Is(err, fs.ErrNotExist) {
		t.Fatal("unhashed file was shared", err)
	}
	if w := get(eb, "GET", "/assets/missing-abcdefgh.js"); w.Code != 404 {
		t.Fatal(w.Code)
	}
	collisionFS := assetBuild("a-abcdefgh.js", "overwritten")
	collisionFS["dist/assets/new-abcdefgh.js"] = &fstest.MapFile{Data: []byte("must rollback")}
	c, err := NewSharedAssets(db, collisionFS, SharedOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if err = c.Publish(ctx); err == nil || c.Ready() {
		t.Fatal("immutable collision accepted")
	}
	conflictingHandler, _ := New(collisionFS, WithSharedAssets(c))
	conflictingEngine := gin.New()
	conflictingEngine.NoRoute(conflictingHandler.Serve)
	if w := get(conflictingEngine, "GET", "/assets/a-abcdefgh.js"); w.Code != 200 || w.Body.String() != "from-A" {
		t.Fatal("unpublished local bytes bypassed canonical asset", w.Code, w.Body.String())
	}
	if body, err := a.Read(ctx, "assets/a-abcdefgh.js"); err != nil || string(body) != "from-A" {
		t.Fatal("collision overwrote retained asset", string(body), err)
	}
	if _, err := a.Read(ctx, "assets/new-abcdefgh.js"); !errors.Is(err, fs.ErrNotExist) {
		t.Fatal("failed build left partial assets", err)
	}
	limited, err := NewSharedAssets(db, assetBuild("c-abcdefgh.js", "too-much"), SharedOptions{MaxTotalBytes: 1})
	if err != nil {
		t.Fatal(err)
	}
	if err = limited.Publish(ctx); err == nil {
		t.Fatal("capacity limit evicted retained builds")
	}
	if body, err := b.Read(ctx, "assets/a-abcdefgh.js"); err != nil || string(body) != "from-A" {
		t.Fatal("capacity failure lost retained build")
	}
	if _, err := NewSharedAssets(db, aFS, SharedOptions{MaxFileBytes: 1}); err == nil {
		t.Fatal("file size limit ignored")
	}
	expired := time.Now().Add(-time.Second)
	a.readyUntil.Store(&expired)
	if w := get(ea, "GET", "/"); w.Code != 503 {
		t.Fatal("expired publication emitted new index")
	}
	if err = a.renew(ctx); err != nil || !a.Ready() {
		t.Fatal("publication did not recover", err)
	}
}

func TestSharedAssetCollectionProtectsLeasesRetentionAndRecentBuilds(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	s, err := NewSharedAssets(db, assetBuild("local-abcdefgh.js", "x"), SharedOptions{})
	if err != nil {
		t.Fatal(err)
	}
	// Four recent builds: the fourth is protected by retention. The fifth
	// is old but alive. Only the sixth is outside all three protections.
	for i, id := range []string{"recent-1", "recent-2", "recent-3", "retained", "active", "expired"} {
		age := i + 1
		if i >= 4 {
			age = 30 + i
		}
		lease := -1
		if id == "active" {
			lease = 120
		}
		_, err = db.Pool.Exec(ctx, `INSERT INTO web_asset_builds(build_id,published_at,last_seen,lease_until)
			VALUES($1,clock_timestamp()-make_interval(days=>$2),clock_timestamp()-make_interval(days=>$2),clock_timestamp()+make_interval(secs=>$3));
			`, id, age, lease)
		if err != nil {
			t.Fatal(err)
		}
		name := "assets/" + id + "-abcdefgh.js"
		if _, err = db.Pool.Exec(ctx, `INSERT INTO web_assets(path,sha256,body,size)VALUES($1,'hash','x',1);`, name); err != nil {
			t.Fatal(err)
		}
		if _, err = db.Pool.Exec(ctx, `INSERT INTO web_asset_build_files(build_id,path)VALUES($1,$2)`, id, name); err != nil {
			t.Fatal(err)
		}
	}
	err = db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock($1)`, assetLockKey); err != nil {
			return err
		}
		return s.collect(ctx, tx)
	})
	if err != nil {
		t.Fatal(err)
	}
	var builds, files int
	if err = db.Pool.QueryRow(ctx, `SELECT (SELECT count(*) FROM web_asset_builds),(SELECT count(*) FROM web_assets)`).Scan(&builds, &files); err != nil || builds != 5 || files != 5 {
		t.Fatal("GC lost protected references or retained orphan", builds, files, err)
	}
	if _, err = s.Read(ctx, "assets/expired-abcdefgh.js"); !errors.Is(err, fs.ErrNotExist) {
		t.Fatal("expired orphan remains", err)
	}
	if _, err = s.Read(ctx, "assets/active-abcdefgh.js"); err != nil {
		t.Fatal("active build removed", err)
	}
}

type failedAssetSource struct{}

func (failedAssetSource) Ready() bool { return true }
func (failedAssetSource) Read(context.Context, string) ([]byte, error) {
	return nil, errors.New("store unavailable")
}
func TestSharedAssetReadFailureDoesNotBecomeMissing(t *testing.T) {
	h, err := New(assetBuild("local-abcdefgh.js", "x"), WithSharedAssets(failedAssetSource{}))
	if err != nil {
		t.Fatal(err)
	}
	e := gin.New()
	e.NoRoute(h.Serve)
	if w := get(e, http.MethodGet, "/assets/remote-abcdefgh.js"); w.Code != 503 {
		t.Fatal(w.Code)
	}
}

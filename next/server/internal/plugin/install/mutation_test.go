package install

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"testing"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/cluster"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestInstallMutationsBlockedButEmergencyRevocationAllowed(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	g := &cluster.PluginMutations{DB: db, Locker: cluster.NewLocker(rdb, nil)}
	s := New(Deps{DB: db, Mutations: g, Nodes: emptyNodes{}, Packages: registrytest.Source()}, Options{})
	if _, err := db.Pool.Exec(ctx, `CREATE SCHEMA updater;CREATE TABLE updater.upgrades(status text);INSERT INTO updater.upgrades VALUES('paused');
		INSERT INTO plugins(key,name,status)VALUES('guard','{}','installed');
		INSERT INTO plugin_permission_grants(plugin_key,permission,scope,status,plugin_version,manifest_hash)VALUES('guard','lock','{}','granted','1.0.0','hash')`); err != nil {
		t.Fatal(err)
	}
	for _, fn := range []func() error{
		func() error { _, err := s.Upload(ctx, nil, 0, UploadOptions{}); return err },
		func() error { _, err := s.Consent(ctx, "guard", "1", ConsentRequest{}, 0); return err },
		func() error { return s.Reject(ctx, "guard", "1", 0) },
		func() error { _, err := s.Uninstall(ctx, "guard", UninstallOptions{}, 0); return err },
	} {
		if err := fn(); err == nil {
			t.Fatal("mutation accepted during paused core update")
		}
	}
	if err := s.RevokeGrant(ctx, "guard", "lock", 0); err != nil {
		t.Fatal("emergency revoke blocked", err)
	}
	var status string
	var revision int64
	if err := db.Pool.QueryRow(ctx, `SELECT g.status,p.row_version FROM plugin_permission_grants g JOIN plugins p ON p.key=g.plugin_key WHERE p.key='guard'`).Scan(&status, &revision); err != nil {
		t.Fatal(err)
	}
	if status != "revoked" || revision != 1 {
		t.Fatal(status, revision)
	}
}

func TestUninstallReleasesSubmissionLockBeforeWaitingForPhysicalStop(t *testing.T) {
	db := testutil.DB(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	g := &cluster.PluginMutations{DB: db, Locker: cluster.NewLocker(rdb, nil)}
	s := New(Deps{DB: db, Mutations: g, Nodes: emptyNodes{}, Packages: registrytest.Source()}, Options{})
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status)VALUES('guard','{}','disabled');INSERT INTO plugin_runtime_nodes(plugin_key,boot_id)VALUES('guard','lost-boot')`); err != nil {
		t.Fatal(err)
	}
	finished := make(chan error, 1)
	go func() { finished <- s.quiesce(ctx, "guard", 0) }()
	deadline := time.After(3 * time.Second)
	for {
		var pending bool
		if err := db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM plugin_uninstalls)`).Scan(&pending); err != nil {
			t.Fatal(err)
		}
		if pending && rdb.Exists(ctx, "lock:"+rc.ClusterChangeLock).Val() == 0 {
			break
		}
		select {
		case err := <-finished:
			t.Fatal("uninstall returned before barrier", err)
		case <-deadline:
			t.Fatal("submission lock retained while waiting")
		case <-time.After(10 * time.Millisecond):
		}
	}
	cancel()
	if err := <-finished; err == nil {
		t.Fatal("missing stop acknowledgement accepted")
	}
}

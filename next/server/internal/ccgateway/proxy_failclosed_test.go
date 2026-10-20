package ccgateway

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestMissingOrInvalidBoundProxyNeverBecomesDirect(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	cipher, _ := secret.New(make([]byte, 32))
	s := New(db, cipher)
	var proxyID, accountID int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO proxies(name,protocol,host,port) VALUES('failclosed','http','proxy.example',3128) RETURNING id`).Scan(&proxyID); err != nil {
		t.Fatal(err)
	}
	if err := db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc,proxy_id) VALUES('failclosed','ccgateway','managed',''::bytea,$1) RETURNING id`, proxyID).Scan(&accountID); err != nil {
		t.Fatal(err)
	}
	const draft = "dfa11face00000001"
	if _, err := db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key,proxy_id,initial_settings) VALUES($1,$2,'{}')`, draft, proxyID); err != nil {
		t.Fatal(err)
	}
	// The runtime is left running as it is (enabled, never reconfigured) and
	// its requests fail; it never becomes direct.
	assertBlocked := func(d accountDesired, err error) {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
		if !d.Enabled || d.Direct || d.Proxy != nil || d.unavailable() != reasonProxyUnavailable {
			t.Fatalf("unavailable bound proxy did not fail closed: enabled=%v direct=%v reason=%s", d.Enabled, d.Direct, d.unavailable())
		}
	}
	// The database schema currently permits an empty protocol. It must not
	// become the absence of an intentionally configured proxy.
	if _, err := db.Pool.Exec(ctx, `UPDATE proxies SET protocol='' WHERE id=$1`, proxyID); err != nil {
		t.Fatal(err)
	}
	assertBlocked(s.desired(ctx, accountID, true))
	assertBlocked(s.draftDesired(ctx, draft, true))
	// Draft proxy references are not protected by the accounts FK/delete guard.
	// Simulate deletion after the configured proxy was selected in the editor.
	if _, err := db.Pool.Exec(ctx, `UPDATE accounts SET proxy_id=NULL WHERE id=$1;`, accountID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `DELETE FROM proxies WHERE id=$1`, proxyID); err != nil {
		t.Fatal(err)
	}
	assertBlocked(s.draftDesired(ctx, draft, true))
	// Actual explicit unbinding retains the existing direct-egress contract.
	d, err := s.desired(ctx, accountID, true)
	if err != nil || !d.Enabled || !d.Direct {
		t.Fatalf("explicit direct binding rejected: enabled=%v direct=%v err=%v", d.Enabled, d.Direct, err)
	}
}

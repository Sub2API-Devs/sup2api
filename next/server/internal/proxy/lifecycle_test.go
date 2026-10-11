package proxy

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/event"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestObservedIPNotifiesAccountsOnlyOnChange(t *testing.T) {
	db := testutil.DB(t)
	service := New(db, testCipher(t), nil, Options{Events: event.NewPublisher(db)})
	ctx := t.Context()
	var proxyID int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO proxies(name,protocol,host,port) VALUES('lifecycle','http','proxy.invalid',3128) RETURNING id`).Scan(&proxyID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc,proxy_id) VALUES('first','first','managed',''::bytea,$1),('second','second','managed',''::bytea,$1)`, proxyID); err != nil {
		t.Fatal(err)
	}
	for _, ip := range []string{"192.0.2.1", "192.0.2.1", "192.0.2.2"} {
		if err := service.recordObservedIP(ctx, proxyID, ip); err != nil {
			t.Fatal(err)
		}
	}
	var events, unexpected int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*),count(*) FILTER (WHERE payload->'changed_fields'->>0 <> 'proxy.real_ip' OR payload->>'plugin_key' NOT IN ('first','second')) FROM events WHERE type='account.updated'`).Scan(&events, &unexpected); err != nil {
		t.Fatal(err)
	}
	if events != 4 || unexpected != 0 {
		t.Fatalf("incorrect proxy notifications: events=%d unexpected=%d", events, unexpected)
	}
}

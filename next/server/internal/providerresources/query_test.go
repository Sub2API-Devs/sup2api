package providerresources

import (
	"context"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"testing"
	"time"
)

func TestResourceQueryValidation(t *testing.T) {
	q := core.ResourceQuery{PluginKey: "ccgateway", Kind: "file", Limit: 20}
	owner := core.ResourceOwner{UserID: 1, GroupID: 1}
	page, err := New(nil, Options{}).Query(context.Background(), owner, q)
	if err != nil || len(page.Items) != 0 {
		t.Fatal("empty authorized account set must not query all", err)
	}
	q.BeforeID = "one"
	q.AfterID = "two"
	if _, _, e := queryFilter(owner, q); e == nil {
		t.Fatal("conflicting cursors accepted")
	}
}

func TestProviderResourceDBFilteredPagination(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	s := New(db, Options{})
	var owner core.ResourceOwner
	if e := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('pages@example.com','x') RETURNING id`).Scan(&owner.UserID); e != nil {
		t.Fatal(e)
	}
	if e := db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('pages') RETURNING id`).Scan(&owner.GroupID); e != nil {
		t.Fatal(e)
	}
	ids := make([]string, 8)
	for i := range ids {
		intent := core.ResourceIntent{RequestID: fmt.Sprint(i), PluginKey: "ccgateway", Kind: "file", Owner: owner, Binding: core.ResourceBinding{AccountID: 21, PrincipalID: "identity", Generation: "issuer"}}
		if i == 3 {
			intent.Kind = "container"
		}
		if i == 4 {
			intent.Binding.AccountID = 22
		}
		r, e := s.Reserve(ctx, intent)
		if e != nil {
			t.Fatal(e)
		}
		ids[i] = r.Resource.PublicID
		if i != 1 {
			completion := core.ResourceCompletion{Owner: owner, PublicID: ids[i], OperationID: r.Resource.OperationID, RemoteID: fmt.Sprint("remote", i), Binding: intent.Binding}
			if i == 5 {
				expiry := time.Now().Add(-time.Hour)
				completion.ExpiresAt = &expiry
			}
			if _, e = s.Finalize(ctx, completion); e != nil {
				t.Fatal(e)
			}
		}
		if _, e = db.Pool.Exec(ctx, `UPDATE provider_resources SET created_at=$2 WHERE public_id=$1`, ids[i], time.Unix(int64(100+i), 0)); e != nil {
			t.Fatal(e)
		}
	}
	q := core.ResourceQuery{PluginKey: "ccgateway", Kind: "file", AccountIDs: []int64{21}, ReadyOnly: true, UnexpiredOnly: true, Limit: 2}
	assert := func(q core.ResourceQuery, expected []int, more bool) {
		t.Helper()
		p, e := s.Query(ctx, owner, q)
		if e != nil || len(p.Items) != len(expected) || p.HasMore != more {
			t.Fatalf("page %+v %v", p, e)
		}
		for j, i := range expected {
			if p.Items[j].PublicID != ids[i] {
				t.Fatalf("item %d wrong", j)
			}
		}
	}
	assert(q, []int{7, 6}, true)
	q.AfterID = ids[6]
	assert(q, []int{2, 0}, false)
	q.AfterID = ""
	q.BeforeID = ids[2]
	assert(q, []int{7, 6}, false)
	q.BeforeID = ids[4]
	if _, e := s.Query(ctx, owner, q); e == nil {
		t.Fatal("cursor outside account filter accepted")
	}
	q.BeforeID = ""
	q.IDs = []string{ids[0], ids[6], ids[5]}
	assert(q, []int{6, 0}, false)
	q.IDs = nil
	q.Limit = 100
	q.UnexpiredOnly = false
	q.ExpiredWithin = 30 * 24 * time.Hour
	assert(q, []int{7, 6, 5, 2, 0}, false)
	if _, e := db.Pool.Exec(ctx, `UPDATE provider_resources SET expires_at=now()-interval '31 days' WHERE public_id=$1`, ids[5]); e != nil {
		t.Fatal(e)
	}
	assert(q, []int{7, 6, 2, 0}, false)
}

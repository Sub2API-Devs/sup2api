package guard

import (
	"context"
	"encoding/json"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// putRulesReq builds a PUT /rules request (Harness.Do cannot be used off the
// test goroutine: it calls t.Fatalf).
func putRulesReq(t *testing.T, rules []map[string]any) *pluginv1.HTTPRequest {
	t.Helper()
	body, err := json.Marshal(map[string]any{"rules": rules})
	if err != nil {
		t.Fatal(err)
	}
	return &pluginv1.HTTPRequest{
		Caller: &pluginv1.Caller{UserId: 1, RequestId: "test", Locale: "en"},
		Method: "PUT", Path: "/rules", RoutePath: "/rules", Body: body,
		Query: map[string]*pluginv1.HeaderValues{},
	}
}

func rulePatterns(t *testing.T, p *Plugin) []string {
	t.Helper()
	rules, err := p.loadRules(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	out := []string{}
	for _, r := range rules {
		out = append(out, r.Pattern)
	}
	slices.Sort(out)
	return out
}

// Two admins on two nodes save at the same time: the result is one of the
// two rule sets as a whole, never a mix.
func TestPutRulesConcurrent(t *testing.T) {
	dsn, schema := pluginsdktest.NewSchema(t, "plg_guard_cc")
	pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))
	host1, host2 := pluginsdktest.NewFakeHost(), pluginsdktest.NewFakeHost()
	host1.SetDSN(dsn, schema)
	host2.SetDSN(dsn, schema)
	p1, p2 := New(), New()
	h1 := pluginsdktest.Start(t, p1, pluginsdktest.Options{Host: host1, SDK: sdkOpts()})
	h2 := pluginsdktest.Start(t, p2, pluginsdktest.Options{Host: host2, SDK: sdkOpts()})
	ctx := context.Background()

	for round := 0; round < 20; round++ {
		resp := h1.Do("PUT", "/rules", nil, map[string]any{"rules": []map[string]any{
			{"kind": "keyword", "pattern": "BASE1"}, {"kind": "keyword", "pattern": "BASE2"},
		}})
		var list struct {
			Data []Rule `json:"data"`
		}
		if resp.GetStatus() != 200 || json.Unmarshal(resp.GetBody(), &list) != nil || len(list.Data) != 2 {
			t.Fatalf("base PUT = %d %s", resp.GetStatus(), resp.GetBody())
		}
		// A keeps BASE1 and adds A_NEW; B keeps BASE2 and adds B_NEW.
		reqA := putRulesReq(t, []map[string]any{
			{"id": list.Data[0].ID, "kind": "keyword", "pattern": "BASE1"}, {"kind": "keyword", "pattern": "A_NEW"},
		})
		reqB := putRulesReq(t, []map[string]any{
			{"id": list.Data[1].ID, "kind": "keyword", "pattern": "BASE2"}, {"kind": "keyword", "pattern": "B_NEW"},
		})
		var wg sync.WaitGroup
		start := make(chan struct{})
		statuses := make([]int32, 2)
		errs := make([]error, 2)
		for i, x := range []struct {
			h   *pluginsdktest.Harness
			req *pluginv1.HTTPRequest
		}{{h1, reqA}, {h2, reqB}} {
			wg.Add(1)
			go func() {
				defer wg.Done()
				<-start
				r, err := x.h.HTTP.HandleHTTP(ctx, x.req)
				statuses[i], errs[i] = r.GetStatus(), err
			}()
		}
		close(start)
		wg.Wait()
		for i := range 2 {
			if errs[i] != nil || statuses[i] != 200 {
				t.Fatalf("round %d: PUT %d = %d %v", round, i, statuses[i], errs[i])
			}
		}
		got := strings.Join(rulePatterns(t, p1), ",") // sorted: "BASE2" < "B_NEW"
		if got != "A_NEW,BASE1" && got != "BASE2,B_NEW" {
			t.Fatalf("round %d: rules = %s, want one PUT's set as a whole", round, got)
		}
	}

	// The PUT really waits for the table lock: with a conflicting lock held
	// elsewhere it does not finish until that transaction ends.
	db, err := p1.db(ctx)
	if err != nil {
		t.Fatal(err)
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	if _, err := tx.Exec(ctx, `LOCK TABLE rules IN SHARE ROW EXCLUSIVE MODE`); err != nil {
		t.Fatal(err)
	}
	done := make(chan int32, 1)
	late := putRulesReq(t, []map[string]any{{"kind": "keyword", "pattern": "LATE"}})
	go func() {
		r, _ := h2.HTTP.HandleHTTP(ctx, late)
		done <- r.GetStatus()
	}()
	select {
	case st := <-done:
		t.Fatalf("PUT finished (%d) while the rules table was locked", st)
	case <-time.After(300 * time.Millisecond):
	}
	// Reads are not blocked by it.
	if got := rulePatterns(t, p2); len(got) != 2 {
		t.Fatalf("read during lock = %v", got)
	}
	if err := tx.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	select {
	case st := <-done:
		if st != 200 {
			t.Fatalf("PUT after unlock = %d", st)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("PUT still blocked after the lock was released")
	}
	if got := strings.Join(rulePatterns(t, p1), ","); got != "LATE" {
		t.Fatalf("rules = %s", got)
	}
}

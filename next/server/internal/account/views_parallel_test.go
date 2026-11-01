package account

import (
	"context"
	"fmt"
	"math/rand/v2"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// slowSlots answers every kind (fakeSlots refuses model-list kinds, so the
// list never exercised fillModelInUse) after a random delay, so the
// concurrent list reads interleave under -race, and counts the reads per kind.
type slowSlots struct {
	mu    sync.Mutex
	calls map[string]int
	panic bool
}

func (s *slowSlots) Acquire(context.Context, string, int64, int, string) (func(), bool, error) {
	return func() {}, true, nil
}

func (s *slowSlots) InUse(ctx context.Context, kind string, id int64) (int, error) {
	m, err := s.InUseMany(ctx, kind, []int64{id})
	return m[id], err
}

func (s *slowSlots) InUseMany(_ context.Context, kind string, ids []int64) (map[int64]int, error) {
	time.Sleep(time.Duration(rand.IntN(3000)) * time.Microsecond)
	s.mu.Lock()
	s.calls[kind]++
	s.mu.Unlock()
	if s.panic && kind == "account" {
		panic("slots exploded")
	}
	out := make(map[int64]int, len(ids))
	for _, id := range ids {
		out[id] = slotCount(kind, id)
	}
	return out, nil
}

func slotCount(kind string, id int64) int {
	if strings.HasPrefix(kind, "account-model:") {
		return int(id%5) + 10
	}
	return int(id % 7)
}

// listService builds a service over the harness database with slowSlots, a
// real limiter and real observation statistics (not started: reads only).
func (e *env) listService(slots *slowSlots) *Service {
	rdb := redis.NewClient(&redis.Options{Addr: e.mr.Addr()})
	e.t.Cleanup(func() { _ = rdb.Close() })
	return New(Deps{DB: e.db, Redis: rdb, Cipher: e.svc.d.Cipher, Registry: e.reg, Proxies: e.prx, Resolver: e.prx,
		Authorizer: fakeAuthz{}, Events: dbEvents{}, Slots: slots, Limiter: NewLimiter(rdb), Stats: NewStats(rdb, e.db, slots, e.bus),
		Bus: e.bus, Converters: fakeConverters{}, AllowPrivateUpstream: true})
}

func TestListViewsConcurrentReads(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	g1 := e.exec1(`INSERT INTO groups (name) VALUES ('b') RETURNING id`)
	g2 := e.exec1(`INSERT INTO groups (name) VALUES ('a') RETURNING id`)
	var ids []int64
	for i := range 12 {
		id := e.mkAccount(fmt.Sprintf("sk-list-%04d", i))
		ids = append(ids, id)
		if i%3 == 0 {
			continue // no groups, no model lists
		}
		e.exec1(`INSERT INTO account_groups (account_id, group_id) VALUES ($1, $2), ($1, $3) RETURNING account_id`, id, g2, g1)
		code, out := e.do("PATCH", fmt.Sprintf("/accounts/%d", id), map[string]any{"model_limits": []map[string]any{
			{"models": []string{fmt.Sprintf("m-%d", i%2)}, "rpm_limit": 3}, {"models": []string{"m-x"}, "max_concurrency": 2}}})
		if code != 200 {
			t.Fatalf("patch model limits: %d %v", code, out)
		}
	}
	slots := &slowSlots{calls: map[string]int{}}
	svc := e.listService(slots)

	for range 5 {
		total, rows, err := svc.listPage(ctx, ` WHERE a.deleted_at IS NULL`, nil, 1, 50)
		if err != nil || total != int64(len(ids)) || len(rows) != len(ids) {
			t.Fatalf("list page: %d %d %v", total, len(rows), err)
		}
		for _, r := range rows {
			if r.CredEnc != nil {
				t.Fatalf("list row %d carries credentials", r.ID)
			}
		}
		out, err := svc.views(ctx, rows)
		if err != nil {
			t.Fatal(err)
		}
		for i, v := range out {
			if v.ID != rows[i].ID {
				t.Fatalf("view %d out of order: %d", i, v.ID)
			}
			if v.InUse != slotCount("account", v.ID) {
				t.Fatalf("account %d in_use %d", v.ID, v.InUse)
			}
			if v.Usage == nil {
				t.Fatalf("account %d without usage", v.ID)
			}
			if len(v.ModelLimits) == 0 {
				if len(v.GroupIDs) != 0 || v.GroupIDs == nil || v.Groups == nil {
					t.Fatalf("account %d groups: %v %v", v.ID, v.GroupIDs, v.Groups)
				}
				continue
			}
			if fmt.Sprint(v.GroupIDs) != fmt.Sprint([]int64{min(g1, g2), max(g1, g2)}) {
				t.Fatalf("account %d groups %v", v.ID, v.GroupIDs)
			}
			if len(v.RateUsage.Models) != len(v.ModelLimits) {
				t.Fatalf("account %d model usage %v", v.ID, v.RateUsage.Models)
			}
			for _, m := range v.RateUsage.Models {
				if m.InUse != slotCount("account-model:x", v.ID) {
					t.Fatalf("account %d model in_use %d", v.ID, m.InUse)
				}
			}
		}
	}
	// The outcomes read no longer counts the account slots a second time.
	if slots.calls["account"] != 5 {
		t.Fatalf("account slot reads: %d", slots.calls["account"])
	}

	// An empty page past the end still reports the total.
	total, rows, err := svc.listPage(ctx, ` WHERE a.deleted_at IS NULL AND a.name LIKE $1`, []any{"sk-list-%"}, 3, 10)
	if err != nil || total != int64(len(ids)) || len(rows) != 0 {
		t.Fatalf("page past the end: %d %d %v", total, len(rows), err)
	}
}

func TestListViewsSurvivePanickingRead(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	e.mkAccount("sk-panic-0001")
	svc := e.listService(&slowSlots{calls: map[string]int{}, panic: true})
	_, rows, err := svc.listPage(ctx, ` WHERE a.deleted_at IS NULL`, nil, 1, 20)
	if err != nil {
		t.Fatal(err)
	}
	out, err := svc.views(ctx, rows)
	if err != nil || len(out) != 1 || out[0].InUse != 0 || out[0].Usage == nil {
		t.Fatalf("views after a panicking read: %v %v", out, err)
	}
}

func TestRunParallelBoundsAndRecovers(t *testing.T) {
	var running, peak, done atomic.Int32
	tasks := make([]func(), 20)
	for i := range tasks {
		tasks[i] = func() {
			n := running.Add(1)
			for {
				p := peak.Load()
				if n <= p || peak.CompareAndSwap(p, n) {
					break
				}
			}
			time.Sleep(2 * time.Millisecond)
			running.Add(-1)
			done.Add(1)
			if i == 7 {
				panic("boom")
			}
		}
	}
	runParallel(context.Background(), 3, tasks...)
	if done.Load() != 20 || peak.Load() > 3 || peak.Load() < 2 {
		t.Fatalf("done %d peak %d", done.Load(), peak.Load())
	}
	var ran atomic.Bool
	runParallel(context.Background(), 0, func() { ran.Store(true) })
	if !ran.Load() {
		t.Fatal("single task did not run")
	}
}

var _ core.Slots = (*slowSlots)(nil)

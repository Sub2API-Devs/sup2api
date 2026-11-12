package account

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestLimiterWindows(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	now := time.Date(2026, 9, 25, 12, 0, 30, 0, time.UTC)
	l := NewLimiter(rdb)
	l.w.Now = func() time.Time { return now }
	ctx := context.Background()
	refs := []core.AccountRef{{ID: 1, RPMLimit: 2}, {ID: 2, TPMLimit: 100}, {ID: 3}}
	if ex, err := l.Exhausted(ctx, refs, "m", ""); err != nil || len(ex) != 0 {
		t.Fatal(ex, err)
	}
	for range 2 {
		if ok, err := l.TryHit(ctx, refs[0], "m", ""); err != nil || !ok {
			t.Fatal(ok, err)
		}
	}
	l.AddTokens(ctx, 2, "", 100)
	ex, err := l.Exhausted(ctx, refs, "m", "")
	if err != nil || !ex[1] || !ex[2] || ex[3] {
		t.Fatal(ex, err)
	}
	u, err := l.Usage(ctx, refs)
	if err != nil || u[1].RPM != 2 || u[2].TPM != 100 || u[3].RPM != 0 || u[3].TPM != 0 {
		t.Fatal(u, err)
	}
	// Right after the minute the previous window still counts in full,
	// until its segment has wholly left (12:00:30 starts a segment).
	now = now.Add(62 * time.Second)
	ex, err = l.Exhausted(ctx, refs, "m", "")
	if err != nil || !ex[1] || !ex[2] {
		t.Fatal("previous minute forgotten", ex, err)
	}
	now = now.Add(time.Second)
	ex, err = l.Exhausted(ctx, refs, "m", "")
	if err != nil || len(ex) != 0 {
		t.Fatal("window slid", ex, err)
	}
	if ok, err := l.TryHit(ctx, refs[0], "m", ""); err != nil || !ok {
		t.Fatal(ok, err)
	}
	if ex, err := NewLimiter(nil).Exhausted(ctx, refs, "m", ""); err != nil || len(ex) != 0 {
		t.Fatal(ex, err)
	}
	for _, k := range mr.Keys() {
		if strings.Contains(k, ":spm") {
			t.Fatal("a request without a session wrote a session key", k)
		}
	}
}

func TestLimiterModelLists(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	mr.SetTime(time.Date(2026, 10, 30, 12, 0, 5, 0, time.UTC))
	l := NewLimiter(rdb)
	ctx := context.Background()
	big := core.ModelLimit{Models: []string{"model-b", "model-a"}, RPMLimit: 1}
	small := core.ModelLimit{Models: []string{"model-c"}, TPMLimit: 10}
	ref := core.AccountRef{ID: 4, RPMLimit: 10, ModelLimits: []core.ModelLimit{big, small}}

	if ok, err := l.TryHit(ctx, ref, "model-a", ""); err != nil || !ok {
		t.Fatal(ok, err)
	}
	// model-b shares the counter of model-a; model-c and other models do not.
	if ok, _ := l.TryHit(ctx, ref, "model-b", ""); ok {
		t.Fatal("list counter not shared")
	}
	if ex, _ := l.Exhausted(ctx, []core.AccountRef{ref}, "model-b", ""); !ex[4] {
		t.Fatal("precheck missed the list cap")
	}
	if ex, _ := l.Exhausted(ctx, []core.AccountRef{ref}, "model-x", ""); ex[4] {
		t.Fatal("unlisted model limited by a list")
	}
	if ok, _ := l.TryHit(ctx, ref, "model-c", ""); !ok {
		t.Fatal("lists share counters")
	}
	l.AddTokens(ctx, 4, small.Key(), 10)
	if ok, _ := l.TryHit(ctx, ref, "model-c", ""); ok {
		t.Fatal("list tokens cap ignored")
	}
	u, err := l.Usage(ctx, []core.AccountRef{ref})
	if err != nil || u[4].RPM != 2 || u[4].TPM != 10 || len(u[4].Models) != 2 {
		t.Fatal(u, err)
	}
	if m := u[4].Models; m[0].RPM != 1 || m[1].RPM != 1 || m[1].TPM != 10 || m[0].Models[0] != "model-b" {
		t.Fatal(m)
	}
	// The key ignores the order of the models.
	if (&core.ModelLimit{Models: []string{"model-a", "model-b"}}).Key() != big.Key() {
		t.Fatal("key depends on order")
	}
}

func TestLimiterSessions(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	mr.SetTime(time.Date(2026, 10, 30, 12, 0, 5, 0, time.UTC))
	l := NewLimiter(rdb)
	ctx := context.Background()
	opus := core.ModelLimit{Models: []string{"opus"}, SPMLimit: 1}
	ref := core.AccountRef{ID: 6, SPMLimit: 2, ModelLimits: []core.ModelLimit{opus}}
	if !ref.Limited() {
		t.Fatal("SPM alone does not limit the account")
	}

	if ok, err := l.TryHit(ctx, ref, "opus", "s1"); err != nil || !ok {
		t.Fatal(ok, err)
	}
	// The opus list holds s1 only; s2 still fits the account with sonnet.
	if ok, _ := l.TryHit(ctx, ref, "opus", "s2"); ok {
		t.Fatal("list SPM ignored")
	}
	if ok, _ := l.TryHit(ctx, ref, "sonnet", "s2"); !ok {
		t.Fatal("unlisted model limited by the list's SPM")
	}
	if ok, _ := l.TryHit(ctx, ref, "sonnet", "s3"); ok {
		t.Fatal("account SPM ignored")
	}
	ex, err := l.Exhausted(ctx, []core.AccountRef{ref}, "sonnet", "s3")
	if err != nil || !ex[6] {
		t.Fatal("precheck admitted a new session", ex, err)
	}
	if ex, _ = l.Exhausted(ctx, []core.AccountRef{ref}, "opus", "s1"); ex[6] {
		t.Fatal("precheck refused the bound session")
	}
	if ex, _ = l.Exhausted(ctx, []core.AccountRef{ref}, "opus", ""); ex[6] {
		t.Fatal("precheck limited a request without a session")
	}
	u, err := l.Usage(ctx, []core.AccountRef{ref})
	if err != nil || u[6].Sessions != 2 || u[6].Models[0].Sessions != 1 || u[6].RPM != 2 {
		t.Fatal(u, err)
	}
	for _, k := range []string{"rl:account:6:spms:60", "rl:account:6:m:" + opus.Key() + ":spms:60"} {
		if !mr.Exists(k) {
			t.Fatal("session key missing", k, mr.Keys())
		}
	}
}

// Each level counts sessions over its own window; the model's uncapped
// counters follow the account's. A request alone is never remembered.
func TestLimiterSessionWindows(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	now := time.Date(2026, 11, 11, 12, 0, 0, 0, time.UTC)
	l := NewLimiter(rdb)
	l.w.Now = func() time.Time { return now }
	ctx := context.Background()
	opus := core.ModelLimit{Models: []string{"opus"}, SPMLimit: 1, SPMWindowSeconds: 600}
	ref := core.AccountRef{ID: 3, SPMLimit: 5, SPMWindowSeconds: 300, ModelLimits: []core.ModelLimit{opus}}
	if ok, err := l.TryHit(ctx, ref, "opus", "s1"); err != nil || !ok {
		t.Fatal(ok, err)
	}
	if ok, _ := l.TryHit(ctx, ref, "sonnet", core.RequestSession("r1")); !ok {
		t.Fatal("a request alone refused by the account")
	}
	for _, k := range []string{"rl:account:3:spms:300", "rl:account:3:m:" + opus.Key() + ":spms:600", "rl:account:3:md:opus:spms:300"} {
		if !mr.Exists(k) {
			t.Fatal("session key missing", k, mr.Keys())
		}
	}
	if n, _ := rdb.ZCard(ctx, "rl:account:3:spms:300").Result(); n != 1 {
		t.Fatal("a request alone was remembered", n)
	}
	if got, _ := l.ModelUsage(ctx, []core.AccountRef{ref}, "opus"); got[3].Sessions != 1 {
		t.Fatal("the model's session not counted", got)
	}
	// 8 minutes later the account forgot s1, the list has not.
	now = now.Add(8 * time.Minute)
	if ok, _ := l.TryHit(ctx, ref, "opus", "s2"); ok {
		t.Fatal("the list's 10 minutes ignored")
	}
	if ex, _ := l.Exhausted(ctx, []core.AccountRef{ref}, "opus", "s1"); ex[3] {
		t.Fatal("s1 is held by the list for 10 minutes")
	}
	u, err := l.Usage(ctx, []core.AccountRef{ref})
	if err != nil || u[3].Sessions != 0 || u[3].Models[0].Sessions != 1 {
		t.Fatal(u, err)
	}
	rates, err := l.ModelRates(ctx, ref, now.Truncate(24*time.Hour))
	if err != nil || rates[0].Sessions != 0 || rates[0].RPM != 0 {
		t.Fatal(rates, err)
	}
	if got, _ := l.ModelUsage(ctx, []core.AccountRef{ref}, "opus"); got[3].Sessions != 0 {
		t.Fatal("the model's sessions do not follow the account's window", got)
	}
}

// Each client model is counted apart, uncapped, beside the account and its
// model list: ModelRates breaks the account's figures down by model.
func TestLimiterModelRates(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	now := time.Date(2026, 11, 9, 12, 0, 0, 0, time.UTC)
	l := NewLimiter(rdb)
	l.w.Now = func() time.Time { return now }
	ctx := context.Background()
	ref := core.AccountRef{ID: 7, RPMLimit: 3, ModelLimits: []core.ModelLimit{{Models: []string{"a", "b"}, RPMLimit: 3}}}
	for _, hit := range []struct{ model, session string }{{"a", "s1"}, {"a", "s2"}, {"b", "s1"}} {
		hold, ok, err := l.Reserve(ctx, ref, hit.model, hit.session, 0)
		if err != nil || !ok {
			t.Fatal(ok, err)
		}
		l.Settle(ctx, hold, 10)
		l.CountModelTokens(ctx, 7, hit.model, 10)
	}
	// Uncapped model counters never refuse: the account's own cap does.
	if ok, err := l.TryHit(ctx, ref, "c", ""); err != nil || ok {
		t.Fatal("the account cap of 3 must refuse a fourth request", ok, err)
	}
	got, err := l.ModelRates(ctx, ref, now.Truncate(24*time.Hour))
	want := []core.ModelRates{
		{RPM: 3, TPM: 30, TPD: 30, Sessions: 2},
		{Model: "a", RPM: 2, TPM: 20, TPD: 20, Sessions: 2},
		{Model: "b", RPM: 1, TPM: 10, TPD: 10, Sessions: 1},
	}
	if err != nil || !reflect.DeepEqual(got, want) {
		t.Fatalf("got %+v, %v; want %+v", got, err, want)
	}
}

// ModelUsage reads one model's counters on many accounts at once (the core
// balancing by model, CONTRACTS §89).
func TestLimiterModelUsage(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	l := NewLimiter(rdb)
	now := time.Date(2026, 11, 9, 12, 0, 0, 0, time.UTC)
	l.w.Now = func() time.Time { return now }
	ctx := context.Background()
	// A model list on acc-8 does not change what the model's own counters hold.
	refs := []core.AccountRef{{ID: 7}, {ID: 8, ModelLimits: []core.ModelLimit{{Models: []string{"a", "b"}, RPMLimit: 100}}}}
	for _, hit := range []struct {
		ref   core.AccountRef
		model string
	}{{refs[0], "a"}, {refs[0], "a"}, {refs[0], "b"}, {refs[1], "b"}} {
		hold, ok, err := l.Reserve(ctx, hit.ref, hit.model, "", 0)
		if err != nil || !ok {
			t.Fatal(ok, err)
		}
		l.Settle(ctx, hold, 5)
	}
	got, err := l.ModelUsage(ctx, refs, "a")
	want := map[int64]core.RateUsage{7: {RPM: 2, TPM: 10}, 8: {}}
	if err != nil || !reflect.DeepEqual(got, want) {
		t.Fatalf("got %+v, %v; want %+v", got, err, want)
	}
	if got, err := l.ModelUsage(ctx, refs, ""); err != nil || len(got) != 0 {
		t.Fatalf("model \"\": got %+v, %v", got, err)
	}
	got, err = NewLimiter(nil).ModelUsage(ctx, refs, "a")
	if want := (map[int64]core.RateUsage{7: {}, 8: {}}); err != nil || !reflect.DeepEqual(got, want) {
		t.Fatalf("nil redis: got %+v, %v", got, err)
	}
}

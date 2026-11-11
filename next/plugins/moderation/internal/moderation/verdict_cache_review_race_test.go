package moderation

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// The verdict cache between a review and the runs under way: writes that
// overlap a review, queued jobs.

// recordedHit has the node p, behind h, judge text a hit under the request
// id rid, and returns its record, its keys in the cache and the hit as the
// node's memory holds it.
func recordedHit(t *testing.T, p *Plugin, h *pluginsdktest.Harness, scope, rid, text string) (EventListItem, cachedHit, storedHit) {
	t.Helper()
	if r := mustHook(t, h, hookReqAs(3, rid, text)); !denied(r) {
		t.Fatalf("%s = %+v", rid, r)
	}
	rec := recordOf(t, h, rid)
	hit := hitOf(t, scope, rec)
	held := p.lookupVerdicts(context.Background(), scope, hit.segs, false).hit
	if held == nil {
		t.Fatalf("the hit of %s is not in memory", rid)
	}
	return rec, hit, *held
}

// A run that judged before a review and stores its verdicts around it does
// not undo the review, in memory or in the KV: not on the node that
// reviewed, and not on a node that was told. The interleavings are the real
// ones: the write of the run is under way when the review comes - it has its
// turn at the keys and has read them from the KV, or is already writing - and
// goes on after it.
//
//   - On the reviewing node the review waits for the write to end its turn
//     and then writes over it; a write that had only read finds the keys
//     tombstoned and writes nothing of the reviewed hit.
//   - On a node that was told, the write had read the keys before the review
//     and finds them tombstoned when it comes to write. (A write of that node
//     that is past that point when the broadcast arrives restores the hit
//     in the KV: the window that stays open, writeVerdicts.)
func TestReviewIsNotUndoneByLateWrites(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	kv1, kv2 := &kvFake{}, &kvFake{}
	// The clocks stand still: whether a tombstone still stands does not
	// depend on how long the test takes.
	var clock1, clock2 atomic.Int64
	p, h, fh := startDB(t, nil, cfg, withKV(kv1), withClock(&clock1))
	flow := openAIFlow(t, h, mod.srv.URL)
	p2, h2 := secondNode(t, fh, cfg, withKV(kv2), withClock(&clock2))
	scope := flowScope(p, flow)
	// reviewed waits for a review of the first node and tells the second.
	reviewed := func(name string, out <-chan *pluginv1.HTTPResponse) {
		t.Helper()
		if _, synced := reviewAnswer(t, within(t, "the review", out)); synced != 1 {
			t.Fatalf("%s: review: cache synced for %d", name, synced)
		}
		deliverLastReview(t, fh, h2)
	}
	var text string
	var rec EventListItem
	for _, tc := range []struct {
		name string
		p    *Plugin
		kv   *kvFake
		at   int // where the write of the run is when the review comes
		// writes: how often the hit entry is written in all on the node of
		// the run, by the run and by the review.
		writes int
	}{
		{"reviewing node, the write has read", p, kv1, kvReads, 1},
		{"reviewing node, the write is writing", p, kv1, kvWrites, 2},
		{"node that was told", p2, kv2, kvReads, 0},
	} {
		// A hit both nodes know.
		text = "MOD-HIT-sexual late write on the " + tc.name
		if r := mustHook(t, h, hookReqAs(3, tc.name, text)); !denied(r) {
			t.Fatalf("%s: first = %+v", tc.name, r)
		}
		rec = recordOf(t, h, tc.name)
		if r := mustHook(t, h2, hookReq(text)); !replayed(r) {
			t.Fatalf("%s: second node = %+v", tc.name, r)
		}
		hit := hitOf(t, scope, rec)
		hitKey, segKey := hit.hitKey, hit.segKeys[0]
		held := tc.p.lookupVerdicts(context.Background(), scope, hit.segs, true).hit
		if held == nil {
			t.Fatalf("%s: the hit is not cached", tc.name)
		}
		// A run stores the hit again, a pass of its segment and a hit of other
		// content. Its write is held: after it has read the segment key from
		// the KV, or before its write of the hit entry reaches the KV.
		now := tc.p.now().Unix()
		late, other := otherHit(scope, tc.name, now)
		again := *held
		again.At = now
		tc.kv.counts()
		var entered <-chan string
		if tc.at == kvReads {
			entered = tc.kv.holdRead(func(key string) bool { return key == segKey })
		} else {
			entered = tc.kv.hold(func(key string) bool { return key == hitKey })
		}
		tc.p.storeVerdicts(scope, hit.segs, []storedHit{late, again}, now, tc.p.cfg.Load().cacheTTL, askNow(tc.p))
		within(t, "the held write of the run", entered)

		out := reviewAsync(h, ReviewPending, rec.ID)
		if tc.p == p {
			// The review has tombstoned its keys; it cannot end before the
			// write of the run does (TestReviewEndsWithItsRequest is the test
			// that it waits for its turn).
			waitFor(t, "the review to reach the cache", func() bool { return p.cache.Load().tombstoned(hitKey, p.now()) })
		} else {
			// The review on the other node is done, and this node is told.
			reviewed(tc.name, out)
			for _, key := range []string{hitKey, segKey} {
				if _, found := kvValue(t, fh, key); found {
					t.Fatalf("%s: %s is in the KV after the review, before the write went on", tc.name, key)
				}
			}
		}
		// The write goes on and ends.
		tc.kv.open()
		written(t, tc.p)
		if tc.p == p {
			reviewed(tc.name, out)
		}
		// It wrote the other hit, and nothing of the reviewed one is left, in
		// the KV or in memory.
		if _, found := kvValue(t, fh, other); !found {
			t.Fatalf("%s: the late write did not go on (%s is missing)", tc.name, other)
		}
		if _, found := kvValue(t, fh, hitKey); found {
			t.Fatalf("%s: the late write restored the hit in the KV", tc.name)
		}
		if val, found := kvValue(t, fh, segKey); found {
			t.Fatalf("%s: the late write restored the segment in the KV: %s", tc.name, val)
		}
		if writes := tc.kv.counts(); writes[hitKey] != tc.writes {
			t.Fatalf("%s: the hit entry was written %d times on the node of the run, want %d (%v)", tc.name, writes[hitKey], tc.writes, writes)
		}
		for _, useKV := range []bool{false, true} {
			if v := tc.p.lookupVerdicts(context.Background(), scope, hit.segs, useKV); v.hit != nil || len(v.passed) != 0 {
				t.Fatalf("%s: the late write restored %+v (lookup with the KV: %v)", tc.name, v, useKV)
			}
		}
	}

	// False positive: the passes are in the KV; a node that was told reads
	// them there and keeps them out of its memory while the tombstone lasts.
	reviewed("false positive", reviewAsync(h, ReviewFalsePositive, rec.ID))
	before := p2.cache.Load().len()
	if r := mustHook(t, h2, hookReq(text)); r.GetNote() != cachedPass {
		t.Fatalf("second node after the false positive = %+v", r)
	}
	if n := p2.cache.Load().len(); n != before {
		t.Fatalf("a lookup right after verdict.changed stored what it read: %d -> %d entries", before, n)
	}
}

// A review tombstones the keys it changes before it writes any of them, so
// nothing a run stores during the review comes into memory, and the run's
// write, which waits for the review, leaves the keys alone after it: the
// tombstones last tombstoneTTL from the end of the review.
func TestReviewTombstonesBeforeItWrites(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	var clock atomic.Int64 // stands still: the tombstones are measured on it
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv), withClock(&clock))
	scope := flowScope(p, openAIFlow(t, h, mod.srv.URL))
	rec, hit, held := recordedHit(t, p, h, scope, "order", "MOD-HIT-sexual reviewed while a run stores it")
	hitKey, segKey := hit.hitKey, hit.segKeys[0]

	// The review is held at its first write: its keys are tombstoned by then,
	// without an end, and what a run stores now stays out.
	entered := kv.hold(func(key string) bool { return key == hitKey })
	defer kv.open()
	out := reviewAsync(h, ReviewPending, rec.ID)
	within(t, "the first write of the review", entered)
	cache := p.cache.Load()
	if far := p.now().Add(24 * time.Hour); !cache.tombstoned(hitKey, far) || !cache.tombstoned(segKey, far) {
		t.Fatal("the review writes before it tombstoned its keys")
	}
	again := held
	again.At = p.now().Unix()
	p.storeVerdicts(scope, hit.segs, []storedHit{again}, p.now().Unix(), p.cfg.Load().cacheTTL, askNow(p))
	if v := p.lookupVerdicts(context.Background(), scope, hit.segs, false); v.hit != nil || len(v.passed) != 0 {
		t.Fatalf("a run stored %+v during the review", v)
	}
	kv.open()
	if _, synced := reviewAnswer(t, within(t, "the review", out)); synced != 1 {
		t.Fatalf("review: cache synced for %d", synced)
	}
	// The write of the run had to wait for the review, and found the keys
	// tombstoned: for tombstoneTTL from the end of the review.
	written(t, p)
	if n := kvCount(t, fh, ""); n != 0 {
		t.Fatalf("%d keys left after the review", n)
	}
	if v := p.lookupVerdicts(context.Background(), scope, hit.segs, false); v.hit != nil || len(v.passed) != 0 {
		t.Fatalf("the run that waited for the review stored %+v", v)
	}
	if end := p.now().Add(tombstoneTTL); !cache.tombstoned(hitKey, end.Add(-time.Nanosecond)) || cache.tombstoned(hitKey, end) {
		t.Fatal("the tombstones of a finished review do not last tombstoneTTL")
	}
}

// A review has no time limit of its own: it waits for its turn at its keys as
// long as its request does. When the request ends first, nothing of the
// review reaches the KV, the record does not count as synced and no kv error
// is counted; its tombstones last tombstoneTTL from then.
func TestReviewEndsWithItsRequest(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	var clock atomic.Int64 // stands still: the tombstones are measured on it
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv), withClock(&clock))
	scope := flowScope(p, openAIFlow(t, h, mod.srv.URL))
	rec, hit, _ := recordedHit(t, p, h, scope, "caller", "MOD-HIT-sexual reviewed by a caller that leaves")
	hitKey := hit.hitKey
	kv.counts()
	errs := p.stats.kvErrors.Load()
	// A write of a run has the turn at the hit entry.
	unlock, err := p.kvLock(context.Background(), []string{hitKey})
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	synced := make(chan int, 1)
	go func() { synced <- p.syncReviewed(ctx, []int64{rec.ID}, ReviewPending) }()
	// The review has tombstoned its keys and waits.
	waitFor(t, "the review to reach the cache", func() bool { return p.cache.Load().tombstoned(hitKey, p.now()) })
	select {
	case n := <-synced:
		t.Fatalf("the review did not wait for its turn (synced %d)", n)
	case <-time.After(100 * time.Millisecond): // it waits; a longer look would say no more
	}
	cancel()
	if n := within(t, "the review whose request ended", synced); n != 0 {
		t.Fatalf("a review whose request ended synced %d records", n)
	}
	unlock()
	if writes := kv.counts(); len(writes) != 0 || p.stats.kvErrors.Load() != errs {
		t.Fatalf("a review whose request ended wrote %v (%d kv errors)", writes, p.stats.kvErrors.Load()-errs)
	}
	if _, found := kvValue(t, fh, hitKey); !found {
		t.Fatal("the hit is gone although the review was not synced")
	}
	if end := p.now().Add(tombstoneTTL); !p.cache.Load().tombstoned(hitKey, end.Add(-time.Nanosecond)) || p.cache.Load().tombstoned(hitKey, end) {
		t.Fatal("the tombstones of a review that gave up do not last tombstoneTTL")
	}
}

// A run brings nothing back that a review changed after the run's request
// asked the cache - however long the run judged, waited for its turn at the
// keys or for the KV: a write can outlast the tombstones of a review, and
// the reading of its request is what keeps it out then. What a request that
// asks after the review decides is stored as before.
func TestReviewIsNotUndoneByWritesThatOutlastItsTombstones(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	var clock atomic.Int64
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv), withClock(&clock))
	scope := flowScope(p, openAIFlow(t, h, mod.srv.URL))
	ctx := context.Background()
	ttl := p.cfg.Load().cacheTTL
	// stayed checks what the review left: no hit entry, a pass and no pointer
	// under the segment key, in the KV and for a lookup of either kind.
	stayed := func(name string, hit cachedHit) {
		t.Helper()
		seg, segKey := hit.segs[0], hit.segKeys[0]
		_, hitBack := kvValue(t, fh, hit.hitKey)
		val, _ := kvValue(t, fh, segKey)
		v := parseSeg(val)
		viaKV := p.lookupVerdicts(ctx, scope, hit.segs, true)
		p.cache.Load().forget([]string{segKey, hit.hitKey})
		fresh := p.lookupVerdicts(ctx, scope, hit.segs, true)
		if hitBack || v.pass == 0 || len(v.hits) != 0 || viaKV.hit != nil || fresh.hit != nil || !fresh.passed[seg] {
			t.Fatalf("%s: the hit reviewed as a false positive is back: entry in the KV %v, segment key %q, lookup hit %v, lookup from the KV alone hit %v passed %v",
				name, hitBack, val, viaKV.hit != nil, fresh.hit != nil, fresh.passed[seg])
		}
	}
	falsePositive := func(name string, out <-chan *pluginv1.HTTPResponse) {
		t.Helper()
		if _, synced := reviewAnswer(t, within(t, "the review", out)); synced != 1 {
			t.Fatalf("%s: review: cache synced for %d", name, synced)
		}
	}
	// again is the hit of a run that judged the same content a hit once more.
	again := func(held storedHit) []storedHit {
		held.At = p.now().Unix()
		return []storedHit{held}
	}

	// 1. The write of a run waits for its turn behind the review, and the
	// KV's answer to its read comes after the tombstones of the review ended.
	rec, hit, held := recordedHit(t, p, h, scope, "slow", "MOD-HIT-sexual outlasting slow")
	hitKey, segKey := hit.hitKey, hit.segKeys[0]
	entered := kv.hold(func(key string) bool { return key == hitKey })
	defer kv.open()
	out := reviewAsync(h, ReviewFalsePositive, rec.ID) // held at its first write: it has the turn
	within(t, "the first write of the review", entered)
	p.storeVerdicts(scope, nil, again(held), p.now().Unix(), ttl, askNow(p))
	read := kv.holdRead(func(key string) bool { return key == segKey })
	kv.release() // the review goes on
	within(t, "the review's read of the segment key", read)
	kv.release() // it writes, gives its tombstones their time and ends its turn
	falsePositive("slow", out)
	within(t, "the read of the write that waited", read)
	clock.Add(int64(tombstoneTTL + time.Second)) // the KV takes that long to answer it
	if p.cache.Load().tombstoned(hitKey, p.now()) || p.cache.Load().tombstoned(segKey, p.now()) {
		t.Fatal("the tombstones of the review have not ended")
	}
	kv.open()
	written(t, p)
	stayed("a write whose read outlasted the tombstones", hit)

	// 2. The run judges across the whole review and its tombstones: its
	// request asked the cache before the review, and it hands its hit over
	// after the tombstones ended.
	rec, hit, held = recordedHit(t, p, h, scope, "long", "MOD-HIT-sexual outlasting long")
	before := askNow(p)
	falsePositive("long", reviewAsync(h, ReviewFalsePositive, rec.ID))
	clock.Add(int64(tombstoneTTL + time.Second))
	p.storeVerdicts(scope, nil, again(held), p.now().Unix(), ttl, before)
	written(t, p)
	stayed("a run that judged across the review", hit)

	if n := p.stats.kvSkipped.Load(); n != 2 {
		t.Fatalf("kv_skipped = %d after two runs that wrote nothing, want 2", n)
	}

	// 3. The memory cache is replaced between the review and the write
	// (cache_entries changed): the tombstones of the review went with the old
	// cache, at once. The run's reading is of the old cache, and it writes
	// nothing.
	rec, hit, held = recordedHit(t, p, h, scope, "swapped", "MOD-HIT-sexual outlasting swapped")
	before = askNow(p)
	falsePositive("swapped", reviewAsync(h, ReviewFalsePositive, rec.ID))
	emptyMemory(p)
	p.storeVerdicts(scope, nil, again(held), p.now().Unix(), ttl, before)
	written(t, p)
	stayed("a run whose memory cache was replaced after the review", hit)
	if n := p.stats.kvSkipped.Load(); n != 3 {
		t.Fatalf("kv_skipped = %d, want 3", n)
	}

	// A request that asks the cache now, after the review, and whose run
	// hits: that is a verdict of its own, and it is stored.
	p.storeVerdicts(scope, nil, again(held), p.now().Unix(), ttl, askNow(p))
	written(t, p)
	if _, found := kvValue(t, fh, hit.hitKey); !found || p.lookupVerdicts(ctx, scope, hit.segs, true).hit == nil {
		t.Fatal("the hit of a run whose request asked after the review was not stored")
	}
}

// A run that is under way while its content is reviewed - its request asked
// the cache before the review, its auditor answers after the tombstones of
// the review ended - does not bring the reviewed hit back, through the hook
// and all: its own request is refused by its own verdict, nothing of it is
// cached (kv_skipped), and the next request gets the admin's answer.
func TestRunAcrossAReviewDoesNotUndoIt(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	var clock atomic.Int64
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv), withClock(&clock))
	scope := flowScope(p, openAIFlow(t, h, mod.srv.URL))
	const text = "MOD-HIT-sexual judged across a review"
	// The first request is refused; its hit is on its way to the KV.
	entered := kv.hold(func(string) bool { return true })
	defer kv.open()
	if r := hookNow(t, h, hookReqAs(3, "first", text)); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	within(t, "the write of the first run", entered)
	// The same content again, before the cache knows it: a run of its own,
	// whose auditor takes its time.
	arrived, release := mod.hold(t)
	second := hookAsync(h, hookReqAs(3, "second", text))
	within(t, "the upstream call of the second run", arrived)
	// The first hit lands, and an admin reviews it as a false positive.
	kv.open()
	written(t, p)
	rec := recordOf(t, h, "first")
	hit := hitOf(t, scope, rec)
	hitKey, segKey := hit.hitKey, hit.segKeys[0]
	if _, found := kvValue(t, fh, hitKey); !found {
		t.Fatal("the first hit is not in the KV")
	}
	if _, synced := review(t, h, ReviewFalsePositive, rec.ID); synced != 1 {
		t.Fatalf("review: cache synced for %d", synced)
	}
	// The auditor of the second run answers after the tombstones ended.
	clock.Add(int64(tombstoneTTL + time.Second))
	release()
	if r := within(t, "the second request", second); !denied(r) || replayed(r) {
		t.Fatalf("second = %+v", r)
	}
	written(t, p)
	if n := p.stats.kvSkipped.Load(); n != 1 {
		t.Fatalf("kv_skipped = %d after the run that judged across the review, want 1", n)
	}
	val, _ := kvValue(t, fh, segKey)
	if _, back := kvValue(t, fh, hitKey); back || parseSeg(val).pass == 0 || len(parseSeg(val).hits) != 0 {
		t.Fatalf("the run that judged across the review wrote: entry in the KV %v, segment key %q", back, val)
	}
	calls := mod.count("/v1/moderations")
	if r := mustHook(t, h, hookReqAs(3, "third", text)); denied(r) || r.GetNote() != cachedPass || mod.count("/v1/moderations") != calls {
		t.Fatalf("after the review = %+v (%d upstream calls)", r, mod.count("/v1/moderations")-calls)
	}
}

// The node that stores a hit knows it afterwards, also when a review on
// another node came while the hit was on its way to the KV: the values go into
// memory by a reading of the write itself. (By the reading of the request's
// lookup, a run of 5 s with any review in it would be refused there, and
// memory would keep the passes of A and of B it had: the node would answer {A,
// B} as passed while the KV holds the hit, and nothing would correct it.) When
// even the reading of the write has lapsed - the write took longer than a
// tombstone lasts, with a review in it - the keys leave memory instead:
// unknown to a lookup of memory alone, read from the KV by the others.
func TestStoredHitIsKnownOnItsNode(t *testing.T) {
	for _, tc := range []struct {
		name string
		slow time.Duration // how long the KV takes for the write of the hit entry
	}{
		{"a review while the hit is written", 0},
		{"a review while a write that outlasts the tombstones is under way", tombstoneTTL + time.Second},
	} {
		kv := &kvFake{}
		var clock atomic.Int64
		p, _, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv), withClock(&clock))
		const scope = "e0:1:fp"
		ctx := context.Background()
		cfg := p.cfg.Load()
		a, b := sha256.Sum256([]byte("part a of "+tc.name)), sha256.Sum256([]byte("part b of "+tc.name))
		keys := [][32]byte{a, b}
		// The request of {a, b} asks the cache, which knows nothing, and its
		// run judges for 5 s. Meanwhile a and b pass one by one elsewhere.
		first := p.lookupVerdicts(ctx, scope, keys, true)
		if first.hit != nil || len(first.passed) != 0 {
			t.Fatalf("%s: cold lookup = %+v", tc.name, first)
		}
		p.storeVerdicts(scope, [][32]byte{a}, nil, p.now().Unix(), cfg.cacheTTL, askNow(p))
		p.storeVerdicts(scope, [][32]byte{b}, nil, p.now().Unix(), cfg.cacheTTL, askNow(p))
		written(t, p)
		if v := p.lookupVerdicts(ctx, scope, keys, false); len(v.passed) != 2 {
			t.Fatalf("%s: the passes of the parts are not in memory: %+v", tc.name, v)
		}
		clock.Add(int64(5 * time.Second))
		hit := newStoredHit("r1", hexKeys(keys), Trace{Final: Hit}, p.now().Unix())
		hitKey := hitKeyOf(scope, hitIDOf(hit.Keys))
		entered := kv.hold(func(key string) bool { return key == hitKey })
		p.storeVerdicts(scope, nil, []storedHit{hit}, p.now().Unix(), cfg.cacheTTL, first.asked)
		within(t, "the write of the hit entry", entered)
		// The review of some other record on another node: its broadcast.
		payload, _ := json.Marshal(verdictChanged{Keys: []string{segKeyHex(scope, "unrelated")}})
		if err := p.onVerdictChanged(ctx, pluginsdk.Broadcast{Payload: payload}); err != nil {
			t.Fatal(err)
		}
		clock.Add(int64(tc.slow))
		kv.open()
		written(t, p)
		if _, found := kvValue(t, fh, hitKey); !found || p.stats.kvSkipped.Load() != 0 {
			t.Fatalf("%s: the hit is not in the KV (found %v, %d writes skipped)", tc.name, found, p.stats.kvSkipped.Load())
		}
		fromMemory := p.lookupVerdicts(ctx, scope, keys, false)
		if tc.slow == 0 {
			if fromMemory.hit == nil {
				t.Fatalf("%s: memory of the node that stored the hit = %+v", tc.name, fromMemory)
			}
		} else if fromMemory.hit != nil || len(fromMemory.passed) != 0 {
			t.Fatalf("%s: memory kept or took values a review may have changed: %+v", tc.name, fromMemory)
		}
		if v := p.lookupVerdicts(ctx, scope, keys, true); v.hit == nil {
			t.Fatalf("%s: the node that stored the hit of {a, b} answers it as %d passes", tc.name, len(v.passed))
		}
	}
}

// A post job queued before the cache was cleared is not answered from the
// cleared cache, and its verdict is stored under the new counter. (It asks the
// cache under the new counter when its turn comes, which knows nothing of the
// content here; TestQueuedJobAfterClearSeesAReview is the case where it does.)
func TestQueuedJobAfterClear(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve})
	flow := openAIFlow(t, h, mod.srv.URL)
	const text = "MOD-HIT-violence epoch"
	mustHook(t, h, hookReqAs(3, "e0", text))
	recordOf(t, h, "e0") // its job has run
	written(t, p)
	if n := kvCount(t, fh, "h:e0:"); n != 1 {
		t.Fatalf("%d hit entries before the clear", n)
	}
	// A job as the hook queues it on a node whose memory does not know the
	// hit (the worker would find it in the KV).
	emptyMemory(p)
	m := queuedJob(t, p, flow, hookReqAs(6, "queued", text))
	if got := clearCache(t, h); got != 1 {
		t.Fatalf("clear = %d", got)
	}
	calls := mod.count("/v1/moderations")
	p.runPost(m)
	if n := mod.count("/v1/moderations"); n != calls+1 {
		t.Fatalf("the queued job did not run after the clear: calls %d -> %d", calls, n)
	}
	if ev := recordOf(t, h, "queued"); ev.Replayed || ev.Result != ResultHit {
		t.Fatalf("record of the queued job = %+v", ev.Event)
	}
	// Its hit is cached under the counter of now.
	if r := mustHook(t, h, hookReqAs(7, "after", text)); r.GetNote() != notePrefix+"hit (replay)" || mod.count("/v1/moderations") != calls+1 {
		t.Fatalf("after the clear = %+v, calls %d", r, mod.count("/v1/moderations"))
	}
	if n := kvCount(t, fh, "h:e1:"); n != 1 {
		t.Fatalf("%d hit entries under the new counter", n)
	}
}

// A job queued before a clear asks the cache under the counter of now when
// its turn comes: what was decided about its content since the clear - here
// a hit another request got, which an admin reviewed as a false positive -
// answers it. (Were the lookup skipped, the job would run with a reading
// taken after the review and write the reviewed hit back.)
func TestQueuedJobAfterClearSeesAReview(t *testing.T) {
	mod := newFakeMod(t)
	var clock atomic.Int64
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve}, withClock(&clock))
	flow := openAIFlow(t, h, mod.srv.URL)
	const text = "MOD-HIT-violence queued across a clear and a review"
	m := queuedJob(t, p, flow, hookReqAs(6, "queued", text))
	if got := clearCache(t, h); got != 1 {
		t.Fatalf("clear = %d", got)
	}
	waitFor(t, "the snapshot of the new counter", func() bool { return p.snap.Load().cacheEpoch == 1 })
	// Another request with the same content, under the new counter: a hit,
	// which an admin reviews as a false positive.
	mustHook(t, h, hookReqAs(3, "other", text))
	rec := recordOf(t, h, "other")
	written(t, p)
	scope := flowScope(p, flow) // under the new counter
	hit := hitOf(t, scope, rec)
	seg, hitKey, segKey := hit.segs[0], hit.hitKey, hit.segKeys[0]
	if _, synced := review(t, h, ReviewFalsePositive, rec.ID); synced != 1 {
		t.Fatalf("review: cache synced for %d", synced)
	}
	clock.Add(int64(tombstoneTTL + time.Second))
	// The queued job has its turn: answered by the admin's pass, no run.
	calls := mod.count("/v1/moderations")
	p.runPost(m)
	written(t, p)
	_, back := kvValue(t, fh, hitKey)
	val, _ := kvValue(t, fh, segKey)
	v := p.lookupVerdicts(context.Background(), scope, hit.segs, true)
	if n := mod.count("/v1/moderations") - calls; n != 0 || back || parseSeg(val).pass == 0 || len(parseSeg(val).hits) != 0 || v.hit != nil || !v.passed[seg] {
		t.Fatalf("the queued job after the clear and the review: %d upstream calls, hit entry in the KV %v, segment key %q, lookup hit %v passed %v",
			n, back, val, v.hit != nil, v.passed[seg])
	}
}

// A queued job asks the cache again when its turn comes, and stores its
// verdicts by that reading: a review on the node while the job waited in the
// queue - of other content - does not keep its verdicts out of the cache.
func TestQueuedJobStoresByItsLastLookup(t *testing.T) {
	mod := newFakeMod(t)
	var clock atomic.Int64
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve}, withClock(&clock))
	flow := openAIFlow(t, h, mod.srv.URL)
	m := queuedJob(t, p, flow, hookReqAs(6, "queued", "a clean text that waits in the queue"))
	// While it waits: the broadcast of a review of something else, and more
	// time than a tombstone lasts.
	payload, _ := json.Marshal(verdictChanged{Keys: []string{segKeyHex(flowScope(p, flow), "unrelated")}})
	if err := p.onVerdictChanged(context.Background(), pluginsdk.Broadcast{Payload: payload}); err != nil {
		t.Fatal(err)
	}
	clock.Add(int64(tombstoneTTL + time.Second))
	p.runPost(m)
	written(t, p)
	if n := kvCount(t, fh, "s:"); n == 0 || p.cache.Load().len() != n || p.stats.kvSkipped.Load() != 0 {
		t.Fatalf("the verdicts of the queued job: %d keys in the KV, %d entries in memory, %d writes skipped", n, p.cache.Load().len(), p.stats.kvSkipped.Load())
	}
}

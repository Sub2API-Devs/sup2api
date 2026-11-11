package moderation

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// The verdict cache and the KV: lookups, the writes of the runs, failures.

// The KV is read, written and deleted in batch calls, as many as the keys
// need. A call that fails counts one kv error, whatever number of keys it
// had; a read makes the calls after it, a write stops. A call that did not
// finish because its context ended - the caller left, the node stops - counts
// nothing, and no call is made after the end.
func TestKVCallsCountFailuresNotEndedContexts(t *testing.T) {
	kv := &kvFake{}
	p, _, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	ctx := context.Background()
	const n = 2*kvSegUnit + 176 // three calls
	keys := make([]string, n)
	items := make([]pluginsdk.KVItem, n)
	for i := range keys {
		keys[i] = fmt.Sprintf("s:test:%04d", i)
		items[i] = pluginsdk.KVItem{Key: keys[i], Value: fmt.Appendf(nil, "value %d", i), TTL: time.Hour}
	}
	counted := func() [2]int64 { return [2]int64{kv.calls.Swap(0), p.stats.kvErrors.Swap(0)} }
	counted()
	allRead := func(got []pluginsdk.KVValue, read []bool, from, to int) bool {
		for i := from; i < to; i++ {
			if !read[i] || !got[i].Found || string(got[i].Value) != fmt.Sprintf("value %d", i) {
				return false
			}
		}
		return true
	}

	// Everything is written and read, in three calls each; nothing counts.
	if done, err := p.kvWrite(ctx, items); done != n || err != nil || counted() != [2]int64{3, 0} {
		t.Fatalf("write of %d items: %d done, %v", n, done, err)
	}
	if got, read := p.kvRead(ctx, keys, kvSegUnit); !allRead(got, read, 0, n) || counted() != [2]int64{3, 0} {
		t.Fatal("a complete read")
	}
	if got, read := p.kvRead(ctx, []string{"s:test:absent"}, kvSegUnit); !read[0] || got[0].Found || counted() != [2]int64{1, 0} {
		t.Fatal("the read of a key that is not there")
	}

	// The caller leaves during the first call: what was not read is unknown,
	// no further call is made, and it is no kv error.
	kv.delay.Store(int64(time.Minute))
	gone, cancel := context.WithCancel(ctx)
	defer cancel()
	left := make(chan struct{})
	go func() { // leaves once the call is under way, or with the test
		defer close(left)
		for kv.calls.Load() == 0 && gone.Err() == nil {
			time.Sleep(time.Millisecond)
		}
		cancel()
	}()
	began := time.Now()
	if _, read := p.kvRead(gone, keys, kvSegUnit); slices.Contains(read, true) || counted() != [2]int64{1, 0} {
		t.Fatal("a read whose caller left")
	}
	if took := time.Since(began); took > 10*time.Second {
		t.Fatalf("a read whose caller left took %v", took)
	}
	<-left
	// A caller that has left: no call at all.
	if _, read := p.kvRead(gone, keys, kvSegUnit); slices.Contains(read, true) {
		t.Fatal("a read after its caller left")
	}
	if done, err := p.kvWrite(gone, items); done != 0 || !errors.Is(err, context.Canceled) {
		t.Fatalf("a write after its caller left: %d done, %v", done, err)
	}
	if done, err := p.kvDelete(gone, keys); done != 0 || !errors.Is(err, context.Canceled) || counted() != [2]int64{0, 0} {
		t.Fatalf("a delete after its caller left: %d done, %v", done, err)
	}
	kv.delay.Store(0)

	// The KV fails: one kv error for every call. A read makes all its calls,
	// a write and a delete stop at the first.
	kv.fail.Store(true)
	if _, read := p.kvRead(ctx, keys, kvSegUnit); slices.Contains(read, true) || counted() != [2]int64{3, 3} {
		t.Fatal("a read while the KV fails")
	}
	if done, err := p.kvWrite(ctx, items); done != 0 || !errors.Is(err, errKVDown) || counted() != [2]int64{1, 1} {
		t.Fatalf("a write while the KV fails: %d done, %v", done, err)
	}
	if done, err := p.kvDelete(ctx, keys); done != 0 || !errors.Is(err, errKVDown) || counted() != [2]int64{1, 1} {
		t.Fatalf("a delete while the KV fails: %d done, %v", done, err)
	}
	kv.fail.Store(false)
	// Only the second call fails: its keys are unknown, the others are read.
	second := fmt.Sprintf("s:test:%04d", kvSegUnit)
	kv.noRead.Store(&second)
	got, read := p.kvRead(ctx, keys, kvSegUnit)
	if !allRead(got, read, 0, kvSegUnit) || slices.Contains(read[kvSegUnit:2*kvSegUnit], true) || !allRead(got, read, 2*kvSegUnit, n) || counted() != [2]int64{3, 1} {
		t.Fatal("a read whose second call failed")
	}
	kv.noRead.Store(nil)

	// A write is cut where a call would exceed the bytes of a batch call: 100
	// values of 60 KiB are 6 MB, two calls of 3 MiB. They are read 48 at a
	// time, which always fits into an answer: three calls.
	big := make([]pluginsdk.KVItem, 100)
	bigKeys := make([]string, len(big))
	for i := range big {
		bigKeys[i] = fmt.Sprintf("h:test:%04d", i)
		big[i] = pluginsdk.KVItem{Key: bigKeys[i], Value: bytes.Repeat([]byte{'x'}, maxHitBytes), TTL: time.Hour}
	}
	if done, err := p.kvWrite(ctx, big); done != len(big) || err != nil || counted() != [2]int64{2, 0} {
		t.Fatalf("write of %d large values: %d done, %v", len(big), done, err)
	}
	if got, read := p.kvRead(ctx, bigKeys, kvHitUnit); slices.Contains(read, false) || len(got[99].Value) != maxHitBytes || counted() != [2]int64{3, 0} {
		t.Fatal("the read of large values, as many per call as always fit")
	}

	// Deleted in batch calls too.
	if done, err := p.kvDelete(ctx, append(keys, bigKeys...)); done != n+len(big) || err != nil || counted() != [2]int64{3, 0} {
		t.Fatalf("delete: %d done, %v", done, err)
	}
	if left := kvCount(t, fh, ""); left != 0 {
		t.Fatalf("%d keys left after the delete", left)
	}
}

// This node's changes of a cache key in the KV take turns: a change holds
// the key from its read to the value in memory, so the next one starts from
// what it wrote - neither edit is lost, and memory ends with what the KV
// holds. A change whose caller left while it waited is not made.
func TestKVChangesOfAKeyTakeTurns(t *testing.T) {
	kv := &kvFake{}
	p, _, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	ctx := context.Background()
	c := p.cfg.Load()
	const scope = "e0:1:fp"
	seg := sha256.Sum256([]byte("a segment two runs decide about"))
	key := segKeyOf(scope, seg)
	at := time.Now().Unix()
	hit := storedHit{RequestID: "r", Keys: hexKeys([][32]byte{seg}), Trace: Trace{Final: Hit, Decider: 0}, At: at}
	id := hitIDOf(hit.Keys)
	// turn asks for a turn at a key and gives it back; within is how long it
	// waits for it.
	turn := func(k string, within time.Duration) error {
		limited, cancel := context.WithTimeout(ctx, within)
		defer cancel()
		unlock, err := p.kvLock(limited, []string{k})
		if err == nil {
			unlock()
		}
		return err
	}
	// held: nobody else gets a turn at the key - a short look, the key is
	// expected to be held. free: a turn is to be had - with time to spare, so
	// that a slow machine does not make a free key look held.
	held := func(k string) bool { return turn(k, 50*time.Millisecond) != nil }
	free := func(k string) bool { return turn(k, 5*time.Second) == nil }

	// The first run stores a hit of the segment; its write of the segment key
	// is held.
	entered := kv.hold(func(k string) bool { return k == key })
	defer kv.open()
	p.storeVerdicts(scope, nil, []storedHit{hit}, p.now().Unix(), c.cacheTTL, askNow(p))
	within(t, "the write of the first change", entered) // it has read the key and is about to write it
	if !held(key) {
		t.Fatal("a change does not hold its key while it writes")
	}
	// The second run stores a pass of the segment: it waits, and asks the KV
	// nothing meanwhile.
	asked := kv.calls.Load()
	p.storeVerdicts(scope, [][32]byte{seg}, nil, p.now().Unix(), c.cacheTTL, askNow(p))
	time.Sleep(100 * time.Millisecond) // it waits; a longer look would say no more
	if n := kv.calls.Load() - asked; n != 0 || p.stats.kvWriting.Load() != 2 {
		t.Fatalf("the second change did not wait for the first: %d KV calls, %d writes under way", n, p.stats.kvWriting.Load())
	}
	kv.release()
	within(t, "the write of the second change", entered)
	kv.open()
	written(t, p)
	// Both edits are there: the second read what the first wrote. And memory
	// holds what the KV holds.
	inKV, _ := kvValue(t, fh, key)
	if v := parseSeg(inKV); v.pass == 0 || len(v.hits) != 1 || v.hits[0] != (hitRef{id, at}) {
		t.Fatalf("value after both changes = %s", inKV)
	}
	if inMemory := memoryValue(p, key); !bytes.Equal(inMemory, inKV) {
		t.Fatalf("memory holds %q, the KV %q", inMemory, inKV)
	}
	if !free(key) {
		t.Fatal("the key is still held after both changes")
	}

	// The caller of a change leaves while it waits for its turn: no KV call,
	// no kv error, and nothing stays held.
	other := segKeyOf(scope, sha256.Sum256([]byte("another segment")))
	for i := 0; kvStripe(other) == kvStripe(key); i++ {
		other = segKeyOf(scope, sha256.Sum256(fmt.Appendf(nil, "another segment %d", i)))
	}
	unlock, err := p.kvLock(ctx, []string{key})
	if err != nil {
		t.Fatal(err)
	}
	asked, errs := kv.calls.Load(), p.stats.kvErrors.Load()
	waited, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	go func() {
		defer close(done)
		p.writeVerdicts(waited, &verdictWrite{ttl: c.cacheTTL, passes: []string{key, other}, at: at})
	}()
	time.AfterFunc(50*time.Millisecond, cancel)
	within(t, "the change that waited", done)
	unlock()
	if n := kv.calls.Load() - asked; n != 0 || p.stats.kvErrors.Load() != errs {
		t.Fatalf("a change whose caller left made %d KV calls and counted %d kv errors", n, p.stats.kvErrors.Load()-errs)
	}
	for _, k := range []string{key, other} {
		if !free(k) {
			t.Fatalf("%s is still held after a change that gave up", k)
		}
	}
	// A turn asked for by a caller that has left is not given.
	if _, err := p.kvLock(waited, []string{key}); !errors.Is(err, context.Canceled) || !free(key) {
		t.Fatalf("a turn for a caller that left = %v", err)
	}
}

// While the KV fails, content is moderated again: a cached pass is not
// trusted and a cached hit is not replayed, and what the runs decide meanwhile
// is cached nowhere. The failures count as kv errors.
func TestKVFailureAuditsAgain(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	fail := &kv.fail
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	openAIFlow(t, h, mod.srv.URL)
	calls := func() int64 { return mod.count("/v1/moderations") }
	const hit, clean = "MOD-HIT-sexual kv", "a clean text for the kv"
	if r := mustHook(t, h, hookReq(hit)); !denied(r) {
		t.Fatalf("hit = %+v", r)
	}
	if r := mustHook(t, h, hookReq(clean)); denied(r) {
		t.Fatalf("clean = %+v", r)
	}

	// Only the KV knows the verdicts, and it fails.
	emptyMemory(p)
	fail.Store(true)
	errs := p.stats.kvErrors.Load()
	if r := mustHook(t, h, hookReq(hit)); !denied(r) || replayed(r) || calls() != 3 {
		t.Fatalf("hit while the KV fails = %+v, calls %d", r, calls())
	}
	if r := mustHook(t, h, hookReq(clean)); denied(r) || r.GetNote() == cachedPass || calls() != 4 {
		t.Fatalf("clean while the KV fails = %+v, calls %d", r, calls())
	}
	// Each request: the lookup that failed and the write that failed.
	if n := p.stats.kvErrors.Load() - errs; n != 4 {
		t.Fatalf("a failing KV counted %d kv errors", n)
	}
	// Nothing of those runs is in memory: the same content is moderated again
	// while the KV fails, every time.
	if n := p.cache.Load().len(); n != 0 {
		t.Fatalf("%d entries in memory of runs whose verdicts the KV did not take", n)
	}
	if r := mustHook(t, h, hookReq(clean)); denied(r) || r.GetNote() == cachedPass || calls() != 5 {
		t.Fatalf("clean again while the KV fails = %+v, calls %d", r, calls())
	}
	// Back up: the KV still holds both verdicts.
	fail.Store(false)
	emptyMemory(p)
	if r := mustHook(t, h, hookReq(hit)); !denied(r) || !replayed(r) || calls() != 5 {
		t.Fatalf("hit after the KV is back = %+v, calls %d", r, calls())
	}
	if r := mustHook(t, h, hookReq(clean)); r.GetNote() != cachedPass || calls() != 5 {
		t.Fatalf("clean after the KV is back = %+v, calls %d", r, calls())
	}
}

// A value loaded from the KV keeps the time of its write in memory instead of
// a fresh TTL, and a part older than the TTL is not used.
func TestKVValueKeepsItsWriteTime(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flow := openAIFlow(t, h, mod.srv.URL)
	scope, ttl := flowScope(p, flow), p.cfg.Load().cacheTTL
	now := time.Now()
	set := func(key [32]byte, val string) {
		t.Helper()
		if _, err := fh.KVSet(context.Background(), &pluginv1.KVSetRequest{Namespace: kvNamespace, Key: segKeyOf(scope, key), Value: []byte(val)}); err != nil {
			t.Fatal(err)
		}
	}
	old, expired, legacyPass, legacyHit := [32]byte{1}, [32]byte{2}, [32]byte{3}, [32]byte{4}
	written := now.Add(time.Hour - ttl).Unix() // an hour left
	set(old, fmt.Sprintf("p%d", written))
	set(expired, fmt.Sprintf("p%d", now.Add(-ttl-time.Minute).Unix()))
	set(legacyPass, "p")
	set(legacyHit, "h"+strings.Repeat("ab", 32))
	keys := [][32]byte{old, expired, legacyPass, legacyHit}
	v := p.lookupVerdicts(context.Background(), scope, keys, true)
	if len(v.passed) != 1 || !v.passed[old] || v.hit != nil {
		t.Fatalf("verdicts = %+v", v)
	}
	cache := p.cache.Load()
	el := cache.items[segKeyOf(scope, old)]
	if el == nil || cache.len() != 1 {
		t.Fatalf("memory holds %d entries", cache.len())
	}
	if exp := el.Value.(*cacheEntry).expires; !exp.Equal(time.Unix(written, 0).Add(ttl)) {
		t.Fatalf("memory expiry = %v, want the write time %v plus the TTL (now %v)", exp, time.Unix(written, 0), now)
	}
	// From memory alone it is the same pass, and gone an hour later.
	if v := p.lookupVerdicts(context.Background(), scope, keys, false); len(v.passed) != 1 || !v.passed[old] {
		t.Fatalf("from memory = %+v", v)
	}
	if _, ok := cache.getSeg(segKeyOf(scope, old), now.Add(time.Hour+time.Second)); ok {
		t.Fatal("the pass outlived the TTL of its write")
	}
}

// The lookup of content a node sees for the first time reads every segment
// from the KV, however many they are, in batch calls of 512 keys - one call
// for 150 segments, three for 1200 - and nothing the KV knows as passed is
// moderated. The run that stored the passes wrote all of them, in as many
// calls.
func TestLookupReadsEverySegment(t *testing.T) {
	for _, segments := range []int{150, 1200} {
		t.Run(fmt.Sprint(segments, " segments"), func(t *testing.T) {
			mod := newFakeMod(t)
			// One chunk, whatever the number of segments.
			cfg := map[string]any{"mode": ModeEnforce, "input_max_chars": 100000}
			p1, h1, fh := startDB(t, nil, cfg)
			openAIFlow(t, h1, mod.srv.URL)
			calls := (segments + kvSegUnit - 1) / kvSegUnit
			body := longRequest(segments)
			// Another node moderates the request: its lookup reads every key
			// (none is there), and its run writes every pass - read, merge,
			// write, each in the same number of calls.
			before := fh.KVCalls()
			if r := mustHook(t, h1, rawReq(3, "", protoAnthropic, body)); denied(r) || r.GetNote() == cachedPass {
				t.Fatalf("on the first node = %+v", r)
			}
			if got := kvCallsSince(fh, before); len(got) != 2 || got["KVGetMany"] != 2*calls || got["KVSetMany"] != calls {
				t.Fatalf("KV calls of the first node = %v, want %d reads for the lookup, %d for the write and %d writes", got, calls, calls, calls)
			}
			if n := kvCount(t, fh, "s:"); n != segments || p1.cache.Load().len() != segments {
				t.Fatalf("%d segment keys in the KV, %d entries in the memory of the node that wrote them, want %d", n, p1.cache.Load().len(), segments)
			}
			upstream := len(mod.moderated())

			// This node sees the request for the first time.
			p, h := secondNode(t, fh, cfg)
			before = fh.KVCalls()
			errs := p.stats.kvErrors.Load()
			if r := mustHook(t, h, rawReq(4, "", protoAnthropic, body)); r.GetNote() != cachedPass {
				t.Fatalf("on the node that sees the request for the first time = %+v", r)
			}
			if got := kvCallsSince(fh, before); len(got) != 1 || got["KVGetMany"] != calls {
				t.Fatalf("KV calls of the lookup = %v, want %d KVGetMany", got, calls)
			}
			if n := len(mod.moderated()); n != upstream || p.stats.kvErrors.Load() != errs || p.cache.Load().len() != segments {
				t.Fatalf("%d upstream calls, %d kv errors, %d entries in memory", n-upstream, p.stats.kvErrors.Load()-errs, p.cache.Load().len())
			}
			// And again: from memory, without a call.
			before = fh.KVCalls()
			if r := mustHook(t, h, rawReq(4, "", protoAnthropic, body)); r.GetNote() != cachedPass || len(kvCallsSince(fh, before)) != 0 {
				t.Fatalf("again = %+v, KV calls %v", r, kvCallsSince(fh, before))
			}
		})
	}
}

// A value in memory is not read from the KV again: a request of 150 segments
// the node knows makes no KV call and counts no kv error, at any time before
// the values expire.
func TestKnownSegmentsMakeNoKVCall(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	var clock atomic.Int64
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv), withClock(&clock))
	flow := openAIFlow(t, h, mod.srv.URL)
	const segments = 150
	body := longRequest(segments)
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, body)); denied(r) || r.GetNote() == cachedPass {
		t.Fatalf("first = %+v", r)
	}
	// The node knows every segment of the request: its run stored them.
	scope := flowScope(p, flow)
	var keys [][32]byte
	cache := p.cache.Load()
	cache.mu.Lock()
	for key := range cache.items {
		if seg, ok := strings.CutPrefix(key, "s:"+scope+":"); ok {
			keys = append(keys, hashOf(t, seg))
		}
	}
	cache.mu.Unlock()
	if len(keys) != segments {
		t.Fatalf("%d segments in memory, want %d", len(keys), segments)
	}

	kv.calls.Store(0)
	errs, upstream := p.stats.kvErrors.Load(), len(mod.moderated())
	ttl := p.cfg.Load().cacheTTL
	for _, ahead := range []time.Duration{0, ttl / 2, ttl - time.Minute} {
		clock.Store(int64(ahead))
		if r := mustHook(t, h, rawReq(3, "", protoAnthropic, body)); r.GetNote() != cachedPass {
			t.Fatalf("%v after the first = %+v", ahead, r)
		}
		for _, useKV := range []bool{true, false} {
			if v := p.lookupVerdicts(context.Background(), scope, keys, useKV); v.hit != nil || len(v.passed) != segments {
				t.Fatalf("%v after the first, lookup (KV %v): %d of %d segments passed", ahead, useKV, len(v.passed), segments)
			}
		}
		if n := kv.calls.Load(); n != 0 || p.stats.kvErrors.Load() != errs || len(mod.moderated()) != upstream {
			t.Fatalf("%v after the first: %d KV calls, %d kv errors, %d upstream calls", ahead, n,
				p.stats.kvErrors.Load()-errs, len(mod.moderated())-upstream)
		}
	}
	// Expired, they are unknown again.
	clock.Store(int64(ttl + time.Second))
	if v := p.lookupVerdicts(context.Background(), scope, keys, false); len(v.passed) != 0 {
		t.Fatalf("after the TTL: %d segments passed", len(v.passed))
	}
}

// A lookup has no time limit of its own: it waits for the KV as long as its
// request does. When the client leaves - or the core's time for the hook call
// is over - the lookup ends at once and counts no kv error, and the request
// goes the way of every request whose client left: it is let go, its run goes
// on, a hit is recorded all the same, and the verdict is written to the cache
// - the write is the plugin's own work and does not end with the request.
func TestLookupEndsWithItsRequest(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	openAIFlow(t, h, mod.srv.URL)
	const text = "MOD-HIT-sexual and the client left"
	// The KV does not answer.
	kv.delay.Store(int64(time.Hour))
	errs := p.stats.kvErrors.Load()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	answer := make(chan *pluginv1.GatewayRequestHookResponse, 1)
	go func() {
		r, _ := p.OnGatewayRequest(ctx, hookReqAs(3, "left", text))
		answer <- r
	}()
	waitFor(t, "the lookup to ask the KV", func() bool { return kv.calls.Load() == 1 })
	select {
	case r := <-answer:
		t.Fatalf("the hook did not wait for the KV: %+v", r)
	case <-time.After(300 * time.Millisecond): // long enough for a lookup with a time limit of its own to give up
	}
	if n := mod.count("/v1/moderations"); n != 0 {
		t.Fatalf("%d upstream calls while the lookup waits", n)
	}
	// The KV answers again, for what comes after the request: the client
	// leaves.
	kv.delay.Store(0)
	began := time.Now()
	cancel()
	if r := within(t, "the answer to the client that left", answer); r == nil || denied(r) || r.GetNote() != notePrefix+"error canceled" {
		t.Fatalf("the request whose client left = %+v", r)
	}
	if took := time.Since(began); took > 5*time.Second || p.stats.kvErrors.Load() != errs {
		t.Fatalf("the lookup ended %v after its request, with %d kv errors", took, p.stats.kvErrors.Load()-errs)
	}
	// The run goes on: the hit is recorded as a refusal, and cached.
	if ev := recordOf(t, h, "left"); ev.Result != ResultBlock || ev.Replayed {
		t.Fatalf("record of the request whose client left = %+v", ev.Event)
	}
	written(t, p)
	if kvCount(t, fh, "h:") != 1 || kvCount(t, fh, "s:") != 1 || p.cache.Load().len() != 2 || p.stats.kvErrors.Load() != errs {
		t.Fatalf("after the run of the request whose client left: %d hit entries, %d segment keys, %d entries in memory, %d kv errors",
			kvCount(t, fh, "h:"), kvCount(t, fh, "s:"), p.cache.Load().len(), p.stats.kvErrors.Load()-errs)
	}
	if r := mustHook(t, h, hookReq(text)); !denied(r) || !replayed(r) || mod.count("/v1/moderations") != 1 {
		t.Fatalf("the same content after it = %+v (%d upstream calls)", r, mod.count("/v1/moderations"))
	}
}

// A pass this node stores does not hide a hit another node stored. The hit
// set is {A, B}; this node gets A among 70 segments it has never seen, then
// B among 70 others, then A and B together. Its lookups read every key from
// the KV, and the writes of its runs merge their passes into what the KV
// holds: A and B keep their pointers, in the KV and in this node's memory,
// and the pair is replayed. (Were A left unread by the lookup, or its value
// replaced by the write, A and B would be plain passes in this node's memory
// and the pair a cached pass there until they expire.)
func TestPassDoesNotHideAHitAnotherNodeStored(t *testing.T) {
	base, calls := newPairMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	p1, h1, fh := startDB(t, nil, cfg)
	flow := openAIFlow(t, h1, base)
	const more = 70
	// among is a request of one part of the hit set, first, and 70 segments
	// nobody has seen.
	among := func(part map[string]any, tag string) string {
		msgs := []any{part}
		for i := range more {
			role := "assistant"
			if i%2 == 1 {
				role = "user"
			}
			msgs = append(msgs, map[string]any{"role": role, "content": fmt.Sprintf("%s turn %02d of a long conversation", tag, i)})
		}
		b, _ := json.Marshal(map[string]any{"messages": msgs})
		return string(b)
	}
	// The first node stores the hit of {A, B}.
	if r := mustHook(t, h1, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || replayed(r) {
		t.Fatalf("the pair on the first node = %+v", r)
	}
	hit := hitInKV(t, fh, flowScope(p1, flow))

	kv := &kvFake{}
	p, h := secondNode(t, fh, cfg, withKV(kv))
	errs := p.stats.kvErrors.Load()
	n := calls.Load()
	// A is the system prompt of the pair, B its user message.
	for i, body := range []string{
		among(map[string]any{"role": "system", "content": "alpha rule"}, "first"),
		among(map[string]any{"role": "user", "content": "beta ask"}, "second"),
	} {
		kv.calls.Store(0)
		r := mustHook(t, h, rawReq(4, "", "openai.chat", body))
		// The lookup: one call for the 71 segments and, the first time, one
		// for the hit entry that one of them points to (memory has it the
		// second time). The write of the run: one call to read its keys, one
		// to write them.
		if asked := kv.calls.Load(); denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+"pass flow=") || asked != int64(4-i) {
			t.Fatalf("part %d among %d new segments = %+v (%d KV calls, want %d)", i, more, r, asked, 4-i)
		}
	}
	if calls.Load() != n+2 || p.stats.kvErrors.Load() != errs {
		t.Fatalf("%d upstream calls, %d kv errors", calls.Load()-n, p.stats.kvErrors.Load()-errs)
	}
	// Both parts have a pass and the pointer, in the KV and - the same value -
	// in this node's memory.
	for _, key := range hit.segKeys {
		inKV, _ := kvValue(t, fh, key)
		if v := parseSeg(inKV); v.pass == 0 || len(v.hits) != 1 || v.hits[0].id != hit.id {
			t.Fatalf("%s in the KV = %s", key, inKV)
		}
		if inMemory := memoryValue(p, key); !bytes.Equal(inMemory, inKV) {
			t.Fatalf("%s: memory holds %q, the KV %q", key, inMemory, inKV)
		}
	}
	// The pair: replayed, from memory.
	kv.calls.Store(0)
	if r := mustHook(t, h, rawReq(4, "", protoAnthropic, pairWhole)); !denied(r) || !replayed(r) || calls.Load() != n+2 || kv.calls.Load() != 0 {
		t.Fatalf("the pair on the second node = %+v (%d upstream calls, %d KV calls)", r, calls.Load()-n, kv.calls.Load())
	}
}

// A pointer whose hit entry cannot be read is not a stale pointer: the passes
// of its segments do not answer the request. The hit set {A, B} is cached,
// and A and B each passed in other requests.
func TestUnreadableHitEntryIsUnknown(t *testing.T) {
	base, calls := newPairMod(t)
	kv := &kvFake{}
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	flow := openAIFlow(t, h, base)
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || replayed(r) {
		t.Fatalf("the pair = %+v", r)
	}
	for _, body := range []string{pairFirst, pairLast} {
		if r := mustHook(t, h, rawReq(3, "", protoAnthropic, body)); denied(r) {
			t.Fatalf("a part = %+v", r)
		}
	}
	if n := segCount(t, fh, passedAndPointed); n != 2 {
		t.Fatalf("%d segment keys with a pass and a pointer", n)
	}
	scope := flowScope(p, flow)
	hit := hitInKV(t, fh, scope)
	keys, hitKey := hit.segs, hit.hitKey

	// Memory alone, the hit entry evicted: unknown, not two passes. With the
	// KV the entry is found.
	p.cache.Load().forget([]string{hitKey})
	if v := p.lookupVerdicts(context.Background(), scope, keys, false); v.hit != nil || len(v.passed) != 0 {
		t.Fatalf("memory alone without the hit entry = %+v", v)
	}
	if v := p.lookupVerdicts(context.Background(), scope, keys, true); v.hit == nil {
		t.Fatalf("with the KV = %+v", v)
	}

	// Only the KV knows, and the reads of the hit entries fail: the pair is
	// moderated again (and refused), not answered by the passes.
	emptyMemory(p)
	prefix := "h:"
	kv.noRead.Store(&prefix)
	n := calls.Load()
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || replayed(r) || calls.Load() != n+1 {
		t.Fatalf("while the hit entries cannot be read = %+v (%d calls)", r, calls.Load()-n)
	}
	// A part alone is unknown as well while its pointer cannot be followed.
	emptyMemory(p)
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairLast)); denied(r) || r.GetNote() == cachedPass || calls.Load() != n+2 {
		t.Fatalf("a part while the hit entries cannot be read = %+v (%d calls)", r, calls.Load()-n)
	}
	kv.noRead.Store(nil)
	written(t, p)

	// An entry the KV says is not there leaves a stale pointer: the passes
	// count, as before.
	kvDelete(t, fh, hitKey)
	emptyMemory(p)
	if v := p.lookupVerdicts(context.Background(), scope, keys, true); v.hit != nil || len(v.passed) != 2 {
		t.Fatalf("with the entry deleted = %+v", v)
	}
}

// A pointer to a hit entry the KV says is not there does not make a lookup of
// memory alone (the hook under post timing) queue the request every time: the
// lookup with the KV that learns it removes the pointer from the values in
// memory.
func TestStalePointerLeavesMemory(t *testing.T) {
	base, calls := newPairMod(t)
	var clock atomic.Int64
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve}, withClock(&clock))
	flow := openAIFlow(t, h, base)
	// The pair is a cached hit, its last part a cached pass.
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); r.GetNote() != queuedNote {
		t.Fatalf("the pair = %+v", r)
	}
	waitSegs(t, fh, "pointing to the hit", 2, pointed)
	written(t, p)
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairLast)); r.GetNote() != queuedNote {
		t.Fatalf("the part = %+v", r)
	}
	waitSegs(t, fh, "with a pass and a pointer", 1, passedAndPointed)
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairLast)); r.GetNote() != cachedPass {
		t.Fatalf("the part again = %+v", r)
	}
	// The hit entry is gone, from the KV and from memory.
	hitKey := hitInKV(t, fh, flowScope(p, flow)).hitKey
	kvDelete(t, fh, hitKey)
	p.cache.Load().forget([]string{hitKey})
	clock.Store(int64(time.Minute))
	n, known := calls.Load(), p.stats.cacheHits.Load()
	// The first request cannot tell from memory: queued, and the worker asks
	// the KV. The second and the third are answered from memory.
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairLast)); r.GetNote() != queuedNote {
		t.Fatalf("the part with a pointer to an entry that is not in memory = %+v", r)
	}
	waitFor(t, "the worker's lookup", func() bool { return p.stats.cacheHits.Load() == known+1 })
	for i := range 2 {
		if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairLast)); r.GetNote() != cachedPass {
			t.Fatalf("request %d after the KV said the entry is not there = %+v", i+2, r)
		}
	}
	if calls.Load() != n {
		t.Fatalf("%d upstream calls", calls.Load()-n)
	}
	// The KV was not written for it.
	if v := segValues(t, fh); len(v) != 2 {
		t.Fatalf("segment keys = %v", v)
	}
	for key, v := range segValues(t, fh) {
		if !pointed(v) {
			t.Fatalf("%s lost its pointer in the KV: %+v", key, v)
		}
	}
}

// Taking a stale pointer out of memory removes the pointer the lookup
// followed and no other. Here the KV has answered a lookup that the hit entry
// is not there; before the lookup acts on that, a run on this node judges the
// same set a hit again and stores it - a new entry, and on every segment a
// new pointer with the same id. The lookup then finds its own, older pointers
// gone and leaves the new ones alone. (Were every pointer with the id
// removed, the hit that was just stored would be unreachable from memory on
// this node, and the set answered by the passes of its segments.)
func TestStalePointerRemovalKeepsANewerPointer(t *testing.T) {
	base, calls := newPairMod(t)
	kv := &kvFake{}
	var clock atomic.Int64
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv), withClock(&clock))
	flow := openAIFlow(t, h, base)
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || replayed(r) {
		t.Fatalf("the pair = %+v", r)
	}
	scope := flowScope(p, flow)
	hit := hitInKV(t, fh, scope)
	keys, hitKey := hit.segs, hit.hitKey
	first := p.cache.Load().getHit(hitKey, p.now())
	if first == nil {
		t.Fatal("the hit is not in memory")
	}
	// The hit entry is gone, from the KV and from memory; the pointers to it
	// are still in both.
	kvDelete(t, fh, hitKey)
	p.cache.Load().forget([]string{hitKey})

	// A lookup follows the pointers; the KV's answer for the hit entry - not
	// there - is on its way.
	entered := kv.holdRead(func(key string) bool { return key == hitKey })
	defer kv.open()
	looked := make(chan verdicts, 1)
	go func() { looked <- p.lookupVerdicts(context.Background(), scope, keys, true) }()
	within(t, "the read of the hit entry", entered)
	// Meanwhile, a minute later, a run on this node judges the pair a hit
	// again and stores it.
	clock.Store(int64(time.Minute))
	again := *first
	again.RequestID, again.At = "again", p.now().Unix()
	if again.At <= first.At {
		t.Fatalf("the second hit is not newer: %d, %d", first.At, again.At)
	}
	p.storeVerdicts(scope, nil, []storedHit{again}, p.now().Unix(), p.cfg.Load().cacheTTL, askNow(p))
	written(t, p)
	// The lookup gets its answer: for it the pointers were stale.
	kv.open()
	if v := within(t, "the lookup", looked); v.hit != nil {
		t.Fatalf("the lookup that read \"not there\" = %+v", v)
	}
	// The new pointers are where the run put them, in memory as in the KV:
	// the pair is replayed from memory, as the hit of the second run.
	for _, key := range hit.segKeys {
		inKV, _ := kvValue(t, fh, key)
		if v := parseSeg(memoryValue(p, key)); len(v.hits) != 1 || v.hits[0] != (hitRef{hit.id, again.At}) || !bytes.Equal(memoryValue(p, key), inKV) {
			t.Fatalf("%s: memory holds %q, the KV %q", key, memoryValue(p, key), inKV)
		}
	}
	n := calls.Load()
	kv.calls.Store(0)
	if v := p.lookupVerdicts(context.Background(), scope, keys, false); v.hit == nil || v.hit.RequestID != "again" {
		t.Fatalf("memory alone after the lookup = %+v", v)
	}
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || !replayed(r) || calls.Load() != n || kv.calls.Load() != 0 {
		t.Fatalf("the pair after the lookup = %+v (%d calls, %d KV calls)", r, calls.Load()-n, kv.calls.Load())
	}
}

// The KV first: after a run, memory holds for the keys of the run exactly
// what the KV holds - a pointer another node stored there before included,
// which the write read and kept.
func TestMemoryHoldsWhatTheKVHolds(t *testing.T) {
	base, calls := newPairMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	p1, h1, fh := startDB(t, nil, cfg)
	flow := openAIFlow(t, h1, base)
	// The first node stores the hit of {A, B}: in its memory the two keys and
	// the hit entry, as in the KV.
	if r := mustHook(t, h1, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || replayed(r) {
		t.Fatalf("the pair = %+v", r)
	}
	scope := flowScope(p1, flow)
	hit := hitInKV(t, fh, scope)
	keyA, keyB, hitKey := hit.segKeys[0], hit.segKeys[1], hit.hitKey
	same := func(p *Plugin, keys ...string) {
		t.Helper()
		for _, key := range keys {
			inKV, found := kvValue(t, fh, key)
			if inMemory := memoryValue(p, key); !found || !bytes.Equal(inMemory, inKV) {
				t.Fatalf("%s: memory holds %q, the KV %q (found %v)", key, inMemory, inKV, found)
			}
		}
	}
	same(p1, keyA, keyB)
	if p1.cache.Load().len() != 3 || p1.cache.Load().getHit(hitKey, time.Now()) == nil {
		t.Fatalf("memory of the node that stored the hit: %d entries", p1.cache.Load().len())
	}

	// Another node, which has read nothing yet, ends a run in which A passed:
	// its write reads A from the KV, with the pointer the first node stored,
	// and that is what comes into its memory.
	p, h := secondNode(t, fh, cfg)
	p.storeVerdicts(scope, [][32]byte{hit.segs[0]}, nil, p.now().Unix(), p.cfg.Load().cacheTTL, askNow(p))
	written(t, p)
	same(p, keyA)
	if v := parseSeg(memoryValue(p, keyA)); v.pass == 0 || len(v.hits) != 1 || v.hits[0].id != hit.id || p.cache.Load().len() != 1 {
		t.Fatalf("A in the memory of the second node = %+v (%d entries)", v, p.cache.Load().len())
	}
	// The same through a request: A beside new text. A has passed; the new
	// text is moderated, and is in memory as in the KV afterwards. Memory
	// holds A, the hit entry its pointer names (the lookup read it) and the
	// new text.
	n := calls.Load()
	if r := mustHook(t, h, rawReq(4, "", protoAnthropic, pairFirst)); denied(r) || r.GetNote() == cachedPass || calls.Load() != n+1 {
		t.Fatalf("A beside new text = %+v (%d calls)", r, calls.Load()-n)
	}
	keys := []string{keyA}
	for key := range segValues(t, fh) {
		if key != keyA && key != keyB {
			keys = append(keys, key)
		}
	}
	if len(keys) != 2 || p.cache.Load().len() != 3 || p.cache.Load().getHit(hitKey, time.Now()) == nil {
		t.Fatalf("segment keys the second node knows = %v, %d entries in memory", keys, p.cache.Load().len())
	}
	same(p, keys...)
}

// The write does not delay the request: the hook answers when the verdict is
// known, and the KV (and after it memory) gets it afterwards. Until that write
// is done the cache does not know the verdict: the same content is moderated
// again - a hit is refused again by a run of its own and recorded as a
// violation of its own, not as a replay. After the write it is answered from
// memory, without a call to the KV.
func TestRepeatedBeforeTheWriteIsModeratedAgain(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	openAIFlow(t, h, mod.srv.URL)
	calls := func() int64 { return mod.count("/v1/moderations") }
	for _, tc := range []struct {
		name, text string
		refused    bool
		cached     func(r *pluginv1.GatewayRequestHookResponse) bool
	}{
		{"hit", "MOD-HIT-sexual sent twice", true, replayed},
		{"pass", "a clean text sent twice", false, func(r *pluginv1.GatewayRequestHookResponse) bool { return r.GetNote() == cachedPass }},
	} {
		n := calls()
		// The write of the first run is held at the KV.
		entered := kv.hold(func(string) bool { return true })
		first := hookNow(t, h, hookReqAs(3, tc.name+"-1", tc.text))
		within(t, "the write of the first run", entered)
		if denied(first) != tc.refused || tc.cached(first) || calls() != n+1 {
			t.Fatalf("%s: first = %+v (%d calls)", tc.name, first, calls()-n)
		}
		// The hook has answered although nothing is written yet, and nothing
		// is in memory.
		if keys := kvKeys(t, fh, ""); p.stats.kvWriting.Load() != 1 || len(keys) != 0 || p.cache.Load().len() != 0 {
			t.Fatalf("%s: answered with %d writes under way, KV %v, %d entries in memory", tc.name, p.stats.kvWriting.Load(), keys, p.cache.Load().len())
		}
		// The same request again: moderated again.
		second := hookNow(t, h, hookReqAs(3, tc.name+"-2", tc.text))
		if denied(second) != tc.refused || tc.cached(second) || calls() != n+2 {
			t.Fatalf("%s: repeated before the write = %+v (%d calls)", tc.name, second, calls()-n)
		}
		if tc.refused {
			for _, rid := range []string{tc.name + "-1", tc.name + "-2"} {
				if ev := recordOf(t, h, rid); ev.Replayed || ev.Result != ResultBlock || traceOf(t, ev).Cache == nil || traceOf(t, ev).Cache.Hit {
					t.Fatalf("%s: record of %s = %+v (trace %s)", tc.name, rid, ev.Event, ev.Trace)
				}
			}
		}
		// Both writes land (the second waited for its turn at the keys).
		kv.open()
		written(t, p)
		kv.calls.Store(0)
		third := mustHook(t, h, hookReqAs(3, tc.name+"-3", tc.text))
		if denied(third) != tc.refused || !tc.cached(third) || calls() != n+2 || kv.calls.Load() != 0 {
			t.Fatalf("%s: after the write = %+v (%d calls, %d KV calls)", tc.name, third, calls()-n, kv.calls.Load())
		}
		if tc.refused {
			if ev := recordOf(t, h, tc.name+"-3"); !ev.Replayed || traceOf(t, ev).Cache == nil || !traceOf(t, ev).Cache.Hit {
				t.Fatalf("%s: record of the replay = %+v (trace %s)", tc.name, ev.Event, ev.Trace)
			}
		}
		emptyMemory(p) // the next case starts with an empty memory
		for _, key := range kvKeys(t, fh, "") {
			kvDelete(t, fh, key)
		}
	}
}

// A hit is written as its entry first and the pointers to it after: while
// the entry is on its way no segment key in the KV names the hit, so no node
// finds a pointer whose entry is not there yet (and takes it for stale).
func TestHitEntryIsWrittenBeforeItsPointers(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	openAIFlow(t, h, mod.srv.URL)
	entered := kv.hold(func(key string) bool { return strings.HasPrefix(key, "h:") })
	defer kv.open()
	if r := hookNow(t, h, hookReq("MOD-HIT-sexual entry first")); !denied(r) {
		t.Fatalf("hit = %+v", r)
	}
	hitKey := within(t, "the write of the hit entry", entered)
	if keys := kvKeys(t, fh, ""); len(keys) != 0 {
		t.Fatalf("in the KV before the hit entry: %v", keys)
	}
	if writes := kv.counts(); len(writes) != 1 || writes[hitKey] != 1 {
		t.Fatalf("writes before the hit entry is in the KV: %v", writes)
	}
	kv.open()
	written(t, p)
	if _, found := kvValue(t, fh, hitKey); !found || len(segValues(t, fh)) != 1 {
		t.Fatalf("after the write: hit entry %v, segment keys %v", found, segValues(t, fh))
	}
}

// A hit whose write to the KV failed is cached nowhere, not in the memory of
// the node that judged it either (the KV first, then memory). The same
// content is moderated again and refused again by its own run, as a new
// violation, and the write of that run stores the hit - with the TTL of that
// run, for every node.
//
// What the rule costs: while a hit is cached nowhere, its parts passing one
// by one - here on another node - make the whole a cached pass on every node,
// the one that judged the hit included. That is how the cache treats any
// content it never saw as a whole.
func TestHitWhoseWriteFailedIsCachedNowhere(t *testing.T) {
	base, calls := newPairMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	kv := &kvFake{}
	var clock atomic.Int64
	p, h, fh := startDB(t, nil, cfg, withKV(kv), withClock(&clock))
	flow := openAIFlow(t, h, base)
	// The node judges the pair a hit while the KV takes no writes: nothing in
	// the KV, nothing in memory, one kv error (the write; the lookup and the
	// read of the write worked).
	kv.noWrite.Store(true)
	errs := p.stats.kvErrors.Load()
	if r := mustHook(t, h, rawReq(3, "pair", protoAnthropic, pairWhole)); !denied(r) || replayed(r) || calls.Load() != 1 {
		t.Fatalf("the pair = %+v", r)
	}
	hitKey := hitOf(t, flowScope(p, flow), recordOf(t, h, "pair")).hitKey
	if n := kvCount(t, fh, ""); n != 0 || p.cache.Load().len() != 0 || p.stats.kvErrors.Load() != errs+1 {
		t.Fatalf("after the failed write: %d keys in the KV, %d entries in memory, %d kv errors", n, p.cache.Load().len(), p.stats.kvErrors.Load()-errs)
	}
	// The pair again: moderated again and refused by its own run - a record
	// of its own that counts, not a replay.
	if r := mustHook(t, h, rawReq(3, "pair again", protoAnthropic, pairWhole)); !denied(r) || replayed(r) || calls.Load() != 2 {
		t.Fatalf("the pair again while the KV takes no writes = %+v (%d calls)", r, calls.Load())
	}
	if ev := recordOf(t, h, "pair again"); ev.Replayed || ev.Result != ResultBlock || traceOf(t, ev).Cache == nil || traceOf(t, ev).Cache.Hit {
		t.Fatalf("record of the pair moderated again = %+v (trace %s)", ev.Event, ev.Trace)
	}
	if p.cache.Load().len() != 0 || p.stats.kvErrors.Load() != errs+2 {
		t.Fatalf("after the second failed write: %d entries in memory, %d kv errors", p.cache.Load().len(), p.stats.kvErrors.Load()-errs)
	}

	// The KV takes writes again, an hour later: the next run of the pair
	// stores the hit, the entry and a pointer on both segments, for the whole
	// TTL from now.
	kv.noWrite.Store(false)
	kv.counts()
	clock.Store(int64(time.Hour))
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || replayed(r) || calls.Load() != 3 {
		t.Fatalf("the pair once the KV takes writes = %+v (%d calls)", r, calls.Load())
	}
	if n := segCount(t, fh, pointed); n != 2 {
		t.Fatalf("%d segment keys pointing to the hit", n)
	}
	if writes := kv.counts(); len(writes) != 3 || writes[hitKey] != 1 || p.stats.kvErrors.Load() != errs+2 {
		t.Fatalf("writes of the hit = %v (%d kv errors)", writes, p.stats.kvErrors.Load()-errs)
	}
	if ttl, _ := kv.ttls.Load(hitKey); ttl != p.cfg.Load().cacheTTL {
		t.Fatalf("TTL of the hit entry = %v, want %v", ttl, p.cfg.Load().cacheTTL)
	}
	// From then on the node decides by the hit in its memory, and a node that
	// never knew the hit by the KV.
	n := calls.Load()
	kv.calls.Store(0)
	clock.Store(int64(2 * time.Hour))
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || !replayed(r) || calls.Load() != n || kv.calls.Load() != 0 {
		t.Fatalf("the pair after the hit was stored = %+v (%d calls, %d KV calls)", r, calls.Load()-n, kv.calls.Load())
	}
	p2, h2 := secondNode(t, fh, cfg)
	if r := mustHook(t, h2, rawReq(5, "", protoAnthropic, pairWhole)); !denied(r) || !replayed(r) || calls.Load() != n {
		t.Fatalf("the pair on a second node = %+v (%d calls)", r, calls.Load()-n)
	}

	// The cost. The cache is cleared, and the node judges the pair a hit
	// again while the KV takes no writes: cached nowhere.
	if got := clearCache(t, h); got != 1 {
		t.Fatalf("clear = %d", got)
	}
	if err := p2.pollVersions(context.Background()); err != nil {
		t.Fatal(err)
	}
	kv.noWrite.Store(true)
	if r := mustHook(t, h, rawReq(3, "", protoAnthropic, pairWhole)); !denied(r) || replayed(r) || calls.Load() != n+1 {
		t.Fatalf("the pair after the clear = %+v (%d calls)", r, calls.Load()-n)
	}
	kv.noWrite.Store(false)
	// Each part passes alone on the other node: the KV holds their passes
	// (and the one of the text beside A) and no pointer under the new clear
	// counter.
	for _, body := range []string{pairFirst, pairLast} {
		if r := mustHook(t, h2, rawReq(4, "", protoAnthropic, body)); denied(r) {
			t.Fatalf("a part = %+v", r)
		}
	}
	if n := segCount(t, fh, func(v segValue) bool { return passed(v) && !pointed(v) }); n != 3 {
		t.Fatalf("%d segment keys that passed and point to no hit", n)
	}
	// The pair is a cached pass now, on both nodes.
	n = calls.Load()
	for name, node := range map[string]*pluginsdktest.Harness{"the node that judged the hit": h, "the other node": h2} {
		if r := mustHook(t, node, rawReq(3, "", protoAnthropic, pairWhole)); r.GetNote() != cachedPass || calls.Load() != n {
			t.Fatalf("the pair on %s after its parts passed = %+v (%d calls)", name, r, calls.Load()-n)
		}
	}
}

// The write of a run needs every one of its segment keys read: when a call of
// its read fails, it stops there - the calls after it are not made, their
// answers would be thrown away.
func TestVerdictWriteStopsAtAFailedRead(t *testing.T) {
	kv := &kvFake{}
	p, _, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	const scope = "e0:1:fp"
	passes := make([][32]byte, 2*kvSegUnit+1) // three calls to read them
	for i := range passes {
		passes[i] = sha256.Sum256(fmt.Append(nil, "a segment of a very long request ", i))
	}
	kv.fail.Store(true)
	errs := p.stats.kvErrors.Load()
	p.storeVerdicts(scope, passes, nil, p.now().Unix(), p.cfg.Load().cacheTTL, askNow(p))
	written(t, p)
	if calls, failed := kv.calls.Load(), p.stats.kvErrors.Load()-errs; calls != 1 || failed != 1 || p.cache.Load().len() != 0 {
		t.Fatalf("a write whose first read failed: %d KV calls, %d kv errors, %d entries in memory", calls, failed, p.cache.Load().len())
	}
	// The KV is back: the same verdicts are written, in three reads and
	// three writes.
	kv.fail.Store(false)
	kv.calls.Store(0)
	p.storeVerdicts(scope, passes, nil, p.now().Unix(), p.cfg.Load().cacheTTL, askNow(p))
	written(t, p)
	if calls := kv.calls.Load(); calls != 6 || kvCount(t, fh, "s:") != len(passes) || p.cache.Load().len() != len(passes) {
		t.Fatalf("with the KV back: %d KV calls, %d keys in the KV, %d entries in memory", calls, kvCount(t, fh, "s:"), p.cache.Load().len())
	}
}

// A write of a run whose segment keys need several calls of the KV, and that
// fails after some of them worked: the keys those calls wrote are in the KV
// with their new pointers. They leave this node's memory, which held them
// without the pointers, and the other nodes are told of them as after a
// write that worked - or the set would pass on every node that held its
// parts as passed, until they expire.
func TestVerdictWriteCutShortForgetsWhatItWrote(t *testing.T) {
	kv := &kvFake{}
	p, _, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	const scope = "e0:1:fp"
	ctx := context.Background()
	ttl := p.cfg.Load().cacheTTL
	a, b := sha256.Sum256([]byte("part a of a long request")), sha256.Sum256([]byte("part b of a long request"))
	set := [][32]byte{a, b}
	// a and b passed one by one: the node holds their passes in memory.
	p.storeVerdicts(scope, set, nil, p.now().Unix(), ttl, askNow(p))
	written(t, p)
	if v := p.lookupVerdicts(ctx, scope, set, false); len(v.passed) != 2 {
		t.Fatalf("the passes of the parts are not in memory: %+v", v)
	}
	// {a, b} hits in a request with more segments than one call writes: the
	// hit entry, then a and b with their pointers and most of the passes in
	// a call that works, and the rest in a call that fails.
	passes := make([][32]byte, kvSegUnit)
	for i := range passes {
		passes[i] = sha256.Sum256(fmt.Append(nil, "another segment of the long request ", i))
	}
	hit := newStoredHit("r1", hexKeys(set), Trace{Final: Hit}, p.now().Unix())
	last := segKeyOf(scope, passes[len(passes)-1])
	kv.noWriteOf.Store(&last)
	errs := p.stats.kvErrors.Load()
	p.storeVerdicts(scope, passes, []storedHit{hit}, p.now().Unix(), ttl, askNow(p))
	written(t, p)
	kv.noWriteOf.Store(nil)
	if n := p.stats.kvErrors.Load() - errs; n != 1 {
		t.Fatalf("%d kv errors for the call that failed", n)
	}
	segA, segB := segKeyOf(scope, a), segKeyOf(scope, b)
	for _, key := range []string{segA, segB} {
		if raw, _ := kvValue(t, fh, key); len(parseSeg(raw).hits) != 1 {
			t.Fatalf("the KV holds %q for %s: the call with the pointers did not work", raw, key)
		}
	}
	if _, found := kvValue(t, fh, last); found {
		t.Fatal("the call that was to fail wrote")
	}
	// Memory no longer answers for a and b; with the KV the set is the hit.
	if v := p.lookupVerdicts(ctx, scope, set, false); v.hit != nil || len(v.passed) != 0 {
		t.Fatalf("memory kept what the KV no longer holds: %+v", v)
	}
	if v := p.lookupVerdicts(ctx, scope, set, true); v.hit == nil {
		t.Fatalf("the hit is not found with the KV: %+v", v)
	}
	// The other nodes are told of a and b, and of no key that was not written.
	if _, told := storedBroadcasts(t, fh); !slices.Equal(told, []string{segA, segB}) {
		t.Fatalf("published as pointed to a stored hit: %d keys %v", len(told), told)
	}
}

// While the KV does not answer, the writes of the runs wait - in a call of
// the KV or for their turn at the keys - and nothing bounds how many (the
// owner's decision of 2026-11-11: no time limits, nothing in place of them).
// /status and the health metrics show the number (kv_writing), and nothing of
// those runs is cached meanwhile. When the KV answers again they all land.
func TestWaitingVerdictWritesAreReported(t *testing.T) {
	kv := &kvFake{}
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	const scope, runs = "e0:1:fp", 40
	writing := func() (status, health int64) {
		t.Helper()
		m, err := p.Health(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		return decodeData[Status](t, h.Do("GET", "/status", nil, nil)).Runtime.KVWriting, int64(m.GetMetrics()["kv_writing"])
	}
	if s, m := writing(); s != 0 || m != 0 {
		t.Fatalf("kv_writing with nothing to write = %d, %d", s, m)
	}
	entered := kv.holdRead(func(string) bool { return true })
	defer kv.open()
	for i := range runs {
		p.storeVerdicts(scope, [][32]byte{sha256.Sum256(fmt.Append(nil, "a run while the KV hangs ", i))}, nil, p.now().Unix(), p.cfg.Load().cacheTTL, askNow(p))
	}
	within(t, "the first read of a write", entered)
	if s, m := writing(); s != runs || m != runs {
		t.Fatalf("kv_writing with %d runs waiting for the KV = %d, %d", runs, s, m)
	}
	if n := p.cache.Load().len(); n != 0 || kvCount(t, fh, "s:") != 0 {
		t.Fatalf("%d entries in memory, %d keys in the KV before the KV answered", n, kvCount(t, fh, "s:"))
	}
	kv.open()
	written(t, p)
	if s, m := writing(); s != 0 || m != 0 || kvCount(t, fh, "s:") != runs || p.cache.Load().len() != runs {
		t.Fatalf("after the KV answered: kv_writing %d, %d; %d keys in the KV, %d entries in memory", s, m, kvCount(t, fh, "s:"), p.cache.Load().len())
	}
}

// A node that stops ends the writes that are under way - they run on the
// plugin's own context - and waits for them: none is left behind, and a
// write that ended this way is no kv error.
func TestStopEndsVerdictWrites(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	openAIFlow(t, h, mod.srv.URL)
	// The lookup of the request is answered (its call is the last one the KV
	// answers); the write of its run is not.
	entered := kv.holdRead(func(string) bool { return true })
	defer kv.open()
	answer := hookAsync(h, hookReq("a clean text before the node stops"))
	within(t, "the lookup", entered)
	kv.delay.Store(int64(time.Hour))
	kv.open()
	if r := within(t, "the answer", answer); r == nil || denied(r) {
		t.Fatalf("request = %+v", r)
	}
	errs := p.stats.kvErrors.Load()
	waitFor(t, "the write to ask the KV", func() bool { return kv.calls.Load() == 2 && p.stats.kvWriting.Load() == 1 })
	began := time.Now()
	if err := p.Shutdown(context.Background()); err != nil {
		t.Fatalf("shutdown with a write under way: %v", err)
	}
	if took := time.Since(began); took > 3*time.Second || p.stats.kvWriting.Load() != 0 || p.stats.kvErrors.Load() != errs {
		t.Fatalf("shutdown took %v; %d writes left, %d kv errors", took, p.stats.kvWriting.Load(), p.stats.kvErrors.Load()-errs)
	}
	if n := kvCount(t, fh, ""); n != 0 || p.cache.Load().len() != 0 {
		t.Fatalf("the write that was ended left %d keys in the KV and %d entries in memory", n, p.cache.Load().len())
	}
}

// The alert state counts its KV failures like the verdict cache (kvFailed):
// a call that failed at the KV is one kv error, a call that ended because its
// context did is none.
func TestAlertStateCountsKVFailuresLikeTheCache(t *testing.T) {
	kv := &kvFake{}
	p, _, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce}, withKV(kv))
	ctx := context.Background()
	kv.fail.Store(true)
	errs := p.stats.kvErrors.Load()
	if _, err := p.alerted(ctx, 1); !errors.Is(err, errKVDown) {
		t.Fatalf("alerted while the KV fails: %v", err)
	}
	p.setAlerted(ctx, 1, true)
	p.setAlerted(ctx, 1, false)
	if n := p.stats.kvErrors.Load() - errs; n != 3 {
		t.Fatalf("%d kv errors for three calls that failed", n)
	}
	gone, cancel := context.WithCancel(ctx)
	cancel()
	if _, err := p.alerted(gone, 1); err == nil {
		t.Fatal("alerted after its context ended")
	}
	p.setAlerted(gone, 1, true)
	p.setAlerted(gone, 1, false)
	if n := p.stats.kvErrors.Load() - errs; n != 3 {
		t.Fatalf("calls whose context ended were counted as kv errors: %d", n-3)
	}
}

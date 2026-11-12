package moderation

import (
	"cmp"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// What the tests of the verdict cache share: the fake between a node and its
// KV, what the KV and a node's memory hold, records, reviews and upstreams.

var errKVDown = errors.New("kv unavailable")

// kvFake stands between a node and the KV of its host (withKV): it counts
// the calls the node makes (calls) and the writes (Set, Delete) that reach
// it by key, makes every call take delay, fails every call while fail is
// set, the reads of some keys while noRead is, every write while noWrite is
// and the writes of some keys while noWriteOf is, keeps the TTL of the last
// Set of a key, and can hold writes back (hold) and the answers of reads
// (holdRead).
//
// The node's KV has the batch calls (pluginsdk.KVBatch), as on every core the
// manifest admits (hostCompat): a batch call is one call of the node, handed
// on to the host as one batch call.
type kvFake struct {
	calls   atomic.Int64 // calls of the node so far, single ones and batch calls
	delay   atomic.Int64 // nanoseconds a call takes before anything else happens
	fail    atomic.Bool
	noWrite atomic.Bool
	ttls    sync.Map               // key -> time.Duration of its last Set
	noRead  atomic.Pointer[string] // reads of the keys with this prefix fail
	// noWriteOf: a write (of a batch call: the whole call) with a key of this
	// prefix fails.
	noWriteOf atomic.Pointer[string]
	mu        sync.Mutex
	writes    map[string]int
	held      [2]*kvHold // the writes (kvWrites) and the answers of reads (kvReads) that wait; nil = none
}

const (
	kvWrites = iota
	kvReads
)

// kvHold makes the calls with a key match takes wait at gate; the key of
// each call that waits is sent on entered.
type kvHold struct {
	match   func(key string) bool
	gate    chan struct{} // closed to let the waiting calls go on
	entered chan string
}

// counts returns the writes per key so far and starts over.
func (k *kvFake) counts() map[string]int {
	k.mu.Lock()
	defer k.mu.Unlock()
	out := k.writes
	k.writes = nil
	return out
}

// hold makes the writes of the keys match takes wait before they reach the
// KV; the key of each write that waits is sent on entered (of a batch call:
// its first such key). release lets the ones waiting go on, while later ones
// wait again; open ends the holding.
func (k *kvFake) hold(match func(key string) bool) (entered <-chan string) {
	return k.holdAt(kvWrites, match)
}

// holdRead makes the reads of the keys match takes wait after the KV has
// answered them and before the node gets the answer; otherwise like hold.
func (k *kvFake) holdRead(match func(key string) bool) (entered <-chan string) {
	return k.holdAt(kvReads, match)
}

func (k *kvFake) holdAt(at int, match func(key string) bool) (entered <-chan string) {
	k.mu.Lock()
	defer k.mu.Unlock()
	k.held[at] = &kvHold{match: match, gate: make(chan struct{}), entered: make(chan string, 256)}
	return k.held[at].entered
}

func (k *kvFake) release() {
	k.mu.Lock()
	defer k.mu.Unlock()
	for _, h := range k.held {
		if h != nil {
			close(h.gate)
			h.gate = make(chan struct{})
		}
	}
}

func (k *kvFake) open() {
	k.mu.Lock()
	defer k.mu.Unlock()
	for i, h := range k.held {
		if h != nil {
			close(h.gate)
			k.held[i] = nil
		}
	}
}

// pause waits when a call with keys is held at at.
func (k *kvFake) pause(at int, keys ...string) {
	k.mu.Lock()
	var gate chan struct{}
	var entered chan string
	var key string
	if h := k.held[at]; h != nil {
		if i := slices.IndexFunc(keys, h.match); i >= 0 {
			gate, entered, key = h.gate, h.entered, keys[i]
		}
	}
	k.mu.Unlock()
	if gate != nil {
		entered <- key
		<-gate
	}
}

// call starts every KV call of the node: it is counted and takes delay, or
// ends with ctx.
func (k *kvFake) call(ctx context.Context) error {
	k.calls.Add(1)
	if d := time.Duration(k.delay.Load()); d > 0 {
		select {
		case <-time.After(d):
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	if k.fail.Load() {
		return errKVDown
	}
	return nil
}

// read is called before a read of keys reaches the KV.
func (k *kvFake) read(keys ...string) error {
	if prefix := k.noRead.Load(); prefix != nil && slices.ContainsFunc(keys, func(key string) bool { return strings.HasPrefix(key, *prefix) }) {
		return errKVDown
	}
	return nil
}

// write is called before a write of keys reaches the KV.
func (k *kvFake) write(keys ...string) error {
	if k.noWrite.Load() {
		return errKVDown
	}
	if prefix := k.noWriteOf.Load(); prefix != nil && slices.ContainsFunc(keys, func(key string) bool { return strings.HasPrefix(key, *prefix) }) {
		return errKVDown
	}
	k.mu.Lock()
	if k.writes == nil {
		k.writes = map[string]int{}
	}
	for _, key := range keys {
		k.writes[key]++
	}
	k.mu.Unlock()
	k.pause(kvWrites, keys...)
	return nil
}

type kvFakeHost struct {
	pluginsdk.Host
	kv *kvFake
}

func (h kvFakeHost) KV() pluginsdk.KV { return kvFakeKV{KV: h.Host.KV(), kv: h.kv} }

type kvFakeKV struct {
	pluginsdk.KV
	kv *kvFake
}

func (k kvFakeKV) Get(ctx context.Context, ns, key string) ([]byte, bool, error) {
	if err := cmp.Or(k.kv.call(ctx), k.kv.read(key)); err != nil {
		return nil, false, err
	}
	val, found, err := k.KV.Get(ctx, ns, key)
	k.kv.pause(kvReads, key)
	return val, found, err
}

func (k kvFakeKV) Set(ctx context.Context, ns, key string, val []byte, ttl time.Duration) error {
	if err := k.kv.call(ctx); err != nil {
		return err
	}
	if err := k.kv.write(key); err != nil {
		return err
	}
	k.kv.ttls.Store(key, ttl)
	return k.KV.Set(ctx, ns, key, val, ttl)
}

func (k kvFakeKV) Delete(ctx context.Context, ns, key string) error {
	if err := k.kv.call(ctx); err != nil {
		return err
	}
	if err := k.kv.write(key); err != nil {
		return err
	}
	return k.KV.Delete(ctx, ns, key)
}

func (k kvFakeKV) GetMany(ctx context.Context, ns string, keys []string) ([]pluginsdk.KVValue, error) {
	if err := k.kv.call(ctx); err != nil {
		return nil, err
	}
	if err := k.kv.read(keys...); err != nil {
		return nil, err
	}
	out, err := pluginsdk.KVGetMany(ctx, k.KV, ns, keys)
	k.kv.pause(kvReads, keys...)
	return out, err
}

func (k kvFakeKV) SetMany(ctx context.Context, ns string, items []pluginsdk.KVItem) error {
	if err := k.kv.call(ctx); err != nil {
		return err
	}
	keys := make([]string, len(items))
	for i, it := range items {
		keys[i] = it.Key
	}
	if err := k.kv.write(keys...); err != nil {
		return err
	}
	for _, it := range items {
		k.kv.ttls.Store(it.Key, it.TTL)
	}
	return pluginsdk.KVSetMany(ctx, k.KV, ns, items)
}

func (k kvFakeKV) DeleteMany(ctx context.Context, ns string, keys []string) error {
	if err := k.kv.call(ctx); err != nil {
		return err
	}
	if err := k.kv.write(keys...); err != nil {
		return err
	}
	return pluginsdk.KVDeleteMany(ctx, k.KV, ns, keys)
}

// kvKeys lists the verdict cache keys in the KV with a prefix.
func kvKeys(t *testing.T, fh *pluginsdktest.FakeHost, prefix string) []string {
	t.Helper()
	out, err := fh.KVList(context.Background(), &pluginv1.KVListRequest{Namespace: kvNamespace, Prefix: prefix, Limit: 500})
	if err != nil {
		t.Fatal(err)
	}
	return out.GetKeys()
}

// kvCount counts the verdict cache keys in the KV with a prefix, however many
// they are.
func kvCount(t *testing.T, fh *pluginsdktest.FakeHost, prefix string) (n int) {
	t.Helper()
	for cursor := ""; ; {
		out, err := fh.KVList(context.Background(), &pluginv1.KVListRequest{Namespace: kvNamespace, Prefix: prefix, Cursor: cursor, Limit: 500})
		if err != nil {
			t.Fatal(err)
		}
		n += len(out.GetKeys())
		if cursor = out.GetNextCursor(); cursor == "" {
			return n
		}
	}
}

// kvValue reads a verdict cache key from the KV.
func kvValue(t *testing.T, fh *pluginsdktest.FakeHost, key string) ([]byte, bool) {
	t.Helper()
	r, err := fh.KVGet(context.Background(), &pluginv1.KVGetRequest{Namespace: kvNamespace, Key: key})
	if err != nil {
		t.Fatal(err)
	}
	return r.GetValue(), r.GetFound()
}

// kvDelete removes a verdict cache key from the KV behind the nodes' backs.
func kvDelete(t *testing.T, fh *pluginsdktest.FakeHost, key string) {
	t.Helper()
	if _, err := fh.KVDelete(context.Background(), &pluginv1.KVDeleteRequest{Namespace: kvNamespace, Key: key}); err != nil {
		t.Fatal(err)
	}
}

// kvCallsSince are the calls the host got since before, by RPC name.
func kvCallsSince(fh *pluginsdktest.FakeHost, before map[string]int) map[string]int {
	out := map[string]int{}
	for rpc, n := range fh.KVCalls() {
		if d := n - before[rpc]; d != 0 {
			out[rpc] = d
		}
	}
	return out
}

// segValues reads the segment keys of the KV.
func segValues(t *testing.T, fh *pluginsdktest.FakeHost) map[string]segValue {
	t.Helper()
	out := map[string]segValue{}
	for _, key := range kvKeys(t, fh, "s:") {
		r, err := fh.KVGet(context.Background(), &pluginv1.KVGetRequest{Namespace: kvNamespace, Key: key})
		if err != nil {
			t.Fatal(err)
		}
		out[key] = parseSeg(r.GetValue())
	}
	return out
}

// segCount counts the segment keys of the KV that cond holds for.
func segCount(t *testing.T, fh *pluginsdktest.FakeHost, cond func(segValue) bool) (n int) {
	t.Helper()
	for _, v := range segValues(t, fh) {
		if cond(v) {
			n++
		}
	}
	return n
}

// waitSegs waits for the write of a run the test cannot wait for with
// written (a queued job, a run that goes on after its request): n segment
// keys that cond holds for.
func waitSegs(t *testing.T, fh *pluginsdktest.FakeHost, what string, n int, cond func(segValue) bool) {
	t.Helper()
	waitFor(t, fmt.Sprintf("%d segment keys %s", n, what), func() bool { return segCount(t, fh, cond) >= n })
}

// pointed: the segment key points to a hit; passed: it holds a pass.
func pointed(v segValue) bool { return len(v.hits) > 0 }

func passed(v segValue) bool { return v.pass > 0 }

func passedAndPointed(v segValue) bool { return passed(v) && pointed(v) }

// traceOf decodes the trace of a listed record.
func traceOf(t *testing.T, ev EventListItem) Trace {
	t.Helper()
	var tr Trace
	if err := json.Unmarshal(ev.Trace, &tr); err != nil {
		t.Fatalf("trace %s: %v", ev.Trace, err)
	}
	return tr
}

// recordOf waits for the record of a request id.
func recordOf(t *testing.T, h *pluginsdktest.Harness, rid string) EventListItem {
	t.Helper()
	return waitEvents(t, h, map[string]string{"request_id": rid}, 1)[0]
}

// replayed reports whether the hook answered with a replayed hit.
func replayed(r *pluginv1.GatewayRequestHookResponse) bool {
	return strings.Contains(r.GetNote(), "replay")
}

// The notes of a hook answer that the cache decided, and of a queued request.
const (
	cachedPass = notePrefix + "pass (cached)"
	queuedNote = notePrefix + "queued"
)

// hookAsync sends a hook request to the node h in the background.
func hookAsync(h *pluginsdktest.Harness, req *pluginv1.GatewayRequestHookRequest) <-chan *pluginv1.GatewayRequestHookResponse {
	out := make(chan *pluginv1.GatewayRequestHookResponse, 1)
	go func() {
		r, _ := h.Hook.OnGatewayRequest(context.Background(), req)
		out <- r
	}()
	return out
}

// secondNode starts another plugin instance on the database and the KV of
// fh, and waits until it runs the flows.
func secondNode(t *testing.T, fh *pluginsdktest.FakeHost, cfg map[string]any, opts ...nodeOpt) (*Plugin, *pluginsdktest.Harness) {
	t.Helper()
	p2, h2 := startNode(t, fh, cfg, opts...)
	waitFor(t, "second node snapshot", func() bool { return p2.snap.Load().bound() })
	return p2, h2
}

// reviewBroadcasts are the verdict.changed messages of reviews published on
// fh so far (not the ones of stored hits).
func reviewBroadcasts(t *testing.T, fh *pluginsdktest.FakeHost) (out []pluginsdktest.PublishedMessage) {
	t.Helper()
	for _, m := range fh.Published() {
		var msg verdictChanged
		if m.Topic != TopicVerdictChanged {
			continue
		}
		if err := json.Unmarshal(m.Payload, &msg); err != nil {
			t.Fatal(err)
		}
		if !msg.Stored {
			out = append(out, m)
		}
	}
	return out
}

// deliverLastReview hands the newest review broadcast of fh to the node h.
func deliverLastReview(t *testing.T, fh *pluginsdktest.FakeHost, h *pluginsdktest.Harness) {
	t.Helper()
	pub := reviewBroadcasts(t, fh)
	if len(pub) == 0 {
		t.Fatal("no review broadcast")
	}
	if err := h.Deliver(TopicVerdictChanged, pub[len(pub)-1].Payload, "node-1"); err != nil {
		t.Fatal(err)
	}
}

// storedBroadcasts are the verdict.changed messages of stored hits published
// on fh so far, and the keys they name.
func storedBroadcasts(t *testing.T, fh *pluginsdktest.FakeHost) (out []pluginsdktest.PublishedMessage, keys []string) {
	t.Helper()
	for _, m := range fh.Published() {
		var msg verdictChanged
		if m.Topic != TopicVerdictChanged {
			continue
		}
		if err := json.Unmarshal(m.Payload, &msg); err != nil {
			t.Fatal(err)
		}
		if msg.Stored {
			out, keys = append(out, m), append(keys, msg.Keys...)
		}
	}
	return out, keys
}

// flowScope is the scope of the cache keys of a flow on the node p, under
// the clear counter of its snapshot.
func flowScope(p *Plugin, flow int64) string {
	snap := p.snap.Load()
	return snap.scopeOf(snap.flows[flow])
}

// openAIFlow sets up the flow most tests run: one OpenAI auditor on the
// upstream base, bound to group 9.
func openAIFlow(t *testing.T, h *pluginsdktest.Harness, base string) int64 {
	t.Helper()
	return setupFlow(t, h, base, []int64{9}, CombineAny, []string{AuditorOpenAI})
}

// hashOf reads a segment hash as a record's trace names it.
func hashOf(t *testing.T, s string) (key [32]byte) {
	t.Helper()
	if n, err := hex.Decode(key[:], []byte(s)); err != nil || n != len(key) {
		t.Fatalf("%q is not a hash", s)
	}
	return key
}

// cachedHit is a hit of the verdict cache with its keys there: the id of its
// hit set, its entry and, in the order of the set, its segments and their
// keys.
type cachedHit struct {
	id      string
	hitKey  string
	segs    [][32]byte
	segKeys []string
}

func newCachedHit(t *testing.T, scope, id string, segs []string) cachedHit {
	t.Helper()
	hit := cachedHit{id: id, hitKey: hitKeyOf(scope, id)}
	for _, seg := range segs {
		hit.segs, hit.segKeys = append(hit.segs, hashOf(t, seg)), append(hit.segKeys, segKeyHex(scope, seg))
	}
	return hit
}

// hitOf is the hit set a record names (Trace.Cache), under scope.
func hitOf(t *testing.T, scope string, rec EventListItem) cachedHit {
	t.Helper()
	c := traceOf(t, rec).Cache
	if c == nil || c.Key == "" {
		t.Fatalf("record %s names no hit set: %s", rec.RequestID, rec.Trace)
	}
	return newCachedHit(t, scope, c.Key, c.Segs)
}

// hitInKV is the one hit the KV holds under scope, for a test that needs
// its keys and not its record.
func hitInKV(t *testing.T, fh *pluginsdktest.FakeHost, scope string) cachedHit {
	t.Helper()
	keys := kvKeys(t, fh, "h:"+scope+":")
	if len(keys) != 1 {
		t.Fatalf("hit entries under %s = %v, want one", scope, keys)
	}
	raw, _ := kvValue(t, fh, keys[0])
	var hit storedHit
	if err := json.Unmarshal(raw, &hit); err != nil {
		t.Fatalf("hit entry %s: %v", keys[0], err)
	}
	return newCachedHit(t, scope, strings.TrimPrefix(keys[0], "h:"+scope+":"), hit.Keys)
}

// otherHit makes a hit of other content (name tells the calls apart), of one
// segment of its own; key is its hit entry.
func otherHit(scope, name string, at int64) (hit storedHit, key string) {
	seg := sha256.Sum256([]byte("other content of " + name))
	hit = storedHit{RequestID: "other", Keys: hexKeys([][32]byte{seg}), Trace: Trace{Final: Hit, Decider: 0}, At: at}
	return hit, hitKeyOf(scope, hitIDOf(hit.Keys))
}

// askNow is the reading of a request that asks the cache now (the lookup of
// the run whose verdicts a test stores by hand).
func askNow(p *Plugin) reading { return p.cache.Load().reading(p.now()) }

// memoryValue is the value a node's memory holds for a segment key, as it
// stands there; nil when there is none.
func memoryValue(p *Plugin, key string) []byte {
	cache := p.cache.Load()
	cache.mu.Lock()
	defer cache.mu.Unlock()
	if el, ok := cache.items[key]; ok {
		return el.Value.(*cacheEntry).val
	}
	return nil
}

// review reviews records on the node h (POST /events/review) and returns how
// many were updated and how many of them the verdict cache was synced for.
func review(t *testing.T, h *pluginsdktest.Harness, status string, ids ...int64) (updated, synced int) {
	t.Helper()
	return reviewAnswer(t, h.Do("POST", "/events/review", nil, map[string]any{"ids": ids, "status": status}))
}

// reviewAsync is review in the background, for a review that has to wait:
// reviewAnswer reads its answer.
func reviewAsync(h *pluginsdktest.Harness, status string, ids ...int64) <-chan *pluginv1.HTTPResponse {
	out := make(chan *pluginv1.HTTPResponse, 1)
	go func() {
		out <- h.Do("POST", "/events/review", nil, map[string]any{"ids": ids, "status": status})
	}()
	return out
}

func reviewAnswer(t *testing.T, resp *pluginv1.HTTPResponse) (updated, synced int) {
	t.Helper()
	out := decodeData[struct {
		Updated int `json:"updated"`
		Synced  int `json:"cache_synced"`
	}](t, resp)
	return out.Updated, out.Synced
}

// clearCache clears the verdict cache on the node h (POST
// /verdict-cache/clear) and returns the new clear counter.
func clearCache(t *testing.T, h *pluginsdktest.Harness) int64 {
	t.Helper()
	return decodeData[map[string]int64](t, h.Do("POST", "/verdict-cache/clear", nil, nil))["epoch"]
}

// emptyMemory replaces the memory cache of a node with an empty one: what
// the node knows from then on, it reads from the KV, like a node that has
// never seen the content.
func emptyMemory(p *Plugin) { p.cache.Store(newLRU(1000)) }

// queuedJob is the job of req as the hook queues it under post timing: a
// test runs it later with runPost, when the worker would.
func queuedJob(t *testing.T, p *Plugin, flow int64, req *pluginv1.GatewayRequestHookRequest) *moderation {
	t.Helper()
	snap := p.snap.Load()
	m, early := p.admit(context.Background(), p.cfg.Load(), req, snap, snap.flows[flow], flowMatch{}, requestModel(req))
	if early != nil || m == nil || m.timing != TimingPost {
		t.Fatalf("admit = %+v, %+v", m, early)
	}
	m.queued = p.now()
	return m
}

// The requests for newPairMod: the system prompt (A) and the user message
// (B) of pairWhole hit together and pass apart - A beside other text in
// pairFirst, B alone in pairLast.
const (
	protoAnthropic = "anthropic.messages"
	pairWhole      = `{"system":"alpha rule","messages":[{"role":"user","content":"beta ask"}]}`
	pairFirst      = `{"system":"alpha rule","messages":[{"role":"user","content":"a harmless sentence"}]}`
	pairLast       = `{"messages":[{"role":"user","content":"beta ask"}]}`
)

// newPairMod serves /v1/moderations: "sexual" scores 0.99 only when the
// input holds both "alpha" and "beta".
func newPairMod(t *testing.T) (base string, calls *atomic.Int64) {
	base, calls, _ = newHeldPairMod(t)
	return base, calls
}

// newHeldPairMod is newPairMod with a way to keep the calls for a pair (an
// input with both "alpha" and "beta") from being answered: hold makes the
// ones that come in from then on wait until release is called (the end of
// the test at the latest), each reported on arrived.
func newHeldPairMod(t *testing.T) (base string, calls *atomic.Int64, hold func() (arrived <-chan struct{}, release func())) {
	calls = new(atomic.Int64)
	var mu sync.Mutex
	var gate chan struct{}
	var came chan struct{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		body, _ := io.ReadAll(r.Body)
		scores := map[string]float64{}
		for _, c := range OpenAICategories {
			scores[c] = 0.01
		}
		if strings.Contains(string(body), "alpha") && strings.Contains(string(body), "beta") {
			scores["sexual"] = 0.99
			mu.Lock()
			wait, tell := gate, came
			mu.Unlock()
			if wait != nil {
				tell <- struct{}{}
				<-wait
			}
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"model": "omni-mock", "results": []any{map[string]any{"category_scores": scores}}})
	}))
	t.Cleanup(srv.Close)
	hold = func() (<-chan struct{}, func()) {
		wait, tell := make(chan struct{}), make(chan struct{}, 64)
		mu.Lock()
		gate, came = wait, tell
		mu.Unlock()
		release := sync.OnceFunc(func() {
			mu.Lock()
			gate = nil
			mu.Unlock()
			close(wait)
		})
		t.Cleanup(release)
		return tell, release
	}
	return srv.URL, calls, hold
}

// longRequest is an anthropic request of n messages, each a segment of its
// own.
func longRequest(n int) string {
	msgs := make([]any, n)
	for i := range msgs {
		role := "user"
		if i%2 == 1 {
			role = "assistant"
		}
		msgs[i] = map[string]any{"role": role, "content": fmt.Sprintf("turn %03d of a long conversation", i)}
	}
	b, _ := json.Marshal(map[string]any{"messages": msgs})
	return string(b)
}

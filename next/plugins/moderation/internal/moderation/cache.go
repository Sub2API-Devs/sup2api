package moderation

import (
	"bytes"
	"cmp"
	"container/list"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"hash/fnv"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Verdict cache (CONTRACTS §72.4, §72.5 step 8; 0.8.0, new-api
// verdict_cache.go): what a flow decided about content is remembered for
// verdict_cache_days, in an in-memory LRU of cache_entries (and at most
// cacheMaxBytes) plus the host KV shared by all nodes.
//
//   - A segment (text piece or inline image) that passed in every chunk
//     holding it is stored as a pass and not sent again.
//   - A chunk that hit is stored as a hit of the set of segments it sent,
//     with the trace of its run. A later request holding the whole set is
//     decided by that hit without calling upstream (replay); a request with
//     only part of the set is moderated again.
//
// A segment key holds both: the time a pass was written and pointers to the
// newest maxSegHits hits the segment is part of (segValue). A pass never
// removes a pointer, and a hit whose whole set is in the request decides
// before any pass is looked at - otherwise the parts of a hit set, passing
// one by one in other requests, would turn the hit into a pass.
//
// Keys carry a scope: the clear counter (config_state.cache_epoch), the flow
// and the fingerprint of everything that decides the flow's verdicts
// (snapshot.go fingerprint), so clearing the cache or changing the flow's
// auditors makes the old entries unreachable; they expire on their own.
// Runs that errored, passes with a skipped stage and chunks with URL images
// are never stored. KV errors are never fatal: the content is moderated
// again.
//
// The KV has no compare-and-set: a segment key is changed by reading it,
// editing and writing it back. Within a node that is serialized per key
// (kvLock); between nodes two writers of one key within milliseconds can
// lose one of the edits. A lost pass costs an audit. A lost pointer costs a
// replay, and the hit stays reachable through its other segments.

// kvNamespace holds the verdict cache. The namespace of the pass cache
// before 0.8.0, "pass", is no longer used by the cache.
const kvNamespace = "verdict"

// KV lookups per request: the misses of the memory cache, at most
// kvLookupMax of them, kvLookupWorkers at a time, all within kvLookupBudget;
// writes the same way in the background.
const (
	kvLookupMax     = 64
	kvLookupWorkers = 8
	kvLookupBudget  = 200 * time.Millisecond
	kvWriteBudget   = 2 * time.Second
	// A review sync gets kvSyncBudget for every kvLookupMax keys it changes,
	// at most kvSyncBudgetMax.
	kvSyncBudget    = time.Second
	kvSyncBudgetMax = 10 * time.Second
	// maxHitBytes: a cached hit larger than this is not stored (the KV takes
	// values up to 64 KiB).
	maxHitBytes = 60 << 10
	// maxSegHits: the pointers a segment key keeps, the newest ones. A
	// segment many hit sets share (a system prompt) loses the pointers to
	// the older sets; those stay reachable through their other segments. A
	// hit is lost to the cache only when every segment of its set was since
	// part of more than maxSegHits newer hit sets.
	maxSegHits = 8
	// verdictBroadcastBytes caps the keys of one verdict.changed broadcast.
	verdictBroadcastBytes = 48 << 10
	// cacheMaxBytes bounds the memory cache beside cache_entries (a cached
	// hit is up to maxHitBytes of JSON, and larger decoded). The plugin
	// process is limited to 512 MB (CONTRACTS §72.2), of which the requests
	// in progress take 128 MB by default (max_inflight_mb) and the image
	// decoders 112 MB (jevNormalizeMemory); with 64 MB here about 200 MB are
	// left for the queue, the garbage the collector has not yet freed and
	// everything else. At about 250 bytes for a segment entry that is some
	// 250,000 entries: a larger cache_entries is bounded by the bytes.
	cacheMaxBytes = 64 << 20
	// cacheEntryOverhead is the memory of an entry beside its key and value
	// (list element, map slot, headers), roughly.
	cacheEntryOverhead = 128
	// tombstoneTTL: how long a key a review changed is neither loaded into
	// memory nor written by a run (lru.kill): longer than any lookup or
	// background write that started before the review can last.
	tombstoneTTL = 2 * kvWriteBudget
)

// ---------------------------------------------------------------- segment values

// segValue is what a segment key holds: the time a pass of the segment was
// written (0 = none) and pointers to the cached hits whose set the segment
// belongs to, newest first, at most maxSegHits. Every part expires on its
// own, the cache TTL after its write.
//
// Stored as space-separated tokens, "p<unix>" and "h<hit id>@<unix>":
//
//	p1762770000 h9f2c…@1762770000 h41aa…@1762683600
//
// Tokens that do not read are ignored. That includes the values of the first
// builds of 0.8.0, "p" and "h<hit id>" without a time: the segment is
// unknown and moderated again.
type segValue struct {
	pass int64
	hits []hitRef
}

type hitRef struct {
	id string
	at int64
}

func parseSeg(raw []byte) segValue {
	var v segValue
	for _, tok := range strings.Fields(string(raw)) {
		switch tok[0] {
		case 'p':
			if at, err := strconv.ParseInt(tok[1:], 10, 64); err == nil && at > 0 {
				v.pass = max(v.pass, at)
			}
		case 'h':
			id, ts, _ := strings.Cut(tok[1:], "@")
			if at, err := strconv.ParseInt(ts, 10, 64); err == nil && at > 0 && isHexHash(id) {
				v.addHit(id, at)
			}
		}
	}
	return v
}

func (v segValue) encode() []byte {
	var b []byte
	if v.pass > 0 {
		b = strconv.AppendInt(append(b, 'p'), v.pass, 10)
	}
	for _, h := range v.hits {
		if len(b) > 0 {
			b = append(b, ' ')
		}
		b = append(append(append(b, 'h'), h.id...), '@')
		b = strconv.AppendInt(b, h.at, 10)
	}
	return b
}

func (v segValue) empty() bool { return v.pass == 0 && len(v.hits) == 0 }

// expires is when the last part of the value expires.
func (v segValue) expires(ttl time.Duration) time.Time {
	at := v.pass
	if len(v.hits) > 0 {
		at = max(at, v.hits[0].at)
	}
	return time.Unix(at, 0).Add(ttl)
}

// addHit adds a pointer (or renews it), keeping the newest maxSegHits; of
// two pointers of the same second the one added later comes first.
func (v *segValue) addHit(id string, at int64) {
	for i, h := range v.hits {
		if h.id == id {
			at = max(at, h.at)
			v.hits = slices.Delete(v.hits, i, i+1)
			break
		}
	}
	i := 0
	for i < len(v.hits) && v.hits[i].at > at {
		i++
	}
	v.hits = slices.Insert(v.hits, i, hitRef{id, at})
	if len(v.hits) > maxSegHits {
		v.hits = v.hits[:maxSegHits]
	}
}

func (v *segValue) dropHit(id string) {
	v.hits = slices.DeleteFunc(v.hits, func(h hitRef) bool { return h.id == id })
}

// merge adds what o holds.
func (v *segValue) merge(o segValue) {
	v.pass = max(v.pass, o.pass)
	for _, h := range slices.Backward(o.hits) {
		v.addHit(h.id, h.at)
	}
}

// prune drops the parts that expired.
func (v *segValue) prune(now time.Time, ttl time.Duration) {
	if !liveAt(v.pass, now, ttl) {
		v.pass = 0
	}
	v.hits = slices.DeleteFunc(v.hits, func(h hitRef) bool { return !liveAt(h.at, now, ttl) })
}

// liveAt reports whether something written at the unix time at is still
// kept: a verdict is never kept beyond the TTL of its write, wherever it is
// read from.
func liveAt(at int64, now time.Time, ttl time.Duration) bool {
	return at > 0 && now.Before(time.Unix(at, 0).Add(ttl))
}

// segEdit changes the value of a segment key.
type segEdit func(*segValue)

func passAt(at int64) segEdit { return func(v *segValue) { v.pass = max(v.pass, at) } }

func dropPass(v *segValue) { v.pass = 0 }

func pointTo(id string, at int64) segEdit { return func(v *segValue) { v.addHit(id, at) } }

func unpoint(id string) segEdit { return func(v *segValue) { v.dropHit(id) } }

// segOps collects the edits of segment keys, the keys in the order they came
// up: every key is read and written once, whatever number of edits it gets.
type segOps struct {
	keys  []string
	edits map[string][]segEdit
}

func (o *segOps) add(key string, edits ...segEdit) {
	if o.edits == nil {
		o.edits = map[string][]segEdit{}
	}
	if _, ok := o.edits[key]; !ok {
		o.keys = append(o.keys, key)
	}
	o.edits[key] = append(o.edits[key], edits...)
}

// ---------------------------------------------------------------- memory

// cacheEntry is a segment key with its value (val, the form the KV holds) or
// a hit key with the decoded hit, which is never modified once stored.
type cacheEntry struct {
	key     string
	val     []byte
	hit     *storedHit
	size    int64
	expires time.Time
}

// lru is the memory cache: at most max entries and maxBytes bytes (the
// estimate of entrySize), the least recently used dropped first.
//
// dead holds the tombstones of the keys a review changed (kill): until its
// time nothing is stored under the key except through put, so a lookup that
// read the old value from the KV, or a run that finished meanwhile, cannot
// bring it back.
type lru struct {
	mu       sync.Mutex
	max      int
	maxBytes int64
	bytes    int64
	ll       *list.List
	items    map[string]*list.Element
	dead     map[string]time.Time
}

func newLRU(max int) *lru {
	return &lru{max: max, maxBytes: cacheMaxBytes, ll: list.New(), items: make(map[string]*list.Element, 256), dead: map[string]time.Time{}}
}

// entry returns the live entry of key, the most recently used now. c.mu is
// held.
func (c *lru) entry(key string, now time.Time) *cacheEntry {
	el, ok := c.items[key]
	if !ok {
		return nil
	}
	e := el.Value.(*cacheEntry)
	if !now.Before(e.expires) {
		c.remove(el)
		return nil
	}
	c.ll.MoveToFront(el)
	return e
}

// set stores an entry and drops the least recently used ones beyond the
// limits (the new one too when it alone is beyond them). c.mu is held.
func (c *lru) set(e *cacheEntry) {
	if el, ok := c.items[e.key]; ok {
		c.bytes += e.size - el.Value.(*cacheEntry).size
		el.Value = e
		c.ll.MoveToFront(el)
	} else {
		c.items[e.key] = c.ll.PushFront(e)
		c.bytes += e.size
	}
	for c.ll.Len() > 0 && (c.ll.Len() > c.max || c.bytes > c.maxBytes) {
		c.remove(c.ll.Back())
	}
}

func (c *lru) remove(el *list.Element) {
	e := c.ll.Remove(el).(*cacheEntry)
	delete(c.items, e.key)
	c.bytes -= e.size
}

func (c *lru) isDead(key string, now time.Time) bool { return now.Before(c.dead[key]) }

// get returns the value of a segment key.
func (c *lru) get(key string, now time.Time) ([]byte, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if e := c.entry(key, now); e != nil {
		return e.val, true
	}
	return nil, false
}

// getHit returns the hit of a hit key; nil when there is none.
func (c *lru) getHit(key string, now time.Time) *storedHit {
	c.mu.Lock()
	defer c.mu.Unlock()
	if e := c.entry(key, now); e != nil {
		return e.hit
	}
	return nil
}

// put stores val, which is not modified afterwards.
func (c *lru) put(key string, val []byte, expires time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.set(&cacheEntry{key: key, val: val, size: int64(len(key) + len(val) + cacheEntryOverhead), expires: expires})
}

// putHit stores a decoded hit whose JSON has bodyLen bytes (decoded it takes
// about twice that); false while the key is tombstoned.
func (c *lru) putHit(key string, hit *storedHit, bodyLen int, expires, now time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.isDead(key, now) {
		return false
	}
	c.set(&cacheEntry{key: key, hit: hit, size: int64(len(key) + 2*bodyLen + cacheEntryOverhead), expires: expires})
	return true
}

// editSeg applies edit to the value of a segment key (empty when there is
// none) and stores the result, or removes the key when nothing is left.
// Nothing happens while the key is tombstoned.
func (c *lru) editSeg(key string, now time.Time, ttl time.Duration, edit segEdit) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.isDead(key, now) {
		return
	}
	var v segValue
	if e := c.entry(key, now); e != nil {
		v = parseSeg(e.val)
	}
	edit(&v)
	v.prune(now, ttl)
	if v.empty() {
		if el, ok := c.items[key]; ok {
			c.remove(el)
		}
		return
	}
	val := v.encode()
	c.set(&cacheEntry{key: key, val: val, size: int64(len(key) + len(val) + cacheEntryOverhead), expires: v.expires(ttl)})
}

func (c *lru) del(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[key]; ok {
		c.remove(el)
	}
}

// kill drops the keys and tombstones them until the given time.
func (c *lru) kill(keys []string, until, now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for k, t := range c.dead {
		if !now.Before(t) {
			delete(c.dead, k)
		}
	}
	for _, k := range keys {
		if el, ok := c.items[k]; ok {
			c.remove(el)
		}
		c.dead[k] = until
	}
}

// tombstoned reports whether a review changed the key a moment ago.
func (c *lru) tombstoned(key string, now time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.isDead(key, now)
}

func (c *lru) len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.ll.Len()
}

// size is the estimated memory of the entries, in bytes.
func (c *lru) size() int64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.bytes
}

// ---------------------------------------------------------------- keys

// cacheScope is the key scope of a flow's verdicts under a clear counter:
// "e3:7:9f2c…".
func cacheScope(epoch int64, f *liveFlow) string {
	return "e" + strconv.FormatInt(epoch, 10) + ":" + strconv.FormatInt(f.ID, 10) + ":" + f.fp
}

// scopeOf is the key scope of a flow's verdicts in the snapshot.
func (s *snapshot) scopeOf(f *liveFlow) string { return cacheScope(s.cacheEpoch, f) }

// segKeyOf is the key of one segment's verdict.
func segKeyOf(scope string, h [32]byte) string { return segKeyHex(scope, hex.EncodeToString(h[:])) }

func segKeyHex(scope, seg string) string { return "s:" + scope + ":" + seg }

// hitKeyOf is the key of a cached hit.
func hitKeyOf(scope, id string) string { return "h:" + scope + ":" + id }

// hitID identifies the set of segments of a cached hit.
func hitID(keys [][32]byte) string {
	sorted := slices.Clone(keys)
	slices.SortFunc(sorted, func(a, b [32]byte) int { return bytes.Compare(a[:], b[:]) })
	h := sha256.New()
	for _, k := range sorted {
		h.Write(k[:])
	}
	return hex.EncodeToString(h.Sum(nil))
}

func hexKeys(keys [][32]byte) []string {
	out := make([]string, len(keys))
	for i, k := range keys {
		out[i] = hex.EncodeToString(k[:])
	}
	return out
}

// isHexHash reports whether s is the hex form of a sha256 (what a record's
// trace.cache may put into a key).
func isHexHash(s string) bool {
	if len(s) != 2*sha256.Size {
		return false
	}
	_, err := hex.DecodeString(s)
	return err == nil
}

// hitIDOf is hitID of hex segment hashes; "" when one is not a hash.
func hitIDOf(segs []string) string {
	keys := make([][32]byte, len(segs))
	for i, s := range segs {
		if !isHexHash(s) {
			return ""
		}
		_, _ = hex.Decode(keys[i][:], []byte(s))
	}
	return hitID(keys)
}

// storedHit is a cached hit of one chunk: the segments it sent, the run that
// decided it and the request it came from. It is the value of a hit key, as
// JSON; the memory cache keeps it decoded.
type storedHit struct {
	RequestID string   `json:"r"`
	Keys      []string `json:"k"` // segment hashes (hex), in request order
	Trace     Trace    `json:"t"` // the chunk's own run; Chunk, Chunks, Input, Cache and InputMessageDropped cleared
	At        int64    `json:"at"`
}

// decodeHit reads a cached hit; nil when it is unreadable or older than ttl
// (an entry is never kept beyond the TTL of its write).
func decodeHit(raw []byte, now time.Time, ttl time.Duration) *storedHit {
	var hit storedHit
	if json.Unmarshal(raw, &hit) != nil || hit.Trace.Final != Hit || len(hit.Keys) == 0 || !now.Before(hit.expires(ttl)) {
		return nil
	}
	return &hit
}

func (h *storedHit) expires(ttl time.Duration) time.Time { return time.Unix(h.At, 0).Add(ttl) }

// encodeHit is the id and the stored JSON of a hit; "" when its segments are
// not hashes or it is too large to store.
func encodeHit(hit *storedHit) (id string, body []byte) {
	if id = hitIDOf(hit.Keys); id == "" || len(hit.Keys) == 0 {
		return "", nil
	}
	body, err := json.Marshal(hit)
	if err != nil || len(body) > maxHitBytes {
		return "", nil
	}
	return id, body
}

// ---------------------------------------------------------------- lookup

// verdicts is what the cache knows about a request's segments.
type verdicts struct {
	passed map[[32]byte]bool
	hit    *storedHit // a cached hit whose segments are all in the request; read only
	hitID  string
}

// lookupVerdicts reads the cached verdicts of the segments of a request (in
// request order) under scope: memory first, then (useKV) the KV for the
// misses within the lookup budget. The first cached hit whose whole segment
// set is in the request is returned for replay - before any pass is looked
// at, so a hit set whose segments passed one by one elsewhere is still a
// hit; otherwise the segments that passed. Anything the cache cannot answer
// is unknown and moderated again.
func (p *Plugin) lookupVerdicts(scope string, keys [][32]byte, useKV bool) verdicts {
	ttl := p.cfg.Load().cacheTTL
	v := verdicts{passed: map[[32]byte]bool{}}
	if ttl <= 0 || len(keys) == 0 {
		return v
	}
	now := p.now()
	cache := p.cache.Load()
	useKV = useKV && p.host != nil
	kctx, cancel := context.WithTimeout(p.bg, kvLookupBudget)
	defer cancel()

	segs := make([]segValue, len(keys))
	var misses []int
	for i, h := range keys {
		if raw, ok := cache.get(segKeyOf(scope, h), now); ok {
			segs[i] = parseSeg(raw)
		} else {
			misses = append(misses, i)
		}
	}
	if useKV && len(misses) > 0 {
		if len(misses) > kvLookupMax {
			misses = misses[len(misses)-kvLookupMax:] // the newest content
		}
		names := make([]string, len(misses))
		for j, i := range misses {
			names[j] = segKeyOf(scope, keys[i])
		}
		for j, raw := range p.kvGet(kctx, names) {
			if raw == nil {
				continue
			}
			loaded := parseSeg(raw)
			segs[misses[j]] = loaded
			// Into memory with the times of its writes (not a fresh TTL),
			// beside what a run on this node stored meanwhile; not at all
			// when a review changed the key since this lookup read it.
			cache.editSeg(names[j], now, ttl, func(v *segValue) { v.merge(loaded) })
		}
	}

	// The hits the segments point to, in request order, the newest first.
	var ids, missing []string
	hits := map[string]*storedHit{}
	for i := range segs {
		for _, ref := range segs[i].hits {
			if _, seen := hits[ref.id]; seen || !liveAt(ref.at, now, ttl) {
				continue
			}
			hit := cache.getHit(hitKeyOf(scope, ref.id), now)
			if hit != nil && !liveAt(hit.At, now, ttl) {
				hit = nil
			}
			hits[ref.id] = hit
			ids = append(ids, ref.id)
			if hit == nil {
				missing = append(missing, ref.id)
			}
		}
	}
	if useKV && len(missing) > 0 {
		missing = missing[:min(len(missing), kvLookupMax)]
		names := make([]string, len(missing))
		for j, id := range missing {
			names[j] = hitKeyOf(scope, id)
		}
		for j, raw := range p.kvGet(kctx, names) {
			if hit := decodeHit(raw, now, ttl); hit != nil {
				hits[missing[j]] = hit
				cache.putHit(names[j], hit, len(raw), hit.expires(ttl), now)
			}
		}
	}
	if len(ids) > 0 {
		have := make(map[string]bool, len(keys))
		for _, k := range keys {
			have[hex.EncodeToString(k[:])] = true
		}
		for _, id := range ids {
			hit := hits[id]
			if hit != nil && !slices.ContainsFunc(hit.Keys, func(k string) bool { return !have[k] }) {
				v.hit, v.hitID = hit, id
				return v
			}
		}
	}
	for i := range segs {
		if liveAt(segs[i].pass, now, ttl) {
			v.passed[keys[i]] = true
		}
	}
	return v
}

// ---------------------------------------------------------------- KV

// kvRun calls fn(i) for every i below n, kvLookupWorkers at a time, and
// stops handing out work when ctx ends. ok[i] reports that fn(i) ran and
// returned no error. A run with a failure or one that stopped early counts
// one kv error.
func (p *Plugin) kvRun(ctx context.Context, n int, fn func(i int) error) (ok []bool) {
	ok = make([]bool, n)
	work := make(chan int)
	var wg sync.WaitGroup
	for range min(kvLookupWorkers, n) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range work {
				ok[i] = fn(i) == nil // every i is handed out once
			}
		}()
	}
	for i := range n {
		if ctx.Err() != nil {
			break
		}
		work <- i
	}
	close(work)
	wg.Wait()
	if slices.Contains(ok, false) {
		p.stats.kvErrors.Add(1)
	}
	return ok
}

// kvGet reads keys from the KV until ctx ends; out[i] is nil for a key that
// is absent or was not read: the keys involved stay unknown.
func (p *Plugin) kvGet(ctx context.Context, keys []string) [][]byte {
	out := make([][]byte, len(keys))
	p.kvRun(ctx, len(keys), func(i int) error {
		val, found, err := p.host.KV().Get(ctx, kvNamespace, keys[i])
		if err == nil && found {
			out[i] = val
		}
		return err
	})
	return out
}

// kvLock serializes this node's changes of a cache key in the KV.
func (p *Plugin) kvLock(key string) *sync.Mutex {
	h := fnv.New32a()
	_, _ = h.Write([]byte(key))
	return &p.kvMu[h.Sum32()%uint32(len(p.kvMu))]
}

// kvSetHit stores a hit entry (body nil deletes it). guarded: not while a
// review tombstoned the key on this node; stored reports whether it was
// written.
func (p *Plugin) kvSetHit(ctx context.Context, key string, body []byte, ttl time.Duration, guarded bool) (stored bool, err error) {
	mu := p.kvLock(key)
	mu.Lock()
	defer mu.Unlock()
	if guarded && p.cache.Load().tombstoned(key, p.now()) {
		return false, nil
	}
	if body == nil {
		return true, p.host.KV().Delete(ctx, kvNamespace, key)
	}
	err = p.host.KV().Set(ctx, kvNamespace, key, body, ttl)
	return err == nil, err
}

// kvEditSeg reads a segment key, applies the edits and writes it back (or
// deletes it when nothing is left). guarded as in kvSetHit.
func (p *Plugin) kvEditSeg(ctx context.Context, key string, edits []segEdit, ttl time.Duration, guarded bool) error {
	mu := p.kvLock(key)
	mu.Lock()
	defer mu.Unlock()
	now := p.now()
	if guarded && p.cache.Load().tombstoned(key, now) {
		return nil
	}
	raw, found, err := p.host.KV().Get(ctx, kvNamespace, key)
	if err != nil {
		return err
	}
	v := parseSeg(raw)
	for _, edit := range edits {
		edit(&v)
	}
	v.prune(now, ttl)
	if v.empty() {
		if !found {
			return nil
		}
		return p.host.KV().Delete(ctx, kvNamespace, key)
	}
	// The key lives as long as its newest part (the KV counts whole seconds,
	// and 0 would be for ever).
	return p.host.KV().Set(ctx, kvNamespace, key, v.encode(), max(v.expires(ttl).Sub(now), time.Second))
}

// ---------------------------------------------------------------- store

// storeVerdicts stores the verdicts of a run under scope: the segments that
// passed and the chunks that hit, in memory at once and in the KV in the
// background (the hook never waits for the KV). The KV gets, per run, the
// newest kvLookupMax passes and, per hit, the pointers of its newest
// kvLookupMax segments, and no pointer to a hit whose entry was not written.
//
// A key a review changed within tombstoneTTL is left alone, here and (as far
// as this node knows of the review) in the KV: a run that finished around
// the review must not bring back what the review removed. (The tombstones
// go with the memory cache when cache_entries is changed.) What stays open:
// a background write of this node that lands in the KV after another node's
// review wrote it and before that node's verdict.changed arrives here (or
// when it never does) restores the hit until it expires; and a lookup can
// still replay from memory until the broadcast arrives.
func (p *Plugin) storeVerdicts(c *config, scope string, passes [][32]byte, hits []storedHit) {
	ttl := c.cacheTTL
	if ttl <= 0 || len(passes)+len(hits) == 0 {
		return
	}
	now := p.now()
	cache := p.cache.Load()
	type entry struct {
		key, id string
		body    []byte
		at      int64
		segs    []string
	}
	var entries []entry
	for i := range hits {
		hit := &hits[i]
		id, body := encodeHit(hit)
		if id == "" {
			continue
		}
		e := entry{key: hitKeyOf(scope, id), id: id, body: body, at: hit.At}
		if !cache.putHit(e.key, hit, len(body), hit.expires(ttl), now) {
			continue
		}
		for j, seg := range hit.Keys {
			key := segKeyHex(scope, seg)
			cache.editSeg(key, now, ttl, pointTo(id, hit.At))
			if j >= len(hit.Keys)-kvLookupMax {
				e.segs = append(e.segs, key)
			}
		}
		entries = append(entries, e)
	}
	at := now.Unix()
	var passKeys []string
	for i, h := range passes {
		key := segKeyOf(scope, h)
		cache.editSeg(key, now, ttl, passAt(at))
		if i >= len(passes)-kvLookupMax {
			passKeys = append(passKeys, key)
		}
	}
	if p.host == nil || len(entries)+len(passKeys) == 0 {
		return
	}
	go func() {
		kctx, cancel := context.WithTimeout(context.Background(), kvWriteBudget)
		defer cancel()
		stored := make([]bool, len(entries))
		p.kvRun(kctx, len(entries), func(i int) (err error) {
			stored[i], err = p.kvSetHit(kctx, entries[i].key, entries[i].body, ttl, true)
			return err
		})
		var ops segOps
		for i, e := range entries {
			if stored[i] {
				for _, key := range e.segs {
					ops.add(key, pointTo(e.id, e.at))
				}
			}
		}
		for _, key := range passKeys {
			ops.add(key, passAt(at))
		}
		p.kvRun(kctx, len(ops.keys), func(i int) error {
			return p.kvEditSeg(kctx, ops.keys[i], ops.edits[ops.keys[i]], ttl, true)
		})
	}()
}

// ---------------------------------------------------------------- clear

// clearVerdictCache is POST /verdict-cache/clear: every cached verdict is
// dropped, so content is moderated again under the current configuration.
// The clear counter is part of every key: the entries in the KV are not
// deleted one by one, they are no longer read and expire. config_version is
// bumped too, so the other nodes pick the new counter up with the broadcast
// or their next poll. Runs in progress and queued jobs notice the new
// counter when they come to the cache (runPost, settleVerdicts).
func (p *Plugin) clearVerdictCache(ctx context.Context, _ *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	var epoch int64
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		return tx.QueryRow(ctx, `UPDATE config_state SET cache_epoch = cache_epoch + 1, config_version = config_version + 1
			WHERE id = 1 RETURNING cache_epoch`).Scan(&epoch)
	})
	if err != nil {
		return nil, err
	}
	p.cache.Store(newLRU(p.cfg.Load().CacheEntries))
	p.configChanged(ctx)
	return pluginsdk.DataResponse(map[string]any{"epoch": epoch}), nil
}

// ---------------------------------------------------------------- review sync

// reviewedHit is a cached hit the review of one or more records changes (a
// hit and its replays name the same one).
type reviewedHit struct {
	key, id string
	segs    []string // segment keys
	body    []byte   // confirmed: the entry to store
	at      int64
	pass    bool // false_positive: the segments pass
	records int
	failed  bool
}

// syncReviewed brings the cache in line with the review of suspicious
// records (new-api SyncReviewedBlocks), for the records whose trace names
// the hit set of their verdict chunk (trace.cache):
//
//   - false_positive: the hit is deleted and every segment of the set is
//     stored as a pass (content the admin found fine as a whole is fine in
//     its parts) - the passes only while the flow still has the fingerprint
//     the record was judged under: the current configuration never judged
//     that content, and the set names what that run sent, which another
//     configuration may not (an image no auditor took then);
//   - confirmed: the hit is stored again from the record's trace and the
//     passes of its segments are dropped - only under that fingerprint too;
//   - pending: the hit, its pointers and the passes of its segments are
//     deleted, so the content is moderated again.
//
// The scope is the record's flow in the current snapshot; records of a flow
// that is gone or disabled are skipped. Records naming the same hit change
// it once (the last one decides), and every key is written once.
//
// The KV is what the nodes share, so it decides: it is written first,
// synchronously within the budget, and the result is the number of records
// whose every write succeeded. Memory is never given the new values: this
// node tombstones every key it tried to change (before the writes, so its
// own runs in progress do not write over them, and again after), and the
// other nodes do the same on verdict.changed (best effort). All nodes then
// read the keys from the KV, whatever it holds - after a failed write the
// old verdict on every node rather than the new one on this node only. A
// record whose writes failed in part is not counted; reviewing it again
// repeats them.
func (p *Plugin) syncReviewed(ctx context.Context, ids []int64, status string) int {
	c := p.cfg.Load()
	ttl := c.cacheTTL
	if ttl <= 0 || len(ids) == 0 || p.host == nil {
		return 0
	}
	db, err := p.db(ctx)
	if err != nil {
		return 0
	}
	rows, err := db.Query(ctx, `SELECT request_id, flow_id, trace FROM events
		WHERE id = ANY($1) AND `+suspiciousResult+` AND trace IS NOT NULL ORDER BY id`, ids)
	if err != nil {
		p.log.Warn("moderation: review cache sync failed", "error", err.Error())
		return 0
	}
	snap := p.snap.Load()
	at := p.now().Unix()
	var (
		hits   []*reviewedHit
		byKey  = map[string]*reviewedHit{}
		rid    string
		flowID int64
		raw    []byte
	)
	_, err = pgx.ForEachRow(rows, []any{&rid, &flowID, &raw}, func() error {
		var tr Trace
		if json.Unmarshal(raw, &tr) != nil || tr.Cache == nil || !isHexHash(tr.Cache.Key) ||
			len(tr.Cache.Segs) == 0 || slices.ContainsFunc(tr.Cache.Segs, func(s string) bool { return !isHexHash(s) }) {
			return nil
		}
		flow := snap.flows[flowID]
		if flow == nil {
			return nil
		}
		ci, scope := tr.Cache, snap.scopeOf(flow)
		var body []byte
		if status == "confirmed" {
			if ci.FP != flow.fp {
				return nil // judged under another configuration
			}
			// A replayed record ran in its source request.
			hit := storedHit{RequestID: cmp.Or(ci.SourceRequestID, rid), Keys: ci.Segs, Trace: tr, At: at}
			hit.Trace.Chunk, hit.Trace.Chunks, hit.Trace.Input, hit.Trace.Cache, hit.Trace.InputMessageDropped = 0, nil, nil, nil, ""
			b, err := json.Marshal(hit)
			if err != nil || len(b) > maxHitBytes {
				return nil
			}
			body = b
		}
		key := hitKeyOf(scope, ci.Key)
		h := byKey[key]
		if h == nil {
			h = &reviewedHit{key: key, id: ci.Key}
			byKey[key] = h
			hits = append(hits, h)
		}
		h.body, h.at, h.records = body, at, h.records+1
		h.pass = h.pass || (status == "false_positive" && ci.FP == flow.fp)
		h.segs = h.segs[:0]
		for _, seg := range ci.Segs {
			h.segs = append(h.segs, segKeyHex(scope, seg))
		}
		return nil
	})
	if err != nil {
		p.log.Warn("moderation: review cache sync failed", "error", err.Error())
	}
	if len(hits) == 0 {
		return 0
	}
	// Every key once.
	var keys []string
	users := map[string][]*reviewedHit{} // segment key -> the hits it belongs to
	for _, h := range hits {
		keys = append(keys, h.key)
		for _, seg := range h.segs {
			if users[seg] == nil {
				keys = append(keys, seg)
			}
			users[seg] = append(users[seg], h)
		}
	}
	budget := min(kvSyncBudget*time.Duration(1+len(keys)/kvLookupMax), kvSyncBudgetMax)
	cache := p.cache.Load()
	cache.kill(keys, p.now().Add(budget+tombstoneTTL), p.now())
	kctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), budget)
	defer cancel()

	// The hit entries first: no pointer is written to an entry that is not
	// there, and no pass beside a hit that could not be deleted.
	for i, ok := range p.kvRun(kctx, len(hits), func(i int) error {
		_, err := p.kvSetHit(kctx, hits[i].key, hits[i].body, ttl, false)
		return err
	}) {
		hits[i].failed = !ok
	}
	var ops segOps
	for _, h := range hits {
		if h.failed {
			continue
		}
		for _, seg := range h.segs {
			switch {
			case status == "confirmed":
				ops.add(seg, pointTo(h.id, h.at), dropPass)
			case status != "false_positive":
				ops.add(seg, unpoint(h.id), dropPass)
			case h.pass:
				ops.add(seg, unpoint(h.id), passAt(h.at))
			default:
				ops.add(seg, unpoint(h.id))
			}
		}
	}
	for i, ok := range p.kvRun(kctx, len(ops.keys), func(i int) error {
		return p.kvEditSeg(kctx, ops.keys[i], ops.edits[ops.keys[i]], ttl, false)
	}) {
		if !ok {
			for _, h := range users[ops.keys[i]] {
				h.failed = true
			}
		}
	}
	synced := 0
	for _, h := range hits {
		if !h.failed {
			synced += h.records
		}
	}
	cache.kill(keys, p.now().Add(tombstoneTTL), p.now())
	pctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), kvSyncBudget)
	defer cancel()
	p.publishVerdictChanged(pctx, keys)
	return synced
}

// verdictChanged is the payload of TopicVerdictChanged.
type verdictChanged struct {
	Keys []string `json:"keys"`
}

// publishVerdictChanged tells the other nodes which keys changed, in
// messages below the broadcast payload limit.
func (p *Plugin) publishVerdictChanged(ctx context.Context, changed []string) {
	send := func(keys []string) {
		payload, _ := json.Marshal(verdictChanged{Keys: keys})
		if err := p.host.Publish(ctx, TopicVerdictChanged, payload); err != nil {
			p.log.Warn("moderation: broadcast failed; other nodes may keep a reviewed verdict until it expires", "topic", TopicVerdictChanged, "error", err.Error())
		}
	}
	var keys []string
	size := 0
	for _, key := range changed {
		if size+len(key) > verdictBroadcastBytes && len(keys) > 0 {
			send(keys)
			keys, size = nil, 0
		}
		keys = append(keys, key)
		size += len(key) + 3 // quotes and comma
	}
	if len(keys) > 0 {
		send(keys)
	}
}

// onVerdictChanged drops the keys another node changed from this node's
// memory and tombstones them for tombstoneTTL: the next reads take them from
// the KV, and neither a lookup that read the old value before the review
// nor a run in progress stores it again.
func (p *Plugin) onVerdictChanged(_ context.Context, b pluginsdk.Broadcast) error {
	var msg verdictChanged
	if err := json.Unmarshal(b.Payload, &msg); err != nil {
		return nil // nothing to retry
	}
	now := p.now()
	p.cache.Load().kill(msg.Keys, now.Add(tombstoneTTL), now)
	return nil
}

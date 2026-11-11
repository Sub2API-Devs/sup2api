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
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// Verdict cache (CONTRACTS §72.4, §72.5 step 8; 0.8.0, new-api
// verdict_cache.go): what a flow decided about content is remembered for
// verdict_cache_days, in the host KV shared by all nodes and, as a cache of
// that, in an in-memory LRU of cache_entries (and at most cacheMaxBytes).
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
// The KV first, then memory (0.8.1). Memory is a cache of the KV and nothing
// more: a segment value (and likewise a hit entry) comes into memory when a
// lookup reads its key from the KV, or when a run on this node has written
// it to the KV - then as the value the KV holds from that write on - and is
// used as it is: a lookup that finds a value in memory does not ask the KV
// for it. It leaves memory when its parts have expired (each the cache TTL
// after its own write), when the LRU drops it (cache_entries,
// cacheMaxBytes), when a verdict.changed broadcast names its key, when the
// cache is cleared (the clear counter is part of every key) and with a
// restart. Nothing reads it again in between. Nothing is in memory that was
// not read from the KV or written to it: when the KV does not take the
// verdicts of a run, they are cached nowhere and the content is moderated
// again.
//
// Reading (lookupVerdicts): every segment of the request that is not in
// memory is read from the KV, and then every hit entry a live pointer names
// that is not in memory - all of them, in batch calls (kvRead: one call for
// up to kvSegUnit segment keys, one for up to kvHitUnit hit entries). The
// plugin sets no time limit and no cap: a lookup waits for the KV as long as
// its caller does - the hook call, which the core limits and a client that
// left ends; for a queued job the plugin itself, until it stops.
//
// Writing (storeVerdicts, writeVerdicts): after the hook has answered. The
// segment keys of the run are read from the KV, its passes and pointers are
// merged into what is there, the hit entries are written and then the
// segment keys; when all of that worked, the values that were written go
// into memory. Until then the cache does not know the verdicts: the same
// content sent again meanwhile is moderated again, and a hit is refused
// again and counted as a new violation, not as a replay.
//
// The KV has no compare-and-set: a segment key is changed by reading it,
// editing and writing it back. Within a node the changes take turns per key
// (kvLock), from the read to the value in memory. So of two runs of a node
// that change one key neither loses its edit, memory gets the values in the
// order the KV got them, and a review and a run never change a key at the
// same time. Between nodes two writers of one key within the time of a write
// can lose one of the edits. A lost pass costs an audit. A lost pointer
// costs a replay, and the hit stays reachable through its other segments.
//
// So a node can hold a segment value the KV no longer holds like that: one
// that lacks a pointer another node wrote since (the passes of A and B, while
// the hit of {A, B} is in the KV), or one that still has what a review on
// another node removed (the pointer to a hit reviewed as a false positive).
// The other nodes learn of both through the verdict.changed broadcast:
//
//   - a node that stored a hit in the KV publishes the segment keys it
//     pointed to the hit ("stored": true); the nodes that get it drop those
//     keys from memory and read them from the KV the next time;
//   - a node that synced a review publishes the keys the review changed; the
//     nodes that get it drop them and tombstone them for tombstoneTTL
//     (writeVerdicts, syncReviewed, onVerdictChanged).
//
// The change counts on a node from the delivery of the broadcast on, which
// is at once. A broadcast can be lost: the node it did not reach keeps
// answering by its value in memory until that value expires or the LRU drops
// it - up to the cache TTL - or until the cache is cleared. The node that
// stored the hit or synced the review is never stale: the hit comes into its
// memory with the pointers the KV got, and a review tombstones its keys
// before it writes them.
//
// A pointer whose hit entry the KV answered "not there" for is removed from
// the values in memory of the segments of that lookup - that pointer, not a
// newer one to a hit of the same set (lookup.hits; the KV is not written on
// the request path): otherwise a lookup of memory alone would find the entry
// unreadable every time and queue the request until the pointer expires.
//
// A pointer whose hit entry cannot be read - a KV error, a caller that left,
// or under a lookup of memory alone an entry that is not in memory - is not
// a stale pointer: its segment is unknown for that lookup, whatever pass it
// has (lookup.hits, decide). Only an entry the KV answered "not there" for
// leaves the segment to its pass.

// kvNamespace holds the verdict cache. The namespace of the pass cache
// before 0.8.0, "pass", is no longer used by the cache.
const kvNamespace = "verdict"

const (
	// A batch call of the KV takes protocol.KVBatchMaxKeys keys and
	// protocol.KVBatchMaxBytes of values (CONTRACTS §93); these are the keys
	// of one read. They are units of work, not limits: a lookup or a write
	// makes as many calls as its keys need, one after the other.
	//
	// kvSegUnit: segment keys. Their values are small - a pass and at most
	// maxSegHits pointers, under 1 KiB.
	// kvHitUnit: hit entries. A value of the KV is at most 64 KiB, so this
	// many always fit into the answer.
	kvSegUnit = protocol.KVBatchMaxKeys
	kvHitUnit = protocol.KVBatchMaxBytes / protocol.KVMaxValueBytes
	// maxHitBytes: a cached hit larger than this is not stored (the KV takes
	// values up to 64 KiB).
	maxHitBytes = 60 << 10
	// maxSegHits: the pointers a segment key keeps, the newest ones. A
	// segment many hit sets share (a system prompt) loses the pointers to
	// the older sets; those stay reachable through their other segments. A
	// hit is lost to the cache only when every segment of its set was since
	// part of more than maxSegHits newer hit sets.
	maxSegHits = 8
	// verdictBroadcastBytes caps the keys of one verdict.changed broadcast;
	// in its JSON a key takes jsonStringOverhead bytes more (quotes, comma).
	verdictBroadcastBytes = 48 << 10
	jsonStringOverhead    = 3
	// cacheMaxBytes bounds the memory cache beside cache_entries (a cached
	// hit is up to maxHitBytes of JSON, and larger decoded). The plugin
	// process is limited to 1024 MB (CONTRACTS §72.2; the budget was sized for the 512 MB of 0.7.x and kept), of which the requests
	// in progress take 128 MB by default (max_inflight_mb) and the image
	// decoders 112 MB (jevNormalizeMemory); with 64 MB here about 200 MB are
	// left for the queue, the garbage the collector has not yet freed and
	// everything else. At about 250 bytes for a segment entry that is some
	// 250,000 entries: a larger cache_entries is bounded by the bytes.
	cacheMaxBytes = 64 << 20
	// cacheEntryOverhead is the memory of an entry beside its key and value
	// (list element, map slot, headers), roughly; tombstoneOverhead that of
	// a tombstone beside its key. A decoded hit takes about hitDecodedFactor
	// times its JSON.
	cacheEntryOverhead = 128
	tombstoneOverhead  = 64
	hitDecodedFactor   = 2
	// tombstoneTTL: how long after a review a key it changed is neither put
	// into memory nor written by a run (lru.kill). A run that judged before
	// the review and comes to write within this time does not bring back
	// what the review removed. It is not what keeps a write or a lookup that
	// was under way during the review from doing so, however long they take:
	// kvLock and lru.stale are.
	tombstoneTTL = 4 * time.Second
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

// unpoint removes every pointer to the hit id (a review).
func unpoint(id string) segEdit { return func(v *segValue) { v.dropHit(id) } }

// unpointRef removes the pointer ref and no other: a pointer to the same hit
// that was written later stays.
func unpointRef(ref hitRef) segEdit {
	return func(v *segValue) {
		v.hits = slices.DeleteFunc(v.hits, func(h hitRef) bool { return h == ref })
	}
}

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

// entrySize estimates the memory of an entry whose value takes payload bytes.
func entrySize(key string, payload int) int64 {
	return int64(len(key) + payload + cacheEntryOverhead)
}

func tombstoneSize(key string) int64 { return int64(len(key) + tombstoneOverhead) }

// lru is the memory cache: at most max entries and maxBytes bytes (the
// estimate of entrySize, the tombstones included), the least recently used
// dropped first.
//
// dead holds the tombstones of the keys a review changed (kill): until its
// time nothing is stored under the key, so a lookup that read the old value
// from the KV, or a run that finished meanwhile, cannot bring it back. The
// zero time is a tombstone without an end: the review that set it is still
// writing, and gives it its time when it is done. A tombstone is dropped
// once its time is over (reap); deadNext is the first time one is. kills
// counts the calls of kill (stale).
type lru struct {
	mu       sync.Mutex
	max      int
	maxBytes int64
	bytes    int64
	ll       *list.List
	items    map[string]*list.Element
	dead     map[string]time.Time
	deadNext time.Time
	kills    uint64
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

// drop removes the entry of key, if there is one. c.mu is held.
func (c *lru) drop(key string) {
	if el, ok := c.items[key]; ok {
		c.remove(el)
	}
}

// reap drops the tombstones whose time is over. It costs nothing until the
// first of them is due. c.mu is held.
func (c *lru) reap(now time.Time) {
	if c.deadNext.IsZero() || now.Before(c.deadNext) {
		return
	}
	c.deadNext = time.Time{}
	for k, until := range c.dead {
		switch {
		case until.IsZero(): // its review is still writing
		case !now.Before(until):
			delete(c.dead, k)
			c.bytes -= tombstoneSize(k)
		case c.deadNext.IsZero() || until.Before(c.deadNext):
			c.deadNext = until
		}
	}
}

// isDead reports whether key is tombstoned. c.mu is held.
func (c *lru) isDead(key string, now time.Time) bool {
	c.reap(now)
	_, dead := c.dead[key]
	return dead
}

// reading is taken before keys are read from the KV whose values go into
// memory afterwards (lru.reading): the tombstones set so far and the time.
type reading struct {
	kills uint64
	at    time.Time
}

func (c *lru) reading(now time.Time) reading {
	c.mu.Lock()
	defer c.mu.Unlock()
	return reading{kills: c.kills, at: now}
}

// stale reports whether what was read from the KV under r must stay out of
// memory under key: a review may have changed the key after the read. That is
// so while the key is tombstoned. It is also so when keys were tombstoned
// since the read began and the read began longer ago than a tombstone lasts:
// the tombstone of this key may have come and gone meanwhile. So a read
// never brings back what a review changed, however long the KV took to
// answer; the price is that such a read, which is rare, fills nothing.
// c.mu is held.
func (c *lru) stale(key string, r reading, now time.Time) bool {
	return c.isDead(key, now) || (c.kills != r.kills && !now.Before(r.at.Add(tombstoneTTL)))
}

// seg returns the value of a segment key.
func (c *lru) seg(key string, now time.Time) (v segValue, ok bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if e := c.entry(key, now); e != nil && e.hit == nil {
		return parseSeg(e.val), true
	}
	return v, false
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

// putHit stores a decoded hit whose JSON has bodyLen bytes, as the KV holds
// it since the read r began (read there, or written there by a run on this
// node); false when it must stay out (stale).
func (c *lru) putHit(key string, hit *storedHit, bodyLen int, expires, now time.Time, r reading) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.stale(key, r, now) {
		return false
	}
	c.set(&cacheEntry{key: key, hit: hit, size: entrySize(key, hitDecodedFactor*bodyLen), expires: expires})
	return true
}

// update applies edit to the value of a segment key (empty when there is
// none) and stores the result, or removes the key when nothing is left. It
// returns the entry as stored; nil when nothing is left. c.mu is held.
func (c *lru) update(key string, now time.Time, ttl time.Duration, edit segEdit) *cacheEntry {
	var v segValue
	if e := c.entry(key, now); e != nil {
		v = parseSeg(e.val)
	}
	edit(&v)
	v.prune(now, ttl)
	if v.empty() {
		c.drop(key)
		return nil
	}
	val := v.encode()
	e := &cacheEntry{key: key, val: val, size: entrySize(key, len(val)), expires: v.expires(ttl)}
	c.set(e)
	return e
}

// editSeg applies edit to the value memory holds for a segment key (a
// pointer a lookup found stale is taken out). Nothing happens while the key
// is tombstoned.
func (c *lru) editSeg(key string, now time.Time, ttl time.Duration, edit segEdit) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.isDead(key, now) {
		c.update(key, now, ttl, edit)
	}
}

// putSeg stores the value a run on this node has written to the KV for a
// segment key (val, read under r and merged), in place of what memory held:
// memory has what the KV has. Nothing happens when it must stay out (stale).
func (c *lru) putSeg(key string, now time.Time, ttl time.Duration, val []byte, r reading) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.stale(key, r, now) {
		kv := parseSeg(val)
		c.update(key, now, ttl, func(v *segValue) { *v = kv })
	}
}

// syncSeg takes what a lookup read from the KV for a segment key (kv, read
// under r) into memory, with the times of its writes (not a fresh TTL) and
// beside what came into memory since the read (a run on this node wrote the
// key, another lookup read it). It returns the value to decide with: the one
// in memory, or kv alone when it must stay out (stale: a review changed the
// key since this lookup read it; memory is left alone).
func (c *lru) syncSeg(key string, now time.Time, ttl time.Duration, kv segValue, r reading) segValue {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.stale(key, r, now) {
		return kv
	}
	e := c.update(key, now, ttl, func(v *segValue) { v.merge(kv) })
	if e == nil {
		return segValue{}
	}
	return parseSeg(e.val)
}

// forget drops the keys: their next read is from the KV.
func (c *lru) forget(keys []string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, k := range keys {
		c.drop(k)
	}
}

// kill drops the keys and tombstones them until the given time - the zero
// time: until they are killed again (a review, while it writes them).
func (c *lru) kill(keys []string, until, now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.reap(now)
	c.kills++
	for _, k := range keys {
		c.drop(k)
	}
	if !until.IsZero() && !now.Before(until) {
		return
	}
	for _, k := range keys {
		if _, dead := c.dead[k]; !dead {
			c.bytes += tombstoneSize(k)
		}
		c.dead[k] = until
	}
	// The earliest time of all: a key tombstoned again may have moved later,
	// then reap looks once too early and finds the next.
	if !until.IsZero() && (c.deadNext.IsZero() || until.Before(c.deadNext)) {
		c.deadNext = until
	}
	for c.ll.Len() > 0 && c.bytes > c.maxBytes {
		c.remove(c.ll.Back())
	}
}

// tombstoned reports whether a review changed the key a moment ago, or is
// changing it.
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

// size is the estimated memory of the entries and tombstones, in bytes.
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
	Trace     Trace    `json:"t"` // the chunk's own run (Trace.ownRun)
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

// newStoredHit is the cached hit of a chunk: the request it ran in, the
// segments (hex hashes) it sent and its own run, written at the unix time at.
func newStoredHit(requestID string, segs []string, run Trace, at int64) storedHit {
	return storedHit{RequestID: requestID, Keys: segs, Trace: run.ownRun(), At: at}
}

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
// request order) under scope: memory first, then (useKV) the KV for
// everything memory does not hold, until ctx ends. A value in memory is used
// as it is. The first cached hit whose whole segment set is in the request is
// returned for replay - before any pass is looked at, so a hit set whose
// segments passed one by one elsewhere is still a hit; otherwise the segments
// that passed. Anything the cache cannot answer is unknown and moderated
// again.
//
// ctx is the caller's: the hook call (the core limits it, and a client that
// left ends it), or the plugin's own for a queued job. The lookup has no time
// limit beside it.
func (p *Plugin) lookupVerdicts(ctx context.Context, scope string, keys [][32]byte, useKV bool) verdicts {
	ttl := p.cfg.Load().cacheTTL
	if ttl <= 0 || len(keys) == 0 {
		return verdicts{passed: map[[32]byte]bool{}}
	}
	cache, now := p.cache.Load(), p.now()
	l := &lookup{p: p, cache: cache, ctx: ctx, scope: scope, now: now, ttl: ttl, kv: useKV && p.host != nil, since: cache.reading(now)}
	segs := l.segments(keys)
	ids, hits, unread := l.hits(segs)
	return l.decide(keys, segs, ids, hits, unread)
}

// lookup is one lookupVerdicts call.
type lookup struct {
	p     *Plugin
	cache *lru
	ctx   context.Context // the caller's
	scope string
	now   time.Time
	ttl   time.Duration
	kv    bool     // ask the KV
	since reading  // taken before the first read of the KV
	names []string // the segment keys, in request order
}

// segments loads the values of the segments: from memory, and with the KV
// every one that is not there from the KV (and into memory), each key once.
// A value in memory is used as it is; a segment that was not read (a KV
// error, the end of ctx, or a lookup without the KV) stays unknown.
func (l *lookup) segments(keys [][32]byte) []segValue {
	segs := make([]segValue, len(keys))
	l.names = make([]string, len(keys))
	known := make([]bool, len(keys))
	var asked []string
	var asking map[string]bool // made with the first segment memory does not hold
	for i, h := range keys {
		name := segKeyOf(l.scope, h)
		l.names[i] = name
		if segs[i], known[i] = l.cache.seg(name, l.now); !known[i] && !asking[name] {
			if asking == nil {
				asking = map[string]bool{}
			}
			asking[name] = true
			asked = append(asked, name)
		}
	}
	if !l.kv || len(asked) == 0 {
		return segs
	}
	got, read := l.p.kvRead(l.ctx, asked, kvSegUnit)
	now := l.p.now()
	vals := make(map[string]segValue, len(asked))
	for j, name := range asked {
		if read[j] {
			vals[name] = l.cache.syncSeg(name, now, l.ttl, parseSeg(got[j].Value), l.since)
		}
	}
	for i, name := range l.names {
		if !known[i] {
			segs[i] = vals[name]
		}
	}
	return segs
}

// hits loads the cached hits the segments point to: ids in request order,
// the newest first within a segment; every hit that is not in memory comes
// from the KV. A hit is nil when it is nowhere - the KV answered that the
// entry is not there, or holds one that does not read or has expired: the
// pointer is stale. unread are the ids whose entry could not be read at all:
// a KV error, the end of ctx, or, for a lookup of memory alone, not in
// memory. Those hits may well exist.
//
// The pointers to an entry the KV answered for and that is nowhere are
// removed from the values in memory of the segments: a lookup of memory alone
// cannot tell such a pointer from one whose entry is merely not in memory,
// and would leave the segment unknown every time. Removed are the pointers
// this lookup followed and no others (unpointRef): a run that hit the same
// set since then has written a new entry and new pointers, and those stay.
// The KV keeps the pointer until it expires or the key is written again; a
// node that reads it from there drops it the same way.
func (l *lookup) hits(segs []segValue) (ids []string, hits map[string]*storedHit, unread map[string]bool) {
	hits, unread = map[string]*storedHit{}, map[string]bool{}
	var missing []string
	for i := range segs {
		for _, ref := range segs[i].hits {
			if _, seen := hits[ref.id]; seen || !liveAt(ref.at, l.now, l.ttl) {
				continue
			}
			hit := l.cache.getHit(hitKeyOf(l.scope, ref.id), l.now)
			if hit != nil && !liveAt(hit.At, l.now, l.ttl) {
				hit = nil
			}
			hits[ref.id] = hit
			ids = append(ids, ref.id)
			if hit == nil {
				missing = append(missing, ref.id)
			}
		}
	}
	if len(missing) == 0 {
		return ids, hits, unread
	}
	if !l.kv {
		for _, id := range missing {
			unread[id] = true
		}
		return ids, hits, unread
	}
	names := make([]string, len(missing))
	for j, id := range missing {
		names[j] = hitKeyOf(l.scope, id)
	}
	got, read := l.p.kvRead(l.ctx, names, kvHitUnit)
	now := l.p.now()
	for j, id := range missing {
		if !read[j] {
			unread[id] = true
			continue
		}
		if hit := decodeHit(got[j].Value, l.now, l.ttl); hit != nil {
			hits[id] = hit
			l.cache.putHit(names[j], hit, len(got[j].Value), hit.expires(l.ttl), now, l.since)
			continue
		}
		for i := range segs {
			for _, ref := range segs[i].hits {
				if ref.id == id {
					l.cache.editSeg(l.names[i], now, l.ttl, unpointRef(ref))
				}
			}
		}
	}
	return ids, hits, unread
}

// decide: the first hit whose whole segment set is among keys, else the
// segments with a live pass - without the segments that point to a hit whose
// entry could not be read (unread): that hit may hold the request's content,
// so the pass of such a segment does not count in this lookup and the
// segment is moderated again (or, under post timing, queued, and the worker
// looks it up with the KV).
func (l *lookup) decide(keys [][32]byte, segs []segValue, ids []string, hits map[string]*storedHit, unread map[string]bool) verdicts {
	v := verdicts{passed: map[[32]byte]bool{}}
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
		if !liveAt(segs[i].pass, l.now, l.ttl) {
			continue
		}
		if len(unread) > 0 && slices.ContainsFunc(segs[i].hits, func(h hitRef) bool { return unread[h.id] && liveAt(h.at, l.now, l.ttl) }) {
			continue
		}
		v.passed[keys[i]] = true
	}
	return v
}

// ---------------------------------------------------------------- KV

// kvFailed counts a batch call of the KV that failed. A call that ended
// because its context did - the caller left, the node stops - did not fail
// at the KV and is not counted.
func (p *Plugin) kvFailed(ctx context.Context) {
	if ctx.Err() == nil {
		p.stats.kvErrors.Add(1)
	}
}

// kvRead reads keys from the KV, all of them, in batch calls of unit keys one
// after the other (on a core without batch calls the SDK makes single calls
// of them, CONTRACTS §93). got[i] is the answer for key i. read[i] is false
// when the call for key i failed or ctx ended before it: the key is unknown
// then, not absent. A call that fails counts one kv error (kvFailed) and the
// calls after it are still made.
//
// A read whose values exceed what one answer takes (ResourceExhausted; not
// with values this plugin wrote) is made again kvHitUnit keys at a time,
// which always fit.
func (p *Plugin) kvRead(ctx context.Context, keys []string, unit int) (got []pluginsdk.KVValue, read []bool) {
	got, read = make([]pluginsdk.KVValue, len(keys)), make([]bool, len(keys))
	for from := 0; from < len(keys) && ctx.Err() == nil; from += unit {
		to := min(from+unit, len(keys))
		vals, err := pluginsdk.KVGetMany(ctx, p.host.KV(), kvNamespace, keys[from:to])
		switch {
		case err == nil:
			copy(got[from:to], vals)
			for i := from; i < to; i++ {
				read[i] = true
			}
		case status.Code(err) == codes.ResourceExhausted && unit > kvHitUnit:
			vals, ok := p.kvRead(ctx, keys[from:to], kvHitUnit)
			copy(got[from:to], vals)
			copy(read[from:to], ok)
		default:
			p.kvFailed(ctx)
		}
	}
	return got, read
}

// kvWrite writes items to the KV, all of them, in batch calls one after the
// other, each with as many items as a call takes (protocol.KVBatchMaxKeys
// items, protocol.KVBatchMaxBytes of keys and values). It stops at the first
// call that fails (one kv error, kvFailed) or when ctx has ended; done is the
// number of items written by the calls before.
func (p *Plugin) kvWrite(ctx context.Context, items []pluginsdk.KVItem) (done int, err error) {
	for done < len(items) {
		n, size := 0, 0
		for ; done+n < len(items) && n < protocol.KVBatchMaxKeys; n++ {
			it := items[done+n]
			if size += len(it.Key) + len(it.Value); size > protocol.KVBatchMaxBytes && n > 0 {
				break
			}
		}
		if err = ctx.Err(); err == nil {
			err = pluginsdk.KVSetMany(ctx, p.host.KV(), kvNamespace, items[done:done+n])
		}
		if err != nil {
			p.kvFailed(ctx)
			return done, err
		}
		done += n
	}
	return done, nil
}

// kvDelete deletes keys from the KV, all of them, in batch calls of
// protocol.KVBatchMaxKeys keys one after the other. It stops like kvWrite;
// done is the number of keys deleted by the calls before.
func (p *Plugin) kvDelete(ctx context.Context, keys []string) (done int, err error) {
	for done < len(keys) {
		n := min(len(keys)-done, protocol.KVBatchMaxKeys)
		if err = ctx.Err(); err == nil {
			err = pluginsdk.KVDeleteMany(ctx, p.host.KV(), kvNamespace, keys[done:done+n])
		}
		if err != nil {
			p.kvFailed(ctx)
			return done, err
		}
		done += n
	}
	return done, nil
}

// kvStripe is the lock of a cache key.
func kvStripe(key string) uint32 {
	h := fnv.New32a()
	_, _ = h.Write([]byte(key))
	return h.Sum32() % kvLockStripes
}

// kvLock makes this node's changes of verdict cache keys in the KV take
// turns: it waits until every key of keys is free, or until ctx ends (then
// nothing is held and the change is not made). unlock ends the turn.
//
// A change holds its keys from the read of their values to the moment the
// new values are in memory (a run, writeVerdicts) or tombstoned (a review,
// writeReviewed). That is what keeps two changes of one key from losing an
// edit, memory from getting an older value after a newer one, and a write
// that was under way from landing after a review. The keys share
// kvLockStripes locks, which everybody takes in the same order; keys on one
// stripe wait for each other, which costs time and nothing else.
func (p *Plugin) kvLock(ctx context.Context, keys ...[]string) (unlock func(), err error) {
	var want [kvLockStripes]bool
	for _, list := range keys {
		for _, key := range list {
			want[kvStripe(key)] = true
		}
	}
	release := func(below int) {
		for i := range below {
			if want[i] {
				<-p.kvMu[i]
			}
		}
	}
	for i := range want {
		if !want[i] {
			continue
		}
		select {
		case p.kvMu[i] <- struct{}{}:
		case <-ctx.Done():
			release(i)
			return nil, ctx.Err()
		}
	}
	// With the lock free and ctx over, the select takes either.
	if err := ctx.Err(); err != nil {
		release(kvLockStripes)
		return nil, err
	}
	return func() { release(kvLockStripes) }, nil
}

// ---------------------------------------------------------------- store

// hitWrite is a hit of a run on its way to the KV: its entry and the
// segment keys that get a pointer to it.
type hitWrite struct {
	key, id string
	hit     *storedHit
	body    []byte
	segs    []string
}

// verdictWrite is what a run decided, on its way to the KV: the chunks that
// hit and the segment keys that passed, at the unix time at.
type verdictWrite struct {
	ttl    time.Duration
	hits   []hitWrite
	passes []string
	at     int64
}

// storeVerdicts stores the verdicts of a run under scope: the segments that
// passed and the chunks that hit - all of them, in the KV first and then in
// memory (writeVerdicts). It does not wait for that: the write runs in the
// background, on the plugin's own context (postCtx, which Shutdown ends after
// the queue had its time), and the hook answers meanwhile. Shutdown waits for
// the writes that began before it (goTracked).
//
// Until the write is done the cache does not know these verdicts, on this
// node or on any other: the same content sent again meanwhile is moderated
// again. For a pass that costs an audit. For a hit the request is refused
// again by its own run, and recorded and counted as a violation of its own -
// not as a replay.
func (p *Plugin) storeVerdicts(c *config, scope string, passes [][32]byte, hits []storedHit) {
	if c.cacheTTL <= 0 || p.host == nil {
		return
	}
	w := &verdictWrite{ttl: c.cacheTTL, at: p.now().Unix()}
	for i := range hits {
		hit := &hits[i]
		id, body := encodeHit(hit)
		if id == "" {
			continue
		}
		hw := hitWrite{key: hitKeyOf(scope, id), id: id, hit: hit, body: body}
		for _, seg := range hit.Keys {
			hw.segs = append(hw.segs, segKeyHex(scope, seg))
		}
		w.hits = append(w.hits, hw)
	}
	for _, h := range passes {
		w.passes = append(w.passes, segKeyOf(scope, h))
	}
	if len(w.hits)+len(w.passes) == 0 {
		return
	}
	p.stats.kvWriting.Add(1)
	p.goTracked(func() {
		defer p.stats.kvWriting.Add(-1)
		p.writeVerdicts(p.postCtx, w)
	})
}

// writeVerdicts writes what a run decided to the KV and then puts it into
// memory:
//
//  1. it waits for its turn at the keys (kvLock) and keeps it until the
//     values are in memory;
//  2. the segment keys are read from the KV, in batch calls;
//  3. the passes and the pointers of the run are merged into the values that
//     were read - what other nodes stored under the keys stays;
//  4. the hit entries are written, then the segment keys, in batch calls: no
//     pointer is in the KV before its entry;
//  5. the hit entries and the segment values that were written go into
//     memory - the values as the KV now holds them, the pointers of other
//     nodes included - and the segment keys that now point to a hit of this
//     run are published (verdict.changed, "stored"): the other nodes may hold
//     them in memory without the pointer and drop them there.
//
// When a call of 2 or 4 fails (one kv error, kvRead / kvWrite) or ctx ends,
// it stops: nothing of the run comes into memory, and the content is
// moderated again the next time. What the KV took before the failure stays
// there - an entry without pointers, or part of the keys of a run that needs
// several calls or runs on a core without batch calls: all of it true, none
// of it complete, and the next run of the content writes it again. Nothing is
// retried here.
//
// A key a review changed within tombstoneTTL, or is changing, is left alone,
// in the KV and in memory: a run that judged before the review does not bring
// back what the review removed. A hit whose entry is such a key gets no
// pointers either. A hit entry lives for the TTL from the time of the hit.
//
// Reviews and this write (the reason for the turn, and for the tombstones):
//
//   - A review on this node tombstones its keys, then waits for its turn at
//     them. If this write has the turn, the review writes after it and over
//     it, and tombstones the keys again, which drops what this write put into
//     memory. If the review has the turn, this write finds the keys
//     tombstoned when it gets its own (the review gives the tombstones their
//     time before it ends its turn) and leaves them alone.
//   - A review on another node cannot wait for this node. Once its
//     verdict.changed is here the keys are tombstoned, and this write leaves
//     them alone (looked at after the read, right before the writes) or at
//     least keeps them out of memory (lru.stale). What stays open: this write
//     lands in the KV after the other node's review wrote there and before
//     its broadcast arrives here (or when it never does) - then the KV has
//     the hit again until it expires; and a lookup can still replay from
//     memory until the broadcast arrives (when it never does: until the entry
//     expires or the cache is cleared).
//
// (The tombstones go with the memory cache when cache_entries is changed.)
func (p *Plugin) writeVerdicts(ctx context.Context, w *verdictWrite) {
	if pointed := p.writeRun(ctx, w); len(pointed) > 0 {
		p.publishVerdictChanged(ctx, verdictChanged{Keys: pointed, Stored: true})
	}
}

// writeRun is writeVerdicts up to the values in memory, the turn at the keys
// taken and given back; pointed are the segment keys that now point to a hit
// of the run.
func (p *Plugin) writeRun(ctx context.Context, w *verdictWrite) (pointed []string) {
	keys := slices.Clone(w.passes)
	var hitKeys []string
	for _, hw := range w.hits {
		hitKeys = append(hitKeys, hw.key)
		keys = append(keys, hw.segs...)
	}
	slices.Sort(keys)
	keys = slices.Compact(keys)
	unlock, err := p.kvLock(ctx, hitKeys, keys)
	if err != nil {
		return nil // the node stops
	}
	defer unlock()
	cache := p.cache.Load()
	since := cache.reading(p.now())
	got, read := p.kvRead(ctx, keys, kvSegUnit)
	if slices.Contains(read, false) {
		return nil
	}
	now := p.now()
	reviewed := func(key string) bool { return cache.tombstoned(key, now) }
	var ops segOps
	var entries []pluginsdk.KVItem
	var stored []hitWrite
	for _, hw := range w.hits {
		left := hw.hit.expires(w.ttl).Sub(now)
		if left <= 0 || reviewed(hw.key) {
			continue
		}
		// The KV counts whole seconds, and cuts off the rest.
		entries = append(entries, pluginsdk.KVItem{Key: hw.key, Value: hw.body, TTL: (left + time.Second - 1).Truncate(time.Second)})
		stored = append(stored, hw)
		for _, key := range hw.segs {
			if !reviewed(key) {
				ops.add(key, pointTo(hw.id, hw.hit.At))
			}
		}
	}
	pointed = slices.Clone(ops.keys)
	for _, key := range w.passes {
		if !reviewed(key) {
			ops.add(key, passAt(w.at))
		}
	}
	items := make([]pluginsdk.KVItem, 0, len(ops.keys))
	for _, key := range ops.keys {
		i, _ := slices.BinarySearch(keys, key)
		v := parseSeg(got[i].Value)
		for _, edit := range ops.edits[key] {
			edit(&v)
		}
		v.prune(now, w.ttl)
		if v.empty() {
			continue // the verdict expired meanwhile
		}
		// The key lives as long as its newest part (the KV counts whole
		// seconds, and 0 would be for ever).
		items = append(items, pluginsdk.KVItem{Key: key, Value: v.encode(), TTL: max(v.expires(w.ttl).Sub(now), time.Second)})
	}
	if _, err := p.kvWrite(ctx, entries); err != nil {
		return nil
	}
	if _, err := p.kvWrite(ctx, items); err != nil {
		return nil
	}
	now = p.now()
	for _, hw := range stored {
		cache.putHit(hw.key, hw.hit, len(hw.body), hw.hit.expires(w.ttl), now, since)
	}
	for _, it := range items {
		cache.putSeg(it.Key, now, w.ttl, it.Value, since)
	}
	return pointed
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
// The KV is what the nodes share, so it decides: it is written first, before
// the review is answered, and the result is the number of records whose
// every write succeeded. The writes run on ctx, the review request, and have
// no time limit beside it: a request that ends first leaves the rest
// unwritten and its records uncounted. Memory is never given the new values:
// this node tombstones every key it tried to change (before the writes,
// without an end, and with tombstoneTTL when they are over - writeReviewed),
// and the other nodes do the same on verdict.changed (best effort). These
// nodes then read the keys from the KV, whatever it holds - after a failed
// write the old verdict on every node rather than the new one on this node
// only. A node the broadcast did not reach keeps the values in its memory
// until they expire or the cache is cleared (the top of the file). A record
// whose writes failed in part is not counted; reviewing it again repeats
// them.
func (p *Plugin) syncReviewed(ctx context.Context, ids []int64, status string) int {
	ttl := p.cfg.Load().cacheTTL
	if ttl <= 0 || len(ids) == 0 || p.host == nil || !slices.Contains(reviewStatuses, status) {
		return 0
	}
	hits := p.reviewedHits(ctx, ids, status)
	if len(hits) == 0 {
		return 0
	}
	keys := reviewedKeys(hits)
	p.writeReviewed(ctx, p.cache.Load(), hits, keys, status, ttl)
	synced := 0
	for _, h := range hits {
		if !h.failed {
			synced += h.records
		}
	}
	// Also when the request has ended: the other nodes are told what was
	// changed until then.
	p.publishVerdictChanged(p.postCtx, verdictChanged{Keys: keys})
	return synced
}

// reviewedHits loads the cached hits the reviewed records name, each once
// (the last record naming a hit decides what is stored). A record without a
// usable hit set, or of a flow this node does not run, names none; neither
// does a confirmed record judged under another fingerprint.
func (p *Plugin) reviewedHits(ctx context.Context, ids []int64, status string) []*reviewedHit {
	fail := func(err error) {
		p.log.Warn("moderation: review cache sync failed", "error", err.Error())
	}
	db, err := p.db(ctx)
	if err != nil {
		fail(err)
		return nil
	}
	rows, err := db.Query(ctx, `SELECT request_id, flow_id, trace FROM events
		WHERE id = ANY($1) AND `+suspiciousResult+` AND trace IS NOT NULL ORDER BY id`, ids)
	if err != nil {
		fail(err)
		return nil
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
		if status == ReviewConfirmed {
			if ci.FP != flow.fp {
				return nil // judged under another configuration
			}
			// A replayed record ran in its source request.
			hit := newStoredHit(cmp.Or(ci.SourceRequestID, rid), ci.Segs, tr, at)
			if _, body = encodeHit(&hit); body == nil {
				return nil
			}
		}
		key := hitKeyOf(scope, ci.Key)
		h := byKey[key]
		if h == nil {
			h = &reviewedHit{key: key, id: ci.Key}
			byKey[key] = h
			hits = append(hits, h)
		}
		h.body, h.at, h.records = body, at, h.records+1
		h.pass = h.pass || (status == ReviewFalsePositive && ci.FP == flow.fp)
		h.segs = h.segs[:0]
		for _, seg := range ci.Segs {
			h.segs = append(h.segs, segKeyHex(scope, seg))
		}
		return nil
	})
	if err != nil {
		fail(err)
	}
	return hits
}

// reviewedKeys are the cache keys the review of hits changes, every key
// once: each hit entry followed by its segment keys.
func reviewedKeys(hits []*reviewedHit) []string {
	var keys []string
	seen := map[string]bool{}
	for _, h := range hits {
		keys = append(keys, h.key)
		for _, seg := range h.segs {
			if !seen[seg] {
				seen[seg] = true
				keys = append(keys, seg)
			}
		}
	}
	return keys
}

// reviewOps are the edits of the segment keys of the reviewed hits whose
// entry was written (not failed), every key once.
func reviewOps(hits []*reviewedHit, status string) segOps {
	var ops segOps
	for _, h := range hits {
		if h.failed {
			continue
		}
		for _, seg := range h.segs {
			switch status {
			case ReviewConfirmed:
				ops.add(seg, pointTo(h.id, h.at), dropPass)
			case ReviewPending:
				ops.add(seg, unpoint(h.id), dropPass)
			case ReviewFalsePositive:
				if h.pass {
					ops.add(seg, unpoint(h.id), passAt(h.at))
				} else {
					ops.add(seg, unpoint(h.id))
				}
			}
		}
	}
	return ops
}

// writeReviewed writes the reviewed hits to the KV, in batch calls, and marks
// the ones a write failed for (failed). The hit entries come first: no
// pointer is written to an entry that is not there, and no pass beside a hit
// that could not be deleted. Then the segment keys are read, edited and
// written back (or deleted, when nothing is left of one).
//
// keys, all the keys of the review, are tombstoned before anything else,
// without an end: nothing comes into memory under them while the review
// writes. Then the review waits for its turn at them (kvLock) - a write of a
// run that has it finishes first, and the review writes over it. When the
// writes are over, the tombstones get their time, tombstoneTTL from then, and
// only after that the turn ends: a run that waited for it finds the keys
// tombstoned and leaves them alone. A review that ctx ended while it waited
// wrote nothing; its hits are marked failed.
func (p *Plugin) writeReviewed(ctx context.Context, cache *lru, hits []*reviewedHit, keys []string, status string, ttl time.Duration) {
	cache.kill(keys, time.Time{}, p.now())
	timed := func() {
		now := p.now()
		cache.kill(keys, now.Add(tombstoneTTL), now)
	}
	unlock, err := p.kvLock(ctx, keys)
	if err != nil {
		timed()
		for _, h := range hits {
			h.failed = true
		}
		return
	}
	defer unlock()
	defer timed() // before the turn ends, also when a write panics

	done := 0
	if status == ReviewConfirmed {
		entries := make([]pluginsdk.KVItem, len(hits))
		for i, h := range hits {
			entries[i] = pluginsdk.KVItem{Key: h.key, Value: h.body, TTL: ttl}
		}
		done, _ = p.kvWrite(ctx, entries)
	} else {
		entries := make([]string, len(hits))
		for i, h := range hits {
			entries[i] = h.key
		}
		done, _ = p.kvDelete(ctx, entries)
	}
	for _, h := range hits[done:] {
		h.failed = true
	}

	ops := reviewOps(hits, status)
	users := map[string][]*reviewedHit{} // segment key -> the hits it belongs to
	for _, h := range hits {
		for _, seg := range h.segs {
			users[seg] = append(users[seg], h)
		}
	}
	failed := func(segs []string) {
		for _, seg := range segs {
			for _, h := range users[seg] {
				h.failed = true
			}
		}
	}
	got, read := p.kvRead(ctx, ops.keys, kvSegUnit)
	now := p.now()
	var sets []pluginsdk.KVItem
	var setKeys, gone []string
	for i, key := range ops.keys {
		if !read[i] {
			failed([]string{key})
			continue
		}
		v := parseSeg(got[i].Value)
		for _, edit := range ops.edits[key] {
			edit(&v)
		}
		v.prune(now, ttl)
		switch {
		case !v.empty():
			// The key lives as long as its newest part (the KV counts whole
			// seconds, and 0 would be for ever).
			sets = append(sets, pluginsdk.KVItem{Key: key, Value: v.encode(), TTL: max(v.expires(ttl).Sub(now), time.Second)})
			setKeys = append(setKeys, key)
		case got[i].Found:
			gone = append(gone, key)
		}
	}
	done, _ = p.kvWrite(ctx, sets)
	failed(setKeys[done:])
	done, _ = p.kvDelete(ctx, gone)
	failed(gone[done:])
}

// verdictChanged is the payload of TopicVerdictChanged: cache keys another
// node changed in the KV. Without Stored a review changed them (syncReviewed);
// with it they are segment keys that got a pointer to a hit a run stored
// (writeVerdicts).
type verdictChanged struct {
	Keys   []string `json:"keys"`
	Stored bool     `json:"stored,omitempty"`
}

// publishVerdictChanged tells the other nodes which keys changed (msg), in
// messages below the broadcast payload limit.
func (p *Plugin) publishVerdictChanged(ctx context.Context, msg verdictChanged) {
	send := func(keys []string) {
		payload, _ := json.Marshal(verdictChanged{Keys: keys, Stored: msg.Stored})
		if err := p.host.Publish(ctx, TopicVerdictChanged, payload); err != nil {
			p.log.Warn("moderation: broadcast failed; other nodes keep the verdicts in their memory until the entries expire or the cache is cleared",
				"topic", TopicVerdictChanged, "stored", msg.Stored, "error", err.Error())
		}
	}
	var keys []string
	size := 0
	for _, key := range msg.Keys {
		if size+len(key) > verdictBroadcastBytes && len(keys) > 0 {
			send(keys)
			keys, size = nil, 0
		}
		keys = append(keys, key)
		size += len(key) + jsonStringOverhead
	}
	if len(keys) > 0 {
		send(keys)
	}
}

// onVerdictChanged drops the keys another node changed from this node's
// memory, so the next reads take them from the KV. Keys a review changed are
// tombstoned for tombstoneTTL as well: neither a lookup that read the old
// value before the review nor a run that judged before it stores it again
// (lru.stale, writeVerdicts). Keys that got a pointer to a stored hit are
// only dropped - a tombstone would keep this node's own runs from writing to
// a segment many hits share.
//
// Dropping does not hold against what is under way at that moment: a lookup
// that read a key from the KV before the pointer was written puts the old
// value into memory after the drop (syncSeg). Such a value is then one the
// broadcast never reached: it decides until it expires, is dropped or the
// cache is cleared (the top of the file). A run of this node that ends right
// after the drop does not add to that: its write reads the key from the KV
// again, the pointer with it. Closing the window would take a mark per
// dropped key that outlives the reads under way, as the tombstones of a
// review do, with the cost named above; it is left open.
func (p *Plugin) onVerdictChanged(_ context.Context, b pluginsdk.Broadcast) error {
	var msg verdictChanged
	if err := json.Unmarshal(b.Payload, &msg); err != nil {
		p.log.Warn("moderation: unreadable broadcast ignored", "topic", TopicVerdictChanged, "error", err.Error())
		return nil // nothing to retry
	}
	cache := p.cache.Load()
	if msg.Stored {
		cache.forget(msg.Keys)
		return nil
	}
	now := p.now()
	cache.kill(msg.Keys, now.Add(tombstoneTTL), now)
	return nil
}

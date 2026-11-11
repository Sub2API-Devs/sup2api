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
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// Verdict cache (CONTRACTS §72.4, §72.5 step 8; new-api verdict_cache.go):
// what a flow decided about content is remembered for verdict_cache_days, in
// the host KV shared by all nodes and, as a cache of that, in an in-memory
// LRU of cache_entries (and at most cacheMaxBytes).
//
// What is stored. A segment (text piece or inline image) that passed in
// every chunk holding it is stored as a pass and not sent again. A chunk
// that hit is stored as a hit of the set of segments it sent, with the trace
// of its run: a later request holding the whole set is decided by that hit
// without calling upstream (replay), a request with only part of the set is
// moderated again. A segment key holds both, the time of a pass and pointers
// to the newest hits the segment is part of (segValue). A hit whose whole
// set is in the request decides before any pass is looked at: otherwise the
// parts of a hit set, passing one by one in other requests, would turn the
// hit into a pass. Runs that errored, passes with a skipped stage and chunks
// with URL images are never stored.
//
// Keys carry a scope (snapshot.scopeOf): the clear counter, the flow and the
// fingerprint of everything that decides the flow's verdicts. Clearing the
// cache or changing the flow's auditors makes the old entries unreachable;
// they expire on their own.
//
// Memory is a cache of the KV and nothing more. A value comes into memory
// when a lookup read its key from the KV or a run on this node wrote it
// there, and is then used as it is: a lookup asks the KV only for what
// memory does not hold (lookupVerdicts). It leaves memory when it expires
// (the cache TTL after its write), when the LRU drops it, when a
// verdict.changed broadcast names its key, when the cache is cleared and
// with a restart. The plugin sets no time limit and no cap on its use of the
// KV: a call waits as long as its caller does. A KV error is never fatal:
// the content is moderated again.
//
// A run writes its verdicts in the background, to the KV first and then to
// memory (storeVerdicts, writeRun). Until that write is done the cache does
// not know them: the same content sent again meanwhile is moderated again,
// and a hit is refused by a run of its own and counted as a new violation,
// not as a replay. Nothing bounds the writes that wait for a KV that does
// not answer (kv_writing).
//
// The KV has no compare-and-set: a segment key is changed by reading it,
// editing and writing it back. On a node the changes of a key take turns
// (kvLock). Between nodes two writers of one key at the same time can lose
// one of the edits. A lost pass costs an audit. A lost pointer costs a
// replay, and the hit stays reachable through its other segments - unless
// the same window loses the pointers of all of them (a node writes passes of
// A and of B while another stores the hit of {A, B}): then the set passes on
// every node but the one that stored the hit, until the values expire.
//
// So a node can hold a value the KV no longer holds like that. The other
// nodes are told by the verdict.changed broadcast (onVerdictChanged): a node
// that stored a hit publishes the segment keys it pointed to it, a node that
// synced a review the keys the review changed. A broadcast can be lost: the
// node it did not reach answers by its value in memory until that expires,
// the LRU drops it or the cache is cleared.
//
// A review is not undone by what was read or judged before it: the keys it
// changed are tombstoned on every node that knows of it, and a reading tells
// a read or a run whether a review may have come since it began
// (lru.reviewed).

// kvNamespace holds the verdict cache (the flow alert state has its own,
// alertNamespace).
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
	// kvLockStripes is the number of locks the cache keys share for their
	// changes in the KV (kvLock).
	kvLockStripes = 64
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
	// hit is up to maxHitBytes of JSON, and larger decoded): 64 MB of the
	// 1024 MB the plugin process may use (CONTRACTS §72.2), beside the
	// requests in progress (128 MB by default, max_inflight_mb) and the
	// image decoders (112 MB, jevNormalizeMemory). At about 250 bytes for a
	// segment entry that is some 250,000 entries: a larger cache_entries is
	// bounded by the bytes.
	cacheMaxBytes = 64 << 20
	// cacheEntryOverhead is the memory of an entry beside its key and value
	// (list element, map slot, headers), roughly; tombstoneOverhead that of
	// a tombstone beside its key. A decoded hit takes about hitDecodedFactor
	// times its JSON.
	cacheEntryOverhead = 128
	tombstoneOverhead  = 64
	hitDecodedFactor   = 2
	// tombstoneTTL: how long after a review a key it changed is neither put
	// into memory nor written by a run (lru.tombstone). A read or a run that
	// takes longer is held back by its reading (lru.lapsed).
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
// Tokens that do not read are ignored, and the segment is unknown and
// moderated again. That includes "p" and "h<hit id>" without a time, which
// early builds of 0.8.0 wrote.
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
func unpoint(id string) segEdit {
	return func(v *segValue) {
		v.hits = slices.DeleteFunc(v.hits, func(h hitRef) bool { return h.id == id })
	}
}

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

// apply makes the edits of key on raw, the value the KV holds for it, and
// returns what is written back: the key lives as long as its newest part.
// left is false when nothing is left of the value.
func (o *segOps) apply(key string, raw []byte, now time.Time, ttl time.Duration) (item pluginsdk.KVItem, left bool) {
	v := parseSeg(raw)
	for _, edit := range o.edits[key] {
		edit(&v)
	}
	v.prune(now, ttl)
	if v.empty() {
		return item, false
	}
	return pluginsdk.KVItem{Key: key, Value: v.encode(), TTL: kvTTL(v.expires(ttl), now)}, true
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
// tombs holds the tombstones of the keys a review changed, each with the
// time it ends: until then nothing is stored under the key (reviewed). The
// zero time is a tombstone without an end (tombstoneOpen). A tombstone is
// dropped once its time is over (reap); tombNext is the first time one is.
// tombSets counts the times tombstones were set (lapsed).
type lru struct {
	mu       sync.Mutex
	max      int
	maxBytes int64
	bytes    int64
	ll       *list.List
	items    map[string]*list.Element
	tombs    map[string]time.Time
	tombNext time.Time
	tombSets uint64
	gen      uint64 // which memory cache this is (lruGen); never changes
}

// lruGen numbers the memory caches of the process. A reading names its cache
// by this number: a pointer would keep a replaced cache alive for as long as
// a write waits with the reading.
var lruGen atomic.Uint64

func newLRU(max int) *lru {
	return &lru{max: max, maxBytes: cacheMaxBytes, ll: list.New(), items: make(map[string]*list.Element, 256), tombs: map[string]time.Time{}, gen: lruGen.Add(1)}
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

// set stores an entry (and drops it again when it alone is beyond the
// limits, trim). c.mu is held.
func (c *lru) set(e *cacheEntry) {
	if el, ok := c.items[e.key]; ok {
		c.bytes += e.size - el.Value.(*cacheEntry).size
		el.Value = e
		c.ll.MoveToFront(el)
	} else {
		c.items[e.key] = c.ll.PushFront(e)
		c.bytes += e.size
	}
	c.trim()
}

// trim drops the least recently used entries beyond the limits. c.mu is held.
func (c *lru) trim() {
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
	if c.tombNext.IsZero() || now.Before(c.tombNext) {
		return
	}
	c.tombNext = time.Time{}
	for k, until := range c.tombs {
		switch {
		case until.IsZero(): // without an end
		case !now.Before(until):
			delete(c.tombs, k)
			c.bytes -= tombstoneSize(k)
		case c.tombNext.IsZero() || until.Before(c.tombNext):
			c.tombNext = until
		}
	}
}

// hasTombstone reports whether key is tombstoned. c.mu is held.
func (c *lru) hasTombstone(key string, now time.Time) bool {
	c.reap(now)
	_, set := c.tombs[key]
	return set
}

// setTombstones drops the keys and tombstones them until the given time,
// which is not over, or (the zero time) without an end. c.mu is held.
func (c *lru) setTombstones(keys []string, until, now time.Time) {
	c.reap(now)
	c.tombSets++
	for _, k := range keys {
		c.drop(k)
		if _, set := c.tombs[k]; !set {
			c.bytes += tombstoneSize(k)
		}
		c.tombs[k] = until
	}
	// The earliest time of all: a key tombstoned again may have moved later,
	// then reap looks once too early and finds the next.
	if !until.IsZero() && (c.tombNext.IsZero() || until.Before(c.tombNext)) {
		c.tombNext = until
	}
	c.trim()
}

// tombstone drops the keys and tombstones them for tombstoneTTL: a review
// changed them a moment ago.
func (c *lru) tombstone(keys []string, now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.setTombstones(keys, now.Add(tombstoneTTL), now)
}

// tombstoneOpen drops the keys and tombstones them without an end: a review
// on this node is about to change them, and calls tombstone when it is done.
func (c *lru) tombstoneOpen(keys []string, now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.setTombstones(keys, time.Time{}, now)
}

// reading is taken before something is read that is stored later: by a
// lookup before it reads the KV (the run of its request stores verdicts with
// the same reading), and by the write of a run before its own read. It holds
// the cache it was taken from, the times tombstones were set there so far and
// the time.
type reading struct {
	gen      uint64 // the cache (lru.gen)
	tombSets uint64
	at       time.Time
}

func (c *lru) reading(now time.Time) reading {
	c.mu.Lock()
	defer c.mu.Unlock()
	return reading{gen: c.gen, tombSets: c.tombSets, at: now}
}

// lapsed reports whether r can no longer tell which keys a review changed
// since it was taken: it is a reading of another cache - the memory cache was
// replaced since (cleared, cache_entries changed) and the tombstones went
// with the old one - or tombstones were set since and r is older than a
// tombstone lasts, so the tombstone of any key may have come and gone. c.mu
// is held.
func (c *lru) lapsed(r reading, now time.Time) bool {
	return r.gen != c.gen || (c.tombSets != r.tombSets && !now.Before(r.at.Add(tombstoneTTL)))
}

// reviewed reports whether a review may have changed key since r was taken:
// the key is tombstoned, or r has lapsed. What was read or judged under r is
// not stored under the key then, so it never brings back what a review
// changed, however long it took; the price is that a read or a run that
// outlasts a tombstone, which is rare, stores nothing. c.mu is held.
func (c *lru) reviewed(key string, r reading, now time.Time) bool {
	return c.hasTombstone(key, now) || c.lapsed(r, now)
}

// lapsedSince is lapsed for a caller that does not hold c.mu.
func (c *lru) lapsedSince(r reading, now time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.lapsed(r, now)
}

// reviewedSince is reviewed for a caller that does not hold c.mu.
func (c *lru) reviewedSince(key string, r reading, now time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.reviewed(key, r, now)
}

// getSeg returns the value of a segment key.
func (c *lru) getSeg(key string, now time.Time) (v segValue, ok bool) {
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
// node); false when it must stay out (reviewed).
func (c *lru) putHit(key string, hit *storedHit, bodyLen int, now time.Time, ttl time.Duration, r reading) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.reviewed(key, r, now) {
		return false
	}
	c.set(&cacheEntry{key: key, hit: hit, size: entrySize(key, hitDecodedFactor*bodyLen), expires: hit.expires(ttl)})
	return true
}

// update applies edit to the value of a segment key (empty when there is
// none) and stores the result, or removes the key when nothing is left. It
// returns the entry as stored; nil when nothing is left. c.mu is held.
func (c *lru) update(key string, edit segEdit, now time.Time, ttl time.Duration) *cacheEntry {
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

// editSeg applies edit to the value memory holds for a segment key. Nothing
// happens while the key is tombstoned.
func (c *lru) editSeg(key string, edit segEdit, now time.Time, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.hasTombstone(key, now) {
		c.update(key, edit, now, ttl)
	}
}

// putSeg stores the value a run on this node has written to the KV for a
// segment key (val, read under r and merged), in place of what memory held:
// memory has what the KV has. Nothing happens, and it returns false, when it
// must stay out (reviewed).
func (c *lru) putSeg(key string, val []byte, now time.Time, ttl time.Duration, r reading) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.reviewed(key, r, now) {
		return false
	}
	kv := parseSeg(val)
	c.update(key, func(v *segValue) { *v = kv }, now, ttl)
	return true
}

// mergeSeg takes what a lookup read from the KV for a segment key (kv, read
// under r) into memory, with the times of its writes (not a fresh TTL) and
// beside what came into memory since the read (a run on this node wrote the
// key, another lookup read it). It returns the value to decide with: the one
// in memory, or kv alone when it must stay out (reviewed; memory is left
// alone).
func (c *lru) mergeSeg(key string, kv segValue, now time.Time, ttl time.Duration, r reading) segValue {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.reviewed(key, r, now) {
		return kv
	}
	e := c.update(key, func(v *segValue) { v.merge(kv) }, now, ttl)
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

// scopeOf is the key scope of a flow's verdicts under the clear counter of
// the snapshot: "e3:7:9f2c…".
func (s *snapshot) scopeOf(f *liveFlow) string {
	return "e" + strconv.FormatInt(s.cacheEpoch, 10) + ":" + strconv.FormatInt(f.ID, 10) + ":" + f.fp
}

// scopeNow is the key scope of a flow's verdicts under the clear counter of
// now, whatever snapshot the flow is of. A run stores its verdicts there and
// a queued job asks for them there: after a clear nothing is written into
// the cleared scope or answered from it.
func (p *Plugin) scopeNow(f *liveFlow) string { return p.snap.Load().scopeOf(f) }

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

// hitIDOf is hitID of hex segment hashes; "" when there is none or one is
// not a hash.
func hitIDOf(segs []string) string {
	if len(segs) == 0 {
		return ""
	}
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

// encodeHit is the stored JSON of a hit; nil when it is too large to store.
func encodeHit(hit *storedHit) []byte {
	body, err := json.Marshal(hit)
	if err != nil || len(body) > maxHitBytes {
		return nil
	}
	return body
}

// ---------------------------------------------------------------- lookup

// verdicts is what the cache knows about a request's segments.
type verdicts struct {
	passed map[[32]byte]bool
	hit    *storedHit // a cached hit whose segments are all in the request; read only
	hitID  string
	// asked is the reading the lookup began with: what a review changed
	// before it, the lookup saw. The run of the request stores its verdicts
	// with it (storeVerdicts).
	asked reading
}

// lookupVerdicts reads the cached verdicts of the segments of a request (in
// request order) under scope: from memory, and (useKV) from the KV whatever
// memory does not hold. The first cached hit whose whole segment set is in
// the request is returned for replay; otherwise the segments that passed.
// Anything the cache cannot answer is unknown and moderated again.
//
// ctx is the caller's, and the only limit of the lookup: the hook call (the
// core limits it, and a client that left ends it), or the plugin's own for a
// queued job.
func (p *Plugin) lookupVerdicts(ctx context.Context, scope string, keys [][32]byte, useKV bool) verdicts {
	ttl := p.cfg.Load().cacheTTL
	cache, now := p.cache.Load(), p.now()
	asked := cache.reading(now)
	if ttl <= 0 || len(keys) == 0 {
		return verdicts{passed: map[[32]byte]bool{}, asked: asked}
	}
	l := &lookup{p: p, cache: cache, ctx: ctx, scope: scope, now: now, ttl: ttl, kv: useKV && p.host != nil, asked: asked}
	names, segs := l.segments(keys)
	ids, hits, unread := l.hits(names, segs)
	v := l.decide(keys, segs, ids, hits, unread)
	v.asked = asked
	return v
}

// lookup is one lookupVerdicts call.
type lookup struct {
	p     *Plugin
	cache *lru
	ctx   context.Context
	scope string
	now   time.Time
	ttl   time.Duration
	kv    bool    // ask the KV
	asked reading // taken before the first read of the KV
}

// segments are the keys of the segments (names) and their values, in request
// order: from memory, and with the KV every one that is not there from the
// KV (and into memory), each key once. A segment that was not read (a KV
// error, the end of ctx, or a lookup without the KV) stays unknown.
func (l *lookup) segments(keys [][32]byte) (names []string, segs []segValue) {
	names, segs = make([]string, len(keys)), make([]segValue, len(keys))
	known := make([]bool, len(keys))
	var missing []string
	var listed map[string]bool // the keys in missing; made with the first
	for i, h := range keys {
		name := segKeyOf(l.scope, h)
		names[i] = name
		if segs[i], known[i] = l.cache.getSeg(name, l.now); !known[i] && !listed[name] {
			if listed == nil {
				listed = map[string]bool{}
			}
			listed[name] = true
			missing = append(missing, name)
		}
	}
	if !l.kv || len(missing) == 0 {
		return names, segs
	}
	got, read := l.p.kvRead(l.ctx, missing, kvSegUnit)
	now := l.p.now()
	vals := make(map[string]segValue, len(missing))
	for j, name := range missing {
		if read[j] {
			vals[name] = l.cache.mergeSeg(name, parseSeg(got[j].Value), now, l.ttl, l.asked)
		}
	}
	for i, name := range names {
		if !known[i] {
			segs[i] = vals[name]
		}
	}
	return names, segs
}

// hits loads the cached hits the segments point to: ids in request order,
// the newest first within a segment; every hit that is not in memory comes
// from the KV. A hit is nil when the KV answered that its entry is not there
// (or holds one that does not read or has expired): the pointer is stale.
// unread are the ids whose entry could not be read at all - a KV error, the
// end of ctx or, for a lookup without the KV, not in memory. Those hits may
// well exist.
//
// A stale pointer is removed from the values in memory of the segments (the
// KV is not written on the request path): a lookup without the KV cannot
// tell it from an unread one, and would leave the segment unknown every
// time. Removed are the pointers this lookup followed and no others
// (unpointRef): a run that hit the same set since then has written a new
// entry and new pointers, and those stay. The KV keeps the pointer until it
// expires or the key is written again; a node that reads it from there drops
// it the same way.
func (l *lookup) hits(names []string, segs []segValue) (ids []string, hits map[string]*storedHit, unread map[string]bool) {
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
	hitKeys := make([]string, len(missing))
	for j, id := range missing {
		hitKeys[j] = hitKeyOf(l.scope, id)
	}
	got, read := l.p.kvRead(l.ctx, hitKeys, kvHitUnit)
	now := l.p.now()
	for j, id := range missing {
		if !read[j] {
			unread[id] = true
			continue
		}
		if hit := decodeHit(got[j].Value, l.now, l.ttl); hit != nil {
			hits[id] = hit
			l.cache.putHit(hitKeys[j], hit, len(got[j].Value), now, l.ttl, l.asked)
			continue
		}
		for i := range segs {
			for _, ref := range segs[i].hits {
				if ref.id == id {
					l.cache.editSeg(names[i], unpointRef(ref), now, l.ttl)
				}
			}
		}
	}
	return ids, hits, unread
}

// decide: the first hit whose whole segment set is among keys, else the
// segments with a live pass. The pass of a segment that points to an unread
// hit does not count: that hit may hold the request's content, so the
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

// kvFailed counts a call of the KV that failed. A call that ended because
// its context did - the caller left, the node stops - did not fail at the KV
// and is not counted.
func (p *Plugin) kvFailed(ctx context.Context) {
	if ctx.Err() == nil {
		p.stats.kvErrors.Add(1)
	}
}

// kvTTL is the TTL of a KV entry that lives until the given time: the KV
// counts whole seconds and cuts off the rest, and 0 would be for ever, so it
// is rounded up and at least a second.
func kvTTL(until, now time.Time) time.Duration {
	return max((until.Sub(now) + time.Second - 1).Truncate(time.Second), time.Second)
}

// kvRead reads keys from the KV, all of them, in batch calls of unit keys one
// after the other. got[i] is the answer for key i. read[i] is false when the
// call for key i failed or ctx ended before it: the key is unknown then, not
// absent. A call that fails counts one kv error (kvFailed) and the calls
// after it are still made.
func (p *Plugin) kvRead(ctx context.Context, keys []string, unit int) (got []pluginsdk.KVValue, read []bool) {
	got, read = make([]pluginsdk.KVValue, len(keys)), make([]bool, len(keys))
	for from := 0; from < len(keys) && ctx.Err() == nil; from += unit {
		to := min(from+unit, len(keys))
		vals, err := pluginsdk.KVGetMany(ctx, p.host.KV(), kvNamespace, keys[from:to])
		if err != nil {
			p.kvFailed(ctx)
			continue
		}
		copy(got[from:to], vals)
		for i := from; i < to; i++ {
			read[i] = true
		}
	}
	return got, read
}

// kvReadAll reads segment keys for a change that needs every one of them (the
// write of a run): kvRead, one call after the other, up to the first that
// fails or the end of ctx - ok is false then, and the calls after it are not
// made.
func (p *Plugin) kvReadAll(ctx context.Context, keys []string) (got []pluginsdk.KVValue, ok bool) {
	got = make([]pluginsdk.KVValue, 0, len(keys))
	for from := 0; from < len(keys); from += kvSegUnit {
		vals, read := p.kvRead(ctx, keys[from:min(from+kvSegUnit, len(keys))], kvSegUnit)
		if slices.Contains(read, false) {
			return nil, false
		}
		got = append(got, vals...)
	}
	return got, true
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

// kvLock makes this node's changes of cache keys in the KV take turns: it
// waits until every key of keys is free, or until ctx ends (then nothing is
// held and the change is not made). unlock ends the turn.
//
// A change holds its keys from the read of their values to the moment the
// new values are in memory (writeRun) or tombstoned (writeReviewed). That is
// what keeps two changes of one key from losing an edit, memory from getting
// an older value after a newer one, and a write that was under way from
// landing after a review. The keys share kvLockStripes locks, which
// everybody takes in the same order; keys on one stripe wait for each other,
// which costs time and nothing else.
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
// hit and the segment keys that passed, at the unix time at. asked is the
// reading of the lookup the run's request asked the cache with, before the
// run judged.
type verdictWrite struct {
	ttl    time.Duration
	hits   []hitWrite
	passes []string
	at     int64
	asked  reading
}

// storeVerdicts hands the verdicts of a run to the cache, to be kept for ttl
// under scope: the segments that passed at the unix time at, and the chunks
// that hit. It does not wait for the write (writeVerdicts), which runs in
// the background on the plugin's own context: Shutdown ends that after the
// queue had its time, and waits for the writes that began before it
// (goTracked).
//
// asked is the reading of the request's lookup (verdicts.asked): the run
// judged what that lookup did not find, and knows of no review since.
func (p *Plugin) storeVerdicts(scope string, passes [][32]byte, hits []storedHit, at int64, ttl time.Duration, asked reading) {
	if p.host == nil {
		return
	}
	w := &verdictWrite{ttl: ttl, at: at, asked: asked}
	for i := range hits {
		hit := &hits[i]
		id, body := hitIDOf(hit.Keys), encodeHit(hit)
		if id == "" || body == nil {
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

// writeVerdicts writes what a run decided (writeRun) and then, its turn at
// the keys given back, tells the other nodes which segment keys now point to
// a hit of the run: they may hold those in memory without the pointer.
func (p *Plugin) writeVerdicts(ctx context.Context, w *verdictWrite) {
	if pointed := p.writeRun(ctx, w); len(pointed) > 0 {
		p.publishVerdictChanged(verdictChanged{Keys: pointed, Stored: true})
	}
}

// keys are the hit keys of the write and its segment keys, the latter sorted
// and each once.
func (w *verdictWrite) keys() (hitKeys, segKeys []string) {
	segKeys = slices.Clone(w.passes)
	for _, hw := range w.hits {
		hitKeys = append(hitKeys, hw.key)
		segKeys = append(segKeys, hw.segs...)
	}
	slices.Sort(segKeys)
	return hitKeys, slices.Compact(segKeys)
}

// changes is what the write puts into the KV when its segment keys hold the
// values held there: the hits whose entry is written (stored), the segment
// keys with the passes and the pointers of the run merged in (items) - what
// other nodes stored under a key stays - and the segment keys that get a
// pointer (pointed). A key a review may have changed (reviewed) is left
// alone, and a hit whose entry is left alone gets no pointers either; nor
// does a hit that has expired.
func (w *verdictWrite) changes(held map[string][]byte, reviewed func(key string) bool, now time.Time) (stored []hitWrite, items []pluginsdk.KVItem, pointed []string) {
	var ops segOps
	for _, hw := range w.hits {
		if !now.Before(hw.hit.expires(w.ttl)) || reviewed(hw.key) {
			continue
		}
		stored = append(stored, hw)
		for _, key := range hw.segs {
			if !reviewed(key) {
				ops.add(key, pointTo(hw.id, hw.hit.At))
			}
		}
	}
	pointed = slices.Clone(ops.keys) // only pointers were added so far
	for _, key := range w.passes {
		if !reviewed(key) {
			ops.add(key, passAt(w.at))
		}
	}
	items = make([]pluginsdk.KVItem, 0, len(ops.keys))
	for _, key := range ops.keys {
		if item, left := ops.apply(key, held[key], now, w.ttl); left {
			items = append(items, item)
		}
	}
	return stored, items, pointed
}

// writeRun writes what a run decided to the KV and then puts it into memory;
// pointed are the segment keys that now point to a hit of the run.
//
//  1. It waits for its turn at the keys (kvLock) and keeps it to the end.
//  2. The segment keys are read from the KV.
//  3. The passes and the pointers of the run are merged into what was read
//     (changes).
//  4. The hit entries are written, then the segment keys: no pointer is in
//     the KV before its entry.
//  5. What was written goes into memory, as the KV now holds it.
//
// When a call of 2 or 4 fails or ctx ends, it stops: nothing of the run
// comes into memory and nothing is retried - the next run of the content
// writes it again. What the KV took before the failure stays there: hit
// entries without pointers, or the segment keys of the calls that worked.
// Those keys leave memory, which may hold them without their new pointers,
// and the pointed ones among them are returned.
//
// A key a review may have changed since the request of the run asked the
// cache (lru.reviewed, under verdictWrite.asked) is left alone, in the KV
// and in memory; when that reading has lapsed the run writes nothing at all
// (counted, kv_skipped). A review on this node is seen because of the turn
// (writeReviewed), one on another node once its broadcast is here: a write
// that lands in the KV after that review wrote there and before its
// broadcast arrives puts the hit there again until it expires.
func (p *Plugin) writeRun(ctx context.Context, w *verdictWrite) (pointed []string) {
	hitKeys, keys := w.keys()
	unlock, err := p.kvLock(ctx, hitKeys, keys)
	if err != nil {
		return nil // the node stops
	}
	defer unlock()
	cache := p.cache.Load()
	if cache.lapsedSince(w.asked, p.now()) {
		p.stats.kvSkipped.Add(1)
		return nil // before the KV is asked
	}
	since := cache.reading(p.now())
	got, ok := p.kvReadAll(ctx, keys)
	if !ok {
		return nil
	}
	if cache.lapsedSince(w.asked, p.now()) {
		p.stats.kvSkipped.Add(1)
		return nil
	}
	now := p.now()
	held := make(map[string][]byte, len(keys))
	for i, key := range keys {
		held[key] = got[i].Value
	}
	stored, items, pointed := w.changes(held, func(key string) bool { return cache.reviewedSince(key, w.asked, now) }, now)
	entries := make([]pluginsdk.KVItem, len(stored))
	for i, hw := range stored {
		entries[i] = pluginsdk.KVItem{Key: hw.key, Value: hw.body, TTL: kvTTL(hw.hit.expires(w.ttl), now)}
	}
	if _, err := p.kvWrite(ctx, entries); err != nil {
		return nil
	}
	if done, err := p.kvWrite(ctx, items); err != nil {
		written := make([]string, done)
		for i, item := range items[:done] {
			written[i] = item.Key
		}
		cache.forget(written)
		return slices.DeleteFunc(pointed, func(key string) bool { return !slices.Contains(written, key) })
	}
	// Into memory, as a read that began before this write's own read of the
	// KV (since) - not the request's reading: a review of other keys since
	// then must not keep the run's own hit out of the node that stored it. A
	// value that must stay out all the same (reviewed) is not left as it was
	// either: memory would keep what the KV no longer has (the passes of A
	// and B, with the hit of {A, B} just written). The key leaves memory and
	// is read from the KV the next time.
	now = p.now()
	var out []string
	for _, hw := range stored {
		if !cache.putHit(hw.key, hw.hit, len(hw.body), now, w.ttl, since) {
			out = append(out, hw.key)
		}
	}
	for _, item := range items {
		if !cache.putSeg(item.Key, item.Value, now, w.ttl, since) {
			out = append(out, item.Key)
		}
	}
	cache.forget(out)
	return pointed
}

// ---------------------------------------------------------------- clear

// clearVerdictCache is POST /verdict-cache/clear: every cached verdict is
// dropped, so content is moderated again under the current configuration.
// The clear counter is part of every key: the entries in the KV are not
// deleted one by one, they are no longer read and expire. config_version is
// bumped too, so the other nodes pick the new counter up with the broadcast
// or their next poll. Runs in progress and queued jobs notice the new
// counter when they come to the cache (scopeNow).
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
// the hit set of their verdict chunk (trace.cache). status is one of
// reviewStatuses:
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
// that is gone or disabled are skipped (reviewedHits).
//
// The KV is what the nodes share, so it decides: it is written before the
// review is answered, and the result is the number of records whose every
// write succeeded. The writes run on ctx, the review request, and have no
// time limit beside it: a request that ends first leaves the rest unwritten
// and its records uncounted; reviewing them again repeats the writes. Memory
// is never given the new values: the keys are tombstoned on this node
// (writeReviewed) and, with the broadcast, on the others, and read from the
// KV afterwards - after a failed write the old verdict on every node rather
// than the new one on this node only.
func (p *Plugin) syncReviewed(ctx context.Context, ids []int64, status string) int {
	ttl := p.cfg.Load().cacheTTL
	// A status that is none of the three would be written as a deletion of
	// the hits (writeReviewed): refused here too, whatever the caller checked.
	if ttl <= 0 || p.host == nil || !slices.Contains(reviewStatuses, status) {
		return 0
	}
	hits := p.reviewedHits(ctx, ids, status)
	if len(hits) == 0 {
		return 0
	}
	keys := reviewedKeys(hits)
	p.writeReviewed(ctx, hits, keys, status, ttl)
	synced := 0
	for _, h := range hits {
		if !h.failed {
			synced += h.records
		}
	}
	p.publishVerdictChanged(verdictChanged{Keys: keys})
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
			if body = encodeHit(&hit); body == nil {
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

// writeReviewed writes the reviewed hits to the KV and marks the ones a write
// failed for (failed). The hit entries come first: no pointer is written to
// an entry that is not there, and no pass beside a hit that could not be
// deleted. Then the segment keys are read, edited and written back (or
// deleted, when nothing is left of one).
//
// keys, all the keys of the review, are tombstoned before anything else,
// without an end: nothing comes into memory under them while the review
// writes. Then the review waits for its turn at them (kvLock) - a write of a
// run that has it finishes first, and the review writes over it. When the
// writes are over the tombstones get their time, and only after that the
// turn ends: a run that waited for it finds the keys tombstoned and leaves
// them alone. A review that ctx ended while it waited wrote nothing; its
// hits are marked failed.
func (p *Plugin) writeReviewed(ctx context.Context, hits []*reviewedHit, keys []string, status string, ttl time.Duration) {
	cache := p.cache.Load()
	cache.tombstoneOpen(keys, p.now())
	timed := func() { cache.tombstone(keys, p.now()) }
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
	failed := func(seg string) {
		for _, h := range users[seg] {
			h.failed = true
		}
	}
	got, read := p.kvRead(ctx, ops.keys, kvSegUnit)
	now := p.now()
	var sets []pluginsdk.KVItem
	var gone []string
	for i, key := range ops.keys {
		if !read[i] {
			failed(key)
			continue
		}
		if item, left := ops.apply(key, got[i].Value, now, ttl); left {
			sets = append(sets, item)
		} else if got[i].Found {
			gone = append(gone, key)
		}
	}
	done, _ = p.kvWrite(ctx, sets)
	for _, item := range sets[done:] {
		failed(item.Key)
	}
	done, _ = p.kvDelete(ctx, gone)
	for _, key := range gone[done:] {
		failed(key)
	}
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
// messages below the broadcast payload limit. It runs on the plugin's own
// context: the nodes are told also when the request of a review has ended.
func (p *Plugin) publishVerdictChanged(msg verdictChanged) {
	send := func(keys []string) {
		payload, _ := json.Marshal(verdictChanged{Keys: keys, Stored: msg.Stored})
		if err := p.host.Publish(p.postCtx, TopicVerdictChanged, payload); err != nil {
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
// tombstoned as well. Keys that got a pointer to a stored hit are only
// dropped - a tombstone would keep this node's own runs from writing to a
// segment many hits share.
//
// Dropping does not hold against what is under way at that moment: a lookup
// that read a key from the KV before the pointer was written puts the old
// value into memory after the drop (mergeSeg). Such a value is then one the
// broadcast never reached. A run of this node that ends right after the drop
// does not add to that: its write reads the key from the KV again, the
// pointer with it. Closing the window would take a mark per dropped key that
// outlives the reads under way, as the tombstones of a review do, at the
// price named above; it is left open.
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
	cache.tombstone(msg.Keys, p.now())
	return nil
}

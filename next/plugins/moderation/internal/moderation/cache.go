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
//
// Memory is a front of the KV, so a node can hold a segment value the KV no
// longer holds like that: one that lacks a pointer another node wrote since
// (the passes of A and B, while the hit of {A, B} is in the KV), or one that
// still has what a review on another node removed (the pointer to a hit
// reviewed as a false positive). Two things bound how long such a value
// decides:
//
//   - a node that stored a hit in the KV publishes verdict.changed with the
//     segment keys it pointed to the hit ("stored": true), a node that synced
//     a review publishes the keys the review changed; the nodes that get it
//     drop those keys from memory and read them from the KV the next time
//     (storeVerdicts, syncReviewed, onVerdictChanged). That is the normal
//     case: the change counts on the other nodes from the delivery of the
//     broadcast on;
//   - a broadcast can be lost, so a segment value in memory is used for
//     verdictRecheck (5 minutes) after it was last read from the KV; then
//     the next lookup reads it again, at most kvLookupMax such keys per
//     lookup, the longest unread first (lookup.segments), and what the KV
//     holds REPLACES the value in memory (lru.resyncSeg) - a merge would
//     keep the pointer or the pass a review removed until it expires. The
//     hit entries the old value pointed to leave memory with it and are read
//     from the KV again when a pointer still names them. A lookup that asks
//     the KV does this before it decides, a lookup of memory alone (the hook
//     under post timing, which never waits for the KV) in the background
//     (recheckSoon) - the request that finds the value due is then still
//     answered from memory, the next one is not.
//
// So without the broadcast a hit stored on one node, and a review synced on
// one node, decide on every other node at most verdictRecheck after that
// node last read the segment keys from the KV (for a value it never read:
// after it made it), as long as the KV answers - under post timing one
// request later. The cases outside that bound, each ending with the lookup
// that reads the key: a request with more than kvLookupMax values due (the
// rest are used once more and are first in line in the next lookup), a KV
// read that fails or runs out of its budget (the value in memory is used),
// and a segment this node stored itself without having been able to read it
// from the KV (the 5 minutes count from that store).
//
// The replace would also drop what a run on this node stored a moment ago
// and whose background write has not reached the KV yet (the value in memory
// keeps the time of its last read when a run edits it). So the parts written
// within tombstoneTTL - longer than a background write can take - stay; they
// are judged by the KV with the next recheck. A pass a node stored in memory
// and could not write to the KV (a KV failure, or more than kvLookupMax new
// passes in one run) is therefore gone with the first recheck that reads the
// key, and the segment is moderated again: the KV decides.
//
// A hit is not given up like that: the parts of its set can pass one by one
// on other nodes, and with the hit gone from the only node that knew it the
// whole set would be answered by those passes. So a hit entry a run on this
// node stored stays marked unlanded in memory until its write to the KV -
// the entry and every pointer of that write - is known to have worked
// (writeVerdicts, lru.landed). A recheck keeps the pointers to an unlanded
// entry and the entry itself, whatever the KV holds, and writes them to the
// KV again in the background (resyncSeg, lookup.rewrite), with the time of
// the hit's first write, so its TTL is not renewed; a write that fails again
// is repeated with the next recheck. Until one works the other nodes do not
// know the hit and moderate its content themselves. An entry that was read
// from the KV, or whose write was confirmed, is not marked: when the KV no
// longer holds it a review deleted it, and it is never written back. Keys a
// review changed on this node are tombstoned, which drops the entry and
// refuses the write. What stays open: a hit whose write never landed and
// whose record was reviewed on another node, the broadcast of that review
// lost as well - this node writes the hit again at its next recheck.
//
// A pointer whose hit entry the KV answered "not there" for is removed from
// the values in memory of the segments of that lookup (lookup.hits; the KV
// is not written on the request path): otherwise a lookup of memory alone
// would find the entry unreadable every time and queue the request until the
// pointer expires.
//
// A pointer whose hit entry cannot be read - a KV error, the budget, the
// limit of kvLookupMax entries, or under a lookup of memory alone an entry
// that is not in memory - is not a stale pointer: its segment is unknown for
// that lookup, whatever pass it has (lookup.hits, decide). Only an entry the
// KV answered "not there" for leaves the segment to its pass.

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
	kvSyncBudgetMax = 10 * time.Second
	// verdictRecheck: how long a segment value in memory is used without
	// reading the KV again (see the top of the file).
	verdictRecheck = 5 * time.Minute
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
	// process is limited to 512 MB (CONTRACTS §72.2), of which the requests
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
	// tombstoneTTL: how long a key a review changed is neither loaded into
	// memory nor written by a run (lru.kill): longer than any lookup or
	// background write that started before the review can last.
	tombstoneTTL = 2 * kvWriteBudget
)

// kvSyncBudget is the time a review sync gets for every kvLookupMax keys (a
// variable for the tests).
var kvSyncBudget = time.Second

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
// synced is when a segment value was last read from the KV, or made on this
// node: verdictRecheck later it is read again. unlanded marks a hit a run on
// this node stored whose write to the KV is not known to have worked (see the
// top of the file).
type cacheEntry struct {
	key      string
	val      []byte
	hit      *storedHit
	size     int64
	expires  time.Time
	synced   time.Time
	unlanded bool
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
// from the KV, or a run that finished meanwhile, cannot bring it back. A
// tombstone is dropped once its time is over (reap); deadNext is the first
// time one is.
type lru struct {
	mu       sync.Mutex
	max      int
	maxBytes int64
	bytes    int64
	ll       *list.List
	items    map[string]*list.Element
	dead     map[string]time.Time
	deadNext time.Time
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
	if len(c.dead) == 0 || now.Before(c.deadNext) {
		return
	}
	c.deadNext = time.Time{}
	for k, until := range c.dead {
		if !now.Before(until) {
			delete(c.dead, k)
			c.bytes -= tombstoneSize(k)
		} else if c.deadNext.IsZero() || until.Before(c.deadNext) {
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

// seg returns the value of a segment key and when it was last read from the
// KV.
func (c *lru) seg(key string, now time.Time) (v segValue, synced time.Time, ok bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if e := c.entry(key, now); e != nil && e.hit == nil {
		return parseSeg(e.val), e.synced, true
	}
	return v, synced, false
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

// putHit stores a decoded hit whose JSON has bodyLen bytes; false while the
// key is tombstoned. unlanded: a run on this node decided it and its write to
// the KV is still to come (false for an entry read from the KV).
func (c *lru) putHit(key string, hit *storedHit, bodyLen int, expires, now time.Time, unlanded bool) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.isDead(key, now) {
		return false
	}
	c.set(&cacheEntry{key: key, hit: hit, size: entrySize(key, hitDecodedFactor*bodyLen), expires: expires, unlanded: unlanded})
	return true
}

// landed marks the hit entry of key, written at the unix time at, as written
// to the KV.
func (c *lru) landed(key string, at int64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[key]; ok {
		if e := el.Value.(*cacheEntry); e.hit != nil && e.hit.At == at {
			e.unlanded = false
		}
	}
}

// update applies edit to the value of a segment key (empty when there is
// none) and stores the result, or removes the key when nothing is left. It
// returns the entry as stored; nil when nothing is left or the key is
// tombstoned (then nothing happens). c.mu is held.
func (c *lru) update(key string, now time.Time, ttl time.Duration, edit segEdit) *cacheEntry {
	if c.isDead(key, now) {
		return nil
	}
	var v segValue
	synced := now
	if e := c.entry(key, now); e != nil {
		v, synced = parseSeg(e.val), e.synced
	}
	edit(&v)
	v.prune(now, ttl)
	if v.empty() {
		c.drop(key)
		return nil
	}
	val := v.encode()
	e := &cacheEntry{key: key, val: val, size: entrySize(key, len(val)), expires: v.expires(ttl), synced: synced}
	c.set(e)
	return e
}

// editSeg applies what a run on this node decided to the value of a segment
// key. Nothing happens while the key is tombstoned.
func (c *lru) editSeg(key string, now time.Time, ttl time.Duration, edit segEdit) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.update(key, now, ttl, edit)
}

// syncSeg takes what the KV holds for a segment key into memory, with the
// times of its writes (not a fresh TTL) and beside what a run on this node
// stored meanwhile, and marks the key as read from the KV now. It returns
// the value to decide with: the one in memory, or kv alone while the key is
// tombstoned (a review changed it since this lookup read it; memory is left
// alone).
func (c *lru) syncSeg(key string, now time.Time, ttl time.Duration, kv segValue) segValue {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.isDead(key, now) {
		return kv
	}
	e := c.update(key, now, ttl, func(v *segValue) { v.merge(kv) })
	if e == nil {
		return segValue{}
	}
	e.synced = now
	return parseSeg(e.val)
}

// resyncSeg replaces the value of a segment key in memory by kv, what the KV
// holds now, for a value that was due for another read (verdictRecheck), and
// marks it as read now: what the KV no longer holds - a pointer or a pass a
// review on another node removed - is gone from memory too. Two things are
// kept or dropped beside it:
//
//   - the parts of the old value written within tombstoneTTL stay: a run on
//     this node stored them and their write to the KV may still be under way
//     (only a run puts so young a part into a value that is due);
//   - the pointers to a hit entry in memory that is unlanded - a run on this
//     node stored it and its write to the KV did not work, or not all of it -
//     stay as well, with the entry: the KV never held that hit, so its
//     absence there says nothing. Those hits are returned (unlanded) for the
//     caller to write them to the KV again;
//   - the other hit entries (under scope) the old value pointed to, the
//     young ones apart, are dropped from memory: the next lookup reads them
//     from the KV if a pointer still names them, so a hit that was deleted
//     there is not replayed from memory.
//
// It returns the value to decide with, as syncSeg does (kv alone while the
// key is tombstoned).
func (c *lru) resyncSeg(key, scope string, now time.Time, ttl time.Duration, kv segValue) (v segValue, unlanded []*storedHit) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.isDead(key, now) {
		return kv, nil
	}
	young := now.Add(-tombstoneTTL).Unix()
	var old []hitRef
	e := c.update(key, now, ttl, func(v *segValue) {
		var own segValue
		if v.pass >= young {
			own.pass = v.pass
		}
		for _, h := range v.hits {
			if h.at >= young {
				own.hits = append(own.hits, h)
			} else if hit := c.unlandedHit(hitKeyOf(scope, h.id), now); hit != nil {
				own.hits = append(own.hits, h)
				unlanded = append(unlanded, hit)
			} else {
				old = append(old, h)
			}
		}
		*v = kv
		v.merge(own)
	})
	for _, h := range old {
		c.drop(hitKeyOf(scope, h.id))
	}
	if e == nil {
		return segValue{}, unlanded
	}
	e.synced = now
	return parseSeg(e.val), unlanded
}

// unlandedHit returns the hit of a hit key when it is in memory, live, not
// tombstoned and marked unlanded; nil otherwise. c.mu is held.
func (c *lru) unlandedHit(key string, now time.Time) *storedHit {
	el, ok := c.items[key]
	if !ok || c.isDead(key, now) {
		return nil
	}
	if e := el.Value.(*cacheEntry); e.hit != nil && e.unlanded && now.Before(e.expires) {
		return e.hit
	}
	return nil
}

// forget drops the keys: their next read is from the KV.
func (c *lru) forget(keys []string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, k := range keys {
		c.drop(k)
	}
}

// kill drops the keys and tombstones them until the given time.
func (c *lru) kill(keys []string, until, now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.reap(now)
	for _, k := range keys {
		c.drop(k)
	}
	if !now.Before(until) {
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
	if c.deadNext.IsZero() || until.Before(c.deadNext) {
		c.deadNext = until
	}
	for c.ll.Len() > 0 && c.bytes > c.maxBytes {
		c.remove(c.ll.Back())
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
// request order) under scope: memory first, then (useKV) the KV for the
// misses and for the values due for another read, within the lookup budget;
// without the KV the values that are due are read in the background.
// The first cached hit whose whole segment set is in the request is returned
// for replay - before any pass is looked at, so a hit set whose segments
// passed one by one elsewhere is still a hit; otherwise the segments that
// passed. Anything the cache cannot answer is unknown and moderated again.
func (p *Plugin) lookupVerdicts(scope string, keys [][32]byte, useKV bool) verdicts {
	ttl := p.cfg.Load().cacheTTL
	if ttl <= 0 || len(keys) == 0 {
		return verdicts{passed: map[[32]byte]bool{}}
	}
	ctx, cancel := context.WithTimeout(p.bg, kvLookupBudget)
	defer cancel()
	// The reads of one lookup: up to kvLookupMax misses, kvLookupMax values
	// that are due and kvLookupMax hit entries, kvLookupWorkers at a time,
	// all within kvLookupBudget. The misses and the hit entries decide
	// whether content is known; the values that are due can wait for the
	// next lookup. So those get the first half of the budget only: the hit
	// entries are not left without time by them (a pointer whose entry was
	// not read makes its segment unknown, decide).
	due, cancelDue := context.WithTimeout(ctx, kvLookupBudget/2)
	defer cancelDue()
	l := &lookup{p: p, cache: p.cache.Load(), ctx: ctx, due: due, scope: scope, now: p.now(), ttl: ttl, kv: useKV && p.host != nil}
	segs := l.segments(keys)
	ids, hits, unread := l.hits(segs, func(i int) string { return segKeyOf(scope, keys[i]) })
	return l.decide(keys, segs, ids, hits, unread)
}

// lookup is one lookupVerdicts call.
type lookup struct {
	p     *Plugin
	cache *lru
	ctx   context.Context // the KV budget
	due   context.Context // the part of it for the values due for another read
	scope string
	now   time.Time
	ttl   time.Duration
	kv    bool // ask the KV
}

// rewrite writes hits of this node that never landed in the KV (resyncSeg)
// there again, in the background as storeVerdicts does: the entry and the
// pointers of its newest kvLookupMax segments, each hit once.
func (l *lookup) rewrite(hits []*storedHit) {
	var writes []hitWrite
	seen := map[*storedHit]bool{}
	for _, hit := range hits {
		if seen[hit] {
			continue
		}
		seen[hit] = true
		id, body := encodeHit(hit)
		if id == "" {
			continue
		}
		w := hitWrite{key: hitKeyOf(l.scope, id), id: id, body: body, at: hit.At}
		for _, seg := range hit.Keys[max(len(hit.Keys)-kvLookupMax, 0):] {
			w.segs = append(w.segs, segKeyHex(l.scope, seg))
		}
		writes = append(writes, w)
	}
	if len(writes) == 0 {
		return
	}
	p, ttl := l.p, l.ttl
	p.stats.kvWriting.Add(1)
	go func() {
		defer p.stats.kvWriting.Add(-1)
		defer p.recoverTracked() // nothing else recovers in this goroutine
		p.writeVerdicts(ttl, writes, nil, 0)
	}()
}

// segments loads the values of the segments: from memory, and with the KV
// also from there (and into memory) - the misses, the newest kvLookupMax of
// them, and the values in memory that are due for another read
// (verdictRecheck), the kvLookupMax longest unread, which what the KV holds
// replaces (resyncSeg). A value that is due and was not read (beyond the
// limit, a KV error, the budget) is used as it is.
// Without the KV every value in memory is used, and the ones that are due
// are read in the background.
func (l *lookup) segments(keys [][32]byte) []segValue {
	segs := make([]segValue, len(keys))
	var misses, due []int
	var read map[int]time.Time // due: when the value was last read
	for i, h := range keys {
		v, synced, ok := l.cache.seg(segKeyOf(l.scope, h), l.now)
		if !ok {
			misses = append(misses, i)
			continue
		}
		segs[i] = v
		if l.now.Sub(synced) >= verdictRecheck {
			if read == nil {
				read = map[int]time.Time{}
			}
			due = append(due, i)
			read[i] = synced
		}
	}
	if len(due) > kvLookupMax {
		slices.SortStableFunc(due, func(a, b int) int { return read[a].Compare(read[b]) })
		due = due[:kvLookupMax]
	}
	names := func(asked []int) []string {
		out := make([]string, len(asked))
		for j, i := range asked {
			out[j] = segKeyOf(l.scope, keys[i])
		}
		return out
	}
	if !l.kv {
		if len(due) > 0 {
			l.recheckSoon(names(due))
		}
		return segs
	}
	if len(misses) > kvLookupMax {
		misses = misses[len(misses)-kvLookupMax:] // the newest content
	}
	if len(misses) > 0 {
		asked := names(misses)
		raws, ok := l.p.kvGet(l.ctx, asked)
		for j, i := range misses {
			if ok[j] {
				segs[i] = l.cache.syncSeg(asked[j], l.now, l.ttl, parseSeg(raws[j]))
			}
		}
	}
	if len(due) > 0 {
		asked := names(due)
		raws, ok := l.p.kvGet(l.due, asked)
		var unlanded []*storedHit
		for j, i := range due {
			if ok[j] {
				var hits []*storedHit
				segs[i], hits = l.cache.resyncSeg(asked[j], l.scope, l.now, l.ttl, parseSeg(raws[j]))
				unlanded = append(unlanded, hits...)
			}
		}
		l.rewrite(unlanded)
	}
	return segs
}

// recheckSoon reads the segment keys names from the KV into memory in the
// background, with the hits they point to, for a lookup that does not wait
// for the KV and found their values due (verdictRecheck). One batch at a
// time on a node: a call that finds another under way does nothing, and the
// next lookup that still finds its keys due asks again.
func (l *lookup) recheckSoon(names []string) {
	p := l.p
	if p.host == nil || len(names) == 0 || !p.rechecking.CompareAndSwap(false, true) {
		return
	}
	go func() {
		defer p.rechecking.Store(false)
		defer p.recoverTracked() // nothing else recovers in this goroutine
		ctx, cancel := context.WithTimeout(p.bg, kvWriteBudget)
		defer cancel()
		bg := &lookup{p: p, cache: l.cache, ctx: ctx, due: ctx, scope: l.scope, now: p.now(), ttl: l.ttl, kv: true}
		raws, ok := p.kvGet(ctx, names)
		var segs []segValue
		var read []string
		var unlanded []*storedHit
		for j, name := range names {
			if ok[j] {
				seg, hits := bg.cache.resyncSeg(name, bg.scope, bg.now, bg.ttl, parseSeg(raws[j]))
				segs, read, unlanded = append(segs, seg), append(read, name), append(unlanded, hits...)
			}
		}
		bg.hits(segs, func(i int) string { return read[i] })
		bg.rewrite(unlanded)
	}()
}

// hits loads the cached hits the segments point to: ids in request order,
// the newest first within a segment; a hit that is not in memory comes from
// the KV (at most kvLookupMax of them). A hit is nil when it is nowhere - the
// KV answered that the entry is not there, or holds one that does not read
// or has expired: the pointer is stale. unread are the ids whose entry could
// not be read at all: a KV error, the budget, beyond kvLookupMax, or, for a
// lookup of memory alone, not in memory. Those hits may well exist.
//
// The pointers to an entry the KV answered for and that is nowhere are
// removed from the values in memory of the segments (name(i) is the key of
// segs[i]): a lookup of memory alone cannot tell such a pointer from one
// whose entry is merely not in memory, and would leave the segment unknown
// every time. The KV keeps the pointer until it expires or the key is
// written again; a node that reads it from there drops it the same way.
func (l *lookup) hits(segs []segValue, name func(i int) string) (ids []string, hits map[string]*storedHit, unread map[string]bool) {
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
	asked := 0
	if l.kv {
		asked = min(len(missing), kvLookupMax)
	}
	for _, id := range missing[asked:] {
		unread[id] = true
	}
	if asked == 0 {
		return ids, hits, unread
	}
	missing = missing[:asked]
	names := make([]string, len(missing))
	for j, id := range missing {
		names[j] = hitKeyOf(l.scope, id)
	}
	raws, ok := l.p.kvGet(l.ctx, names)
	for j, raw := range raws {
		if !ok[j] {
			unread[missing[j]] = true
			continue
		}
		if hit := decodeHit(raw, l.now, l.ttl); hit != nil {
			hits[missing[j]] = hit
			l.cache.putHit(names[j], hit, len(raw), hit.expires(l.ttl), l.now, false)
			continue
		}
		// Not a pointer written a moment ago: its entry may be on its way.
		young := l.now.Add(-tombstoneTTL).Unix()
		for i := range segs {
			if slices.ContainsFunc(segs[i].hits, func(h hitRef) bool { return h.id == missing[j] && h.at < young }) {
				l.cache.editSeg(name(i), l.now, l.ttl, unpoint(missing[j]))
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

// kvGet reads keys from the KV until ctx ends. ok[i] reports that key i was
// read; out[i] is nil for a key that is absent or was not read - what was
// not read stays unknown.
func (p *Plugin) kvGet(ctx context.Context, keys []string) (out [][]byte, ok []bool) {
	out = make([][]byte, len(keys))
	ok = p.kvRun(ctx, len(keys), func(i int) error {
		val, found, err := p.host.KV().Get(ctx, kvNamespace, keys[i])
		if err == nil && found {
			out[i] = val
		}
		return err
	})
	return out, ok
}

// kvLock serializes this node's changes of a cache key in the KV.
func (p *Plugin) kvLock(key string) *sync.Mutex {
	h := fnv.New32a()
	_, _ = h.Write([]byte(key))
	return &p.kvMu[h.Sum32()%kvLockStripes]
}

// kvChange runs one change of a cache key in the KV, one at a time per key
// on this node (kvLock). A change whose ctx ended while it waited for its
// turn is not made.
func (p *Plugin) kvChange(ctx context.Context, key string, change func() error) error {
	mu := p.kvLock(key)
	mu.Lock()
	defer mu.Unlock()
	if err := ctx.Err(); err != nil {
		return err
	}
	return change()
}

// reviewed reports whether a review changed the key on this node a moment
// ago (as far as this node knows): what a run decided before is not written
// over it. Asked inside kvChange, so a review that follows waits for the
// write.
func (p *Plugin) reviewed(key string) bool {
	return p.cache.Load().tombstoned(key, p.now())
}

// kvSetHit stores a hit entry.
func (p *Plugin) kvSetHit(ctx context.Context, key string, body []byte, ttl time.Duration) error {
	return p.kvChange(ctx, key, func() error { return p.host.KV().Set(ctx, kvNamespace, key, body, ttl) })
}

// kvDeleteHit deletes a hit entry.
func (p *Plugin) kvDeleteHit(ctx context.Context, key string) error {
	return p.kvChange(ctx, key, func() error { return p.host.KV().Delete(ctx, kvNamespace, key) })
}

// kvSetRunHit stores the hit entry of a run unless the key was reviewed;
// stored reports whether it was written.
func (p *Plugin) kvSetRunHit(ctx context.Context, key string, body []byte, ttl time.Duration) (stored bool, err error) {
	err = p.kvChange(ctx, key, func() error {
		if p.reviewed(key) {
			return nil
		}
		stored = true
		return p.host.KV().Set(ctx, kvNamespace, key, body, ttl)
	})
	return stored && err == nil, err
}

// kvEditSeg reads a segment key, applies the edits and writes it back (or
// deletes it when nothing is left).
func (p *Plugin) kvEditSeg(ctx context.Context, key string, edits []segEdit, ttl time.Duration) error {
	return p.kvChange(ctx, key, func() error { return p.kvRewriteSeg(ctx, key, edits, ttl) })
}

// kvEditRunSeg is kvEditSeg for what a run decided: not when the key was
// reviewed.
func (p *Plugin) kvEditRunSeg(ctx context.Context, key string, edits []segEdit, ttl time.Duration) error {
	return p.kvChange(ctx, key, func() error {
		if p.reviewed(key) {
			return nil
		}
		return p.kvRewriteSeg(ctx, key, edits, ttl)
	})
}

// kvRewriteSeg is the read, edit and write of a segment key (inside
// kvChange).
func (p *Plugin) kvRewriteSeg(ctx context.Context, key string, edits []segEdit, ttl time.Duration) error {
	now := p.now()
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

// hitWrite is a hit of a run on its way to the KV: its entry and the
// segment keys that get a pointer to it.
type hitWrite struct {
	key, id string
	body    []byte
	at      int64
	segs    []string
}

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
	var writes []hitWrite
	for i := range hits {
		hit := &hits[i]
		id, body := encodeHit(hit)
		if id == "" {
			continue
		}
		w := hitWrite{key: hitKeyOf(scope, id), id: id, body: body, at: hit.At}
		if !cache.putHit(w.key, hit, len(body), hit.expires(ttl), now, true) {
			continue
		}
		for j, seg := range hit.Keys {
			key := segKeyHex(scope, seg)
			cache.editSeg(key, now, ttl, pointTo(id, hit.At))
			if j >= len(hit.Keys)-kvLookupMax {
				w.segs = append(w.segs, key)
			}
		}
		writes = append(writes, w)
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
	if p.host == nil || len(writes)+len(passKeys) == 0 {
		return
	}
	p.stats.kvWriting.Add(1)
	go func() {
		defer p.stats.kvWriting.Add(-1)
		defer p.recoverTracked() // nothing else recovers in this goroutine
		p.writeVerdicts(ttl, writes, passKeys, at)
	}()
}

// writeVerdicts is the KV part of storeVerdicts: the hit entries, then the
// segment keys (a pointer for every entry that was written, the passes),
// within kvWriteBudget. The segment keys that now point to a hit are
// published (verdict.changed, "stored"): the other nodes may hold them in
// memory without the pointer and read them again.
//
// A hit entry lives for the TTL from the time of the hit (hitWrite.at), also
// when it is written again later (lookup.rewrite). A hit whose entry and
// pointers were all written is marked as landed in memory; one a write
// failed for stays unlanded and is written again with the next recheck of
// one of its segments (resyncSeg). Nothing is retried here.
func (p *Plugin) writeVerdicts(ttl time.Duration, hits []hitWrite, passKeys []string, at int64) {
	ctx, cancel := context.WithTimeout(context.Background(), kvWriteBudget)
	defer cancel()
	stored := make([]bool, len(hits))
	now := p.now()
	set := p.kvRun(ctx, len(hits), func(i int) (err error) {
		left := time.Unix(hits[i].at, 0).Add(ttl).Sub(now)
		if left <= 0 {
			return nil // expired meanwhile
		}
		// The KV counts whole seconds, and cuts off the rest.
		stored[i], err = p.kvSetRunHit(ctx, hits[i].key, hits[i].body, (left + time.Second - 1).Truncate(time.Second))
		return err
	})
	var ops segOps
	for i, w := range hits {
		if stored[i] {
			for _, key := range w.segs {
				ops.add(key, pointTo(w.id, w.at))
			}
		}
	}
	pointed := len(ops.keys)
	for _, key := range passKeys {
		ops.add(key, passAt(at))
	}
	ok := p.kvRun(ctx, len(ops.keys), func(i int) error {
		return p.kvEditRunSeg(ctx, ops.keys[i], ops.edits[ops.keys[i]], ttl)
	})
	var changed []string
	failed := map[string]bool{}
	for i, key := range ops.keys[:pointed] {
		if ok[i] {
			changed = append(changed, key)
		} else {
			failed[key] = true
		}
	}
	cache := p.cache.Load()
	for i, w := range hits {
		// set[i] without stored[i]: a review changed the key (or the hit
		// expired), nothing is to be written.
		if set[i] && !slices.ContainsFunc(w.segs, func(key string) bool { return failed[key] }) {
			cache.landed(w.key, w.at)
		}
	}
	if len(changed) > 0 {
		pctx, cancel := context.WithTimeout(context.Background(), kvSyncBudget)
		defer cancel()
		p.publishVerdictChanged(pctx, verdictChanged{Keys: changed, Stored: true})
	}
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
	ttl := p.cfg.Load().cacheTTL
	if ttl <= 0 || len(ids) == 0 || p.host == nil || !slices.Contains(reviewStatuses, status) {
		return 0
	}
	hits := p.reviewedHits(ctx, ids, status)
	if len(hits) == 0 {
		return 0
	}
	keys := reviewedKeys(hits)
	budget := min(kvSyncBudget*time.Duration(1+len(keys)/kvLookupMax), kvSyncBudgetMax)
	cache := p.cache.Load()
	cache.kill(keys, p.now().Add(budget+tombstoneTTL), p.now())
	wctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), budget)
	defer cancel()
	p.writeReviewed(wctx, hits, status, ttl)
	synced := 0
	for _, h := range hits {
		if !h.failed {
			synced += h.records
		}
	}
	cache.kill(keys, p.now().Add(tombstoneTTL), p.now())
	pctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), kvSyncBudget)
	defer cancel()
	p.publishVerdictChanged(pctx, verdictChanged{Keys: keys})
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

// writeReviewed writes the reviewed hits to the KV and marks the ones a
// write failed for (failed). The hit entries come first: no pointer is
// written to an entry that is not there, and no pass beside a hit that could
// not be deleted.
func (p *Plugin) writeReviewed(ctx context.Context, hits []*reviewedHit, status string, ttl time.Duration) {
	for i, ok := range p.kvRun(ctx, len(hits), func(i int) error {
		if status == ReviewConfirmed {
			return p.kvSetHit(ctx, hits[i].key, hits[i].body, ttl)
		}
		return p.kvDeleteHit(ctx, hits[i].key)
	}) {
		hits[i].failed = !ok
	}
	ops := reviewOps(hits, status)
	users := map[string][]*reviewedHit{} // segment key -> the hits it belongs to
	for _, h := range hits {
		for _, seg := range h.segs {
			users[seg] = append(users[seg], h)
		}
	}
	for i, ok := range p.kvRun(ctx, len(ops.keys), func(i int) error {
		return p.kvEditSeg(ctx, ops.keys[i], ops.edits[ops.keys[i]], ttl)
	}) {
		if !ok {
			for _, h := range users[ops.keys[i]] {
				h.failed = true
			}
		}
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
// messages below the broadcast payload limit.
func (p *Plugin) publishVerdictChanged(ctx context.Context, msg verdictChanged) {
	send := func(keys []string) {
		payload, _ := json.Marshal(verdictChanged{Keys: keys, Stored: msg.Stored})
		if err := p.host.Publish(ctx, TopicVerdictChanged, payload); err != nil {
			p.log.Warn("moderation: broadcast failed; other nodes keep the verdicts in their memory until they read the KV again or the entries expire",
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
// value before the review nor a run in progress stores it again. Keys that
// got a pointer to a stored hit are only dropped - a tombstone would keep
// this node's own runs from writing to a segment many hits share.
//
// Dropping does not hold against what is under way at that moment: a lookup
// that read a key from the KV before the pointer was written puts the old
// value into memory after the drop (syncSeg), and a run that ends right
// after it makes a value of its pass alone (update) - both marked as read
// now. Such a value is then one the broadcast never reached: it decides
// until its next read, verdictRecheck later (the bound at the top of the
// file). Closing the window would take a mark per dropped key that outlives
// the reads under way, as the tombstones of a review do, with the cost named
// above; it is left open.
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

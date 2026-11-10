package moderation

import (
	"bytes"
	"cmp"
	"container/list"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"slices"
	"strconv"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Verdict cache (CONTRACTS §72.4, §72.5 step 8; 0.8.0, new-api
// verdict_cache.go): what a flow decided about content is remembered for
// verdict_cache_days, in an in-memory LRU of cache_entries plus the host KV
// shared by all nodes.
//
//   - A segment (text piece or inline image) that passed in every chunk
//     holding it is stored as a pass and not sent again.
//   - A chunk that hit is stored as a hit of the set of segments it held,
//     with the trace of its run. A later request holding the whole set is
//     decided by that hit without calling upstream (replay); a request with
//     only part of the set is moderated again.
//
// Keys carry a scope: the clear counter (config_state.cache_epoch), the flow
// and the fingerprint of everything that decides the flow's verdicts
// (snapshot.go fingerprint), so clearing the cache or changing the flow's
// auditors makes the old entries unreachable; they expire on their own.
// Runs that errored, passes with a skipped stage and chunks with URL images
// are never stored. KV errors are never fatal: the content is moderated
// again.

// kvNamespace holds the verdict cache (and the alert state of notify.go).
// The namespace of the pass cache before 0.8.0, "pass", is no longer used.
const kvNamespace = "verdict"

// KV lookups per request: the misses of the memory cache, at most
// kvLookupMax of them, kvLookupWorkers at a time, all within kvLookupBudget;
// writes the same way in the background.
const (
	kvLookupMax     = 64
	kvLookupWorkers = 8
	kvLookupBudget  = 200 * time.Millisecond
	kvWriteBudget   = 2 * time.Second
	kvSyncBudget    = time.Second
	// maxHitBytes: a cached hit larger than this is not stored (the KV takes
	// values up to 64 KiB).
	maxHitBytes = 60 << 10
	// verdictBroadcastBytes caps the keys of one verdict.changed broadcast.
	verdictBroadcastBytes = 48 << 10
)

// passValue is the value of a segment key that passed; a segment of a cached
// hit holds hitPrefix + the hit id.
var passValue = []byte("p")

const hitPrefix = 'h'

type cacheEntry struct {
	key     string
	val     []byte
	expires time.Time
}

type lru struct {
	mu    sync.Mutex
	max   int
	ll    *list.List
	items map[string]*list.Element
}

func newLRU(max int) *lru {
	return &lru{max: max, ll: list.New(), items: make(map[string]*list.Element, 256)}
}

func (c *lru) get(key string, now time.Time) ([]byte, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	el, ok := c.items[key]
	if !ok {
		return nil, false
	}
	e := el.Value.(*cacheEntry)
	if !now.Before(e.expires) {
		c.ll.Remove(el)
		delete(c.items, key)
		return nil, false
	}
	c.ll.MoveToFront(el)
	return e.val, true
}

// put stores val, which is not modified afterwards.
func (c *lru) put(key string, val []byte, expires time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[key]; ok {
		e := el.Value.(*cacheEntry)
		e.val, e.expires = val, expires
		c.ll.MoveToFront(el)
		return
	}
	c.items[key] = c.ll.PushFront(&cacheEntry{key: key, val: val, expires: expires})
	for c.ll.Len() > c.max {
		last := c.ll.Back()
		c.ll.Remove(last)
		delete(c.items, last.Value.(*cacheEntry).key)
	}
}

func (c *lru) del(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[key]; ok {
		c.ll.Remove(el)
		delete(c.items, key)
	}
}

func (c *lru) len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.ll.Len()
}

// ---------------------------------------------------------------- keys

// scopeOf is the key scope of a flow's verdicts: "e3:7:9f2c…".
func (s *snapshot) scopeOf(f *liveFlow) string {
	return "e" + strconv.FormatInt(s.cacheEpoch, 10) + ":" + strconv.FormatInt(f.ID, 10) + ":" + f.fp
}

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

// storedHit is a cached hit of one chunk: the segments it held, the run that
// decided it and the request it came from.
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

// ---------------------------------------------------------------- lookup

// verdicts is what the cache knows about a request's segments.
type verdicts struct {
	passed map[[32]byte]bool
	hit    *storedHit // a cached hit whose segments are all in the request
	hitID  string
}

// lookupVerdicts reads the cached verdicts of the segments of a request (in
// request order): memory first, then (useKV) the KV for the misses within
// the lookup budget. The first cached hit whose whole segment set is in the
// request is returned for replay; otherwise the segments that passed.
// Anything the cache cannot answer is unknown and moderated again.
func (p *Plugin) lookupVerdicts(s *snapshot, f *liveFlow, keys [][32]byte, useKV bool) verdicts {
	c := p.cfg.Load()
	v := verdicts{passed: map[[32]byte]bool{}}
	if c.cacheTTL <= 0 || len(keys) == 0 {
		return v
	}
	now := p.now()
	cache := p.cache.Load()
	scope := s.scopeOf(f)
	useKV = useKV && p.host != nil
	kctx, cancel := context.WithTimeout(p.bg, kvLookupBudget)
	defer cancel()

	vals := make([][]byte, len(keys))
	var misses []int
	for i, h := range keys {
		if val, ok := cache.get(segKeyOf(scope, h), now); ok {
			vals[i] = val
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
		for j, val := range p.kvGet(kctx, names) {
			if val != nil {
				vals[misses[j]] = val
				cache.put(names[j], val, now.Add(c.cacheTTL))
			}
		}
	}

	// The hits the segments point to, in request order.
	var ids, missing []string
	hits := map[string]*storedHit{}
	for _, val := range vals {
		if len(val) < 2 || val[0] != hitPrefix {
			continue
		}
		id := string(val[1:])
		if _, seen := hits[id]; seen {
			continue
		}
		hits[id] = nil
		ids = append(ids, id)
		if raw, ok := cache.get(hitKeyOf(scope, id), now); ok {
			hits[id] = decodeHit(raw, now, c.cacheTTL)
		} else {
			missing = append(missing, id)
		}
	}
	if useKV && len(missing) > 0 {
		missing = missing[:min(len(missing), kvLookupMax)]
		names := make([]string, len(missing))
		for j, id := range missing {
			names[j] = hitKeyOf(scope, id)
		}
		for j, raw := range p.kvGet(kctx, names) {
			if hit := decodeHit(raw, now, c.cacheTTL); hit != nil {
				hits[missing[j]] = hit
				cache.put(names[j], raw, hit.expires(c.cacheTTL))
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
	for i, val := range vals {
		if bytes.Equal(val, passValue) {
			v.passed[keys[i]] = true
		}
	}
	return v
}

// kvGet reads keys from the KV, kvLookupWorkers at a time until ctx ends;
// out[i] is nil for a key that is absent or was not read. A failure or a
// timeout counts one kv error: the keys involved stay unknown.
func (p *Plugin) kvGet(ctx context.Context, keys []string) [][]byte {
	out := make([][]byte, len(keys))
	var failed bool
	var mu sync.Mutex
	work := make(chan int)
	var wg sync.WaitGroup
	for range min(kvLookupWorkers, len(keys)) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range work {
				val, found, err := p.host.KV().Get(ctx, kvNamespace, keys[i])
				mu.Lock()
				if err != nil {
					failed = true
				} else if found {
					out[i] = val
				}
				mu.Unlock()
			}
		}()
	}
	for i := range keys {
		if ctx.Err() != nil {
			mu.Lock()
			failed = true
			mu.Unlock()
			break
		}
		work <- i
	}
	close(work)
	wg.Wait()
	if failed {
		p.stats.kvErrors.Add(1)
	}
	return out
}

// ---------------------------------------------------------------- store

// kvWrite is one KV write of the cache: val nil deletes the key.
type kvWrite struct {
	key string
	val []byte
}

// hitWrites are the writes of a cached hit: the entry and a pointer to it on
// every segment (the newest max of them; max <= 0 = all). nil when the entry
// is too large to store.
func hitWrites(scope, id string, hit *storedHit, max int) []kvWrite {
	body, err := json.Marshal(hit)
	if err != nil || len(body) > maxHitBytes {
		return nil
	}
	segs := hit.Keys
	if max > 0 && len(segs) > max {
		segs = segs[len(segs)-max:]
	}
	out := make([]kvWrite, 0, len(segs)+1)
	out = append(out, kvWrite{hitKeyOf(scope, id), body})
	pointer := append([]byte{hitPrefix}, id...)
	for _, seg := range segs {
		out = append(out, kvWrite{segKeyHex(scope, seg), pointer})
	}
	return out
}

// applyMemory applies the writes to this node's memory cache.
func (p *Plugin) applyMemory(writes []kvWrite, expires time.Time) {
	cache := p.cache.Load()
	for _, w := range writes {
		if w.val == nil {
			cache.del(w.key)
		} else {
			cache.put(w.key, w.val, expires)
		}
	}
}

// applyKV applies the writes to the KV, kvLookupWorkers at a time until ctx
// ends; failures only count.
func (p *Plugin) applyKV(ctx context.Context, writes []kvWrite, ttl time.Duration) {
	work := make(chan kvWrite)
	var wg sync.WaitGroup
	for range min(kvLookupWorkers, len(writes)) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for w := range work {
				var err error
				if w.val == nil {
					err = p.host.KV().Delete(ctx, kvNamespace, w.key)
				} else {
					err = p.host.KV().Set(ctx, kvNamespace, w.key, w.val, ttl)
				}
				if err != nil {
					p.stats.kvErrors.Add(1)
				}
			}
		}()
	}
	for _, w := range writes {
		work <- w
	}
	close(work)
	wg.Wait()
}

// storeVerdicts stores the verdicts of a request: the segments that passed
// and the chunks that hit, in memory at once and in the KV in the
// background (the hook never waits for the KV). The KV gets, per request,
// the newest kvLookupMax passes and, per hit, the pointers of its newest
// kvLookupMax segments; a lost pointer only costs a replay.
func (p *Plugin) storeVerdicts(c *config, s *snapshot, f *liveFlow, passes [][32]byte, hits []storedHit) {
	if c.cacheTTL <= 0 || len(passes)+len(hits) == 0 {
		return
	}
	scope := s.scopeOf(f)
	exp := p.now().Add(c.cacheTTL)
	var shared []kvWrite
	for i := range hits {
		hit := &hits[i]
		id := hitIDOf(hit.Keys)
		if id == "" {
			continue
		}
		p.applyMemory(hitWrites(scope, id, hit, 0), exp)
		shared = append(shared, hitWrites(scope, id, hit, kvLookupMax)...)
	}
	writes := make([]kvWrite, len(passes))
	for i, h := range passes {
		writes[i] = kvWrite{segKeyOf(scope, h), passValue}
	}
	p.applyMemory(writes, exp)
	if len(writes) > kvLookupMax {
		writes = writes[len(writes)-kvLookupMax:]
	}
	shared = append(shared, writes...)
	if p.host == nil || len(shared) == 0 {
		return
	}
	go func() {
		kctx, cancel := context.WithTimeout(context.Background(), kvWriteBudget)
		defer cancel()
		p.applyKV(kctx, shared, c.cacheTTL)
	}()
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

// ---------------------------------------------------------------- clear

// clearVerdictCache is POST /verdict-cache/clear: every cached verdict is
// dropped, so content is moderated again under the current configuration.
// The clear counter is part of every key: the entries in the KV are not
// deleted one by one, they are no longer read and expire. config_version is
// bumped too, so the other nodes pick the new counter up with the broadcast
// or their next poll.
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

// syncReviewed brings the cache in line with the review of suspicious
// records (new-api SyncReviewedBlocks), for the records whose trace names
// the hit set of their verdict chunk (trace.cache):
//
//   - false_positive: the hit is deleted and every segment of the set is
//     stored as a pass (content the admin found fine as a whole is fine in
//     its parts);
//   - confirmed: the hit is stored again from the record's trace, over a
//     pass an earlier false_positive stored - only while the flow still has
//     the fingerprint the record was judged under;
//   - pending: the hit and the keys of its segments are deleted, so the
//     content is moderated again.
//
// The scope is the record's flow in the current snapshot; records of a flow
// that is gone or disabled are skipped. The KV is written synchronously
// within kvSyncBudget, failures only count. The other nodes are told to
// drop the keys from their memory (verdict.changed, best effort). It returns
// the number of records synced.
func (p *Plugin) syncReviewed(ctx context.Context, ids []int64, status string) int {
	c := p.cfg.Load()
	if c.cacheTTL <= 0 || len(ids) == 0 {
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
	now := p.now()
	var (
		writes []kvWrite
		synced int
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
		switch status {
		case "false_positive":
			writes = append(writes, kvWrite{key: hitKeyOf(scope, ci.Key)})
			for _, seg := range ci.Segs {
				writes = append(writes, kvWrite{segKeyHex(scope, seg), passValue})
			}
		case "confirmed":
			if ci.FP != flow.fp {
				return nil // judged under another configuration
			}
			// A replayed record ran in its source request.
			hit := storedHit{RequestID: cmp.Or(ci.SourceRequestID, rid), Keys: ci.Segs, Trace: tr, At: now.Unix()}
			hit.Trace.Chunk, hit.Trace.Chunks, hit.Trace.Input, hit.Trace.Cache, hit.Trace.InputMessageDropped = 0, nil, nil, nil, ""
			hw := hitWrites(scope, ci.Key, &hit, 0)
			if hw == nil {
				return nil
			}
			writes = append(writes, hw...)
		default:
			writes = append(writes, kvWrite{key: hitKeyOf(scope, ci.Key)})
			for _, seg := range ci.Segs {
				writes = append(writes, kvWrite{key: segKeyHex(scope, seg)})
			}
		}
		synced++
		return nil
	})
	if err != nil {
		p.log.Warn("moderation: review cache sync failed", "error", err.Error())
	}
	if len(writes) == 0 {
		return synced
	}
	p.applyMemory(writes, now.Add(c.cacheTTL))
	if p.host == nil {
		return synced
	}
	kctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), kvSyncBudget)
	defer cancel()
	p.applyKV(kctx, writes, c.cacheTTL)
	p.publishVerdictChanged(kctx, writes)
	return synced
}

// verdictChanged is the payload of TopicVerdictChanged.
type verdictChanged struct {
	Keys []string `json:"keys"`
}

// publishVerdictChanged tells the other nodes which keys changed, in
// messages below the broadcast payload limit.
func (p *Plugin) publishVerdictChanged(ctx context.Context, writes []kvWrite) {
	send := func(keys []string) {
		payload, _ := json.Marshal(verdictChanged{Keys: keys})
		if err := p.host.Publish(ctx, TopicVerdictChanged, payload); err != nil {
			p.log.Warn("moderation: broadcast failed; other nodes may keep a reviewed verdict until it expires", "topic", TopicVerdictChanged, "error", err.Error())
		}
	}
	var keys []string
	size := 0
	for _, w := range writes {
		if size+len(w.key) > verdictBroadcastBytes && len(keys) > 0 {
			send(keys)
			keys, size = nil, 0
		}
		keys = append(keys, w.key)
		size += len(w.key) + 3 // quotes and comma
	}
	if len(keys) > 0 {
		send(keys)
	}
}

// onVerdictChanged drops the keys another node changed from this node's
// memory, so the next read takes them from the KV.
func (p *Plugin) onVerdictChanged(_ context.Context, b pluginsdk.Broadcast) error {
	var msg verdictChanged
	if err := json.Unmarshal(b.Payload, &msg); err != nil {
		return nil // nothing to retry
	}
	cache := p.cache.Load()
	for _, k := range msg.Keys {
		cache.del(k)
	}
	return nil
}

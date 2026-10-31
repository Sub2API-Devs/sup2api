package moderation

import (
	"cmp"
	"context"
	"errors"
	"maps"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"
)

// Statistics (CONTRACTS §72.14): every node adds up counters in memory and
// upserts them every flushEvery into three tables:
//   - stats_hourly: request / flow / stage / auditor rows of the hook runs
//   - costs: per channel and source, health (calls, errors, latency) and cost
//   - user_daily: moderated requests per user and day
// The hook path only adds to the maps; pricing (PriceUsage) and writing
// happen in the background.

const flushEvery = 10 * time.Second

// latencyBounds are the inclusive upper bounds (ms) of the first 8 latency
// buckets; the 9th holds everything above 10 s (new-api latency.go).
var latencyBounds = [8]int64{50, 100, 200, 500, 1000, 2000, 5000, 10000}

// Latency is the 9 bucket counters of a row.
type Latency [9]int64

// Observe counts one sample; a sample equal to a bound falls into its bucket.
func (l *Latency) Observe(ms int64) {
	for i, b := range latencyBounds {
		if ms <= b {
			l[i]++
			return
		}
	}
	l[len(l)-1]++
}

func (l *Latency) Add(o Latency) {
	for i := range l {
		l[i] += o[i]
	}
}

func (l Latency) count() int64 {
	var n int64
	for _, c := range l {
		n += c
	}
	return n
}

// Percentile approximates the q-quantile by linear interpolation inside the
// bucket the cumulative count reaches; a quantile in the last bucket is
// 10000 ("> 10 s"), no samples 0.
func (l Latency) Percentile(q float64) float64 {
	total := l.count()
	if total == 0 {
		return 0
	}
	target := q * float64(total)
	var cum int64
	for i, c := range l {
		if c == 0 || float64(cum+c) < target {
			cum += c
			continue
		}
		if i == len(l)-1 {
			break
		}
		lower := int64(0)
		if i > 0 {
			lower = latencyBounds[i-1]
		}
		return float64(lower) + (target-float64(cum))/float64(c)*float64(latencyBounds[i]-lower)
	}
	return float64(latencyBounds[len(latencyBounds)-1])
}

// counters is one stats_hourly row (or a sum of rows).
type counters struct {
	audited, hit, blocked, overturned, errors, cacheSkipped, calls, tokensIn, tokensOut, latSum int64
	lat                                                                                         Latency
	units                                                                                       int64 // cost in 1e-8 USD (auditor rows)
}

func (c *counters) observe(ms int64) {
	c.latSum += ms
	c.lat.Observe(ms)
}

func (c *counters) merge(o *counters) {
	c.audited += o.audited
	c.hit += o.hit
	c.blocked += o.blocked
	c.overturned += o.overturned
	c.errors += o.errors
	c.cacheSkipped += o.cacheSkipped
	c.calls += o.calls
	c.tokensIn += o.tokensIn
	c.tokensOut += o.tokensOut
	c.latSum += o.latSum
	c.lat.Add(o.lat)
	c.units += o.units
}

// statKey is the primary key of stats_hourly. Kinds: request (flow 0),
// flow (stage 0), stage (auditor 0), auditor.
type statKey struct {
	hour    time.Time
	group   int64
	flow    int64
	stage   int
	auditor int64
	timing  string
}

// costKey is the primary key of costs (channel rows).
type costKey struct {
	hour    time.Time
	channel int64
	source  string
}

// channelRow is one costs row being added up: health when calls are made,
// cost when they are priced.
type channelRow struct {
	calls, errors, latSum                                  int64
	lat                                                    Latency
	priced, unpriced, unpricedTokens, free, in, out, units int64
}

func (r *channelRow) addCost(c CallCost, calls int64) {
	r.in += c.TokensIn
	r.out += c.TokensOut
	switch c.Mode {
	case PricePriced:
		r.priced += calls
		r.units += c.units
	case PriceFree:
		r.free += calls
	default:
		r.unpriced += calls
		r.unpricedTokens += c.TokensIn + c.TokensOut
	}
}

func (r *channelRow) merge(o *channelRow) {
	r.calls += o.calls
	r.errors += o.errors
	r.latSum += o.latSum
	r.lat.Add(o.lat)
	r.priced += o.priced
	r.unpriced += o.unpriced
	r.unpricedTokens += o.unpricedTokens
	r.free += o.free
	r.in += o.in
	r.out += o.out
	r.units += o.units
}

type userKey struct {
	day  time.Time
	user int64
}

type userRow struct {
	group                             int64
	audited, suspicious, high, errors int64
	lastHit                           time.Time
}

func (r *userRow) merge(o *userRow) {
	r.group = o.group
	r.audited += o.audited
	r.suspicious += o.suspicious
	r.high += o.high
	r.errors += o.errors
	if o.lastHit.After(r.lastHit) {
		r.lastHit = o.lastHit
	}
}

// priceItem is a call waiting for its price; auditor is the stats row the
// cost is also added to (zero hour = none).
type priceItem struct {
	key     costKey
	auditor statKey
	ch      *liveChannel
	usage   EngineUsage
	calls   int64
}

// statsAcc holds the counters of this node until the next flush.
type statsAcc struct {
	mu       sync.Mutex
	rows     map[statKey]*counters
	channels map[costKey]*channelRow
	users    map[userKey]*userRow
	queue    chan priceItem
	dropped  atomic.Int64
	freshAt  atomic.Int64 // unix ns of the last read-triggered flush
}

func newStatsAcc() *statsAcc {
	return &statsAcc{rows: map[statKey]*counters{}, channels: map[costKey]*channelRow{}, users: map[userKey]*userRow{},
		queue: make(chan priceItem, 8192)}
}

func (s *statsAcc) row(k statKey) *counters {
	c := s.rows[k]
	if c == nil {
		c = &counters{}
		s.rows[k] = c
	}
	return c
}

func (s *statsAcc) channel(k costKey) *channelRow {
	r := s.channels[k]
	if r == nil {
		r = &channelRow{}
		s.channels[k] = r
	}
	return r
}

func (s *statsAcc) user(k userKey) *userRow {
	r := s.users[k]
	if r == nil {
		r = &userRow{}
		s.users[k] = r
	}
	return r
}

// take swaps the maps for empty ones.
func (s *statsAcc) take() (map[statKey]*counters, map[costKey]*channelRow, map[userKey]*userRow) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows, chans, users := s.rows, s.channels, s.users
	s.rows, s.channels, s.users = map[statKey]*counters{}, map[costKey]*channelRow{}, map[userKey]*userRow{}
	return rows, chans, users
}

// restore merges counters that failed to flush back for the next round.
func (s *statsAcc) restore(rows map[statKey]*counters, chans map[costKey]*channelRow, users map[userKey]*userRow) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, c := range rows {
		s.row(k).merge(c)
	}
	for k, r := range chans {
		s.channel(k).merge(r)
	}
	for k, r := range users {
		s.user(k).merge(r)
	}
}

// ---------------------------------------------------------------- recording

func (p *Plugin) hour() time.Time { return p.now().UTC().Truncate(time.Hour) }

func (p *Plugin) day() time.Time { return p.now().UTC().Truncate(24 * time.Hour) }

// healthSource reports whether calls of a source count toward a channel's
// health: hook and analysis calls do, manual ones (test, try, simulate) not.
func healthSource(source string) bool { return source == SourceAudit || source == SourceAnalysis }

// countCall counts one upstream call of a channel (audit and analysis only:
// manual calls do not change a channel's health).
func (p *Plugin) countCall(source string, ch *liveChannel, calls int, err error, ms int64) {
	if ch == nil || calls == 0 {
		return
	}
	p.hourly.mu.Lock()
	defer p.hourly.mu.Unlock()
	r := p.hourly.channel(costKey{hour: p.hour(), channel: ch.ID, source: source})
	r.calls += int64(calls)
	r.latSum += ms
	r.lat.Observe(ms)
	if err != nil {
		r.errors++
	}
}

// priceLater queues a metered call for background pricing.
func (p *Plugin) priceLater(it priceItem) {
	select {
	case p.hourly.queue <- it:
	default:
		p.hourly.dropped.Add(1)
	}
}

// priceNow prices a metered call at once and adds its cost (console paths
// that show the cost of the call). nil = not metered.
func (p *Plugin) priceNow(ctx context.Context, source string, ch *liveChannel, res EngineResult, err error) *CallCost {
	if ch == nil || !metered(res, err) {
		return nil
	}
	qctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	c := p.quote(qctx, ch, res.Usage)
	it := priceItem{key: costKey{hour: p.hour(), channel: ch.ID, source: source}, calls: int64(max(res.Calls, 1))}
	p.addCost(it, c)
	if !healthSource(source) {
		// Manual calls skip countCall (they do not change a channel's
		// health) but still count on their cost row.
		p.hourly.mu.Lock()
		p.hourly.channel(it.key).calls += it.calls
		p.hourly.mu.Unlock()
	}
	return &c
}

func (p *Plugin) addCost(it priceItem, c CallCost) {
	p.hourly.mu.Lock()
	defer p.hourly.mu.Unlock()
	p.hourly.channel(it.key).addCost(c, it.calls)
	if !it.auditor.hour.IsZero() {
		p.hourly.row(it.auditor).units += c.units
	}
}

// countCalls counts the upstream work of one hook run, once however many
// requests share it: each auditor's calls, tokens and latency, and queues
// the pricing of the metered calls (CONTRACTS §72.14).
func (p *Plugin) countCalls(m *moderation, tr Trace) {
	k := statKey{hour: p.hour(), group: m.rec.GroupID, flow: m.flow.ID, timing: m.timing}
	var items []priceItem
	p.hourly.mu.Lock()
	for i, st := range tr.Stages {
		for _, o := range st.Outcomes {
			ak := k
			ak.stage, ak.auditor = i+1, o.AuditorID
			ac := p.hourly.row(ak)
			ac.calls += int64(o.Calls)
			ac.tokensIn += o.Usage.InputTokens
			ac.tokensOut += o.Usage.OutputTokens
			ac.observe(o.LatencyMs)
			if ch := m.snap.channels[o.ChannelID]; ch != nil && metered(o.EngineResult, o.Err) {
				items = append(items, priceItem{key: costKey{hour: k.hour, channel: ch.ID, source: SourceAudit}, auditor: ak, ch: ch,
					usage: o.Usage, calls: int64(max(o.Calls, 1))})
			}
		}
	}
	p.hourly.mu.Unlock()
	for _, it := range items {
		p.priceLater(it)
	}
}

// countRun counts one moderated request: the flow row with its latency,
// each executed stage and the verdict of each auditor that returned, and the
// user's day. refused is what happened to the request (a pre hit that timed
// out was let through).
func (p *Plugin) countRun(m *moderation, tr Trace, refused bool) {
	var rec eventRec
	rec.fillFromTrace(tr, refused)
	k := statKey{hour: p.hour(), group: m.rec.GroupID, flow: m.flow.ID, timing: m.timing}
	p.hourly.mu.Lock()
	defer p.hourly.mu.Unlock()
	fc := p.hourly.row(k)
	fc.audited++
	switch rec.Result {
	case ResultBlock:
		fc.hit++
		fc.blocked++
	case ResultHit:
		fc.hit++
	case ResultOverturned:
		fc.overturned++
	case ResultError:
		fc.errors++
	}
	fc.observe(tr.LatencyMs)
	for i, st := range tr.Stages {
		sk := k
		sk.stage = i + 1
		sc := p.hourly.row(sk)
		sc.audited++
		if st.Result == Hit {
			sc.hit++
		}
		if st.Errored {
			sc.errors++
		}
		for _, o := range st.Outcomes {
			ak := sk
			ak.auditor = o.AuditorID
			ac := p.hourly.row(ak)
			ac.audited++
			switch {
			case o.Skipped:
				ac.cacheSkipped++ // nothing to send: neither a hit nor an error
			case o.ErrType != "" || o.Err != nil:
				ac.errors++
			case o.Hit:
				ac.hit++
			}
		}
	}
	p.countUserLocked(m.rec.UserID, m.rec.GroupID, rec.Result, rec.Severity)
}

func (p *Plugin) countUserLocked(uid, group int64, result, severity string) {
	if uid <= 0 {
		return
	}
	u := p.hourly.user(userKey{day: p.day(), user: uid})
	u.group = group
	u.audited++
	switch result {
	case ResultHit, ResultBlock:
		u.suspicious++
		u.lastHit = p.now().UTC()
		if severity == "high" {
			u.high++
		}
	case ResultError:
		u.errors++
	}
}

// countRequest counts one pre-moderated request and the latency moderation
// added to it (request rows).
func (p *Plugin) countRequest(group int64, ms int64, blocked bool) {
	p.hourly.mu.Lock()
	defer p.hourly.mu.Unlock()
	rc := p.hourly.row(statKey{hour: p.hour(), group: group, timing: TimingPre})
	rc.audited++
	if blocked {
		rc.blocked++
	}
	rc.observe(ms)
}

// countCacheHit counts a run answered by the pass cache: on the flow row,
// as a request without a latency sample (pre) and on the user's day.
func (p *Plugin) countCacheHit(m *moderation, uid, group int64) {
	p.hourly.mu.Lock()
	defer p.hourly.mu.Unlock()
	h := p.hour()
	p.hourly.row(statKey{hour: h, group: group, flow: m.flow.ID, timing: m.timing}).cacheSkipped++
	if m.timing == TimingPre {
		p.hourly.row(statKey{hour: h, group: group, timing: TimingPre}).audited++
	}
	p.countUserLocked(uid, group, ResultPass, "")
}

// ---------------------------------------------------------------- flushing

// statsLoop prices queued calls and flushes every flushEvery.
func (p *Plugin) statsLoop(ctx context.Context) {
	defer p.wg.Done()
	t := time.NewTicker(flushEvery)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case it := <-p.hourly.queue:
			qctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			c := p.quote(qctx, it.ch, it.usage)
			cancel()
			p.addCost(it, c)
		case <-t.C:
			fctx, cancel := context.WithTimeout(ctx, 10*time.Second)
			p.flushStats(fctx)
			cancel()
		}
	}
}

// freshStats flushes this node's counters before a read that shows them, at
// most once a second; other nodes' counts follow within flushEvery.
func (p *Plugin) freshStats(ctx context.Context) {
	now := p.now().UnixNano()
	last := p.hourly.freshAt.Load()
	if now-last < int64(time.Second) || !p.hourly.freshAt.CompareAndSwap(last, now) {
		return
	}
	p.flushStats(ctx)
}

// staffLookups caps the host AuthzCheck calls of one flush; the users not
// looked up wait for the next round.
const staffLookups = 50

// flushStats upserts the counters; on failure they are kept for the next
// round. Users who are moderators (moderation:read) are left out of
// user_daily like new-api leaves out administrators.
func (p *Plugin) flushStats(ctx context.Context) {
	rows, chans, users := p.hourly.take()
	if len(rows)+len(chans)+len(users) == 0 {
		return
	}
	lookups := 0
	var later map[userKey]*userRow
	for k, u := range users {
		staff, cached := p.staffCached(k.user)
		if !cached {
			if lookups == staffLookups {
				if later == nil {
					later = map[userKey]*userRow{}
				}
				later[k] = u
				delete(users, k)
				continue
			}
			lookups++
			staff = p.isStaff(ctx, k.user)
		}
		if staff {
			delete(users, k)
		}
	}
	if later != nil {
		p.hourly.restore(nil, nil, later)
	}
	if err := p.writeStats(ctx, rows, chans, users); err != nil {
		if !errors.Is(err, context.Canceled) {
			p.log.Warn("moderation: stats write failed; retrying with the next flush", "error", err.Error())
		}
		p.hourly.restore(rows, chans, users)
	}
}

// Upserts take row locks in primary key order, so two flushes of the same
// hour (two nodes, or the loop and a read) cannot deadlock.
func compareStatKeys(a, b statKey) int {
	return cmp.Or(a.hour.Compare(b.hour), cmp.Compare(a.group, b.group), cmp.Compare(a.flow, b.flow), cmp.Compare(a.stage, b.stage),
		cmp.Compare(a.auditor, b.auditor), cmp.Compare(a.timing, b.timing))
}

func compareCostKeys(a, b costKey) int {
	return cmp.Or(a.hour.Compare(b.hour), cmp.Compare(a.channel, b.channel), cmp.Compare(a.source, b.source))
}

func compareUserKeys(a, b userKey) int {
	return cmp.Or(a.day.Compare(b.day), cmp.Compare(a.user, b.user))
}

// latAdd sums two latency arrays elementwise in an upsert.
func latAdd(table string) string {
	return `ARRAY(SELECT x + y FROM unnest(` + table + `.lat, EXCLUDED.lat) WITH ORDINALITY AS t(x, y, i) ORDER BY i)`
}

func (p *Plugin) writeStats(ctx context.Context, rows map[statKey]*counters, chans map[costKey]*channelRow, users map[userKey]*userRow) error {
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	b := &pgx.Batch{}
	for _, k := range slices.SortedFunc(maps.Keys(rows), compareStatKeys) {
		c := rows[k]
		b.Queue(`INSERT INTO stats_hourly (hour, group_id, flow_id, stage, auditor_id, timing, audited, hit, blocked, overturned, errors,
				cache_skipped, calls, tokens_in, tokens_out, latency_ms_sum, lat, cost)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::numeric)
			ON CONFLICT (hour, group_id, flow_id, stage, auditor_id, timing) DO UPDATE SET
				audited = stats_hourly.audited + EXCLUDED.audited, hit = stats_hourly.hit + EXCLUDED.hit,
				blocked = stats_hourly.blocked + EXCLUDED.blocked, overturned = stats_hourly.overturned + EXCLUDED.overturned,
				errors = stats_hourly.errors + EXCLUDED.errors, cache_skipped = stats_hourly.cache_skipped + EXCLUDED.cache_skipped,
				calls = stats_hourly.calls + EXCLUDED.calls, tokens_in = stats_hourly.tokens_in + EXCLUDED.tokens_in,
				tokens_out = stats_hourly.tokens_out + EXCLUDED.tokens_out, latency_ms_sum = stats_hourly.latency_ms_sum + EXCLUDED.latency_ms_sum,
				lat = `+latAdd("stats_hourly")+`, cost = stats_hourly.cost + EXCLUDED.cost`,
			k.hour, k.group, k.flow, k.stage, k.auditor, k.timing, c.audited, c.hit, c.blocked, c.overturned, c.errors,
			c.cacheSkipped, c.calls, c.tokensIn, c.tokensOut, c.latSum, c.lat[:], formatCost(c.units))
	}
	for _, k := range slices.SortedFunc(maps.Keys(chans), compareCostKeys) {
		r := chans[k]
		b.Queue(`INSERT INTO costs (hour, channel_id, source, calls, errors, latency_ms_sum, lat, priced_calls, unpriced_calls, unpriced_tokens,
				free_calls, tokens_in, tokens_out, cost)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::numeric)
			ON CONFLICT (hour, channel_id, source) DO UPDATE SET
				calls = costs.calls + EXCLUDED.calls, errors = costs.errors + EXCLUDED.errors,
				latency_ms_sum = costs.latency_ms_sum + EXCLUDED.latency_ms_sum, lat = `+latAdd("costs")+`,
				priced_calls = costs.priced_calls + EXCLUDED.priced_calls, unpriced_calls = costs.unpriced_calls + EXCLUDED.unpriced_calls,
				unpriced_tokens = costs.unpriced_tokens + EXCLUDED.unpriced_tokens, free_calls = costs.free_calls + EXCLUDED.free_calls,
				tokens_in = costs.tokens_in + EXCLUDED.tokens_in, tokens_out = costs.tokens_out + EXCLUDED.tokens_out, cost = costs.cost + EXCLUDED.cost`,
			k.hour, k.channel, k.source, r.calls, r.errors, r.latSum, r.lat[:], r.priced, r.unpriced, r.unpricedTokens, r.free, r.in, r.out, formatCost(r.units))
	}
	for _, k := range slices.SortedFunc(maps.Keys(users), compareUserKeys) {
		u := users[k]
		var last *time.Time
		if !u.lastHit.IsZero() {
			last = &u.lastHit
		}
		b.Queue(`INSERT INTO user_daily (day, user_id, group_id, audited, suspicious, high, errors, last_hit_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			ON CONFLICT (day, user_id) DO UPDATE SET group_id = EXCLUDED.group_id, audited = user_daily.audited + EXCLUDED.audited,
				suspicious = user_daily.suspicious + EXCLUDED.suspicious, high = user_daily.high + EXCLUDED.high,
				errors = user_daily.errors + EXCLUDED.errors, last_hit_at = GREATEST(user_daily.last_hit_at, EXCLUDED.last_hit_at)`,
			k.day, k.user, u.group, u.audited, u.suspicious, u.high, u.errors, last)
	}
	return pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		return tx.SendBatch(ctx, b).Close()
	})
}

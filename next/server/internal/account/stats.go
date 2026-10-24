package account

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

const (
	statsSettingsKey = "account-stats"
	statsMaxWindow   = observation.MaxWindow
	statsMaxAccounts = 200
)

var applyStats = redis.NewScript(`
local clock = redis.call('TIME')
local now = tonumber(clock[1])
local previous = redis.call('HMGET', KEYS[1], 'at', 'revision', 'metrics')
local at = tonumber(previous[1]) or tonumber(ARGV[1])
if previous[2] and tonumber(previous[2]) >= tonumber(ARGV[2]) then return {0, at} end
if at ~= tonumber(ARGV[1]) then return {-1, at} end
if at <= now - tonumber(ARGV[4]) or at > now then return {0, at} end
local old = previous[3] and cjson.decode(previous[3]) or {}
local new = cjson.decode(ARGV[3])
local names = {}
for name in pairs(old) do names[name] = true end
for name in pairs(new) do names[name] = true end
local operations = {}
for name in pairs(names) do
  local delta = (new[name] or 0) - (old[name] or 0)
  local count = (new[name] ~= nil and 1 or 0) - (old[name] ~= nil and 1 or 0)
  for _, prefix in ipairs({tostring(at % 60)..':', '_:'}) do
    table.insert(operations, {prefix..name..':sum', delta})
    table.insert(operations, {prefix..name..':count', count})
  end
end
for _, op in ipairs(operations) do
  local current = tonumber(redis.call('HGET', KEYS[2], op[1]) or '0')
  if not current or current + op[2] < 0 or current + op[2] > 9007199254740991 then return {-2, at} end
end
for _, op in ipairs(operations) do redis.call('HINCRBY', KEYS[2], op[1], string.format('%.0f', op[2])) end
redis.call('HMSET', KEYS[1], 'at', at, 'revision', ARGV[2], 'metrics', ARGV[3])
local expires = at - at % 60 + tonumber(ARGV[4]) + 120
redis.call('EXPIREAT', KEYS[1], expires)
redis.call('EXPIREAT', KEYS[2], expires)
return {1, at}
`)

type StatsSettings struct {
	WindowSeconds int `json:"window_seconds"`
}

type Stats struct {
	rdb        redis.UniversalClient
	db         *store.DB
	slots      core.Slots
	bus        core.Bus
	now        func() time.Time
	window     atomic.Int64
	gap        atomic.Bool
	gapMu      sync.Mutex
	gaps       map[string]bool
	queue      chan core.ObservationMetricSample
	invalidate chan struct{}
	stop       chan struct{}
	done       chan struct{}
	startOnce  sync.Once
	mu         sync.RWMutex
	closed     bool
}

var _ core.ObservationMetricStore = (*Stats)(nil)
var _ core.AccountStatsReader = (*Stats)(nil)

func NewStats(rdb redis.UniversalClient, db *store.DB, slots core.Slots, bus core.Bus) *Stats {
	s := &Stats{rdb: rdb, db: db, slots: slots, bus: bus, now: time.Now, gaps: map[string]bool{},
		queue: make(chan core.ObservationMetricSample, 4096), invalidate: make(chan struct{}, 1), stop: make(chan struct{}), done: make(chan struct{})}
	s.window.Store(60)
	return s
}

func validStatsSample(v core.ObservationMetricSample) bool {
	if v.Namespace != observation.CoreNamespace && (!strings.HasPrefix(v.Namespace, "plugin.") || len(v.Namespace) > 64) {
		return false
	}
	if v.AccountID <= 0 || v.ID == "" || len(v.ID) > 256 || v.Revision > uint64(observation.MaxValue) || len(v.Metrics) > observation.MaxMetrics {
		return false
	}
	for name, value := range v.Metrics {
		if !observation.ValidMetric(name) || value < 0 || value > observation.MaxValue {
			return false
		}
	}
	return true
}

func (s *Stats) RecordObservationMetrics(v core.ObservationMetricSample) bool {
	if s.rdb == nil || !validStatsSample(v) {
		return false
	}
	if v.Revision == 0 {
		v.Revision = 1
	}
	if v.At.IsZero() {
		v.At = s.now()
	}
	metrics := make(map[string]int64, len(v.Metrics))
	for name, value := range v.Metrics {
		metrics[name] = value
	}
	v.Metrics = metrics
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.closed {
		return false
	}
	select {
	case s.queue <- v:
		return true
	default:
		s.MarkObservationGap(v.Namespace)
		return false
	}
}

func (s *Stats) MarkObservationGap(namespace string) {
	s.gapMu.Lock()
	s.gaps[namespace] = true
	s.gap.Store(true)
	s.gapMu.Unlock()
}

func (s *Stats) Start() { s.startOnce.Do(func() { go s.run() }) }

func (s *Stats) Close(ctx context.Context) {
	s.Start()
	s.mu.Lock()
	if !s.closed {
		s.closed = true
		close(s.stop)
	}
	s.mu.Unlock()
	select {
	case <-s.done:
	case <-ctx.Done():
	}
}

func (s *Stats) run() {
	defer close(s.done)
	if s.bus != nil {
		cancel := s.bus.Subscribe(core.ChannelConfigChanged, func(raw []byte) {
			var event struct {
				Key string `json:"key"`
			}
			if json.Unmarshal(raw, &event) == nil && event.Key == "settings."+statsSettingsKey {
				select {
				case s.invalidate <- struct{}{}:
				default:
				}
			}
		})
		defer cancel()
	}
	reload := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if _, err := s.Settings(ctx); err != nil {
			slog.Warn("account stats: settings unavailable", "err", err)
		}
	}
	reload()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	if err := s.flush(ctx, nil); err != nil {
		s.MarkObservationGap(observation.CoreNamespace)
	}
	cancel()
	tick := time.NewTicker(time.Second)
	defer tick.Stop()
	settingsTick := time.NewTicker(10 * time.Second)
	defer settingsTick.Stop()
	pending := make([]core.ObservationMetricSample, 0, 128)
	flush := func(ctx context.Context) {
		if len(pending) == 0 && !s.gap.Load() {
			return
		}
		if err := s.flush(ctx, pending); err != nil {
			for _, v := range pending {
				s.MarkObservationGap(v.Namespace)
			}
			slog.Warn("observation statistics: flush failed", "err", err)
			return
		}
		pending = pending[:0]
	}
	for {
		input := s.queue
		if len(pending) >= 128 {
			input = nil
		}
		select {
		case v := <-input:
			pending = append(pending, v)
			if len(pending) >= 128 {
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				flush(ctx)
				cancel()
			}
		case <-tick.C:
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			flush(ctx)
			cancel()
		case <-settingsTick.C:
			reload()
		case <-s.invalidate:
			reload()
		case <-s.stop:
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			for {
				select {
				case v := <-s.queue:
					pending = append(pending, v)
				default:
					flush(ctx)
					return
				}
			}
		}
	}
}

func statsPrefix(namespace string, id int64) string {
	hash := sha256.Sum256([]byte(namespace))
	return "stats:observation:{" + hex.EncodeToString(hash[:16]) + ":" + strconv.FormatInt(id, 10) + "}:"
}

func statsMeta(namespace, field string) string { return "stats:observation:" + field + ":" + namespace }

func (s *Stats) flush(ctx context.Context, samples []core.ObservationMetricSample) error {
	if s.rdb == nil {
		return nil
	}
	clock, err := s.rdb.Time(ctx).Result()
	local := s.now()
	if err != nil {
		return err
	}
	namespaces := map[string]bool{observation.CoreNamespace: true}
	for _, v := range samples {
		namespaces[v.Namespace] = true
	}
	s.gapMu.Lock()
	gaps := s.gaps
	s.gaps = map[string]bool{}
	s.gap.Store(false)
	s.gapMu.Unlock()
	_, err = s.rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
		for ns := range namespaces {
			p.SetNX(ctx, statsMeta(ns, "since"), clock.Unix(), 0)
		}
		for ns := range gaps {
			p.Set(ctx, statsMeta(ns, "gap"), "1", statsMaxWindow*time.Second)
		}
		return nil
	})
	if err != nil {
		for ns := range gaps {
			s.MarkObservationGap(ns)
		}
		return err
	}
	type pendingWrite struct {
		sample core.ObservationMetricSample
		at     int64
	}
	pending := make([]pendingWrite, 0, len(samples))
	for _, v := range samples {
		if !validStatsSample(v) {
			s.MarkObservationGap(v.Namespace)
			continue
		}
		if v.Revision == 0 {
			v.Revision = 1
		}
		if v.Metrics == nil {
			v.Metrics = map[string]int64{}
		}
		at := clock.Add(-local.Sub(v.At)).Unix()
		if v.At.IsZero() {
			at = clock.Unix()
		}
		pending = append(pending, pendingWrite{v, min(at, clock.Unix())})
	}
	for pass := 0; len(pending) > 0 && pass < 2; pass++ {
		cmds := make([]*redis.Cmd, len(pending))
		_, err = s.rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
			for i, item := range pending {
				v := item.sample
				prefix := statsPrefix(v.Namespace, v.AccountID)
				digest := sha256.Sum256([]byte(v.ID))
				raw, _ := json.Marshal(v.Metrics)
				cmds[i] = applyStats.Eval(ctx, p, []string{prefix + "event:" + hex.EncodeToString(digest[:]), prefix + "minute:" + strconv.FormatInt(item.at/60, 10)}, item.at, v.Revision, string(raw), statsMaxWindow)
			}
			return nil
		})
		if err != nil {
			return err
		}
		retry := make([]pendingWrite, 0)
		for i, cmd := range cmds {
			result, err := cmd.Int64Slice()
			if err != nil {
				return err
			}
			if len(result) != 2 {
				return errors.New("invalid observation statistics result")
			}
			if result[0] == -1 {
				retry = append(retry, pendingWrite{pending[i].sample, result[1]})
			}
			if result[0] == -2 {
				s.MarkObservationGap(pending[i].sample.Namespace)
			}
		}
		pending = retry
	}
	if len(pending) > 0 {
		return errors.New("observation timestamp changed")
	}
	return nil
}

func (s *Stats) Settings(ctx context.Context) (StatsSettings, error) {
	v := StatsSettings{WindowSeconds: 60}
	if s.db != nil {
		var raw []byte
		err := s.db.Pool.QueryRow(ctx, `SELECT value FROM settings WHERE key=$1`, statsSettingsKey).Scan(&raw)
		if err != nil && !store.IsNoRows(err) {
			return v, err
		}
		if err == nil {
			if err = json.Unmarshal(raw, &v); err != nil {
				return v, err
			}
		}
	}
	if v.WindowSeconds < 5 || v.WindowSeconds > statsMaxWindow {
		v.WindowSeconds = 60
	}
	s.window.Store(int64(v.WindowSeconds))
	return v, nil
}

func (s *Stats) ReadObservationMetrics(ctx context.Context, namespace string, ids []int64, names []string, seconds int) (*pluginv1.ReadObservationMetricsResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if seconds == 0 {
		seconds = int(s.window.Load())
	}
	out := &pluginv1.ReadObservationMetricsResponse{WindowSeconds: int32(seconds), AsOfUnixMs: s.now().UnixMilli(), Status: "unavailable", Accounts: make([]*pluginv1.AccountObservationMetrics, 0, len(ids))}
	if err := validateMetricsQuery(ids, names, seconds); err != nil {
		return out, err
	}
	for _, id := range ids {
		out.Accounts = append(out.Accounts, &pluginv1.AccountObservationMetrics{AccountId: id})
	}
	if s.slots != nil {
		if usage, err := s.slots.InUseMany(ctx, "account", ids); err == nil {
			for i, id := range ids {
				n := int64(usage[id])
				out.Accounts[i].InUse = &n
			}
		}
	}
	if s.rdb == nil {
		return out, nil
	}
	clock, err := s.rdb.Time(ctx).Result()
	if err != nil {
		return out, nil
	}
	out.AsOfUnixMs = clock.UnixMilli()
	end := clock.Unix()
	start := end - int64(seconds) + 1
	counts, gap, since, ok := s.readInternalCounters(ctx, namespace, ids, names, start, end)
	if !ok {
		return out, nil
	}
	out.Status = "warming"
	if stamp, err := since.Int64(); err == nil {
		out.ObservedSinceUnixMs = stamp * 1000
		if stamp <= start {
			out.Status = "ok"
		}
	}
	s.gapMu.Lock()
	localGap := s.gaps[namespace]
	s.gapMu.Unlock()
	if gap.Val() != 0 || localGap {
		out.Status = "incomplete"
	}
	for i := range out.Accounts {
		for j, name := range names {
			sum, count := counts[i][2*j], counts[i][2*j+1]
			out.Accounts[i].Metrics = append(out.Accounts[i].Metrics, &pluginv1.ObservationMetric{Name: name, Sum: sum, Count: count, PerMinute: float64(sum) * 60 / float64(seconds)})
		}
	}
	return out, nil
}

// validateMetricsQuery enforces the combination limits of an observation
// metrics read: window bounds, account and metric counts and their product.
func validateMetricsQuery(ids []int64, names []string, seconds int) error {
	if seconds < 5 || seconds > statsMaxWindow || len(ids) > statsMaxAccounts || len(names) == 0 || len(names) > observation.MaxMetrics || len(ids)*len(names) > 600 {
		return core.ErrInvalidArgument
	}
	seen := map[string]bool{}
	for _, name := range names {
		if !observation.ValidMetric(name) || seen[name] {
			return core.ErrInvalidArgument
		}
		seen[name] = true
	}
	for _, id := range ids {
		if id <= 0 {
			return core.ErrInvalidArgument
		}
	}
	return nil
}

// readInternalCounters reads the per-minute counters of every account in one
// Redis pipeline and sums them per metric. ok=false means "no usable
// counters"; the caller then reports the response as unavailable.
func (s *Stats) readInternalCounters(ctx context.Context, namespace string, ids []int64, names []string, start, end int64) (counts [][]int64, gap *redis.IntCmd, since *redis.StringCmd, ok bool) {
	cmds := make([][]*redis.SliceCmd, len(ids))
	_, err := s.rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
		gap = p.Exists(ctx, statsMeta(namespace, "gap"))
		since = p.Get(ctx, statsMeta(namespace, "since"))
		for i, id := range ids {
			for minute := start / 60; minute <= end/60; minute++ {
				lo, hi := max(start, minute*60), min(end, minute*60+59)
				prefixes := []string{"_:"}
				if hi-lo != 59 {
					prefixes = nil
					for sec := lo; sec <= hi; sec++ {
						prefixes = append(prefixes, strconv.FormatInt(sec%60, 10)+":")
					}
				}
				fields := make([]string, 0, len(prefixes)*len(names)*2)
				for _, prefix := range prefixes {
					for _, name := range names {
						fields = append(fields, prefix+name+":sum", prefix+name+":count")
					}
				}
				cmds[i] = append(cmds[i], p.HMGet(ctx, statsPrefix(namespace, id)+"minute:"+strconv.FormatInt(minute, 10), fields...))
			}
		}
		return nil
	})
	if err != nil && !errors.Is(err, redis.Nil) {
		return nil, gap, since, false
	}
	counts = make([][]int64, len(ids))
	for i, queries := range cmds {
		counts[i] = make([]int64, len(names)*2)
		for _, cmd := range queries {
			values, err := cmd.Result()
			if err != nil {
				return nil, gap, since, false
			}
			for j, value := range values {
				if value == nil {
					continue
				}
				n, err := strconv.ParseInt(fmt.Sprint(value), 10, 64)
				index := j % len(counts[i])
				if err != nil || n < 0 || counts[i][index] > math.MaxInt64-n {
					return nil, gap, since, false
				}
				counts[i][index] += n
			}
		}
	}
	return counts, gap, since, true
}

func (s *Stats) AccountStats(ctx context.Context, ids []int64, seconds int) (core.AccountStatsSnapshot, error) {
	raw, err := s.ReadObservationMetrics(ctx, observation.CoreNamespace, ids, []string{observation.SuccessRequests, observation.SuccessTokens, observation.PendingUsage}, seconds)
	out := core.AccountStatsSnapshot{WindowSeconds: int(raw.WindowSeconds), AsOf: time.UnixMilli(raw.AsOfUnixMs).UTC(), Status: raw.Status, Accounts: make([]core.AccountStatsView, 0, len(raw.Accounts))}
	if raw.ObservedSinceUnixMs > 0 {
		at := time.UnixMilli(raw.ObservedSinceUnixMs).UTC()
		out.ObservedSince = &at
	}
	for _, row := range raw.Accounts {
		v := core.AccountStatsView{AccountID: row.AccountId}
		if row.InUse != nil {
			n := int(*row.InUse)
			v.InUse = &n
		}
		if len(row.Metrics) == 3 {
			r, t, p := row.Metrics[0].Sum, row.Metrics[1].Sum, row.Metrics[2].Sum
			rpm, tpm := row.Metrics[0].PerMinute, row.Metrics[1].PerMinute
			v.SuccessRequests, v.SuccessTokens, v.PendingUsage, v.RPM, v.TPM = &r, &t, &p, &rpm, &tpm
		}
		out.Accounts = append(out.Accounts, v)
	}
	return out, err
}

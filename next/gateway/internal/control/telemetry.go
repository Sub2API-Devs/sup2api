package control

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

const telemetryTTL = 20 * time.Second

var errTelemetryRejected = errors.New("shell telemetry expired or superseded; retry with fresh observations")

// Keys include the accepted shell boot. A delayed report from a replaced shell
// can never overwrite the current boot's observations, even after Redis loss.
func (s *Store) telemetryKey(n Node) string {
	sum := sha256.Sum256([]byte(s.Cluster + "\x00" + n.ID + "\x00" + n.ShellBootID))
	return "updater:telemetry:" + hex.EncodeToString(sum[:])
}

type telemetryReport struct {
	Node       Node      `json:"node"`
	Sequence   uint64    `json:"sequence"`
	ObservedAt time.Time `json:"observed_at"`
}

// The monotonic sequence prevents delayed writes within a live boot from
// replacing newer observations. The deadline is obtained from Redis before the
// write, so delayed retries cannot renew stale reports and shell clock skew has
// no effect on freshness.
var putTelemetry = redis.NewScript(`
local now = redis.call('TIME')
local remaining = tonumber(ARGV[3]) - (tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000))
if remaining <= 0 or remaining > tonumber(ARGV[4]) then return 0 end
local old = redis.call('GET', KEYS[1])
if old then
 local ok, value = pcall(cjson.decode, old)
 if ok and tonumber(value.sequence) >= tonumber(ARGV[1]) then return 0 end
end
redis.call('SET', KEYS[1], ARGV[2], 'PX', remaining)
return 1
`)

// The value and remaining lifetime must belong to the same Redis snapshot.
const readTelemetry = `return {redis.call('GET', KEYS[1]), redis.call('PTTL', KEYS[1])}`

// ReportTelemetry publishes observations only. Callers must first persist any
// control-state change. It also supports a disabled shell reporting a confirmed
// safety stop; it never grants admission or marks a process stopped itself.
func (s *Store) ReportTelemetry(ctx context.Context, n Node) error {
	return s.reportTelemetry(ctx, n, time.Now())
}

func (s *Store) reportTelemetry(ctx context.Context, n Node, observedLocally time.Time) error {
	if s.Redis == nil {
		return errors.New("shell telemetry requires Redis")
	}
	sequence := s.telemetrySequence.Add(1)
	observed, err := s.Redis.Time(ctx).Result()
	if err != nil {
		return err
	}
	// Include the preceding PG commit and Redis TIME round trip in the report
	// age using the producer's monotonic clock. A slow successful commit must
	// not turn an old CPU observation into a fresh heartbeat.
	remaining := telemetryTTL - time.Since(observedLocally)
	if remaining <= 0 {
		return errTelemetryRejected
	}
	report := telemetryReport{Node: n, Sequence: sequence, ObservedAt: observed.UTC()}
	data, err := json.Marshal(report)
	if err != nil {
		return err
	}
	accepted, err := putTelemetry.Run(ctx, s.Redis, []string{s.telemetryKey(n)}, report.Sequence, string(data), observed.Add(remaining).UnixMilli(), telemetryTTL.Milliseconds()).Int64()
	if err != nil {
		return err
	}
	if accepted != 1 {
		return errTelemetryRejected
	}
	return nil
}

// RefreshTelemetry merges only observations matching the accepted PG boot and
// control snapshot. Missing/expired Redis data means unknown, never a fallback
// to stale PG state. Legacy boots retain their PG heartbeat until replaced.
func (s *Store) RefreshTelemetry(ctx context.Context, nodes []Node) error {
	var keys []string
	var indexes []int
	for i := range nodes {
		n := &nodes[i]
		if n.TelemetryBootID == "" || n.TelemetryBootID != n.ShellBootID {
			continue
		}
		n.LastSeen = time.Time{}
		n.CPUPercent = nil
		n.Error = ""
		indexes = append(indexes, i)
		keys = append(keys, s.telemetryKey(*n))
	}
	if len(keys) == 0 {
		return nil
	}
	if s.Redis == nil {
		return nil
	}
	readStarted := time.Now()
	pipe := s.Redis.Pipeline()
	commands := make([]*redis.Cmd, len(keys))
	for i, key := range keys {
		commands[i] = pipe.Eval(ctx, readTelemetry, []string{key})
	}
	_, err := pipe.Exec(ctx)
	// Availability of observation storage must not erase durable control state.
	// Consumers already treat zero LastSeen as unavailable/fail closed.
	if err != nil {
		return nil
	}
	for j, command := range commands {
		values, err := command.Slice()
		if err != nil || len(values) != 2 {
			continue
		}
		raw, ok := values[0].(string)
		if !ok {
			continue
		}
		remaining, ok := values[1].(int64)
		if !ok || remaining <= 0 || remaining > telemetryTTL.Milliseconds() {
			continue
		}
		var r telemetryReport
		if json.Unmarshal([]byte(raw), &r) != nil {
			continue
		}
		n := &nodes[indexes[j]]
		if !telemetryMatches(*n, r.Node) {
			continue
		}
		// Anchor to request start so Redis/network latency can only make a report
		// look older, never extend its usable lifetime. This time carries Go's
		// local monotonic clock for existing time.Since consumers.
		n.LastSeen = readStarted.Add(-telemetryTTL + time.Duration(remaining)*time.Millisecond)
		n.CPUPercent = r.Node.CPUPercent
		n.Error = r.Node.Error
	}
	return nil
}

func telemetryMatches(a, b Node) bool {
	return a.ID == b.ID && a.ShellBootID == b.ShellBootID && a.CoreBootID == b.CoreBootID && a.ReleaseDigest == b.ReleaseDigest && a.Mode == b.Mode && a.Ready == b.Ready && a.Stopped == b.Stopped && a.RouteRevision == b.RouteRevision && a.Offloading == b.Offloading
}

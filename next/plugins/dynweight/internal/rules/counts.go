package rules

import (
	"strconv"
	"strings"
)

// Sample is one attempt on an account. TTFBMs / LatencyMs < 0 mean the
// attempt has no such sample: TTFB comes from streams that sent a first
// event, latency from successful attempts.
type Sample struct {
	Stream     bool
	Fail       bool
	FailStatus int // the upstream status of a failure, 0 when there was none
	TTFBMs     int64
	LatencyMs  int64
}

// Family counts the attempts of one window under one scope (all, or the
// streaming subset). The tables are allocated on first use.
type Family struct {
	Total            int64
	Fail             int64
	TN               int64         // attempts with a TTFB sample
	LN               int64         // attempts with a latency sample
	Thresholds       map[int]int64 // ms -> TTFB samples >= ms
	Latency          map[int]int64 // ms -> latency samples >= ms
	ThresholdSamples map[int]int64 // ms -> TTFB samples counted while ms was a threshold
	LatencySamples   map[int]int64 // ms -> latency samples counted while ms was a threshold
	FailStatus       map[int]int64 // status -> failures
}

// Counts are the counters of one key in one window: all attempts, and the
// streaming subset (the non-streaming one is the difference).
type Counts struct {
	Family
	Stream Family
}

// tables names the count tables; the name prefixes the flat field.
var tables = [...]struct {
	prefix string
	of     func(*Family) *map[int]int64
}{
	{"fs", func(f *Family) *map[int]int64 { return &f.FailStatus }},
	{"tc", func(f *Family) *map[int]int64 { return &f.Thresholds }},
	{"nt", func(f *Family) *map[int]int64 { return &f.ThresholdSamples }},
	{"lc", func(f *Family) *map[int]int64 { return &f.Latency }},
	{"nl", func(f *Family) *map[int]int64 { return &f.LatencySamples }},
}

const streamPrefix = "s:"

func addCount(m *map[int]int64, k int, v int64) {
	if *m == nil {
		*m = make(map[int]int64)
	}
	(*m)[k] += v
}

func (f *Family) record(s Sample, thresholds, latency []int) {
	f.Total++
	if s.Fail {
		f.Fail++
		addCount(&f.FailStatus, s.FailStatus, 1)
	}
	if s.TTFBMs >= 0 {
		f.TN++
		for _, ms := range thresholds {
			addCount(&f.ThresholdSamples, ms, 1)
			if s.TTFBMs >= int64(ms) {
				addCount(&f.Thresholds, ms, 1)
			}
		}
	}
	if s.LatencyMs >= 0 {
		f.LN++
		for _, ms := range latency {
			addCount(&f.LatencySamples, ms, 1)
			if s.LatencyMs >= int64(ms) {
				addCount(&f.Latency, ms, 1)
			}
		}
	}
}

func (f *Family) add(o Family) {
	f.Total += o.Total
	f.Fail += o.Fail
	f.TN += o.TN
	f.LN += o.LN
	for _, t := range tables {
		dst := t.of(f)
		for k, v := range *t.of(&o) {
			addCount(dst, k, v)
		}
	}
}

func (f Family) sub(o Family) Family {
	out := Family{Total: f.Total - o.Total, Fail: f.Fail - o.Fail, TN: f.TN - o.TN, LN: f.LN - o.LN}
	for _, t := range tables {
		minus := *t.of(&o)
		for k, v := range *t.of(&f) {
			addCount(t.of(&out), k, v-minus[k])
		}
	}
	return out
}

// exemptFails is the number of failures on exempt status codes.
func (f Family) exemptFails(codes []int) int64 {
	var n int64
	for _, code := range codes {
		n += f.FailStatus[code]
	}
	return n
}

// Record counts a sample with the thresholds of the key's configuration.
func (c *Counts) Record(s Sample, cfg *Resolved) {
	c.Family.record(s, cfg.Thresholds, cfg.LatencyThresholds)
	if s.Stream {
		c.Stream.record(s, cfg.Thresholds, cfg.LatencyThresholds)
	}
}

// Add merges other counts in.
func (c *Counts) Add(o Counts) {
	c.Family.add(o.Family)
	c.Stream.add(o.Stream)
}

// Fields flattens the counts to non-zero fields ("total", "fs500",
// "s:tc10000" ...), the form they are stored and summed in.
func (c Counts) Fields() map[string]int64 {
	out := map[string]int64{}
	c.Family.fields(out, "")
	c.Stream.fields(out, streamPrefix)
	return out
}

func (f Family) fields(out map[string]int64, prefix string) {
	put := func(name string, v int64) {
		if v != 0 {
			out[prefix+name] = v
		}
	}
	put("total", f.Total)
	put("fail", f.Fail)
	put("tn", f.TN)
	put("ln", f.LN)
	for _, t := range tables {
		for k, v := range *t.of(&f) {
			put(t.prefix+strconv.Itoa(k), v)
		}
	}
}

// CountsOf reads counts back from their fields; unknown fields are ignored.
func CountsOf(fields map[string]int64) Counts {
	var c Counts
	for name, v := range fields {
		f := &c.Family
		if stripped, ok := strings.CutPrefix(name, streamPrefix); ok {
			name, f = stripped, &c.Stream
		}
		switch name {
		case "total":
			f.Total = v
		case "fail":
			f.Fail = v
		case "tn":
			f.TN = v
		case "ln":
			f.LN = v
		default:
			for _, t := range tables {
				if k, err := strconv.Atoi(strings.TrimPrefix(name, t.prefix)); err == nil && strings.HasPrefix(name, t.prefix) {
					addCount(t.of(f), k, v)
					break
				}
			}
		}
	}
	return c
}

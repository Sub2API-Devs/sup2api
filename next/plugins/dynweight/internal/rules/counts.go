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

const (
	streamPrefix   = "s:"
	tablePrefixLen = 2 // every table prefix has this length
)

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

// Judged is the attempts and failures the error rate reads: the failures on
// exempt status codes are left out of both.
func (f Family) Judged(exempt []int) (total, fail int64) {
	ex := f.exemptFails(exempt)
	return f.Total - ex, f.Fail - ex
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
		f.set(name, v)
	}
	return c
}

// scalarFields / tableFields find a flat field's target by its name, or by
// its prefix and the key after it.
var (
	scalarFields = map[string]func(*Family) *int64{
		"total": func(f *Family) *int64 { return &f.Total },
		"fail":  func(f *Family) *int64 { return &f.Fail },
		"tn":    func(f *Family) *int64 { return &f.TN },
		"ln":    func(f *Family) *int64 { return &f.LN },
	}
	tableFields = func() map[string]func(*Family) *map[int]int64 {
		m := make(map[string]func(*Family) *map[int]int64, len(tables))
		for _, t := range tables {
			if len(t.prefix) != tablePrefixLen {
				panic("dynweight: table prefix " + t.prefix)
			}
			m[t.prefix] = t.of
		}
		return m
	}()
)

// set puts a flat field back (CountsOf).
func (f *Family) set(name string, v int64) {
	if field := scalarFields[name]; field != nil {
		*field(f) = v
		return
	}
	if len(name) <= tablePrefixLen {
		return
	}
	if table := tableFields[name[:tablePrefixLen]]; table != nil {
		if k, err := strconv.Atoi(name[tablePrefixLen:]); err == nil {
			addCount(table(f), k, v)
		}
	}
}

// Package cpuload measures how busy a node's CPU is. A node is as busy as the
// busier of its own cgroup (shell, core and plugins against the CPUs the
// cgroup may use) and the whole machine.
package cpuload

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Counter returns cumulative busy and total CPU time in any one unit.
type Counter func() (busy, total float64, err error)

// Sampler averages the busiest counter over a sliding window of ticks.
type Sampler struct {
	Counters []Counter
	Window   int

	mu      sync.Mutex
	last    [][2]float64
	ticks   []float64
	healthy bool
}

func (s *Sampler) Run(ctx context.Context, interval time.Duration) {
	tick := time.NewTicker(interval)
	defer tick.Stop()
	for {
		s.Sample()
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}

// Sample takes one reading. A failing counter makes the node unmeasured
// until the next complete reading, never "idle".
func (s *Sampler) Sample() {
	readings := make([][2]float64, len(s.Counters))
	ok := len(s.Counters) > 0
	for i, c := range s.Counters {
		busy, total, err := c()
		if err != nil {
			ok = false
			break
		}
		readings[i] = [2]float64{busy, total}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if !ok {
		s.last, s.ticks, s.healthy = nil, nil, false
		return
	}
	if s.last != nil {
		percent := 0.0
		for i, r := range readings {
			busy, total := r[0]-s.last[i][0], r[1]-s.last[i][1]
			if total <= 0 || busy < 0 {
				continue
			}
			percent = max(percent, min(100, 100*busy/total))
		}
		window := max(s.Window, 1)
		s.ticks = append(s.ticks, percent)
		if len(s.ticks) > window {
			s.ticks = s.ticks[len(s.ticks)-window:]
		}
		s.healthy = true
	}
	s.last = readings
}

// Percent is the average over the window; ok is false until one interval
// has been measured.
func (s *Sampler) Percent() (float64, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.healthy || len(s.ticks) == 0 {
		return 0, false
	}
	sum := 0.0
	for _, v := range s.ticks {
		sum += v
	}
	return sum / float64(len(s.ticks)), true
}

// ParseProcStat reads the aggregate "cpu" line of /proc/stat. iowait counts
// as idle, guest time is already part of user time.
func ParseProcStat(data string) (busy, total float64, err error) {
	for _, line := range strings.Split(data, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 5 || fields[0] != "cpu" {
			continue
		}
		var v [8]float64
		for i := 1; i < len(fields) && i <= 8; i++ {
			if v[i-1], err = strconv.ParseFloat(fields[i], 64); err != nil {
				return 0, 0, err
			}
		}
		for _, x := range v {
			total += x
		}
		return total - v[3] - v[4], total, nil
	}
	return 0, 0, errors.New("no aggregate cpu line")
}

// ParseCgroupUsage reads usage_usec from a cgroup v2 cpu.stat.
func ParseCgroupUsage(data string) (float64, error) {
	for _, line := range strings.Split(data, "\n") {
		if v, ok := strings.CutPrefix(line, "usage_usec "); ok {
			return strconv.ParseFloat(strings.TrimSpace(v), 64)
		}
	}
	return 0, errors.New("cpu.stat has no usage_usec")
}

// ParseCgroupLimit reads cpu.max ("max 100000" or "<quota> <period>") as a
// number of CPUs; ok is false without a quota.
func ParseCgroupLimit(data string) (float64, bool) {
	fields := strings.Fields(data)
	if len(fields) != 2 || fields[0] == "max" {
		return 0, false
	}
	quota, e1 := strconv.ParseFloat(fields[0], 64)
	period, e2 := strconv.ParseFloat(fields[1], 64)
	if e1 != nil || e2 != nil || quota <= 0 || period <= 0 {
		return 0, false
	}
	return quota / period, true
}

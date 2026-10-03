package cpuload

import (
	"errors"
	"math"
	"testing"
)

func TestSamplerAveragesTheBusierCounterOverTheWindow(t *testing.T) {
	var machine, cgroup [2]float64
	var fail bool
	step := func(c *[2]float64, busy, total float64) { c[0] += busy; c[1] += total }
	s := &Sampler{Window: 2, Counters: []Counter{
		func() (float64, float64, error) { return machine[0], machine[1], nil },
		func() (float64, float64, error) {
			if fail {
				return 0, 0, errors.New("gone")
			}
			return cgroup[0], cgroup[1], nil
		},
	}}
	s.Sample()
	if _, ok := s.Percent(); ok {
		t.Fatal("one reading has no interval")
	}
	step(&machine, 30, 100)
	step(&cgroup, 90, 100)
	s.Sample()
	if p, ok := s.Percent(); !ok || p != 90 {
		t.Fatalf("busier counter: %v %v", p, ok)
	}
	step(&machine, 50, 100)
	step(&cgroup, 10, 100)
	s.Sample()
	if p, _ := s.Percent(); p != 70 {
		t.Fatalf("window average of 90 and 50: %v", p)
	}
	step(&machine, 20, 100)
	step(&cgroup, 10, 100)
	s.Sample()
	if p, _ := s.Percent(); math.Abs(p-35) > 1e-9 {
		t.Fatalf("window drops the oldest tick: %v", p)
	}
	fail = true
	s.Sample()
	if _, ok := s.Percent(); ok {
		t.Fatal("a failing counter must leave the node unmeasured")
	}
	if _, ok := (&Sampler{}).Percent(); ok {
		t.Fatal("no counters means unmeasured")
	}
}

func TestParsers(t *testing.T) {
	busy, total, err := ParseProcStat("cpu  100 0 50 800 50 0 0 0 7 0\ncpu0 1 2 3 4\n")
	if err != nil || busy != 150 || total != 1000 {
		t.Fatalf("proc stat: %v %v %v", busy, total, err)
	}
	if _, _, err = ParseProcStat("intr 1"); err == nil {
		t.Fatal("missing cpu line")
	}
	if v, err := ParseCgroupUsage("usage_usec 1234\nuser_usec 1\n"); err != nil || v != 1234 {
		t.Fatalf("cpu.stat: %v %v", v, err)
	}
	if v, ok := ParseCgroupLimit("200000 100000\n"); !ok || v != 2 {
		t.Fatalf("cpu.max: %v %v", v, ok)
	}
	if _, ok := ParseCgroupLimit("max 100000\n"); ok {
		t.Fatal("unlimited cgroup has no quota")
	}
}

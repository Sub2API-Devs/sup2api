//go:build linux

package sandbox

import (
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func readProc(pid int) (procSample, error) {
	var s procSample
	base := "/proc/" + strconv.Itoa(pid)
	status, err := os.ReadFile(base + "/status")
	if err != nil {
		return s, err
	}
	if err := parseStatus(string(status), &s); err != nil {
		return s, err
	}
	stat, err := os.ReadFile(base + "/stat")
	if err != nil {
		return s, err
	}
	return s, parseStat(string(stat), &s)
}

// Watch samples /proc/<pid> every WatchInterval. It emits "sample" events,
// "memory_exceeded" after 3 consecutive samples above 110% of MemoryMB and
// "threads_exceeded" when Threads rises above MaxThreads. The watch ends
// when stop is called or the process disappears.
func (l *Launcher) Watch(spec core.LaunchSpec, pid int, onEvent func(core.ResourceEvent)) (stop func()) {
	done := make(chan struct{})
	var once sync.Once
	go func() {
		t := time.NewTicker(l.opts.WatchInterval)
		defer t.Stop()
		w := &watchState{spec: spec, pid: pid}
		for {
			select {
			case <-done:
				return
			case now := <-t.C:
				s, err := readProc(pid)
				if err != nil {
					return // process exited
				}
				select {
				case <-done:
					return
				default:
				}
				w.observe(s, now, onEvent)
			}
		}
	}()
	return func() { once.Do(func() { close(done) }) }
}

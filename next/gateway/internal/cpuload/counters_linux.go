//go:build linux

package cpuload

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// Counters returns the machine counter and, under cgroup v2, the counter of
// this process's own cgroup.
func Counters() []Counter {
	out := []Counter{func() (float64, float64, error) {
		data, err := os.ReadFile("/proc/stat")
		if err != nil {
			return 0, 0, err
		}
		return ParseProcStat(string(data))
	}}
	if dir := cgroupDir(); dir != "" {
		start := time.Now()
		out = append(out, func() (float64, float64, error) {
			data, err := os.ReadFile(filepath.Join(dir, "cpu.stat"))
			if err != nil {
				return 0, 0, err
			}
			busy, err := ParseCgroupUsage(string(data))
			if err != nil {
				return 0, 0, err
			}
			cpus := float64(runtime.NumCPU())
			if limit, err := os.ReadFile(filepath.Join(dir, "cpu.max")); err == nil {
				if quota, ok := ParseCgroupLimit(string(limit)); ok && quota < cpus {
					cpus = quota
				}
			}
			return busy, float64(time.Since(start).Microseconds()) * cpus, nil
		})
	}
	return out
}

// cgroupDir finds the cgroup v2 directory of this process. In a container
// with its own cgroup namespace the path is "/".
func cgroupDir() string {
	data, err := os.ReadFile("/proc/self/cgroup")
	if err != nil {
		return ""
	}
	for _, line := range strings.Split(string(data), "\n") {
		if path, ok := strings.CutPrefix(line, "0::"); ok {
			dir := filepath.Join("/sys/fs/cgroup", filepath.Clean("/"+strings.TrimSpace(path)))
			if _, err := os.Stat(filepath.Join(dir, "cpu.stat")); err == nil {
				return dir
			}
		}
	}
	if _, err := os.Stat("/sys/fs/cgroup/cpu.stat"); err == nil {
		return "/sys/fs/cgroup"
	}
	return ""
}

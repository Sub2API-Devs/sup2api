//go:build !linux

package cpuload

// Counters is empty off Linux: the node is never measured and so never
// offloads or receives offloaded traffic.
func Counters() []Counter { return nil }

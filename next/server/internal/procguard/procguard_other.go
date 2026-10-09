//go:build !linux

package procguard

func disableDumping() error { return nil }

func dumpable() (bool, error) { return true, nil }

func scrubInitialEnv(map[string]bool) error { return nil }

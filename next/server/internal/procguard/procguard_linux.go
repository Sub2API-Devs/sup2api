//go:build linux

package procguard

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"golang.org/x/sys/unix"
)

func disableDumping() error {
	if err := unix.Prctl(unix.PR_SET_DUMPABLE, 0, 0, 0, 0); err != nil {
		return fmt.Errorf("prctl(PR_SET_DUMPABLE, 0): %w", err)
	}
	return nil
}

func dumpable() (bool, error) {
	v, err := unix.PrctlRetInt(unix.PR_GET_DUMPABLE, 0, 0, 0, 0)
	if err != nil {
		return false, fmt.Errorf("prctl(PR_GET_DUMPABLE): %w", err)
	}
	return v != 0, nil
}

// scrubInitialEnv blanks the values in the environment block the kernel
// placed on the initial stack. Go copied it at start-up (os.Getenv never
// reads it again), but /proc/<pid>/environ keeps showing it. It must run
// before DisableDumping: a non-dumpable process cannot open its own
// /proc/self/mem.
func scrubInitialEnv(drop map[string]bool) error {
	start, end, err := envBounds()
	if err != nil {
		return err
	}
	if end <= start {
		return nil
	}
	f, err := os.OpenFile("/proc/self/mem", os.O_RDWR, 0)
	if err != nil {
		return fmt.Errorf("open /proc/self/mem: %w", err)
	}
	defer f.Close()
	block := make([]byte, end-start)
	if _, err := f.ReadAt(block, int64(start)); err != nil {
		return fmt.Errorf("read environment block: %w", err)
	}
	orig := bytes.Clone(block)
	if !blankValues(block, drop) {
		return nil
	}
	// Write back only the bytes that changed.
	for i := 0; i < len(block); {
		if block[i] == orig[i] {
			i++
			continue
		}
		j := i
		for j < len(block) && block[j] != orig[j] {
			j++
		}
		if _, err := f.WriteAt(block[i:j], int64(start)+int64(i)); err != nil {
			return fmt.Errorf("overwrite environment block: %w", err)
		}
		i = j
	}
	return nil
}

// envBounds reads env_start and env_end (fields 50 and 51) of
// /proc/self/stat.
func envBounds() (uint64, uint64, error) {
	raw, err := os.ReadFile("/proc/self/stat")
	if err != nil {
		return 0, 0, err
	}
	// The command name (field 2) may contain spaces; fields after it start
	// at the last ')'.
	i := bytes.LastIndexByte(raw, ')')
	if i < 0 {
		return 0, 0, errors.New("unexpected /proc/self/stat format")
	}
	fields := strings.Fields(string(raw[i+1:]))
	// fields[0] is field 3 (state), so field n is fields[n-3].
	const envStart, envEnd = 50 - 3, 51 - 3
	if len(fields) <= envEnd {
		return 0, 0, errors.New("/proc/self/stat has no env_start/env_end (Linux < 3.5)")
	}
	start, err1 := strconv.ParseUint(fields[envStart], 10, 64)
	end, err2 := strconv.ParseUint(fields[envEnd], 10, 64)
	if err1 != nil || err2 != nil {
		return 0, 0, errors.New("unexpected env_start/env_end in /proc/self/stat")
	}
	return start, end, nil
}

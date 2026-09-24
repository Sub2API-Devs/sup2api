package sandbox

import (
	"bufio"
	"errors"
	"strconv"
	"strings"
)

// procSample is one reading of /proc/<pid>/{status,stat}.
type procSample struct {
	RSSBytes int64
	Threads  int
	CPUTicks uint64 // utime + stime in clock ticks
}

// parseStatus reads VmRSS and Threads from /proc/<pid>/status content.
func parseStatus(data string, s *procSample) error {
	var gotThreads bool
	sc := bufio.NewScanner(strings.NewReader(data))
	for sc.Scan() {
		k, v, ok := strings.Cut(sc.Text(), ":")
		if !ok {
			continue
		}
		f := strings.Fields(v)
		if len(f) == 0 {
			continue
		}
		switch k {
		case "VmRSS":
			n, err := strconv.ParseInt(f[0], 10, 64)
			if err != nil {
				return err
			}
			if len(f) > 1 && strings.EqualFold(f[1], "kB") {
				n *= 1024
			}
			s.RSSBytes = n
		case "Threads":
			n, err := strconv.Atoi(f[0])
			if err != nil {
				return err
			}
			s.Threads = n
			gotThreads = true
		}
	}
	if !gotThreads {
		return errors.New("status: no Threads line")
	}
	return nil
}

// parseStat reads utime+stime from /proc/<pid>/stat content. The comm field
// may contain spaces and parentheses, so parsing starts after the last ')'.
func parseStat(data string, s *procSample) error {
	i := strings.LastIndexByte(data, ')')
	if i < 0 {
		return errors.New("stat: malformed")
	}
	f := strings.Fields(data[i+1:])
	// f[0] is field 3 (state); utime is field 14, stime field 15.
	if len(f) < 13 {
		return errors.New("stat: too few fields")
	}
	ut, err := strconv.ParseUint(f[11], 10, 64)
	if err != nil {
		return err
	}
	st, err := strconv.ParseUint(f[12], 10, 64)
	if err != nil {
		return err
	}
	s.CPUTicks = ut + st
	return nil
}

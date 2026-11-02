package gateway

import (
	"sync"
	"time"
)

// warnSamplerWindow is how often one key may log; warnSamplerKeys bounds the
// number of keys remembered (MODEL-AVAILABILITY-PRECHECK-DESIGN §6.3).
const (
	warnSamplerWindow = 60 * time.Second
	warnSamplerKeys   = 1024
)

// warnSampler throttles a log line per key: at most one per window, and the
// one let through says how many were dropped since the last. It only counts
// under a lock - no I/O, no goroutines - so it can sit on the request path.
// The zero value is ready to use.
type warnSampler struct {
	mu   sync.Mutex
	keys map[string]*warnSample
}

type warnSample struct {
	last       time.Time
	suppressed int
}

// allow reports whether the line of key may be logged now and, when it may,
// how many lines of the key were suppressed since the last one logged.
func (s *warnSampler) allow(key string, now time.Time) (bool, int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if e := s.keys[key]; e != nil {
		if now.Sub(e.last) < warnSamplerWindow {
			e.suppressed++
			return false, 0
		}
		n := e.suppressed
		e.last, e.suppressed = now, 0
		return true, n
	}
	if s.keys == nil || len(s.keys) >= warnSamplerKeys {
		// Forgetting every key at once lets each log one line early; that
		// is the price of a bound that needs no eviction bookkeeping.
		s.keys = map[string]*warnSample{}
	}
	s.keys[key] = &warnSample{last: now}
	return true, 0
}

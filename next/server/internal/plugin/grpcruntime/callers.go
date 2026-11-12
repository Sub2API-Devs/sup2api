package grpcruntime

import "sync"

// callerSet counts, per console user, the HTTP requests an instance is
// serving. The zero value is ready to use.
type callerSet struct {
	mu sync.Mutex
	n  map[int64]int
}

// enter records one request of user uid and returns what ends it. A request
// without a user (webhook, public route) records nothing.
func (s *callerSet) enter(uid int64) (leave func()) {
	if uid <= 0 {
		return func() {}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.n == nil {
		s.n = map[int64]int{}
	}
	s.n[uid]++
	return func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.n[uid]--; s.n[uid] == 0 {
			delete(s.n, uid)
		}
	}
}

// has reports whether a request of user uid is in flight.
func (s *callerSet) has(uid int64) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.n[uid] > 0
}

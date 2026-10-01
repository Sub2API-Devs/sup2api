package app

import (
	"context"
	"net/http"
	"sync"
	"time"
)

// requestGate closes admission atomically with the handler completion barrier.
// Health remains observable while the load balancer removes a draining node.
type requestGate struct {
	mu       sync.Mutex
	draining bool
	wg       sync.WaitGroup
	active   int64
}

func (g *requestGate) isDraining() bool { g.mu.Lock(); defer g.mu.Unlock(); return g.draining }
func (g *requestGate) stop()            { g.mu.Lock(); g.draining = true; g.mu.Unlock() }
func (g *requestGate) open()            { g.mu.Lock(); g.draining = false; g.mu.Unlock() }
func (g *requestGate) count() int64     { g.mu.Lock(); defer g.mu.Unlock(); return g.active }
func (g *requestGate) wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		g.mu.Lock()
		if g.draining && r.URL.Path != "/healthz" {
			g.mu.Unlock()
			w.Header().Set("Retry-After", "5")
			http.Error(w, "node is draining", http.StatusServiceUnavailable)
			return
		}
		// Health requests do not produce usage and cannot delay the barrier.
		counted := r.URL.Path != "/healthz"
		if counted {
			g.wg.Add(1)
			g.active++
		}
		g.mu.Unlock()
		if counted {
			defer func() { g.mu.Lock(); g.active--; g.mu.Unlock(); g.wg.Done() }()
		}
		next.ServeHTTP(w, r)
	})
}

func shutdownHTTP(srv *http.Server, g *requestGate, cancelRequests context.CancelFunc, grace time.Duration) error {
	g.stop()
	ctx, cancel := context.WithTimeout(context.Background(), grace)
	defer cancel()
	err := srv.Shutdown(ctx)
	if err != nil {
		cancelRequests()
		_ = srv.Close()
	}
	// Closing a listener is not a handler barrier. Do not stop billing or
	// plugins until every producer finished its deferred Submit.
	g.wg.Wait()
	return err
}

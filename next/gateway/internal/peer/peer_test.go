package peer

import (
	"context"
	"errors"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"
)

func setup(t *testing.T) (*miniredis.Miniredis, *redis.Client, func(string, string, string) *Manager) {
	t.Helper()
	s := miniredis.RunT(t)
	r := redis.NewClient(&redis.Options{Addr: s.Addr(), MaxRetries: -1})
	t.Cleanup(func() { r.Close() })
	var lock sync.Mutex
	create := func(node, boot, key string) *Manager {
		m, e := New(Config{Redis: r, Cluster: "cluster", NodeID: node, BootID: boot, ConfiguredKey: key, Validate: func(context.Context, Identity) error { return nil }, Register: func(context.Context) error { return nil }, WithRegistration: func(ctx context.Context, fn func(context.Context) error) error {
			lock.Lock()
			defer lock.Unlock()
			return fn(ctx)
		}})
		if e != nil {
			t.Fatal(e)
		}
		return m
	}
	return s, r, create
}
func TestReusableKeysRenewAndRecover(t *testing.T) {
	for _, fixed := range []bool{false, true} {
		t.Run(map[bool]string{false: "automatic", true: "configured"}[fixed], func(t *testing.T) {
			s, _, create := setup(t)
			configured := ""
			if fixed {
				configured = strings.Repeat("k", 32)
			}
			m := create("a", "boot", configured)
			ctx := context.Background()
			if e := m.Maintain(ctx); e != nil {
				t.Fatal(e)
			}
			old := m.key
			receiver := m.Middleware(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
				if q.Header.Get(KeyHeader) != "" {
					t.Error("key leaked")
				}
				w.WriteHeader(204)
			}))
			request := func(key string) int {
				q := httptest.NewRequest("GET", "https://node/internal/", nil)
				q.Header.Set(NodeHeader, "a")
				q.Header.Set(BootHeader, "boot")
				q.Header.Set(KeyHeader, key)
				w := httptest.NewRecorder()
				receiver.ServeHTTP(w, q)
				return w.Code
			}
			for i := 0; i < 2; i++ {
				if request(old) != 204 {
					t.Fatal("reusable key rejected")
				}
			}
			s.FastForward(20 * time.Second)
			if e := m.Maintain(ctx); e != nil {
				t.Fatal(e)
			}
			if m.key != old {
				t.Fatal("renew rotated key")
			}
			s.FastForward(31 * time.Second)
			if e := m.Check(ctx); e == nil {
				t.Fatal("missing record accepted")
			}
			if e := m.Maintain(ctx); e != nil {
				t.Fatal(e)
			}
			if (m.key == old) != fixed {
				t.Fatal("wrong recovery mode")
			}
			if request(m.key) != 204 {
				t.Fatal("restored key rejected")
			}
			if !fixed && request(old) != 401 {
				t.Fatal("old automatic key survived")
			}
		})
	}
}
func TestLiveBootAndLateOwnerCannotOverwrite(t *testing.T) {
	s, _, create := setup(t)
	ctx := context.Background()
	old := create("a", "old", "")
	newer := create("a", "new", "")
	if e := old.Maintain(ctx); e != nil {
		t.Fatal(e)
	}
	if e := newer.Maintain(ctx); !errors.Is(e, ErrConflict) {
		t.Fatal(e)
	}
	s.FastForward(31 * time.Second)
	if e := newer.Maintain(ctx); e != nil {
		t.Fatal(e)
	}
	if e := old.Unregister(ctx); e != nil {
		t.Fatal(e)
	}
	if e := newer.Check(ctx); e != nil {
		t.Fatal("late unregister deleted new owner", e)
	}
	if e := old.Maintain(ctx); !errors.Is(e, ErrConflict) {
		t.Fatal("old renewed", e)
	}
}
func TestAuthorityFailureAndDuplicateHeadersFailClosed(t *testing.T) {
	s, _, create := setup(t)
	ctx := context.Background()
	m := create("a", "boot", "")
	if e := m.Maintain(ctx); e != nil {
		t.Fatal(e)
	}
	h := m.Middleware(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) { t.Error("unauthorized dispatch") }))
	q := httptest.NewRequest("GET", "https://node/", nil)
	q.Header.Set(NodeHeader, "a")
	q.Header.Set(BootHeader, "boot")
	q.Header.Set(KeyHeader, m.key)
	q.Header.Add(KeyHeader, m.key)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, q)
	if w.Code != 401 {
		t.Fatal(w.Code)
	}
	q.Header.Set(KeyHeader, m.key)
	m.config.Validate = func(context.Context, Identity) error { return ErrForbidden }
	w = httptest.NewRecorder()
	h.ServeHTTP(w, q)
	if w.Code != 403 {
		t.Fatal(w.Code)
	}
	if e := m.Maintain(ctx); e == nil {
		t.Fatal("disabled node renewed")
	}
	m.config.Validate = func(context.Context, Identity) error { return nil }
	s.Close()
	w = httptest.NewRecorder()
	h.ServeHTTP(w, q)
	if w.Code != 503 {
		t.Fatal(w.Code)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(q *http.Request) (*http.Response, error) { return f(q) }
func TestPeerTransportDoesNotLeakOrFollowRedirect(t *testing.T) {
	_, _, create := setup(t)
	m := create("a", "boot", "")
	if e := m.Maintain(context.Background()); e != nil {
		t.Fatal(e)
	}
	calls := 0
	tr := m.WrapTransport(roundTripFunc(func(q *http.Request) (*http.Response, error) {
		calls++
		if q.Header.Get(KeyHeader) != m.key || q.Header.Get("Authorization") != "Bearer business" {
			t.Fatal("missing credentials")
		}
		return &http.Response{StatusCode: 302, Header: http.Header{"Location": []string{"https://evil.invalid/"}}, Body: io.NopCloser(strings.NewReader("")), Request: q}, nil
	}), func(_ context.Context, u *url.URL) error {
		if u.Host != "primary" {
			return ErrForbidden
		}
		return nil
	})
	client := NewClient(tr, time.Second)
	q, _ := http.NewRequest("POST", "https://primary/request", strings.NewReader("stream"))
	q.Header.Set("Authorization", "Bearer business")
	res, e := client.Do(q)
	if e != nil || res.StatusCode != 302 || calls != 1 {
		t.Fatalf("redirect followed: %v %d", e, calls)
	}
	res.Body.Close()
	q.URL.Host = "evil.invalid"
	if _, e = client.Do(q); e == nil || calls != 1 {
		t.Fatal("key leaked to unregistered target")
	}
}

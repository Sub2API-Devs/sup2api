package cluster

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestLockerTryLockAndRelease(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	l := NewLocker(rdb, nil)

	before := time.Now()
	lk, ok, err := l.TryLock(ctx, "job:x", 10*time.Second)
	if err != nil || !ok {
		t.Fatalf("lock: ok=%v err=%v", ok, err)
	}
	if got, _ := mr.Get("lock:job:x"); lk.Token() == "" || got != lk.Token() {
		t.Fatalf("token %q, redis has %q", lk.Token(), got)
	}
	if ttl := mr.TTL("lock:job:x"); ttl != 10*time.Second {
		t.Fatalf("redis ttl = %v", ttl)
	}
	if u := lk.Until(); !u.After(before) || u.After(before.Add(10*time.Second)) {
		t.Fatalf("until %v is not within the ttl from %v", u, before)
	}

	// Contended: one attempt, no error, an inert lock.
	other, ok, err := l.TryLock(ctx, "job:x", 10*time.Second)
	if ok || err != nil || other == nil {
		t.Fatalf("second lock: ok=%v err=%v lock=%v", ok, err, other)
	}
	if other.Token() != "" || !other.Until().IsZero() {
		t.Fatalf("failed TryLock returned a live-looking lock: %q %v", other.Token(), other.Until())
	}
	if ok, err := other.Extend(ctx); ok || err != nil {
		t.Fatalf("extend of a failed lock: ok=%v err=%v", ok, err)
	}
	other.Release()
	if !mr.Exists("lock:job:x") {
		t.Fatal("releasing a failed lock deleted the holder's")
	}

	lk.Release()
	if mr.Exists("lock:job:x") {
		t.Fatal("release did not delete")
	}
	if !lk.Until().IsZero() {
		t.Fatal("until must be zero once released")
	}
	lk.Release() // idempotent
	if ok, err := lk.Extend(ctx); ok || err != nil {
		t.Fatalf("extend after release: ok=%v err=%v", ok, err)
	}
	if mr.Exists("lock:job:x") {
		t.Fatal("extend after release re-created the lock")
	}

	again, ok, err := l.TryLock(ctx, "job:x", time.Second)
	if err != nil || !ok {
		t.Fatalf("relock after release: ok=%v err=%v", ok, err)
	}
	again.Release()

	if _, ok, err := l.TryLock(ctx, "job:x", 0); ok || err == nil {
		t.Fatalf("zero ttl: ok=%v err=%v", ok, err)
	}
}

// A lock that expired and was taken by someone else is theirs: the old
// handle can neither release nor extend it.
func TestLockerStaleHandle(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	l := NewLocker(rdb, nil)

	old, ok, _ := l.TryLock(ctx, "job:x", time.Second)
	if !ok {
		t.Fatal("lock")
	}
	mr.FastForward(2 * time.Second)
	cur, ok, _ := l.TryLock(ctx, "job:x", time.Second)
	if !ok {
		t.Fatal("lock after expiry")
	}

	if ok, err := old.Extend(ctx); ok || err != nil {
		t.Fatalf("stale extend: ok=%v err=%v, want false, nil", ok, err)
	}
	if !old.Until().IsZero() {
		t.Fatal("a lost lock must report a zero Until")
	}
	if ttl := mr.TTL("lock:job:x"); ttl != time.Second {
		t.Fatalf("stale extend touched the new owner's ttl: %v", ttl)
	}
	old.Release()
	if got, _ := mr.Get("lock:job:x"); got != cur.Token() {
		t.Fatalf("stale release deleted another owner's lock (redis has %q)", got)
	}
	cur.Release()
	if mr.Exists("lock:job:x") {
		t.Fatal("release did not delete")
	}
}

func TestLockerExtend(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	l := NewLocker(rdb, nil)

	lk, ok, _ := l.TryLock(ctx, "job:x", 2*time.Second)
	if !ok {
		t.Fatal("lock")
	}
	u1 := lk.Until()
	mr.FastForward(1500 * time.Millisecond)
	time.Sleep(20 * time.Millisecond)
	if ok, err := lk.Extend(ctx); !ok || err != nil {
		t.Fatalf("extend: ok=%v err=%v", ok, err)
	}
	if u2 := lk.Until(); !u2.After(u1) {
		t.Fatalf("extend did not push Until: %v -> %v", u1, u2)
	}
	if ttl := mr.TTL("lock:job:x"); ttl != 2*time.Second {
		t.Fatalf("redis ttl after extend = %v, want the full ttl", ttl)
	}
	if got, _ := mr.Get("lock:job:x"); got != lk.Token() {
		t.Fatal("extend changed the token")
	}
	lk.Release()
}

// A key that vanished (expired with nobody taking it, or lost to a Redis
// restart) is a lost lock - a definite (false, nil), which KeepLock turns
// into ErrLockLost - and Extend does not quietly re-create it.
func TestLockerExtendAfterExpiry(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	l := NewLocker(rdb, nil)

	lk, ok, _ := l.TryLock(ctx, "job:x", time.Second)
	if !ok {
		t.Fatal("lock")
	}
	mr.FastForward(2 * time.Second)
	if ok, err := lk.Extend(ctx); ok || err != nil {
		t.Fatalf("extend of an expired lock: ok=%v err=%v, want false, nil", ok, err)
	}
	if mr.Exists("lock:job:x") {
		t.Fatal("extend re-created an expired lock")
	}
	if !lk.Until().IsZero() {
		t.Fatal("a lost lock must report a zero Until")
	}
	lk.Release() // the key is gone: a no-op, not a warning-worthy failure
}

func TestLockerResume(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	l := NewLocker(rdb, nil)

	lk, ok, _ := l.TryLock(ctx, "plugin:x", 5*time.Second)
	if !ok {
		t.Fatal("lock")
	}

	wrong := l.Resume("plugin:x", "not-the-token", 5*time.Second)
	if ok, err := wrong.Extend(ctx); ok || err != nil {
		t.Fatalf("extend with a wrong token: ok=%v err=%v", ok, err)
	}
	wrong.Release()
	if got, _ := mr.Get("plugin:x"); got != "" {
		t.Fatal("resume must use the lock: prefix")
	}
	if got, _ := mr.Get("lock:plugin:x"); got != lk.Token() {
		t.Fatal("release with a wrong token deleted the lock")
	}
	if ttl := mr.TTL("lock:plugin:x"); ttl != 5*time.Second {
		t.Fatalf("extend with a wrong token touched the ttl: %v", ttl)
	}

	for _, bad := range []core.Lock{l.Resume("plugin:x", "", 5*time.Second), l.Resume("plugin:x", lk.Token(), 0)} {
		if ok, err := bad.Extend(ctx); ok || err != nil {
			t.Fatalf("extend of an invalid resume: ok=%v err=%v", ok, err)
		}
		bad.Release()
	}
	if !mr.Exists("lock:plugin:x") {
		t.Fatal("an invalid resume released the lock")
	}

	r := l.Resume("plugin:x", lk.Token(), 8*time.Second)
	if r.Token() != lk.Token() || !r.Until().IsZero() {
		t.Fatalf("resumed lock: token %q until %v", r.Token(), r.Until())
	}
	if ok, err := r.Extend(ctx); !ok || err != nil {
		t.Fatalf("extend with the right token: ok=%v err=%v", ok, err)
	}
	if r.Until().IsZero() {
		t.Fatal("until not set by a successful extend")
	}
	if ttl := mr.TTL("lock:plugin:x"); ttl != 8*time.Second {
		t.Fatalf("resumed extend uses the resume ttl: got %v", ttl)
	}
	r.Release()
	if mr.Exists("lock:plugin:x") {
		t.Fatal("release with the right token did not delete")
	}
}

// TryLockToken stores the caller's token (not one redsync generated), and a
// holder elsewhere can resume, extend and release it with that token.
func TestLockerTryLockToken(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	l := NewLocker(rdb, nil)
	const tok = "caller-chosen-token_0123"

	before := time.Now()
	lk, ok, err := l.TryLockToken(ctx, "plugin:p:x", tok, 10*time.Second)
	if err != nil || !ok {
		t.Fatalf("lock: ok=%v err=%v", ok, err)
	}
	if got, _ := mr.Get("lock:plugin:p:x"); got != tok || lk.Token() != tok {
		t.Fatalf("redis has %q, handle %q, want the caller's token", got, lk.Token())
	}
	if ttl := mr.TTL("lock:plugin:p:x"); ttl != 10*time.Second {
		t.Fatalf("redis ttl = %v", ttl)
	}
	// Until: the ttl from before the call, minus redsync's 1% drift margin.
	if u := lk.Until(); u.Before(before.Add(9800*time.Millisecond)) || u.After(time.Now().Add(9900*time.Millisecond)) {
		t.Fatalf("until %v is not ttl - drift from %v", u, before)
	}

	// Contended with another token: no, without an error, and no harm done.
	if _, ok, err := l.TryLockToken(ctx, "plugin:p:x", "someone-else-token-01", 10*time.Second); ok || err != nil {
		t.Fatalf("contended: ok=%v err=%v", ok, err)
	}
	if got, _ := mr.Get("lock:plugin:p:x"); got != tok {
		t.Fatalf("a contended attempt changed the lock: %q", got)
	}

	// Another process resumes it with the token: extend, then release.
	r := l.Resume("plugin:p:x", tok, 20*time.Second)
	if ok, err := r.Extend(ctx); !ok || err != nil {
		t.Fatalf("resumed extend: ok=%v err=%v", ok, err)
	}
	if ttl := mr.TTL("lock:plugin:p:x"); ttl != 20*time.Second {
		t.Fatalf("resumed extend ttl = %v", ttl)
	}
	r.Release()
	if mr.Exists("lock:plugin:p:x") {
		t.Fatal("resumed release did not delete")
	}

	// Bad arguments are errors, not locks.
	if _, ok, err := l.TryLockToken(ctx, "plugin:p:x", "", time.Second); ok || err == nil {
		t.Fatalf("empty token: ok=%v err=%v", ok, err)
	}
	if _, ok, err := l.TryLockToken(ctx, "plugin:p:x", tok, 0); ok || err == nil {
		t.Fatalf("zero ttl: ok=%v err=%v", ok, err)
	}
}

// The documented trap: an attempt with the token the lock is already held
// with fails SET NX, and redsync's cleanup of the failed attempt deletes
// the lock (compare-and-delete with the same token matches).
func TestLockerTryLockTokenReuseReleases(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	l := NewLocker(rdb, nil)
	const tok = "reused-token-0123456789"
	if _, ok, err := l.TryLockToken(ctx, "k", tok, 10*time.Second); !ok || err != nil {
		t.Fatalf("lock: ok=%v err=%v", ok, err)
	}
	if _, ok, err := l.TryLockToken(ctx, "k", tok, 10*time.Second); ok || err != nil {
		t.Fatalf("re-lock with the same token: ok=%v err=%v", ok, err)
	}
	if mr.Exists("lock:k") {
		t.Fatal("expected redsync's failure cleanup to delete the held lock; if this changed, update the proto and core.TokenLocker docs")
	}
}

func TestLockerReleaseToken(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	l := NewLocker(rdb, nil)
	const tok = "release-token-0123456789"

	// Never taken, wrong token, right token, again: all nil; only the right
	// token deletes.
	if err := l.ReleaseToken(ctx, "k", tok); err != nil {
		t.Fatalf("release of a missing lock: %v", err)
	}
	if _, ok, _ := l.TryLockToken(ctx, "k", tok, 10*time.Second); !ok {
		t.Fatal("lock")
	}
	if err := l.ReleaseToken(ctx, "k", "wrong-token-0123456789"); err != nil {
		t.Fatalf("release with a wrong token: %v", err)
	}
	if err := l.ReleaseToken(ctx, "k", ""); err != nil {
		t.Fatalf("release with an empty token: %v", err)
	}
	if got, _ := mr.Get("lock:k"); got != tok {
		t.Fatalf("a wrong token released the lock (redis has %q)", got)
	}
	if err := l.ReleaseToken(ctx, "k", tok); err != nil || mr.Exists("lock:k") {
		t.Fatalf("release: err=%v exists=%v", err, mr.Exists("lock:k"))
	}
	if err := l.ReleaseToken(ctx, "k", tok); err != nil {
		t.Fatalf("second release: %v", err)
	}

	// Without Redis the outcome is unknown: an error, unlike Lock.Release.
	mr.Close()
	if err := l.ReleaseToken(ctx, "k", tok); err == nil {
		t.Fatal("release without redis must report an error")
	}
}

// No fallback: without Redis there is no lock, and it says so.
func TestLockerRedisDown(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	l := NewLocker(rdb, nil)
	held, ok, _ := l.TryLock(ctx, "job:y", time.Second)
	if !ok {
		t.Fatal("lock")
	}
	mr.Close()

	lk, ok, err := l.TryLock(ctx, "job:x", time.Second)
	if ok || err == nil || lk == nil {
		t.Fatalf("expected an error, ok=%v err=%v", ok, err)
	}
	// Extend cannot tell: an error, and Until is left alone for the caller
	// to run out.
	u := held.Until()
	if ok, err := held.Extend(ctx); ok || err == nil {
		t.Fatalf("extend without redis: ok=%v err=%v, want an error", ok, err)
	}
	if !held.Until().Equal(u) {
		t.Fatal("an unknown extend outcome must not move Until")
	}
	held.Release() // logs, does not block or panic
}

func TestTimeoutFactor(t *testing.T) {
	for _, c := range []struct {
		ttl    time.Duration
		factor float64
		call   time.Duration
	}{
		{100 * time.Millisecond, 0.5, 50 * time.Millisecond}, // capped at half the ttl
		{time.Second, 0.5, 500 * time.Millisecond},           // 500ms is half: both bounds meet
		{2 * time.Second, 0.25, 500 * time.Millisecond},      // the 500ms floor
		{10 * time.Second, 0.05, 500 * time.Millisecond},     // floor and redsync's 5% meet
		{time.Minute, 0.05, 3 * time.Second},                 // redsync's 5%
	} {
		if got := timeoutFactor(c.ttl); got != c.factor {
			t.Errorf("timeoutFactor(%v) = %v, want %v", c.ttl, got, c.factor)
		}
		if got := callTimeout(c.ttl); got != c.call {
			t.Errorf("callTimeout(%v) = %v, want %v", c.ttl, got, c.call)
		}
	}
}

// KeepLock over the real locker: extends keep the key alive, and a key that
// disappears ends the context with ErrLockLost rather than being retried as
// an unknown outcome.
func TestLockerKeepLock(t *testing.T) {
	mr, rdb := newRedis(t)
	l := NewLocker(rdb, nil)
	lk, ok, _ := l.TryLock(context.Background(), "job:x", 300*time.Millisecond)
	if !ok {
		t.Fatal("lock")
	}
	defer lk.Release()
	ctx, stop := core.KeepLock(context.Background(), lk)
	defer stop()

	// miniredis does not expire keys by itself; the extends show in Until.
	u := lk.Until()
	time.Sleep(700 * time.Millisecond)
	if ctx.Err() != nil {
		t.Fatalf("context ended while the lock was held: %v", context.Cause(ctx))
	}
	if !lk.Until().After(u) {
		t.Fatal("KeepLock did not extend")
	}

	mr.Del("lock:job:x")
	select {
	case <-ctx.Done():
	case <-time.After(2 * time.Second):
		t.Fatal("context survived a vanished lock")
	}
	if cause := context.Cause(ctx); !errors.Is(cause, core.ErrLockLost) {
		t.Fatalf("cause = %v, want ErrLockLost", cause)
	}
}

// Against a real server (CI sets TEST_REDIS_URL, Valkey or Redis; skipped
// locally): the Lua scripts, real expiry, and the error mapping of a real
// server.
func TestLockerRealRedis(t *testing.T) {
	url := os.Getenv("TEST_REDIS_URL")
	if url == "" {
		t.Skip("TEST_REDIS_URL not set")
	}
	opt, err := ParseRedisURL(url)
	if err != nil {
		t.Fatal(err)
	}
	rdb := redis.NewClient(opt)
	t.Cleanup(func() { _ = rdb.Close() })
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Fatalf("redis: %v", err)
	}
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	key := "test:locker:" + hex.EncodeToString(b)
	rkey := "lock:" + key
	t.Cleanup(func() { _ = rdb.Del(context.Background(), rkey).Err() })

	a := NewLocker(rdb, nil)
	c := NewLocker(rdb, nil) // another node
	lk, ok, err := a.TryLock(ctx, key, 400*time.Millisecond)
	if err != nil || !ok {
		t.Fatalf("lock: ok=%v err=%v", ok, err)
	}
	if _, ok, err := c.TryLock(ctx, key, time.Second); ok || err != nil {
		t.Fatalf("contended lock: ok=%v err=%v", ok, err)
	}
	u := lk.Until()
	if ok, err := lk.Extend(ctx); !ok || err != nil {
		t.Fatalf("extend: ok=%v err=%v", ok, err)
	}
	if !lk.Until().After(u) {
		t.Fatal("extend did not push Until")
	}

	time.Sleep(600 * time.Millisecond) // real expiry
	cur, ok, err := c.TryLock(ctx, key, 5*time.Second)
	if err != nil || !ok {
		t.Fatalf("lock after expiry: ok=%v err=%v", ok, err)
	}
	if ok, err := lk.Extend(ctx); ok || err != nil {
		t.Fatalf("stale extend: ok=%v err=%v, want false, nil", ok, err)
	}
	lk.Release()
	if got, _ := rdb.Get(ctx, rkey).Result(); got != cur.Token() {
		t.Fatalf("stale release deleted another owner's lock (redis has %q)", got)
	}

	r := a.Resume(key, cur.Token(), 5*time.Second)
	if ok, err := r.Extend(ctx); !ok || err != nil {
		t.Fatalf("resumed extend: ok=%v err=%v", ok, err)
	}
	r.Release()
	if n, _ := rdb.Exists(ctx, rkey).Result(); n != 0 {
		t.Fatal("resumed release did not delete")
	}
	if ok, err := cur.Extend(ctx); ok || err != nil {
		t.Fatalf("extend after the lock was released elsewhere: ok=%v err=%v", ok, err)
	}
	cur.Release()
}

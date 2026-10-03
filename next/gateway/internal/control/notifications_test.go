package control

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func awaitWake(t *testing.T, ch <-chan struct{}) {
	t.Helper()
	select {
	case <-ch:
	case <-time.After(3 * time.Second):
		t.Fatal("missing upgrade hint")
	}
}

func TestUpgradeWakeupsCoalesceAndIsolateClusters(t *testing.T) {
	r := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: r.Addr()})
	defer client.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	a, b := &Store{Redis: client, Cluster: "a"}, &Store{Redis: client, Cluster: "b"}
	wakes := a.upgradeWakeups(ctx)
	deadline := time.Now().Add(3 * time.Second)
	for {
		count, err := client.PubSubNumSub(ctx, a.upgradeChannel()).Result()
		if err == nil && count[a.upgradeChannel()] > 0 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("subscriber not registered")
		}
		time.Sleep(10 * time.Millisecond)
	}
	b.NotifyUpgrade(ctx)
	select {
	case <-wakes:
		t.Fatal("another cluster woke this engine")
	case <-time.After(30 * time.Millisecond):
	}
	for i := 0; i < 50; i++ {
		a.NotifyUpgrade(ctx)
	}
	awaitWake(t, wakes)
	// The bounded channel must not accumulate one command per publication.
	if cap(wakes) != 1 {
		t.Fatal("notifications must be coalesced")
	}
}

func TestUpgradeWakeupsReconnectAfterRedisRestart(t *testing.T) {
	r := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: r.Addr()})
	defer client.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	s := &Store{Redis: client, Cluster: "reconnect"}
	wakes := s.upgradeWakeups(ctx)
	waitSubscribed := func() {
		t.Helper()
		deadline := time.Now().Add(5 * time.Second)
		for time.Now().Before(deadline) {
			counts, err := client.PubSubNumSub(ctx, s.upgradeChannel()).Result()
			if err == nil && counts[s.upgradeChannel()] > 0 {
				return
			}
			time.Sleep(20 * time.Millisecond)
		}
		t.Fatal("subscriber did not reconnect")
	}
	waitSubscribed()
	s.NotifyUpgrade(ctx)
	awaitWake(t, wakes)
	r.Close()
	if err := r.Restart(); err != nil {
		t.Fatal(err)
	}
	waitSubscribed()
	s.NotifyUpgrade(ctx)
	awaitWake(t, wakes)
}

type lostNotifications struct{ redis.UniversalClient }

func (r lostNotifications) Publish(ctx context.Context, _ string, _ interface{}) *redis.IntCmd {
	cmd := redis.NewIntCmd(ctx)
	cmd.SetErr(errors.New("injected lost notification"))
	return cmd
}

func TestPostgresUpgradeProgressSurvivesLostNotifications(t *testing.T) {
	s, a, b, target := setupEngines(t)
	s.Redis = lostNotifications{s.Redis}
	// This proves recovery without notifications, not a wall-clock benchmark.
	// Leave headroom for race instrumentation and shared CI host scheduling.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pf, err := s.Preflight(ctx, target.Digest)
	if err != nil {
		t.Fatal(err)
	}
	p, err := s.Create(ctx, target.Digest, pf.ExpectedRevision, "lost-hints", "admin")
	if err != nil {
		t.Fatal(err)
	}
	a.Locks, b.Locks = s.Locks, s.Locks
	done := make(chan error, 2)
	go func() { done <- a.Run(ctx) }()
	go func() { done <- b.Run(ctx) }()
	defer func() { cancel(); <-done; <-done }()
	for ctx.Err() == nil {
		p, err = s.Plan(ctx, p.ID)
		if err != nil {
			t.Fatal(err)
		}
		if p.Status == "completed" {
			for _, st := range p.Steps {
				if st.Status != "done" {
					t.Fatalf("incomplete step: %+v", st)
				}
			}
			return
		}
		if p.Status == "paused" {
			t.Fatalf("plan paused: %s", p.Error)
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("polling fallback did not finish: %+v", p)
}

func TestPostgresCoordinateNoopDoesNotCreateProgress(t *testing.T) {
	s, a, _, target := setupEngines(t)
	ctx := context.Background()
	pf, err := s.Preflight(ctx, target.Digest)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Create(ctx, target.Digest, pf.ExpectedRevision, "noop", "admin"); err != nil {
		t.Fatal(err)
	}
	if err = a.Coordinate(ctx); err != nil {
		t.Fatal(err)
	}
	before := a.progress.Load()
	if before == 0 {
		t.Fatal("created step did not mark progress")
	}
	for i := 0; i < 10; i++ {
		if err = a.Coordinate(ctx); err != nil {
			t.Fatal(err)
		}
	}
	if a.progress.Load() != before {
		t.Fatal("pending step caused a self-wakeup loop")
	}
}

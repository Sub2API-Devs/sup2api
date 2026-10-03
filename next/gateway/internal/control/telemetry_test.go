package control

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestTelemetryExpiryBootAndControlIsolation(t *testing.T) {
	ctx := context.Background()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	defer client.Close()
	s := &Store{Cluster: "test", Redis: client}
	cpu := 43.0
	n := Node{ID: "a", ShellBootID: "boot", TelemetryBootID: "boot", CoreBootID: "core", Ready: true, Mode: "local", CPUPercent: &cpu, Error: "observed"}
	if err := s.ReportTelemetry(ctx, n); err != nil {
		t.Fatal(err)
	}
	read := func(in Node) Node {
		nodes := []Node{in}
		if err := s.RefreshTelemetry(ctx, nodes); err != nil {
			t.Fatal(err)
		}
		return nodes[0]
	}
	if got := read(n); got.LastSeen.IsZero() || got.CPUPercent == nil || *got.CPUPercent != cpu || got.Error != "observed" {
		t.Fatalf("missing report: %+v", got)
	}
	changed := n
	changed.CoreBootID = "new-core"
	if got := read(changed); !got.LastSeen.IsZero() || got.CPUPercent != nil {
		t.Fatalf("old control snapshot accepted: %+v", got)
	}
	changed = n
	changed.ShellBootID = "new-shell"
	changed.TelemetryBootID = "new-shell"
	if got := read(changed); !got.LastSeen.IsZero() {
		t.Fatal("old shell report accepted")
	}
	server.FastForward(telemetryTTL + time.Second)
	if got := read(n); !got.LastSeen.IsZero() || got.CPUPercent != nil || got.Error != "" {
		t.Fatalf("expired report reused PG observation: %+v", got)
	}
	if err := s.ReportTelemetry(ctx, n); err != nil {
		t.Fatal(err)
	}
	if read(n).LastSeen.IsZero() {
		t.Fatal("report did not recover after Redis expiry")
	}
	server.FlushAll()
	if !read(n).LastSeen.IsZero() {
		t.Fatal("Redis loss reused durable observation")
	}
	if err := s.ReportTelemetry(ctx, n); err != nil {
		t.Fatal(err)
	}
	if read(n).LastSeen.IsZero() {
		t.Fatal("report did not recover after Redis loss")
	}
	legacy := n
	legacy.TelemetryBootID = "old-boot"
	legacy.LastSeen = time.Now()
	if got := read(legacy); !got.LastSeen.Equal(legacy.LastSeen) {
		t.Fatal("legacy boot heartbeat was lost")
	}
}

func TestTelemetryRejectsDelayedSequence(t *testing.T) {
	ctx := context.Background()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	defer client.Close()
	s := &Store{Cluster: "sequence", Redis: client}
	n := Node{ID: "a", ShellBootID: "boot", TelemetryBootID: "boot"}
	newest := telemetryReport{Node: n, Sequence: 20, ObservedAt: time.Now()}
	serverNow, err := client.Time(ctx).Result()
	if err != nil {
		t.Fatal(err)
	}
	newest.Node.Error = "new"
	older := newest
	older.Sequence = 19
	older.Node.Error = "old"
	for _, report := range []telemetryReport{newest, older} {
		data, _ := json.Marshal(report)
		if err := putTelemetry.Run(ctx, client, []string{s.telemetryKey(n)}, report.Sequence, string(data), serverNow.Add(telemetryTTL).UnixMilli(), telemetryTTL.Milliseconds()).Err(); err != nil {
			t.Fatal(err)
		}
	}
	nodes := []Node{n}
	_ = s.RefreshTelemetry(ctx, nodes)
	if nodes[0].Error != "new" {
		t.Fatalf("late report overwrote newer: %+v", nodes[0])
	}
}

func TestTelemetryFreshnessIgnoresProducerAndConsumerWallClocks(t *testing.T) {
	ctx := context.Background()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	defer client.Close()
	s := &Store{Cluster: "clock-skew", Redis: client}
	n := Node{ID: "a", ShellBootID: "boot", TelemetryBootID: "boot"}
	for _, skew := range []time.Duration{-24 * time.Hour, 24 * time.Hour} {
		// Redis and the reader disagree by a day, and the report's serialized
		// producer timestamp is deliberately wrong in the other direction.
		server.SetTime(time.Now().Add(skew))
		if err := s.ReportTelemetry(ctx, n); err != nil {
			t.Fatal(err)
		}
		var report telemetryReport
		raw, err := client.Get(ctx, s.telemetryKey(n)).Result()
		if err != nil {
			t.Fatal(err)
		}
		if err = json.Unmarshal([]byte(raw), &report); err != nil {
			t.Fatal(err)
		}
		report.ObservedAt = time.Now().Add(-skew)
		data, _ := json.Marshal(report)
		if err = client.Set(ctx, s.telemetryKey(n), data, telemetryTTL).Err(); err != nil {
			t.Fatal(err)
		}
		nodes := []Node{n}
		if err = s.RefreshTelemetry(ctx, nodes); err != nil {
			t.Fatal(err)
		}
		if nodes[0].LastSeen.IsZero() || time.Since(nodes[0].LastSeen) > time.Second {
			t.Fatalf("clock skew rejected healthy report: %+v", nodes[0])
		}
		server.FastForward(telemetryTTL + time.Second)
		if err = s.RefreshTelemetry(ctx, nodes); err != nil {
			t.Fatal(err)
		}
		if !nodes[0].LastSeen.IsZero() {
			t.Fatal("expired report stayed fresh")
		}
	}
}

func TestTelemetryDeadlineRejectsReplayAndPreservesRemainingLifetime(t *testing.T) {
	ctx := context.Background()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	defer client.Close()
	s := &Store{Cluster: "deadline", Redis: client}
	n := Node{ID: "a", ShellBootID: "boot", TelemetryBootID: "boot"}
	base := time.Date(2026, 10, 3, 0, 0, 0, 0, time.UTC)
	server.SetTime(base)
	report := telemetryReport{Node: n, Sequence: 1, ObservedAt: base}
	data, _ := json.Marshal(report)
	write := func() int64 {
		result, err := putTelemetry.Run(ctx, client, []string{s.telemetryKey(n)}, report.Sequence, string(data), base.Add(telemetryTTL).UnixMilli(), telemetryTTL.Milliseconds()).Int64()
		if err != nil {
			t.Fatal(err)
		}
		return result
	}
	server.SetTime(base.Add(7 * time.Second))
	if write() != 1 {
		t.Fatal("valid delayed report rejected")
	}
	if ttl := server.TTL(s.telemetryKey(n)); ttl != 13*time.Second {
		t.Fatalf("delayed write extended deadline: %s", ttl)
	}
	server.FastForward(14 * time.Second)
	server.SetTime(base.Add(21 * time.Second))
	if write() != 0 || server.Exists(s.telemetryKey(n)) {
		t.Fatal("expired report resurrected after deadline")
	}
}

func TestTelemetryHeartbeatDoesNotRewriteDurableSnapshot(t *testing.T) {
	s, a, b, _ := setupEngines(t)
	ctx := context.Background()
	// Both boots now advertise telemetry support; clear any mixed-mode CPU once.
	if err := a.Heartbeat(ctx); err != nil {
		t.Fatal(err)
	}
	if err := b.Heartbeat(ctx); err != nil {
		t.Fatal(err)
	}
	var before, after string
	if err := s.DB.QueryRow(ctx, `SELECT xmin::text FROM updater.nodes WHERE node_id=$1`, a.Node.ID).Scan(&before); err != nil {
		t.Fatal(err)
	}
	nodes, err := s.Nodes(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var report Node
	for _, n := range nodes {
		if n.ID == a.Node.ID {
			report = n
		}
	}
	cpu := 73.0
	report.CPUPercent = &cpu
	report.Error = "transient observation"
	if err := s.Heartbeat(ctx, report); err != nil {
		t.Fatal(err)
	}
	if err := s.DB.QueryRow(ctx, `SELECT xmin::text FROM updater.nodes WHERE node_id=$1`, a.Node.ID).Scan(&after); err != nil {
		t.Fatal(err)
	}
	if before != after {
		t.Fatalf("observation rewrote PG tuple: %s -> %s", before, after)
	}
	nodes, err = s.Nodes(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, n := range nodes {
		if n.ID == a.Node.ID && (n.CPUPercent == nil || *n.CPUPercent != cpu || n.Error != report.Error) {
			t.Fatalf("telemetry not updated: %+v", n)
		}
	}
	report.ShellBootID = "replaced"
	if err := s.Heartbeat(ctx, report); err != ErrConflict {
		t.Fatalf("late boot accepted: %v", err)
	}
}

func TestTelemetryDoesNotRefreshObservationAfterSlowCommit(t *testing.T) {
	ctx := context.Background()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	defer client.Close()
	s := &Store{Cluster: "slow-commit", Redis: client}
	n := Node{ID: "a", ShellBootID: "boot", TelemetryBootID: "boot"}
	if err := s.reportTelemetry(ctx, n, time.Now().Add(-telemetryTTL-time.Second)); err != errTelemetryRejected {
		t.Fatalf("expired observation must not authorize follow-up work: %v", err)
	}
	if server.Exists(s.telemetryKey(n)) {
		t.Fatal("expired observation was published after slow commit")
	}
	if err := s.reportTelemetry(ctx, n, time.Now().Add(-7*time.Second)); err != nil {
		t.Fatal(err)
	}
	if ttl := server.TTL(s.telemetryKey(n)); ttl > 13*time.Second || ttl < 12*time.Second {
		t.Fatalf("PG wait was not deducted: %s", ttl)
	}
	// A delayed publisher with an older sequence must also surface rejection,
	// rather than allow its caller to execute decisions made from stale input.
	data, _ := json.Marshal(telemetryReport{Node: n, Sequence: 100, ObservedAt: time.Now()})
	if err := client.Set(ctx, s.telemetryKey(n), data, telemetryTTL).Err(); err != nil {
		t.Fatal(err)
	}
	if err := s.ReportTelemetry(ctx, n); err != errTelemetryRejected {
		t.Fatalf("superseded publication reported success: %v", err)
	}
}

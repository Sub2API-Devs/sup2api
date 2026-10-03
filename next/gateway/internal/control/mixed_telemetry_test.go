package control

import (
	"context"
	"testing"
)

// Old coordinators read PG directly. A Redis-capable follower must continue
// refreshing that view while an enabled legacy shell remains in the cluster.
func TestPostgresMixedTelemetryKeepsLegacyCoordinatorFresh(t *testing.T) {
	s, a, b, _ := setupEngines(t)
	ctx := context.Background()
	if _, err := s.DB.Exec(ctx, `UPDATE updater.nodes SET telemetry_boot_id='' WHERE node_id=$1`, a.Node.ID); err != nil {
		t.Fatal(err)
	}
	b.CPU = func() (float64, bool) { return 23, true }
	if err := b.Heartbeat(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := s.DB.Exec(ctx, `UPDATE updater.nodes SET last_seen=now()-interval '1 minute' WHERE node_id=$1`, b.Node.ID); err != nil {
		t.Fatal(err)
	}
	if err := b.Heartbeat(ctx); err != nil {
		t.Fatal(err)
	}
	var fresh bool
	var cpu *float64
	if err := s.DB.QueryRow(ctx, `SELECT ready AND mode='local' AND last_seen>now()-interval '20 seconds',cpu_percent FROM updater.nodes WHERE node_id=$1`, b.Node.ID).Scan(&fresh, &cpu); err != nil {
		t.Fatal(err)
	}
	if !fresh || cpu == nil || *cpu != 23 {
		t.Fatalf("legacy coordinator sees stale follower: fresh=%v cpu=%v", fresh, cpu)
	}
}

// An old binary's registration cannot clear columns introduced by a newer
// binary. The marker must therefore be compared to the current shell boot.
func TestPostgresMixedTelemetryDowngradedBootUsesLegacyReport(t *testing.T) {
	s, _, b, _ := setupEngines(t)
	ctx := context.Background()
	b.CPU = func() (float64, bool) { return 12, true }
	if err := b.Heartbeat(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := s.DB.Exec(ctx, `UPDATE updater.nodes SET shell_boot_id='legacy-reboot',ready=true,mode='local',last_seen=now(),cpu_percent=67 WHERE node_id=$1`, b.Node.ID); err != nil {
		t.Fatal(err)
	}
	nodes, err := s.Nodes(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, n := range nodes {
		if n.ID == b.Node.ID {
			if n.ShellBootID != "legacy-reboot" || !n.Ready || n.CPUPercent == nil || *n.CPUPercent != 67 {
				t.Fatalf("previous boot telemetry replaced downgraded shell report: %+v", n)
			}
			return
		}
	}
	t.Fatal("downgraded node disappeared")
}

// A fresh stopped report is not a replacement for plan-bound durable proof.
func TestPostgresTelemetryCannotReplaceStopConfirmation(t *testing.T) {
	s, a, b, target := setupEngines(t)
	ctx := context.Background()
	pf, err := s.Preflight(ctx, target.Digest)
	if err != nil {
		t.Fatal(err)
	}
	p, err := s.Create(ctx, target.Digest, pf.ExpectedRevision, "telemetry-stop-proof", "test")
	if err != nil {
		t.Fatal(err)
	}
	stopped := false
	for i := 0; i < 30; i++ {
		if err := a.Coordinate(ctx); err != nil {
			t.Fatal(err)
		}
		if err := a.Work(ctx); err != nil {
			t.Fatal(err)
		}
		if err := b.Work(ctx); err != nil {
			t.Fatal(err)
		}
		p, err = s.Plan(ctx, p.ID)
		if err != nil {
			t.Fatal(err)
		}
		for _, st := range p.Steps {
			if st.NodeID == b.Node.ID && st.Action == "stop" && st.Status == "done" {
				stopped = true
			}
		}
		if stopped {
			break
		}
	}
	if !stopped {
		t.Fatal("follower did not stop")
	}
	if err := a.followersStopped(ctx); err != nil {
		t.Fatalf("valid stop confirmation rejected: %v", err)
	}
	if _, err := s.DB.Exec(ctx, `DELETE FROM updater.stop_confirmations WHERE cluster_id=$1 AND node_id=$2`, s.Cluster, b.Node.ID); err != nil {
		t.Fatal(err)
	}
	if err := b.Heartbeat(ctx); err != nil {
		t.Fatal(err)
	}
	if err := a.followersStopped(ctx); err == nil {
		t.Fatal("fresh stopped telemetry replaced missing durable stop confirmation")
	}
}

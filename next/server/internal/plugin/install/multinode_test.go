package install

import (
	"context"
	"errors"
	"github.com/Masterminds/semver/v3"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
	"testing"
	"time"
)

type stoppedTestNodes struct {
	core.NodeRegistry
	live []core.NodeStatus
	err  error
}

func (n stoppedTestNodes) LiveNodes(context.Context) ([]core.NodeStatus, error) { return n.live, n.err }

func TestUninstallWaitsForDurableStopAndBlocksUpload(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	data := pkgtest.Build(pkgtest.Guard("guard", "0.1.0", "sub2api"), e.root)
	if _, err := e.svc.Upload(ctx, data, e.admin, UploadOptions{}); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO plugin_runtime_nodes(plugin_key,boot_id) VALUES('guard','lost-boot')`); err != nil {
		t.Fatal(err)
	}
	wait, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	finished := make(chan error, 1)
	go func() {
		_, err := e.svc.Uninstall(wait, "guard", UninstallOptions{Purge: true}, e.admin)
		finished <- err
	}()
	for {
		select {
		case err := <-finished:
			t.Fatalf("uninstall ended before durable barrier: %v", err)
		default:
		}
		var pending bool
		if err := e.db.Pool.QueryRow(wait, `SELECT EXISTS(SELECT 1 FROM plugin_uninstalls WHERE plugin_key='guard')`).Scan(&pending); err != nil {
			t.Fatal(err)
		}
		if pending {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	cancel()
	if err := <-finished; err == nil {
		t.Fatal("uninstalled without stop ack")
	}
	if len(e.schemas.dropped) != 0 {
		t.Fatal("purged live plugin")
	}
	if _, err := e.svc.Upload(ctx, data, e.admin, UploadOptions{}); err == nil || core.AsError(err).Code != "conflict" {
		t.Fatalf("upload bypassed uninstall barrier: %v", err)
	}
	state, err := e.svc.UninstallState(ctx, "guard")
	if err != nil {
		t.Fatal(err)
	}
	if len(state.PendingBootIDs) != 1 || state.PendingBootIDs[0] != "lost-boot" {
		t.Fatal("uninstall targets missing", state)
	}
	for _, bad := range []struct {
		in   ConfirmStoppedRequest
		code string
	}{
		{ConfirmStoppedRequest{Epoch: state.Epoch, BootIDs: []string{"lost-boot"}}, "invalid_argument"},
		{ConfirmStoppedRequest{Epoch: state.Epoch + 1, BootIDs: []string{"lost-boot"}, Reason: "stopped"}, "conflict"},
		{ConfirmStoppedRequest{Epoch: state.Epoch, BootIDs: []string{"unknown-boot"}, Reason: "stopped"}, "invalid_argument"},
	} {
		if _, err := e.svc.ConfirmUninstallStopped(ctx, "guard", bad.in, e.admin); err == nil || core.AsError(err).Code != bad.code {
			t.Fatal("invalid confirmation admitted", bad, err)
		}
	}
	in := ConfirmStoppedRequest{Epoch: state.Epoch, BootIDs: []string{"lost-boot"}, Reason: "operator physically stopped the lost process"}
	e.svc.d.Nodes = stoppedTestNodes{live: []core.NodeStatus{{BootID: "lost-boot"}}}
	if _, err := e.svc.ConfirmUninstallStopped(ctx, "guard", in, e.admin); err == nil || core.AsError(err).Code != "conflict" {
		t.Fatal("live boot confirmation accepted", err)
	}
	e.svc.d.Nodes = stoppedTestNodes{err: errors.New("registry unavailable")}
	if _, err := e.svc.ConfirmUninstallStopped(ctx, "guard", in, e.admin); err == nil || core.AsError(err).Code != "unavailable" {
		t.Fatal("registry failure allowed confirmation", err)
	}
	e.svc.d.Nodes = emptyNodes{}
	confirmed, err := e.svc.ConfirmUninstallStopped(ctx, "guard", ConfirmStoppedRequest{Epoch: state.Epoch, BootIDs: []string{"lost-boot"}, Reason: "operator physically stopped the lost process"}, e.admin)
	if err != nil || len(confirmed.PendingBootIDs) != 0 {
		t.Fatal(confirmed, err)
	}
	if len(e.schemas.dropped) != 0 {
		t.Fatal("confirmation unexpectedly purged plugin")
	}
	var audited int
	if err = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action='plugin.uninstall.confirm_stopped'
		AND user_id=$1 AND detail->>'reason'=$2 AND detail->>'administrator_confirmed_physical_stop'='true'`, e.admin, in.Reason).Scan(&audited); err != nil || audited != 1 {
		t.Fatal("missing or duplicate confirmation audit", audited, err)
	}
	if _, err := e.svc.Uninstall(ctx, "guard", UninstallOptions{Purge: true}, e.admin); err != nil {
		t.Fatal(err)
	}
	if len(e.schemas.dropped) != 1 {
		t.Fatal("acknowledged plugin not purged")
	}
}

func TestBuiltinReadinessRequiresLocalGeneration(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	want := map[string]BuiltinRequirement{"guard": {Version: semver.MustParse("0.1.0")}}
	if ready, _ := e.svc.BuiltinsReady(ctx, want, nil); ready {
		t.Fatal("missing builtin reported ready")
	}
	data := pkgtest.Build(pkgtest.Guard("guard", "0.1.0", "sub2api"), e.root)
	if _, err := e.svc.Upload(ctx, data, e.admin, UploadOptions{}); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Pool.Exec(ctx, `UPDATE plugins SET builtin=true,status='enabled',active_version='0.1.0' WHERE key='guard'; UPDATE plugin_versions SET consent_status='approved' WHERE plugin_key='guard'`); err != nil {
		t.Fatal(err)
	}
	if ready, err := e.svc.BuiltinsReady(ctx, want, nil); ready || err != nil {
		t.Fatal(ready, err)
	}
	if _, err := e.db.Pool.Exec(ctx, `UPDATE plugins SET status='disabled' WHERE key='guard'`); err != nil {
		t.Fatal(err)
	}
	if ready, err := e.svc.BuiltinsReady(ctx, want, nil); !ready || err != nil {
		t.Fatal(ready, err)
	}
}

package grpcruntime

import (
	"context"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
)

type notifierRPC struct {
	pluginv1.NotificationServiceClient
	calls int
	code  codes.Code
}

func (n *notifierRPC) DeliverNotification(context.Context, *pluginv1.DeliverNotificationRequest, ...grpc.CallOption) (*pluginv1.DeliverNotificationResponse, error) {
	n.calls++
	if n.code != codes.OK {
		return nil, status.Error(n.code, "test")
	}
	return &pluginv1.DeliverNotificationResponse{}, nil
}

// notRunning reports whether err carries the marker notify looks for.
func notRunning(err error) bool {
	m, ok := err.(interface{ PluginNotRunning() bool })
	return ok && m.PluginNotRunning()
}

// Only the refusals of an instance that cannot take the call are marked as
// "not running" (not a delivery attempt, CONTRACTS §74.4); an Unavailable
// answer from the process is an ordinary failure.
func TestNotificationAdapterMarksNotRunning(t *testing.T) {
	i := &Instance{pkg: &registry.Package{Key: "mailer", Version: "1"}, caps: map[string]bool{manifest.CapNotifyChannel: true},
		sems: newSemaphores(Concurrency{Background: 1})}
	rpc := &notifierRPC{}
	i.proc.Store(&proc{notifier: rpc})
	n := i.Notifier()
	in := &pluginv1.DeliverNotificationRequest{Id: 1, Channel: "email"}
	if _, err := n.DeliverNotification(context.Background(), in); err != nil || rpc.calls != 1 {
		t.Fatalf("delivered: %v %d", err, rpc.calls)
	}
	// The process answered Unavailable (or crashed mid-call): it may have
	// sent, so it is not marked.
	rpc.code = codes.Unavailable
	if _, err := n.DeliverNotification(context.Background(), in); err == nil || notRunning(err) || core.AsError(err).Code != core.ErrPluginUnavailable.Code {
		t.Fatalf("process answered Unavailable: %v", err)
	}
	// Waiting to restart: no process.
	i.proc.Store(nil)
	_, err := n.DeliverNotification(context.Background(), in)
	if !notRunning(err) || core.AsError(err).Code != core.ErrPluginUnavailable.Code {
		t.Fatalf("no process: %v", err)
	}
	// Draining for an upgrade or a stop.
	i.proc.Store(&proc{notifier: rpc})
	i.draining.Store(true)
	calls := rpc.calls
	if _, err := n.DeliverNotification(context.Background(), in); !notRunning(err) || rpc.calls != calls {
		t.Fatalf("draining: %v %d", err, rpc.calls)
	}
}

package grpcruntime

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

type onlineScopes struct {
	mu      sync.Mutex
	byToken map[string]*onlineScope
}
type onlineScope struct {
	mu                                sync.Mutex
	ctx                               context.Context
	cancel                            context.CancelFunc
	timer                             *time.Timer
	callbacks                         core.ExecutionCallbacks
	closed, busy, forwarded, finished bool
	done                              chan struct{}
}

func (s *onlineScopes) open(ctx context.Context, cancel context.CancelFunc, timer *time.Timer, callbacks core.ExecutionCallbacks) (string, *onlineScope, error) {
	var raw [32]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", nil, err
	}
	token := hex.EncodeToString(raw[:])
	sc := &onlineScope{ctx: ctx, cancel: cancel, timer: timer, callbacks: callbacks}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.byToken == nil {
		s.byToken = map[string]*onlineScope{}
	}
	s.byToken[token] = sc
	return token, sc, nil
}
func (s *onlineScopes) close(token string, sc *onlineScope) {
	s.mu.Lock()
	delete(s.byToken, token)
	s.mu.Unlock()
	sc.mu.Lock()
	sc.closed = true
	sc.timer.Stop()
	done := sc.done
	sc.mu.Unlock()
	sc.cancel()
	if done != nil {
		<-done
	}
}

func (h *hostServer) online(token string, forward bool) (*onlineScope, error) {
	if h.p == nil || len(token) != 64 {
		return nil, status.Error(codes.PermissionDenied, "invalid execution token")
	}
	h.p.executions.mu.Lock()
	sc := h.p.executions.byToken[token]
	h.p.executions.mu.Unlock()
	if sc == nil {
		return nil, status.Error(codes.PermissionDenied, "unknown execution token")
	}
	sc.mu.Lock()
	defer sc.mu.Unlock()
	if sc.closed || sc.ctx.Err() != nil {
		return nil, status.Error(codes.PermissionDenied, "expired execution token")
	}
	if sc.busy {
		return nil, status.Error(codes.FailedPrecondition, "another execution callback is active")
	}
	if forward {
		if sc.forwarded {
			return nil, status.Error(codes.FailedPrecondition, "upstream already forwarded")
		}
		sc.forwarded = true
		sc.timer.Stop()
	} else if !sc.finished {
		return nil, status.Error(codes.FailedPrecondition, "upstream observation is not complete")
	}
	sc.busy = true
	sc.done = make(chan struct{})
	return sc, nil
}
func (sc *onlineScope) finish(forward bool) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	sc.busy = false
	if forward {
		sc.finished = true
		if !sc.closed {
			sc.timer.Reset(sc.callbacks.FinishTimeout)
		}
	}
	close(sc.done)
}

func (h *hostServer) ForwardUpstream(ctx context.Context, in *pluginv1.ForwardUpstreamRequest) (out *pluginv1.ForwardUpstreamResponse, err error) {
	sc, err := h.online(in.GetExecutionToken(), true)
	if err != nil {
		return nil, err
	}
	defer func() {
		if recover() != nil {
			out = nil
			err = status.Error(codes.Internal, "execution callback failed internally")
		}
		sc.finish(true)
	}()
	cctx, cancel := context.WithCancel(sc.ctx)
	defer cancel()
	stop := context.AfterFunc(ctx, cancel)
	if ctx.Err() != nil {
		cancel()
	}
	defer stop()
	if sc.callbacks.Forward == nil {
		return nil, status.Error(codes.Unimplemented, "no forward capability")
	}
	return sc.callbacks.Forward(cctx, in)
}
func (h *hostServer) RecordUsage(ctx context.Context, in *pluginv1.RecordUsageRequest) (out *pluginv1.ExecutionReceipt, err error) {
	sc, err := h.online(in.GetExecutionToken(), false)
	if err != nil {
		return nil, err
	}
	defer func() {
		if recover() != nil {
			out = nil
			err = status.Error(codes.Internal, "execution callback failed internally")
		}
		sc.finish(false)
	}()
	if sc.callbacks.Record == nil {
		return nil, status.Error(codes.PermissionDenied, "usage recording not allowed")
	}
	cctx, cancel := context.WithCancel(sc.ctx)
	defer cancel()
	stop := context.AfterFunc(ctx, cancel)
	if ctx.Err() != nil {
		cancel()
	}
	defer stop()
	return sc.callbacks.Record(cctx, in)
}
func (h *hostServer) ReserveAndWatch(ctx context.Context, in *pluginv1.ReserveAndWatchRequest) (out *pluginv1.ExecutionReceipt, err error) {
	sc, err := h.online(in.GetExecutionToken(), false)
	if err != nil {
		return nil, err
	}
	defer func() {
		if recover() != nil {
			out = nil
			err = status.Error(codes.Internal, "execution callback failed internally")
		}
		sc.finish(false)
	}()
	if sc.callbacks.Watch == nil {
		return nil, status.Error(codes.PermissionDenied, "task recording not allowed")
	}
	cctx, cancel := context.WithCancel(sc.ctx)
	defer cancel()
	stop := context.AfterFunc(ctx, cancel)
	if ctx.Err() != nil {
		cancel()
	}
	defer stop()
	return sc.callbacks.Watch(cctx, in)
}
func (a platformAdapter) Execute(ctx context.Context, in *pluginv1.ExecuteRequest, callbacks core.ExecutionCallbacks) (out *pluginv1.ExecuteResponse, err error) {
	if !a.i.has(manifest.CapPlatformExecute) || in == nil {
		return nil, errors.New("Execute requires platform.execute.v1")
	}
	if callbacks.PrepareTimeout <= 0 {
		callbacks.PrepareTimeout = 2 * time.Second
	}
	if callbacks.FinishTimeout <= 0 {
		callbacks.FinishTimeout = 15 * time.Second
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	timer := time.AfterFunc(callbacks.PrepareTimeout, cancel)
	defer timer.Stop()
	err = a.i.call(ctx, 0, func(ctx context.Context, p *proc) error {
		token, sc, err := p.executions.open(ctx, cancel, timer, callbacks)
		if err != nil {
			return err
		}
		defer p.executions.close(token, sc)
		req := proto.Clone(in).(*pluginv1.ExecuteRequest)
		req.ExecutionToken = token
		out, err = p.platform.Execute(ctx, req)
		return err
	})
	return
}

var _ core.ExecutePlugin = platformAdapter{}

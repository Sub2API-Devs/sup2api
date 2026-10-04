package grpcruntime

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

type executionScopes struct {
	mu      sync.Mutex
	byToken map[string]*executionScope
}

type executionScope struct {
	reportSealed                 bool
	mu                           sync.Mutex
	ctx                          context.Context
	cancel                       context.CancelFunc
	execute                      core.ExecutionHTTP
	closed, used, complete, safe bool
	done                         chan struct{}
	report                       func(context.Context, *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error)
	reportDone                   chan struct{}
	reportBusy, reported         bool
}

func (s *executionScopes) open(ctx context.Context, execute core.ExecutionHTTP) (string, *executionScope, error) {
	if execute == nil {
		return "", nil, errors.New("Poll has no execution HTTP capability")
	}
	var raw [32]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", nil, err
	}
	token := hex.EncodeToString(raw[:])
	ctx, cancel := context.WithCancel(ctx)
	scope := &executionScope{ctx: ctx, cancel: cancel, execute: execute}
	s.mu.Lock()
	if s.byToken == nil {
		s.byToken = map[string]*executionScope{}
	}
	s.byToken[token] = scope
	s.mu.Unlock()
	return token, scope, nil
}

func (s *executionScopes) close(token string, scope *executionScope) bool {
	s.mu.Lock()
	delete(s.byToken, token)
	s.mu.Unlock()
	scope.mu.Lock()
	scope.closed = true
	// Finishing the HTTP after Poll already returned cannot authorize a
	// terminal result: that result was produced before its network evidence.
	safe := scope.used && scope.complete && scope.safe && scope.ctx.Err() == nil
	done := scope.done
	reportDone := scope.reportDone
	scope.mu.Unlock()
	scope.cancel()
	if done != nil {
		<-done
	}
	if reportDone != nil {
		<-reportDone
	}
	return safe
}

func (h *hostServer) ExecuteHTTP(ctx context.Context, in *pluginv1.ExecutionHTTPRequest) (out *pluginv1.ExecutionHTTPResponse, err error) {
	if h.p == nil || in == nil || len(in.GetExecutionToken()) != 64 {
		return nil, status.Error(codes.PermissionDenied, "invalid execution token")
	}
	h.p.polls.mu.Lock()
	scope := h.p.polls.byToken[in.GetExecutionToken()]
	h.p.polls.mu.Unlock()
	if scope == nil {
		return nil, status.Error(codes.PermissionDenied, "unknown or expired execution token")
	}
	scope.mu.Lock()
	if scope.closed || scope.used || scope.reportSealed || scope.ctx.Err() != nil {
		scope.mu.Unlock()
		return nil, status.Error(codes.PermissionDenied, "execution token expired or already used")
	}
	scope.used = true
	scope.done = make(chan struct{})
	scope.mu.Unlock()
	callCtx, cancel := context.WithCancel(scope.ctx)
	stop := context.AfterFunc(ctx, cancel)
	if ctx.Err() != nil {
		cancel()
	}
	defer func() {
		if recover() != nil {
			out = nil
			err = status.Error(codes.Internal, "execution HTTP failed internally")
		}
		scope.mu.Lock()
		scope.complete = true
		scope.safe = err == nil && callCtx.Err() == nil && out != nil && out.GetStatus() >= 200 && out.GetStatus() <= 599 && out.GetTransportError() == "" && !out.GetTruncated()
		close(scope.done)
		scope.mu.Unlock()
		stop()
		cancel()
	}()
	return scope.execute(callCtx, in)
}

func (a platformAdapter) Poll(ctx context.Context, in *pluginv1.PollRequest, execute core.ExecutionHTTP) (out *pluginv1.ReconcileResult, err error) {
	if !a.i.has(manifest.CapPlatformPoll) || in == nil {
		return nil, errors.New("Poll requires platform.poll.v1 and an input")
	}
	err = a.i.call(ctx, classBackground, TimeoutPoll, func(ctx context.Context, p *proc) (callErr error) {
		token, scope, err := p.polls.open(ctx, execute)
		if err != nil {
			return err
		}
		defer func() {
			safe := p.polls.close(token, scope)
			if callErr == nil && out != nil && out.GetState() != pluginv1.ReconcileResult_PENDING && out.GetState() != pluginv1.ReconcileResult_POLL_FAILED && !safe {
				callErr = errors.New("Poll terminal result has no complete, successful execution HTTP response")
			}
		}()
		req := proto.Clone(in).(*pluginv1.PollRequest)
		req.ExecutionToken = token
		out, err = p.platform.Poll(ctx, req)
		if err == nil && out == nil {
			return errors.New("Poll returned no result")
		}
		return err
	})
	return
}

var _ core.PollPlugin = platformAdapter{}

package pluginsdk

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

type executionContextKey struct{}

type executionContext struct {
	client pluginv1.HostServiceClient
	token  string
	kind   string
}

// ExecuteHTTP initiates the single HTTP observation allowed in an active Poll or Monitor
// invocation. The SDK supplies the invocation token; the caller supplies only
// the HTTP request. The host applies the original account's proxy and limits,
// bounds request/response sizes, and refuses redirects. Network failure and
// truncated responses are observations, not confirmed task outcomes.
//
// Use the context passed to Poll/Monitor (or a child of it). No net permission or
// account enumeration is needed. Calling outside the invocation, after it returns, or
// more than once in one invocation fails. This is separate from the generic
// Egress tunnel, whose traffic does not inherit these account constraints.
func ExecuteHTTP(ctx context.Context, in *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
	if err := ctx.Err(); err != nil {
		return nil, status.FromContextError(err).Err()
	}
	ex, ok := ctx.Value(executionContextKey{}).(executionContext)
	if !ok || ex.client == nil || ex.token == "" {
		return nil, status.Error(codes.FailedPrecondition, "ExecuteHTTP requires an active Poll context")
	}
	if in == nil {
		return nil, status.Error(codes.InvalidArgument, "HTTP request is required")
	}
	if ex.kind != "Poll" && ex.kind != "Monitor" {
		return nil, status.Error(codes.FailedPrecondition, "ExecuteHTTP requires an active Poll or Monitor context")
	}
	// Never mutate the plugin's request or accept an externally supplied token.
	req := proto.Clone(in).(*pluginv1.ExecutionHTTPRequest)
	req.ExecutionToken = ex.token
	return ex.client.ExecuteHTTP(ctx, req)
}

func (s platformServer) Poll(ctx context.Context, in *pluginv1.PollRequest) (*pluginv1.ReconcileResult, error) {
	p, ok := s.impl.(Poller)
	if !ok {
		return nil, status.Error(codes.Unimplemented, "this platform does not implement Poll")
	}
	if in.GetExecutionToken() == "" {
		return nil, status.Error(codes.InvalidArgument, "Poll execution token is required")
	}
	if s.runtime == nil {
		return nil, status.Error(codes.FailedPrecondition, "host is not initialised")
	}
	s.runtime.mu.Lock()
	h := s.runtime.host
	s.runtime.mu.Unlock()
	if h == nil {
		return nil, status.Error(codes.FailedPrecondition, "host is not initialised")
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	ctx = context.WithValue(ctx, executionContextKey{}, executionContext{client: h.Client(), token: in.GetExecutionToken(), kind: "Poll"})
	return p.Poll(ctx, in)
}

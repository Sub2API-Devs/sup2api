package grpcruntime

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
)

// Default call timeouts. The caller's context deadline applies when shorter.
const (
	TimeoutPlatformHot     = 2 * time.Second  // BuildUpstreamRequest, ClassifyError
	TimeoutPlatformConsole = 10 * time.Second // ValidateCredentials, BuildTestRequest
	TimeoutHookDefault     = 300 * time.Millisecond
	TimeoutHookMax         = 30 * time.Second // CONTRACTS §20.1
	TimeoutHTTP            = 30 * time.Second
	TimeoutEvents          = 30 * time.Second
	TimeoutJobDefault      = 60 * time.Second
	TimeoutScheduler       = 200 * time.Millisecond
	TimeoutRankDefault     = 200 * time.Millisecond // manifest scheduler.rank.timeoutMs = 0
	TimeoutRankMax         = time.Second            // pkg.MaxRankTimeout
	TimeoutPoll            = 30 * time.Second
	TimeoutMigrateData     = 10 * time.Minute
)

// callClass selects the semaphore a call waits for (Options.Concurrency).
type callClass int

const (
	classHot callClass = iota
	classConsole
	classBackground
	classExecute
	numClasses
)

func newSemaphores(c Concurrency) [numClasses]chan struct{} {
	return [numClasses]chan struct{}{
		classHot:        make(chan struct{}, c.Hot),
		classConsole:    make(chan struct{}, c.Console),
		classBackground: make(chan struct{}, c.Background),
		classExecute:    make(chan struct{}, c.Execute),
	}
}

// call runs fn against the current process with the concurrency limit of its
// class, the timeout and in-flight accounting. It fails fast with
// core.ErrPluginUnavailable when the instance cannot serve calls.
func (i *Instance) call(ctx context.Context, class callClass, timeout time.Duration, fn func(ctx context.Context, p *proc) error) error {
	if i.draining.Load() {
		return i.unavailable("draining")
	}
	i.inflight.Add(1)
	defer i.finish()
	if i.draining.Load() {
		return i.unavailable("draining")
	}
	p := i.proc.Load()
	if p == nil {
		s, _ := i.State()
		return i.unavailable(s)
	}
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}
	sem := i.sems[class]
	select {
	case sem <- struct{}{}:
	case <-ctx.Done():
		return fmt.Errorf("plugin %s: waiting for a free call slot: %w", i.pkg.Key, ctx.Err())
	}
	defer func() { <-sem }()
	return i.mapErr(fn(ctx, p))
}

// invoke is call for one unary RPC of a service client of the process.
func invoke[C, Req, Resp any](i *Instance, ctx context.Context, class callClass, timeout time.Duration,
	client func(*proc) C, rpc func(C, context.Context, Req, ...grpc.CallOption) (Resp, error), in Req) (out Resp, err error) {
	err = i.call(ctx, class, timeout, func(ctx context.Context, p *proc) (e error) {
		out, e = rpc(client(p), ctx, in)
		return
	})
	return
}

func platformOf(p *proc) pluginv1.PlatformServiceClient { return p.platform }
func hookOf(p *proc) pluginv1.HookServiceClient         { return p.hook }
func appOf(p *proc) pluginv1.AppServiceClient           { return p.app }
func httpOf(p *proc) pluginv1.HTTPServiceClient         { return p.http }
func schedOf(p *proc) pluginv1.SchedulerServiceClient   { return p.sched }

func (i *Instance) finish() {
	if i.inflight.Add(-1) == 0 && i.draining.Load() {
		i.idleOnce.Do(func() { close(i.idle) })
	}
}

func (i *Instance) unavailable(reason string) error {
	return core.ErrPluginUnavailable.WithDetails(map[string]any{"plugin_key": i.pkg.Key}).
		WithCause(fmt.Errorf("plugin %s@%s: %s", i.pkg.Key, i.pkg.Version, reason))
}

// mapErr converts gRPC status errors into core errors. Deadline and
// cancellation keep wrapping the context errors so callers can use errors.Is.
func (i *Instance) mapErr(err error) error {
	if err == nil {
		return nil
	}
	st, ok := status.FromError(err)
	if !ok {
		return err
	}
	msg := st.Message()
	switch st.Code() {
	case codes.DeadlineExceeded:
		return fmt.Errorf("plugin %s: %w", i.pkg.Key, context.DeadlineExceeded)
	case codes.Canceled:
		return fmt.Errorf("plugin %s: %w", i.pkg.Key, context.Canceled)
	case codes.Unavailable:
		return core.ErrPluginUnavailable.WithDetails(map[string]any{"plugin_key": i.pkg.Key}).WithCause(err)
	case codes.Unimplemented:
		return core.ErrPluginUnavailable.WithDetails(map[string]any{"plugin_key": i.pkg.Key}).
			WithMessage("plugin does not implement this call").WithCause(err)
	case codes.InvalidArgument, codes.OutOfRange:
		return core.ErrInvalidArgument.WithMessage(msg).WithCause(err)
	case codes.NotFound:
		return core.ErrNotFound.WithMessage(msg).WithCause(err)
	case codes.AlreadyExists, codes.Aborted:
		return core.ErrConflict.WithMessage(msg).WithCause(err)
	case codes.PermissionDenied:
		return core.ErrPermissionDenied.WithMessage(msg).WithCause(err)
	case codes.Unauthenticated:
		return core.ErrUnauthenticated.WithMessage(msg).WithCause(err)
	case codes.ResourceExhausted:
		return core.ErrRateLimited.WithMessage(msg).WithCause(err)
	}
	return core.ErrInternal.WithCause(fmt.Errorf("plugin %s: %s: %s", i.pkg.Key, st.Code(), msg))
}

// ------------------------------------------------------------------ capability accessors (registry.Extension)

func (i *Instance) has(c string) bool { return i.caps[c] }

func (i *Instance) Platform() core.PlatformPlugin {
	if !i.has(manifest.CapPlatformAdapter) {
		return nil
	}
	return platformAdapter{i}
}

func (i *Instance) Hook() core.HookPlugin {
	if !i.has(manifest.CapGatewayHook) {
		return nil
	}
	return hookAdapter{i}
}

func (i *Instance) App() core.AppPlugin {
	if !i.has(manifest.CapAppJobs) && !i.has(manifest.CapAppEvents) {
		return nil
	}
	return appAdapter{i}
}

func (i *Instance) HTTP() core.HTTPPlugin {
	if !i.has(manifest.CapHTTPRoutes) {
		return nil
	}
	return httpAdapter{i}
}

func (i *Instance) Scheduler() core.SchedulerPlugin {
	if !i.has(manifest.CapSchedulerRank) {
		return nil
	}
	return schedAdapter{i}
}

var _ registry.Extension = (*Instance)(nil)

type platformAdapter struct{ i *Instance }

func (a platformAdapter) ValidateCredentials(ctx context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return invoke(a.i, ctx, classConsole, TimeoutPlatformConsole, platformOf, pluginv1.PlatformServiceClient.ValidateCredentials, in)
}

func (a platformAdapter) BuildUpstreamRequest(ctx context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	return invoke(a.i, ctx, classHot, TimeoutPlatformHot, platformOf, pluginv1.PlatformServiceClient.BuildUpstreamRequest, in)
}

func (a platformAdapter) ClassifyError(ctx context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	return invoke(a.i, ctx, classHot, TimeoutPlatformHot, platformOf, pluginv1.PlatformServiceClient.ClassifyError, in)
}

func (a platformAdapter) BuildTestRequest(ctx context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	return invoke(a.i, ctx, classConsole, TimeoutPlatformConsole, platformOf, pluginv1.PlatformServiceClient.BuildTestRequest, in)
}

func (a platformAdapter) BuildModelsRequest(ctx context.Context, in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	return invoke(a.i, ctx, classConsole, TimeoutPlatformConsole, platformOf, pluginv1.PlatformServiceClient.BuildModelsRequest, in)
}

// ResolveModel runs on the gateway hot path (before scheduling), so it uses
// the hot-path timeout like BuildUpstreamRequest; the gateway applies its own,
// shorter deadline on top.
func (a platformAdapter) ResolveModel(ctx context.Context, in *pluginv1.ResolveModelRequest) (*pluginv1.ResolveModelResponse, error) {
	return invoke(a.i, ctx, classHot, TimeoutPlatformHot, platformOf, pluginv1.PlatformServiceClient.ResolveModel, in)
}

// ExtractUsage runs after the response reached the client, so it is off the
// latency path; it still uses the hot-path timeout because it holds a usage
// record open, and the gateway applies its own, shorter deadline on top.
func (a platformAdapter) ExtractUsage(ctx context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
	return invoke(a.i, ctx, classHot, TimeoutPlatformHot, platformOf, pluginv1.PlatformServiceClient.ExtractUsage, in)
}

func (a platformAdapter) ParseTaskSubmission(ctx context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.TaskSubmission, error) {
	return invoke(a.i, ctx, classHot, TimeoutPlatformHot, platformOf, pluginv1.PlatformServiceClient.ParseTaskSubmission, in)
}

// EstimateUsage runs before the pre-charge of every priced request.
func (a platformAdapter) EstimateUsage(ctx context.Context, in *pluginv1.EstimateUsageRequest) (*pluginv1.UsageReport, error) {
	return invoke(a.i, ctx, classHot, TimeoutPlatformHot, platformOf, pluginv1.PlatformServiceClient.EstimateUsage, in)
}

// BuildReconcileRequest and ParseReconcileResponse run in the core's offline
// reconcile loop, not in a request, so they get the console budget rather
// than the hot-path one: nobody is waiting, and being stingy here only
// burns an attempt of an entry's limited allowance.
func (a platformAdapter) BuildReconcileRequest(ctx context.Context, in *pluginv1.BuildReconcileRequestRequest) (*pluginv1.BuildReconcileRequestResponse, error) {
	return invoke(a.i, ctx, classBackground, TimeoutPlatformConsole, platformOf, pluginv1.PlatformServiceClient.BuildReconcileRequest, in)
}

func (a platformAdapter) ParseReconcileResponse(ctx context.Context, in *pluginv1.ParseReconcileResponseRequest) (*pluginv1.ReconcileResult, error) {
	return invoke(a.i, ctx, classBackground, TimeoutPlatformConsole, platformOf, pluginv1.PlatformServiceClient.ParseReconcileResponse, in)
}

// BuildQuotaRequest and ParseQuotaResponse run in the account module when
// the console asks for a stale quota snapshot (CONTRACTS §44): somebody is
// waiting, but not a gateway client, so they get the console budget.
func (a platformAdapter) BuildQuotaRequest(ctx context.Context, in *pluginv1.BuildQuotaRequestRequest) (*pluginv1.BuildQuotaRequestResponse, error) {
	return invoke(a.i, ctx, classConsole, TimeoutPlatformConsole, platformOf, pluginv1.PlatformServiceClient.BuildQuotaRequest, in)
}

func (a platformAdapter) ParseQuotaResponse(ctx context.Context, in *pluginv1.ParseQuotaResponseRequest) (*pluginv1.QuotaResult, error) {
	return invoke(a.i, ctx, classConsole, TimeoutPlatformConsole, platformOf, pluginv1.PlatformServiceClient.ParseQuotaResponse, in)
}

// BuildRefreshRequest and ParseRefreshResponse run in the account module's
// refresh sweep or on an administrator's request (CONTRACTS §48), never on
// the request path.
func (a platformAdapter) BuildRefreshRequest(ctx context.Context, in *pluginv1.BuildRefreshRequestRequest) (*pluginv1.BuildRefreshRequestResponse, error) {
	return invoke(a.i, ctx, classBackground, TimeoutPlatformConsole, platformOf, pluginv1.PlatformServiceClient.BuildRefreshRequest, in)
}

func (a platformAdapter) ParseRefreshResponse(ctx context.Context, in *pluginv1.ParseRefreshResponseRequest) (*pluginv1.RefreshResult, error) {
	return invoke(a.i, ctx, classBackground, TimeoutPlatformConsole, platformOf, pluginv1.PlatformServiceClient.ParseRefreshResponse, in)
}

type hookAdapter struct{ i *Instance }

func (a hookAdapter) OnGatewayRequest(ctx context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
	timeout := TimeoutHookDefault
	if h, ok := registry.HookByID(a.i.pkg.Manifest, in.GetHookId()); ok && h.TimeoutMs > 0 {
		timeout = time.Duration(h.TimeoutMs) * time.Millisecond
	}
	return invoke(a.i, ctx, classHot, min(timeout, TimeoutHookMax), hookOf, pluginv1.HookServiceClient.OnGatewayRequest, in)
}

type appAdapter struct{ i *Instance }

func (a appAdapter) RunJob(ctx context.Context, in *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	timeout := TimeoutJobDefault
	for _, j := range a.i.pkg.Manifest.Jobs {
		if j.ID == in.GetJobId() && j.TimeoutSec > 0 {
			timeout = time.Duration(j.TimeoutSec) * time.Second
		}
	}
	return invoke(a.i, ctx, classBackground, timeout, appOf, pluginv1.AppServiceClient.RunJob, in)
}

func (a appAdapter) OnEvents(ctx context.Context, in *pluginv1.OnEventsRequest) (*pluginv1.OnEventsResponse, error) {
	return invoke(a.i, ctx, classBackground, TimeoutEvents, appOf, pluginv1.AppServiceClient.OnEvents, in)
}

type httpAdapter struct{ i *Instance }

func (a httpAdapter) HandleHTTP(ctx context.Context, in *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	return invoke(a.i, ctx, classConsole, TimeoutHTTP, httpOf, pluginv1.HTTPServiceClient.HandleHTTP, in)
}

type schedAdapter struct{ i *Instance }

func (a schedAdapter) RankAccounts(ctx context.Context, in *pluginv1.RankAccountsRequest) (*pluginv1.RankAccountsResponse, error) {
	timeout := TimeoutRankDefault
	if s := a.i.pkg.Manifest.Scheduler; s != nil && s.Rank != nil && s.Rank.TimeoutMs > 0 {
		timeout = time.Duration(s.Rank.TimeoutMs) * time.Millisecond
	}
	return invoke(a.i, ctx, classHot, min(timeout, TimeoutRankMax), schedOf, pluginv1.SchedulerServiceClient.RankAccounts, in)
}

// ------------------------------------------------------------------ helpers

func goos() string   { return runtime.GOOS }
func goarch() string { return runtime.GOARCH }

func fileSum(name string) (string, error) {
	f, err := os.Open(name)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func samePath(a, b string) bool {
	if a == "" || b == "" {
		return false
	}
	aa, err1 := filepath.Abs(a)
	bb, err2 := filepath.Abs(b)
	if err1 != nil || err2 != nil {
		return false
	}
	if runtime.GOOS == "windows" {
		return strings.EqualFold(filepath.Clean(aa), filepath.Clean(bb))
	}
	return filepath.Clean(aa) == filepath.Clean(bb)
}

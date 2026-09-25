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
	TimeoutHookMax         = 2 * time.Second
	TimeoutHTTP            = 30 * time.Second
	TimeoutEvents          = 30 * time.Second
	TimeoutJobDefault      = 60 * time.Second
	TimeoutScheduler       = 200 * time.Millisecond
)

// call runs fn against the current process with the concurrency limit, the
// timeout and in-flight accounting. It fails fast with
// core.ErrPluginUnavailable when the instance cannot serve calls.
func (i *Instance) call(ctx context.Context, timeout time.Duration, fn func(ctx context.Context, p *proc) error) error {
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
	select {
	case i.sem <- struct{}{}:
	case <-ctx.Done():
		return fmt.Errorf("plugin %s: waiting for a free call slot: %w", i.pkg.Key, ctx.Err())
	}
	defer func() { <-i.sem }()
	return i.mapErr(fn(ctx, p))
}

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
	if !i.has(manifest.CapSchedulerAffinity) {
		return nil
	}
	return schedAdapter{i}
}

var _ registry.Extension = (*Instance)(nil)

type platformAdapter struct{ i *Instance }

func (a platformAdapter) ValidateCredentials(ctx context.Context, in *pluginv1.ValidateCredentialsRequest) (out *pluginv1.ValidateCredentialsResponse, err error) {
	err = a.i.call(ctx, TimeoutPlatformConsole, func(ctx context.Context, p *proc) (e error) {
		out, e = p.platform.ValidateCredentials(ctx, in)
		return
	})
	return
}

func (a platformAdapter) BuildUpstreamRequest(ctx context.Context, in *pluginv1.BuildUpstreamRequestRequest) (out *pluginv1.BuildUpstreamRequestResponse, err error) {
	err = a.i.call(ctx, TimeoutPlatformHot, func(ctx context.Context, p *proc) (e error) {
		out, e = p.platform.BuildUpstreamRequest(ctx, in)
		return
	})
	return
}

func (a platformAdapter) ClassifyError(ctx context.Context, in *pluginv1.ClassifyErrorRequest) (out *pluginv1.ClassifyErrorResponse, err error) {
	err = a.i.call(ctx, TimeoutPlatformHot, func(ctx context.Context, p *proc) (e error) {
		out, e = p.platform.ClassifyError(ctx, in)
		return
	})
	return
}

func (a platformAdapter) BuildTestRequest(ctx context.Context, in *pluginv1.BuildTestRequestRequest) (out *pluginv1.BuildTestRequestResponse, err error) {
	err = a.i.call(ctx, TimeoutPlatformConsole, func(ctx context.Context, p *proc) (e error) {
		out, e = p.platform.BuildTestRequest(ctx, in)
		return
	})
	return
}

func (a platformAdapter) BuildModelsRequest(ctx context.Context, in *pluginv1.BuildModelsRequestRequest) (out *pluginv1.BuildModelsRequestResponse, err error) {
	err = a.i.call(ctx, TimeoutPlatformConsole, func(ctx context.Context, p *proc) (e error) {
		out, e = p.platform.BuildModelsRequest(ctx, in)
		return
	})
	return
}

type hookAdapter struct{ i *Instance }

func (a hookAdapter) OnGatewayRequest(ctx context.Context, in *pluginv1.GatewayRequestHookRequest) (out *pluginv1.GatewayRequestHookResponse, err error) {
	timeout := TimeoutHookDefault
	if h, ok := registry.HookByID(a.i.pkg.Manifest, in.GetHookId()); ok && h.TimeoutMs > 0 {
		timeout = time.Duration(h.TimeoutMs) * time.Millisecond
	}
	if timeout > TimeoutHookMax {
		timeout = TimeoutHookMax
	}
	err = a.i.call(ctx, timeout, func(ctx context.Context, p *proc) (e error) {
		out, e = p.hook.OnGatewayRequest(ctx, in)
		return
	})
	return
}

type appAdapter struct{ i *Instance }

func (a appAdapter) RunJob(ctx context.Context, in *pluginv1.RunJobRequest) (out *pluginv1.RunJobResponse, err error) {
	timeout := TimeoutJobDefault
	for _, j := range a.i.pkg.Manifest.Jobs {
		if j.ID == in.GetJobId() && j.TimeoutSec > 0 {
			timeout = time.Duration(j.TimeoutSec) * time.Second
		}
	}
	err = a.i.call(ctx, timeout, func(ctx context.Context, p *proc) (e error) {
		out, e = p.app.RunJob(ctx, in)
		return
	})
	return
}

func (a appAdapter) OnEvents(ctx context.Context, in *pluginv1.OnEventsRequest) (out *pluginv1.OnEventsResponse, err error) {
	err = a.i.call(ctx, TimeoutEvents, func(ctx context.Context, p *proc) (e error) {
		out, e = p.app.OnEvents(ctx, in)
		return
	})
	return
}

type httpAdapter struct{ i *Instance }

func (a httpAdapter) HandleHTTP(ctx context.Context, in *pluginv1.HTTPRequest) (out *pluginv1.HTTPResponse, err error) {
	err = a.i.call(ctx, TimeoutHTTP, func(ctx context.Context, p *proc) (e error) {
		out, e = p.http.HandleHTTP(ctx, in)
		return
	})
	return
}

type schedAdapter struct{ i *Instance }

func (a schedAdapter) ResolveAffinityKey(ctx context.Context, in *pluginv1.ResolveAffinityKeyRequest) (out *pluginv1.ResolveAffinityKeyResponse, err error) {
	err = a.i.call(ctx, TimeoutScheduler, func(ctx context.Context, p *proc) (e error) {
		out, e = p.sched.ResolveAffinityKey(ctx, in)
		return
	})
	return
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

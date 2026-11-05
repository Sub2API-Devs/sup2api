package admin

import (
	"context"
	"errors"
	"sync"
	"time"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/sessionstate"
)

// Features are /health's features: Python 0.1.118's eleven in their order,
// then guard-api-v1 (the controller runs under the guard, 04 §2.9) and
// egress-recreate-v1 (POST /runtime/egress/recreate, 02 §7.4), then
// cli-from-image-v1 (a runtime the configuration names no CLI for runs the
// one its image packages; a paired update may omit cli_version), then
// session-state-v1 (account session Valkey users, /health session_state;
// SESSION-MEMORY-TOOLS-USED-DESIGN.md §7.5).
var Features = []string{"tunnel", "uploads", "runtime-images", "self-upgrade", "worker-update",
	"runtime-pair-update-v1", "shared-egress-v1", "cli-profile-v1", "runtime-cleanup-v1",
	"account-disk-quota-v1", "runtime-purge-v2", "guard-api-v1", "egress-recreate-v1", "cli-from-image-v1",
	sessionstate.Feature}

const (
	// GatewayCacheTTL is how long /health reuses the gateway fields (02 §7.4).
	GatewayCacheTTL = 30 * time.Second
	// healthGuardWait bounds the guard calls behind /health.
	healthGuardWait = 3 * time.Second
)

// Gateway health states.
const (
	GatewayRunning = "running"
	GatewayStopped = "stopped"
	GatewayAbsent  = "absent"
	GatewayUnknown = "unknown"
)

type admin struct {
	o Options

	runtimeMu sync.Mutex // PUT /runtime/images
	upgradeMu sync.Mutex // POST /runtime/controller, POST /runtime/egress/recreate

	gwMu     sync.Mutex // serialises refreshes of the cached gateway fields
	cacheMu  sync.Mutex // leaf: the cache itself
	cached   pyjson.Ordered
	cachedAt time.Time
	cacheFor string // the target the cache was made for

	ssMu       sync.Mutex // serialises refreshes of session_state
	ssCached   pyjson.Ordered
	ssCachedAt time.Time
}

// New is health, target images, the controller upgrade and the gateway
// maintenance through the guard.
func New(opts Options) (contract.Admin, error) {
	if err := opts.Defaults(); err != nil {
		return nil, err
	}
	return &admin{o: opts}, nil
}

// gatewayTarget is the image a recreated gateway runs: CCG_XRAY_IMAGE when
// pinned, else the egress target.
func (a *admin) gatewayTarget() string {
	if a.o.Config.XrayImage != "" {
		return a.o.Config.XrayImage
	}
	return a.o.Images.Egress()
}

// Health is GET /health (R1, 02 §7.4); it never fails.
func (a *admin) Health(ctx context.Context) pyjson.Ordered {
	app, egress := a.o.Images.Targets()
	features := make([]any, len(Features))
	for i, f := range Features {
		features[i] = f
	}
	return pyjson.Ordered{
		{Key: "version", Value: a.o.Config.Version},
		{Key: "app_image", Value: app},
		{Key: "egress_image", Value: egress},
		{Key: "controller_image", Value: a.o.Config.ControllerImage},
		{Key: "network_policy_version", Value: 1},
		{Key: "features", Value: features},
		{Key: "disk_quota", Value: pyjson.Ordered{{Key: "default_bytes", Value: a.o.Config.AccountDiskBytes},
			{Key: "support", Value: a.o.DiskQuota.Get()}}},
		{Key: "egress_gateway", Value: a.gateway(ctx)},
		{Key: "session_state", Value: a.sessionState(ctx)},
	}
}

// sessionState is session_state: whether the controller reaches the
// session Valkey, its memory, evictions (another account filling the shared
// memory shows here) and the number of account users, at most every 30 s
// and within 3 s.
func (a *admin) sessionState(ctx context.Context) pyjson.Ordered {
	a.ssMu.Lock()
	defer a.ssMu.Unlock()
	if a.ssCached != nil && a.o.Clock.Now().Sub(a.ssCachedAt) < GatewayCacheTTL {
		return a.ssCached
	}
	v := pyjson.Ordered{{Key: "reachable", Value: false}, {Key: "used_memory", Value: nil},
		{Key: "evicted_keys", Value: nil}, {Key: "users", Value: nil}}
	if a.o.SessionState != nil {
		cctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), healthGuardWait)
		info, err := a.o.SessionState.Observe(cctx)
		cancel()
		if err == nil {
			v = pyjson.Ordered{{Key: "reachable", Value: true}, {Key: "used_memory", Value: info.UsedMemory},
				{Key: "evicted_keys", Value: info.EvictedKeys}, {Key: "users", Value: int64(len(info.Users))}}
		}
	}
	a.ssCached, a.ssCachedAt = v, a.o.Clock.Now()
	return v
}

func (a *admin) fromCache(target string) pyjson.Ordered {
	a.cacheMu.Lock()
	defer a.cacheMu.Unlock()
	if a.cached != nil && a.cacheFor == target && a.o.Clock.Now().Sub(a.cachedAt) < GatewayCacheTTL {
		return a.cached
	}
	return nil
}

func (a *admin) dropCache() {
	a.cacheMu.Lock()
	a.cached = nil
	a.cacheMu.Unlock()
}

// gateway is egress_gateway: the running gateway's image against the
// gateway target, from the guard at most every 30 s.
func (a *admin) gateway(ctx context.Context) pyjson.Ordered {
	target := a.gatewayTarget()
	if v := a.fromCache(target); v != nil {
		return v
	}
	a.gwMu.Lock()
	defer a.gwMu.Unlock()
	if v := a.fromCache(target); v != nil {
		return v
	}
	cctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), healthGuardWait)
	defer cancel()
	v := a.observe(cctx, target)
	a.cacheMu.Lock()
	a.cached, a.cachedAt, a.cacheFor = v, a.o.Clock.Now(), target
	a.cacheMu.Unlock()
	return v
}

func gatewayView(status, imageID, target, targetID string) pyjson.Ordered {
	return pyjson.Ordered{{Key: "status", Value: status}, {Key: "image_id", Value: imageID},
		{Key: "target_image", Value: target}, {Key: "target_id", Value: targetID},
		{Key: "update_available", Value: imageID != "" && targetID != "" && imageID != targetID}}
}

func (a *admin) observe(ctx context.Context, target string) pyjson.Ordered {
	gw, err := a.o.Guard.Gateway(ctx)
	if err != nil {
		a.o.Log.Warn("health: gateway state unavailable: %s", errs.FailureText(err))
		return gatewayView(GatewayUnknown, "", "", "")
	}
	status, imageID := GatewayAbsent, ""
	if c := gw.Container; c != nil {
		status, imageID = GatewayStopped, c.Image
		if c.Running() {
			status = GatewayRunning
		}
	}
	targetID := ""
	if target != "" {
		img, err := a.o.Guard.ImageInspect(ctx, target)
		switch {
		case err == nil:
			targetID = img.ID
		case !guardapi.IsNotFound(err):
			a.o.Log.Warn("health: gateway target image unavailable: %s", errs.FailureText(err))
		}
	}
	return gatewayView(status, imageID, target, targetID)
}

// RuntimeImages is GET /runtime/images (I1).
func (a *admin) RuntimeImages(ctx context.Context) pyjson.Ordered {
	app, egress := a.o.Images.Targets()
	return pyjson.Ordered{{Key: "app", Value: app}, {Key: "egress", Value: egress},
		{Key: "controller", Value: a.o.Config.ControllerImage}}
}

// ensureImage is Manager.ensure_image through the guard: inspect, pull once
// when absent, inspect again; image_pull_failed when it cannot be had.
func (a *admin) ensureImage(ctx context.Context, ref string) (*guardapi.Image, error) {
	img, err := a.o.Guard.ImageInspect(ctx, ref)
	if err == nil || !guardapi.IsNotFound(err) {
		return img, err
	}
	if err := a.o.Guard.ImagePull(ctx, ref); err != nil {
		if errs.Is(err, errs.ImagePullFailed) {
			return nil, err
		}
		return nil, errs.Wrap(errs.ImagePullFailed, "image pull failed", err)
	}
	img, err = a.o.Guard.ImageInspect(ctx, ref)
	if err != nil {
		return nil, errs.Wrap(errs.ImagePullFailed, "image pull failed", err)
	}
	return img, nil
}

// SetRuntimeImages is PUT /runtime/images (I2, 02 §7.4): it records the
// targets of new containers and of a gateway recreated later; the running
// gateway and account containers are not touched.
func (a *admin) SetRuntimeImages(ctx context.Context, desired any) (pyjson.Ordered, error) {
	o, ok := desired.(pyjson.Ordered)
	if !ok {
		return nil, errs.New(errs.BadRequest, "invalid runtime images")
	}
	for _, kv := range o {
		if kv.Key != "app" && kv.Key != "egress" {
			return nil, errs.New(errs.BadRequest, "invalid runtime images")
		}
	}
	for _, kv := range o {
		if ref, ok := kv.Value.(string); !ok || !names.ValidImage(ref) {
			return nil, errs.New(errs.BadRequest, "invalid image reference")
		}
	}
	if len(o) == 0 {
		return a.Health(ctx), nil // nothing to change: nothing is written
	}
	a.runtimeMu.Lock()
	defer a.runtimeMu.Unlock()
	app, egress := a.o.Images.Targets()
	for _, kv := range o {
		ref := kv.Value.(string)
		img, err := a.ensureImage(ctx, ref)
		if err != nil {
			return nil, err
		}
		if kv.Key == "app" {
			if err := names.CheckBusinessImage(img.Config.Env); err != nil {
				return nil, err
			}
			app = ref
		} else {
			// The egress image is the shared Xray gateway's; the old
			// per-account sing-box image cannot serve it.
			if img.Config.Labels[names.LabelSharedSchema] != "1" {
				return nil, errs.New(errs.InvalidImage, "egress image is not a shared egress gateway")
			}
			egress = ref
		}
	}
	if err := a.o.Images.Set(a.o.Store, app, egress); err != nil {
		return nil, err
	}
	a.dropCache()
	return a.Health(ctx), nil
}

// singleImage is common.single_image.
func singleImage(desired any) (string, error) {
	o, ok := desired.(pyjson.Ordered)
	if ok && len(o) == 1 && o[0].Key == "image" {
		if ref, ok := o[0].Value.(string); ok && names.ValidImage(ref) {
			return ref, nil
		}
	}
	return "", errs.New(errs.BadRequest, "invalid image reference")
}

// UpgradeController is POST /runtime/controller (C1, C2, 02 §7.5): checks
// here, the upgrade itself is the guard's (compose recreates this
// controller, which then gets SIGTERM).
func (a *admin) UpgradeController(ctx context.Context, desired any) error {
	ref, err := singleImage(desired)
	if err != nil {
		return err
	}
	a.upgradeMu.Lock()
	defer a.upgradeMu.Unlock()
	img, err := a.ensureImage(ctx, ref)
	if err != nil {
		return err
	}
	labels := img.Config.Labels
	// A controller image without the shared gateway cannot take over the
	// accounts bound to it.
	if labels[names.LabelSharedSchema] != "1" && a.o.Host.HasSharedBindings() {
		return errs.New(errs.BadRequest, "controller image cannot serve the shared egress gateway")
	}
	if labels[names.LabelGuardAPI] != "1" {
		return errs.New(errs.InvalidImage, "controller image does not support the guard")
	}
	return a.o.Guard.UpgradeController(ctx, ref)
}

// RecreateEgress is POST /runtime/egress/recreate (02 §7.4): the explicit
// maintenance that recreates the gateway with its target image; every
// runtime goes offline and a recover pass starts at once.
func (a *admin) RecreateEgress(ctx context.Context, desired any) (pyjson.Ordered, error) {
	if o, ok := desired.(pyjson.Ordered); !ok || len(o) != 0 {
		return nil, errs.New(errs.BadRequest, "recreate takes an empty object")
	}
	a.upgradeMu.Lock()
	defer a.upgradeMu.Unlock()
	target := a.gatewayTarget()
	if !names.ValidImage(target) {
		return nil, errs.New(errs.InvalidImage, "no valid gateway image")
	}
	err := a.o.Host.WithSharedOp(ctx, func(ctx context.Context) error {
		img, err := a.ensureImage(ctx, target)
		if err != nil {
			return err
		}
		if img.Config.Labels[names.LabelSharedSchema] != "1" {
			return errs.New(errs.InvalidImage, "egress image is not a shared egress gateway")
		}
		_, err = a.o.Guard.RecreateGateway(ctx, target)
		if err == nil || mayHaveRecreated(err) {
			// The gateway may be a new container: its attachments and
			// Xray state are gone; recover rebuilds them (02 §7.3).
			a.o.Host.GatewayRecreated()
			a.dropCache()
		}
		return err
	})
	if err != nil {
		return nil, err
	}
	a.o.Log.Info("shared egress gateway recreated with %s", target)
	return pyjson.Ordered{{Key: "recreated", Value: true}, {Key: "image", Value: target}}, nil
}

// mayHaveRecreated: a guard failure after compose may have run (5xx, a
// lost answer); refusals (4xx) changed nothing.
func mayHaveRecreated(err error) bool {
	if errors.Is(err, guardapi.ErrUnavailable) {
		return true
	}
	if e, ok := guardapi.AsError(err); ok {
		return e.Status >= 500
	}
	return false
}

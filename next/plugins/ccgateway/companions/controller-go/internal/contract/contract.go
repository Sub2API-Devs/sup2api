// Package contract is the frozen boundary between the controller's business
// packages, so that three writers can build them in parallel (see
// controller-go/IMPLEMENTATION.md):
//
//	writer A  internal/accounts                     implements Accounts, UpdateHost, CleanupHost, AdminHost
//	writer B  internal/{updates,uploads,cleanup,admin}  implements Updates, Uploads, Cleanup, Admin
//	writer C  internal/api, cmd/ccg-controller       uses Accounts, Updates, Uploads, Cleanup, Admin
//
// Every answer type here encodes (pyjson.Valuer) to the exact Python dict,
// key order included (H7, R1-R21). Request bodies reach the business
// packages as decoded JSON (pyjson.Decode: pyjson.Ordered, []any,
// json.Number, string, bool, nil); a body that is not JSON is nil for PUT
// config (H6) and a BadRequest everywhere else (decided by api).
//
// Named failures are *errs.Error; the endpoint group's errs.Set decides
// how they are answered (H9, H10). Upload failures are *UploadError.
//
// FROZEN: changing anything here needs the coordinator.
package contract

import (
	"context"
	"io"

	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/keylock"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

// ---------------------------------------------------------------------------
// Answers of the account endpoints.

// Public is Manager.public(aid) (Y3, R5): GET status and a ready PUT config.
type Public struct {
	AccountID            string
	Container            string
	CLI                  any // state.cli (decoded JSON) or nil
	ActiveRuntime        any // state.active_runtime or nil
	CurrentImage         string
	TargetImage          string
	ImageUpdateAvailable bool
	TargetImageAvailable bool
	EnvironmentPending   bool
	DiskQuota            store.DiskQuota
	Status               string // ready | pending (never blocked, BUG-21 kept)
	Revision             string
	AuthMode             string
	Network              any // state.network (netplan.Policy) or nil
	AppIP                string
	GatewayIP            string
}

// PyValue is Python's key order.
func (p *Public) PyValue() any {
	return pyjson.Ordered{
		{Key: "account_id", Value: p.AccountID}, {Key: "container", Value: p.Container},
		{Key: "cli", Value: p.CLI}, {Key: "active_runtime", Value: p.ActiveRuntime},
		{Key: "current_image", Value: p.CurrentImage}, {Key: "target_image", Value: p.TargetImage},
		{Key: "image_update_available", Value: p.ImageUpdateAvailable},
		{Key: "target_image_available", Value: p.TargetImageAvailable},
		{Key: "environment_pending", Value: p.EnvironmentPending}, {Key: "disk_quota", Value: p.DiskQuota},
		{Key: "status", Value: p.Status}, {Key: "revision", Value: p.Revision},
		{Key: "auth_mode", Value: p.AuthMode}, {Key: "network", Value: p.Network},
		{Key: "app_ip", Value: p.AppIP}, {Key: "gateway_ip", Value: p.GatewayIP},
	}
}

// Blocked is block()'s answer (BL1): {"account_id", "status": "blocked", "revision": ""}.
type Blocked struct{ AccountID string }

// PyValue is Python's key order.
func (b *Blocked) PyValue() any {
	return pyjson.Ordered{{Key: "account_id", Value: b.AccountID}, {Key: "status", Value: "blocked"}, {Key: "revision", Value: ""}}
}

// RuntimeRow is one entry of GET /accounts (Y4).
type RuntimeRow struct {
	Key, Status, CreatedAt string
}

// RuntimeList is GET /accounts: {"runtimes": [{"key","status","created_at"}]}.
type RuntimeList struct{ Runtimes []RuntimeRow }

// PyValue is Python's key order.
func (l *RuntimeList) PyValue() any {
	rows := []any{}
	for _, r := range l.Runtimes {
		rows = append(rows, pyjson.Ordered{{Key: "key", Value: r.Key}, {Key: "status", Value: r.Status},
			{Key: "created_at", Value: r.CreatedAt}})
	}
	return pyjson.Ordered{{Key: "runtimes", Value: rows}}
}

// DeleteResult is DELETE /accounts/<key> (D6):
// {"deleted": true, "removed": {"containers", "networks", "volume"}}.
type DeleteResult struct {
	Containers []string
	Networks   []string
	Volume     bool
}

// PyValue is Python's key order.
func (d *DeleteResult) PyValue() any {
	return pyjson.Ordered{{Key: "deleted", Value: true}, {Key: "removed", Value: pyjson.Ordered{
		{Key: "containers", Value: strings(d.Containers)}, {Key: "networks", Value: strings(d.Networks)},
		{Key: "volume", Value: d.Volume}}}}
}

func strings(list []string) []any {
	out := []any{}
	for _, s := range list {
		out = append(out, s)
	}
	return out
}

// Connection is GET connection (R6): {"app_ip", "port", "api_key", "revision"}.
type Connection struct {
	AppIP    string
	Port     int
	APIKey   string
	Revision string
}

// PyValue is Python's key order.
func (c *Connection) PyValue() any {
	return pyjson.Ordered{{Key: "app_ip", Value: c.AppIP}, {Key: "port", Value: c.Port},
		{Key: "api_key", Value: c.APIKey}, {Key: "revision", Value: c.Revision}}
}

// EgressStatus is GET egress (R7): {"backend": "shared_xray", "ready"}.
type EgressStatus struct{ Ready bool }

// PyValue is Python's key order.
func (e *EgressStatus) PyValue() any {
	return pyjson.Ordered{{Key: "backend", Value: "shared_xray"}, {Key: "ready", Value: e.Ready}}
}

// ---------------------------------------------------------------------------
// Business interfaces used by package api (writer C).

// Accounts is the account runtime manager (writer A, accounts.Manager).
type Accounts interface {
	// Runtimes is GET /accounts.
	Runtimes(ctx context.Context) (*RuntimeList, error)
	// Delete is DELETE /accounts/<key>; it waits for the account lock until ctx ends.
	Delete(ctx context.Context, aid string, account, purge bool) (*DeleteResult, error)
	// Apply is PUT config; desired is the decoded body (nil when not JSON).
	// The answer is *Public or *Blocked.
	Apply(ctx context.Context, aid string, desired any) (pyjson.Valuer, error)
	// Public is GET status.
	Public(ctx context.Context, aid string) (*Public, error)
	// Connection is GET connection: nil, nil when not synchronized. It
	// waits at most keylock.RequestWait for the account lock (RuntimeBusy).
	Connection(ctx context.Context, aid, revision string) (*Connection, error)
	// ReadyState is the request-path gate of the tunnel and the admin
	// pass-through: the state when ready at revision, nil otherwise. Same
	// lock wait as Connection.
	ReadyState(ctx context.Context, aid, revision string) (*store.AccountState, error)
	// EgressStatus is GET egress.
	EgressStatus(ctx context.Context, aid string) (*EgressStatus, error)
	// RunBackground starts the 10 s recover/collect loop and the 300 s
	// proxy recheck; they stop when ctx ends.
	RunBackground(ctx context.Context)
}

// Updates is the in-place update of a running account container (writer B).
type Updates interface {
	// UpdateWorker is POST worker {"image"} (W1-W13).
	UpdateWorker(ctx context.Context, aid string, desired any) (pyjson.Ordered, error)
	// UpdatePair is POST worker {"image","components","cli_version"} (P1-P11).
	UpdatePair(ctx context.Context, aid string, desired any) (pyjson.Ordered, error)
}

// UploadError is answered `Status {"error": Code, ...Extra}` with
// Connection: close (images.UploadError).
type UploadError struct {
	Status int
	Code   string
	Extra  pyjson.Ordered // e.g. {"offset": n} for offset_mismatch
	Err    error
}

func (e *UploadError) Error() string {
	if e.Err != nil {
		return e.Code + ": " + e.Err.Error()
	}
	return e.Code
}

func (e *UploadError) Unwrap() error { return e.Err }

// Body is the answer body.
func (e *UploadError) Body() pyjson.Ordered {
	return append(pyjson.Ordered{{Key: "error", Value: e.Code}}, e.Extra...)
}

// Uploads are the resumable image uploads (writer B, U1-U6).
type Uploads interface {
	// Create is POST /images/uploads after api checked the body is an
	// object with keys within {size, sha256}; size and sha256 are the raw
	// values (nil when absent).
	Create(ctx context.Context, size, sha256 any) (pyjson.Ordered, error)
	Status(ctx context.Context, id string) (pyjson.Ordered, error)
	Delete(ctx context.Context, id string) (pyjson.Ordered, error)
	// Write reads exactly length bytes of body at offset (api checked the headers).
	Write(ctx context.Context, id string, offset, length int64, body io.Reader) (pyjson.Ordered, error)
	Load(ctx context.Context, id string) (pyjson.Ordered, error)
}

// Cleanup is the orphan inventory and cleanup (writer B, X1-X5).
type Cleanup interface {
	Inventory(ctx context.Context) (pyjson.Ordered, error)
	Cleanup(ctx context.Context, desired any) (pyjson.Ordered, error)
}

// Admin is health, target images, controller upgrade and gateway
// maintenance (writer B, R1, R17-R19, 02 §7.4, §7.5).
type Admin interface {
	// Health is GET /health (and PUT /runtime/images' answer); never fails.
	Health(ctx context.Context) pyjson.Ordered
	// RuntimeImages is GET /runtime/images.
	RuntimeImages(ctx context.Context) pyjson.Ordered
	// SetRuntimeImages is PUT /runtime/images; the answer is Health.
	SetRuntimeImages(ctx context.Context, desired any) (pyjson.Ordered, error)
	// UpgradeController is POST /runtime/controller; nil means 202 {"accepted": true}.
	UpgradeController(ctx context.Context, desired any) error
	// RecreateEgress is POST /runtime/egress/recreate (02 §7.4).
	RecreateEgress(ctx context.Context, desired any) (pyjson.Ordered, error)
}

// ---------------------------------------------------------------------------
// What writer B's packages need from accounts (implemented by writer A).

// UpdateHost is what updates uses of accounts.Manager (Python: the Manager
// methods WorkerUpdates and RuntimeUpdates call).
type UpdateHost interface {
	// Lock waits for aid's account lock until ctx ends (RuntimeBusy then).
	Lock(ctx context.Context, aid string) (*keylock.Held, error)
	// EnsureImage is ensure_image: inspect, pull once if absent, inspect
	// again; errs.ImagePullFailed when it cannot be had.
	EnsureImage(ctx context.Context, ref string) (*guardapi.Image, error)
	// App is owned(aid, 'app'): guardapi.ErrNotFound when absent,
	// errs.OwnershipMismatch when the name is someone else's.
	App(ctx context.Context, aid string) (*guardapi.Container, error)
	// State is Manager.state(aid) (nil when there is none).
	State(aid string) (*store.AccountState, error)
	// Save is Manager.save under the account lock.
	Save(h *keylock.Held, st *store.AccountState) error
	// Readiness is readiness(aid, state): the revision the runtime is online at.
	Readiness(ctx context.Context, aid string, st *store.AccountState) (string, error)
	// GoOffline drops readiness; the revision it was online at ("" if none).
	GoOffline(aid string) string
	// OnlineAt is online_at(aid, revision) (memory only, no container check).
	OnlineAt(aid, revision string) bool
	// BusinessFirewall installs the account firewall and default route via
	// gatewayIP into the running app container (A8 ①, W9).
	BusinessFirewall(ctx context.Context, h *keylock.Held, gatewayIP string) error
	// Reapply is shared.apply(aid, state, shared.desired(aid)) (W11):
	// fence, attach, sync, resolv, firewall, probe and readiness at st.Revision.
	Reapply(ctx context.Context, h *keylock.Held, st *store.AccountState) error
}

// CleanupHost is what cleanup uses of accounts.Manager.
type CleanupHost interface {
	Lock(ctx context.Context, aid string) (*keylock.Held, error)
	// SharedBindingKeys are the keys of the shared gateway's bindings
	// (none when its state has never been created).
	SharedBindingKeys() []string
	// SharedBinding is a copy of aid's binding as Python stores it (for the
	// snapshot identity), ok=false when there is none.
	SharedBinding(aid string) (pyjson.Ordered, bool)
	// DeleteLocked is delete(aid, account, purge) with the lock already held (K10).
	DeleteLocked(ctx context.Context, h *keylock.Held, account, purge bool) (*DeleteResult, error)
}

// AdminHost is what admin uses of accounts.Manager.
type AdminHost interface {
	// HasSharedBindings is bool(shared_bindings()) (the downgrade check, C2).
	HasSharedBindings() bool
	// WithSharedOp runs fn holding the shared gateway operation lock.
	WithSharedOp(ctx context.Context, fn func(ctx context.Context) error) error
	// GatewayRecreated forgets the gateway boot, takes every runtime
	// offline and starts a recover pass at once (02 §7.3, §7.4).
	GatewayRecreated()
}

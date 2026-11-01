// Package guardapi is the controller's client of the guard (03 §3; 02 §5
// as changed by 03 §13.1). The controller never talks to Docker: every
// container, network, volume and image operation is one of these calls.
//
// Error contract:
//   - a guard error answer is *Error (errors.Is with ErrNotFound,
//     ErrNotRunning, ErrExists, ErrSubnetOverlap, ErrUplinkMissing,
//     ErrMountRejected, ErrMountReplaced, ErrStarting, ... ); 404 is never
//     mapped to a named failure here;
//   - the answers of 02 §5.3 that have a controller meaning come back as
//     *errs.Error wrapping the *Error: 409 ownership_mismatch ->
//     errs.OwnershipMismatch (Names), 409 resource_in_use -> errs.ResourceInUse,
//     409 upgrade_in_progress -> errs.UpgradeInProgress, 503
//     disk_quota_unavailable -> errs.DiskQuotaUnavailable, 503 busy ->
//     errs.RuntimeBusy; every failure of ImagePull -> errs.ImagePullFailed;
//     403 of UpgradeController -> errs.InvalidImage;
//   - a transport failure is *TransportError (errors.Is(err, ErrUnavailable)),
//     and so is an answer of the wrong shape or with a success status the
//     guard does not use for the endpoint; 503 unavailable/starting is an
//     *Error that also matches ErrUnavailable;
//   - a JSON request body over MaxJSONRequest is a local *Error 413
//     too_large (not sent).
//
// Wire contract (checked against the guard's samples in
// companions/guard/testdata/api-contract): "Authorization: Bearer <64
// lowercase hex>"; JSON bodies application/json; raw bodies with
// Content-Length, never chunked; exact success statuses (201 PUT network
// and PUT app with the raw inspect as the body, 200/201 PUT volume, 202
// controller upgrade, 204 every other change).
//
// FROZEN: the interfaces and types of this package.
package guardapi

import (
	"context"
	"io"
	"time"
)

// SystemAPI is health, subnets and inventory.
type SystemAPI interface {
	Health(ctx context.Context) (*Health, error)
	Subnets(ctx context.Context) (*Subnets, error)
	Inventory(ctx context.Context) (*Inventory, error)
}

// ImagesAPI is the image endpoints.
type ImagesAPI interface {
	// ImageInspect: ErrNotFound when the image is not local.
	ImageInspect(ctx context.Context, ref string) (*Image, error)
	// ImagePull: any failure is errs.ImagePullFailed (403 image_not_allowed included).
	ImagePull(ctx context.Context, ref string) error
	// ImageLoad streams a (gzip-compressed or plain) image archive of size
	// bytes; 403 load_forbidden stays *Error for uploads to answer.
	ImageLoad(ctx context.Context, archive io.Reader, size int64) ([]LoadedImage, error)
	// ImageFile is one regular file of an image, at most limit bytes: the
	// content and its size. 404 image/path, 422 not_regular_file/too_large.
	ImageFile(ctx context.Context, ref, path string, limit int64) (io.ReadCloser, int64, error)
}

// AccountsAPI is the per-runtime endpoints; aid is a checked runtime key.
type AccountsAPI interface {
	Account(ctx context.Context, aid string) (*Account, error)
	// AccountState is the request-path readiness probe (one call, R2).
	AccountState(ctx context.Context, aid string) (*AccountState, error)
	CreateNetwork(ctx context.Context, aid string, req NetworkRequest) (*Network, error)
	// DeleteNetwork: role "net" or "uplink"; ErrNotFound when absent.
	DeleteNetwork(ctx context.Context, aid, role string) error
	EnsureVolume(ctx context.Context, aid string, req VolumeRequest) (*VolumeResult, error)
	DeleteVolume(ctx context.Context, aid string) error
	// CreateApp creates <p>-<aid>-app without starting it (R21); ErrExists
	// when it already exists. PUT resolv must come first.
	CreateApp(ctx context.Context, aid string, req AppRequest) (*Container, error)
	// AppAction is start, stop or restart; timeout (seconds, 0..120) is the
	// stop grace period, nil for the guard's default of 10.
	AppAction(ctx context.Context, aid, action string, timeout *int) error
	// DeleteContainer force-removes <p>-<aid>-<suffix>; ErrNotFound when absent.
	DeleteContainer(ctx context.Context, aid, suffix string) error
	AppExec(ctx context.Context, aid string, argv []string, user string) (*ExecResult, error)
	// AppArchiveGet is the tar stream of path (also for a stopped container).
	AppArchiveGet(ctx context.Context, aid, path string) (io.ReadCloser, error)
	// AppArchivePut unpacks a tar stream of size bytes into directory path.
	AppArchivePut(ctx context.Context, aid, path string, archive io.Reader, size int64) error
	AppTop(ctx context.Context, aid string) (*Top, error)
	WriteResolv(ctx context.Context, aid, nameserver string) error
	InstallFirewall(ctx context.Context, aid, rules, defaultGateway string) error
	RunJob(ctx context.Context, aid string, job Job) (*JobResult, error)
}

// GatewayAPI is the shared gateway endpoints.
type GatewayAPI interface {
	// Gateway: Container nil when absent; 409 ownership_mismatch as errs.OwnershipMismatch.
	Gateway(ctx context.Context) (*Gateway, error)
	// EnsureGateway is compose up of a missing or stopped gateway; it never
	// changes the image. ErrUplinkMissing when uplink is needed.
	EnsureGateway(ctx context.Context, uplink *UplinkRequest) (*EnsureResult, error)
	// RecreateGateway is the explicit maintenance operation (never called
	// from a background path).
	RecreateGateway(ctx context.Context, image string) (*Container, error)
	GatewayExec(ctx context.Context, argv []string) (*ExecResult, error)
	ConnectGateway(ctx context.Context, aid, ipv4 string) error
	// DisconnectGateway succeeds when gateway, network or attachment are absent.
	DisconnectGateway(ctx context.Context, aid string) error
	WriteGatewayFile(ctx context.Context, name string, data []byte) error
}

// ControllerAPI is the controller self-upgrade.
type ControllerAPI interface {
	// UpgradeController: nil on 202; errs.UpgradeInProgress on 409;
	// errs.InvalidImage on 403 (labels missing).
	UpgradeController(ctx context.Context, image string) error
	UpgradeStatus(ctx context.Context) (*UpgradeStatus, error)
}

// Client is the whole guard API.
type Client interface {
	SystemAPI
	ImagesAPI
	AccountsAPI
	GatewayAPI
	ControllerAPI
}

// Timeouts per call category (02 §5.4); every value is above the guard's
// own limit.
type Timeouts struct {
	Ready      time.Duration // AccountState
	Normal     time.Duration // inspect, networks, volumes, create, resolv, files, connect
	Exec       time.Duration // app and gateway exec
	ActionPlus time.Duration // AppAction: stop timeout + this
	Job        time.Duration // RunJob, InstallFirewall
	Pull       time.Duration // ImagePull
	Load       time.Duration // ImageLoad: wait for the import after the upload
	Upgrade    time.Duration // UpgradeController (202 at once)
	Recreate   time.Duration // RecreateGateway, EnsureGateway
	StreamIdle time.Duration // ImageFile, archives, ImageLoad upload: no total, idle limit
}

// DefaultTimeouts are the production values.
var DefaultTimeouts = Timeouts{
	Ready:      5 * time.Second,
	Normal:     60 * time.Second,
	Exec:       120 * time.Second,
	ActionPlus: 60 * time.Second,
	Job:        150 * time.Second,
	Pull:       30 * time.Minute,
	Load:       30 * time.Minute,
	Upgrade:    10 * time.Second,
	Recreate:   5 * time.Minute,
	StreamIdle: 120 * time.Second,
}

// Size limits of answers (02 §5.4, R20).
const (
	MaxJSONAnswer    = 8 << 20
	MaxExecAnswer    = 24 << 20
	MaxJobStdout     = 128 << 10
	MaxArchiveGet    = 601 << 20
	MaxImageFile     = 512<<20 + 1<<20
	MaxErrorAnswer   = 64 << 10
	defaultUserAgent = "ccg-controller"
)

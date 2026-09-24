package core

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

// ============================================================ identity & authz (owner: A core-data)

// TokenVerifier validates console access tokens (JWT).
type TokenVerifier interface {
	VerifyAccessToken(ctx context.Context, token string) (userID int64, err error)
}

// StepUpVerifier validates the X-Step-Up-Token header for sensitive operations.
type StepUpVerifier interface {
	VerifyStepUp(ctx context.Context, userID int64, token string) error
}

// PermissionSet is a user's effective permissions at a given authz version.
type PermissionSet struct {
	Superuser bool
	Keys      map[string]struct{}
	Version   int64
}

func (s PermissionSet) Has(key string) bool {
	if s.Superuser {
		return true
	}
	_, ok := s.Keys[key]
	return ok
}

// Authorizer answers permission questions; results are cached per node and
// invalidated through the authz:changed broadcast.
type Authorizer interface {
	Can(ctx context.Context, userID int64, permission string) (bool, error)
	PermissionSet(ctx context.Context, userID int64) (PermissionSet, error)
	// IsSensitive reports whether a permission requires step-up.
	IsSensitive(permission string) bool
}

// PermissionDef describes one permission in the catalog.
type PermissionDef struct {
	Key         string
	Module      string
	Label       LocalizedText
	Description LocalizedText
	Sensitive   bool
	Sort        int
}

// PermissionCatalog is used by the plugin runtime to manage plugin-owned
// permissions ("plugin.<key>:<local>"). Every mutation bumps the authz version
// and broadcasts authz:changed.
type PermissionCatalog interface {
	// SyncPlugin upserts the plugin's permissions (install/upgrade), deleting
	// ones no longer declared, and grants newly created ones to roleKeys.
	SyncPlugin(ctx context.Context, tx pgx.Tx, pluginKey string, defs []PermissionDef, grantNewToRoleKeys []string) error
	// SetPluginActive flips status active/disabled (enable/disable).
	SetPluginActive(ctx context.Context, tx pgx.Tx, pluginKey string, active bool) error
	// DeletePlugin removes the plugin's permissions and grants (uninstall).
	DeletePlugin(ctx context.Context, tx pgx.Tx, pluginKey string) error
}

// ============================================================ api keys & groups (owner: A)

type GroupInfo struct {
	ID             int64
	Name           string
	Status         string
	RateMultiplier decimal.Decimal
	ModelAllowlist []string // globs; empty = all
}

// APIKeyPrincipal is the result of gateway authentication.
type APIKeyPrincipal struct {
	KeyID              int64
	UserID             int64
	UserMaxConcurrency int
	Group              GroupInfo
}

// APIKeyAuthenticator resolves a raw client key. Errors: ErrUnauthenticated
// (unknown/disabled/expired key or disabled user), ErrPermissionDenied (user
// lacks gateway:use or the group is not available to the user).
type APIKeyAuthenticator interface {
	Authenticate(ctx context.Context, rawKey string) (*APIKeyPrincipal, error)
}

// ============================================================ accounts & proxies (owner: A)

// AccountRef is the scheduling view of an account (no secrets).
type AccountRef struct {
	ID             int64
	Name           string
	PluginKey      string // declaring plugin of the account type
	Type           string
	Priority       int
	MaxConcurrency int
	ProxyID        *int64
}

// Account adds decrypted credentials and settings.
type Account struct {
	AccountRef
	Status      string
	Credentials json.RawMessage
	Settings    json.RawMessage
}

// AccountDirectory is the gateway's view of accounts. Candidates are served
// from a per-node snapshot invalidated by account:changed.
type AccountDirectory interface {
	// Candidates returns active, schedulable accounts of the group whose
	// account type is in types, excluding cooling-down ones.
	Candidates(ctx context.Context, groupID int64, types []AccountTypeKey) ([]AccountRef, error)
	// Load returns one account with decrypted credentials.
	Load(ctx context.Context, id int64) (*Account, error)
	IsCoolingDown(ctx context.Context, id int64) (bool, error)
	SetCooldown(ctx context.Context, id int64, until time.Time, reason string) error
	// Disable sets status=disabled with a reason and emits account.status_changed.
	Disable(ctx context.Context, id int64, reason string) error
	TouchLastUsed(ctx context.Context, id int64)
}

// ProxyDirectory hands out HTTP clients per proxy (nil = direct), cached and
// rebuilt when a proxy changes.
type ProxyDirectory interface {
	HTTPClient(ctx context.Context, proxyID *int64) (*http.Client, error)
}

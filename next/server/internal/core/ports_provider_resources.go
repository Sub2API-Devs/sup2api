package core

import (
	"context"
	"encoding/json"
	"time"
)

// ResourceOwner is intentionally narrower than an API key: rotating a key does
// not transfer a resource to another user or group.
type ResourceOwner struct{ UserID, GroupID int64 }
type ResourceBinding struct {
	AccountID               int64
	PrincipalID, Generation string
}
type ProviderResource struct {
	PublicID, PluginKey, Kind, RemoteID, State, OperationID string
	Owner                                                   ResourceOwner
	Binding                                                 ResourceBinding
	Bytes                                                   int64
	Metadata                                                json.RawMessage
	CreatedAt, ExpiresAt                                    time.Time
}
type ResourceIntent struct {
	RequestID, PluginKey, Kind string
	Owner                      ResourceOwner
	Binding                    ResourceBinding
	Bytes                      int64
	Metadata                   json.RawMessage
	TTL                        time.Duration
	// ExpiresAt is a known provider expiry; zero means unknown/unbounded.
	ExpiresAt time.Time
}
type ResourceReservation struct {
	Resource ProviderResource
	Dispatch bool
}
type ResourceCompletion struct {
	Owner                           ResourceOwner
	PublicID, OperationID, RemoteID string
	Binding                         ResourceBinding
	Bytes                           int64
	Metadata                        json.RawMessage
	// nil: unreported; zero: provider reports no expiry; nonzero: provider expiry.
	ExpiresAt *time.Time
}
type ResourceQuery struct {
	PluginKey, Kind, BeforeID, AfterID string
	IDs                                []string
	// AccountIDs is the caller's currently authorized account set. Empty
	// means no accounts, never an unrestricted query.
	AccountIDs               []int64
	Limit                    int
	ReadyOnly, UnexpiredOnly bool
	ExpiredWithin            time.Duration
}
type ResourcePage struct {
	Items   []ProviderResource
	HasMore bool
}
type ProviderResources interface {
	Reserve(context.Context, ResourceIntent) (ResourceReservation, error)
	Finalize(context.Context, ResourceCompletion) (ProviderResource, error)
	MarkUncertain(context.Context, ResourceOwner, string, string) error
	// FailCreate requires confirmed provider rejection, never a transport error.
	FailCreate(context.Context, ResourceOwner, string, string, string) error
	Get(context.Context, ResourceOwner, string) (ProviderResource, error)
	List(context.Context, ResourceOwner, string, int) ([]ProviderResource, error)
	Query(context.Context, ResourceOwner, ResourceQuery) (ResourcePage, error)
	BeginDelete(context.Context, ResourceOwner, string, ResourceBinding) (ResourceReservation, error)
	FinishDelete(context.Context, ResourceOwner, string, string, bool) error
}

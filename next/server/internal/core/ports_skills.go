package core

import (
	"context"
	"encoding/json"
	"time"
)

type SkillVersion struct {
	PublicVersionID, RemoteVersionID, LegacyEpoch, State, OperationID string
	Parent                                                            ProviderResource
	Bytes                                                             int64
	Metadata                                                          json.RawMessage
	CreatedAt                                                         time.Time
}
type SkillUploadIntent struct {
	ResourceIntent
	ParentID string
}
type SkillUploadReservation struct {
	Parent   ProviderResource
	Version  SkillVersion
	Dispatch bool
}
type SkillUploadCompletion struct {
	Owner                                                                               ResourceOwner
	Binding                                                                             ResourceBinding
	ParentID, PublicVersionID, OperationID, RemoteSkillID, RemoteVersionID, LegacyEpoch string
	ParentMetadata, VersionMetadata                                                     json.RawMessage
	CreatedAt                                                                           time.Time
}
type SkillUploadFailure struct {
	Owner                                                         ResourceOwner
	ParentID, PublicVersionID, OperationID, Outcome, EvidenceCode string
	Evidence                                                      *SkillUploadEvidence
}

// Observed provider facts aid reconciliation; they never grant ready access.
type SkillUploadEvidence struct {
	Binding         ResourceBinding `json:"binding"`
	RemoteSkillID   string          `json:"remote_skill_id,omitempty"`
	RemoteVersionID string          `json:"remote_version_id,omitempty"`
	LegacyEpoch     string          `json:"legacy_epoch,omitempty"`
	SourceRequestID string          `json:"source_request_id,omitempty"`
}
type SkillVersionPage struct {
	Items   []SkillVersion
	HasMore bool
}
type SkillDeleteIntent struct {
	Parent      ProviderResource
	Version     *SkillVersion
	OperationID string
	Dispatch    bool
}
type SkillDeleteCompletion struct {
	Owner                                                         ResourceOwner
	ParentID, PublicVersionID, OperationID, Outcome, EvidenceCode string
}

// SkillResources keeps version selectors scoped to an owned parent. No method
// grants access through an unscoped provider version ID.
type SkillResources interface {
	ReserveSkillUpload(context.Context, SkillUploadIntent) (SkillUploadReservation, error)
	CompleteSkillUpload(context.Context, SkillUploadCompletion) (SkillUploadReservation, error)
	MarkSkillUpload(context.Context, SkillUploadFailure) error
	ListSkills(context.Context, ResourceOwner, []int64, string, int) (ResourcePage, error)
	FindVersion(context.Context, ResourceOwner, string, string) (SkillVersion, error)
	// FindObservedVersion is only for verified provider responses, never public selectors.
	FindObservedVersion(context.Context, ResourceOwner, string, string) (SkillVersion, error)
	ListSkillVersions(context.Context, ResourceOwner, string, string, int) (SkillVersionPage, error)
	BeginSkillDelete(context.Context, ResourceOwner, string, string) (SkillDeleteIntent, error)
	FinishSkillDelete(context.Context, SkillDeleteCompletion) error
}

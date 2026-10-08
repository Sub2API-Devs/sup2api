package core

import (
	"encoding/json"
	"time"
)

// ResourceObservation contains provider facts verified by the host. The
// dispatch timestamp is host-generated after admission, never client metadata.
type ResourceObservation struct {
	Owner                     ResourceOwner
	Binding                   ResourceBinding
	PluginKey, Kind, RemoteID string
	Bytes                     int64
	Metadata                  json.RawMessage
	ExpiresAt                 *time.Time
	RequestStartedAt          time.Time
}

// ResourceContext binds a provider parent-call identity to one public container.
// ResolveContext ignores ResourceID; BindContext requires it.
type ResourceContext struct {
	Owner                                 ResourceOwner
	Binding                               ResourceBinding
	PluginKey, Kind, ParentID, ResourceID string
}

package core

import (
	"context"
	"time"
)

// AsyncTasks owns durable identities and snapshots of opt-in plugin tasks.
// No query through this port calls upstream or selects another account.
type AsyncTasks interface {
	BeginTask(context.Context, TaskIntent) (string, error)
	ReceiveTask(context.Context, string, int, []byte, string) error
	RegisterTask(context.Context, TaskRegistration) error
	FindTask(context.Context, TaskQuery) (*TaskSnapshot, error)
}

type TaskIntent struct {
	RequestID, PluginKey, Kind, Model, Protocol string
	UserID, APIKeyID, GroupID, AccountID        int64
}

type TaskRegistration struct {
	PublicID, UpstreamID, Kind string
	Snapshot                   []byte
	IDPaths                    []string
	NextCheckAfter, Deadline   time.Duration
	Record                     *UsageRecord
}

type TaskQuery struct {
	ID, PluginKey, Kind, SubmitProtocol string
	UserID, GroupID                     int64
	IDPaths                             []string
}

type TaskSnapshot struct {
	FailureCode, FailureReason                            string
	PublicID, UpstreamID, Model, State, ObservationStatus string
	Body                                                  []byte
	IDPaths                                               []string
}

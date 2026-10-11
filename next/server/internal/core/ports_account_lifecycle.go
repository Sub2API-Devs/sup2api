package core

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

type AccountPreparation struct {
	Key       string
	PluginKey string
	Type      string
	ProxyID   *int64
	Settings  json.RawMessage
	CreatedBy int64
}

type AccountSynchronization struct {
	Status string `json:"status"`
	Code   string `json:"code,omitempty"`
}

type AccountSynchronizationReader interface {
	AccountSynchronization(context.Context, int64) (AccountSynchronization, error)
}

type AccountActionResource interface {
	AccountAction(context.Context, int64, string) (any, error)
}

type AccountLifecycleResource interface {
	PrepareAccount(context.Context, AccountPreparation) error
	UpdateAccountPreparation(context.Context, pgx.Tx, AccountPreparation) error
	AccountPreparationAction(context.Context, AccountPreparation, string, string, json.RawMessage) (any, error)
	CheckAccountPreparation(context.Context, AccountPreparation) error
	AdoptAccountPreparation(context.Context, pgx.Tx, AccountPreparation, int64) error
	CancelAccountPreparation(context.Context, AccountPreparation) error
	ReconcileAccount(context.Context, int64) error
}

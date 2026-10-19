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

// AccountPreparationFacts is what the preparation resource observed of the
// prepared account (CONTRACTS §59). The core records SubscriptionType on the
// account and hands the facts to the plugin's before_create.
type AccountPreparationFacts struct {
	// SubscriptionType is the plan the upstream reported ("max", "pro" ...);
	// "" when unknown.
	SubscriptionType string `json:"subscription_type,omitempty"`
}

type AccountSynchronizationReader interface {
	AccountSynchronization(context.Context, int64) (AccountSynchronization, error)
}

type AccountActionResource interface {
	AccountAction(context.Context, int64, string) (any, error)
}

// AccountDeletionResource records durable cleanup intent in the account
// deletion transaction. Reconciliation performs the remote cleanup afterward.
type AccountDeletionResource interface {
	MarkAccountDeleted(context.Context, pgx.Tx, int64) error
}

type AccountLifecycleResource interface {
	PrepareAccount(context.Context, AccountPreparation) error
	UpdateAccountPreparation(context.Context, pgx.Tx, AccountPreparation) error
	AccountPreparationAction(context.Context, AccountPreparation, string, string, json.RawMessage) (any, error)
	CheckAccountPreparation(context.Context, AccountPreparation) (AccountPreparationFacts, error)
	AdoptAccountPreparation(context.Context, pgx.Tx, AccountPreparation, int64) error
	CancelAccountPreparation(context.Context, AccountPreparation) error
	ReconcileAccount(context.Context, int64) error
}

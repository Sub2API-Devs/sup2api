package payment

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Webhook notification failures. None of them changes an order.
var (
	// ErrProviderNotConfigured: the provider has no enabled instance.
	ErrProviderNotConfigured = errors.New("payment provider not configured")
	// ErrProviderNotImplemented: no NotificationVerifier is registered for
	// the provider, so its notifications cannot be trusted.
	ErrProviderNotImplemented = errors.New("payment provider notifications not implemented")
	// ErrNotificationRejected: no instance of the provider accepted the request.
	ErrNotificationRejected = errors.New("payment notification rejected")
	// ErrOrderNotFound: a verified notification names an order we do not have.
	ErrOrderNotFound = errors.New("order not found")
	// ErrAmountMismatch: a verified notification pays a different amount.
	ErrAmountMismatch = errors.New("amount mismatch")
)

// ProviderConfig is one enabled row of payment_provider_instances.
type ProviderConfig struct {
	ID          int64
	ProviderKey string
	// Config is the instance's stored settings (keys, secrets), as JSON.
	Config json.RawMessage
}

// NotificationVerifier authenticates one provider's webhook call and parses
// it. It is the integration point of a real provider: Verify must check the
// provider's signature over req with the secrets in cfg and return an error
// for anything it cannot prove authentic; a nil error comes with a non-nil
// notification.
//
// Orders do not record their provider instance yet, so a verified
// notification is matched to its order by out_trade_no alone. A real provider
// must also bind the order to cfg.ID once orders store it.
type NotificationVerifier interface {
	Verify(ctx context.Context, req *pluginv1.HTTPRequest, cfg ProviderConfig) (*PaymentNotification, error)
}

// RegisterVerifier installs the verifier of a provider key. Call it while the
// plugin is being built; it is not safe for use once requests are served. A
// nil verifier is a programming error.
func (s *OrderService) RegisterVerifier(providerKey string, v NotificationVerifier) {
	if v == nil {
		panic("payment: nil NotificationVerifier for " + providerKey)
	}
	s.verifiers[providerKey] = v
}

// verifyNotification returns the notification that one enabled instance of the
// provider verified.
func (s *OrderService) verifyNotification(ctx context.Context, db *pgxpool.Pool, providerKey string, req *pluginv1.HTTPRequest) (*PaymentNotification, error) {
	configs, err := enabledProviders(ctx, db, providerKey)
	if err != nil {
		return nil, err
	}
	if len(configs) == 0 {
		return nil, ErrProviderNotConfigured
	}
	verifier, ok := s.verifiers[providerKey]
	if !ok {
		return nil, ErrProviderNotImplemented
	}
	var rejected []error
	for _, cfg := range configs {
		n, err := verifier.Verify(ctx, req, cfg)
		if err == nil && n != nil {
			return n, nil
		}
		if err == nil {
			err = errors.New("verifier returned no notification")
		}
		rejected = append(rejected, fmt.Errorf("instance %d: %w", cfg.ID, err))
	}
	return nil, fmt.Errorf("%w: %w", ErrNotificationRejected, errors.Join(rejected...))
}

// enabledProviders lists the enabled instances of a provider key.
func enabledProviders(ctx context.Context, db *pgxpool.Pool, providerKey string) ([]ProviderConfig, error) {
	rows, err := db.Query(ctx, `
		SELECT id, provider_key, config
		FROM payment_provider_instances
		WHERE provider_key = $1 AND enabled
		ORDER BY sort_order, id
	`, providerKey)
	if err != nil {
		return nil, fmt.Errorf("query provider instances: %w", err)
	}
	configs, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (ProviderConfig, error) {
		var c ProviderConfig
		err := row.Scan(&c.ID, &c.ProviderKey, &c.Config)
		return c, err
	})
	if err != nil {
		return nil, fmt.Errorf("scan provider instances: %w", err)
	}
	return configs, nil
}

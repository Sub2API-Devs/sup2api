// Package event is the write side of the transactional outbox (table
// events). Delivery to plugins lives in event/delivery (owner: H).
package event

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Publisher implements core.EventPublisher.
type Publisher struct {
	db *store.DB
}

var _ core.EventPublisher = (*Publisher)(nil)

// NewPublisher returns an outbox writer. db is used only when Emit is called
// without a transaction.
func NewPublisher(db *store.DB) *Publisher { return &Publisher{db: db} }

// Emit inserts events into the outbox inside tx. With a nil tx the events
// are written in their own transaction (only for callers that have no
// business transaction to join).
func (p *Publisher) Emit(ctx context.Context, tx pgx.Tx, events ...core.Event) error {
	if len(events) == 0 {
		return nil
	}
	if tx == nil {
		if p.db == nil {
			return errors.New("event: Emit without transaction and no database")
		}
		return p.db.Tx(ctx, func(tx pgx.Tx) error { return p.Emit(ctx, tx, events...) })
	}
	batch := &pgx.Batch{}
	for _, ev := range events {
		if ev.Type == "" {
			return errors.New("event: empty type")
		}
		payload, err := marshal(ev.Payload)
		if err != nil {
			return fmt.Errorf("event %s: %w", ev.Type, err)
		}
		batch.Queue(`INSERT INTO events (type, payload) VALUES ($1, $2)`, ev.Type, payload)
	}
	return tx.SendBatch(ctx, batch).Close()
}

func marshal(v any) ([]byte, error) {
	switch x := v.(type) {
	case nil:
		return []byte("{}"), nil
	case json.RawMessage:
		if !json.Valid(x) {
			return nil, errors.New("invalid JSON payload")
		}
		return x, nil
	case []byte:
		if !json.Valid(x) {
			return nil, errors.New("invalid JSON payload")
		}
		return x, nil
	}
	return json.Marshal(v)
}

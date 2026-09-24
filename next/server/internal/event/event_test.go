package event_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/event"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestEmit(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	pub := event.NewPublisher(db)

	err := db.Tx(ctx, func(tx pgx.Tx) error {
		return pub.Emit(ctx, tx,
			core.Event{Type: core.EventBalanceChanged, Payload: map[string]any{"user_id": 7}},
			core.Event{Type: core.EventUserUpdated, Payload: json.RawMessage(`{"user_id":8}`)},
		)
	})
	if err != nil {
		t.Fatal(err)
	}
	// Rolled back work leaves no events.
	_ = db.Tx(ctx, func(tx pgx.Tx) error {
		if err := pub.Emit(ctx, tx, core.Event{Type: "x.y", Payload: 1}); err != nil {
			t.Fatal(err)
		}
		return context.Canceled
	})
	// Without a transaction.
	if err := pub.Emit(ctx, nil, core.Event{Type: core.EventPluginEnabled, Payload: nil}); err != nil {
		t.Fatal(err)
	}
	if err := pub.Emit(ctx, nil, core.Event{Type: "bad", Payload: json.RawMessage(`{`)}); err == nil {
		t.Fatal("invalid raw JSON accepted")
	}

	rows, err := db.Pool.Query(ctx, `SELECT type, payload::text FROM events ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	var got []string
	for rows.Next() {
		var typ, payload string
		if err := rows.Scan(&typ, &payload); err != nil {
			t.Fatal(err)
		}
		got = append(got, typ+" "+payload)
	}
	want := []string{`balance.changed {"user_id": 7}`, `user.updated {"user_id": 8}`, `plugin.enabled {}`}
	if len(got) != len(want) {
		t.Fatalf("got %v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("event %d = %q, want %q", i, got[i], want[i])
		}
	}
}

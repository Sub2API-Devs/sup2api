package store

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
)

// UpdateSettingJSONTx serializes partial configuration updates, including the
// first insert. The callback sees the latest committed document under the row
// lock and must return a complete validated JSON object. Callers broadcast only
// after their transaction commits.
func UpdateSettingJSONTx(ctx context.Context, tx pgx.Tx, key string, updatedBy *int64, update func(json.RawMessage) (json.RawMessage, error)) (json.RawMessage, error) {
	if _, err := tx.Exec(ctx, `INSERT INTO settings(key,value) VALUES($1,'{}') ON CONFLICT(key) DO NOTHING`, key); err != nil {
		return nil, err
	}
	var raw json.RawMessage
	if err := tx.QueryRow(ctx, `SELECT value FROM settings WHERE key=$1 FOR UPDATE`, key).Scan(&raw); err != nil {
		return nil, err
	}
	next, err := update(raw)
	if err != nil {
		return nil, err
	}
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(next, &obj); err != nil || obj == nil {
		return nil, errors.New("setting must be a JSON object")
	}
	_, err = tx.Exec(ctx, `UPDATE settings SET value=$2,updated_by=$3,updated_at=now() WHERE key=$1`, key, next, updatedBy)
	return next, err
}

// PatchSettingJSON merges non-null supplied fields under the same transaction
// lock. into must contain defaults; it receives the committed effective value.
// Validate patch values before calling (and use UpdateSettingJSONTx directly
// when validation depends on several merged fields).
func PatchSettingJSON(ctx context.Context, db *DB, key string, updatedBy *int64, patch, into any) error {
	data, err := json.Marshal(patch)
	if err != nil {
		return err
	}
	var fields map[string]json.RawMessage
	if err = json.Unmarshal(data, &fields); err != nil {
		return err
	}
	return db.Tx(ctx, func(tx pgx.Tx) error {
		_, err := UpdateSettingJSONTx(ctx, tx, key, updatedBy, func(raw json.RawMessage) (json.RawMessage, error) {
			var current map[string]json.RawMessage
			if err := json.Unmarshal(raw, &current); err != nil {
				return nil, err
			}
			if current == nil {
				current = map[string]json.RawMessage{}
			}
			for key, value := range fields {
				if string(value) != "null" {
					current[key] = value
				}
			}
			merged, err := json.Marshal(current)
			if err != nil {
				return nil, err
			}
			if err := json.Unmarshal(merged, into); err != nil {
				return nil, err
			}
			return json.Marshal(into)
		})
		return err
	})
}

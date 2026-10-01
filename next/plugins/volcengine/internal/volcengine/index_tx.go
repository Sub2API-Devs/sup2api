package volcengine

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Keep the upstream operation and its index write under one resource row lock.
// An optimistic UPDATE alone cannot order two upstream PATCH side effects.
// The host-issued DB pool supplies the cross-node coordination; no global lock
// or plugin Redis connection is needed. Ark calls are already time bounded.
// If the connection/transaction is lost, its response cannot later commit over
// another node's index update. Upstream success followed by DB failure still
// requires a later refresh, as it does for every upstream-first operation.
func withGroup(ctx context.Context, db *pgxpool.Pool, id int64,
	fn func(pgx.Tx, *groupRow) (*pluginv1.HTTPResponse, error),
) (*pluginv1.HTTPResponse, error) {
	var resp *pluginv1.HTTPResponse
	err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		var locked int64
		if err := tx.QueryRow(ctx, `SELECT id FROM asset_groups WHERE id = $1 FOR UPDATE`, id).Scan(&locked); err != nil {
			return err
		}
		row, err := loadGroup(ctx, tx, id)
		if err != nil {
			return err
		}
		resp, err = fn(tx, row)
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, ErrNoRow) {
		return notFound("no such asset group in the index / 索引里没有这个素材组"), nil
	}
	return resp, err
}

func withAsset(ctx context.Context, db *pgxpool.Pool, id int64,
	fn func(pgx.Tx, *assetRow) (*pluginv1.HTTPResponse, error),
) (*pluginv1.HTTPResponse, error) {
	var resp *pluginv1.HTTPResponse
	err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		// Lock parent before child, matching group deletion's cascade order.
		// KEY SHARE prevents deletion without serializing distinct assets.
		var locked int64
		if err := tx.QueryRow(ctx, `SELECT g.id FROM asset_groups g JOIN assets a ON a.group_id = g.id
			WHERE a.id = $1 FOR KEY SHARE OF g`, id).Scan(&locked); err != nil {
			return err
		}
		if err := tx.QueryRow(ctx, `SELECT id FROM assets WHERE id = $1 FOR UPDATE`, id).Scan(&locked); err != nil {
			return err
		}
		row, err := loadAsset(ctx, tx, id)
		if err != nil {
			return err
		}
		resp, err = fn(tx, row)
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, ErrNoRow) {
		return notFound("no such asset in the index / 索引里没有这个素材"), nil
	}
	return resp, err
}

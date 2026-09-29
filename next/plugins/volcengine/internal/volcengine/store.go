package volcengine

// The local index over the Ark asset library (schema plg_volcengine, see
// migrations/0001_init.sql). Upstream is the truth; these helpers only keep
// the index in step with what the last upstream call reported.

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// index status values of both tables.
const (
	IndexOK      = "ok"
	IndexMissing = "missing"
)

// ErrNoRow is returned when an index row does not exist.
var ErrNoRow = errors.New("not found in the local index")

// groupRow is an asset_groups row, only the columns the plugin acts on. The
// console table gets the full row as JSON (to_jsonb), so a column added by a
// later migration shows up without touching this struct.
type groupRow struct {
	ID         int64
	AccountID  int64
	UpstreamID string
	Name       string
}

// assetRow is an assets row, only the columns the plugin acts on.
type assetRow struct {
	ID         int64
	AccountID  int64
	GroupID    int64
	UpstreamID string
}

func loadGroup(ctx context.Context, db *pgxpool.Pool, id int64) (*groupRow, error) {
	var g groupRow
	err := db.QueryRow(ctx, `SELECT id, account_id, upstream_id, name FROM asset_groups WHERE id = $1`, id).
		Scan(&g.ID, &g.AccountID, &g.UpstreamID, &g.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNoRow
	}
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func loadAsset(ctx context.Context, db *pgxpool.Pool, id int64) (*assetRow, error) {
	var a assetRow
	err := db.QueryRow(ctx, `SELECT id, account_id, group_id, upstream_id FROM assets WHERE id = $1`, id).
		Scan(&a.ID, &a.AccountID, &a.GroupID, &a.UpstreamID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNoRow
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// insertGroup indexes a group that was just created upstream. It is called
// only after the upstream Action succeeded, so a conflict on
// (account_id, upstream_id) means the index already knew the group - which
// happens when a create is retried after a response that never arrived. The
// existing row wins and its id is returned, making the route idempotent
// instead of leaving a duplicate.
func insertGroup(ctx context.Context, db *pgxpool.Pool, accountID int64, g UpstreamGroup) (int64, error) {
	groupType := g.GroupType
	if groupType == "" {
		groupType = "AIGC"
	}
	var id int64
	err := db.QueryRow(ctx, `
		INSERT INTO asset_groups (account_id, upstream_id, name, title, description, group_type, index_status, checked_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'ok', now())
		ON CONFLICT (account_id, upstream_id) DO UPDATE
		   SET name = excluded.name, title = excluded.title, description = excluded.description,
		       group_type = excluded.group_type, index_status = 'ok', updated_at = now(), checked_at = now()
		RETURNING id`,
		accountID, g.ID, g.Name, g.Title, g.Description, groupType).Scan(&id)
	return id, err
}

// insertAsset indexes an asset created upstream, with the same idempotency
// rule as insertGroup.
func insertAsset(ctx context.Context, db *pgxpool.Pool, accountID, groupID int64, a UpstreamAsset) (int64, error) {
	var id int64
	err := db.QueryRow(ctx, `
		INSERT INTO assets (account_id, group_id, upstream_id, name, asset_type, url, status, index_status, checked_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'ok', now())
		ON CONFLICT (account_id, upstream_id) DO UPDATE
		   SET group_id = excluded.group_id, name = excluded.name, asset_type = excluded.asset_type,
		       url = excluded.url, status = excluded.status, index_status = 'ok',
		       updated_at = now(), checked_at = now()
		RETURNING id`,
		accountID, groupID, a.ID, a.Name, a.AssetType, a.URL, a.Status).Scan(&id)
	return id, err
}

// refreshGroup writes back what a GetAssetGroup reported. Empty strings are
// kept out of the update: a result that does not carry a field must not blank
// the indexed value. (An UPDATE the operator asked for goes through
// applyGroupUpdate instead, which can blank a field on purpose.)
func refreshGroup(ctx context.Context, db *pgxpool.Pool, id int64, g UpstreamGroup) error {
	_, err := db.Exec(ctx, `
		UPDATE asset_groups SET
		  name        = CASE WHEN $2 <> '' THEN $2 ELSE name END,
		  title       = CASE WHEN $3 <> '' THEN $3 ELSE title END,
		  description = CASE WHEN $4 <> '' THEN $4 ELSE description END,
		  group_type  = CASE WHEN $5 <> '' THEN $5 ELSE group_type END,
		  index_status = 'ok', updated_at = now(), checked_at = now()
		WHERE id = $1`, id, g.Name, g.Title, g.Description, g.GroupType)
	return err
}

// applyGroupUpdate writes exactly the fields the operator submitted, so
// clearing a title upstream clears it in the index too. A nil pointer means
// "not submitted".
func applyGroupUpdate(ctx context.Context, db *pgxpool.Pool, id int64, name, title, description *string) error {
	_, err := db.Exec(ctx, `
		UPDATE asset_groups SET
		  name        = coalesce($2, name),
		  title       = coalesce($3, title),
		  description = coalesce($4, description),
		  index_status = 'ok', updated_at = now(), checked_at = now()
		WHERE id = $1`, id, name, title, description)
	return err
}

// refreshAsset writes back what a GetAsset reported.
func refreshAsset(ctx context.Context, db *pgxpool.Pool, id int64, a UpstreamAsset) error {
	_, err := db.Exec(ctx, `
		UPDATE assets SET
		  name       = CASE WHEN $2 <> '' THEN $2 ELSE name END,
		  asset_type = CASE WHEN $3 <> '' THEN $3 ELSE asset_type END,
		  url        = CASE WHEN $4 <> '' THEN $4 ELSE url END,
		  status     = CASE WHEN $5 <> '' THEN $5 ELSE status END,
		  index_status = 'ok', updated_at = now(), checked_at = now()
		WHERE id = $1`, id, a.Name, a.AssetType, a.URL, a.Status)
	return err
}

// applyAssetUpdate writes exactly the fields the operator submitted.
func applyAssetUpdate(ctx context.Context, db *pgxpool.Pool, id int64, name *string) error {
	_, err := db.Exec(ctx, `
		UPDATE assets SET name = coalesce($2, name),
		  index_status = 'ok', updated_at = now(), checked_at = now()
		WHERE id = $1`, id, name)
	return err
}

// markMissing records that the upstream copy of an index row is gone. The
// row is kept: an operator has to be able to see that the index and the
// Volcengine console disagree, and DELETE still cleans it up.
func markMissing(ctx context.Context, db *pgxpool.Pool, table string, id int64) error {
	if table != "asset_groups" && table != "assets" {
		return fmt.Errorf("unknown table %q", table)
	}
	_, err := db.Exec(ctx, `UPDATE `+table+` SET index_status = 'missing', checked_at = now() WHERE id = $1`, id)
	return err
}

func deleteRow(ctx context.Context, db *pgxpool.Pool, table string, id int64) error {
	if table != "asset_groups" && table != "assets" {
		return fmt.Errorf("unknown table %q", table)
	}
	_, err := db.Exec(ctx, `DELETE FROM `+table+` WHERE id = $1`, id)
	return err
}

// ---------------------------------------------------------------- list queries

// listPage is one page of index rows, already JSON.
type listPage struct {
	Items []json.RawMessage
	Total int64
}

// listGroups returns a page of the group index, newest first, optionally for
// one account.
func listGroups(ctx context.Context, db *pgxpool.Pool, accountID int64, status string, limit, offset int) (*listPage, error) {
	const where = `WHERE ($1 = 0 OR g.account_id = $1) AND ($2 = '' OR g.index_status = $2)`
	out := &listPage{Items: []json.RawMessage{}}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM asset_groups g `+where, accountID, status).Scan(&out.Total); err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `
		SELECT to_jsonb(g) || jsonb_build_object('asset_count',
		         (SELECT count(*) FROM assets a WHERE a.group_id = g.id))
		FROM asset_groups g `+where+` ORDER BY g.id DESC LIMIT $3 OFFSET $4`, accountID, status, limit, offset)
	if err != nil {
		return nil, err
	}
	out.Items, err = collectJSON(rows)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// listAssets returns a page of the asset index, newest first, optionally for
// one account and/or one local group.
func listAssets(ctx context.Context, db *pgxpool.Pool, accountID, groupID int64, status string, limit, offset int) (*listPage, error) {
	const where = `WHERE ($1 = 0 OR a.account_id = $1) AND ($2 = 0 OR a.group_id = $2) AND ($3 = '' OR a.index_status = $3)`
	out := &listPage{Items: []json.RawMessage{}}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM assets a `+where, accountID, groupID, status).Scan(&out.Total); err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `
		SELECT to_jsonb(a) || jsonb_build_object('group_name', g.name, 'group_upstream_id', g.upstream_id)
		FROM assets a JOIN asset_groups g ON g.id = a.group_id `+where+`
		ORDER BY a.id DESC LIMIT $4 OFFSET $5`, accountID, groupID, status, limit, offset)
	if err != nil {
		return nil, err
	}
	out.Items, err = collectJSON(rows)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func collectJSON(rows pgx.Rows) ([]json.RawMessage, error) {
	defer rows.Close()
	items := []json.RawMessage{}
	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		items = append(items, json.RawMessage(raw))
	}
	return items, rows.Err()
}

// withAccountNames adds account_name to every row, from the id -> name map
// the caller built with one ListAccounts pass. Accounts live in the core and
// the plugin role cannot join them, and denormalizing the name into the
// index would make it go stale on every rename - so it is merged in here, at
// read time.
//
// Numbers are decoded as json.Number so a bigint id survives the round trip
// unrounded.
func withAccountNames(items []json.RawMessage, names map[int64]string) []json.RawMessage {
	out := make([]json.RawMessage, 0, len(items))
	for _, raw := range items {
		dec := json.NewDecoder(bytes.NewReader(raw))
		dec.UseNumber()
		var obj map[string]any
		if err := dec.Decode(&obj); err != nil {
			out = append(out, raw)
			continue
		}
		name := ""
		if n, ok := obj["account_id"].(json.Number); ok {
			if id, err := n.Int64(); err == nil {
				name = names[id]
			}
		}
		obj["account_name"] = name
		b, err := json.Marshal(obj)
		if err != nil {
			out = append(out, raw)
			continue
		}
		out = append(out, b)
	}
	return out
}

package dynweight

import (
	"cmp"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

// key identifies the state of an (account, group, client model).
type key struct {
	AccountID int64
	GroupID   int64
	Model     string
}

func compareKeys(a, b key) int {
	return cmp.Or(cmp.Compare(a.AccountID, b.AccountID), cmp.Compare(a.GroupID, b.GroupID), strings.Compare(a.Model, b.Model))
}

// store is the plugin schema.
type store struct{ db *pgxpool.Pool }

var errVersionConflict = errors.New("the configuration was changed meanwhile")

// loadConfig reads the configuration; version 0 means the default. The
// stored one is read tolerantly (rules.LoadConfig); warnings say what was
// raised, fell back or was dropped.
func (s store) loadConfig(ctx context.Context) (c rules.Config, version int64, warnings []string, err error) {
	var raw []byte
	err = s.db.QueryRow(ctx, `SELECT doc, version FROM config WHERE id = 1`).Scan(&raw, &version)
	if errors.Is(err, pgx.ErrNoRows) {
		return rules.DefaultConfig(), 0, nil, nil
	}
	if err != nil {
		return rules.Config{}, 0, nil, err
	}
	if c, warnings, err = rules.LoadConfig(raw); err != nil {
		return rules.Config{}, 0, nil, fmt.Errorf("stored configuration: %w", err)
	}
	return c, version, warnings, nil
}

// saveConfig stores a normalized configuration if version is still the
// stored one (0 = none stored yet), and returns the new version.
func (s store) saveConfig(ctx context.Context, c rules.Config, version, userID int64) (int64, error) {
	raw, err := json.Marshal(c)
	if err != nil {
		return 0, err
	}
	var tag pgconn.CommandTag
	if version == 0 {
		tag, err = s.db.Exec(ctx, `INSERT INTO config (id, doc, version, updated_by) VALUES (1, $1, 1, $2) ON CONFLICT (id) DO NOTHING`, raw, userID)
	} else {
		tag, err = s.db.Exec(ctx, `UPDATE config SET doc = $1, version = version + 1, updated_at = now(), updated_by = $2
			WHERE id = 1 AND version = $3`, raw, userID, version)
	}
	if err != nil {
		return 0, err
	}
	if tag.RowsAffected() == 0 {
		return 0, errVersionConflict
	}
	return version + 1, nil
}

func (s store) configVersion(ctx context.Context) (int64, error) {
	var v int64
	err := s.db.QueryRow(ctx, `SELECT version FROM config WHERE id = 1`).Scan(&v)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return v, err
}

// obsDelta is counters to add to a key's window.
type obsDelta struct {
	key
	window int64
	counts rules.Counts
}

// addObs adds counters; every node adds its own, so the fields are summed.
func (s store) addObs(ctx context.Context, deltas []obsDelta) error {
	b := &pgx.Batch{}
	for _, d := range deltas {
		fields, err := json.Marshal(d.counts.Fields())
		if err != nil {
			return err
		}
		b.Queue(`INSERT INTO obs (account_id, group_id, model, window_start, counts) VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (account_id, group_id, model, window_start) DO UPDATE SET counts = (
				SELECT jsonb_object_agg(f, COALESCE((obs.counts->>f)::bigint, 0) + COALESCE((EXCLUDED.counts->>f)::bigint, 0))
				FROM (SELECT jsonb_object_keys(obs.counts) UNION SELECT jsonb_object_keys(EXCLUDED.counts)) AS u(f))`,
			d.AccountID, d.GroupID, d.Model, d.window, fields)
	}
	return s.db.SendBatch(ctx, b).Close()
}

// loadObs reads the counters of the keys matching f in the windows from
// since on, by key and window start.
func (s store) loadObs(ctx context.Context, f filter, since int64) (map[key]map[int64]rules.Counts, error) {
	where, args := f.where(cond{"window_start >= $%d", since})
	rows, err := s.db.Query(ctx, `SELECT account_id, group_id, model, window_start, counts FROM obs`+where, args...)
	if err != nil {
		return nil, err
	}
	out := map[key]map[int64]rules.Counts{}
	var k key
	var window int64
	var fields map[string]int64
	_, err = pgx.ForEachRow(rows, []any{&k.AccountID, &k.GroupID, &k.Model, &window, &fields}, func() error {
		if out[k] == nil {
			out[k] = map[int64]rules.Counts{}
		}
		out[k][window] = rules.CountsOf(fields)
		fields = nil
		return nil
	})
	return out, err
}

// stateRow is a stored state with the generation it was read at.
type stateRow struct {
	rules.State
	gen int64
}

// loadStates reads states, all of them or those matching filter.
func (s store) loadStates(ctx context.Context, f filter) (map[key]stateRow, error) {
	where, args := f.where()
	rows, err := s.db.Query(ctx, `SELECT account_id, group_id, model, data, gen FROM state`+where, args...)
	if err != nil {
		return nil, err
	}
	out := map[key]stateRow{}
	var k key
	var raw []byte
	var gen int64
	_, err = pgx.ForEachRow(rows, []any{&k.AccountID, &k.GroupID, &k.Model, &raw, &gen}, func() error {
		var st rules.State
		if err := json.Unmarshal(raw, &st); err != nil {
			return fmt.Errorf("state %v: %w", k, err)
		}
		out[k] = stateRow{State: st, gen: gen}
		return nil
	})
	return out, err
}

// execer is the pool or a transaction.
type execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// writeState stores a state if the stored one is still at gen (0 = none
// stored). It reports false when another writer got there first. A sticky
// clear the evaluation decided is queued in the same transaction: it exists
// exactly when its state was written.
func (s store) writeState(ctx context.Context, k key, st rules.State, gen int64, clear *pendingClear) (bool, error) {
	raw, err := json.Marshal(st)
	if err != nil {
		return false, err
	}
	if clear == nil {
		return putState(ctx, s.db, k, st, raw, gen)
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // a no-op once committed
	if written, err := putState(ctx, tx, k, st, raw, gen); err != nil || !written {
		return false, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO sticky_pending (account_id, group_id, model, salt, percent, strategies, zero, weight)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (account_id, group_id, model) DO UPDATE SET salt = EXCLUDED.salt,
			percent = GREATEST(sticky_pending.percent, EXCLUDED.percent), strategies = EXCLUDED.strategies,
			zero = sticky_pending.zero OR EXCLUDED.zero, weight = EXCLUDED.weight, attempts = 0, created_at = now(), claimed_until = '-infinity'`,
		k.AccountID, k.GroupID, k.Model, clear.Salt, clear.Percent, clear.Strategies, clear.Zero, clear.Weight); err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}

func putState(ctx context.Context, db execer, k key, st rules.State, raw []byte, gen int64) (bool, error) {
	var tag pgconn.CommandTag
	var err error
	if gen == 0 {
		tag, err = db.Exec(ctx, `INSERT INTO state (account_id, group_id, model, data, base, eff, tombstone, eval_window)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
			k.AccountID, k.GroupID, k.Model, raw, st.WeightBase, st.WeightEff, st.Tombstone, st.LastEvalWindow)
	} else {
		tag, err = db.Exec(ctx, `UPDATE state SET data = $4, base = $5, eff = $6, tombstone = $7, eval_window = $8, gen = gen + 1, updated_at = now()
			WHERE account_id = $1 AND group_id = $2 AND model = $3 AND gen = $9`,
			k.AccountID, k.GroupID, k.Model, raw, st.WeightBase, st.WeightEff, st.Tombstone, st.LastEvalWindow, gen)
	}
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

// pendingClear is a sticky clear an evaluation decided (sticky_pending): the
// key, the salt (the window start), the share, the strategies that asked
// for it (", "-joined; none for the clear of a weight dropping to 0), and
// the key's effective weight then, for the event.
type pendingClear struct {
	key
	Salt       string
	Percent    int
	Strategies string
	Zero       bool
	Weight     float64
	Attempts   int
	CreatedAt  time.Time
}

// claimClears leases up to limit pending clears no other run holds, oldest
// first, counting the attempt.
func (s store) claimClears(ctx context.Context, lease time.Duration, limit int) ([]pendingClear, error) {
	rows, err := s.db.Query(ctx, `UPDATE sticky_pending p SET claimed_until = now() + make_interval(secs => $1), attempts = p.attempts + 1
		FROM (SELECT account_id, group_id, model FROM sticky_pending WHERE claimed_until < now()
			ORDER BY created_at LIMIT $2 FOR UPDATE SKIP LOCKED) c
		WHERE p.account_id = c.account_id AND p.group_id = c.group_id AND p.model = c.model
		RETURNING p.account_id, p.group_id, p.model, p.salt, p.percent, p.strategies, p.zero, p.weight, p.attempts, p.created_at`,
		lease.Seconds(), limit)
	if err != nil {
		return nil, err
	}
	out, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (pendingClear, error) {
		var c pendingClear
		return c, r.Scan(&c.AccountID, &c.GroupID, &c.Model, &c.Salt, &c.Percent, &c.Strategies, &c.Zero, &c.Weight, &c.Attempts, &c.CreatedAt)
	})
	slices.SortFunc(out, func(a, b pendingClear) int {
		return cmp.Or(a.CreatedAt.Compare(b.CreatedAt), compareKeys(a.key, b.key))
	})
	return out, err
}

// finishClear drops a pending clear (done, or given up) unless a newer one
// replaced it meanwhile.
func (s store) finishClear(ctx context.Context, c pendingClear) error {
	_, err := s.db.Exec(ctx, `DELETE FROM sticky_pending WHERE account_id = $1 AND group_id = $2 AND model = $3 AND salt = $4`,
		c.AccountID, c.GroupID, c.Model, c.Salt)
	return err
}

// releaseClear hands a pending clear back to the next run at once.
func (s store) releaseClear(ctx context.Context, c pendingClear) error {
	_, err := s.db.Exec(ctx, `UPDATE sticky_pending SET claimed_until = '-infinity' WHERE account_id = $1 AND group_id = $2 AND model = $3 AND salt = $4`,
		c.AccountID, c.GroupID, c.Model, c.Salt)
	return err
}

// tombstone resets keys whatever their generation, in one statement: all of
// them or none. window gives a key's reset window.
func (s store) tombstone(ctx context.Context, keys []key, window func(key) int64) error {
	n := len(keys)
	accounts, groups, models, docs, windows := make([]int64, n), make([]int64, n), make([]string, n), make([]string, n), make([]int64, n)
	// In key order, like the counters, so concurrent resets do not deadlock.
	for i, k := range slices.SortedFunc(slices.Values(keys), compareKeys) {
		w := window(k)
		raw, err := json.Marshal(rules.Tombstone(w))
		if err != nil {
			return err
		}
		accounts[i], groups[i], models[i], docs[i], windows[i] = k.AccountID, k.GroupID, k.Model, string(raw), w
	}
	_, err := s.db.Exec(ctx, `INSERT INTO state (account_id, group_id, model, data, base, eff, tombstone, eval_window)
		SELECT a, g, m, d::jsonb, 0, 0, true, w FROM unnest($1::bigint[], $2::bigint[], $3::text[], $4::text[], $5::bigint[]) AS t(a, g, m, d, w)
		ON CONFLICT (account_id, group_id, model) DO UPDATE SET data = EXCLUDED.data, base = 0, eff = 0, tombstone = true,
			eval_window = EXCLUDED.eval_window, gen = state.gen + 1, updated_at = now()`,
		accounts, groups, models, docs, windows)
	return err
}

// weight is the effective weight of a key that is not at its base.
type weight struct {
	base int
	eff  float64
}

// loadWeights reads the keys whose effective weight is not their base:
// everything scheduling needs.
func (s store) loadWeights(ctx context.Context) (map[key]weight, error) {
	rows, err := s.db.Query(ctx, `SELECT account_id, group_id, model, base, eff FROM state WHERE NOT tombstone AND eff <> base`)
	if err != nil {
		return nil, err
	}
	out := map[key]weight{}
	var k key
	var w weight
	_, err = pgx.ForEachRow(rows, []any{&k.AccountID, &k.GroupID, &k.Model, &w.base, &w.eff}, func() error {
		out[k] = w
		return nil
	})
	return out, err
}

// base is the weight an account has in a group, as scheduling saw it.
type base struct {
	Weight int
	Name   string
	SeenAt time.Time
}

type pair struct{ AccountID, GroupID int64 }

func comparePairs(a, b pair) int {
	return cmp.Or(cmp.Compare(a.AccountID, b.AccountID), cmp.Compare(a.GroupID, b.GroupID))
}

func (s store) loadBases(ctx context.Context) (map[pair]base, error) {
	rows, err := s.db.Query(ctx, `SELECT account_id, group_id, weight, name, seen_at FROM bases`)
	if err != nil {
		return nil, err
	}
	out := map[pair]base{}
	var p pair
	var b base
	_, err = pgx.ForEachRow(rows, []any{&p.AccountID, &p.GroupID, &b.Weight, &b.Name, &b.SeenAt}, func() error {
		out[p] = b
		return nil
	})
	return out, err
}

func (s store) saveBases(ctx context.Context, bases map[pair]base) error {
	b := &pgx.Batch{}
	// In pair order, like the counters, so concurrent batches do not deadlock.
	for _, p := range slices.SortedFunc(maps.Keys(bases), comparePairs) {
		v := bases[p]
		b.Queue(`INSERT INTO bases (account_id, group_id, weight, name, seen_at) VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (account_id, group_id) DO UPDATE SET weight = EXCLUDED.weight, name = EXCLUDED.name, seen_at = EXCLUDED.seen_at`,
			p.AccountID, p.GroupID, v.Weight, v.Name, v.SeenAt)
	}
	return s.db.SendBatch(ctx, b).Close()
}

// eventRow is an event of a key.
type eventRow struct {
	key
	rules.Event
	Detail map[string]any
}

func (s store) addEvents(ctx context.Context, events []eventRow) error {
	b := &pgx.Batch{}
	for _, e := range events {
		detail := maps.Clone(e.Detail)
		if detail == nil {
			detail = map[string]any{}
		}
		if e.Window != nil {
			detail["window"] = e.Window
		}
		raw, err := json.Marshal(detail)
		if err != nil {
			return err
		}
		names := e.Rules
		if names == nil {
			names = []string{}
		}
		b.Queue(`INSERT INTO events (account_id, group_id, model, kind, reason, weight_from, weight_to, rules, detail)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			e.AccountID, e.GroupID, e.Model, e.Kind, e.Reason, e.From, e.To, names, raw)
	}
	return s.db.SendBatch(ctx, b).Close()
}

// keys lists the keys matching f with a state, or with counters from since on.
func (s store) keys(ctx context.Context, f filter, since int64) ([]key, error) {
	stateWhere, stateArgs := f.where()
	obsWhere, obsArgs := f.whereFrom(len(stateArgs)+1, cond{"window_start >= $%d", since})
	rows, err := s.db.Query(ctx, `SELECT account_id, group_id, model FROM state`+stateWhere+
		` UNION SELECT account_id, group_id, model FROM obs`+obsWhere, append(stateArgs, obsArgs...)...)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (key, error) {
		var k key
		return k, r.Scan(&k.AccountID, &k.GroupID, &k.Model)
	})
}

// listEvents pages the events matching f (and kind), newest first.
func (s store) listEvents(ctx context.Context, f filter, kind string, limit, offset int) ([]eventItem, int64, error) {
	var extra []cond
	if kind != "" {
		extra = append(extra, cond{"kind = $%d", kind})
	}
	where, args := f.where(extra...)
	var total int64
	if err := s.db.QueryRow(ctx, `SELECT count(*) FROM events`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	n := len(args)
	// The account's name as scheduling last saw it, in any group.
	rows, err := s.db.Query(ctx, `SELECT id, created_at, account_id, COALESCE((SELECT b.name FROM bases b
			WHERE b.account_id = events.account_id ORDER BY b.seen_at DESC LIMIT 1), ''),
		group_id, model, kind, reason, weight_from, weight_to, rules, detail
		FROM events`+where+fmt.Sprintf(" ORDER BY id DESC LIMIT $%d OFFSET $%d", n+1, n+2), append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	items, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (eventItem, error) {
		var e eventItem
		return e, r.Scan(&e.ID, &e.CreatedAt, &e.AccountID, &e.AccountName, &e.GroupID, &e.Model, &e.Kind, &e.Reason, &e.From, &e.To, &e.Rules, &e.Detail)
	})
	return items, total, err
}

// filter narrows states and events to accounts, a group and a model (zero
// values match everything).
type filter struct {
	AccountID  int64   `json:"account_id"`
	AccountIDs []int64 `json:"account_ids"` // POST /reset only: AccountID or any of these
	GroupID    int64   `json:"group_id"`
	Model      string  `json:"model"`
}

// accounts lists the accounts f narrows to, none for every account.
func (f filter) accounts() []int64 {
	ids := slices.DeleteFunc(slices.Clone(f.AccountIDs), func(id int64) bool { return id <= 0 })
	if f.AccountID > 0 {
		ids = append(ids, f.AccountID)
	}
	slices.Sort(ids)
	return slices.Compact(ids)
}

// cond is an SQL condition with one %d placeholder for its argument.
type cond struct {
	sql string
	arg any
}

// where builds the WHERE clause of f and the extra conditions.
func (f filter) where(extra ...cond) (string, []any) { return f.whereFrom(1, extra...) }

// whereFrom is where with the placeholders numbered from first on.
func (f filter) whereFrom(first int, extra ...cond) (string, []any) {
	var conds []cond
	if ids := f.accounts(); len(ids) > 0 {
		conds = append(conds, cond{"account_id = ANY($%d)", ids})
	}
	if f.GroupID > 0 {
		conds = append(conds, cond{"group_id = $%d", f.GroupID})
	}
	if f.Model != "" {
		conds = append(conds, cond{"model = $%d", f.Model})
	}
	conds = append(conds, extra...)
	if len(conds) == 0 {
		return "", nil
	}
	parts, args := make([]string, len(conds)), make([]any, len(conds))
	for i, c := range conds {
		parts[i], args[i] = fmt.Sprintf(c.sql, first+i), c.arg
	}
	return " WHERE " + strings.Join(parts, " AND "), args
}

// prune deletes the counters older than since, the events older than
// eventsBefore, the states with nothing left to evaluate (at the base or
// reset, without counters since), the bases and states of pairs scheduling
// has not seen since staleBefore, and the pending sticky clears queued
// before clearsBefore (the evaluate job gives up on them much sooner; this
// only catches what a crash left).
func (s store) prune(ctx context.Context, since int64, eventsBefore, staleBefore, clearsBefore time.Time) (int64, error) {
	var n int64
	for _, q := range []struct {
		sql string
		arg any
	}{
		{`DELETE FROM obs WHERE window_start < $1`, since},
		{`DELETE FROM events WHERE created_at < $1`, eventsBefore},
		{`DELETE FROM state s WHERE (tombstone OR eff = base) AND eval_window < $1 AND NOT EXISTS (
			SELECT 1 FROM obs o WHERE o.account_id = s.account_id AND o.group_id = s.group_id AND o.model = s.model)`, since},
		{`DELETE FROM state s WHERE NOT EXISTS (SELECT 1 FROM bases b WHERE b.account_id = s.account_id AND b.group_id = s.group_id AND b.seen_at >= $1)`, staleBefore},
		{`DELETE FROM bases WHERE seen_at < $1`, staleBefore},
		{`DELETE FROM sticky_pending WHERE created_at < $1`, clearsBefore},
	} {
		tag, err := s.db.Exec(ctx, q.sql, q.arg)
		if err != nil {
			return n, err
		}
		n += tag.RowsAffected()
	}
	return n, nil
}

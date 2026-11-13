package segment

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

type fakeTokens struct{}

func (fakeTokens) VerifyAccessToken(_ context.Context, tok string) (int64, error) {
	return strconv.ParseInt(strings.TrimPrefix(tok, "u"), 10, 64)
}

// fakeAuthz holds, per user, which permissions they have; a user without an
// entry has none.
type fakeAuthz map[int64]func(permission string) bool

func (a fakeAuthz) Can(_ context.Context, uid int64, permission string) (bool, error) {
	return a[uid] != nil && a[uid](permission), nil
}
func (fakeAuthz) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}
func (fakeAuthz) CanGrant(context.Context, int64, []string) error { return nil }
func (fakeAuthz) CanActOn(context.Context, int64, []string) error { return nil }
func (fakeAuthz) CanActOnUsers(context.Context, int64, core.UserAction, ...int64) error {
	return nil
}

// env is the segment service behind the real router. admin has every
// permission, masked every one but user:read, plain none. All three are
// members of the default segment.
type env struct {
	t                    *testing.T
	db                   *store.DB
	svc                  *Service
	h                    http.Handler
	admin, masked, plain int64
	// rulesChanged counts the PriceRulesChanged calls.
	rulesChanged atomic.Int64
}

func setup(t *testing.T) *env {
	t.Helper()
	gin.SetMode(gin.TestMode)
	e := &env{t: t, db: testutil.DB(t)}
	e.admin, e.masked, e.plain = e.user("admin@x.com"), e.user("masked@x.com"), e.user("plain@x.com")
	authz := fakeAuthz{
		e.admin:  func(string) bool { return true },
		e.masked: func(p string) bool { return p != "user:read" },
	}
	engine := gin.New()
	e.svc = New(Deps{
		DB: e.db, Authz: authz, Users: authz,
		Platforms: func(_ context.Context, ids []int64) (map[int64][]string, error) {
			out := map[int64][]string{}
			for _, id := range ids {
				out[id] = []string{"anthropic"}
			}
			return out, nil
		},
		PriceRulesChanged: func(context.Context) { e.rulesChanged.Add(1) },
		RuleCounts:        e.ruleCounts,
	})
	e.svc.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, authz))
	e.h = engine
	return e
}

// goneModel is a model no group provides any more: its rules stay stored, and
// group.Service.SegmentRuleCounts, which ruleCounts stands in for, leaves
// them out. Which models a group provides is the group package's to tell.
const goneModel = "gone"

func (e *env) ruleCounts(ctx context.Context, segmentIDs []int64) (map[int64]map[int64]int64, error) {
	rows, err := e.db.Pool.Query(ctx, `SELECT segment_id, group_id, count(*) FROM price_rules
		WHERE segment_id = ANY($1) AND model <> $2 GROUP BY 1, 2`, segmentIDs, goneModel)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int64]map[int64]int64{}
	for rows.Next() {
		var segment, group, n int64
		if err := rows.Scan(&segment, &group, &n); err != nil {
			return nil, err
		}
		if out[segment] == nil {
			out[segment] = map[int64]int64{}
		}
		out[segment][group] = n
	}
	return out, rows.Err()
}

// What another writer did to a transaction is a conflict to try again, not a
// failure; any other error stays what it is.
func TestTxConflicts(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	failure := errors.New("failure")
	for _, tc := range []struct {
		name     string
		fn       func(tx pgx.Tx) error
		conflict bool
	}{
		{"a row referred to is gone", func(tx pgx.Tx) error {
			_, err := tx.Exec(ctx, `INSERT INTO segment_groups (segment_id, group_id, granted) VALUES (default_segment_id(), 999999, true)`)
			return err
		}, true},
		{"a deadlock", func(pgx.Tx) error { return &pgconn.PgError{Code: "40P01"} }, true},
		{"another error", func(pgx.Tx) error { return failure }, false},
	} {
		err := e.svc.tx(ctx, tc.fn)
		if !tc.conflict {
			require.Equal(t, failure, err, tc.name)
			continue
		}
		var ce *core.Error
		require.ErrorAs(t, err, &ce, tc.name)
		require.Equal(t, core.ErrConflict.Code, ce.Code, tc.name)
	}
	require.NoError(t, e.svc.tx(ctx, func(pgx.Tx) error { return nil }))
}

// id runs an INSERT ... RETURNING id (or any query of one integer).
func (e *env) id(sql string, args ...any) int64 {
	e.t.Helper()
	var id int64
	require.NoError(e.t, e.db.Pool.QueryRow(context.Background(), sql, args...).Scan(&id))
	return id
}

func (e *env) exec(sql string, args ...any) {
	e.t.Helper()
	_, err := e.db.Pool.Exec(context.Background(), sql, args...)
	require.NoError(e.t, err)
}

func (e *env) user(email string) int64 {
	return e.id(`INSERT INTO users (email, password_hash, display_name) VALUES ($1, 'x', $2) RETURNING id`, email, "name of "+email)
}

func (e *env) defaultSegment() int64 { return e.id(`SELECT default_segment_id()`) }

func (e *env) segment(name, discount string) int64 {
	return e.id(`INSERT INTO segments (name, discount) VALUES ($1, $2::numeric) RETURNING id`, name, discount)
}

// personal makes the user personal, coming from the segment they are in.
func (e *env) personal(user int64) int64 {
	id := e.id(`INSERT INTO segments (kind, user_id, origin_id) SELECT 'personal', id, segment_id FROM users WHERE id = $1 RETURNING id`, user)
	e.exec(`UPDATE users SET segment_id = $2 WHERE id = $1`, user, id)
	return id
}

func (e *env) group(name, visibility, rate string) int64 {
	return e.id(`INSERT INTO groups (name, visibility, rate_multiplier) VALUES ($1, $2, $3::numeric) RETURNING id`, name, visibility, rate)
}

// pair sets what a segment has in a group; override "" = none.
func (e *env) pair(segment, group int64, granted bool, override string) {
	e.exec(`INSERT INTO segment_groups (segment_id, group_id, granted, rate_override) VALUES ($1, $2, $3, NULLIF($4, '')::numeric)`,
		segment, group, granted, override)
}

// rule gives the segment (0 = the group itself) a model price in the group.
func (e *env) rule(group, segment int64, model string) {
	e.exec(`INSERT INTO price_rules (group_id, segment_id, model, kind, multiplier) VALUES ($1, NULLIF($2, 0), $3, 'multiplier', 0.8)`,
		group, segment, model)
}

func (e *env) segmentOf(user int64) int64 {
	return e.id(`SELECT segment_id FROM users WHERE id = $1`, user)
}

// response is a decoded API answer.
type response struct {
	t    *testing.T
	code int
	body map[string]any
}

func (e *env) do(uid int64, method, path string, body any) response {
	e.t.Helper()
	var raw []byte
	if body != nil {
		raw, _ = json.Marshal(body)
	}
	req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewReader(raw))
	req.Header.Set("Authorization", fmt.Sprintf("Bearer u%d", uid))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	e.h.ServeHTTP(w, req)
	r := response{t: e.t, code: w.Code}
	_ = json.Unmarshal(w.Body.Bytes(), &r.body)
	return r
}

// ok requires the status and returns the response.
func (r response) ok(code int) response {
	r.t.Helper()
	require.Equal(r.t, code, r.code, "%v", r.body)
	return r
}

func (r response) data() map[string]any { return r.body["data"].(map[string]any) }

func (r response) rows() []map[string]any {
	items := r.body["data"].([]any)
	out := make([]map[string]any, len(items))
	for i, it := range items {
		out[i] = it.(map[string]any)
	}
	return out
}

func (r response) total() float64 { return r.body["page"].(map[string]any)["total"].(float64) }

// failed requires an error of the status and the code.
func (r response) failed(status int, code string) map[string]any {
	r.t.Helper()
	require.Equal(r.t, status, r.code, "%v", r.body)
	e := r.body["error"].(map[string]any)
	require.Equal(r.t, code, e["code"])
	return e
}

// invalid requires a 400 whose first field error is about the field, and
// returns that field error.
func (r response) invalid(field string) map[string]any {
	r.t.Helper()
	fe := r.failed(400, "invalid_argument")["details"].(map[string]any)["fields"].([]any)[0].(map[string]any)
	require.Equal(r.t, field, fe["field"])
	return fe
}

func idOf(row map[string]any) int64 { return int64(row["id"].(float64)) }

// names lists what pick gives of each row.
func names(rows []map[string]any, pick func(map[string]any) any) []any {
	out := make([]any, len(rows))
	for i, r := range rows {
		out[i] = pick(r)
	}
	return out
}

func path(format string, args ...any) string { return fmt.Sprintf(format, args...) }

// concurrently runs fn(0..n-1) at once and returns the status codes.
func concurrently(n int, fn func(i int) int) []int {
	codes := make([]int, n)
	var wg sync.WaitGroup
	for i := range codes {
		wg.Add(1)
		go func() {
			defer wg.Done()
			codes[i] = fn(i)
		}()
	}
	wg.Wait()
	return codes
}

func count(codes []int, code int) int {
	n := 0
	for _, c := range codes {
		if c == code {
			n++
		}
	}
	return n
}

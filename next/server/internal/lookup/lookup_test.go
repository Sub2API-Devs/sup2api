package lookup

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"slices"
	"strconv"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// fakeTokens reads the bearer token as the user id.
type fakeTokens struct{}

func (fakeTokens) VerifyAccessToken(_ context.Context, tok string) (int64, error) {
	return strconv.ParseInt(tok, 10, 64)
}

// fakeAuthz holds the permissions of each user.
type fakeAuthz map[int64][]string

func (a fakeAuthz) Can(_ context.Context, uid int64, permission string) (bool, error) {
	return slices.Contains(a[uid], permission), nil
}
func (fakeAuthz) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}
func (fakeAuthz) CanGrant(context.Context, int64, []string) error { return nil }
func (fakeAuthz) CanActOn(context.Context, int64, []string) error { return nil }

// fixture is one database with rows of every kind. Every name holds "lk".
//
//	admin  reads every kind in full
//	alice  has the self-service and "own" permissions; owns key "lk key one",
//	       account "lk acct a" and proxy "lk proxy a"; is assigned group alpha
//	bob    has no permission; only his display name holds "zhang" and "_"
type fixture struct {
	t  *testing.T
	db *store.DB
	h  http.Handler

	admin, alice, bob int64
	// zeta is public, alpha restricted (alice only) and named after zeta's
	// id, hidden restricted with no member; "lk 100%_off" is disabled.
	zeta, alpha, hidden   int64
	keyOne, acctC, proxyA int64
}

func newFixture(t *testing.T) *fixture {
	gin.SetMode(gin.TestMode)
	f := &fixture{t: t, db: testutil.DB(t)}
	f.admin = f.insert(`INSERT INTO users (email, password_hash) VALUES ('lk-admin@x.test', 'x') RETURNING id`)
	f.alice = f.insert(`INSERT INTO users (email, display_name, password_hash) VALUES ('lk-alice@x.test', 'Alice', 'x') RETURNING id`)
	f.bob = f.insert(`INSERT INTO users (email, display_name, password_hash) VALUES ('lk-bob@x.test', 'Bob_Zhang', 'x') RETURNING id`)
	f.insert(`INSERT INTO users (email, password_hash, deleted_at) VALUES ('lk-gone@x.test', 'x', now()) RETURNING id`)

	// A group id no other fixture name contains, for the search by id.
	f.insert(`SELECT setval('groups_id_seq', 4710)`)
	group := `INSERT INTO groups (name, visibility, status, model_filter_mode, model_allowlist) VALUES ($1, $2, $3, 'whitelist', $4::jsonb) RETURNING id`
	f.zeta = f.insert(group, "lk zeta", "public", "active", `["lk-claude-*"]`)
	f.alpha = f.insert(group, fmt.Sprintf("lk alpha %d", f.zeta), "restricted", "active", `["lk-gemini-*"]`)
	f.hidden = f.insert(group, "lk hidden", "restricted", "active", `[]`)
	f.insert(group, "lk 100%_off", "public", "disabled", `[]`)
	f.insert(`INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2) RETURNING group_id`, f.alice, f.alpha)

	key := `INSERT INTO api_keys (user_id, name, key_prefix, key_hash, deleted_at) VALUES ($1, $2, $3, $2, $4::timestamptz) RETURNING id`
	f.keyOne = f.insert(key, f.alice, "lk key one", "sk-s2a-aaaa", nil)
	f.insert(key, f.alice, "lk key two", "sk-s2a-cccc", "2026-01-01T00:00:00Z")
	f.insert(key, f.bob, "lk key bob", "sk-s2a-bbbb", nil)

	account := `INSERT INTO accounts (name, plugin_key, type, credentials_enc, status, created_by, deleted_at)
		VALUES ($1, 'anthropic', 'apikey', ''::bytea, $2, $3, $4::timestamptz) RETURNING id`
	f.insert(account, "lk acct a", "active", f.alice, nil)
	b := f.insert(account, "lk acct b", "active", f.admin, nil)
	f.acctC = f.insert(account, "lk acct c", "disabled", nil, nil)
	f.insert(account, "lk acct d", "active", f.admin, "2026-01-01T00:00:00Z")
	f.insert(`INSERT INTO account_groups (account_id, group_id) VALUES ($1, $3), ($2, $3) RETURNING group_id`, b, f.acctC, f.zeta)

	proxy := `INSERT INTO proxies (name, protocol, host, port, created_by) VALUES ($1, 'http', 'proxy.example', 3128, $2) RETURNING id`
	f.proxyA = f.insert(proxy, "lk proxy a", f.alice)
	f.insert(proxy, "lk proxy b", f.admin)

	price := `INSERT INTO model_prices (model, mode, expression, expr_hash, source, enabled) VALUES ($1, 'expression', '0', 'h', 'manual', $2) RETURNING id`
	f.insert(price, "lk-claude-a", true)
	f.insert(price, "lk-claude-b", false)
	f.insert(price, "lk-gemini-1", true)
	f.insert(price, "lk-gpt-x", true)

	engine := gin.New()
	authz := fakeAuthz{
		f.admin: {"user:read", "group:read", "usage:all:read", "account:read", "price:read", "proxy:read"},
		f.alice: {"apikey:self:manage", "account:own:read", "proxy:own:read"},
	}
	New(f.db, authz).RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, authz))
	f.h = engine
	return f
}

// insert runs a statement that returns one id.
func (f *fixture) insert(sql string, args ...any) (id int64) {
	f.t.Helper()
	require.NoError(f.t, f.db.Pool.QueryRow(context.Background(), sql, args...).Scan(&id))
	return id
}

// get calls GET /api/v1/lookup/<path> as uid.
func (f *fixture) get(uid int64, path string) *httptest.ResponseRecorder {
	req := httptest.NewRequest("GET", "/api/v1/lookup/"+path, nil)
	req.Header.Set("Authorization", "Bearer "+strconv.FormatInt(uid, 10))
	w := httptest.NewRecorder()
	f.h.ServeHTTP(w, req)
	return w
}

func TestLookup(t *testing.T) {
	f := newFixture(t)
	zeta, alpha := strconv.FormatInt(f.zeta, 10), strconv.FormatInt(f.alpha, 10)
	alphaName := "lk alpha " + zeta

	found := []struct {
		name string
		uid  int64
		path string
		want []string // names, in order
		more bool
	}{
		{"name contains, any case, by name", f.admin, "users?q=LK-A", []string{"lk-admin@x.test", "lk-alice@x.test"}, false},
		{"no q lists by name", f.admin, "groups", []string{"lk 100%_off", alphaName, "lk hidden", "lk zeta"}, false},
		{"digits match the id too, id first", f.admin, "groups?q=" + zeta, []string{"lk zeta", alphaName}, false},
		{"digits too long for an id are a name", f.admin, "groups?q=99999999999999999999", []string{}, false},
		{"ids, unknown left out, q and limit ignored", f.admin, "groups?ids=" + zeta + "," + alpha + ",999999&q=none&limit=1", []string{alphaName, "lk zeta"}, false},
		{"limit cuts and says so", f.admin, "groups?q=lk&limit=2", []string{"lk 100%_off", alphaName}, true},
		{"limit not reached", f.admin, "groups?q=lk&limit=4", []string{"lk 100%_off", alphaName, "lk hidden", "lk zeta"}, false},
		{"percent is literal", f.admin, "groups?q=%25", []string{"lk 100%_off"}, false},
		{"underscore is literal", f.admin, "groups?q=_", []string{"lk 100%_off"}, false},
		{"users by display name", f.admin, "users?q=zhang", []string{"lk-bob@x.test"}, false},
		{"underscore is literal in the display name", f.admin, "users?q=_", []string{"lk-bob@x.test"}, false},
		{"deleted user", f.admin, "users?q=lk-gone", []string{}, false},
		{"deleted key", f.admin, "api-keys?q=lk", []string{"lk key bob", "lk key one"}, false},

		{"groups mine: public and assigned, active", f.alice, "groups?mine=true", []string{alphaName, "lk zeta"}, false},
		{"groups mine needs no permission", f.bob, "groups?mine=true", []string{"lk zeta"}, false},
		{"ids outside the caller's range", f.alice, "groups?mine=true&ids=" + strconv.FormatInt(f.hidden, 10), []string{}, false},
		{"api-keys of one user", f.admin, "api-keys?user_id=" + strconv.FormatInt(f.alice, 10), []string{"lk key one"}, false},
		{"api-keys mine", f.alice, "api-keys?mine=true", []string{"lk key one"}, false},
		{"accounts", f.admin, "accounts?q=lk", []string{"lk acct a", "lk acct b", "lk acct c"}, false},
		{"accounts of the preferred group first", f.admin, "accounts?q=lk&prefer_group_id=" + zeta, []string{"lk acct b", "lk acct c", "lk acct a"}, false},
		{"accounts with the own permission", f.alice, "accounts", []string{"lk acct a"}, false},
		{"accounts mine under the full permission", f.admin, "accounts?mine=true", []string{"lk acct b"}, false},
		{"proxies", f.admin, "proxies", []string{"lk proxy a", "lk proxy b"}, false},
		{"proxies with the own permission", f.alice, "proxies", []string{"lk proxy a"}, false},
		{"models include disabled prices", f.admin, "models", []string{"lk-claude-a", "lk-claude-b", "lk-gemini-1", "lk-gpt-x"}, false},
		{"models have no numeric id", f.admin, "models?q=1", []string{"lk-gemini-1"}, false},
		{"models by name", f.admin, "models?ids=lk-gpt-x,nope", []string{"lk-gpt-x"}, false},
		{"models mine: enabled and allowed by one of the caller's groups", f.alice, "models?mine=true", []string{"lk-claude-a", "lk-gemini-1"}, false},
	}
	for _, tc := range found {
		t.Run(tc.name, func(t *testing.T) {
			w := f.get(tc.uid, tc.path)
			require.Equal(t, 200, w.Code, w.Body.String())
			var out struct{ Data Result }
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
			names := []string{}
			for _, it := range out.Data.Items {
				names = append(names, it.Name)
			}
			require.Equal(t, tc.want, names)
			require.Equal(t, tc.more, out.Data.More)
		})
	}

	// The whole answer: a numeric id with hint and status, empty fields left
	// out, the model name as the id of a model.
	shapes := []struct {
		name string
		uid  int64
		path string
		want string // the one item, "" for none
	}{
		{"user", f.admin, "users?ids=" + strconv.FormatInt(f.alice, 10),
			fmt.Sprintf(`{"id":%d,"name":"lk-alice@x.test","hint":"Alice","status":"active"}`, f.alice)},
		{"group has no hint", f.admin, "groups?ids=" + zeta, `{"id":` + zeta + `,"name":"lk zeta","status":"active"}`},
		{"key: owner", f.admin, "api-keys?q=one",
			fmt.Sprintf(`{"id":%d,"name":"lk key one","hint":"lk-alice@x.test","status":"active"}`, f.keyOne)},
		{"key mine: prefix", f.alice, "api-keys?mine=true",
			fmt.Sprintf(`{"id":%d,"name":"lk key one","hint":"sk-s2a-aaaa","status":"active"}`, f.keyOne)},
		{"account: plugin, status as stored", f.admin, "accounts?q=acct%20c",
			fmt.Sprintf(`{"id":%d,"name":"lk acct c","hint":"anthropic","status":"disabled"}`, f.acctC)},
		{"proxy: address", f.alice, "proxies",
			fmt.Sprintf(`{"id":%d,"name":"lk proxy a","hint":"http://proxy.example:3128","status":"active"}`, f.proxyA)},
		{"model", f.admin, "models?q=gpt", `{"id":"lk-gpt-x","name":"lk-gpt-x"}`},
		{"nothing found", f.admin, "models?q=none", ""},
	}
	for _, tc := range shapes {
		t.Run("shape/"+tc.name, func(t *testing.T) {
			w := f.get(tc.uid, tc.path)
			require.Equal(t, 200, w.Code, w.Body.String())
			require.JSONEq(t, `{"data":{"items":[`+tc.want+`],"more":false}}`, w.Body.String())
		})
	}

	refused := []struct {
		name   string
		uid    int64
		path   string
		status int
	}{
		{"users without user:read", f.alice, "users", 403},
		{"groups without group:read", f.alice, "groups", 403},
		{"api-keys without usage:all:read", f.alice, "api-keys", 403},
		{"api-keys mine without apikey:self:manage", f.bob, "api-keys?mine=true", 403},
		{"accounts without either permission", f.bob, "accounts", 403},
		{"accounts mine without either permission", f.bob, "accounts?mine=true", 403},
		{"models without price:read", f.alice, "models", 403},
		{"models mine without apikey:self:manage", f.bob, "models?mine=true", 403},
		{"proxies without either permission", f.bob, "proxies", 403},
		{"users have no mine", f.admin, "users?mine=true", 400},
		{"limit 0", f.admin, "groups?limit=0", 400},
		{"limit over the maximum", f.admin, "groups?limit=51", 400},
		{"limit not a number", f.admin, "groups?limit=x", 400},
		{"ids not numbers", f.admin, "groups?ids=1,x", 400},
		{"ids not positive", f.admin, "groups?ids=0", 400},
		{"over 100 ids", f.admin, "groups?ids=" + strings.Repeat("1,", 100) + "1", 400},
		{"empty model name in ids", f.admin, "models?ids=a,,b", 400},
		{"mine not a boolean", f.admin, "groups?mine=maybe", 400},
		{"q too long", f.admin, "groups?q=" + strings.Repeat("a", 257), 400},
		{"user_id not positive", f.admin, "api-keys?user_id=-1", 400},
		{"prefer_group_id not a number", f.admin, "accounts?prefer_group_id=abc", 400},
		{"unknown kind", f.admin, "nothing", 404},
	}
	for _, tc := range refused {
		t.Run("refused/"+tc.name, func(t *testing.T) {
			w := f.get(tc.uid, tc.path)
			require.Equal(t, tc.status, w.Code, w.Body.String())
		})
	}
}

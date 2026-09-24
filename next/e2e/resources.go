package e2e

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/tidwall/gjson"
)

// Body shapes follow docs/CONTRACTS.md §5. Where the contract leaves a body
// open (POST /roles, POST /groups, POST /me/api-keys, price config) the
// assumed fields are marked "ASSUMED" and listed in deploy/README.md.

// ------------------------------------------------------------------ users & roles

// UserSpec describes a user to create.
type UserSpec struct {
	Email          string
	Password       string
	DisplayName    string
	Roles          []string
	MaxConcurrency int
}

// CreateUser creates a user with POST /users and logs in as that user.
func (e *Env) CreateUser(admin *Session, u UserSpec) *Session {
	e.T.Helper()
	if u.Email == "" {
		u.Email = e.Name("user") + "@e2e.test"
	}
	if u.Password == "" {
		u.Password = "E2e-" + e.RunID + "-pass!"
	}
	if u.DisplayName == "" {
		u.DisplayName = u.Email
	}
	if u.Roles == nil {
		u.Roles = []string{"user"}
	}
	if u.MaxConcurrency == 0 {
		u.MaxConcurrency = 10
	}
	// Assigning a non-default role at creation needs role:manage + step-up.
	var opts []ReqOpt
	if len(u.Roles) != 1 || u.Roles[0] != "user" {
		opts = append(opts, admin.StepUp(e.T))
	}
	d := admin.OK(e.T, http.MethodPost, "/users", map[string]any{
		"email": u.Email, "display_name": u.DisplayName, "password": u.Password,
		"role_keys": u.Roles, "max_concurrency": u.MaxConcurrency,
	}, opts...)
	id := d.Get("id").Int()
	if id == 0 {
		e.T.Fatalf("POST /users returned no id: %s", d.Raw)
	}
	s := e.Login(u.Email, u.Password)
	if s.UserID != 0 && s.UserID != id {
		e.T.Fatalf("login user id %d != created id %d", s.UserID, id)
	}
	s.UserID = id
	return s
}

// CreateRole creates a role (ASSUMED body {key, name, description}) and sets
// its permissions with PUT /roles/:id/permissions.
func (e *Env) CreateRole(admin *Session, key, name string, perms []string) int64 {
	e.T.Helper()
	d := admin.OK(e.T, http.MethodPost, "/roles", map[string]any{
		"key":         key,
		"name":        map[string]string{"en": name, "zh": name},
		"description": map[string]string{"en": "created by e2e"},
	}, admin.StepUp(e.T))
	id := d.Get("id").Int()
	if id == 0 {
		e.T.Fatalf("POST /roles returned no id: %s", d.Raw)
	}
	admin.OK(e.T, http.MethodPut, fmt.Sprintf("/roles/%d/permissions", id), map[string]any{"permission_keys": perms}, admin.StepUp(e.T))
	return id
}

// SetUserRoles replaces a user's roles.
func (e *Env) SetUserRoles(admin *Session, userID int64, roles []string) {
	e.T.Helper()
	admin.OK(e.T, http.MethodPut, fmt.Sprintf("/users/%d/roles", userID), map[string]any{"role_keys": roles}, admin.StepUp(e.T))
}

// SetUserGroups replaces the groups a user may use.
func (e *Env) SetUserGroups(admin *Session, userID int64, groupIDs []int64) {
	e.T.Helper()
	admin.OK(e.T, http.MethodPut, fmt.Sprintf("/users/%d/groups", userID), map[string]any{"group_ids": groupIDs})
}

// ------------------------------------------------------------------ groups, keys

// CreateGroup creates a group (ASSUMED body fields = groups table columns).
func (e *Env) CreateGroup(admin *Session, name, visibility string, rate float64, allow []string) int64 {
	e.T.Helper()
	if allow == nil {
		allow = []string{}
	}
	d := admin.OK(e.T, http.MethodPost, "/groups", map[string]any{
		"name": name, "description": "e2e", "visibility": visibility,
		"rate_multiplier": strconv.FormatFloat(rate, 'f', -1, 64), "model_allowlist": allow,
	})
	id := d.Get("id").Int()
	if id == 0 {
		e.T.Fatalf("POST /groups returned no id: %s", d.Raw)
	}
	return id
}

// CreateAPIKey creates a key for the session's user (ASSUMED body
// {name, group_id}); returns the id and the one-time plaintext key.
func (e *Env) CreateAPIKey(u *Session, groupID int64) (int64, string) {
	e.T.Helper()
	d := u.OK(e.T, http.MethodPost, "/me/api-keys", map[string]any{"name": e.Name("key"), "group_id": groupID})
	key := d.Get("key").String()
	if len(key) < 12 || key[:7] != "sk-s2a-" {
		e.T.Fatalf("api key must be returned once with sk-s2a- prefix: %s", d.Raw)
	}
	return d.Get("id").Int(), key
}

// ------------------------------------------------------------------ accounts

// Account types used by the tests: (plugin_key, type) identifies an account
// type (ARCHITECTURE 6.6, CONTRACTS 12).
const (
	AnthropicPlugin = "anthropic"
	AnthropicAPIKey = "apikey" // declared by the built-in anthropic plugin
	RelayPlugin     = "relay"
	RelayKey        = "relay_key" // declared by the market plugin relay
)

// AccountSpec describes an account pointing at the mock. The default type
// is anthropic/apikey; relay/relay_key takes the same credentials (api_key,
// base_url, model_mapping).
type AccountSpec struct {
	Name           string
	PluginKey      string // default AnthropicPlugin
	Type           string // default AnthropicAPIKey
	GroupIDs       []int64
	APIKey         string // upstream key; the mock records it as x-api-key
	BaseURL        string // default: mock-upstream
	Priority       int
	MaxConcurrency int
	ModelMapping   map[string]string
}

// CreateAccount creates an account (POST /accounts with plugin_key + type).
func (e *Env) CreateAccount(admin *Session, a AccountSpec) int64 {
	e.T.Helper()
	if a.Name == "" {
		a.Name = e.Name("acct")
	}
	if a.PluginKey == "" {
		a.PluginKey, a.Type = AnthropicPlugin, AnthropicAPIKey
	}
	if a.APIKey == "" {
		a.APIKey = "sk-ant-mock-" + e.Name("k")
	}
	if a.BaseURL == "" {
		a.BaseURL = e.MockInternalURL
	}
	if a.Priority == 0 {
		a.Priority = 10
	}
	if a.MaxConcurrency == 0 {
		a.MaxConcurrency = 5
	}
	creds := map[string]any{"api_key": a.APIKey, "base_url": a.BaseURL}
	if a.ModelMapping != nil {
		creds["model_mapping"] = a.ModelMapping
	}
	d := admin.OK(e.T, http.MethodPost, "/accounts", map[string]any{
		"name": a.Name, "plugin_key": a.PluginKey, "type": a.Type, "group_ids": a.GroupIDs,
		"proxy_id": nil, "priority": a.Priority, "max_concurrency": a.MaxConcurrency,
		"schedulable": true, "credentials": creds,
	})
	id := d.Get("id").Int()
	if id == 0 {
		e.T.Fatalf("POST /accounts returned no id: %s", d.Raw)
	}
	if got := d.Get("credentials.api_key").String(); got != "" && got != "******" {
		e.T.Fatalf("POST /accounts leaked the api_key: %s", d.Raw)
	}
	return id
}

// FindAccountType returns the GET /account-types item of (pluginKey, typ).
func FindAccountType(items []gjson.Result, pluginKey, typ string) (gjson.Result, bool) {
	for _, it := range items {
		if it.Get("plugin_key").String() == pluginKey && it.Get("type").String() == typ {
			return it, true
		}
	}
	return gjson.Result{}, false
}

// AccountTypeEndpoint returns the entry of an account type's "endpoints"
// list for method + path.
func AccountTypeEndpoint(at gjson.Result, method, path string) (gjson.Result, bool) {
	for _, ep := range at.Get("endpoints").Array() {
		if ep.Get("method").String() == method && ep.Get("path").String() == path {
			return ep, true
		}
	}
	return gjson.Result{}, false
}

// ------------------------------------------------------------------ platforms

// Built-in platforms of the core (ARCHITECTURE 6.6, CONTRACTS 13).
var BuiltinPlatforms = []string{"anthropic", "openai", "gemini"}

// PlatformIDs reads a "platforms" field: [id] on groups and API keys,
// [{id, ...}] on account types and in /platforms.
func PlatformIDs(v gjson.Result) []string {
	var out []string
	for _, p := range v.Array() {
		if p.IsObject() {
			out = append(out, p.Get("id").String())
		} else {
			out = append(out, p.String())
		}
	}
	return out
}

// Platforms returns GET /platforms (built-in and enabled plugin platforms).
func (e *Env) Platforms(s *Session) []gjson.Result {
	e.T.Helper()
	return s.OK(e.T, http.MethodGet, "/platforms", nil).Array()
}

// PlatformAccountType returns the account type (pluginKey, typ) listed by a
// GET /platforms item.
func PlatformAccountType(p gjson.Result, pluginKey, typ string) (gjson.Result, bool) {
	return FindAccountType(p.Get("account_types").Array(), pluginKey, typ)
}

// GroupPlatforms returns the "platforms" of GET /groups/:id: the platforms
// the account types of the group's accounts support.
func (e *Env) GroupPlatforms(admin *Session, groupID int64) []string {
	e.T.Helper()
	g := admin.OK(e.T, http.MethodGet, fmt.Sprintf("/groups/%d", groupID), nil)
	if !g.Get("platforms").IsArray() {
		e.T.Fatalf("GET /groups/%d has no platforms array: %s", groupID, g.Raw)
	}
	return PlatformIDs(g.Get("platforms"))
}

// APIKeyPlatforms returns the "platforms" of the user's key keyID in
// GET /me/api-keys (same as its group's).
func (e *Env) APIKeyPlatforms(u *Session, keyID int64) []string {
	e.T.Helper()
	k, ok := Find(u.ListAll(e.T, "/me/api-keys"), "id", keyID)
	if !ok || !k.Get("platforms").IsArray() {
		e.T.Fatalf("GET /me/api-keys: key %d missing or without platforms: %s", keyID, k.Raw)
	}
	return PlatformIDs(k.Get("platforms"))
}

// ------------------------------------------------------------------ billing

// CreatePrice creates an admin price with POST /prices and returns its row.
// Prices are global per model (no platform, ARCHITECTURE 7.3).
func (e *Env) CreatePrice(admin *Session, body map[string]any) gjson.Result {
	e.T.Helper()
	d := admin.OK(e.T, http.MethodPost, "/prices", body)
	if d.Get("id").Int() == 0 || d.Get("expression").String() == "" || d.Get("expr_hash").String() == "" {
		e.T.Fatalf("POST /prices incomplete: %s", d.Raw)
	}
	return d
}

// AdjustBalance credits (credit=true) or debits a user's balance.
func (e *Env) AdjustBalance(admin *Session, userID int64, amount string, credit bool, note string) gjson.Result {
	e.T.Helper()
	return admin.OK(e.T, http.MethodPost, fmt.Sprintf("/users/%d/balance/adjust", userID),
		map[string]any{"amount": amount, "credit": credit, "note": note}, admin.StepUp(e.T))
}

// Balance returns the user's own balance string.
func (e *Env) Balance(u *Session) string {
	e.T.Helper()
	return u.OK(e.T, http.MethodGet, "/me/balance", nil).Get("balance").String()
}

// UsageByRequest polls GET /usage?user_id= until the record with requestID
// exists and its billing_status is final (billed|free|failed).
func (e *Env) UsageByRequest(admin *Session, userID int64, requestID string) gjson.Result {
	e.T.Helper()
	var rec gjson.Result
	Eventually(e.T, 30*time.Second, 500*time.Millisecond, "usage record "+requestID, func() bool {
		items := admin.ListAll(e.T, "/usage", "user_id", fmt.Sprint(userID))
		r, ok := Find(items, "request_id", requestID)
		if !ok {
			return false
		}
		switch r.Get("billing_status").String() {
		case "billed", "free", "failed":
			// The list omits price trace fields (price_id, expr_hash, billing_detail).
			rec = admin.OK(e.T, http.MethodGet, fmt.Sprintf("/usage/%d", r.Get("id").Int()), nil)
			return true
		}
		return false
	})
	return rec
}

// Ledger returns GET /ledger?user_id= (all pages).
func (e *Env) Ledger(admin *Session, userID int64, kind string) []gjson.Result {
	e.T.Helper()
	kv := []string{"user_id", fmt.Sprint(userID)}
	if kind != "" {
		kv = append(kv, "kind", kind)
	}
	return admin.ListAll(e.T, "/ledger", kv...)
}

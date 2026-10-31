// Package environment serves the environment variables (CONTRACTS §73.3): the
// global layer (the "environment" row of settings), the declared variables,
// and resolution outside a gateway request. The group and account layers are
// columns of their own tables, edited with the group and the account.
package environment

import (
	"context"
	"encoding/json"
	"log/slog"
	"maps"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// SettingsKey is the settings row of the global layer.
const SettingsKey = "environment"

// globalTTL bounds how stale the cached global layer gets on a node that
// missed the config:changed broadcast; errorTTL is how long a failed read is
// answered with an empty layer before the database is asked again.
const (
	globalTTL = 10 * time.Second
	errorTTL  = 2 * time.Second
)

// Service serves the routes and implements core.EnvironmentResolver.
type Service struct {
	db  *store.DB
	bus core.Bus
	// process is the process layer (config.Config.Environment), the
	// fallback of the global one.
	process core.EnvironmentValues

	unsubscribe func()

	mu       sync.Mutex
	global   core.EnvironmentValues
	globalAt time.Time
	ttl      time.Duration
	epoch    uint64 // bumped by invalidate, so a read in flight is not cached
}

// New wires the service; bus may be nil (single node, tests).
func New(db *store.DB, bus core.Bus, process core.EnvironmentValues) *Service {
	s := &Service{db: db, bus: bus, process: process}
	if bus != nil {
		s.unsubscribe = bus.Subscribe(core.ChannelConfigChanged, func(payload []byte) {
			var msg struct{ Key string }
			if json.Unmarshal(payload, &msg) == nil && msg.Key == SettingsKey {
				s.invalidate()
			}
		})
	}
	return s
}

// Close drops the config:changed subscription.
func (s *Service) Close(context.Context) {
	if s.unsubscribe != nil {
		s.unsubscribe()
	}
}

func (s *Service) RegisterRoutes(r *httpapi.Router) {
	// The editors of all three layers show the declarations and the process
	// layer they fall back to.
	r.PermAny("GET", "/environment/variables", s.variables, "settings:read", "group:read", "account:read")
	r.Perm("GET", "/settings/environment", "settings:read", s.get)
	r.Perm("PUT", "/settings/environment", "settings:manage", s.put)
}

func (s *Service) invalidate() {
	s.mu.Lock()
	s.global, s.globalAt = nil, time.Time{}
	s.epoch++
	s.mu.Unlock()
}

// GlobalEnvironment returns the cached global layer over the process layer.
// A read error yields the process layer alone for errorTTL.
func (s *Service) GlobalEnvironment(ctx context.Context) core.EnvironmentValues {
	s.mu.Lock()
	cached, at, ttl, epoch := s.global, s.globalAt, s.ttl, s.epoch
	s.mu.Unlock()
	if cached != nil && time.Since(at) < ttl {
		return cached
	}
	global, err := loadGlobal(ctx, s.db.Pool)
	ttl = globalTTL
	if err != nil {
		slog.WarnContext(ctx, "environment: read global layer", "err", err)
		ttl = errorTTL
	}
	values := core.EnvironmentValues{}
	maps.Copy(values, s.process)
	maps.Copy(values, global)
	s.mu.Lock()
	if s.epoch == epoch {
		s.global, s.globalAt, s.ttl = values, time.Now(), ttl
	}
	s.mu.Unlock()
	return values
}

// ResolveEnvironment reads the group and account layers and merges them with
// the global one. accountID 0 resolves the group alone.
func (s *Service) ResolveEnvironment(ctx context.Context, groupID, accountID int64) (core.Environment, error) {
	var group, account core.EnvironmentValues
	err := s.db.Pool.QueryRow(ctx, `SELECT
		COALESCE((SELECT environment FROM groups WHERE id = $1), '{}'),
		COALESCE((SELECT environment FROM accounts WHERE id = $2 AND deleted_at IS NULL), '{}')`, groupID, accountID).Scan(&group, &account)
	if err != nil {
		return nil, err
	}
	return core.ResolveEnvironment(s.GlobalEnvironment(ctx), group, account), nil
}

func loadGlobal(ctx context.Context, q store.Querier) (core.EnvironmentValues, error) {
	values := core.EnvironmentValues{}
	var raw []byte
	err := q.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, SettingsKey).Scan(&raw)
	if store.IsNoRows(err) {
		return values, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, err
	}
	return values, nil
}

// variablesView is GET /environment/variables: the declared variables and
// the process layer, so editors can show what "follow" falls back to.
type variablesView struct {
	Variables []core.EnvironmentVariable `json:"variables"`
	Process   core.EnvironmentValues     `json:"process"`
}

func (s *Service) variables(c *gin.Context) {
	httpapi.OK(c, variablesView{Variables: core.EnvironmentVariables, Process: s.process})
}

func (s *Service) get(c *gin.Context) {
	values, err := loadGlobal(c.Request.Context(), s.db.Pool)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"values": values})
}

// put replaces the global layer: {"values": {key: value}}; 0 clears a key.
func (s *Service) put(c *gin.Context) {
	ctx := c.Request.Context()
	var in struct {
		Values core.EnvironmentValues `json:"values"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	values, fe := core.ValidateEnvironmentValues(ctx, core.EnvLayerGlobal, "values", in.Values)
	if len(fe) > 0 {
		httpapi.Fail(c, core.InvalidFields(fe...))
		return
	}
	uid, _ := core.UserID(ctx)
	var by *int64
	if uid > 0 {
		by = &uid
	}
	if err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		_, err := store.UpdateSettingJSONTx(ctx, tx, SettingsKey, by, func(json.RawMessage) (json.RawMessage, error) {
			return json.Marshal(values)
		})
		return err
	}); err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.invalidate()
	if s.bus != nil {
		payload, _ := json.Marshal(map[string]string{"key": SettingsKey})
		if err := s.bus.Publish(context.WithoutCancel(ctx), core.ChannelConfigChanged, payload); err != nil {
			slog.WarnContext(ctx, "environment: publish config:changed", "err", err)
		}
	}
	httpapi.OK(c, gin.H{"values": values})
}

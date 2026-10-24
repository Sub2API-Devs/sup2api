package account

import (
	"context"
	"encoding/json"
	"log/slog"
	"slices"
	"strings"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

type lifecycleEvents struct {
	service       *Service
	plugin        string
	delegate      core.AppPlugin
	subscriptions []string
}

func (s *Service) LifecycleSubscriptions(generation core.Generation) []core.SubscriptionBinding {
	bindings := slices.Clone(generation.Subscriptions())
	owned := map[string]core.PluginInfo{}
	for _, accountType := range generation.AccountTypes() {
		if accountType.Type.Lifecycle != nil {
			owned[accountType.Plugin.Key] = accountType.Plugin
		}
	}
	for i := range bindings {
		binding := &bindings[i]
		if _, ok := owned[binding.Plugin.Key]; !ok {
			continue
		}
		binding.Client = &lifecycleEvents{service: s, plugin: binding.Plugin.Key, delegate: binding.Client, subscriptions: slices.Clone(binding.Events.Subscribe)}
		binding.Events.Subscribe = append(slices.Clone(binding.Events.Subscribe), "account.*")
		delete(owned, binding.Plugin.Key)
	}
	for key, info := range owned {
		binding := core.SubscriptionBinding{Plugin: info, Client: &lifecycleEvents{service: s, plugin: key}}
		binding.Events.Subscribe = []string{"account.*"}
		binding.Events.BatchSize = 1
		bindings = append(bindings, binding)
	}
	return bindings
}

func (h *lifecycleEvents) RunJob(ctx context.Context, request *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	if h.delegate == nil {
		return nil, core.ErrUnsupported
	}
	return h.delegate.RunJob(ctx, request)
}

func (h *lifecycleEvents) OnEvents(ctx context.Context, request *pluginv1.OnEventsRequest) (*pluginv1.OnEventsResponse, error) {
	result := &pluginv1.OnEventsResponse{}
	for _, event := range request.Events {
		var account struct {
			ID     int64    `json:"account_id"`
			Plugin string   `json:"plugin_key"`
			Fields []string `json:"changed_fields"`
		}
		if json.Unmarshal([]byte(event.PayloadJson), &account) == nil && account.Plugin == h.plugin && account.ID > 0 {
			if err := h.service.deliverAccountLifecycle(ctx, account.ID, h.plugin, event.Type, account.Fields); err != nil {
				return result, err
			}
		}
		if h.delegate != nil && h.matches(event.Type) {
			ack, err := h.delegate.OnEvents(ctx, &pluginv1.OnEventsRequest{Events: []*pluginv1.Event{event}})
			if err != nil {
				return result, err
			}
			if ack.GetAckedThroughId() < event.Id {
				return result, core.ErrUnavailable.WithMessage("Plugin did not acknowledge the account event")
			}
		}
		result.AckedThroughId = event.Id
	}
	return result, nil
}

func (h *lifecycleEvents) matches(event string) bool {
	for _, pattern := range h.subscriptions {
		if pattern == event || (strings.HasSuffix(pattern, ".*") && strings.HasPrefix(event, strings.TrimSuffix(pattern, "*"))) {
			return true
		}
	}
	return false
}

func (s *Service) deliverAccountLifecycle(ctx context.Context, id int64, pluginKey, event string, changed []string) error {
	phase := "updated"
	if event == core.EventAccountCreated {
		phase = "created"
	}
	if event == core.EventAccountDeleted {
		phase = "deleted"
	}
	account, err := scanRow(s.d.DB.Pool.QueryRow(ctx, selectRow+` WHERE a.id=$1 AND a.plugin_key=$2`, id, pluginKey))
	if store.IsNoRows(err) {
		return nil
	}
	if err != nil {
		return err
	}
	binding, ok := s.accountType(account.PluginKey, account.Type)
	if !ok || binding.Type.Lifecycle == nil {
		return nil
	}
	var generation int64
	if err := s.d.DB.Pool.QueryRow(ctx, `SELECT COALESCE((SELECT generation FROM account_lifecycle_sync WHERE account_id=$1),0)`, id).Scan(&generation); err != nil {
		return err
	}
	result, err := s.accountLifecycle(ctx, binding, &pluginv1.AccountLifecycleRequest{Phase: phase, Account: account.lifecycleSnapshot(), ChangedFields: changed})
	if err != nil {
		if saveErr := s.saveLifecycleStatus(ctx, id, account.UpdatedAt, generation, core.AccountSynchronization{Status: "failed", Code: "runtime_sync_failed"}); saveErr != nil {
			return saveErr
		}
		return err
	}
	if result == nil || !result.RunResource {
		return s.saveLifecycleStatus(ctx, id, account.UpdatedAt, generation, core.AccountSynchronization{Status: "applied"})
	}
	resource := s.d.LifecycleResources[pluginKey]
	if resource == nil {
		return core.ErrUnavailable.WithMessage("Account lifecycle resource is unavailable")
	}
	state := core.AccountSynchronization{Status: "applied"}
	err = resource.ReconcileAccount(ctx, id)
	if reader, ok := resource.(core.AccountSynchronizationReader); err == nil && ok {
		state, err = reader.AccountSynchronization(ctx, id)
	}
	switch {
	case err == nil:
	case phase == "deleted":
		state, err = deletedCleanupFailure(ctx, id, pluginKey, err), nil
	default:
		state = core.AccountSynchronization{Status: "failed", Code: "runtime_sync_failed"}
	}
	if saveErr := s.saveLifecycleStatus(ctx, id, account.UpdatedAt, generation, state); saveErr != nil {
		return saveErr
	}
	return err
}

// deletedCleanupFailure is the state of a deleted account whose resource
// cleanup failed. The cleanup intent is in the database already and every
// reconcile pass retries it, so a failing controller must not hold back the
// plugin's other lifecycle events: the reason (e.g. resource_in_use) is
// recorded and logged, and the event is done.
func deletedCleanupFailure(ctx context.Context, id int64, pluginKey string, err error) core.AccountSynchronization {
	state := core.AccountSynchronization{Status: "failed", Code: "runtime_sync_failed"}
	if reason, _ := core.AsError(err).Details["reason"].(string); reason != "" {
		state.Code = reason
	}
	slog.WarnContext(ctx, "account lifecycle: deleted account resource cleanup failed, left to reconciliation", "account_id", id, "plugin_key", pluginKey, "code", state.Code, "err", err)
	return state
}

func valueOr[T any](value *T, previous T) T {
	if value != nil {
		return *value
	}
	return previous
}

func (in *input) lifecycleSnapshot(current *row, settings *string) *pluginv1.Account {
	account := current.lifecycleSnapshot()
	account.Name = valueOr(in.Name, account.Name)
	account.SettingsJson = valueOr(settings, account.SettingsJson)
	properties := account.Properties
	properties.Status = valueOr(in.Status, properties.Status)
	properties.Schedulable = valueOr(in.Schedulable, properties.Schedulable)
	properties.AutoDisable = valueOr(in.AutoDisable, properties.AutoDisable)
	properties.Priority = int32(valueOr(in.Priority, current.Priority))
	properties.Weight = int32(valueOr(in.Weight, current.Weight))
	properties.MaxConcurrency = int32(valueOr(in.MaxConcurrency, current.MaxConcurrency))
	properties.RpmLimit = int32(valueOr(in.RPMLimit, current.RPMLimit))
	properties.TpmLimit = valueOr(in.TPMLimit, properties.TpmLimit)
	properties.Models = valueOr(in.Models, properties.Models)
	if in.AutoModels != nil {
		properties.AutoModels = in.AutoModels
	}
	properties.ModelMapping = valueOr(in.ModelMapping, properties.ModelMapping)
	if in.ProxyID.Set {
		properties.ProxyId = nil
		if in.ProxyID.Valid {
			id := in.ProxyID.V
			properties.ProxyId = &id
		}
	}
	return account
}

func (a *row) pluginAccount(credentials []byte) *pluginv1.Account {
	account := a.lifecycleSnapshot()
	account.CredentialsJson = string(credentials)
	return account
}

func (a *row) lifecycleSnapshot() *pluginv1.Account {
	return &pluginv1.Account{Id: a.ID, Name: a.Name, Type: a.Type, SettingsJson: string(a.Settings), Properties: &pluginv1.AccountProperties{
		Status: a.Status, Schedulable: a.Schedulable, AutoDisable: a.AutoDisable, Priority: int32(a.Priority), Weight: int32(a.Weight), MaxConcurrency: int32(a.MaxConcurrency),
		RpmLimit: int32(a.RPMLimit), TpmLimit: a.TPMLimit, ProxyId: a.ProxyID, Models: a.Models, AutoModels: a.AutoModels, ModelMapping: a.mapping(),
	}}
}

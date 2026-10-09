package account

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

type stubBalance struct{}

func (stubBalance) QueryBalance(context.Context, int64) (*store.BalanceSnapshot, error) {
	return &store.BalanceSnapshot{}, nil
}

// A balance provider belongs to one account type, (plugin key, type id): the
// plugin's other account types, and another plugin's type of the same id, do
// not get it (audit 2026-10-09 P2-4).
func TestBalanceProviderPerAccountType(t *testing.T) {
	key := core.AccountTypeKey{PluginKey: "acme_balance", Type: "oauth"}
	RegisterBalanceProvider(key, stubBalance{})
	t.Cleanup(func() {
		balanceProvidersMu.Lock()
		delete(balanceProviders, key)
		balanceProvidersMu.Unlock()
	})
	if getBalanceProvider(key) == nil {
		t.Fatal("registered provider not found")
	}
	for _, other := range []core.AccountTypeKey{{PluginKey: "acme_balance", Type: "apikey"}, {PluginKey: "other", Type: "oauth"}} {
		if getBalanceProvider(other) != nil {
			t.Fatalf("%+v got the provider of %+v", other, key)
		}
	}
}

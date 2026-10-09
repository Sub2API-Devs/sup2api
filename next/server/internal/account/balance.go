package account

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Account balance (CONTRACTS §51), similar to quota but simpler: only active
// query (no passive headers), plugin describes the query endpoint/parsing in
// manifest, core calls it when the console requests a balance and the snapshot
// is older than balanceFresh.

const (
	balanceFresh        = 3 * time.Minute
	balanceErrorTTL     = time.Minute
	balanceQueryFloor   = 30 * time.Second
	balanceQueryTimeout = 20 * time.Second
)

// BalanceView is the API view of an account's balance (CONTRACTS §51).
type BalanceView struct {
	Supported bool       `json:"supported"`
	Amount    string     `json:"amount,omitempty"`
	Currency  string     `json:"currency,omitempty"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
	Error     string     `json:"error,omitempty"`
}

// balanceView renders a stored snapshot (nil = none yet) for an account type
// declaring balance support.
func balanceView(snap *store.BalanceSnapshot) *BalanceView {
	v := &BalanceView{Supported: true}
	if snap == nil {
		return v
	}
	if snap.UpdatedAt != nil {
		v.Amount = formatMoney(snap.AmountMicros, snap.Currency)
		v.Currency = snap.Currency
		v.UpdatedAt = snap.UpdatedAt
	}
	v.Error = snap.Error
	return v
}

// formatMoney converts micros to decimal string (e.g. 1230000 -> "1.23").
func formatMoney(micros int64, currency string) string {
	if micros == 0 {
		return "0.00"
	}
	whole := micros / 1_000_000
	frac := micros % 1_000_000
	if frac < 0 {
		frac = -frac
	}
	return fmt.Sprintf("%d.%06d", whole, frac)
}

// BalanceProvider is the extension point for plugins to provide custom balance
// query logic (CONTRACTS §51.2). A provider is registered for one account type,
// identified by (plugin key, type id); the core calls it when the account
// type declares balance support.
type BalanceProvider interface {
	QueryBalance(ctx context.Context, accountID int64) (*store.BalanceSnapshot, error)
}

var (
	balanceProvidersMu sync.RWMutex
	balanceProviders   = map[core.AccountTypeKey]BalanceProvider{}
)

// RegisterBalanceProvider registers a custom balance provider for an account
// type: other account types of the same plugin do not get it.
func RegisterBalanceProvider(t core.AccountTypeKey, p BalanceProvider) {
	balanceProvidersMu.Lock()
	defer balanceProvidersMu.Unlock()
	balanceProviders[t] = p
}

func getBalanceProvider(t core.AccountTypeKey) BalanceProvider {
	balanceProvidersMu.RLock()
	defer balanceProvidersMu.RUnlock()
	return balanceProviders[t]
}

// accountBalance queries the balance of one account when force=true or the
// snapshot is stale.
func (s *Service) accountBalance(ctx context.Context, a *row, force bool) (*BalanceView, error) {
	// Check if account type supports balance
	bt, ok := s.accountType(a.PluginKey, a.Type)
	if !ok || bt.Type.Balance == nil {
		return nil, nil
	}

	snap, err := s.d.DB.AccountBalance(ctx, a.ID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if !force && !shouldQueryBalance(snap, now) {
		return balanceView(snap), nil
	}

	// Check provider
	prov := getBalanceProvider(core.AccountTypeKey{PluginKey: a.PluginKey, Type: a.Type})
	if prov == nil {
		// No provider registered, return current snapshot
		return balanceView(snap), nil
	}

	// Query
	ctx2, cancel := context.WithTimeout(ctx, balanceQueryTimeout)
	defer cancel()

	newSnap, err := prov.QueryBalance(ctx2, a.ID)
	if err != nil {
		slog.WarnContext(ctx, "account: balance query failed", "account", a.ID, "err", err)
		// Write error snapshot
		errSnap := &store.BalanceSnapshot{
			AccountID: a.ID,
			Error:     err.Error(),
			ErrorAt:   &now,
		}
		if snap != nil {
			errSnap.AmountMicros = snap.AmountMicros
			errSnap.Currency = snap.Currency
			errSnap.UpdatedAt = snap.UpdatedAt
		}
		_ = s.d.DB.UpsertBalance(ctx, errSnap)
		_ = s.deleteBalanceCache(ctx, a.ID)
		return balanceView(errSnap), nil
	}

	// Write success
	if err := s.d.DB.UpsertBalance(ctx, newSnap); err != nil {
		slog.ErrorContext(ctx, "account: write balance snapshot", "account", a.ID, "err", err)
	}
	s.writeBalanceCache(ctx, newSnap)

	return balanceView(newSnap), nil
}

func shouldQueryBalance(snap *store.BalanceSnapshot, now time.Time) bool {
	if snap == nil {
		return true
	}
	if snap.UpdatedAt != nil && now.Sub(*snap.UpdatedAt) < balanceFresh {
		return false
	}
	if snap.ErrorAt != nil && now.Sub(*snap.ErrorAt) < balanceErrorTTL {
		return false
	}
	return true
}

// fillBalance populates the Balance field of views for accounts whose type
// declares balance support.
func (s *Service) fillBalance(ctx context.Context, rows []*row, out []*View) {
	var ids []int64
	supported := make([]bool, len(rows))
	for i, a := range rows {
		if bt, ok := s.accountType(a.PluginKey, a.Type); ok && bt.Type.Balance != nil {
			supported[i] = true
			ids = append(ids, a.ID)
		}
	}
	if len(ids) == 0 {
		return
	}
	snaps, err := s.cachedAccountBalances(ctx, ids)
	if err != nil {
		slog.WarnContext(ctx, "account: load balance snapshots", "err", err)
		return
	}
	for i, a := range rows {
		if supported[i] {
			out[i].Balance = balanceView(snaps[a.ID])
		}
	}
}

// getBalance is GET /accounts/:id/balance[?force=true].
func (s *Service) getBalance(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	force, _ := strconv.ParseBool(c.Query("force"))
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, core.OwnerScope(ctx, "account:read"), false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	v, err := s.accountBalance(ctx, a, force)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if v == nil {
		httpapi.Fail(c, core.NewError(404, "unsupported", "account type does not support balance"))
		return
	}
	httpapi.OK(c, v)
}

package e2e

import (
	"fmt"
	"math/big"
	"sync"
	"testing"
)

// Tenant is an isolated slice of the system for one test: a restricted group
// with its own mock-backed accounts, a user allowed to use it (with balance)
// and an API key bound to it.
type Tenant struct {
	GroupID  int64
	Accounts []TenantAccount
	User     *Session
	KeyID    int64
	APIKey   string
	Model    string // a model covered by the run's per-token price
}

// TenantAccount is an upstream account of a tenant.
type TenantAccount struct {
	ID  int64
	Key string // upstream api_key, recorded by the mock as x-api-key
}

// TenantOpts configures NewTenant.
type TenantOpts struct {
	Accounts   int     // default 1
	Balance    string  // initial credit, default "10"; "0" = none
	Rate       float64 // group rate multiplier, default 1
	Priorities []int   // per-account priority (default all 10)
}

// NewTenant builds a tenant. Requires identity, resources, billing and an
// enabled anthropic plugin (EnsurePlugin is called).
func (e *Env) NewTenant(admin *Session, o TenantOpts) *Tenant {
	e.T.Helper()
	if o.Accounts == 0 {
		o.Accounts = 1
	}
	if o.Balance == "" {
		o.Balance = "10"
	}
	if o.Rate == 0 {
		o.Rate = 1
	}
	e.EnsurePlugin(admin, "anthropic", "")
	tn := &Tenant{Model: e.RunModel(admin, "sonnet")}
	tn.GroupID = e.CreateGroup(admin, e.Name("grp"), "restricted", o.Rate, nil)
	for i := 0; i < o.Accounts; i++ {
		prio := 10
		if i < len(o.Priorities) {
			prio = o.Priorities[i]
		}
		key := fmt.Sprintf("sk-ant-mock-%s-%d", e.RunID, nextSeq())
		id := e.CreateAccount(admin, AccountSpec{GroupIDs: []int64{tn.GroupID}, APIKey: key, Priority: prio})
		tn.Accounts = append(tn.Accounts, TenantAccount{ID: id, Key: key})
	}
	tn.User = e.CreateUser(admin, UserSpec{})
	e.SetUserGroups(admin, tn.User.UserID, []int64{tn.GroupID})
	if o.Balance != "0" {
		e.AdjustBalance(admin, tn.User.UserID, o.Balance, true, "e2e initial credit")
	}
	tn.KeyID, tn.APIKey = e.CreateAPIKey(tn.User, tn.GroupID)
	return tn
}

// AccountKeys returns the upstream keys of the tenant's accounts.
func (tn *Tenant) AccountKeys() map[string]bool {
	m := map[string]bool{}
	for _, a := range tn.Accounts {
		m[a.Key] = true
	}
	return m
}

// Per-token price of the run model (USD per million tokens).
var RunPrice = map[string]float64{"p": 3, "c": 15, "cr": 0.3, "cc": 3.75, "cc1h": 6}

var (
	runPriceMu   sync.Mutex
	runPriceDone = map[string]bool{}
)

// RunModel returns "claude-e2e-<run>-<suffix>" and makes sure an admin
// per-token price (RunPrice) covers "claude-e2e-<run>-*".
func (e *Env) RunModel(admin *Session, suffix string) string {
	e.T.Helper()
	return e.RunModelOf(admin, "claude", suffix)
}

// RunModelOf returns "<family>-e2e-<run>-<suffix>" (family e.g. "claude",
// "gpt", "gemini") and makes sure an admin per-token price (RunPrice)
// covers "<family>-e2e-<run>-*". Admin prices win over plugin defaults.
func (e *Env) RunModelOf(admin *Session, family, suffix string) string {
	e.T.Helper()
	runPriceMu.Lock()
	defer runPriceMu.Unlock()
	if !runPriceDone[family] {
		e.CreatePrice(admin, map[string]any{
			"model_pattern": fmt.Sprintf("%s-e2e-%s-*", family, e.RunID),
			"mode":          "per_token",
			"config":        RunPrice,
			"note":          "e2e run price",
		})
		runPriceDone[family] = true
	}
	return fmt.Sprintf("%s-e2e-%s-%s", family, e.RunID, suffix)
}

// ExpectedTokenCost computes the per-token cost (USD) for usage with price
// coefficients per million tokens, times rate.
func ExpectedTokenCost(price map[string]float64, p, c, cr, cc, cc1h int64, rate float64) *big.Rat {
	sum := new(big.Rat)
	add := func(tokens int64, per float64) {
		x := new(big.Rat).SetInt64(tokens)
		x.Mul(x, new(big.Rat).SetFloat64(per))
		sum.Add(sum, x)
	}
	add(p, price["p"])
	add(c, price["c"])
	add(cr, price["cr"])
	add(cc, price["cc"])
	add(cc1h, price["cc1h"])
	sum.Quo(sum, big.NewRat(1_000_000, 1))
	return sum.Mul(sum, new(big.Rat).SetFloat64(rate))
}

// Money parses a decimal money string.
func Money(t testing.TB, s string) *big.Rat {
	t.Helper()
	r, ok := new(big.Rat).SetString(s)
	if !ok {
		t.Fatalf("not a decimal amount: %q", s)
	}
	return r
}

// AssertMoney requires got (decimal string, <= 8 decimals) to equal want
// rounded to 8 decimals (within 1e-8).
func AssertMoney(t testing.TB, what, got string, want *big.Rat) {
	t.Helper()
	g := Money(t, got)
	diff := new(big.Rat).Sub(g, want)
	diff.Abs(diff)
	if diff.Cmp(big.NewRat(1, 100_000_000)) > 0 {
		t.Fatalf("%s: got %s, want %s", what, got, want.FloatString(8))
	}
}

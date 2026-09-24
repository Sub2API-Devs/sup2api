package e2e

import (
	"net/http"
	"testing"
)

// AC 9: insufficient balance returns 402; after an admin credit the user can
// continue; the ledger records the operator.
func TestAC09_InsufficientBalance(t *testing.T) {
	e := Setup(t)
	e.Pending("b-billing (balance, ledger, adjust), gateway (G)")
	admin := e.Admin()
	tn := e.NewTenant(admin, TenantOpts{Balance: "0"})
	m := e.Mock()

	if b := e.Balance(tn.User); Money(t, b).Sign() != 0 {
		t.Fatalf("new user balance = %s", b)
	}
	mark := m.Mark(t)
	for _, stream := range []bool{false, true} {
		g := e.Messages(tn.APIKey, MessagesBody(tn.Model, "no money", stream), nil)
		if g.Status != 402 {
			t.Fatalf("stream=%v: HTTP %d %s, want 402", stream, g.Status, g.Body)
		}
		if g.JSON().Get("type").String() != "error" {
			t.Fatalf("402 not in anthropic error format: %s", g.Body)
		}
	}
	if used := KeysUsed(m.Since(t, mark), "/v1/messages"); len(used) != 0 {
		t.Fatalf("upstream called despite insufficient balance: %v", used)
	}

	// Admin adjustment needs step-up.
	r := admin.API(t, http.MethodPost, "/users/"+itoa(tn.User.UserID)+"/balance/adjust",
		map[string]any{"amount": "1", "credit": true, "note": "no step-up"})
	if r.Status != 403 || r.ErrCode() != "step_up_required" {
		t.Fatalf("adjust without step-up: %s", r)
	}
	// A normal user cannot adjust at all.
	r = tn.User.API(t, http.MethodPost, "/users/"+itoa(tn.User.UserID)+"/balance/adjust",
		map[string]any{"amount": "100", "credit": true, "note": "self"})
	if r.Status != 403 {
		t.Fatalf("self adjust: %s", r)
	}

	note := "e2e top-up " + e.RunID
	e.AdjustBalance(admin, tn.User.UserID, "5", true, note)
	AssertMoney(t, "balance after credit", e.Balance(tn.User), Money(t, "5"))

	g := e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "paid now", false), nil)
	u := e.UsageByRequest(admin, tn.User.UserID, g.RequestID)
	if u.Get("billing_status").String() != "billed" {
		t.Fatalf("usage after top-up: %s", u.Raw)
	}

	// Ledger: admin_adjust with operator; visible to the user as well.
	adj := e.Ledger(admin, tn.User.UserID, "admin_adjust")
	l, ok := Find(adj, "note", note)
	if !ok {
		t.Fatalf("admin_adjust entry missing: %v", adj)
	}
	if l.Get("operator_id").Int() != admin.UserID && admin.UserID != 0 {
		t.Fatalf("operator_id = %d, want %d", l.Get("operator_id").Int(), admin.UserID)
	}
	AssertMoney(t, "adjust delta", l.Get("delta").String(), Money(t, "5"))
	AssertMoney(t, "adjust balance_after", l.Get("balance_after").String(), Money(t, "5"))
	mine := tn.User.ListAll(t, "/me/ledger")
	if _, ok := Find(mine, "note", note); !ok {
		t.Fatal("/me/ledger lacks the adjustment")
	}

	// Debit below zero -> blocked again (balance <= min_balance).
	bal := e.Balance(tn.User)
	e.AdjustBalance(admin, tn.User.UserID, bal, false, "drain")
	if g := e.Messages(tn.APIKey, MessagesBody(tn.Model, "drained", false), nil); g.Status != 402 {
		t.Fatalf("after drain: HTTP %d, want 402", g.Status)
	}
}

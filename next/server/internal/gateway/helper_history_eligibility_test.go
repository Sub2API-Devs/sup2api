package gateway

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestHelperCustodyFirstIneligibleIssuerSkipsOnlyBeforeReserve(t *testing.T) {
	for _, mode := range []string{"issuer", "capability", "timeout", "db"} {
		t.Run(mode, func(t *testing.T) {
			e, s, calls := helperHTTPFixture(t)
			e.accounts.mu.Lock()
			e.accounts.groups[testGroup] = nil
			e.accounts.mu.Unlock()
			e.accounts.addTyped(testGroup, 21, 1, "acc-21", "ccgateway", "apikey")
			e.accounts.addTyped(testGroup, 22, 2, "acc-22", "ccgateway", "apikey")
			var selected []int64
			e.gw.helperRuntime = func(_ context.Context, id int64, _ string) (helperRuntimeInfo, error) {
				selected = append(selected, id)
				if id == 21 {
					switch mode {
					case "issuer", "capability":
						return helperRuntimeInfo{}, core.ErrUnsupported
					case "timeout":
						return helperRuntimeInfo{}, context.DeadlineExceeded
					default:
						return helperRuntimeInfo{}, errors.New("DB failed")
					}
				}
				return helperRuntimeInfo{Namespace: "fixture-policy", Binding: core.ResourceBinding{AccountID: id, PrincipalID: "issuer", Generation: "epoch"}}, nil
			}
			r := e.messages(helperRequestBody())
			if mode == "timeout" || mode == "db" {
				if r.status != 503 || calls.Load() != 0 || len(selected) != 1 {
					t.Fatalf("infra changed account: status%d selected%v calls%d", r.status, selected, calls.Load())
				}
				return
			}
			if r.status != 200 || calls.Load() != 1 || len(selected) != 2 || selected[0] != 21 || selected[1] != 22 {
				t.Fatalf("eligibility routing status%d selected%v calls%d", r.status, selected, calls.Load())
			}
			s.mu.Lock()
			defer s.mu.Unlock()
			if len(s.attempts) != 1 || len(s.usage) != 1 || s.usage[0].AccountID == nil || *s.usage[0].AccountID != 22 {
				t.Fatal("ineligible account acquired attempt or usage")
			}
		})
	}
}
func TestHelperCustodyKnownRuntimeFailureNeverChangesAccount(t *testing.T) {
	e, _, calls := helperHTTPFixture(t)
	b := helperRequestBody()
	r := e.messages(b)
	if r.status != 200 {
		t.Fatal(r.status)
	}
	raw, _ := json.Marshal(b)
	messages, _, _ := publicHelperPrefixes(raw)
	var response struct{ Content json.RawMessage }
	json.Unmarshal(r.body, &response)
	messages = append(messages, json.RawMessage(`{"role":"assistant","content":`+string(response.Content)+`}`), json.RawMessage(`{"role":"user","content":"next"}`))
	b["messages"] = messages
	e.gw.helperRequirement = func(context.Context, int64, *http.Request) (string, error) {
		t.Fatal("known chain must never probe or downgrade")
		return "", nil
	}
	checks := 0
	e.gw.helperRuntime = func(context.Context, int64, string) (helperRuntimeInfo, error) {
		checks++
		return helperRuntimeInfo{}, core.ErrUnsupported
	}
	r = e.messages(b)
	if r.status != 400 || checks != 1 || calls.Load() != 1 {
		t.Fatalf("known changed accounts status%d checks%d calls%d", r.status, checks, calls.Load())
	}
}
func TestHelperCustodyEligibilityRequiresUnreservedUnknown(t *testing.T) {
	for _, mode := range []string{"known", "reserved", "dispatched"} {
		t.Run(mode, func(t *testing.T) {
			c := &call{helperHistory: &helperHistoryRequest{lookup: core.HelperHistoryLookup{State: core.HelperHistoryUnknown}}}
			switch mode {
			case "known":
				c.helperHistory.lookup.State = core.HelperHistoryKnownReady
			case "reserved":
				c.helperHistory.attempt.ID = "reserved"
			case "dispatched":
				c.helperHistory.dispatched = true
			}
			err := c.helperRuntimeFailure(core.ErrUnsupported)
			var eligible *resourceEligibilityError
			if errors.As(err, &eligible) {
				t.Fatal("unsafe retry after known/reserved/dispatched")
			}
		})
	}
}

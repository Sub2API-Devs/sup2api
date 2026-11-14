package e2e

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"math/big"
	"net/http"
	"strings"
	"testing"
	"time"
)

// AC 26: what a streaming request pays when its client hangs up mid-answer
// follows the billing setting client_disconnect_policy (CONTRACTS §25.8):
// "continue" bills the usage the upstream reports after being read to its
// end, "precharge" the pre-charge estimate, "free" nothing; and the prompt is
// never billed twice when the answer had already reported it as cached.
func TestAC26_ClientDisconnectPolicy(t *testing.T) {
	e := Setup(t)
	admin := e.Admin()
	tn := e.NewTenant(admin, TenantOpts{Accounts: 1, Balance: "50"})
	acctKey := tn.Accounts[0].Key
	m := e.Mock()

	saved := admin.OK(t, http.MethodGet, "/settings/billing", nil)
	setPolicy := func(t *testing.T, policy string) {
		t.Helper()
		admin.OK(t, http.MethodPut, "/settings/billing", map[string]any{"client_disconnect_policy": policy})
	}
	t.Cleanup(func() {
		setPolicy(t, saved.Get("client_disconnect_policy").String())
		m.ClearRule(t, acctKey)
	})
	reserve := saved.Get("output_reserve_tokens").Int()
	if reserve <= MockOutputTokens {
		t.Fatalf("output_reserve_tokens = %d: the estimate could not be told from the reported output", reserve)
	}

	// A prompt that is almost entirely a 1h cache write: the case where
	// mixing the estimate with the reported usage billed the prompt twice.
	const input, cacheRead, cache5m, cache1h, output = 7, 40, 60, 900, 33
	usage := map[string]int{"input_tokens": input, "output_tokens": output, "cache_read_input_tokens": cacheRead,
		"cache_creation_input_tokens": cache5m + cache1h, "cache_creation_1h_input_tokens": cache1h}
	// 30 words: the answer lasts chunkMS*30 after message_start.
	text := strings.TrimSpace(strings.Repeat("word ", 30))
	slow := func(t *testing.T, chunkMS int) {
		t.Helper()
		m.SetRule(t, MockRule{APIKey: acctKey, ChunkDelayMS: chunkMS, Usage: &usage, Text: text})
	}
	reported := func(out int64) *big.Rat {
		return ExpectedTokenCost(RunPrice, input, out, cacheRead, cache5m, cache1h, 1)
	}

	cases := []struct {
		name    string
		policy  string
		chunkMS int
		// expectations
		output    int64 // output tokens billed
		extract   string
		billed    bool
		minLasted time.Duration // the record cannot exist sooner than this
	}{
		{name: "continue reads to the end", policy: "continue", chunkMS: 100, output: output, billed: true, minLasted: 2 * time.Second},
		{name: "precharge", policy: "precharge", chunkMS: 100, output: reserve, extract: "precharge", billed: true},
		{name: "free", policy: "free", chunkMS: 100, billed: false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			e := e.With(t)
			setPolicy(t, c.policy)
			slow(t, c.chunkMS)
			before := Money(t, e.Balance(tn.User))
			left := time.Now()
			requestID := hangUpAfterFirstEvent(t, e.BaseURL, tn.APIKey, tn.Model)

			u := e.UsageByRequest(admin, tn.User.UserID, requestID)
			if lasted := time.Since(left); lasted < c.minLasted {
				t.Fatalf("record was final after %v: the upstream was not read on for %v", lasted, c.minLasted)
			}
			if u.Get("success").Bool() || u.Get("error_type").String() != "client_canceled" {
				t.Fatalf("record does not say the client left: %s", u.Raw)
			}
			// Whatever the policy, the prompt side is what the answer reported.
			if u.Get("input_tokens").Int() != input || u.Get("cache_read_tokens").Int() != cacheRead ||
				u.Get("cache_creation_tokens").Int() != cache5m || u.Get("cache_creation_1h_tokens").Int() != cache1h {
				t.Fatalf("prompt side is not the reported one: %s", u.Raw)
			}
			if got := u.Get("anomalies.usage_extract").String(); got != c.extract {
				t.Fatalf("usage_extract = %q, want %q: %s", got, c.extract, u.Raw)
			}
			want := new(big.Rat)
			if c.billed {
				want = reported(c.output)
				if u.Get("billing_status").String() != "billed" || u.Get("output_tokens").Int() != c.output {
					t.Fatalf("billing_status/output: %s", u.Raw)
				}
			} else if u.Get("billing_status").String() != "free" {
				t.Fatalf("billing_status: %s", u.Raw)
			}
			AssertMoney(t, "usage.total_cost", u.Get("total_cost").String(), want)
			var paid *big.Rat
			Eventually(t, 15*time.Second, 300*time.Millisecond,
				func() string { return "balance fell by " + paid.FloatString(8) + ", want " + want.FloatString(8) }, func() bool {
					paid = new(big.Rat).Sub(before, Money(t, e.Balance(tn.User)))
					return paid.FloatString(8) == want.FloatString(8)
				})
		})
	}

	t.Run("a served stream is unaffected", func(t *testing.T) {
		e := e.With(t)
		setPolicy(t, "continue")
		slow(t, 20)
		g := e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "hello", true), nil)
		u := e.UsageByRequest(admin, tn.User.UserID, g.RequestID)
		if !u.Get("success").Bool() || u.Get("billing_status").String() != "billed" || u.Get("output_tokens").Int() != output {
			t.Fatalf("served stream: %s", u.Raw)
		}
		AssertMoney(t, "usage.total_cost", u.Get("total_cost").String(), reported(output))
	})
}

// hangUpAfterFirstEvent starts a streaming /v1/messages request, reads its
// first event and drops the connection. It returns the request id.
func hangUpAfterFirstEvent(t *testing.T, base, apiKey, model string) string {
	t.Helper()
	raw, _ := json.Marshal(MessagesBody(model, "hello", true))
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/v1/messages", bytes.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("x-api-key", apiKey)
	// Its own transport: closing the body must close the connection, not
	// return it to a pool shared with other requests.
	cl := &http.Client{Transport: &http.Transport{DisableKeepAlives: true}}
	resp, err := cl.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	requestID := resp.Header.Get("X-Request-Id")
	if resp.StatusCode != 200 || requestID == "" {
		t.Fatalf("stream did not start: HTTP %d, request id %q", resp.StatusCode, requestID)
	}
	br := bufio.NewReader(resp.Body)
	for {
		line, err := br.ReadString('\n')
		if err != nil {
			t.Fatalf("stream ended before its first event: %v", err)
		}
		if strings.HasPrefix(line, "data:") {
			return requestID
		}
	}
}

package gateway

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// hangUpAfterStart sends a streaming request whose upstream holds after
// message_start, reads that first event and then drops the connection.
func hangUpAfterStart(t *testing.T, e *env) {
	t.Helper()
	raw, _ := json.Marshal(body(testModel, true))
	ctx, cancel := context.WithCancel(context.Background())
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, e.srv.URL+"/v1/messages", strings.NewReader(string(raw)))
	req.Header.Set("x-api-key", testKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	br := bufio.NewReader(resp.Body)
	for {
		l, err := br.ReadString('\n')
		if err != nil {
			t.Fatalf("stream ended before message_start: %v", err)
		}
		if strings.HasPrefix(l, "data: ") {
			break
		}
	}
	cancel()
	_ = resp.Body.Close()
}

// reportedPrompt is the prompt side of the mock upstream's message_start.
var reportedPrompt = core.UsageTokens{Input: upInput, CacheRead: upCacheRead,
	CacheCreation: upCacheCreation - upCacheCreate1h, CacheCreation1h: upCacheCreate1h}

func promptSide(t core.UsageTokens) core.UsageTokens {
	t.Output = 0
	return t
}

// holdingEnv is an env whose upstream holds after message_start until the
// returned channel is closed, under the given disconnect policy.
func holdingEnv(t *testing.T, policy core.ClientDisconnect) (*env, chan struct{}) {
	t.Helper()
	e := newEnv(t)
	e.balance.disconnect = policy
	hold := make(chan struct{})
	e.up.set("acc-1", &upstreamRule{hold: hold})
	return e, hold
}

// awaitUpstreamCanceled fails unless the upstream request is canceled soon.
func awaitUpstreamCanceled(t *testing.T, e *env, why string) {
	t.Helper()
	select {
	case <-e.up.canceled:
	case <-time.After(10 * time.Second):
		t.Fatalf("upstream request was not canceled %s", why)
	}
}

// wantPrechargeWithReportedPrompt checks the record of a hang-up billed the
// estimate: the prompt side is the one the answer reported, never the
// estimate's on top of it.
func wantPrechargeWithReportedPrompt(t *testing.T, rec *core.UsageRecord) {
	t.Helper()
	if rec.ErrorType != errTypeClientCanceled || !rec.Billable || rec.UsageExtract != core.UsageExtractPrecharge {
		t.Fatalf("record: billable = %v type = %q extract = %q", rec.Billable, rec.ErrorType, rec.UsageExtract)
	}
	if promptSide(rec.Tokens) != reportedPrompt {
		t.Fatalf("prompt side %+v, want the reported %+v", promptSide(rec.Tokens), reportedPrompt)
	}
}

// Under "continue" the upstream answer is read to its end after the client
// left and the request pays what the upstream reported (CONTRACTS §25.8).
func TestClientDisconnectContinueBillsReportedUsage(t *testing.T) {
	e, hold := holdingEnv(t, core.ClientDisconnect{Policy: core.DisconnectContinue, Wait: 10 * time.Second})

	hangUpAfterStart(t, e)
	// The upstream must outlive the client: it is still holding.
	select {
	case key := <-e.up.canceled:
		t.Fatalf("upstream request of %s was canceled although the answer is to be read on", key)
	case <-time.After(300 * time.Millisecond):
	}
	close(hold)

	rec := e.record()
	want := reportedPrompt
	want.Output = upOutput
	if rec.Tokens != want {
		t.Fatalf("tokens %+v, want %+v", rec.Tokens, want)
	}
	if rec.Success || rec.ErrorType != errTypeClientCanceled || rec.StatusCode != statusClientClosed {
		t.Fatalf("record does not say the client left: %+v", rec)
	}
	if !rec.Billable || rec.UsageExtract == core.UsageExtractPrecharge {
		t.Fatalf("billable = %v extract = %q, want the reported usage billed", rec.Billable, rec.UsageExtract)
	}
}

// A "continue" that outlasts its wait stops the upstream and falls back to
// the pre-charge estimate.
func TestClientDisconnectContinueGivesUpAfterWait(t *testing.T) {
	const wait = time.Second
	e, hold := holdingEnv(t, core.ClientDisconnect{Policy: core.DisconnectContinue, Wait: wait})
	defer close(hold)

	// Taken before the client leaves: the wait cannot start sooner, so an
	// upstream canceled within it was not read on.
	left := time.Now()
	hangUpAfterStart(t, e)
	awaitUpstreamCanceled(t, e, "after the wait")
	if d := time.Since(left); d < wait {
		t.Fatalf("upstream request was canceled after %v, before the %v wait had passed", d, wait)
	}
	wantPrechargeWithReportedPrompt(t, e.record())
}

// Shutdown ends an answer that is only still read for its usage: a client
// that left is no reason to hold the server open.
func TestClientDisconnectContinueStopsAtShutdown(t *testing.T) {
	e, hold := holdingEnv(t, core.ClientDisconnect{Policy: core.DisconnectContinue, Wait: time.Hour})
	defer close(hold)

	hangUpAfterStart(t, e)
	select {
	case key := <-e.up.canceled:
		t.Fatalf("upstream request of %s was canceled before shutdown", key)
	case <-time.After(300 * time.Millisecond):
	}
	e.gw.AbandonReads()
	awaitUpstreamCanceled(t, e, "at shutdown")
	wantPrechargeWithReportedPrompt(t, e.record())
}

// "precharge" stops the upstream at once and bills the estimate.
func TestClientDisconnectPrechargeBillsPromptOnce(t *testing.T) {
	e, hold := holdingEnv(t, core.ClientDisconnect{Policy: core.DisconnectPrecharge})
	defer close(hold)

	hangUpAfterStart(t, e)
	awaitUpstreamCanceled(t, e, "when the client left")
	wantPrechargeWithReportedPrompt(t, e.record())
}

// "free" stops the upstream at once and bills nothing.
func TestClientDisconnectFreeBillsNothing(t *testing.T) {
	e, hold := holdingEnv(t, core.ClientDisconnect{Policy: core.DisconnectFree})
	defer close(hold)

	hangUpAfterStart(t, e)
	awaitUpstreamCanceled(t, e, "when the client left")
	if rec := e.record(); rec.ErrorType != errTypeClientCanceled || rec.Billable {
		t.Fatalf("record: billable = %v type = %q", rec.Billable, rec.ErrorType)
	}
}

func TestCanceledTokens(t *testing.T) {
	est := core.UsageTokens{Input: 1000, Output: 4000}
	for name, tc := range map[string]struct{ reported, want core.UsageTokens }{
		"nothing reported":      {core.UsageTokens{}, est},
		"only output reported":  {core.UsageTokens{Output: 9}, est},
		"output above reserve":  {core.UsageTokens{Output: 5000}, core.UsageTokens{Input: 1000, Output: 5000}},
		"prompt fully cached":   {core.UsageTokens{CacheRead: 990}, core.UsageTokens{CacheRead: 990, Output: 4000}},
		"prompt above estimate": {core.UsageTokens{Input: 1500, Output: 2}, core.UsageTokens{Input: 1500, Output: 4000}},
		"1h write": {core.UsageTokens{Input: 3, CacheCreation1h: 997},
			core.UsageTokens{Input: 3, CacheCreation1h: 997, Output: 4000}},
	} {
		if got := canceledTokens(tc.reported, est); got != tc.want {
			t.Errorf("%s: %+v, want %+v", name, got, tc.want)
		}
	}
}

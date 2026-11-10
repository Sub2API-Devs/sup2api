package codex

import (
	"context"
	"errors"
	"io"
	"net/http"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// failingKV fails every call, as the host KV does when Redis is down.
type failingKV struct{}

var errKVDown = errors.New("kv unavailable")

func (failingKV) Get(context.Context, string, string) ([]byte, bool, error) {
	return nil, false, errKVDown
}
func (failingKV) Set(context.Context, string, string, []byte, time.Duration) error { return errKVDown }
func (failingKV) Delete(context.Context, string, string) error                     { return errKVDown }
func (failingKV) List(context.Context, string, string, string, int) ([]string, string, error) {
	return nil, "", errKVDown
}

// summary asks POST /reset-credits/summary for ids and returns the counts.
func (e *resetEnv) summary(t *testing.T, ids ...int64) map[string]ResetCount {
	t.Helper()
	r := e.h.Do("POST", "/reset-credits/summary", nil, map[string]any{"account_ids": ids})
	if r.GetStatus() != 200 {
		t.Fatalf("summary = %d %s", r.GetStatus(), r.GetBody())
	}
	var got ResetSummaryResponse
	mustData(t, r.GetBody(), &got)
	if got.Accounts == nil {
		t.Fatalf("summary without accounts: %s", r.GetBody())
	}
	return got.Accounts
}

// parseUsage runs ParseQuotaResponse for the device account on a 200 body.
func (e *resetEnv) parseUsage(t *testing.T, body string) *pluginv1.QuotaResult {
	t.Helper()
	r, err := e.p.ParseQuotaResponse(context.Background(), &pluginv1.ParseQuotaResponseRequest{
		Account: &pluginv1.Account{Id: resetDeviceID, Type: TypeDevice}, Status: 200, Body: []byte(body),
	})
	if err != nil {
		t.Fatal(err)
	}
	return r
}

const usageWindowJSON = `"rate_limit":{"primary_window":{"used_percent":40,"limit_window_seconds":18000,"reset_at":1800003600}}`

func TestUsageCachesResetCount(t *testing.T) {
	e := newResetEnv(t)
	key := resetCountKey(resetDeviceID)

	e.parseUsage(t, `{`+usageWindowJSON+`,"rate_limit_reset_credits":{"available_count":3}}`)
	if got := e.summary(t, resetDeviceID)[key]; got != (ResetCount{AvailableCount: 3, UpdatedAt: testNow.Unix()}) {
		t.Fatalf("cached = %+v", got)
	}
	// An answer without the count leaves the cache as it is (never 0).
	for _, body := range []string{
		`{` + usageWindowJSON + `}`,
		`{` + usageWindowJSON + `,"rate_limit_reset_credits":null}`,
		`{` + usageWindowJSON + `,"rate_limit_reset_credits":{"available_count":null}}`,
		`{` + usageWindowJSON + `,"rate_limit_reset_credits":{"available_count":"2"}}`,
	} {
		e.parseUsage(t, body)
		if got := e.summary(t, resetDeviceID)[key]; got.AvailableCount != 3 {
			t.Fatalf("after %s: cached = %+v", body, got)
		}
	}
	// A failed query writes nothing.
	if _, err := e.p.ParseQuotaResponse(context.Background(), &pluginv1.ParseQuotaResponseRequest{
		Account: &pluginv1.Account{Id: resetDeviceID, Type: TypeDevice}, Status: 500,
		Body: []byte(`{"rate_limit_reset_credits":{"available_count":9}}`),
	}); err != nil {
		t.Fatal(err)
	}
	// A reported 0 is written.
	e.parseUsage(t, `{"rate_limit_reset_credits":{"available_count":0}}`)
	if got, ok := e.summary(t, resetDeviceID)[key]; !ok || got.AvailableCount != 0 {
		t.Fatalf("cached = %+v %v, want 0", got, ok)
	}
}

func TestUsageCacheFailureKeepsQuota(t *testing.T) {
	e := newResetEnv(t)
	body := `{` + usageWindowJSON + `,"rate_limit_reset_credits":{"available_count":3}}`
	want := e.parseUsage(t, body)
	e.host.kv = failingKV{}
	got := e.parseUsage(t, body)
	if got.GetErrorType() != pluginv1.QuotaResult_ERROR_TYPE_UNSPECIFIED || len(got.GetWindows()) != 1 ||
		got.GetWindows()[0].GetKey() != QuotaKey5h || got.GetWindows()[0].GetUtilization() != 40 ||
		got.GetNextCheckAtUnix() != want.GetNextCheckAtUnix() {
		t.Fatalf("result with a failing KV = %v, want %v", got, want)
	}
}

func TestResetSummary(t *testing.T) {
	e := newResetEnv(t)
	ctx := context.Background()
	e.p.storeResetCount(ctx, 29, 2)
	e.p.storeResetCount(ctx, 30, 0)

	got := e.summary(t, 29, 29, -1, 0, 30, 31)
	if len(got) != 2 || got["29"].AvailableCount != 2 || got["29"].UpdatedAt != testNow.Unix() || got["30"] != (ResetCount{UpdatedAt: testNow.Unix()}) {
		t.Fatalf("summary = %+v", got)
	}
	if got := e.summary(t); len(got) != 0 {
		t.Fatalf("empty summary = %+v", got)
	}

	// At most MaxAccountBatch distinct ids; duplicates do not count.
	ids := make([]int64, 0, manifest.MaxAccountBatch+1)
	for i := range manifest.MaxAccountBatch {
		ids = append(ids, int64(i+1))
	}
	if got := e.summary(t, append(ids, 1, 2, 3)...); len(got) != 2 {
		t.Fatalf("full batch = %+v", got)
	}
	r := e.h.Do("POST", "/reset-credits/summary", nil, map[string]any{"account_ids": append(ids, int64(manifest.MaxAccountBatch+1))})
	if eb := decodeError(t, r); r.GetStatus() != 400 || len(eb.Error.Details.Fields) != 1 || eb.Error.Details.Fields[0].Field != "account_ids" {
		t.Fatalf("over the batch = %d %s", r.GetStatus(), r.GetBody())
	}
	if r := e.h.Do("POST", "/reset-credits/summary", nil, "{"); r.GetStatus() != 400 {
		t.Fatalf("invalid json = %d %s", r.GetStatus(), r.GetBody())
	}

	// An unreadable KV leaves the accounts out; the route still answers.
	e.host.kv = failingKV{}
	if got := e.summary(t, 29); len(got) != 0 {
		t.Fatalf("summary with a failing KV = %+v", got)
	}
	if n := len(e.client.requests()); n != 0 {
		t.Fatalf("summary sent %d upstream requests", n)
	}
}

func TestResetCacheFollowsListAndConsume(t *testing.T) {
	e := newResetEnv(t)
	consumeCode := "nothing_to_reset"
	e.backend = func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodGet {
			_, _ = io.WriteString(w, `{"available_count":2,"credits":[]}`)
			return
		}
		_, _ = io.WriteString(w, `{"code":"`+consumeCode+`","windows_reset":1}`)
	}
	key := resetCountKey(resetDeviceID)
	list := func() {
		t.Helper()
		if r := e.h.Do("POST", "/reset-credits/list", nil, map[string]any{"account_id": resetDeviceID}); r.GetStatus() != 200 {
			t.Fatalf("list = %d %s", r.GetStatus(), r.GetBody())
		}
	}

	list()
	if got := e.summary(t, resetDeviceID)[key]; got.AvailableCount != 2 {
		t.Fatalf("after list: %+v", got)
	}
	// Nothing spent: the count stays.
	if r := e.consume(map[string]any{"account_ids": []int64{resetDeviceID}}); r.GetStatus() != 409 {
		t.Fatalf("consume = %d %s", r.GetStatus(), r.GetBody())
	}
	if _, ok := e.summary(t, resetDeviceID)[key]; !ok {
		t.Fatal("a refused consume dropped the count")
	}
	// A spent reset drops the stale count.
	for _, code := range []string{outcomeReset, outcomeAlreadyRedeemed} {
		list()
		consumeCode = code
		if r := e.consume(map[string]any{"account_ids": []int64{resetDeviceID}}); r.GetStatus() != 200 {
			t.Fatalf("consume %s = %d %s", code, r.GetStatus(), r.GetBody())
		}
		if got, ok := e.summary(t, resetDeviceID)[key]; ok {
			t.Fatalf("after %s: cached %+v, want none", code, got)
		}
	}
	// A failing KV never fails the consume.
	e.host.kv = failingKV{}
	if r := e.consume(map[string]any{"account_ids": []int64{resetDeviceID}}); r.GetStatus() != 200 {
		t.Fatalf("consume with a failing KV = %d %s", r.GetStatus(), r.GetBody())
	}
}

package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type reviewHeldHelperCommit struct {
	*helperMemory
	entered chan struct{}
	release chan struct{}
}

func (s *reviewHeldHelperCommit) Commit(ctx context.Context, owner core.ResourceOwner, id string, c core.HelperHistoryCompletion) (core.HelperHistoryRecord, error) {
	close(s.entered)
	select {
	case <-s.release:
		return s.helperMemory.Commit(ctx, owner, id, c)
	case <-ctx.Done():
		return core.HelperHistoryRecord{}, ctx.Err()
	}
}

func reviewHelperRequest(t *testing.T, ctx context.Context, e *env, b any) *http.Request {
	t.Helper()
	raw, err := json.Marshal(b)
	if err != nil {
		t.Fatal(err)
	}
	r, err := http.NewRequestWithContext(ctx, http.MethodPost, e.srv.URL+"/v1/messages", bytes.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("x-api-key", testKey)
	r.Header.Set("anthropic-version", "2023-06-01")
	return r
}

func TestReviewHelperNoHeadersBeforeDurableCommit(t *testing.T) {
	for _, stream := range []bool{false, true} {
		e, s, calls := helperHTTPFixture(t)
		hold := &reviewHeldHelperCommit{helperMemory: s, entered: make(chan struct{}), release: make(chan struct{})}
		e.gw.d.HelperHistory = hold
		b := helperRequestBody()
		b["stream"] = stream
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		done := make(chan error, 1)
		go func() {
			resp, err := http.DefaultClient.Do(reviewHelperRequest(t, ctx, e, b))
			done <- err // Do returns as soon as response headers arrive.
			if resp != nil {
				_, _ = io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
			}
		}()
		select {
		case <-hold.entered:
		case <-ctx.Done():
			cancel()
			t.Fatal("commit not reached")
		}
		select {
		case err := <-done:
			cancel()
			t.Fatalf("headers escaped before commit: %v", err)
		case <-time.After(80 * time.Millisecond):
		}
		close(hold.release)
		if err := <-done; err != nil {
			cancel()
			t.Fatal(err)
		}
		cancel()
		s.mu.Lock()
		n := len(s.usage)
		s.mu.Unlock()
		if calls.Load() != 1 || n != 1 {
			t.Fatal("duplicate dispatch or usage")
		}
		select {
		case <-e.settler.ch:
			t.Fatal("ordinary usage duplicated custody")
		default:
		}
	}
}

func TestReviewHelperCancellationAfterDispatchNeverRetries(t *testing.T) {
	e, s, _ := helperHTTPFixture(t)
	var calls atomic.Int32
	entered := make(chan struct{}, 1)
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		_, _ = io.Copy(io.Discard, r.Body)
		entered <- struct{}{}
		<-r.Context().Done()
	}))
	defer up.Close()
	e.plat.base = up.URL
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		resp, err := http.DefaultClient.Do(reviewHelperRequest(t, ctx, e, helperRequestBody()))
		if resp != nil {
			resp.Body.Close()
		}
		done <- err
	}()
	select {
	case <-entered:
	case <-time.After(3 * time.Second):
		cancel()
		t.Fatal("not dispatched")
	}
	cancel()
	if err := <-done; err == nil {
		t.Fatal("cancel unexpectedly succeeded")
	}
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		s.mu.Lock()
		n := len(s.usage)
		var saved *core.UsageRecord
		if n > 0 {
			saved = s.usage[0]
		}
		s.mu.Unlock()
		if saved != nil {
			if n != 1 || calls.Load() != 1 || saved.Success || saved.BillingError == "" {
				t.Fatalf("uncertain outcome lost: calls%d records%d usage%+v", calls.Load(), n, saved)
			}
			select {
			case <-e.settler.ch:
				t.Fatal("cancel duplicated Submit")
			default:
			}
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("cancelled dispatch did not freeze unknown accounting")
}

func TestReviewKnownHelperBindingAndNamespaceCannotDrift(t *testing.T) {
	for _, field := range []string{"namespace", "issuer", "generation", "account"} {
		t.Run(field, func(t *testing.T) {
			e, _, calls := helperHTTPFixture(t)
			b := helperRequestBody()
			first := e.messages(b)
			if first.status != 200 {
				t.Fatal(first.status)
			}
			var answer struct{ Content json.RawMessage }
			json.Unmarshal(first.body, &answer)
			raw, _ := json.Marshal(b)
			messages, _, _ := publicHelperPrefixes(raw)
			b["messages"] = append(messages, json.RawMessage(`{"role":"assistant","content":`+string(answer.Content)+`}`), json.RawMessage(`{"role":"user","content":"next"}`))
			checks := 0
			e.gw.helperRuntime = func(_ context.Context, id int64, _ string) (helperRuntimeInfo, error) {
				checks++
				ns := "fixture-policy"
				binding := core.ResourceBinding{AccountID: id, PrincipalID: "issuer", Generation: "epoch"}
				switch field {
				case "namespace":
					ns = "changed"
				case "issuer":
					binding.PrincipalID = "other"
				case "generation":
					binding.Generation = "other"
				case "account":
					binding.AccountID++
				}
				return helperRuntimeInfo{Namespace: ns, Binding: binding}, nil
			}
			result := e.messages(b)
			if result.status != 400 || calls.Load() != 1 || checks != 1 {
				t.Fatalf("binding drift status%d calls%d checks%d", result.status, calls.Load(), checks)
			}
		})
	}
}

func TestReviewHelperTruncatedEnvelopeKeepsUnknownOutcome(t *testing.T) {
	e, s, _ := helperHTTPFixture(t)
	var calls atomic.Int32
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		_, _ = io.Copy(io.Discard, r.Body)
		w.Header().Set("Content-Type", "application/vnd.ccgateway.helper-history+json")
		_, _ = io.WriteString(w, `{"version":1,"status_code":200,"body":`)
	}))
	defer up.Close()
	e.plat.base = up.URL
	result := e.messages(helperRequestBody())
	if result.status != 503 || calls.Load() != 1 {
		t.Fatalf("unknown operation retried: status%d calls%d", result.status, calls.Load())
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.commits != 0 || len(s.usage) != 1 || s.usage[0].Success || s.usage[0].BillingError == "" {
		t.Fatal("unknown partial transport was recorded as completed")
	}
	select {
	case <-e.settler.ch:
		t.Fatal("unknown usage duplicated Submit")
	default:
	}
}

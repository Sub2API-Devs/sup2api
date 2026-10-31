package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// fakeProvider records deliveries and answers with the queued outcomes
// (nil: delivered).
type fakeProvider struct {
	mu       sync.Mutex
	got      []*pluginv1.DeliverNotificationRequest
	outcomes []error
}

func (p *fakeProvider) DeliverNotification(_ context.Context, in *pluginv1.DeliverNotificationRequest) (*pluginv1.DeliverNotificationResponse, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.got = append(p.got, in)
	var err error
	if len(p.outcomes) > 0 {
		err, p.outcomes = p.outcomes[0], p.outcomes[1:]
	}
	var rejected errRejected
	if errors.As(err, &rejected) {
		return &pluginv1.DeliverNotificationResponse{Rejected: rejected.reason}, nil
	}
	return &pluginv1.DeliverNotificationResponse{}, err
}

type fakeGen struct {
	core.Generation
	channels []core.NotificationChannelBinding
}

func (g fakeGen) NotificationChannels() []core.NotificationChannelBinding { return g.channels }

type fakeRegistry struct{ gen core.Generation }

func (r fakeRegistry) Current() core.Generation                     { return r.gen }
func (fakeRegistry) OnChange(func(core.Generation)) (cancel func()) { return func() {} }

type fakeTokens struct{}

func (fakeTokens) VerifyAccessToken(_ context.Context, tok string) (int64, error) {
	return strconv.ParseInt(strings.TrimPrefix(tok, "u"), 10, 64)
}

type fakeAuthz struct{}

func (fakeAuthz) Can(_ context.Context, uid int64, _ string) (bool, error) { return uid == 1, nil }
func (fakeAuthz) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}
func (fakeAuthz) CanGrant(context.Context, int64, []string) error { return nil }
func (fakeAuthz) CanActOn(context.Context, int64, []string) error { return nil }

func setup(t *testing.T) (*Service, *fakeProvider, *store.DB) {
	db := testutil.DB(t)
	p := &fakeProvider{}
	gen := fakeGen{channels: []core.NotificationChannelBinding{{
		Plugin:  core.PluginInfo{Key: "mailer"},
		Channel: manifest.NotificationChannel{ID: "email", Label: manifest.LocalizedText{"en": "Email"}, Recipient: manifest.RecipientEmail},
		Client:  p,
	}}}
	s := New(db, fakeRegistry{gen: gen}, Options{RateLimit: 3, MaxAttempts: 3, BackoffMin: time.Millisecond, BackoffMax: time.Millisecond})
	return s, p, db
}

func email(subject string) core.Notification {
	return core.Notification{Channel: "email", Recipients: []string{" ops@example.com "}, Subject: subject, Body: "body"}
}

func status(t *testing.T, db *store.DB, id int64) (st string, attempts int, lastErr string) {
	t.Helper()
	if err := db.Pool.QueryRow(context.Background(), `SELECT status, attempts, last_error FROM notifications WHERE id = $1`, id).
		Scan(&st, &attempts, &lastErr); err != nil {
		t.Fatal(err)
	}
	return
}

// due makes every queued row due now (the retry delay has passed).
func due(t *testing.T, db *store.DB) {
	t.Helper()
	if _, err := db.Pool.Exec(context.Background(), `UPDATE notifications SET next_attempt_at = now() - interval '1 second'
		WHERE status IN ('pending', 'sending')`); err != nil {
		t.Fatal(err)
	}
}

func TestNotifyValidation(t *testing.T) {
	s, _, _ := setup(t)
	ctx := context.Background()
	for name, n := range map[string]core.Notification{
		"unknown channel": {Channel: "sms", Recipients: []string{"x"}, Subject: "s"},
		"no recipient":    {Channel: "email", Recipients: []string{" "}, Subject: "s"},
		"bad email":       {Channel: "email", Recipients: []string{"Ops <ops@example.com>"}, Subject: "s"},
		"two lines":       {Channel: "email", Recipients: []string{"a@b.co"}, Subject: "a\nb"},
		"severity":        {Channel: "email", Recipients: []string{"a@b.co"}, Subject: "s", Severity: "panic"},
		"dedupe window":   {Channel: "email", Recipients: []string{"a@b.co"}, Subject: "s", DedupeKey: "k", DedupeSeconds: 86401},
	} {
		if _, err := s.Notify(ctx, "dynweight", n); core.AsError(err).Code != "invalid_argument" {
			t.Errorf("%s: %v", name, err)
		}
	}
}

func TestNotifyDedupeAndRateLimit(t *testing.T) {
	s, _, db := setup(t)
	ctx := context.Background()
	n := email("weight dropped")
	n.DedupeKey = "account:7"
	first, err := s.Notify(ctx, "dynweight", n)
	if err != nil || first.Deduplicated {
		t.Fatalf("first: %+v %v", first, err)
	}
	again, err := s.Notify(ctx, "dynweight", n)
	if err != nil || !again.Deduplicated || again.ID != first.ID {
		t.Fatalf("dedupe: %+v %v", again, err)
	}
	// Another source has its own keys and its own limit.
	guard, err := s.Notify(ctx, "guard", n)
	if err != nil || guard.Deduplicated {
		t.Fatalf("other source: %+v %v", guard, err)
	}
	// A failed notification does not hold its key.
	if _, err := db.Pool.Exec(ctx, `UPDATE notifications SET status = 'failed' WHERE id = $1`, guard.ID); err != nil {
		t.Fatal(err)
	}
	if r, err := s.Notify(ctx, "guard", n); err != nil || r.Deduplicated || r.ID == guard.ID {
		t.Fatalf("after a failure: %+v %v", r, err)
	}
	var recipients []string
	if err := db.Pool.QueryRow(ctx, `SELECT recipients FROM notifications WHERE id = $1`, first.ID).Scan(&recipients); err != nil || fmt.Sprint(recipients) != "[ops@example.com]" {
		t.Fatalf("recipients: %v %v", recipients, err)
	}
	for i := 0; i < 2; i++ {
		if _, err := s.Notify(ctx, "dynweight", email("more")); err != nil {
			t.Fatalf("within limit: %v", err)
		}
	}
	if _, err := s.Notify(ctx, "dynweight", email("too many")); core.AsError(err).Code != "rate_limited" {
		t.Fatalf("rate limit: %v", err)
	}
}

func TestDeliveryOutcomes(t *testing.T) {
	s, p, db := setup(t)
	ctx := context.Background()
	sent, _ := s.Notify(ctx, "dynweight", email("sent"))
	retried, _ := s.Notify(ctx, "dynweight", email("retried"))
	rejected, _ := s.Notify(ctx, "dynweight", email("rejected"))
	p.outcomes = []error{nil, errors.New("smtp: connection refused"), errRejected{"mailbox unavailable"}}
	// One row per step, in order.
	for i := 0; i < 3; i++ {
		if !s.step(ctx) {
			t.Fatalf("step %d claimed nothing", i)
		}
	}
	if st, _, _ := status(t, db, sent.ID); st != "sent" {
		t.Fatalf("sent: %s", st)
	}
	if st, attempts, e := status(t, db, retried.ID); st != "pending" || attempts != 1 || e != "smtp: connection refused" {
		t.Fatalf("retry: %s %d %q", st, attempts, e)
	}
	if st, _, e := status(t, db, rejected.ID); st != "failed" || e != "mailbox unavailable" {
		t.Fatalf("rejected: %s %q", st, e)
	}
	got := p.got[0]
	if got.Channel != "email" || got.Source != "dynweight" || got.Severity != "info" || got.Attempt != 1 || got.Id != sent.ID {
		t.Fatalf("request: %+v", got)
	}

	// Cut off by shutdown, a delivery gives its attempt back.
	canceled, cancel := context.WithCancel(ctx)
	cancel()
	if _, err := db.Pool.Exec(ctx, `UPDATE notifications SET status = 'sending', attempts = 2 WHERE id = $1`, retried.ID); err != nil {
		t.Fatal(err)
	}
	s.finish(canceled, queued{id: retried.ID, attempt: 2}, context.Canceled)
	if st, attempts, _ := status(t, db, retried.ID); st != "pending" || attempts != 1 {
		t.Fatalf("shutdown: %s %d", st, attempts)
	}

	// The retried row fails for good after MaxAttempts (3).
	p.outcomes = []error{errors.New("again"), errors.New("still")}
	for i := 0; i < 2; i++ {
		due(t, db)
		s.step(ctx)
	}
	if st, attempts, e := status(t, db, retried.ID); st != "failed" || attempts != 3 || e != "still" {
		t.Fatalf("exhausted: %s %d %q", st, attempts, e)
	}
}

func TestDeliveryLeaseAndMissingChannel(t *testing.T) {
	s, _, db := setup(t)
	ctx := context.Background()
	r, _ := s.Notify(ctx, "dynweight", email("lease"))
	last, _ := s.Notify(ctx, "dynweight", email("last"))
	// A worker that outlived its lease does not overwrite the next claim.
	q := queued{id: r.ID, attempt: 1}
	if _, err := db.Pool.Exec(ctx, `UPDATE notifications SET status = 'sending', attempts = 2 WHERE id = $1`, r.ID); err != nil {
		t.Fatal(err)
	}
	s.finish(ctx, q, nil)
	if st, _, _ := status(t, db, r.ID); st != "sending" {
		t.Fatalf("stale finish applied: %s", st)
	}
	// The provider plugin is not bound (starting, restarting, gone): the
	// row waits without using an attempt, then fails after UnboundFor.
	var provider string
	if err := db.Pool.QueryRow(ctx, `SELECT provider FROM notifications WHERE id = $1`, r.ID).Scan(&provider); err != nil || provider != "mailer" {
		t.Fatalf("provider: %q %v", provider, err)
	}
	bound := s.reg
	s.reg = fakeRegistry{gen: fakeGen{}}
	due(t, db)
	s.step(ctx)
	if st, attempts, e := status(t, db, r.ID); st != "pending" || attempts != 2 || !strings.Contains(e, "not available") {
		t.Fatalf("missing channel: %s %d %q", st, attempts, e)
	}
	// Another plugin now holding the channel id does not get the row either.
	s.reg = fakeRegistry{gen: fakeGen{channels: []core.NotificationChannelBinding{{
		Plugin: core.PluginInfo{Key: "acme"}, Channel: manifest.NotificationChannel{ID: "email"}, Client: &fakeProvider{}}}}}
	due(t, db)
	s.step(ctx)
	if st, attempts, _ := status(t, db, r.ID); st != "pending" || attempts != 2 {
		t.Fatalf("other provider: %s %d", st, attempts)
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE notifications SET created_at = now() - interval '25 hours' WHERE id = $1`, r.ID); err != nil {
		t.Fatal(err)
	}
	due(t, db)
	s.step(ctx)
	if st, _, e := status(t, db, r.ID); st != "failed" || !strings.Contains(e, "not available") {
		t.Fatalf("unbound for too long: %s %q", st, e)
	}
	s.reg = bound

	// A last attempt whose lease ran out is not claimed again: purge fails it.
	if _, err := db.Pool.Exec(ctx, `UPDATE notifications SET status = 'sending', attempts = 3 WHERE id = $1`, last.ID); err != nil {
		t.Fatal(err)
	}
	due(t, db)
	if s.step(ctx) {
		t.Fatal("claimed a row past MaxAttempts")
	}
	s.purge(ctx)
	if st, attempts, e := status(t, db, last.ID); st != "failed" || attempts != 3 || e != "the last attempt did not finish" {
		t.Fatalf("expired last attempt: %s %d %q", st, attempts, e)
	}
}

func TestRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	s, _, db := setup(t)
	if _, err := db.Pool.Exec(context.Background(), `INSERT INTO users (id, email, password_hash) VALUES (1, 'a@x.com', 'x'), (2, 'b@x.com', 'x')`); err != nil {
		t.Fatal(err)
	}
	engine := gin.New()
	s.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, fakeAuthz{}))
	do := func(uid int, method, path string, body any) (int, map[string]any) {
		b, _ := json.Marshal(body)
		req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewReader(b))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer u%d", uid))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, req)
		var out map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		return w.Code, out
	}
	if code, _ := do(2, "GET", "/notifications/channels", nil); code != http.StatusForbidden {
		t.Fatalf("perm: %d", code)
	}
	_, out := do(1, "GET", "/notifications/channels", nil)
	ch := out["data"].([]any)[0].(map[string]any)
	if ch["id"] != "email" || ch["plugin_key"] != "mailer" || ch["recipient"] != "email" {
		t.Fatalf("channels: %v", out)
	}
	if code, out := do(1, "POST", "/notifications/test", map[string]any{"channel": "email", "recipients": []string{"bad"}}); code != 400 {
		t.Fatalf("test validation: %d %v", code, out)
	}
	if code, out := do(1, "POST", "/notifications/test", map[string]any{"channel": "email", "recipients": []string{"ops@example.com"}}); code != 200 {
		t.Fatalf("test: %d %v", code, out)
	}
	_, out = do(1, "GET", "/notifications?status=pending", nil)
	items := out["data"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["source"] != sourceTest {
		t.Fatalf("list: %v", out)
	}
	if _, out = do(1, "GET", "/notifications?status=sent", nil); len(out["data"].([]any)) != 0 {
		t.Fatalf("filter: %v", out)
	}
}

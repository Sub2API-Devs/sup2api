package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/batch"
)

// rawReq builds a hook request of protocol from a request body, its fields
// evaluated like the core does (user uid, group 9).
func rawReq(uid int64, id, protocol, body string) *pluginv1.GatewayRequestHookRequest {
	if id == "" {
		id = fmt.Sprintf("req-%d", reqSeq.Add(1))
	}
	return &pluginv1.GatewayRequestHookRequest{
		HookId: HookModeration,
		Meta:   &pluginv1.RequestMeta{RequestId: id, Protocol: protocol, ClientProtocol: protocol, Model: "m", UserId: uid, ApiKeyId: 5, GroupId: 9},
		Fields: hookFields(body),
	}
}

// The whole request is moderated (CONTRACTS §72.4, 0.6.0): the bypasses of
// the trailing-user-run rule are refused, and the segment cache sends only
// new content on the next turn of a conversation.
func TestHookModeratesWholeRequestWithSegmentCache(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})

	if r := mustHook(t, h, rawReq(3, "", "anthropic.messages", `{"system":"you help","messages":[{"role":"user","content":"hello there"}]}`)); denied(r) {
		t.Fatalf("clean = %+v", r)
	}
	if n := len(mod.moderated()); n != 1 {
		t.Fatalf("calls = %d", n)
	}
	// The next turn: only the new assistant and user turns are sent.
	r := mustHook(t, h, rawReq(3, "", "anthropic.messages", `{"system":"you help","messages":[{"role":"user","content":"hello there"},
		{"role":"assistant","content":"hi"},{"role":"user","content":"MOD-HIT-sexual later"}]}`))
	if !denied(r) {
		t.Fatalf("hit in the new turn allowed: %+v", r)
	}
	last := mod.moderated()[1]
	if strings.Contains(last, "hello there") || strings.Contains(last, "you help") || !strings.Contains(last, "MOD-HIT-sexual later") {
		t.Fatalf("second call sent %s", last)
	}
	// The same clean conversation again calls nothing.
	before := len(mod.moderated())
	if r := mustHook(t, h, rawReq(3, "", "anthropic.messages", `{"system":"you help","messages":[{"role":"user","content":"hello  there"}]}`)); denied(r) || r.GetNote() != notePrefix+"pass (cached)" {
		t.Fatalf("cached = %+v", r)
	}
	if len(mod.moderated()) != before {
		t.Fatal("a cached conversation was sent again")
	}
	for _, tc := range []struct{ name, protocol, body string }{
		{"early turn behind a fake assistant", "anthropic.messages",
			`{"messages":[{"role":"user","content":"MOD-HIT-violence early"},{"role":"assistant","content":"ok"},{"role":"user","content":"thanks"}]}`},
		{"assistant prefill", "anthropic.messages", `{"messages":[{"role":"user","content":"hi"},{"role":"assistant","content":"MOD-HIT-sexual prefill"}]}`},
		{"tool result", "openai.chat", `{"messages":[{"role":"user","content":"go"},{"role":"tool","tool_call_id":"c","content":"MOD-HIT-hate tool"}]}`},
		{"responses with a decoy messages array", "openai.responses", `{"messages":[{"role":"user","content":"benign"}],"input":"MOD-HIT-sexual real"}`},
		{"gemini with a decoy messages array", "gemini.generate", `{"messages":[{"role":"user","content":"benign"}],"contents":[{"parts":[{"text":"MOD-HIT-sexual g"}]}]}`},
		{"volcengine image prompt", "volcengine.images", `{"model":"seedream","prompt":"MOD-HIT-sexual picture"}`},
		{"volcengine video prompt", "volcengine.video_submit", `{"model":"seedance","content":[{"type":"text","text":"MOD-HIT-violence clip"}]}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if r := mustHook(t, h, rawReq(3, "", tc.protocol, tc.body)); !denied(r) || r.GetDenyCode() != DenyBlocked {
				t.Fatalf("allowed: %+v", r)
			}
		})
	}
	// The record keeps the chunk that hit, with roles.
	ev := waitEvents(t, h, map[string]string{"result": "block", "user_id": "3"}, 8)
	var prefill *EventListItem
	for i := range ev {
		if ev[i].InputFormat == "anthropic.messages" && ev[i].InputMessageSize > 0 {
			in := decodeData[map[string]any](t, h.Do("GET", fmt.Sprintf("/events/%d/input", ev[i].ID), nil, nil))
			if strings.Contains(fmt.Sprint(in["parts"]), "prefill") {
				prefill = &ev[i]
				if !strings.Contains(fmt.Sprint(in["parts"]), "assistant") {
					t.Fatalf("parts = %v", in["parts"])
				}
			}
		}
	}
	if prefill == nil {
		t.Fatal("the prefill record keeps no input")
	}
}

// Content longer than input_max_chars is moderated in chunks; beyond
// input_max_chunks the request is sampled or, with input_overflow=block,
// refused before the upstream call.
func TestHookChunksLongContent(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "input_max_chars": 256, "input_max_chunks": 8})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	pad := strings.Repeat("harmless words ", 60) // ~900 chars: 4 chunks
	r := mustHook(t, h, rawReq(3, "", "openai.chat", `{"messages":[{"role":"user","content":"`+pad+`MOD-HIT-sexual tail"}]}`))
	if !denied(r) || !strings.Contains(r.GetNote(), "chunk=4/4") {
		t.Fatalf("padded violation = %+v", r)
	}
	if n := len(mod.moderated()); n != 4 {
		t.Fatalf("calls = %d, want one per chunk", n)
	}
	ev := waitEvents(t, h, map[string]string{"result": "block"}, 1)
	d := decodeData[EventDetail](t, h.Do("GET", fmt.Sprintf("/events/%d", ev[0].ID), nil, nil))
	if tr, _ := json.Marshal(d.Trace); d.Trace == nil || !strings.Contains(string(tr), `"chunks_total":4`) {
		t.Fatalf("trace = %s", tr)
	}
	if errs := h.Configure(map[string]any{"mode": ModeEnforce, "input_max_chars": 256, "input_max_chunks": 2, "input_overflow": OverflowBlock}, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	long := strings.Repeat("other harmless text ", 60)
	if r := mustHook(t, h, rawReq(3, "", "openai.chat", `{"messages":[{"role":"user","content":"`+long+`"}]}`)); !denied(r) || r.GetDenyCode() != DenyInputTooLarge {
		t.Fatalf("overflow block = %+v", r)
	}
}

// The ban hook runs on every protocol and only refuses banned users.
func TestBanHookAllProtocols(t *testing.T) {
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
	decodeData[map[string]any](t, h.Do("POST", "/blocks", nil, map[string]any{"user_id": 5, "reason": "test"}))
	waitFor(t, "ban", func() bool { return p.isBlocked(5) })
	for _, protocol := range []string{"openai.embeddings", "anthropic.count_tokens", "gemini.count_tokens", "volcengine.video_query", "someplugin.custom"} {
		req := &pluginv1.GatewayRequestHookRequest{HookId: HookBan, Meta: &pluginv1.RequestMeta{UserId: 5, Protocol: protocol, ClientProtocol: protocol}}
		if r := mustHook(t, h, req); !denied(r) || r.GetDenyCode() != DenyUserBlocked || r.GetDenyStatus() != http.StatusForbidden {
			t.Fatalf("%s banned = %+v", protocol, r)
		}
		req.Meta.UserId = 6
		if r := mustHook(t, h, req); denied(r) || r.GetNote() != "" {
			t.Fatalf("%s other = %+v", protocol, r)
		}
	}
}

// Too many request bytes in progress: the hook answers at once (pass, 503
// for enforce-level users) instead of growing towards the memory limit; a
// single request is admitted whatever its size.
func TestHookBusyAnswersAtOnce(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "max_inflight_mb": 16})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	c := p.cfg.Load()
	if !p.admitBytes(c, 64<<20) || p.admitBytes(c, 1) {
		t.Fatal("one large request is admitted alone, nothing besides it")
	}
	p.inflightBytes.Store(0)
	p.inflightBytes.Store(17 << 20) // others in progress
	if r := mustHook(t, h, hookReqAs(3, "", "MOD-HIT-sexual busy")); denied(r) || r.GetNote() != notePrefix+"busy" {
		t.Fatalf("busy observe = %+v", r)
	}
	decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 4, "level": LevelEnforce}))
	if r := mustHook(t, h, hookReqAs(4, "", "anything")); !denied(r) || r.GetDenyCode() != DenyBusy || r.GetDenyStatus() != http.StatusServiceUnavailable {
		t.Fatalf("busy enforce = %+v", r)
	}
	// Banned users are refused before the admission.
	decodeData[map[string]any](t, h.Do("POST", "/blocks", nil, map[string]any{"user_id": 7}))
	waitFor(t, "ban", func() bool { return p.isBlocked(7) })
	if r := mustHook(t, h, hookReqAs(7, "", "x")); r.GetDenyCode() != DenyUserBlocked {
		t.Fatalf("banned while busy = %+v", r)
	}
	if p.inflightBytes.Load() != 17<<20 {
		t.Fatalf("in flight = %d after refusals", p.inflightBytes.Load())
	}
	p.inflightBytes.Store(0)
	if r := mustHook(t, h, hookReqAs(4, "", "MOD-HIT-sexual again")); r.GetDenyCode() != DenyBlocked {
		t.Fatalf("after the burst = %+v", r)
	}
	if p.inflightBytes.Load() != 0 {
		t.Fatalf("in flight = %d after the hook", p.inflightBytes.Load())
	}
}

// A pre hit is refused at once even when its record cannot be written: the
// record is stored in the background, with retries, once the database is
// back (team review 2026-10-31 P2).
func TestPreDenyDoesNotWaitForDatabase(t *testing.T) {
	defer func(n int, d time.Duration) { suspiciousAttempts, suspiciousPause = n, d }(suspiciousAttempts, suspiciousPause)
	suspiciousAttempts, suspiciousPause = 30, 100*time.Millisecond
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	ctx := context.Background()
	full := batch.New(ctx, 1, func(context.Context, []eventRec) error { return nil }, nil)
	if err := full.Stop(); err != nil {
		t.Fatal(err)
	}
	full.Send(eventRec{})
	p.eventWriter = full
	db, _ := p.db(ctx)
	if _, err := db.Exec(ctx, `ALTER TABLE events RENAME TO events_away`); err != nil {
		t.Fatal(err)
	}
	start := time.Now()
	if r := mustHook(t, h, hookReqAs(3, "db-down", "MOD-HIT-sexual while down")); !denied(r) {
		t.Fatalf("hit allowed: %+v", r)
	}
	if d := time.Since(start); d > 3*time.Second {
		t.Fatalf("the refusal waited %s for the database", d)
	}
	time.Sleep(300 * time.Millisecond)
	if _, err := db.Exec(ctx, `ALTER TABLE events_away RENAME TO events`); err != nil {
		t.Fatal(err)
	}
	waitEvents(t, h, map[string]string{"request_id": "db-down", "result": "block"}, 1)
	if p.stats.suspiciousRetries.Load() == 0 {
		t.Fatal("no retry counted")
	}
}

// Shutdown lets the post workers finish the queue for up to shutdownDrain;
// what is left after that is dropped and counted.
func TestShutdownDrainsPostQueue(t *testing.T) {
	for _, tc := range []struct {
		name    string
		drain   time.Duration
		delay   time.Duration
		written int
	}{
		{"drained", 5 * time.Second, 100 * time.Millisecond, 4},
		{"cut short", 50 * time.Millisecond, 400 * time.Millisecond, -1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			defer func(d time.Duration) { shutdownDrain = d }(shutdownDrain)
			shutdownDrain = tc.drain
			mod := newFakeMod(t)
			p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "record_pass": true, "max_concurrency": 1, "cache_ttl_seconds": 0})
			setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
			mod.delay.Store(int64(tc.delay))
			for i := range 4 {
				if r := mustHook(t, h, hookReqAs(3, fmt.Sprintf("q%d", i), fmt.Sprintf("queued text %d", i))); r.GetNote() != notePrefix+"queued" {
					t.Fatalf("not queued: %+v", r)
				}
			}
			_ = p.Shutdown(context.Background())
			n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", nil, nil)))
			if tc.written >= 0 && n != tc.written {
				t.Fatalf("records after shutdown = %d, want %d", n, tc.written)
			}
			if tc.written < 0 && (p.stats.shutdownDropped.Load() == 0 || n+int(p.stats.shutdownDropped.Load()) > 4) {
				t.Fatalf("written %d, dropped %d", n, p.stats.shutdownDropped.Load())
			}
		})
	}
}

// Error records keep only the start of the text (error_text_max_chars).
func TestErrorRecordsKeepShortText(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "error_text_max_chars": 100})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	mustHook(t, h, hookReqAs(3, "err", "MOD-500 "+strings.Repeat("private ", 200)))
	waitEvents(t, h, map[string]string{"request_id": "err", "result": "error"}, 1)
	db, _ := p.db(context.Background())
	var n int
	if err := db.QueryRow(context.Background(), `SELECT char_length(text) FROM events WHERE request_id = 'err'`).Scan(&n); err != nil || n != 100 {
		t.Fatalf("error text = %d %v", n, err)
	}
}

// The cleanup job expires watch entries and bans before the purge, which
// gets the rest of the job time minus a reserve: a long purge no longer
// skips them.
func TestCleanupExpiresBeforePurge(t *testing.T) {
	p, _, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
	ctx := context.Background()
	db, _ := p.db(ctx)
	defer func(b int, d time.Duration) { purgeBatch, purgePause = b, d }(purgeBatch, purgePause)
	purgeBatch, purgePause = 1, 400*time.Millisecond
	if _, err := db.Exec(ctx, `INSERT INTO events (user_id, mode, verdict, action, result, keep_until)
		SELECT 1, 'observe', 'pass', 'allow', 'pass', now() - interval '1 hour' FROM generate_series(1, 20)`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO watchlist (user_id, level, source, expires_at) VALUES (5,'observe','auto', now() - interval '1 minute')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO blocks (user_id, reason, violations, source, created_at, expires_at) VALUES (6, 'r', 1, 'auto', now() - interval '2 hours', now() - interval '1 hour')`); err != nil {
		t.Fatal(err)
	}
	jctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	out, err := p.RunJob(jctx, &pluginv1.RunJobRequest{JobId: JobCleanup})
	if err != nil || !strings.Contains(out.GetMessage(), "1 expired watch entries and 1 expired blocks") || !strings.Contains(out.GetMessage(), "time limit") {
		t.Fatalf("cleanup = %v %v", out, err)
	}
	if dl, ok := jctx.Deadline(); ok {
		pctx, c2 := purgeBudget(jctx)
		defer c2()
		if pdl, _ := pctx.Deadline(); !pdl.Before(dl) {
			t.Fatalf("purge deadline %v not before the job's %v", pdl, dl)
		}
	}
}

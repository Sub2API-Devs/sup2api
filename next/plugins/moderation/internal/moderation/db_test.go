package moderation

import (
	"context"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

func startDB(t *testing.T, llm *fakeLLM, extra map[string]any) (*Plugin, *pluginsdktest.Harness, *pluginsdktest.FakeHost) {
	t.Helper()
	dsn, schema := pluginsdktest.NewSchema(t, "plg_moderation_t")
	pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))
	fh := pluginsdktest.NewFakeHost()
	fh.SetDSN(dsn, schema)
	p := New()
	h := pluginsdktest.Start(t, p, pluginsdktest.Options{Host: fh, SDK: sdkOpts(), Config: settingsMap(llm.srv.URL, ModeEnforce, extra)})
	return p, h, fh
}

func decodeData[T any](t *testing.T, resp *pluginv1.HTTPResponse) T {
	t.Helper()
	if resp.GetStatus() != 200 {
		t.Fatalf("HTTP %d %s", resp.GetStatus(), resp.GetBody())
	}
	var out struct {
		Data T `json:"data"`
	}
	if err := json.Unmarshal(resp.GetBody(), &out); err != nil {
		t.Fatalf("%v: %s", err, resp.GetBody())
	}
	return out.Data
}

func waitEvents(t *testing.T, h *pluginsdktest.Harness, q map[string]string, n int) []EventListItem {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for {
		items := decodeData[[]EventListItem](t, h.Do("GET", "/events", q, nil))
		if len(items) >= n || time.Now().After(deadline) {
			return items
		}
		time.Sleep(200 * time.Millisecond)
	}
}

func TestEventsAndOverview(t *testing.T) {
	llm := mockLLM(t)
	_, h, _ := startDB(t, llm, map[string]any{"store_text": true})
	ctx := context.Background()
	mustHook(t, h, hookReq("please MOD-BLOCK this "+strings.Repeat("长", 200)))
	mustHook(t, h, hookReq("MOD-FLAG maybe"))
	mustHook(t, h, hookReq("quicksort in Go"))
	items := waitEvents(t, h, map[string]string{"user_id": "3"}, 3)
	if len(items) != 3 {
		t.Fatalf("events = %d", len(items))
	}
	var list struct {
		Page struct {
			Page     int   `json:"page"`
			PageSize int   `json:"page_size"`
			Total    int64 `json:"total"`
		} `json:"page"`
	}
	resp := h.Do("GET", "/events", map[string]string{"page_size": "2"}, nil)
	_ = json.Unmarshal(resp.GetBody(), &list)
	if list.Page.Total != 3 || list.Page.PageSize != 2 || list.Page.Page != 1 || strings.Contains(string(resp.GetBody()), `"text":`) {
		t.Fatalf("list = %s", resp.GetBody())
	}
	blocks := decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"verdict": "block", "action": "deny", "mode": "enforce", "category": "illegal", "q": "MOD-BLOCK"}, nil))
	if len(blocks) != 1 || blocks[0].UserID != 3 || blocks[0].APIKeyID != 5 || blocks[0].GroupID != 9 || blocks[0].Model != "claude-opus-5" ||
		blocks[0].Protocol != "anthropic.messages" || blocks[0].Severity != "high" || blocks[0].Reason != "违法内容" || blocks[0].Turns != 1 ||
		blocks[0].PromptTokens != 100 || blocks[0].LLMModel != "mock-mod-1" || blocks[0].TextChars != 222 || blocks[0].TextHash == "" ||
		len([]rune(blocks[0].TextExcerpt)) != 120 || blocks[0].Cached {
		t.Fatalf("block event = %+v", blocks[0])
	}
	if got := decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"q": "nomatch-xyz"}, nil)); len(got) != 0 {
		t.Fatalf("q filter = %+v", got)
	}
	if got := decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"from": time.Now().Add(time.Hour).UTC().Format(time.RFC3339)}, nil)); len(got) != 0 {
		t.Fatalf("from filter = %+v", got)
	}
	id := blocks[0].ID
	req := &pluginv1.HTTPRequest{Method: "GET", Path: "/events/" + fmtInt(id), RoutePath: "/events/:id", PathParams: map[string]string{"id": fmtInt(id)}}
	r, err := h.HTTP.HandleHTTP(ctx, req)
	if err != nil {
		t.Fatal(err)
	}
	d := decodeData[EventDetail](t, r)
	if d.ID != id || d.Text == nil || !strings.HasPrefix(*d.Text, "please MOD-BLOCK") || len(d.Categories) != 1 {
		t.Fatalf("detail = %+v", d)
	}
	ov := decodeData[Overview](t, h.Do("GET", "/overview", map[string]string{"range": "24h"}, nil))
	if ov.Totals.Total != 3 || ov.Totals.Pass != 1 || ov.Totals.Flag != 1 || ov.Totals.Block != 1 || ov.Totals.Denied != 1 ||
		ov.Bucket != "hour" || len(ov.Trend) < 24 || len(ov.Trend) > 26 || ov.TopCategories[0].Category != "illegal" ||
		len(ov.TopUsers) != 1 || ov.TopUsers[0].UserID != 3 || ov.TopUsers[0].Count != 1 ||
		ov.Runtime.Mode != ModeEnforce || !ov.Runtime.Configured || ov.Runtime.Calls != 3 || ov.Runtime.QueueCap != 1000 {
		t.Fatalf("overview = %+v", ov)
	}
	sum := int64(0)
	for _, tp := range ov.Trend {
		sum += tp.Pass + tp.Flag + tp.Block
	}
	if sum != 3 {
		t.Fatalf("trend sum = %d", sum)
	}
	if ov7 := decodeData[Overview](t, h.Do("GET", "/overview", map[string]string{"range": "7d"}, nil)); ov7.Bucket != "day" || len(ov7.Trend) < 7 || ov7.Totals.Total != 3 {
		t.Fatalf("7d = %+v", ov7)
	}
	// Delete.
	req.Method = "DELETE"
	if r, _ := h.HTTP.HandleHTTP(ctx, req); r.GetStatus() != 200 {
		t.Fatalf("delete = %d %s", r.GetStatus(), r.GetBody())
	}
	if r, _ := h.HTTP.HandleHTTP(ctx, req); r.GetStatus() != 404 {
		t.Fatalf("delete again = %d", r.GetStatus())
	}
	req.Method, req.Path, req.PathParams = "GET", "/events/abc", map[string]string{"id": "abc"}
	if r, _ := h.HTTP.HandleHTTP(ctx, req); r.GetStatus() != 400 {
		t.Fatalf("bad id = %d", r.GetStatus())
	}
	// Errors are recorded too; passes are not without record_pass.
	if errs := h.Configure(settingsMap("http://127.0.0.1:1", ModeEnforce, map[string]any{"record_pass": false, "timeout_ms": 2000}), nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	mustHook(t, h, hookReq("unreachable upstream"))
	errsEv := waitEvents(t, h, map[string]string{"verdict": "error"}, 1)
	if len(errsEv) != 1 || errsEv[0].Action != ActionAllow || errsEv[0].Error == "" {
		t.Fatalf("error event = %+v", errsEv)
	}
}

func fmtInt(i int64) string {
	b, _ := json.Marshal(i)
	return string(b)
}

func TestAutoBanAndUnblock(t *testing.T) {
	llm := mockLLM(t)
	p, h, fh := startDB(t, llm, map[string]any{"ban_threshold": 2, "ban_window_hours": 1, "ban_duration_hours": 0, "cache_ttl_seconds": 0})
	p.refreshEvery = time.Hour // only broadcasts/kicks reload
	ctx := context.Background()
	mustHook(t, h, hookReq("first MOD-BLOCK"))
	if r := mustHook(t, h, hookReq("harmless")); denied(r) {
		t.Fatal("not banned after one violation")
	}
	mustHook(t, h, hookReq("second MOD-BLOCK"))
	deadline := time.Now().Add(10 * time.Second)
	for !p.isBlocked(3) {
		if time.Now().After(deadline) {
			t.Fatal("user not banned")
		}
		time.Sleep(100 * time.Millisecond)
	}
	if r := mustHook(t, h, hookReq("harmless again")); !denied(r) || r.GetDenyCode() != DenyUserBlocked {
		t.Fatalf("banned = %v", r)
	}
	if pub := fh.Published(); len(pub) != 1 || pub[0].Topic != TopicBlocksChanged {
		t.Fatalf("published = %+v", pub)
	}
	blocks := decodeData[[]Block](t, h.Do("GET", "/blocks", nil, nil))
	if len(blocks) != 1 || blocks[0].UserID != 3 || blocks[0].Source != "auto" || blocks[0].Violations != 2 || blocks[0].ExpiresAt != nil {
		t.Fatalf("blocks = %+v", blocks)
	}
	// Another node reloads on the broadcast.
	p2 := New()
	p2.refreshEvery = time.Hour
	fh2 := pluginsdktest.NewFakeHost()
	fh2.SetDSN(fh.DSNValue, fh.SchemaValue)
	h2 := pluginsdktest.Start(t, p2, pluginsdktest.Options{Host: fh2, SDK: sdkOpts(), Config: settingsMap(llm.srv.URL, ModeEnforce, nil)})
	if err := h2.Deliver(TopicBlocksChanged, nil, "node-1"); err != nil || !p2.isBlocked(3) {
		t.Fatalf("node 2 reload: %v blocked %v", err, p2.isBlocked(3))
	}
	// Unblock: the count restarts, so one more violation does not re-ban.
	del := &pluginv1.HTTPRequest{Method: "DELETE", Path: "/blocks/3", RoutePath: "/blocks/:user_id", PathParams: map[string]string{"user_id": "3"}}
	if r, _ := h.HTTP.HandleHTTP(ctx, del); r.GetStatus() != 200 || p.isBlocked(3) {
		t.Fatalf("unblock = %d %s", r.GetStatus(), r.GetBody())
	}
	if r, _ := h.HTTP.HandleHTTP(ctx, del); r.GetStatus() != 404 {
		t.Fatalf("unblock again = %d", r.GetStatus())
	}
	mustHook(t, h, hookReq("third MOD-BLOCK"))
	waitEvents(t, h, map[string]string{"verdict": "block"}, 3)
	time.Sleep(1500 * time.Millisecond)
	if p.isBlocked(3) {
		t.Fatal("violations before the unblock must not count")
	}
	mustHook(t, h, hookReq("fourth MOD-BLOCK"))
	deadline = time.Now().Add(10 * time.Second)
	for !p.isBlocked(3) {
		if time.Now().After(deadline) {
			t.Fatal("user not banned again after two new violations")
		}
		time.Sleep(100 * time.Millisecond)
	}
	// Manual block with expiry, listed, then cleanup removes it once expired.
	r := h.Do("POST", "/blocks", nil, map[string]any{"user_id": 42, "reason": "spam", "duration_hours": 1})
	b := decodeData[Block](t, r)
	if b.UserID != 42 || b.Source != "manual" || b.Reason != "spam" || b.ExpiresAt == nil || b.CreatedBy == nil || *b.CreatedBy != 1 || !p.isBlocked(42) {
		t.Fatalf("manual block = %+v", b)
	}
	if r := h.Do("POST", "/blocks", nil, map[string]any{"user_id": 0}); r.GetStatus() != 400 {
		t.Fatalf("bad block = %d", r.GetStatus())
	}
	if list := decodeData[[]Block](t, h.Do("GET", "/blocks", nil, nil)); len(list) != 2 || list[0].UserID != 42 {
		t.Fatalf("blocks = %+v", list)
	}
	p.now = func() time.Time { return time.Now().Add(2 * time.Hour) }
	job, err := h.App.RunJob(ctx, &pluginv1.RunJobRequest{JobId: JobCleanup})
	if err != nil || !strings.Contains(job.GetMessage(), "1 expired blocks") {
		t.Fatalf("cleanup = %v %v", job, err)
	}
	if list := decodeData[[]Block](t, h.Do("GET", "/blocks", nil, nil)); len(list) != 1 || list[0].UserID != 3 {
		t.Fatalf("after cleanup = %+v", list)
	}
	db, _ := p.db(ctx)
	var n int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM unblocks WHERE user_id = 42`).Scan(&n); err != nil || n != 1 {
		t.Fatalf("expired ban must record an unblock: %d %v", n, err)
	}
	// Retention: events older than retention_days go.
	if errs := h.Configure(settingsMap(llm.srv.URL, ModeEnforce, map[string]any{"retention_days": 1}), nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	p.now = func() time.Time { return time.Now().Add(3 * 24 * time.Hour) }
	job, err = h.App.RunJob(ctx, &pluginv1.RunJobRequest{JobId: JobCleanup})
	if err != nil || !strings.HasPrefix(job.GetMessage(), "deleted 5 events") { // 4 blocks + the recorded "harmless" pass
		t.Fatalf("cleanup = %v %v", job, err)
	}
}

func TestObserveRecords(t *testing.T) {
	llm := mockLLM(t)
	_, h, _ := startDB(t, llm, map[string]any{"mode": ModeObserve})
	r := mustHook(t, h, hookReq("observe MOD-BLOCK "+strings.Repeat("x", 10)))
	if denied(r) {
		t.Fatal("observe must allow")
	}
	items := waitEvents(t, h, map[string]string{"mode": "observe"}, 1)
	if len(items) != 1 || items[0].Verdict != VerdictBlock || items[0].Action != ActionAllow || items[0].RequestID == "" || items[0].Turns != 1 {
		t.Fatalf("observe event = %+v", items)
	}
}

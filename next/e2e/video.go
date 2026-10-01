package e2e

import (
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/tidwall/gjson"
)

const videoPath = "/ark/v3/contents/generations/tasks"

type videoObservation struct {
	TaskID   string `json:"task_id"`
	APIKey   string `json:"api_key"`
	Source   string `json:"source"`
	Active   bool   `json:"active"`
	Canceled bool   `json:"canceled"`
	Status   int    `json:"status"`
}

type videoStats struct {
	ID        string             `json:"id"`
	APIKey    string             `json:"api_key"`
	Active    int                `json:"active"`
	MaxActive int                `json:"max_active"`
	Queries   []videoObservation `json:"queries"`
}

func (e *Env) controlVideo(key, state string, block bool) {
	e.T.Helper()
	r := NewClient(e.MockURL).Do(e.T, http.MethodPost, "/__video/control", map[string]any{
		"api_key": key, "state": state, "block": block, "output_tokens": 17, "delay_ms": 25,
	})
	if r.Status != 200 {
		e.T.Fatalf("video control: %s", r)
	}
}

func (e *Env) videoStats(key, id string) []videoStats {
	e.T.Helper()
	r := NewClient(e.MockURL).Do(e.T, http.MethodGet, "/__video/stats", nil, Query("api_key", key, "task_id", id))
	var out struct {
		Tasks []videoStats `json:"tasks"`
	}
	if r.Status != 200 {
		e.T.Fatalf("video stats: %s", r)
	}
	if err := json.Unmarshal(r.Body, &out); err != nil {
		e.T.Fatal(err)
	}
	return out.Tasks
}

func (e *Env) videoTaskStats(id string) videoStats {
	e.T.Helper()
	items := e.videoStats("", id)
	if len(items) != 1 {
		e.T.Fatalf("upstream task %s: got %d tasks", id, len(items))
	}
	return items[0]
}

func (e *Env) newVideoTenant(admin *Session) *Tenant {
	e.T.Helper()
	tn := &Tenant{Model: e.RunModelOf(admin, "doubao-seedance-2-0-mini", e.Name("video"))}
	tn.GroupID = e.CreateGroup(admin, e.Name("video-group"), "restricted", 1, nil)
	for i := 0; i < 2; i++ {
		key := e.Name("video-account")
		id := e.CreateAccount(admin, AccountSpec{PluginKey: "volcengine", Type: "relay", GroupIDs: []int64{tn.GroupID}, APIKey: key, MaxConcurrency: 4,
			Settings: map[string]any{"video_api_prefix": "/api/v3"}})
		tn.Accounts = append(tn.Accounts, TenantAccount{ID: id, Key: key})
		e.controlVideo(key, "running", true)
	}
	tn.User = e.CreateUser(admin, UserSpec{})
	e.SetUserGroups(admin, tn.User.UserID, []int64{tn.GroupID})
	e.AdjustBalance(admin, tn.User.UserID, "20", true, "video E2E initial credit")
	tn.KeyID, tn.APIKey = e.CreateAPIKey(tn.User, tn.GroupID)
	return tn
}

type submittedVideo struct {
	PublicID   string
	RequestID  string
	UpstreamID string
	Account    TenantAccount
}

func (e *Env) submitVideo(tn *Tenant) submittedVideo {
	e.T.Helper()
	r := NewClient(e.NodeURLs[0]).Do(e.T, http.MethodPost, videoPath, map[string]any{
		"model": tn.Model, "content": []map[string]string{{"type": "text", "text": "A mock clip"}},
		"resolution": "480p", "ratio": "16:9", "duration": 4,
	}, Header("Authorization", "Bearer "+tn.APIKey))
	if r.Status != 200 {
		e.T.Fatalf("video submit: %s", r)
	}
	out := submittedVideo{PublicID: r.JSON().Get("id").String(), RequestID: r.Header.Get("X-Request-Id")}
	if !strings.HasPrefix(out.PublicID, "s2task_") || out.RequestID == "" {
		e.T.Fatalf("video receipt missing public id/request id: %s", r)
	}
	count := 0
	for _, a := range tn.Accounts {
		for _, task := range e.videoStats(a.Key, "") {
			count++
			out.UpstreamID, out.Account = task.ID, a
		}
	}
	if count != 1 || out.PublicID == out.UpstreamID {
		e.T.Fatalf("submission must execute once and rewrite identity: %+v; upstream tasks=%d", out, count)
	}
	// The response must not precede durable task identity, reservation, or receipt.
	q := fmt.Sprintf(`SELECT t.account_id,u.billing_status,r.state FROM async_tasks t JOIN usage_logs u ON u.id=t.usage_log_id JOIN task_submission_receipts r ON r.public_id=t.public_id WHERE t.public_id=%s`, sqlText(out.PublicID))
	want := fmt.Sprintf("%d|reserved|registered", out.Account.ID)
	if rows := e.SQL(q); len(rows) != 1 || rows[0] != want {
		e.T.Fatalf("response before durable reservation: got %v want %s", rows, want)
	}
	if Money(e.T, e.Balance(tn.User)).Cmp(big.NewRat(20, 1)) >= 0 {
		e.T.Fatal("video submission did not reserve a positive cost")
	}
	return out
}

func (e *Env) queryVideo(base, key, id string) *Resp {
	e.T.Helper()
	return NewClient(base).Do(e.T, http.MethodGet, videoPath+"/"+PathEscape(id), nil, Header("Authorization", "Bearer "+key))
}

func (e *Env) assertVideoSnapshot(base string, tn *Tenant, v submittedVideo, state string) {
	e.T.Helper()
	r := e.queryVideo(base, tn.APIKey, v.PublicID)
	if r.Status != 200 || r.JSON().Get("id").String() != v.PublicID || (state != "" && r.JSON().Get("status").String() != state) {
		e.T.Fatalf("shared task snapshot (want %s): %s", state, r)
	}
}

func (e *Env) waitVideoActive(v submittedVideo) videoStats {
	e.T.Helper()
	var stats videoStats
	Eventually(e.T, 80*time.Second, 200*time.Millisecond, "one active video monitor", func() bool {
		stats = e.videoTaskStats(v.UpstreamID)
		if stats.MaxActive > 1 {
			e.T.Fatalf("concurrent task monitors: %+v", stats)
		}
		return stats.Active == 1
	})
	return stats
}

func (e *Env) waitVideoState(base string, tn *Tenant, v submittedVideo, state string, timeout time.Duration) {
	e.T.Helper()
	Eventually(e.T, timeout, time.Second, "video state "+state, func() bool {
		r := e.queryVideo(base, tn.APIKey, v.PublicID)
		if r.Status != 200 || r.JSON().Get("id").String() != v.PublicID {
			e.T.Fatalf("task disappeared while monitoring: %s", r)
		}
		return r.JSON().Get("status").String() == state
	})
}

func (e *Env) assertVideoAccounting(admin *Session, tn *Tenant, v submittedVideo, success bool) {
	e.T.Helper()
	u := e.UsageByRequest(admin, tn.User.UserID, v.RequestID)
	want, status := big.NewRat(0, 1), "free"
	if success {
		want = ExpectedTokenCost(RunPrice, 0, 17, 0, 0, 0, 1)
		status = "billed"
	}
	if u.Get("billing_status").String() != status || u.Get("account_id").Int() != v.Account.ID {
		e.T.Fatalf("video settlement: %s", u.Raw)
	}
	if success && u.Get("output_tokens").Int() != 17 {
		e.T.Fatalf("monitor usage was not settled: %s", u.Raw)
	}
	AssertMoney(e.T, "final video cost", u.Get("total_cost").String(), want)
	AssertMoney(e.T, "final video balance", e.Balance(tn.User), new(big.Rat).Sub(big.NewRat(20, 1), want))
	var entries []gjson.Result
	net := new(big.Rat)
	debits, refunds := 0, 0
	for _, l := range e.Ledger(admin, tn.User.UserID, "") {
		if l.Get("ref_id").String() != v.RequestID {
			continue
		}
		entries = append(entries, l)
		net.Add(net, Money(e.T, l.Get("delta").String()))
		switch l.Get("kind").String() {
		case "usage":
			debits++
		case "refund":
			refunds++
		}
	}
	if len(entries) != 2 || debits != 1 || refunds != 1 {
		e.T.Fatalf("expected one reservation and one refund adjustment: %v", entries)
	}
	if net.Cmp(new(big.Rat).Neg(want)) != 0 {
		e.T.Fatalf("net ledger=%s, final cost=%s", net, want)
	}
	rows := e.SQL(fmt.Sprintf(`SELECT count(*) FROM usage_logs WHERE request_id=%s`, sqlText(v.RequestID)))
	if len(rows) != 1 || rows[0] != "1" {
		e.T.Fatalf("duplicate submit usage: %v", rows)
	}
	for _, a := range tn.Accounts {
		items := e.videoStats(a.Key, "")
		if a.ID == v.Account.ID && (len(items) != 1 || items[0].ID != v.UpstreamID) {
			e.T.Fatalf("submit duplicated on original account: %+v", items)
		}
		if a.ID != v.Account.ID && len(items) != 0 {
			e.T.Fatalf("submit retried on another account: %+v", items)
		}
	}
	stats := e.videoTaskStats(v.UpstreamID)
	if stats.MaxActive != 1 {
		e.T.Fatalf("task monitor concurrency=%d", stats.MaxActive)
	}
	for _, q := range stats.Queries {
		if q.APIKey != v.Account.Key {
			e.T.Fatalf("task queried with another account: %+v", q)
		}
	}
}

// Observe at least one whole 10-second scheduler tick after reaching a terminal
// state. Repeated client GETs must neither poll upstream nor settle again.
func (e *Env) assertVideoTerminalStable(admin *Session, tn *Tenant, v submittedVideo, success bool) {
	e.T.Helper()
	before := len(e.videoTaskStats(v.UpstreamID).Queries)
	state := "failed"
	if success {
		state = "succeeded"
	}
	deadline := time.Now().Add(12 * time.Second)
	for {
		for _, base := range e.NodeURLs {
			e.assertVideoSnapshot(base, tn, v, state)
		}
		if stats := e.videoTaskStats(v.UpstreamID); stats.Active != 0 || len(stats.Queries) != before {
			e.T.Fatalf("terminal task was polled again: %+v", stats)
		}
		if time.Now().After(deadline) {
			break
		}
		time.Sleep(time.Second)
	}
	e.assertVideoAccounting(admin, tn, v, success)
}

func sqlText(s string) string { return "'" + strings.ReplaceAll(s, "'", "''") + "'" }

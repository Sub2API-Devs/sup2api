package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"
)

var turnToken = regexp.MustCompile(`[A-Z0-9_]*TURN_[A-Z0-9_]*[A-Z0-9]`)

// lastTurn is the last turn token in v's JSON: the latest user turn of a
// request, or the text of one record.
func lastTurn(v any) string {
	b, _ := json.Marshal(v)
	all := turnToken.FindAllString(string(b), -1)
	if len(all) == 0 {
		return ""
	}
	return all[len(all)-1]
}

// CONTRACTS §53.12 against the real CLI and a local fake upstream: three
// turns of one client session, a rewind, two concurrent requests, another
// caller scope and an unrelated conversation keep one internal session and
// one native file with sibling branches and roots. Upstream sees only the
// gateway's session U (and A' for a subagent), never the client's identifiers.
func TestRealCLISessionBranchKeepsOneSession(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for the session branch compatibility test")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	type seen struct{ session, agent, userID, raw, turn, history string }
	var mu sync.Mutex
	var upstream []seen
	inFlight, peak := 0, 0
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		metadata, _ := body["metadata"].(Object)
		turn := lastTurn(body["messages"])
		messages, _ := json.Marshal(body["messages"])
		history := strings.Join(turnToken.FindAllString(string(messages), -1), ",")
		mu.Lock()
		upstream = append(upstream, seen{r.Header.Get("X-Claude-Code-Session-Id"), r.Header.Get("X-Claude-Code-Agent-Id"), str(metadata, "user_id"), string(raw) + fmt.Sprint(r.Header), turn, history})
		inFlight++
		peak = max(peak, inFlight)
		mu.Unlock()
		if strings.HasPrefix(turn, "CONCURRENT_") {
			time.Sleep(1500 * time.Millisecond)
		}
		mu.Lock()
		inFlight--
		mu.Unlock()
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "ANSWER_FOR_" + turn}})
	}))
	defer fake.Close()
	cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
	if err != nil {
		t.Fatal(err)
	}
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, fake.URL)}
	g := &Gateway{Runner: runner, Cache: cache, Timeout: 60 * time.Second, Slots: make(chan struct{}, 4)}
	const s = "6a3f2c1e-9b8d-4e7f-a1b2-c3d4e5f60718"
	const clientDevice = "c11e47de71ce00000000000000000000000000000000000000000000000000c1"
	const clientAccount = "c11e47ac-c000-4000-8000-0000000000a1"
	const clientAgent = "a0123456789abcdef"
	u := upstreamSessionID(s)
	agentU := upstreamAgentID(s, clientAgent)
	metadata := Object{"user_id": `{"device_id":"` + clientDevice + `","account_uuid":"` + clientAccount + `","session_id":"` + s + `"}`}
	post := func(label, scope, agent string, withSession bool, messages ...any) (Object, http.Header) {
		t.Helper()
		body := Object{"model": "claude-opus-5-5", "max_tokens": 64, "system": "SESSION_FIXTURE_SYSTEM", "messages": messages}
		if withSession {
			body["metadata"] = metadata
		}
		raw, _ := json.Marshal(body)
		r := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		r.Header.Set("X-CCGateway-Session-Scope", scope)
		r.Header.Set("X-CCGateway-Session-ID", "legacy-header-is-ignored")
		if agent != "" {
			r.Header.Set("X-Claude-Code-Agent-Id", agent)
		}
		w := httptest.NewRecorder()
		g.ServeHTTP(w, r)
		if w.Code != 200 {
			t.Errorf("%s HTTP %d %s", label, w.Code, w.Body.String())
			return nil, w.Header()
		}
		answer, err := decodeObject(w.Body.Bytes())
		if err != nil {
			t.Errorf("%s: %v", label, err)
		}
		t.Logf("CLI=%s %s history=%s", version, label, w.Header().Get("X-CCGateway-History"))
		return Object{"role": "assistant", "content": answer["content"]}, w.Header()
	}
	expectMode := func(label string, h http.Header, mode string) {
		t.Helper()
		if got := h.Get("X-CCGateway-History"); got != mode {
			t.Fatalf("%s history=%s, want %s", label, got, mode)
		}
	}
	const scopeA, scopeB = "user:7:key:9", "user:8:key:1"
	q := func(text string) Object { return Object{"role": "user", "content": text} }
	a1, h := post("turn 1", scopeA, "", true, q("TURN_1"))
	expectMode("turn 1", h, "rebuild")
	a2, h := post("turn 2", scopeA, "", true, q("TURN_1"), a1, q("TURN_2"))
	expectMode("turn 2", h, "prefix-hit")
	// Another caller scope continues the same session.
	a3, h := post("turn 3 (other scope)", scopeB, "", true, q("TURN_1"), a1, q("TURN_2"), a2, q("TURN_3"))
	expectMode("turn 3", h, "prefix-hit")
	_, h = post("rewind", scopeA, "", true, q("TURN_1"), a1, q("TURN_2_REWOUND"))
	expectMode("rewind", h, "fork")
	// Two requests of the session at once, from the same node.
	var wg sync.WaitGroup
	concurrent := make([]Object, 2)
	modes := make([]string, 2)
	for i, label := range []string{"CONCURRENT_A_TURN_4", "CONCURRENT_B_TURN_4"} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			var h http.Header
			concurrent[i], h = post(label, scopeA, "", true, q("TURN_1"), a1, q("TURN_2"), a2, q("TURN_3"), a3, q(label))
			modes[i] = h.Get("X-CCGateway-History")
		}()
	}
	wg.Wait()
	if t.Failed() {
		t.FailNow()
	}
	for _, mode := range modes {
		if mode != "prefix-hit" && mode != "fork" {
			t.Fatalf("concurrent request rebuilt: %v", modes)
		}
	}
	_, h = post("after concurrent", scopeA, "", true, q("TURN_1"), a1, q("TURN_2"), a2, q("TURN_3"), a3, q("CONCURRENT_A_TURN_4"), concurrent[0], q("TURN_5"))
	expectMode("after concurrent", h, "prefix-hit")
	// An unrelated conversation under the same session: a new root.
	r1, h := post("new root", scopeB, "", true, q("ROOT2_TURN_1"))
	expectMode("new root", h, "rebuild")
	_, h = post("new root continued", scopeA, "", true, q("ROOT2_TURN_1"), r1, q("ROOT2_TURN_2"))
	expectMode("new root continued", h, "prefix-hit")
	_, h = post("subagent", scopeA, clientAgent, true, q("SUB_TURN_1"))
	expectMode("subagent", h, "rebuild")
	_, h = post("no session", scopeA, clientAgent, false, q("TURN_1"), a1, q("NO_SESSION_TURN_2"))
	expectMode("no session", h, "rebuild")
	_, h = post("no session again", scopeA, "", false, q("TURN_1"), a1, q("NO_SESSION_TURN_3"))
	expectMode("no session again", h, "rebuild")

	mu.Lock()
	defer mu.Unlock()
	if peak < 2 {
		t.Fatal("concurrent requests of one session waited for each other")
	}
	noSession := map[string]bool{}
	for _, up := range upstream {
		for _, secret := range []string{s, clientDevice, clientAccount, clientAgent, "legacy-header-is-ignored"} {
			if strings.Contains(up.raw, secret) {
				t.Fatalf("%s: client identifier %s sent upstream", up.turn, secret)
			}
		}
		var userID map[string]string
		if err := json.Unmarshal([]byte(up.userID), &userID); err != nil || userID["session_id"] != up.session || userID["device_id"] == "" || len(userID) != 3 {
			t.Fatalf("%s: upstream user_id %q does not carry the header session %q", up.turn, up.userID, up.session)
		}
		switch {
		case strings.HasPrefix(up.turn, "NO_SESSION_"):
			if up.session == "" || up.session == u || up.agent != "" {
				t.Fatalf("request without a session sent %q %q upstream", up.session, up.agent)
			}
			noSession[up.session] = true
		case up.turn == "SUB_TURN_1":
			if up.session != u || up.agent != agentU {
				t.Fatalf("subagent upstream identity %q %q, want %q %q", up.session, up.agent, u, agentU)
			}
		default:
			if up.session != u || up.agent != "" {
				t.Fatalf("%s: upstream session %q agent %q, want %q", up.turn, up.session, up.agent, u)
			}
		}
		// The CLI sends exactly the resumed branch, never a sibling's turns.
		want := map[string]string{
			"TURN_3":              "TURN_1,ANSWER_FOR_TURN_1,TURN_2,ANSWER_FOR_TURN_2,TURN_3",
			"TURN_2_REWOUND":      "TURN_1,ANSWER_FOR_TURN_1,TURN_2_REWOUND",
			"CONCURRENT_B_TURN_4": "TURN_1,ANSWER_FOR_TURN_1,TURN_2,ANSWER_FOR_TURN_2,TURN_3,ANSWER_FOR_TURN_3,CONCURRENT_B_TURN_4",
			"TURN_5":              "TURN_1,ANSWER_FOR_TURN_1,TURN_2,ANSWER_FOR_TURN_2,TURN_3,ANSWER_FOR_TURN_3,CONCURRENT_A_TURN_4,ANSWER_FOR_CONCURRENT_A_TURN_4,TURN_5",
			"ROOT2_TURN_1":        "ROOT2_TURN_1",
			"ROOT2_TURN_2":        "ROOT2_TURN_1,ANSWER_FOR_ROOT2_TURN_1,ROOT2_TURN_2",
		}[up.turn]
		if want != "" && up.history != want {
			t.Fatalf("%s upstream history %s, want %s", up.turn, up.history, want)
		}
	}
	if len(noSession) != 2 {
		t.Fatal("requests without a session must each get a new upstream session")
	}
	t.Logf("upstream requests=%d; session U=%s, subagent A'=%s; no client identifier upstream", len(upstream), u, agentU)
	mainID, subID := u, nativeBranchID(s, clientAgent)
	files, _ := filepath.Glob(filepath.Join(cache.dir, "native", "*.jsonl"))
	if len(files) != 2 || !samePath(files, cache.canonicalPath(mainID)) || !samePath(files, cache.canonicalPath(subID)) {
		t.Fatalf("native files %v, want main %s and subagent %s", files, mainID, subID)
	}
	if leftovers, _ := filepath.Glob(filepath.Join(root, "config", "projects", "*", "*.jsonl")); len(leftovers) != 0 {
		t.Fatalf("CLI transcripts left behind: %v", leftovers)
	}
	rows, err := readNativeFile(cache.canonicalPath(mainID))
	if err != nil {
		t.Fatal(err)
	}
	ids := map[string]bool{}
	for _, raw := range rows {
		id, _, sid := rowIdentity(raw)
		if sid != "" && sid != mainID {
			t.Fatalf("record of session %s in the branch file", sid)
		}
		if id != "" && ids[id] {
			t.Fatal("duplicate record in the branch file")
		}
		ids[id] = true
	}
	// Each answer is reachable on its own branch of the one file.
	chainOf := func(answer string) string {
		for _, raw := range rows {
			row, _ := decodeObject(raw)
			if str(row, "type") != "assistant" || lastTurn(row["message"]) != answer {
				continue
			}
			var turns []string
			for _, record := range nativeChain(rows, str(row, "uuid")) {
				r, _ := decodeObject(record)
				if str(r, "type") == "user" {
					if turn := lastTurn(r["message"]); turn != "" {
						turns = append(turns, turn)
					}
				}
			}
			return strings.Join(turns, ",")
		}
		return "missing"
	}
	for answer, want := range map[string]string{
		"ANSWER_FOR_TURN_3":              "TURN_1,TURN_2,TURN_3",
		"ANSWER_FOR_TURN_2_REWOUND":      "TURN_1,TURN_2_REWOUND",
		"ANSWER_FOR_CONCURRENT_A_TURN_4": "TURN_1,TURN_2,TURN_3,CONCURRENT_A_TURN_4",
		"ANSWER_FOR_CONCURRENT_B_TURN_4": "TURN_1,TURN_2,TURN_3,CONCURRENT_B_TURN_4",
		"ANSWER_FOR_TURN_5":              "TURN_1,TURN_2,TURN_3,CONCURRENT_A_TURN_4,TURN_5",
		"ANSWER_FOR_ROOT2_TURN_2":        "ROOT2_TURN_1,ROOT2_TURN_2",
	} {
		if got := chainOf(answer); got != want {
			t.Fatalf("branch of %s = %s, want %s", answer, got, want)
		}
	}
	t.Logf("one native file %s.jsonl, %d records, six branches on two roots verified", mainID, len(rows))
}

func samePath(list []string, s string) bool {
	for _, v := range list {
		if filepath.Clean(v) == filepath.Clean(s) {
			return true
		}
	}
	return false
}

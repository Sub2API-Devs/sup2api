package engine

import (
	"bytes"
	"crypto/sha256"
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

// CONTRACTS §53.12: one client session, one internal CLI session per branch.

func policyRequest(t *testing.T, body Object) *Request {
	t.Helper()
	raw, _ := json.Marshal(body)
	r, err := parsePolicyRequest(raw, http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	return r
}

// userRequest is a request whose metadata.user_id is userID (nil: absent).
func userRequest(t *testing.T, userID any) *Request {
	t.Helper()
	body := basic()
	if userID != nil {
		body["metadata"] = Object{"user_id": userID}
	}
	return policyRequest(t, body)
}

func scopeHeader(scope, agent string) http.Header {
	h := http.Header{}
	h.Set("X-CCGateway-Session-Scope", scope)
	if agent != "" {
		h.Set("X-Claude-Code-Agent-Id", agent)
	}
	return h
}

func TestClientSessionIDDerivation(t *testing.T) {
	const s = "11111111-2222-4333-8444-555555555555"
	// 1. JSON user_id with a UUID session_id.
	structured := `{"device_id":"d","account_uuid":"","session_id":"` + s + `"}`
	if got := clientSessionID(userRequest(t, structured)); got != s {
		t.Fatalf("rule 1: %q", got)
	}
	// 2. Any other nonempty user_id: a digest UUID, including JSON without a
	// UUID session_id.
	for _, userID := range []string{"user_opaque", `{"session_id":"not-a-uuid"}`} {
		got := clientSessionID(userRequest(t, userID))
		sum := sha256.Sum256([]byte("ccgateway-session-v1" + userID))
		if got != digestUUID(sum) || !nativeSessionName.MatchString(got) || got[14] != '4' || !strings.ContainsRune("89ab", rune(got[19])) {
			t.Fatalf("rule 2 %q: %q", userID, got)
		}
	}
	if a := clientSessionID(userRequest(t, "user_a")); a == "" || a == clientSessionID(userRequest(t, "user_b")) {
		t.Fatal("rule 2 must separate user IDs")
	}
	// No user_id (absent, null or empty metadata): a new session. The legacy
	// header is ignored entirely, whatever its value.
	empty := basic()
	empty["metadata"] = Object{}
	for _, r := range []*Request{userRequest(t, nil), policyRequest(t, empty), userRequest(t, "")} {
		if got := clientSessionID(r); got != "" {
			t.Fatalf("no user_id: %q", got)
		}
		for _, legacy := range []string{"legacy-session", "has space"} {
			h := scopeHeader("user:1:key:1", "")
			h.Set("X-CCGateway-Session-ID", legacy)
			b, err := newSessionBranch(r, h)
			if err != nil || b.indexed() || b.Client != "" {
				t.Fatalf("legacy header %q selected a session: %+v %v", legacy, b, err)
			}
		}
	}
	nullUser := basic()
	nullUser["metadata"] = Object{"user_id": nil}
	if got := clientSessionID(policyRequest(t, nullUser)); got != "" {
		t.Fatalf("null user_id: %q", got)
	}
}

func TestSessionBranchIdentity(t *testing.T) {
	const s1 = "11111111-2222-4333-8444-555555555555"
	r := userRequest(t, `{"device_id":"client-device","account_uuid":"client-account","session_id":"`+s1+`"}`)
	main, err := newSessionBranch(r, scopeHeader("user:1:key:1", ""))
	if err != nil {
		t.Fatal(err)
	}
	again, _ := newSessionBranch(r, scopeHeader("user:1:key:1", ""))
	if !main.indexed() || main.ID != again.ID || main.Logical != again.Logical || main.Client != s1 {
		t.Fatal("same branch must keep its internal ID")
	}
	// U: fixed per S, unrelated to S, and the main thread's own ID.
	if main.Upstream != upstreamSessionID(s1) || main.Upstream == s1 || main.ID != main.Upstream || main.UpstreamAgent != "" {
		t.Fatalf("main thread upstream identity %+v", main)
	}
	// The caller scope does not select the session: same S, same branch.
	for _, scope := range []string{"user:2:key:2", ""} {
		other, _ := newSessionBranch(r, scopeHeader(scope, ""))
		if other != main {
			t.Fatalf("scope %q changed the session branch: %+v", scope, other)
		}
	}
	agent, _ := newSessionBranch(r, scopeHeader("user:1:key:1", "agent-a"))
	otherAgent, _ := newSessionBranch(r, scopeHeader("user:1:key:1", "agent-b"))
	otherSession, _ := newSessionBranch(userRequest(t, "other-user"), scopeHeader("user:1:key:1", ""))
	ids := map[string]bool{main.ID: true, agent.ID: true, otherAgent.ID: true, otherSession.ID: true}
	logicals := map[string]bool{main.Logical: true, agent.Logical: true, otherAgent.Logical: true, otherSession.Logical: true}
	if len(ids) != 4 || len(logicals) != 4 || agent.AgentID != "agent-a" || agent.ID != nativeBranchID(s1, "agent-a") {
		t.Fatal("subagents and sessions must not share a branch")
	}
	for id := range ids {
		if !nativeSessionName.MatchString(id) {
			t.Fatal("internal ID is not a UUID", id)
		}
	}
	// Subagents share the session's U; other sessions do not.
	if agent.Upstream != main.Upstream || otherAgent.Upstream != main.Upstream || otherSession.Upstream == main.Upstream {
		t.Fatal("U must be per S, shared by subagents")
	}
	// A': CLI format, fixed, distinct per A, unrelated to A, scope-independent.
	nativeAgent := regexp.MustCompile(`^a[0-9a-f]{16}$`)
	againAgent, _ := newSessionBranch(r, scopeHeader("user:9:key:9", "agent-a"))
	if !nativeAgent.MatchString(agent.UpstreamAgent) || agent.UpstreamAgent != againAgent.UpstreamAgent || agent.UpstreamAgent == otherAgent.UpstreamAgent || agent.UpstreamAgent == "agent-a" {
		t.Fatalf("upstream agent IDs %q %q", agent.UpstreamAgent, otherAgent.UpstreamAgent)
	}
	clientNative, _ := newSessionBranch(r, scopeHeader("user:1:key:1", "a4b9310a82c5aa414"))
	if clientNative.UpstreamAgent == "a4b9310a82c5aa414" || !nativeAgent.MatchString(clientNative.UpstreamAgent) {
		t.Fatal("a native-looking client agent ID was sent as is")
	}
	// Generations: generation 0 is the branch ID; later ones are fixed and new.
	if main.fileID(0) != main.ID || main.fileID(1) == main.ID || main.fileID(1) != again.fileID(1) || main.fileID(1) == agent.fileID(1) || !nativeSessionName.MatchString(main.fileID(2)) {
		t.Fatal("generation file IDs")
	}
	// Index namespaces (helper history, resources) never change the file.
	extra, _ := newSessionBranch(r, scopeHeader("user:1:key:1", ""), []string{"helper"})
	if extra.ID != main.ID || extra.Logical == main.Logical {
		t.Fatal("index namespace changed the native file")
	}
	// Without a session: random each time, U is that random ID, A is ignored
	// (even an invalid one).
	none := userRequest(t, nil)
	fresh1, _ := newSessionBranch(none, scopeHeader("user:1:key:1", ""))
	fresh2, err := newSessionBranch(none, scopeHeader("user:1:key:1", "has space"))
	if err != nil || fresh1.indexed() || fresh2.indexed() || fresh1.ID == fresh2.ID || fresh1.Upstream != fresh1.ID || !nativeSessionName.MatchString(fresh1.ID) || fresh2.AgentID != "" || fresh2.UpstreamAgent != "" {
		t.Fatal("a request without a session must be a new random session", err)
	}
	for _, bad := range []string{"has space", "tab\t", strings.Repeat("a", 257), "non-ascii-é"} {
		if _, err := newSessionBranch(r, scopeHeader("", bad)); err == nil {
			t.Fatalf("invalid agent ID %q accepted", bad)
		}
	}
}

// fakeCLI stands in for one CLI run: it appends the submitted input and the
// answer to the file the CLI writes (the private copy, or the projects file of
// a --session-id run), then captures it as the runner does.
func fakeCLI(t *testing.T, p *Prepared, r *Request, config, answer string) Object {
	t.Helper()
	path := p.Path
	if path == "" {
		path = filepath.Join(config, "projects", "fixture", p.SessionID+".jsonl")
		if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
			t.Fatal(err)
		}
	}
	rows, err := readNativeFile(path)
	if err != nil && !os.IsNotExist(err) {
		t.Fatal(err)
	}
	parent := p.Anchor
	if parent == "" && len(rows) > 0 {
		parent, _, _ = rowIdentity(rows[len(rows)-1])
	}
	if p.Anchor != "" && p.LastUUID != p.Anchor {
		// Seeded records after the node: the CLI resumes at the node and then
		// writes the submitted input again.
		parent = p.Anchor
	}
	id := "msg_" + strings.ReplaceAll(uuid(), "-", "")
	content := []Object{{"type": "text", "text": answer}}
	user, _ := json.Marshal(Object{"type": "user", "uuid": p.InputUUID, "parentUuid": nilIfEmpty(parent), "sessionId": p.SessionID, "message": r.pendingWireMessage()})
	reply, _ := json.Marshal(Object{"type": "assistant", "uuid": uuid(), "parentUuid": p.InputUUID, "sessionId": p.SessionID, "message": Object{"id": id, "role": "assistant", "type": "message", "content": content}})
	meta, _ := json.Marshal(Object{"type": "last-prompt", "sessionId": p.SessionID})
	if err := writeNative(path, append(rows, user, reply, meta)); err != nil {
		t.Fatal(err)
	}
	if err := p.captureNative([]string{"CLAUDE_CONFIG_DIR=" + config}, id); err != nil {
		t.Fatal(err)
	}
	return Object{"id": id, "type": "message", "role": "assistant", "stop_reason": "end_turn", "content": content}
}

func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// branchFixture drives requests of one branch through prepare, a fake CLI run
// and commit, as Gateway.execute does.
type branchFixture struct {
	t      *testing.T
	cache  *HistoryCache
	config string
}

func newBranchFixture(t *testing.T) *branchFixture {
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
	if err != nil {
		t.Fatal(err)
	}
	return &branchFixture{t: t, cache: cache, config: t.TempDir()}
}

func (f *branchFixture) prepare(b sessionBranch, messages ...any) (*Request, *Prepared) {
	f.t.Helper()
	r := parsed(f.t, Object{"model": "claude-opus-5-5", "max_tokens": 64, "messages": messages})
	p, err := prepareHistory(r, f.cache, b, f.t.TempDir(), "2.1.292")
	if err != nil {
		f.t.Fatal(err)
	}
	return r, p
}

func (f *branchFixture) finish(b sessionBranch, r *Request, p *Prepared, answer string) Object {
	f.t.Helper()
	out := fakeCLI(f.t, p, r, f.config, answer)
	if b.indexed() {
		if err := p.commit(r, out, f.cache, b.Logical, "", "2.1.292", time.Now()); err != nil {
			f.t.Fatal(err)
		}
	}
	return Object{"role": "assistant", "content": out["content"]}
}

func (f *branchFixture) canonical(id string) []json.RawMessage {
	f.t.Helper()
	rows, err := readNativeFile(f.cache.canonicalPath(id))
	if err != nil {
		f.t.Fatal(err)
	}
	return rows
}

func user(text string) Object { return Object{"role": "user", "content": text} }

func chainTexts(rows []json.RawMessage) string {
	var out []string
	for _, raw := range rows {
		row, _ := decodeObject(raw)
		m, _ := row["message"].(Object)
		if s, ok := m["content"].(string); ok {
			out = append(out, s)
			continue
		}
		blocks, _ := historyContent(m["content"])
		for _, b := range blocks {
			if s := str(b, "text"); s != "" {
				out = append(out, s)
			}
		}
	}
	return strings.Join(out, "/")
}

func TestSessionBranchThreeTurnsKeepOneSession(t *testing.T) {
	f := newBranchFixture(t)
	b := testBranch("three-turns")
	r, p := f.prepare(b, user("Q1"))
	if p.Mode != "rebuild" || p.SessionID != b.ID || filepath.Base(p.Path) != b.ID+".jsonl" {
		t.Fatalf("first turn %s %s %s", p.Mode, p.SessionID, p.Path)
	}
	a1 := f.finish(b, r, p, "A1")
	r, p = f.prepare(b, user("Q1"), a1, user("Q2"))
	if p.Mode != "prefix-hit" || p.SessionID != b.ID {
		t.Fatalf("second turn %s %s", p.Mode, p.SessionID)
	}
	args := strings.Join(cliArgs(r, p, "plugin"), " ")
	if !strings.Contains(args, "--resume "+p.Path+" --resume-session-at "+p.Anchor) || strings.Contains(args, "--fork-session") || strings.Contains(args, "--session-id") {
		t.Fatalf("second turn args: %s", args)
	}
	a2 := f.finish(b, r, p, "A2")
	r, p = f.prepare(b, user("Q1"), a1, user("Q2"), a2, user("Q3"))
	if p.Mode != "prefix-hit" || p.SessionID != b.ID || chainTexts(p.Rows) != "Q1/A1/Q2/A2" {
		t.Fatalf("third turn %s %s %s", p.Mode, p.SessionID, chainTexts(p.Rows))
	}
	f.finish(b, r, p, "A3")
	rows := f.canonical(b.ID)
	for _, raw := range rows {
		if _, _, sid := rowIdentity(raw); sid != "" && sid != b.ID {
			t.Fatal("record of another session in the branch file")
		}
	}
	files, _ := filepath.Glob(filepath.Join(f.cache.dir, "native", "*.jsonl"))
	if len(files) != 1 || filepath.Base(files[0]) != b.ID+".jsonl" {
		t.Fatalf("native files %v", files)
	}
	if got := chainTexts(nativeChain(rows, lastAssistant(t, rows))); got != "Q1/A1/Q2/A2/Q3/A3" {
		t.Fatalf("canonical chain %s", got)
	}
}

func lastAssistant(t *testing.T, rows []json.RawMessage) string {
	t.Helper()
	id := ""
	for _, raw := range rows {
		row, _ := decodeObject(raw)
		if str(row, "type") == "assistant" {
			id = str(row, "uuid")
		}
	}
	return id
}

func assistantNode(t *testing.T, rows []json.RawMessage, text string) string {
	t.Helper()
	for _, raw := range rows {
		row, _ := decodeObject(raw)
		if str(row, "type") == "assistant" && chainTexts([]json.RawMessage{raw}) == text {
			return str(row, "uuid")
		}
	}
	t.Fatalf("no assistant %s", text)
	return ""
}

func TestSessionBranchRewindAndEditBranchInOneFile(t *testing.T) {
	f := newBranchFixture(t)
	b := testBranch("rewind")
	r, p := f.prepare(b, user("Q1"))
	a1 := f.finish(b, r, p, "A1")
	r, p = f.prepare(b, user("Q1"), a1, user("Q2"))
	a2 := f.finish(b, r, p, "A2")
	r, p = f.prepare(b, user("Q1"), a1, user("Q2"), a2, user("Q3"))
	f.finish(b, r, p, "A3")
	nodeA1 := assistantNode(t, f.canonical(b.ID), "A1")
	// Rewind: a different second question after A1.
	r, p = f.prepare(b, user("Q1"), a1, user("Q2-rewound"))
	if p.Mode != "fork" || p.SessionID != b.ID || p.Anchor != nodeA1 || chainTexts(p.Rows) != "Q1/A1" {
		t.Fatalf("rewind %s %s %s", p.Mode, p.Anchor, chainTexts(p.Rows))
	}
	b2 := f.finish(b, r, p, "B2")
	// Continue the rewound branch: it resumes at its own node.
	r, p = f.prepare(b, user("Q1"), a1, user("Q2-rewound"), b2, user("Q3-rewound"))
	if p.Mode != "prefix-hit" || p.SessionID != b.ID || p.Anchor != assistantNode(t, f.canonical(b.ID), "B2") || chainTexts(p.Rows) != "Q1/A1/Q2-rewound/B2" {
		t.Fatalf("rewound continuation %s %s", p.Mode, chainTexts(p.Rows))
	}
	f.finish(b, r, p, "B3")
	// Edit an earlier user message after the first node: seeded records after
	// A1, resumed at the last seeded assistant.
	r, p = f.prepare(b, user("Q1"), a1, user("Q2-edited"), Object{"role": "assistant", "content": "E2"}, user("Q3-edited"))
	if p.Mode != "fork" || p.SessionID != b.ID || !strings.HasPrefix(chainTexts(p.Rows), "Q1/A1/Q2-edited/E2") {
		t.Fatalf("edit %s %s", p.Mode, chainTexts(p.Rows))
	}
	f.finish(b, r, p, "E3")
	rows := f.canonical(b.ID)
	for _, want := range []struct{ leaf, chain string }{{"A3", "Q1/A1/Q2/A2/Q3/A3"}, {"B3", "Q1/A1/Q2-rewound/B2/Q3-rewound/B3"}, {"E3", "Q1/A1/Q2-edited/E2/Q3-edited/E3"}} {
		if got := chainTexts(nativeChain(rows, assistantNode(t, rows, want.leaf))); got != want.chain {
			t.Fatalf("%s chain %s, want %s", want.leaf, got, want.chain)
		}
	}
	seen := map[string]bool{}
	for _, raw := range rows {
		if id, _, _ := rowIdentity(raw); id != "" {
			if seen[id] {
				t.Fatal("duplicate record in the branch file")
			}
			seen[id] = true
		}
	}
}

func TestSessionBranchConcurrentRequestsBecomeSiblings(t *testing.T) {
	f := newBranchFixture(t)
	b := testBranch("concurrent")
	r, p := f.prepare(b, user("Q1"))
	a1 := f.finish(b, r, p, "A1")
	// Two requests of the same branch from the same node, both running at
	// once: neither waits, both keep the session ID, each has its own copy.
	rx, px := f.prepare(b, user("Q1"), a1, user("QX"))
	ry, py := f.prepare(b, user("Q1"), a1, user("QY"))
	if px.SessionID != b.ID || py.SessionID != b.ID || px.Path == py.Path || px.Anchor != py.Anchor {
		t.Fatal("concurrent requests must share the session and node, not the file")
	}
	// Both CLI runs write while neither has merged.
	outX := fakeCLI(t, px, rx, f.config, "AX")
	outY := fakeCLI(t, py, ry, f.config, "AY")
	var wg sync.WaitGroup
	errs := make(chan error, 2)
	for _, run := range []struct {
		r   *Request
		p   *Prepared
		out Object
	}{{rx, px, outX}, {ry, py, outY}} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			errs <- run.p.commit(run.r, run.out, f.cache, b.Logical, "", "2.1.292", time.Now())
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	rows := f.canonical(b.ID)
	nodeA1, nodeX, nodeY := assistantNode(t, rows, "A1"), assistantNode(t, rows, "AX"), assistantNode(t, rows, "AY")
	if chainTexts(nativeChain(rows, nodeX)) != "Q1/A1/QX/AX" || chainTexts(nativeChain(rows, nodeY)) != "Q1/A1/QY/AY" || !nativeHasChildren(rows, nodeA1) {
		t.Fatal("concurrent answers are not sibling branches")
	}
	// Each continuation finds its own branch, and its private copy holds only
	// that branch: the CLI loads one conversation per file (the last written)
	// and cannot resume a node of another one.
	for _, c := range []struct{ q, a, node, other string }{{"QX", "AX", nodeX, "AY"}, {"QY", "AY", nodeY, "AX"}} {
		_, p := f.prepare(b, user("Q1"), a1, user(c.q), Object{"role": "assistant", "content": c.a}, user("next"))
		if p.Mode != "prefix-hit" || p.SessionID != b.ID || p.Anchor != c.node {
			t.Fatalf("continuation of %s: %s %s", c.a, p.Mode, p.Anchor)
		}
		written, _ := os.ReadFile(p.Path)
		if strings.Contains(string(written), c.other) || strings.Contains(string(written), `"last-prompt"`) || !strings.Contains(string(written), c.a) {
			t.Fatalf("private copy of %s holds another branch or a leaf pointer: %s", c.a, written)
		}
	}
}

func TestSessionBranchSubagentsUseSeparateFiles(t *testing.T) {
	f := newBranchFixture(t)
	r := userRequest(t, "parent-session")
	main, _ := newSessionBranch(r, scopeHeader("", ""))
	sub, _ := newSessionBranch(r, scopeHeader("", "agent-1"))
	rm, pm := f.prepare(main, user("MAIN"))
	am := f.finish(main, rm, pm, "MAIN-A")
	rs, ps := f.prepare(sub, user("SUB"))
	f.finish(sub, rs, ps, "SUB-A")
	if pm.SessionID == ps.SessionID || ps.SessionID != sub.ID || pm.SessionID != main.Upstream || sub.Upstream != main.Upstream {
		t.Fatal("subagent shares the main session file, or not its U")
	}
	mainRows, subRows := f.canonical(main.ID), f.canonical(sub.ID)
	if strings.Contains(string(nativeBytes(mainRows)), "SUB") || strings.Contains(string(nativeBytes(subRows)), "MAIN") {
		t.Fatal("subagent and main thread records mixed")
	}
	// The main thread continues undisturbed.
	_, p := f.prepare(main, user("MAIN"), am, user("MAIN2"))
	if p.Mode != "prefix-hit" || p.SessionID != main.ID {
		t.Fatal("subagent disturbed the main thread", p.Mode)
	}
	// The same history under the subagent branch is not the main's.
	_, p = f.prepare(sub, user("MAIN"), am, user("MAIN2"))
	if p.Mode != "rebuild" || p.SessionID != sub.ID {
		t.Fatal("subagent found the main thread's node", p.Mode)
	}
}

// Two subagents of one session running at once: separate files, separate
// upstream agent IDs, one U, each continues its own conversation.
func TestSessionBranchConcurrentSubagents(t *testing.T) {
	f := newBranchFixture(t)
	r := userRequest(t, "parent-session")
	b1, _ := newSessionBranch(r, scopeHeader("user:1:key:1", "agent-one"))
	b2, _ := newSessionBranch(r, scopeHeader("user:1:key:1", "agent-two"))
	r1, p1 := f.prepare(b1, user("ONE"))
	r2, p2 := f.prepare(b2, user("TWO"))
	out1 := fakeCLI(t, p1, r1, f.config, "ONE-A")
	out2 := fakeCLI(t, p2, r2, f.config, "TWO-A")
	var wg sync.WaitGroup
	for _, c := range []struct {
		b   sessionBranch
		r   *Request
		p   *Prepared
		out Object
	}{{b1, r1, p1, out1}, {b2, r2, p2, out2}} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := c.p.commit(c.r, c.out, f.cache, c.b.Logical, "", "2.1.292", time.Now()); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if b1.ID == b2.ID || b1.UpstreamAgent == b2.UpstreamAgent || b1.Upstream != b2.Upstream {
		t.Fatal("subagent identities")
	}
	one, two := string(nativeBytes(f.canonical(b1.ID))), string(nativeBytes(f.canonical(b2.ID)))
	if !strings.Contains(one, "ONE-A") || strings.Contains(one, "TWO") || !strings.Contains(two, "TWO-A") || strings.Contains(two, "ONE") {
		t.Fatal("concurrent subagents mixed their files")
	}
	for _, c := range []struct {
		b    sessionBranch
		q, a string
	}{{b1, "ONE", "ONE-A"}, {b2, "TWO", "TWO-A"}} {
		_, p := f.prepare(c.b, user(c.q), Object{"role": "assistant", "content": c.a}, user("next"))
		if p.Mode != "prefix-hit" || p.SessionID != c.b.ID {
			t.Fatalf("subagent %s continuation %s", c.a, p.Mode)
		}
	}
}

// No common prefix with the branch file (an old client sending subagent
// requests to the main thread, or a different conversation under the same
// session): a new root appended to the same file. Existing branches are
// never overwritten or truncated, and both conversations continue.
func TestSessionBranchUnrelatedHistoryAppendsNewRoot(t *testing.T) {
	f := newBranchFixture(t)
	b := testBranch("new-root")
	r, p := f.prepare(b, user("FIRST_Q1"))
	a1 := f.finish(b, r, p, "FIRST_A1")
	r, p = f.prepare(b, user("FIRST_Q1"), a1, user("FIRST_Q2"))
	a2 := f.finish(b, r, p, "FIRST_A2")
	before, err := os.ReadFile(f.cache.canonicalPath(b.ID))
	if err != nil {
		t.Fatal(err)
	}
	// k = 0, a first turn and a conversation that already has history.
	r, p = f.prepare(b, user("OTHER_Q1"))
	if p.Mode != "rebuild" || p.SessionID != b.ID {
		t.Fatal("unrelated first turn", p.Mode)
	}
	o1 := f.finish(b, r, p, "OTHER_A1")
	r, p = f.prepare(b, user("THIRD_Q1"), Object{"role": "assistant", "content": "THIRD_A1"}, user("THIRD_Q2"))
	if p.Mode != "rebuild" || p.SessionID != b.ID || chainTexts(p.Rows) != "THIRD_Q1/THIRD_A1/THIRD_Q2" {
		t.Fatalf("unrelated history %s %s", p.Mode, chainTexts(p.Rows))
	}
	f.finish(b, r, p, "THIRD_A2")
	after, err := os.ReadFile(f.cache.canonicalPath(b.ID))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(after, before) {
		t.Fatal("a new root overwrote or truncated the existing branches")
	}
	rows := f.canonical(b.ID)
	for leaf, want := range map[string]string{"FIRST_A2": "FIRST_Q1/FIRST_A1/FIRST_Q2/FIRST_A2", "OTHER_A1": "OTHER_Q1/OTHER_A1", "THIRD_A2": "THIRD_Q1/THIRD_A1/THIRD_Q2/THIRD_A2"} {
		if got := chainTexts(nativeChain(rows, assistantNode(t, rows, leaf))); !strings.HasSuffix(got, want) || strings.Contains(got, "FIRST") != strings.HasPrefix(want, "FIRST") {
			t.Fatalf("%s chain %s, want %s", leaf, got, want)
		}
	}
	// Each conversation continues on its own root.
	_, p = f.prepare(b, user("FIRST_Q1"), a1, user("FIRST_Q2"), a2, user("FIRST_Q3"))
	if p.Mode != "prefix-hit" || !strings.HasPrefix(chainTexts(p.Rows), "FIRST_Q1/FIRST_A1/FIRST_Q2/FIRST_A2") {
		t.Fatalf("first conversation %s %s", p.Mode, chainTexts(p.Rows))
	}
	if written, _ := os.ReadFile(p.Path); strings.Contains(string(written), "OTHER") || strings.Contains(string(written), "THIRD") {
		t.Fatal("private copy holds another conversation")
	}
	_, p = f.prepare(b, user("OTHER_Q1"), o1, user("OTHER_Q2"))
	if p.Mode != "prefix-hit" || chainTexts(p.Rows) != "OTHER_Q1/OTHER_A1" {
		t.Fatalf("other conversation %s %s", p.Mode, chainTexts(p.Rows))
	}
	if written, _ := os.ReadFile(p.Path); strings.Contains(string(written), "FIRST") || strings.Contains(string(written), "THIRD") {
		t.Fatal("private copy holds another conversation")
	}
}

func TestSessionBranchWithoutSessionIsAlwaysNew(t *testing.T) {
	f := newBranchFixture(t)
	r := userRequest(t, nil)
	first, _ := newSessionBranch(r, scopeHeader("", ""))
	rq, p := f.prepare(first, user("Q1"))
	if p.Path != "" || p.Mode != "rebuild" || p.SessionID != first.ID {
		t.Fatalf("new session first turn %s %q", p.Mode, p.Path)
	}
	answer := fakeCLI(t, p, rq, f.config, "A1")
	if err := p.commit(rq, answer, f.cache, first.Logical, "", "2.1.292", time.Now()); err == nil {
		t.Fatal("a request without a session was registered")
	}
	second, _ := newSessionBranch(r, scopeHeader("", ""))
	_, p2 := f.prepare(second, user("Q1"), Object{"role": "assistant", "content": answer["content"]}, user("Q2"))
	if p2.Mode != "rebuild" || p2.SessionID == p.SessionID || p2.SessionID != second.ID {
		t.Fatal("a request without a session reused history", p2.Mode)
	}
	if len(f.cache.entries) != 0 {
		t.Fatal("index written for requests without a session")
	}
	if files, _ := filepath.Glob(filepath.Join(f.cache.dir, "native", "*.jsonl")); len(files) != 0 {
		t.Fatal("native branch file written for a request without a session", files)
	}
	if leftovers, _ := filepath.Glob(filepath.Join(f.config, "projects", "*", "*.jsonl")); len(leftovers) != 0 {
		t.Fatal("--session-id transcript left in the CLI projects directory", leftovers)
	}
}

func TestSessionBranchRebuildsLostFileUnderSameID(t *testing.T) {
	f := newBranchFixture(t)
	b := testBranch("lost-file")
	r, p := f.prepare(b, user("Q1"))
	a1 := f.finish(b, r, p, "A1")
	if err := os.Remove(f.cache.canonicalPath(b.ID)); err != nil {
		t.Fatal(err)
	}
	r, p = f.prepare(b, user("Q1"), a1, user("Q2"))
	if p.Mode != "rebuild" || p.SessionID != b.ID || chainTexts(p.Rows) != "Q1/A1/Q2" {
		t.Fatalf("lost file %s %s %s", p.Mode, p.SessionID, chainTexts(p.Rows))
	}
	f.finish(b, r, p, "A2")
	rows := f.canonical(b.ID)
	if got := chainTexts(nativeChain(rows, assistantNode(t, rows, "A2"))); got != "Q1/A1/Q2/A2" {
		t.Fatalf("rebuilt chain %s", got)
	}
	// A registered node missing from the file (a foreign or truncated file)
	// is rebuilt too, never resumed.
	if err := writeNative(f.cache.canonicalPath(b.ID), rows[:1]); err != nil {
		t.Fatal(err)
	}
	_, p = f.prepare(b, user("Q1"), a1, user("Q2"), Object{"role": "assistant", "content": "A2"}, user("Q3"))
	if p.Mode != "rebuild" || p.SessionID != b.ID {
		t.Fatalf("missing node %s", p.Mode)
	}
}

// The caller scope does not select the session: another scope with the same
// S continues in the same file. Different histories under one S become two
// branches of the file; each continues its own and never sees the other's.
func TestSessionBranchScopesShareSession(t *testing.T) {
	f := newBranchFixture(t)
	r := userRequest(t, "same-session")
	branch := func(scope string) sessionBranch {
		b, err := newSessionBranch(r, scopeHeader(scope, ""))
		if err != nil {
			t.Fatal(err)
		}
		return b
	}
	a, b := branch("user:1:key:1"), branch("user:1:key:2")
	if a != b {
		t.Fatal("scopes split a session")
	}
	ra, pa := f.prepare(a, user("Q1"))
	a1 := f.finish(a, ra, pa, "A1")
	_, pb := f.prepare(b, user("Q1"), a1, user("Q2"))
	if pb.Mode != "prefix-hit" || pb.SessionID != a.ID {
		t.Fatal("another scope did not continue the session", pb.Mode)
	}
	// Two scopes, same S, unrelated conversations: one file, two roots.
	rx, px := f.prepare(a, user("SCOPE_A_Q1"))
	ax := f.finish(a, rx, px, "SCOPE_A_A1")
	ry, py := f.prepare(b, user("SCOPE_B_Q1"))
	ay := f.finish(b, ry, py, "SCOPE_B_A1")
	if px.SessionID != py.SessionID {
		t.Fatal("same session wrote two files")
	}
	rows := f.canonical(a.ID)
	if chainTexts(nativeChain(rows, assistantNode(t, rows, "SCOPE_A_A1"))) != "SCOPE_A_Q1/SCOPE_A_A1" || chainTexts(nativeChain(rows, assistantNode(t, rows, "SCOPE_B_A1"))) != "SCOPE_B_Q1/SCOPE_B_A1" {
		t.Fatal("conversations of the two scopes are not separate branches")
	}
	for _, c := range []struct {
		b            sessionBranch
		q            string
		a            Object
		own, foreign string
	}{{a, "SCOPE_A_Q1", ax, "SCOPE_A_A1", "SCOPE_B"}, {b, "SCOPE_B_Q1", ay, "SCOPE_B_A1", "SCOPE_A"}} {
		_, p := f.prepare(c.b, user(c.q), c.a, user("next"))
		if p.Mode != "prefix-hit" || !strings.Contains(chainTexts(p.Rows), c.own) {
			t.Fatalf("%s continuation %s", c.own, p.Mode)
		}
		if written, _ := os.ReadFile(p.Path); strings.Contains(string(written), c.foreign) {
			t.Fatalf("%s read the other conversation's records", c.own)
		}
	}
}

// A full branch file is sealed: the branch continues in a new file with a
// fixed ID, and nodes registered in the old file still resume from it.
func TestSessionBranchFullFileStartsNextGeneration(t *testing.T) {
	saved := nativeFileBranchPoints
	nativeFileBranchPoints = 2
	defer func() { nativeFileBranchPoints = saved }()
	f := newBranchFixture(t)
	b := testBranch("generations")
	r, p := f.prepare(b, user("Q1"))
	a1 := f.finish(b, r, p, "A1")
	r, p = f.prepare(b, user("Q1"), a1, user("Q2"))
	a2 := f.finish(b, r, p, "A2")
	// Two rewinds at different nodes: two branch points fill the file.
	r, p = f.prepare(b, user("Q1"), a1, user("Q2-B"))
	f.finish(b, r, p, "B2")
	if f.cache.sealed(b.ID) {
		t.Fatal("sealed before the limit")
	}
	r, p = f.prepare(b, user("Q1"), a1, user("Q2"), a2, user("Q3-C"))
	f.finish(b, r, p, "C3")
	r, p = f.prepare(b, user("Q1"), a1, user("Q2"), a2, user("Q3-D"))
	f.finish(b, r, p, "D3")
	if !f.cache.sealed(b.ID) || f.cache.currentGeneration(b) != 1 {
		t.Fatal("full file not sealed")
	}
	sealedBytes, _ := os.ReadFile(f.cache.canonicalPath(b.ID))
	// A registered node of the sealed file resumes from it into generation 1
	// (a fork: A2 already has children there).
	r, p = f.prepare(b, user("Q1"), a1, user("Q2"), a2, user("Q3"))
	if p.Mode != "fork" || p.SessionID != b.fileID(1) || chainTexts(p.Rows) != "Q1/A1/Q2/A2" {
		t.Fatalf("old node %s %s %s", p.Mode, p.SessionID, chainTexts(p.Rows))
	}
	for _, raw := range p.Rows {
		if _, _, sid := rowIdentity(raw); sid != "" && sid != b.fileID(1) {
			t.Fatal("copied records keep the sealed file's session")
		}
	}
	a3 := f.finish(b, r, p, "A3")
	if after, _ := os.ReadFile(f.cache.canonicalPath(b.ID)); !bytes.Equal(after, sealedBytes) {
		t.Fatal("a sealed file was written")
	}
	next := f.canonical(b.fileID(1))
	if got := chainTexts(nativeChain(next, assistantNode(t, next, "A3"))); got != "Q1/A1/Q2/A2/Q3/A3" {
		t.Fatalf("new generation chain %s", got)
	}
	// The new node continues in generation 1; unrelated history starts there too.
	_, p = f.prepare(b, user("Q1"), a1, user("Q2"), a2, user("Q3"), a3, user("Q4"))
	if p.Mode != "prefix-hit" || p.SessionID != b.fileID(1) {
		t.Fatal("generation 1 node", p.Mode, p.SessionID)
	}
	_, p = f.prepare(b, user("FRESH"))
	if p.SessionID != b.fileID(1) {
		t.Fatal("new conversation not in the current generation")
	}
}

func TestSessionBranchFileSizeLimitSeals(t *testing.T) {
	saved := nativeFileSealBytes
	nativeFileSealBytes = 1
	defer func() { nativeFileSealBytes = saved }()
	f := newBranchFixture(t)
	b := testBranch("size-limit")
	r, p := f.prepare(b, user("Q1"))
	a1 := f.finish(b, r, p, "A1")
	if !f.cache.sealed(b.ID) {
		t.Fatal("file over the size limit not sealed")
	}
	r, p = f.prepare(b, user("Q1"), a1, user("Q2"))
	if p.Mode != "prefix-hit" || p.SessionID != b.fileID(1) {
		t.Fatal("size-sealed branch", p.Mode, p.SessionID)
	}
	f.finish(b, r, p, "A2")
	if f.cache.currentGeneration(b) != 2 {
		t.Fatal("generation 1 not sealed in turn")
	}
}

func TestUpstreamUserIDKeepsCLIIdentityWithGatewaySession(t *testing.T) {
	const u = "0f1e2d3c-4b5a-4968-8776-655443322110"
	device := strings.Repeat("9a", 32)
	cli := `{"device_id":"` + device + `","account_uuid":"","session_id":"aaaaaaaa-bbbb-4ccc-8ddd-0000000000cc"}`
	for name, c := range map[string]struct{ in, want string }{
		"cli 2.1.292":     {cli, `{"device_id":"` + device + `","account_uuid":"","session_id":"` + u + `"}`},
		"oauth account":   {`{"device_id":"d","account_uuid":"acct-1","session_id":"x"}`, `{"device_id":"d","account_uuid":"acct-1","session_id":"` + u + `"}`},
		"spaced json":     {`{ "device_id": "d", "account_uuid": "a", "session_id": "x" }`, `{ "device_id": "d", "account_uuid": "a", "session_id": "` + u + `" }`},
		"no session_id":   {`{"device_id":"d","account_uuid":"a"}`, `{"device_id":"d","account_uuid":"a","session_id":"` + u + `"}`},
		"legacy":          {"user_" + device + "_account__session_aaaaaaaa-bbbb-4ccc-8ddd-0000000000cc", "user_" + device + "_account__session_" + u},
		"unknown string":  {"opaque", `{"device_id":"","account_uuid":"","session_id":"` + u + `"}`},
		"duplicated text": {`{"device_id":"\"session_id\":\"x\"","account_uuid":"","session_id":"x"}`, `{"device_id":"\"session_id\":\"x\"","account_uuid":"","session_id":"` + u + `"}`},
	} {
		if got := sessionUserID(c.in, u); got != c.want {
			t.Errorf("%s: %s, want %s", name, got, c.want)
		}
	}
	// Only the user_id string token of the body changes, byte for byte.
	body := []byte(`{"model":"m","metadata":{"other":[1,{"user_id":"nested"}],"user_id":` + compactJSON(cli) + `},"messages":[{"role":"user","content":"session_id"}],"user_id":"top"}`)
	out, err := upstreamUserID(body, u)
	if err != nil {
		t.Fatal(err)
	}
	want := bytes.Replace(body, []byte(compactJSON(cli)), []byte(compactJSON(`{"device_id":"`+device+`","account_uuid":"","session_id":"`+u+`"}`)), 1)
	if !bytes.Equal(out, want) {
		t.Fatalf("body changed beyond user_id:\n%s\n%s", out, want)
	}
	for _, unchanged := range []string{`{"model":"m"}`, `{"metadata":null}`, `{"metadata":{}}`, `{"metadata":{"user_id":null}}`} {
		if out, err := upstreamUserID([]byte(unchanged), u); err != nil || string(out) != unchanged {
			t.Fatalf("%s changed: %s %v", unchanged, out, err)
		}
	}
	if _, err := upstreamUserID([]byte(`[1]`), u); err == nil {
		t.Fatal("non-object body accepted")
	}
}

func TestOutboundRelaySessionIdentity(t *testing.T) {
	var mu sync.Mutex
	type seen struct {
		path   string
		header http.Header
		body   string
	}
	var got []seen
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		mu.Lock()
		got = append(got, seen{r.URL.Path, r.Header.Clone(), string(raw)})
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"input_tokens":1}`)
	}))
	defer upstream.Close()
	const clientSession = "11111111-2222-4333-8444-555555555555"
	clientUser := `{"device_id":"client-device-secret","account_uuid":"client-account-secret","session_id":"` + clientSession + `"}`
	cliUser := `{"device_id":"container-device","account_uuid":"","session_id":"internal-cli-session"}`
	send := func(t *testing.T, agent string, withSession bool) []seen {
		t.Helper()
		body := basic()
		if withSession {
			body["metadata"] = Object{"user_id": clientUser}
		}
		branch, err := newSessionBranch(policyRequest(t, body), scopeHeader("user:1:key:1", agent))
		if err != nil {
			t.Fatal(err)
		}
		// Requests the relay does not otherwise adapt (no main-request plan);
		// metadata_attribution_test covers attributed main requests.
		req := parsed(t, basic())
		req.upstreamSession, req.upstreamAgent = branch.Upstream, branch.UpstreamAgent
		relay, err := startOutboundRelay(req, []string{"ANTHROPIC_BASE_URL=" + upstream.URL})
		if err != nil {
			t.Fatal(err)
		}
		defer relay.Close()
		mu.Lock()
		got = nil
		mu.Unlock()
		model := `{"model":"m","max_tokens":1,"metadata":{"user_id":` + compactJSON(cliUser) + `},"messages":[{"role":"user","content":"x"}]}`
		for _, c := range []struct{ path, body string }{{"/v1/messages", model}, {"/v1/messages/count_tokens", `{"model":"m","messages":[]}`}} {
			out, _ := http.NewRequest("POST", relay.URL+c.path, strings.NewReader(c.body))
			out.Header.Set("X-Claude-Code-Session-Id", "internal-cli-session")
			out.Header.Set("X-Claude-Code-Agent-Id", "acli0000000000000")
			resp, err := http.DefaultClient.Do(out)
			if err != nil {
				t.Fatal(err)
			}
			_, _ = io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
		}
		mu.Lock()
		defer mu.Unlock()
		if len(got) != 2 {
			t.Fatalf("upstream requests %d", len(got))
		}
		for _, s := range got {
			wantSession := branch.Upstream
			if s.header.Get("X-Claude-Code-Session-Id") != wantSession || s.header.Get("X-Claude-Code-Agent-Id") != branch.UpstreamAgent {
				t.Fatalf("%s headers: session %q agent %q, want %q %q", s.path, s.header.Get("X-Claude-Code-Session-Id"), s.header.Get("X-Claude-Code-Agent-Id"), wantSession, branch.UpstreamAgent)
			}
			for _, secret := range []string{"client-device-secret", "client-account-secret", clientSession, "internal-cli-session", "acli0000000000000"} {
				if strings.Contains(s.body, secret) || strings.Contains(fmt.Sprint(s.header), secret) {
					t.Fatalf("%s leaked %s upstream", s.path, secret)
				}
			}
		}
		var model0 Object
		_ = json.Unmarshal([]byte(got[0].body), &model0)
		userID := str(model0["metadata"].(map[string]any), "user_id")
		if userID != `{"device_id":"container-device","account_uuid":"","session_id":"`+branch.Upstream+`"}` {
			t.Fatalf("upstream user_id %s", userID)
		}
		return got
	}
	main := send(t, "", true)
	sub := send(t, "agent-7", true)
	if main[0].header.Get("X-Claude-Code-Session-Id") != sub[0].header.Get("X-Claude-Code-Session-Id") || sub[0].header.Get("X-Claude-Code-Agent-Id") == "" {
		t.Fatal("subagent and main thread must share U")
	}
	first := send(t, "", false)[0].header.Get("X-Claude-Code-Session-Id")
	second := send(t, "", false)[0].header.Get("X-Claude-Code-Session-Id")
	if first == second || first == main[0].header.Get("X-Claude-Code-Session-Id") {
		t.Fatal("requests without a session must get a new U each")
	}
}

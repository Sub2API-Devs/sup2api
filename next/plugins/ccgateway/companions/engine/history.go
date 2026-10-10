package engine

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

func uuid() string {
	var b [16]byte
	if _, e := rand.Read(b[:]); e != nil {
		panic(e)
	}
	b[6] = (b[6] & 15) | 64
	b[8] = (b[8] & 63) | 128
	s := hex.EncodeToString(b[:])
	return s[:8] + "-" + s[8:12] + "-" + s[12:16] + "-" + s[16:20] + "-" + s[20:]
}

// Hashes index the client-visible history; LastUUID is the native node of its
// final assistant boundary in the branch file SessionID (NativePath), of
// branch generation Generation. Only committed assistant boundaries may be
// used for continuation or branching. Rows is no longer written: the branch
// file holds the records.
type Snapshot struct {
	ResponseOnly   bool                 `json:"response_only,omitempty"`
	Format         int                  `json:"format"`
	NativePath     string               `json:"native_path"`
	Work           string               `json:"work"`
	Rows           []json.RawMessage    `json:"rows,omitempty"`
	LastUUID       string               `json:"last_uuid"`
	SessionID      string               `json:"session_id"`
	Generation     int                  `json:"generation,omitempty"`
	Hashes         []string             `json:"hashes"`
	Expires        time.Time            `json:"expires"`
	PromptEvidence *PromptEvidence      `json:"prompt_evidence,omitempty"`
	Responses      []ResponseCheckpoint `json:"responses,omitempty"`
}
type HistoryCache struct {
	mu      sync.Mutex
	dir     string
	entries map[string]*Snapshot
	bytes   int64
	limit   int64
	locks   map[string]*branchLock
}

func newCache(dir string, limit int64) (*HistoryCache, error) {
	if e := os.MkdirAll(dir, 0700); e != nil {
		return nil, e
	}
	c := &HistoryCache{dir: dir, entries: map[string]*Snapshot{}, limit: limit, locks: map[string]*branchLock{}}
	files, e := os.ReadDir(dir)
	if e != nil {
		return nil, e
	}
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".json") {
			continue
		}
		key := strings.TrimSuffix(f.Name(), ".json")
		if len(key) != 64 {
			continue
		}
		if _, e := hex.DecodeString(key); e != nil {
			continue
		}
		p := filepath.Join(dir, f.Name())
		info, e := f.Info()
		if e != nil {
			return nil, e
		}
		if info.Size() > limit {
			_ = os.Remove(p)
			continue
		}
		b, e := os.ReadFile(p)
		if e != nil {
			return nil, e
		}
		var s Snapshot
		if json.Unmarshal(b, &s) != nil || time.Now().After(s.Expires) || s.Format != 2 || len(s.Hashes) == 0 || (!s.ResponseOnly && s.LastUUID == "") || !validResponseCheckpoints(&s) {
			_ = os.Remove(p)
			continue
		}
		c.entries[key] = &s
		c.bytes += int64(len(b))
	}
	c.pruneLocked(time.Now())
	c.sweepNativeLocked(time.Now())
	return c, nil
}
func snapshotSize(s *Snapshot) int64 { b, _ := json.Marshal(s); return int64(len(b)) }
func (c *HistoryCache) pruneLocked(now time.Time) {
	for k, s := range c.entries {
		if !now.Before(s.Expires) {
			c.removeLocked(k)
		}
	}
	for c.bytes > c.limit || len(c.entries) > 1024 {
		old := ""
		var t time.Time
		for k, s := range c.entries {
			if old == "" || s.Expires.Before(t) {
				old = k
				t = s.Expires
			}
		}
		if old == "" {
			break
		}
		c.removeLocked(old)
	}
}

// removeLocked drops an index entry, and the canonical native file once no
// entry refers to it. A request that copied the file before restores it from
// its private copy when it merges.
func (c *HistoryCache) removeLocked(k string) {
	if s := c.entries[k]; s != nil {
		c.bytes -= snapshotSize(s)
		delete(c.entries, k)
		_ = os.Remove(filepath.Join(c.dir, k+".json"))
		retained := false
		for _, other := range c.entries {
			if other.SessionID == s.SessionID {
				retained = true
				break
			}
		}
		if !retained && c.locks[s.SessionID] == nil && s.NativePath == c.canonicalPath(s.SessionID) {
			_ = os.Remove(s.NativePath)
			_ = os.Remove(c.sealPath(s.SessionID))
		}
	}
}
func (c *HistoryCache) prune() {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	c.pruneLocked(now)
	c.sweepNativeLocked(now)
}

// Recover orphaned native files after expiry or a crash between the merge
// and the index write. Allow in-flight merges a grace period and only touch
// gateway-owned UUID files. A seal marker goes with its file.
func (c *HistoryCache) sweepNativeLocked(now time.Time) {
	retained := map[string]bool{}
	for _, s := range c.entries {
		retained[s.SessionID] = true
	}
	root := filepath.Join(c.dir, "native")
	files, _ := os.ReadDir(root)
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".jsonl") && !strings.HasSuffix(f.Name(), ".sealed") {
			continue
		}
		sid := strings.TrimSuffix(strings.TrimSuffix(f.Name(), ".jsonl"), ".sealed")
		if !nativeSessionName.MatchString(sid) || retained[sid] || c.locks[sid] != nil {
			continue
		}
		if strings.HasSuffix(f.Name(), ".sealed") {
			if _, err := os.Stat(c.canonicalPath(sid)); os.IsNotExist(err) {
				_ = os.Remove(filepath.Join(root, f.Name()))
			}
			continue
		}
		if info, err := f.Info(); err == nil && now.Sub(info.ModTime()) > time.Hour {
			_ = os.Remove(filepath.Join(root, f.Name()))
		}
	}
}
func (c *HistoryCache) get(k string) *Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()
	s := c.entries[k]
	if s == nil {
		return nil
	}
	if time.Now().After(s.Expires) {
		c.removeLocked(k)
		return nil
	}
	copy := *s
	copy.Rows = nil
	copy.Hashes = append([]string(nil), s.Hashes...)
	copy.Responses = cloneResponseCheckpoints(s.Responses)
	return &copy
}
func (c *HistoryCache) put(k string, s *Snapshot) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if old := c.entries[k]; old != nil && old.Expires.After(s.Expires) {
		s.Expires = old.Expires
	}
	b, e := json.Marshal(s)
	if e != nil {
		return e
	}
	if int64(len(b)) > c.limit {
		return nil
	}
	// The lock serializes same-key replacement. A private temporary file is
	// renamed only after close; cache readers never see a partially written file.
	f, e := os.CreateTemp(c.dir, ".snapshot-*")
	if e != nil {
		return e
	}
	p := f.Name()
	defer os.Remove(p)
	if _, e = f.Write(b); e != nil {
		f.Close()
		return e
	}
	if e = f.Close(); e != nil {
		return e
	}
	target := filepath.Join(c.dir, k+".json")
	if e = os.Rename(p, target); e != nil {
		return e
	}
	if old := c.entries[k]; old != nil {
		c.bytes -= snapshotSize(old)
	}
	stored := *s
	stored.Responses = cloneResponseCheckpoints(s.Responses)
	c.entries[k] = &stored
	c.bytes += int64(len(b))
	c.pruneLocked(time.Now())
	return nil
}
func cacheKey(logical, config, hash string) string { return digest([]string{logical, config, hash}) }
func transcriptRow(m Message, parent, sid, cwd, version, model string) (json.RawMessage, string) {
	id := uuid()
	msg := Object{"role": m.Role, "content": m.Content}
	if m.Role == "assistant" {
		stop := "end_turn"
		for _, b := range m.Content {
			if str(b, "type") == "tool_use" {
				stop = "tool_use"
			}
		}
		msg["id"] = "msg_" + strings.ReplaceAll(uuid(), "-", "")
		msg["type"] = "message"
		msg["model"] = model
		msg["stop_reason"] = stop
		msg["stop_sequence"] = nil
		msg["usage"] = Object{"input_tokens": 0, "output_tokens": 0}
	}
	var p any
	if parent != "" {
		p = parent
	}
	row := Object{"type": m.Role, "uuid": id, "parentUuid": p, "sessionId": sid, "isSidechain": false, "userType": "external", "cwd": cwd, "version": version, "timestamp": time.Now().UTC().Format(time.RFC3339Nano), "message": msg}
	b, _ := json.Marshal(row)
	return b, id
}

// Prepared is one request's native history. Rows is the conversation the CLI
// resumes (the canonical chain to the node, then seeded client records), used
// as evidence; the private copy at Path holds the branch view of the canonical
// file (base) followed by the seeded records. NativeAll is the private copy
// after the run, through the response; NativeRows is its chain to NativeAnchor.
type Prepared struct {
	APIResponseComplete                     bool
	FinalResponseStop                       json.RawMessage // Runtime only; never replayed or embedded in Snapshot.
	Rows                                    []json.RawMessage
	LastUUID, SessionID, Path, Anchor, Mode string
	Hashes                                  []string
	Work, NativePath, InputUUID             string
	WireSession                             string // relay passthrough: U, see runSession
	SnapshotEnabled                         bool
	NativeRows                              []json.RawMessage
	NativeAll                               []json.RawMessage
	NativeAnchor                            string
	Responses                               []ResponseCheckpoint
	branch                                  sessionBranch
	generation                              int
	base                                    []json.RawMessage
	dir                                     string
	cache                                   *HistoryCache
}

func nativeBytes(rows []json.RawMessage) []byte {
	var b bytes.Buffer
	for _, row := range rows {
		b.Write(row)
		b.WriteByte('\n')
	}
	return b.Bytes()
}

// sessionRootRow starts an indexed branch's first conversation by --resume
// instead of --session-id, which the CLI refuses while another run of the
// same branch (a title or classifier request) is writing that session. The
// CLI keeps informational meta records local: none reaches the API.
func sessionRootRow(sid, cwd, version string) json.RawMessage {
	row := Object{"type": "system", "subtype": "informational", "content": "ccgateway session root", "isMeta": true, "level": "info", "uuid": uuid(), "parentUuid": nil, "isSidechain": false, "userType": "external", "cwd": cwd, "sessionId": sid, "version": version, "timestamp": time.Now().UTC().Format(time.RFC3339Nano)}
	b, _ := json.Marshal(row)
	return b
}

// writePrivate writes this request's copy of the branch: the resumed
// conversation of the canonical file, then rows. The file name is the session
// ID, which makes the CLI append to this file.
func (p *Prepared) writePrivate(rows []json.RawMessage) error {
	p.Path = filepath.Join(p.dir, p.runSession()+".jsonl")
	return writeNative(p.Path, moveSession(append(append([]json.RawMessage(nil), p.base...), rows...), p.SessionID, p.runSession()))
}

// runSession is the session ID the CLI runs under. In relay passthrough it is
// U for every branch and generation (the upstream sees the CLI's own session
// header and metadata); the private copy carries it and captureNative moves
// the records back to the branch file's SessionID.
func (p *Prepared) runSession() string {
	if p.WireSession != "" {
		return p.WireSession
	}
	return p.SessionID
}

// Most configuration does not select history. A custom-tool namespace change
// uses a separate index because native rows contain wire tool names. System and
// tools are applied afresh by Runner; this index compares the client prefix. Client
// system messages are part of that prefix; committed ones are native attachment
// records, and the pending turn's are attached by the Mod.
//
// An indexed branch always runs under its own session ID (§53.12), that of
// its current generation file: at a registered node, or rebuilt from client
// history (a new root of the file when nothing is registered). A new session
// (no session ID) is rebuilt under a random ID.
func prepareHistory(r *Request, c *HistoryCache, b sessionBranch, dir, version string) (*Prepared, error) {
	hashes := fingerprints(r.Messages)
	pending := r.pendingStart()
	sid, generation := b.ID, 0
	if b.indexed() {
		generation = c.currentGeneration(b)
		sid = b.fileID(generation)
	}
	if sid == "" {
		sid = uuid()
	}
	p := &Prepared{SessionID: sid, generation: generation, Hashes: hashes, Mode: "rebuild", InputUUID: uuid(), Work: filepath.Join(c.dir, "workspace"), branch: b, dir: dir, cache: c}
	if r.Passthrough && b.Upstream != "" {
		p.WireSession = b.Upstream
	}
	if e := os.MkdirAll(p.Work, 0700); e != nil {
		return nil, e
	}
	start := 0
	parent := ""
	resumed := false
	if b.indexed() {
		// A node is valid only in its own branch's file of its generation.
		if prior := findPriorSnapshot(r, c, b.Logical, hashes, pending); prior != nil && prior.SessionID == b.fileID(prior.Generation) && p.resumeFrom(prior, r, c, pending) {
			resumed = true
			parent = prior.LastUUID
			start = len(prior.Hashes)
			if r.directNativeResume(start, pending) && !hasToolResults(r.Messages[pending]) {
				// Ordinary native resume: submit only the new user message.
				p.LastUUID = parent
				return p, p.writePrivate(p.withImageSeed(r, nil, version))
			}
		}
	}
	seeded := len(p.Rows)
	p.LastUUID = p.seedRows(r, start, pending, parent, version)
	completedHistory := false
	for _, message := range r.Messages[:pending] {
		completedHistory = completedHistory || message.Role == "assistant"
	}
	if resumed || completedHistory {
		if p.Anchor == "" {
			return nil, fmt.Errorf("missing assistant resume anchor")
		}
		return p, p.writePrivate(p.withImageSeed(r, p.Rows[seeded:], version))
	}
	if b.indexed() {
		// The pending turn and its system messages are submitted and attached
		// at run time, as for --session-id.
		return p, p.writePrivate(p.withImageSeed(r, []json.RawMessage{sessionRootRow(sid, p.Work, version)}, version))
	}
	if _, _, split := r.passthroughImageSplit(); split {
		return p, p.writePrivate(p.withImageSeed(r, nil, version))
	}
	return p, nil
}

// withImageSeed keeps the CLI's input processing away from the pending turn's
// images in relay passthrough: as input, a base64 image gets an extra
// "[Image: source: <path>]" text and a large one is re-encoded, while an image
// of a native record goes upstream as written. So the blocks before the
// turn's final text become a user record the CLI resumes at, and only that
// text is the new input; the CLI sends the two as one user message, blocks in
// order. rows end with the pending turn's record when it was seeded.
func (p *Prepared) withImageSeed(r *Request, rows []json.RawMessage, version string) []json.RawMessage {
	seed, _, ok := r.passthroughImageSplit()
	if !ok {
		return rows
	}
	parent := p.Anchor
	if n := len(rows); n > 0 {
		id, last, _ := rowIdentity(rows[n-1])
		if id == p.InputUUID {
			// The seeded pending record gives way to the leading blocks.
			parent, rows = last, rows[:n-1]
			p.Rows = p.Rows[:len(p.Rows)-1]
		} else {
			parent = id
		}
	}
	row, id := transcriptRow(seed, parent, p.SessionID, p.Work, version, r.Model)
	p.Rows = append(p.Rows, row)
	p.Anchor, p.LastUUID = id, id
	return append(rows, row)
}

// findPriorSnapshot is the cached checkpoint of the longest client prefix
// that ends with an assistant message before the pending turn.
func findPriorSnapshot(r *Request, c *HistoryCache, logical string, hashes []string, pending int) *Snapshot {
	for n := pending - 1; r.InlineTools == nil && len(r.imageCarriers) == 0 && !r.structuredOutput() && !(r.Plan != nil && r.Plan.cache != nil && r.toolSearchEnabled()) && n >= 0; n-- {
		if r.Messages[n].Role != "assistant" {
			continue
		}
		s := c.get(cacheKey(logical, r.toolHistoryNamespace(), hashes[n]))
		if s != nil && !s.ResponseOnly && s.Format == 2 && len(s.Hashes) == n+1 {
			return s
		}
	}
	return nil
}

// resumeFrom continues from a registered node, read from the node's own file.
// It reports false, and the request is rebuilt, when the file or the node is
// gone. Resuming at a node that already has descendants (a client rewind or
// edit, or a concurrent request from the same prefix) grows a sibling branch.
// A node of a sealed generation is copied into the current generation file.
func (p *Prepared) resumeFrom(prior *Snapshot, r *Request, c *HistoryCache, pending int) bool {
	base, err := c.readCanonical(prior.SessionID)
	if err != nil {
		return false
	}
	chain := nativeChain(base, prior.LastUUID)
	if chain == nil {
		return false
	}
	p.base = moveSession(branchView(base, prior.LastUUID), prior.SessionID, p.SessionID)
	p.Rows = moveSession(chain, prior.SessionID, p.SessionID)
	p.Responses = cloneResponseCheckpoints(prior.Responses)
	p.SnapshotEnabled = choosePromptSnapshot(chain, prior.PromptEvidence, r.System, time.Now())
	p.Work = prior.Work
	p.Anchor = prior.LastUUID
	p.Mode = "prefix-hit"
	if !r.directNativeResume(len(prior.Hashes), pending) || nativeHasChildren(base, prior.LastUUID) {
		p.Mode = "fork"
	}
	return true
}

// directNativeResume reports whether the pending turn directly follows the
// registered node and the request is an ordinary one, so the CLI submits the
// pending turn itself instead of loading it from seeded records.
func (r *Request) directNativeResume(registered, pending int) bool {
	return !r.CacheWarmup && !r.CountTokens && !r.needsFreshNativeSession() && registered == pending && pending < len(r.Messages)
}

// seedRows appends native records for client messages start..pending and
// returns the last record's UUID.
func (p *Prepared) seedRows(r *Request, start, pending int, parent, version string) string {
	for i := start; i <= pending && i < len(r.Messages); i++ {
		if r.Messages[i].Role == "system" {
			if r.Messages[i].directiveOnly() {
				continue
			}
			// One record per client system message, its text blocks as the
			// record's content entries.
			row, id := systemRow(systemTexts(r.Messages[i]), parent, p.SessionID, p.Work, version)
			p.Rows = append(p.Rows, row)
			parent = id
			continue
		}
		message := r.cliWireMessage(r.Messages[i])
		// Empty inline directives are restored at the relay. Native CLI adds a
		// newline when it joins separate user rows, so serialize their exact
		// block sequence in one row instead of letting that join alter text.
		if message.Role == "user" {
			for i+1 <= pending && i+1 < len(r.Messages) {
				next := r.Messages[i+1]
				if next.directiveOnly() {
					i++
					continue
				}
				if next.Role != "user" {
					break
				}
				message.Content = append(message.Content, r.cliWireMessage(next).Content...)
				i++
			}
		}
		if r.Passthrough && message.Role == "assistant" {
			// A search of client history is Claude Code's WebSearch call
			// and result in the native transcript.
			if turns, err := nativeWebSearchTurns(message); err == nil && len(turns) > 1 {
				for _, turn := range turns[:len(turns)-1] {
					row, id := transcriptRow(turn, parent, p.SessionID, p.Work, version, r.Model)
					p.Rows = append(p.Rows, row)
					parent = id
				}
				message = turns[len(turns)-1]
			}
		}
		row, id := transcriptRow(message, parent, p.SessionID, p.Work, version, r.Model)
		if i == pending {
			// The recovery loader needs complete tool pairs before resume-at trimming.
			// Seed only the pending client input, keeping all prior native rows intact.
			var obj Object
			_ = json.Unmarshal(row, &obj)
			obj["uuid"] = p.InputUUID
			row, _ = json.Marshal(obj)
			id = p.InputUUID
		}
		p.Rows = append(p.Rows, row)
		parent = id
		if r.Messages[i].Role == "assistant" {
			p.Anchor = id
		}
	}
	return parent
}
func hasToolResults(m Message) bool {
	for _, b := range m.Content {
		if str(b, "type") == "tool_result" {
			return true
		}
	}
	return false
}
func (p *Prepared) commit(r *Request, answer Object, c *HistoryCache, logical, dir, version string, started time.Time) error {
	if err := completedResponse(answer); err != nil {
		return err
	}
	if r.structuredOutput() {
		// API text differs from the CLI synthetic-tool transcript; rebuild from client history next time.
		return nil
	}
	bs, ok := answer["content"].([]Object)
	if !ok {
		return fmt.Errorf("missing assistant content")
	}
	if len(p.NativeRows) == 0 || len(p.NativeAll) == 0 || p.NativeAnchor == "" {
		return fmt.Errorf("missing native CLI checkpoint")
	}
	if len(p.Hashes) == 0 {
		return fmt.Errorf("missing client history checkpoint")
	}
	if !p.branch.indexed() || p.SessionID != p.branch.fileID(p.generation) {
		return fmt.Errorf("request has no session branch")
	}
	hash := digest([]any{p.Hashes[len(p.Hashes)-1], Message{Role: "assistant", Content: bs}})
	hashes := append(append([]string(nil), p.Hashes...), hash)
	// Merge, then register, under the branch lock: a later request of this
	// branch that finds the node also finds its records. A file sealed while
	// this request ran still takes its records: they belong to this file's
	// session, and its nodes stay resumable.
	unlock := c.lockBranch(p.SessionID)
	defer unlock()
	path, full, err := c.mergeNative(p.SessionID, p.NativeAll, len(p.base))
	if err != nil {
		return err
	}
	if full && !c.sealed(p.SessionID) {
		if err := c.seal(p.SessionID); err != nil {
			return err
		}
	}
	// Native history lifetime is independent of provider prompt-cache TTL.
	s := &Snapshot{Format: 2, LastUUID: p.NativeAnchor, SessionID: p.SessionID, Generation: p.generation, NativePath: path, Work: p.Work, Hashes: hashes, Expires: started.Add(24 * time.Hour)}
	s.PromptEvidence = &PromptEvidence{SystemDigest: digest(r.System), Expires: time.Now().Add(r.TTL)}
	response, err := json.Marshal(answer)
	if err != nil {
		return fmt.Errorf("cannot preserve response envelope: %w", err)
	}
	s.Responses = append(cloneResponseCheckpoints(p.Responses), ResponseCheckpoint{ClientHash: hash, NativeAnchor: p.NativeAnchor, MessageID: str(answer, "id"), Response: response})
	return c.put(cacheKey(logical, r.toolHistoryNamespace(), hash), s)
}

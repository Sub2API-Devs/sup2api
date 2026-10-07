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

// Rows are native CLI records. Hashes index the separate client-visible history.
// Only committed assistant boundaries may be used for continuation or branching.
type Snapshot struct {
	NativeDigest   string            `json:"native_digest"`
	Format         int               `json:"format"`
	NativePath     string            `json:"native_path"`
	Work           string            `json:"work"`
	Rows           []json.RawMessage `json:"rows"`
	LastUUID       string            `json:"last_uuid"`
	SessionID      string            `json:"session_id"`
	Hashes         []string          `json:"hashes"`
	Expires        time.Time         `json:"expires"`
	PromptEvidence *PromptEvidence   `json:"prompt_evidence,omitempty"`
}
type HistoryCache struct {
	mu      sync.Mutex
	dir     string
	entries map[string]*Snapshot
	bytes   int64
	limit   int64
	active  map[string]bool
}

func newCache(dir string, limit int64) (*HistoryCache, error) {
	if e := os.MkdirAll(dir, 0700); e != nil {
		return nil, e
	}
	c := &HistoryCache{dir: dir, entries: map[string]*Snapshot{}, limit: limit, active: map[string]bool{}}
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
		if json.Unmarshal(b, &s) != nil || time.Now().After(s.Expires) || s.Format != 2 || len(s.Hashes) == 0 || len(s.Rows) == 0 || s.LastUUID == "" {
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
func (c *HistoryCache) removeLocked(k string) {
	if s := c.entries[k]; s != nil {
		c.bytes -= snapshotSize(s)
		delete(c.entries, k)
		_ = os.Remove(filepath.Join(c.dir, k+".json"))
		if !c.active[s.SessionID] {
			retained := false
			for _, other := range c.entries {
				if other.SessionID == s.SessionID {
					retained = true
					break
				}
			}
			if !retained && s.NativePath == filepath.Join(c.dir, "native", s.SessionID+".jsonl") {
				_ = os.Remove(s.NativePath)
			}
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

// Recover orphaned native files after expiry, a crash between transcript and
// index writes, or an eviction while a session was active. Allow in-flight
// writes a grace period and only touch gateway-owned UUID files.
func (c *HistoryCache) sweepNativeLocked(now time.Time) {
	retained := map[string]bool{}
	for _, s := range c.entries {
		retained[s.SessionID] = true
	}
	root := filepath.Join(c.dir, "native")
	files, _ := os.ReadDir(root)
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".jsonl") {
			continue
		}
		sid := strings.TrimSuffix(f.Name(), ".jsonl")
		if !nativeSessionName.MatchString(sid) || retained[sid] || c.active[sid] {
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
	copy.Rows = append([]json.RawMessage(nil), s.Rows...)
	copy.Hashes = append([]string(nil), s.Hashes...)
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
	c.entries[k] = s
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

type Prepared struct {
	Rows                                    []json.RawMessage
	LastUUID, SessionID, Path, Anchor, Mode string
	Hashes                                  []string
	Work, NativePath, InputUUID             string
	Fork                                    bool
	SnapshotEnabled                         bool
	NativeRows                              []json.RawMessage
	NativeAnchor                            string
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

// Most configuration does not select history. A custom-tool namespace change
// uses a separate index because native rows contain wire tool names. System and
// tools are applied afresh by Runner; this index compares the client prefix. Client
// system messages are part of that prefix; committed ones are native attachment
// records, and the pending turn's are attached by the Mod.
func prepareHistory(r *Request, c *HistoryCache, logical, dir, version string) (*Prepared, error) {
	hashes := fingerprints(r.Messages)
	pending := r.pendingStart()
	p := &Prepared{SessionID: uuid(), Hashes: hashes, Mode: "rebuild", InputUUID: uuid(), Work: filepath.Join(c.dir, "workspace"), cache: c}
	if e := os.MkdirAll(p.Work, 0700); e != nil {
		return nil, e
	}
	start := 0
	parent := ""
	if prior := findPriorSnapshot(r, c, logical, hashes, pending); prior != nil {
		p.resumeFrom(prior, r, c, pending)
		parent = prior.LastUUID
		start = len(prior.Hashes)
		if !p.Fork && !hasToolResults(r.Messages[pending]) {
			p.Anchor = "" // Ordinary native resume: submit only the new user message.
			return p, nil
		}
	}
	p.LastUUID = p.seedRows(r, start, pending, parent, version)
	if pending > 0 {
		if p.Anchor == "" {
			p.release()
			return nil, fmt.Errorf("missing assistant resume anchor")
		}
		if p.Path == "" {
			p.Path = filepath.Join(dir, "history.jsonl")
		}
		if e := writeNative(p.Path, p.Rows); e != nil {
			p.release()
			return nil, e
		}
	}
	return p, nil
}

// findPriorSnapshot is the cached checkpoint of the longest client prefix
// that ends with an assistant message before the pending turn.
func findPriorSnapshot(r *Request, c *HistoryCache, logical string, hashes []string, pending int) *Snapshot {
	for n := pending - 1; !r.structuredOutput() && n >= 0; n-- {
		if r.Messages[n].Role != "assistant" {
			continue
		}
		s := c.get(cacheKey(logical, r.toolHistoryNamespace(), hashes[n]))
		if s != nil && s.Format == 2 && len(s.Hashes) == n+1 {
			return s
		}
	}
	return nil
}

// resumeFrom continues from a checkpoint: a fork of it, or the native session
// itself when it is unchanged, idle, and directly before the pending turn.
func (p *Prepared) resumeFrom(prior *Snapshot, r *Request, c *HistoryCache, pending int) {
	p.Rows = append(p.Rows, prior.Rows...)
	p.SnapshotEnabled = choosePromptSnapshot(prior.Rows, prior.PromptEvidence, r.System, time.Now())
	p.Work = prior.Work
	p.Anchor = prior.LastUUID
	p.Fork = true
	p.Mode = "fork"
	// A single native session has exactly one writer. Concurrent requests from
	// the same prefix branch from the immutable checkpoint instead.
	c.mu.Lock()
	defer c.mu.Unlock()
	actual, e := os.ReadFile(prior.NativePath)
	if len(prior.Hashes) == pending && !c.active[prior.SessionID] && e == nil && digest(string(actual)) == prior.NativeDigest {
		p.SessionID = prior.SessionID
		p.NativePath = prior.NativePath
		p.Path = prior.NativePath
		p.Fork = false
		p.Mode = "prefix-hit"
		c.active[p.SessionID] = true
	}
}

// seedRows appends native records for client messages start..pending and
// returns the last record's UUID.
func (p *Prepared) seedRows(r *Request, start, pending int, parent, version string) string {
	for i := start; i <= pending; i++ {
		if r.Messages[i].Role == "system" {
			// One record per client system message, its text blocks as the
			// record's content entries.
			row, id := systemRow(systemTexts(r.Messages[i]), parent, p.SessionID, p.Work, version)
			p.Rows = append(p.Rows, row)
			parent = id
			continue
		}
		message := r.wireMessage(r.Messages[i])
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
func (p *Prepared) release() {
	if p.cache != nil {
		p.cache.mu.Lock()
		delete(p.cache.active, p.SessionID)
		p.cache.mu.Unlock()
	}
}
func (p *Prepared) commit(r *Request, answer Object, c *HistoryCache, logical, dir, version string, started time.Time) error {
	if r.structuredOutput() {
		// API text differs from the CLI synthetic-tool transcript; rebuild from client history next time.
		_ = os.Remove(p.NativePath)
		return nil
	}
	bs, ok := answer["content"].([]Object)
	if !ok {
		return fmt.Errorf("missing assistant content")
	}
	if len(p.NativeRows) == 0 || p.NativeAnchor == "" {
		return fmt.Errorf("missing native CLI checkpoint")
	}
	hash := digest([]any{p.Hashes[len(p.Hashes)-1], Message{"assistant", bs}})
	hashes := append(append([]string(nil), p.Hashes...), hash)
	// Native history lifetime is independent of provider prompt-cache TTL.
	s := &Snapshot{Format: 2, NativeDigest: digest(string(nativeBytes(p.NativeRows))), Rows: p.NativeRows, LastUUID: p.NativeAnchor, SessionID: p.SessionID, NativePath: p.NativePath, Work: p.Work, Hashes: hashes, Expires: started.Add(24 * time.Hour)}
	s.PromptEvidence = &PromptEvidence{SystemDigest: digest(r.System), Expires: time.Now().Add(r.TTL)}
	return c.put(cacheKey(logical, r.toolHistoryNamespace(), hash), s)
}

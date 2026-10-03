package main

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

// Snapshots are gateway-owned, complete input/output transcripts. Never cache
// the CLI's synthetic tool-denial rows as if they were client tool results.
type Snapshot struct {
	Rows      []json.RawMessage `json:"rows"`
	LastUUID  string            `json:"last_uuid"`
	SessionID string            `json:"session_id"`
	Hashes    []string          `json:"hashes"`
	Expires   time.Time         `json:"expires"`
}
type HistoryCache struct {
	mu      sync.Mutex
	dir     string
	entries map[string]*Snapshot
	bytes   int64
	limit   int64
}

func newCache(dir string, limit int64) (*HistoryCache, error) {
	if e := os.MkdirAll(dir, 0700); e != nil {
		return nil, e
	}
	c := &HistoryCache{dir: dir, entries: map[string]*Snapshot{}, limit: limit}
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
		if json.Unmarshal(b, &s) != nil || time.Now().After(s.Expires) || len(s.Rows) != len(s.Hashes) || len(s.Rows) == 0 || s.LastUUID == "" {
			_ = os.Remove(p)
			continue
		}
		c.entries[key] = &s
		c.bytes += int64(len(b))
	}
	c.pruneLocked(time.Now())
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
	}
}
func (c *HistoryCache) prune() { c.mu.Lock(); defer c.mu.Unlock(); c.pruneLocked(time.Now()) }
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
	PriorKey                                string
	Prior                                   *Snapshot
}

func prepareHistory(r *Request, c *HistoryCache, logical, dir, version string) (*Prepared, error) {
	hashes := fingerprints(r.Messages)
	p := &Prepared{SessionID: uuid(), Hashes: hashes, Mode: "rebuild"}
	parent := ""
	start := 0
	if len(r.Messages) > 1 {
		key := cacheKey(logical, r.configKey(), hashes[len(hashes)-2])
		if s := c.get(key); s != nil && len(s.Rows) == len(r.Messages)-1 {
			p.Rows = append(p.Rows, s.Rows...)
			p.SessionID = s.SessionID
			p.Anchor = s.LastUUID
			parent = s.LastUUID
			start = len(s.Rows)
			p.Mode = "prefix-hit"
			p.Prior = s
			p.PriorKey = key
		}
	}
	for i := start; i < len(r.Messages); i++ {
		m := r.wireMessage(r.Messages[i])
		row, id := transcriptRow(m, parent, p.SessionID, dir, version, r.Model)
		p.Rows = append(p.Rows, row)
		parent = id
		if m.Role == "assistant" {
			p.Anchor = id
		}
	}
	p.LastUUID = parent
	if len(r.Messages) > 1 {
		if p.Anchor == "" {
			return nil, fmt.Errorf("missing assistant resume anchor")
		}
		var b bytes.Buffer
		for _, row := range p.Rows {
			b.Write(row)
			b.WriteByte('\n')
		}
		p.Path = filepath.Join(dir, "history.jsonl")
		if e := os.WriteFile(p.Path, b.Bytes(), 0600); e != nil {
			return nil, e
		}
	}
	return p, nil
}
func (p *Prepared) commit(r *Request, answer Object, c *HistoryCache, logical, dir, version string, started time.Time) error {
	bs, ok := answer["content"].([]Object)
	if !ok {
		return fmt.Errorf("missing assistant content")
	}
	m := Message{Role: "assistant", Content: bs}
	row, id := transcriptRow(r.wireMessage(m), p.LastUUID, p.SessionID, dir, version, r.Model)
	rows := append(append([]json.RawMessage(nil), p.Rows...), row)
	hash := digest([]any{p.Hashes[len(p.Hashes)-1], m})
	hashes := append(append([]string(nil), p.Hashes...), hash)
	s := &Snapshot{Rows: rows, LastUUID: id, SessionID: p.SessionID, Hashes: hashes, Expires: started.Add(r.TTL)}
	if e := c.put(cacheKey(logical, r.configKey(), hash), s); e != nil {
		return e
	}
	if p.Prior != nil {
		p.Prior.Expires = started.Add(r.TTL)
		return c.put(p.PriorKey, p.Prior)
	}
	return nil
}

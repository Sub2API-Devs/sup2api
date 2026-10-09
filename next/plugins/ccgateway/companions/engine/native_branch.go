package engine

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// Each indexed branch (§53.12) has one canonical native file,
// <cache>/native/<ID>.jsonl, holding every conversation of the branch. A
// request never runs the CLI on it: it runs on a private copy named
// <ID>.jsonl in its own directory (the CLI appends to the file it resumes when
// the name and the records' sessionId agree) holding only the resumed
// conversation (branchView), and its new records are merged back under the
// branch lock. Concurrent requests therefore never wait for each other's CLI
// runs and become sibling branches of one file. A conversation with no common
// prefix with the file becomes a new root of it. A full file is sealed and
// the branch continues in its next generation file (sessionBranch.fileID).

type branchLock struct {
	mu   sync.Mutex
	refs int
}

// lockBranch serializes canonical file access of one branch. Only reads,
// merges and index registration hold it, never a CLI run.
func (c *HistoryCache) lockBranch(id string) func() {
	c.mu.Lock()
	if c.locks == nil {
		c.locks = map[string]*branchLock{}
	}
	l := c.locks[id]
	if l == nil {
		l = &branchLock{}
		c.locks[id] = l
	}
	l.refs++
	c.mu.Unlock()
	l.mu.Lock()
	return func() {
		l.mu.Unlock()
		c.mu.Lock()
		if l.refs--; l.refs == 0 {
			delete(c.locks, id)
		}
		c.mu.Unlock()
	}
}

func (c *HistoryCache) canonicalPath(id string) string {
	return filepath.Join(c.dir, "native", id+".jsonl")
}

// readNativeFile returns the nonempty records of a native file.
func readNativeFile(path string) ([]json.RawMessage, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil || info.Size() > nativeFileReadLimitBytes {
		return nil, fmt.Errorf("native transcript exceeds limit")
	}
	scan := bufio.NewScanner(f)
	scan.Buffer(make([]byte, 65536), 32<<20)
	var rows []json.RawMessage
	for scan.Scan() {
		if len(bytes.TrimSpace(scan.Bytes())) == 0 {
			continue
		}
		rows = append(rows, append(json.RawMessage(nil), scan.Bytes()...))
	}
	return rows, scan.Err()
}

// readCanonical copies a branch's canonical records.
func (c *HistoryCache) readCanonical(id string) ([]json.RawMessage, error) {
	unlock := c.lockBranch(id)
	defer unlock()
	return readNativeFile(c.canonicalPath(id))
}

type nativeIdentity struct {
	UUID      string          `json:"uuid"`
	Parent    json.RawMessage `json:"parentUuid"`
	SessionID string          `json:"sessionId"`
}

func rowIdentity(row json.RawMessage) (id, parent, session string) {
	var r nativeIdentity
	if json.Unmarshal(row, &r) != nil {
		return "", "", ""
	}
	_ = json.Unmarshal(r.Parent, &parent)
	return r.UUID, parent, r.SessionID
}

// nativeChain is the conversation that ends at leaf, root first, as the CLI
// loads it: records by uuid (a later record replaces an earlier one), linked
// by parentUuid. It is nil when leaf is not in rows.
func nativeChain(rows []json.RawMessage, leaf string) []json.RawMessage {
	if leaf == "" {
		return nil
	}
	byID := map[string]json.RawMessage{}
	parents := map[string]string{}
	for _, row := range rows {
		id, parent, _ := rowIdentity(row)
		if id != "" {
			byID[id] = row
			parents[id] = parent
		}
	}
	if byID[leaf] == nil {
		return nil
	}
	var reversed []json.RawMessage
	seen := map[string]bool{}
	for id := leaf; id != "" && byID[id] != nil && !seen[id]; id = parents[id] {
		seen[id] = true
		reversed = append(reversed, byID[id])
	}
	chain := make([]json.RawMessage, len(reversed))
	for i, row := range reversed {
		chain[len(reversed)-1-i] = row
	}
	return chain
}

// nativeHasChildren reports whether a record already has descendants, that
// is, whether resuming at it starts a sibling branch.
func nativeHasChildren(rows []json.RawMessage, node string) bool {
	for _, row := range rows {
		if _, parent, _ := rowIdentity(row); parent == node {
			return true
		}
	}
	return false
}

// branchView is what a request's private copy holds of the canonical file:
// the conversation ending at node, and the records without a uuid (session
// bookkeeping), in file order, without the last-prompt leaf pointers. The CLI
// (2.1.292) loads one conversation per file, the last written one, and
// applies --resume-session-at within it: at a node of another branch it fails
// ("No message found") or mixes the branches. A view with one conversation
// resumes exactly the requested branch.
func branchView(rows []json.RawMessage, node string) []json.RawMessage {
	chain := map[string]bool{}
	for _, row := range nativeChain(rows, node) {
		id, _, _ := rowIdentity(row)
		chain[id] = true
	}
	view := make([]json.RawMessage, 0, len(rows))
	for _, row := range rows {
		id, _, _ := rowIdentity(row)
		if id != "" && !chain[id] {
			continue
		}
		if id == "" {
			var kind struct {
				Type string `json:"type"`
			}
			if json.Unmarshal(row, &kind) != nil || kind.Type == "last-prompt" {
				continue
			}
		}
		view = append(view, row)
	}
	return view
}

// mergeNative appends this run's records to the canonical file and returns its
// path, and whether the file is now full (nativeFileFull). Records whose uuid
// is already there are skipped; records without a uuid are taken only from
// the run's own part (rows[own:]) of the private copy, where a uuid written
// twice (a seeded pending input the CLI wrote again) keeps the CLI's later
// record, as the CLI itself would load it. When the canonical file is gone
// (expired or swept while the CLI ran), the copied prefix is restored from the
// private copy. Records are only ever appended. The caller holds the branch
// lock.
func (c *HistoryCache) mergeNative(id string, rows []json.RawMessage, own int) (string, bool, error) {
	path := c.canonicalPath(id)
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return "", false, err
	}
	current, err := readNativeFile(path)
	if err != nil && !os.IsNotExist(err) {
		return "", false, err
	}
	known := map[string]bool{}
	for _, row := range current {
		if uid, _, _ := rowIdentity(row); uid != "" {
			known[uid] = true
		}
	}
	last := map[string]int{}
	for i := own; i < len(rows); i++ {
		if uid, _, _ := rowIdentity(rows[i]); uid != "" {
			last[uid] = i
		}
	}
	merged := append([]json.RawMessage(nil), current...)
	added := false
	for i, row := range rows {
		uid, _, session := rowIdentity(row)
		if session != "" && session != id {
			return "", false, fmt.Errorf("native record belongs to another session")
		}
		if uid == "" && i < own || uid != "" && known[uid] {
			continue
		}
		if at, again := last[uid]; uid != "" && again && at != i {
			continue
		}
		if uid != "" {
			known[uid] = true
		}
		merged = append(merged, row)
		added = true
	}
	if added || err != nil {
		if err := writeNative(path, merged); err != nil {
			return "", false, err
		}
	}
	return path, nativeFileFull(merged), nil
}

// Limits of one branch file. A full file is sealed: later requests of the
// branch write its next generation, and its registered nodes stay resumable.
// Variables only so tests can lower them.
var (
	nativeFileSealBytes      = int64(64 << 20)
	nativeFileBranchPoints   = 1000
	nativeFileReadLimitBytes = int64(128 << 20) // a sealed file can exceed the seal size by one merge
)

// nativeFileFull reports whether records reach the size or branch point limit.
// A branch point is a record with more than one child.
func nativeFileFull(rows []json.RawMessage) bool {
	size := int64(0)
	children := map[string]int{}
	points := 0
	for _, row := range rows {
		size += int64(len(row)) + 1
		if _, parent, _ := rowIdentity(row); parent != "" {
			if children[parent]++; children[parent] == 2 {
				points++
			}
		}
	}
	return size >= nativeFileSealBytes || points >= nativeFileBranchPoints
}

func (c *HistoryCache) sealPath(id string) string {
	return filepath.Join(c.dir, "native", id+".sealed")
}

func (c *HistoryCache) sealed(id string) bool {
	_, err := os.Stat(c.sealPath(id))
	return err == nil
}

// seal marks a branch file full. The caller holds its branch lock.
func (c *HistoryCache) seal(id string) error {
	return os.WriteFile(c.sealPath(id), nil, 0600)
}

// currentGeneration is the branch generation new records go to: the first one
// whose file is not sealed.
func (c *HistoryCache) currentGeneration(b sessionBranch) int {
	n := 0
	for n < 1<<16 && c.sealed(b.fileID(n)) {
		n++
	}
	return n
}

// moveSession moves copied records to another session file of the branch.
// Only the session field changes; it is never sent to the API.
func moveSession(rows []json.RawMessage, from, to string) []json.RawMessage {
	if from == to {
		return rows
	}
	out := make([]json.RawMessage, len(rows))
	old, next := []byte(`"sessionId":"`+from+`"`), []byte(`"sessionId":"`+to+`"`)
	for i, row := range rows {
		out[i] = bytes.ReplaceAll(row, old, next)
	}
	return out
}

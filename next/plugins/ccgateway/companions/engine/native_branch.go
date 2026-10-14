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

// nativeContextRow keeps only routing fields. In particular, inspecting the
// transcript must not decode and re-encode arbitrary tool inputs or results.
type nativeContextRow struct {
	raw                                      json.RawMessage
	id, parent, session, kind, agent, prompt string
	message, source, group                   string
	sidechain, resultsOnly                   bool
	tools, results                           []string
	epoch                                    int
}

func contextRow(raw json.RawMessage) *nativeContextRow {
	var wire struct {
		nativeIdentity
		Type      string `json:"type"`
		Agent     string `json:"agentId"`
		Prompt    string `json:"promptId"`
		Source    string `json:"sourceToolAssistantUUID"`
		Sidechain bool   `json:"isSidechain"`
		Message   struct {
			ID      string          `json:"id"`
			Content json.RawMessage `json:"content"`
		} `json:"message"`
	}
	if json.Unmarshal(raw, &wire) != nil || wire.UUID == "" {
		return nil
	}
	n := &nativeContextRow{raw: raw, id: wire.UUID, session: wire.SessionID, kind: wire.Type, agent: wire.Agent, prompt: wire.Prompt, source: wire.Source, sidechain: wire.Sidechain, message: wire.Message.ID}
	_ = json.Unmarshal(wire.Parent, &n.parent)
	var blocks []struct {
		Type string `json:"type"`
		ID   string `json:"id"`
		Use  string `json:"tool_use_id"`
	}
	if json.Unmarshal(wire.Message.Content, &blocks) == nil && len(blocks) > 0 {
		n.resultsOnly = n.kind == "user"
		for _, b := range blocks {
			if b.Type == "tool_use" && b.ID != "" {
				n.tools = append(n.tools, b.ID)
			}
			if b.Type == "tool_result" && b.Use != "" {
				n.results = append(n.results, b.Use)
			} else {
				n.resultsOnly = false
			}
		}
	}
	return n
}

func sameNativeScope(a, b *nativeContextRow) bool {
	return a.session == b.session && a.agent == b.agent && a.sidechain == b.sidechain
}

// nativeChain returns the context ending at leaf. A native response may be
// split into several assistant records, and parallel tool results can be
// siblings rather than ancestors of the next response. Complete those local
// response groups without walking arbitrary children into another chat branch.
// Duplicate UUIDs use their last payload, at their original sequence position.
func nativeChain(rows []json.RawMessage, leaf string) []json.RawMessage {
	if leaf == "" {
		return nil
	}
	byID := map[string]*nativeContextRow{}
	var order []string
	for _, row := range rows {
		if n := contextRow(row); n != nil {
			if byID[n.id] == nil {
				order = append(order, n.id)
			}
			byID[n.id] = n
		}
	}
	if byID[leaf] == nil {
		return nil
	}
	selected := map[string]bool{}
	addParents := func(id string) {
		for n := byID[id]; n != nil && !selected[n.id]; n = byID[n.parent] {
			selected[n.id] = true
		}
	}
	addParents(leaf)
	// The nearest assistant through only tool results/attachments identifies
	// the model response. A new user prompt or a different response is a boundary.
	// Cache intermediate nodes too: a long sequence of tool results otherwise
	// walks the same ancestors once per result and becomes quadratic.
	priorKnown := map[string]bool{}
	priorCache := map[string]*nativeContextRow{}
	priorAssistant := func(n *nativeContextRow) *nativeContextRow {
		if priorKnown[n.id] {
			return priorCache[n.id]
		}
		var result *nativeContextRow
		var path []*nativeContextRow
		seen := map[string]bool{}
		for at := n; at != nil && !seen[at.id]; {
			seen[at.id] = true
			path = append(path, at)
			p := byID[at.parent]
			if p == nil || !sameNativeScope(at, p) || p.kind == "user" && !p.resultsOnly {
				break
			}
			if p.kind == "assistant" {
				result = p
				break
			}
			if priorKnown[p.id] {
				result = priorCache[p.id]
				break
			}
			at = p
		}
		for _, at := range path {
			priorKnown[at.id] = true
			priorCache[at.id] = result
		}
		return result
	}
	var responseGroup func(*nativeContextRow) string
	grouping := map[string]bool{}
	responseGroup = func(n *nativeContextRow) string {
		if n.group != "" {
			return n.group
		}
		if grouping[n.id] {
			return n.id
		}
		grouping[n.id] = true
		n.group = n.id
		if n.message != "" {
			if p := priorAssistant(n); p != nil && p.message == n.message {
				n.group = responseGroup(p)
			}
		}
		delete(grouping, n.id)
		return n.group
	}
	groupTools := map[string]map[string]bool{}
	for _, id := range order {
		n := byID[id]
		if n.kind == "assistant" {
			group := responseGroup(n)
			if groupTools[group] == nil {
				groupTools[group] = map[string]bool{}
			}
			for _, tool := range n.tools {
				groupTools[group][tool] = true
			}
		}
	}
	for _, id := range order {
		n := byID[id]
		if n.kind != "user" || len(n.results) == 0 {
			continue
		}
		p := priorAssistant(n)
		if p == nil {
			continue
		}
		group := p.group
		if n.source != "" {
			source := byID[n.source]
			if source == nil || source.kind != "assistant" || source.group != group {
				continue
			}
		}
		valid := true
		for _, result := range n.results {
			valid = valid && groupTools[group][result]
		}
		if valid {
			n.group = group
		}
	}
	// Runs are appended as units. A new prompt or another model response ends
	// a result batch, even when a later branch answers the same tool_use IDs.
	active, epoch := "", 0
	for _, id := range order {
		n := byID[id]
		if n.kind == "user" && n.group == "" {
			active = ""
			epoch++
		} else if n.group != "" {
			if active != n.group {
				active = n.group
				epoch++
			}
			n.epoch = epoch
		}
	}
	assistantEpochs := map[int]bool{}
	for id := range selected {
		n := byID[id]
		if n.kind == "assistant" {
			assistantEpochs[n.epoch] = true
		}
	}
	for _, id := range order {
		n := byID[id]
		if n.kind == "assistant" && assistantEpochs[n.epoch] {
			addParents(id)
		}
		if id == leaf {
			break
		}
	}
	resultAnchors := map[int][]*nativeContextRow{}
	usedResults := map[string]map[string]bool{}
	for id := range selected {
		n := byID[id]
		if n.kind == "user" && len(n.results) > 0 && n.group != "" {
			resultAnchors[n.epoch] = append(resultAnchors[n.epoch], n)
			if usedResults[n.group] == nil {
				usedResults[n.group] = map[string]bool{}
			}
			for _, result := range n.results {
				usedResults[n.group][result] = true
			}
		}
	}
	var candidates []*nativeContextRow
	counts := map[int]map[string]int{}
	for _, id := range order {
		n := byID[id]
		if !selected[id] && n.resultsOnly && n.group != "" {
			for _, anchor := range resultAnchors[n.epoch] {
				if n.prompt != "" && anchor.prompt != "" && n.prompt != anchor.prompt {
					continue
				}
				if counts[n.epoch] == nil {
					counts[n.epoch] = map[string]int{}
				}
				candidates = append(candidates, n)
				for _, result := range n.results {
					counts[n.epoch][result]++
				}
				break
			}
		}
		// Resuming at an assistant must never pick up its later tool results
		// (or later fragments when explicitly resuming at an earlier block).
		if id == leaf {
			break
		}
	}
	for _, n := range candidates {
		unique := true
		for _, result := range n.results {
			if !usedResults[n.group][result] && counts[n.epoch][result] > 1 {
				// There is no safe basis for choosing a branch's result. The
				// resume caller rebuilds from client history on a nil context.
				return nil
			}
			unique = unique && !usedResults[n.group][result] && counts[n.epoch][result] == 1
		}
		if unique {
			addParents(n.id)
		}
	}
	// A previous completed model response cannot lose a result simply because
	// its only candidate had foreign metadata or unselected free-form text.
	// Leave the current assistant response's calls pending for the API client.
	completedTools := map[string]map[string]bool{}
	completedResults := map[string]map[string]bool{}
	for id := range selected {
		n := byID[id]
		if n.group == "" || byID[leaf].kind == "assistant" && n.group == byID[leaf].group {
			continue
		}
		if completedTools[n.group] == nil {
			completedTools[n.group] = map[string]bool{}
			completedResults[n.group] = map[string]bool{}
		}
		for _, tool := range n.tools {
			completedTools[n.group][tool] = true
		}
		for _, result := range n.results {
			completedResults[n.group][result] = true
		}
	}
	for group, tools := range completedTools {
		for tool := range tools {
			if !completedResults[group][tool] {
				return nil
			}
		}
	}
	// Emit each latest record once, preserving native block order and ensuring
	// parents precede children even when a later UUID rewrite changes an edge.
	var chain []json.RawMessage
	visiting, emitted := map[string]bool{}, map[string]bool{}
	var emit func(string)
	emit = func(id string) {
		if !selected[id] || visiting[id] || emitted[id] {
			return
		}
		visiting[id] = true
		emit(byID[id].parent)
		emitted[id] = true
		chain = append(chain, byID[id].raw)
	}
	for _, id := range order {
		if id != leaf {
			emit(id)
		}
	}
	emit(leaf)
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
// the context ending at node, and records without a uuid (session bookkeeping),
// without the last-prompt leaf pointers. The CLI
// (2.1.292) loads one conversation per file, the last written one, and
// applies --resume-session-at within it: at a node of another branch it fails
// ("No message found") or mixes the branches. A view with one conversation
// resumes exactly the requested branch.
func branchView(rows []json.RawMessage, node string) []json.RawMessage {
	return branchViewFromChain(rows, nativeChain(rows, node))
}

// branchViewFromChain reuses context already selected from these same rows.
// History preparation needs both the context and its private file view; it
// should not parse and traverse the whole native transcript twice.
func branchViewFromChain(rows, chain []json.RawMessage) []json.RawMessage {
	if chain == nil {
		return nil
	}
	// Re-emitting a duplicate at its last physical position can make that
	// historical node the CLI's selected leaf, hiding the requested anchor.
	// Use the latest payload once, in nativeChain's parent-before-child order.
	first := map[string]int{}
	type bookkeeping struct {
		at  int
		raw json.RawMessage
	}
	var records []bookkeeping
	for i, row := range rows {
		id, _, _ := rowIdentity(row)
		if id != "" {
			if _, exists := first[id]; !exists {
				first[id] = i
			}
			continue
		}
		var kind struct {
			Type string `json:"type"`
		}
		if json.Unmarshal(row, &kind) == nil && kind.Type != "last-prompt" {
			records = append(records, bookkeeping{i, row})
		}
	}
	view := make([]json.RawMessage, 0, len(chain)+len(records))
	meta := 0
	for _, row := range chain {
		id, _, _ := rowIdentity(row)
		for meta < len(records) && records[meta].at < first[id] {
			view = append(view, records[meta].raw)
			meta++
		}
		view = append(view, row)
	}
	for ; meta < len(records); meta++ {
		view = append(view, records[meta].raw)
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

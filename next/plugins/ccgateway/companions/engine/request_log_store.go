package engine

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// The level is kept beside the logs (request-logs.json); an older Worker's
// marker (request-logs.disabled) is read as off and written for off, so a
// rollback keeps logging off. Without either the level is the summary.
const requestLogStateFile, requestLogDisabledMarker = "request-logs.json", "request-logs.disabled"

type requestLogState struct {
	Level     string     `json:"level"`
	FullUntil *time.Time `json:"full_until"`
}

// newRequestLogStore reads the account's level. Off removes any log left.
func newRequestLogStore(root string) (*requestLogStore, error) {
	s := &requestLogStore{root: filepath.Join(root, "request-logs"), state: root, level: logLevelSummary, active: map[*requestDiagnostic]bool{},
		pruneDue: make(chan struct{}, 1)}
	raw, err := os.ReadFile(filepath.Join(root, requestLogStateFile))
	var saved requestLogState
	switch {
	case err == nil && json.Unmarshal(raw, &saved) == nil && (saved.Level == logLevelOff || saved.Level == logLevelSummary || saved.Level == logLevelFull && saved.FullUntil != nil):
		s.level = saved.Level
		if saved.FullUntil != nil {
			s.fullUntil = *saved.FullUntil
		}
	case err != nil && !os.IsNotExist(err):
		return nil, err
	default:
		if _, err := os.Stat(filepath.Join(root, requestLogDisabledMarker)); err == nil {
			s.level = logLevelOff
		} else if !os.IsNotExist(err) {
			return nil, err
		}
	}
	s.enabled = s.level != logLevelOff
	if !s.enabled {
		if err := os.RemoveAll(s.root); err != nil {
			return nil, err
		}
	}
	// Logs moved aside to be removed (store.discard) and left by a stopped
	// Worker are removed now.
	aside, _ := filepath.Glob(s.root + discardedSuffix + "*")
	for _, path := range aside {
		if err := os.RemoveAll(path); err != nil {
			return nil, err
		}
	}
	s.startIndex()
	return s, nil
}

// discardedSuffix names the logs turned off, moved aside to be removed.
const discardedSuffix = ".deleted-"

// persist writes the level (caller holds s.mu).
func (s *requestLogStore) persist() error {
	state := requestLogState{Level: s.level}
	if s.level == logLevelFull {
		until := s.fullUntil.UTC()
		state.FullUntil = &until
	}
	b, _ := json.Marshal(state)
	tmp := filepath.Join(s.state, requestLogStateFile+".tmp")
	if err := os.WriteFile(tmp, b, 0600); err != nil {
		return err
	}
	if err := os.Rename(tmp, filepath.Join(s.state, requestLogStateFile)); err != nil {
		return err
	}
	marker := filepath.Join(s.state, requestLogDisabledMarker)
	if s.level == logLevelOff {
		return os.WriteFile(marker, []byte("disabled"), 0600)
	}
	if err := os.Remove(marker); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// captureContent says whether a request starting now keeps content (caller
// holds s.mu). The full level ends at its time and the summary applies again.
func (s *requestLogStore) captureContent() bool {
	if s.level == logLevelFull && !s.clock().Before(s.fullUntil) {
		s.level, s.fullUntil = logLevelSummary, time.Time{}
		if err := s.persist(); err != nil {
			log.Printf("request log level not saved: %v", err)
		}
	}
	return s.level == logLevelFull
}

func (s *requestLogStore) clock() time.Time {
	if s.now != nil {
		return s.now()
	}
	return time.Now()
}

type requestLogStore struct {
	// mu guards the level, the active requests and the index; no file is
	// written under it except the level's own (see requestDiagnostic.lock).
	mu      sync.Mutex
	root    string
	enabled bool
	// level is off, summary or full; fullUntil ends the full level.
	level     string
	fullUntil time.Time
	// state is the directory the level is saved in.
	state  string
	pruned time.Time
	now    func() time.Time
	active map[*requestDiagnostic]bool
	// index lists the finished requests for the viewer; nil until built.
	index map[string]logEntry
	// While the index is built in the background (startIndex), the requests
	// finished meanwhile wait in indexPending and the ones pruned in
	// indexPruned; indexReady closes when it is built.
	indexBuilding bool
	indexPending  map[string]logEntry
	indexPruned   map[string]bool
	indexReady    chan struct{}
	// pruning lets one prune run at a time.
	pruning sync.Mutex
	// pruneDue asks for a prune off the request goroutine (capture); the
	// maintenance loop serves it and stops with the Worker.
	pruneDue chan struct{}
}

func (s *requestLogStore) serve(w http.ResponseWriter, r *http.Request) {
	if s == nil {
		apiError(w, 503, "api_error", "Request logs unavailable")
		return
	}
	view, ok := s.change(w, r)
	if !ok {
		return
	}
	// The logs' size is read from disk without holding the account's lock.
	view["usage"] = requestLogUsage(s.root)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(view)
}

// change applies a PUT and describes the logs; false means it answered.
func (s *requestLogStore) change(w http.ResponseWriter, r *http.Request) (Object, bool) {
	switch r.Method {
	case "GET":
	case "PUT":
		if !s.put(w, r) {
			return nil, false
		}
	default:
		apiError(w, 405, "invalid_request_error", "Use GET or PUT")
		return nil, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.describe(), true
}

// put applies one PUT: a level, or clearing the content.
func (s *requestLogStore) put(w http.ResponseWriter, r *http.Request) bool {
	var input map[string]json.RawMessage
	if json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&input) != nil {
		apiError(w, 400, "invalid_request_error", "Invalid request log setting")
		return false
	}
	level, hours, clear, ok := requestLogChange(input)
	if !ok {
		apiError(w, 400, "invalid_request_error", `Use {"level":"off"|"summary"}, {"level":"full","full_for_hours":1|4|24}, {"clear_full":true} or {"enabled":bool}`)
		return false
	}
	if clear {
		return s.clearFull(w)
	}
	return s.applyLevel(w, level, hours)
}

// clearFull removes the content of every request logged so far; the
// summaries stay. Under s.mu the running requests stop capturing content and
// the logged requests are listed; their files are removed after s.mu is
// released, so no request waits for the disk (audit C7).
func (s *requestLogStore) clearFull(w http.ResponseWriter) bool {
	s.mu.Lock()
	for d := range s.active {
		d.mu.Lock()
		d.stopContent()
		d.mu.Unlock()
	}
	requests, err := os.ReadDir(s.root)
	s.mu.Unlock()
	switch {
	case os.IsNotExist(err):
		err = nil
	case err == nil:
		err = clearContent(s.root, requests)
	}
	if err != nil {
		apiError(w, 500, "api_error", "Cannot clear request log content")
		return false
	}
	return true
}

// applyLevel sets and saves the level. Off ends the running requests' logs
// and moves the logs aside under s.mu; they are removed after it is released.
func (s *requestLogStore) applyLevel(w http.ResponseWriter, level string, hours int) bool {
	s.mu.Lock()
	previous, previousUntil := s.level, s.fullUntil
	s.level, s.fullUntil = level, time.Time{}
	if level == logLevelFull {
		s.fullUntil = s.clock().Add(time.Duration(hours) * time.Hour)
	}
	if err := s.persist(); err != nil {
		s.level, s.fullUntil = previous, previousUntil
		s.mu.Unlock()
		apiError(w, 500, "api_error", "Cannot persist request log setting")
		return false
	}
	s.enabled = level != logLevelOff
	var aside string
	var err error
	if !s.enabled {
		aside, err = s.discard()
	}
	s.mu.Unlock()
	if err == nil && aside != "" {
		err = removeLogPath(aside)
	}
	if err != nil {
		apiError(w, 500, "api_error", "Cannot clear request logs")
		return false
	}
	return true
}

// discard ends every running request's log, empties the index and moves the
// logs aside (caller holds s.mu). It returns the directory to remove, "" when
// there were no logs; one left by a stopped Worker is removed at its next
// start (newRequestLogStore).
func (s *requestLogStore) discard() (string, error) {
	for d := range s.active {
		d.mu.Lock()
		d.stopContent()
		d.directory = ""
		d.discarded = true
		d.mu.Unlock()
	}
	s.index = map[string]logEntry{}
	aside := s.root + discardedSuffix + uuid()
	if err := os.Rename(s.root, aside); err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return aside, nil
}

// requestLogChange reads one PUT: a level (full with its hours), clearing the
// content, or an older core's switch (on is the summary).
func requestLogChange(input map[string]json.RawMessage) (level string, hours int, clear, ok bool) {
	only := func(keys ...string) bool {
		if len(input) != len(keys) {
			return false
		}
		for _, key := range keys {
			if _, present := input[key]; !present {
				return false
			}
		}
		return true
	}
	switch {
	case only("enabled"):
		var on bool
		if json.Unmarshal(input["enabled"], &on) != nil || string(input["enabled"]) == "null" {
			return "", 0, false, false
		}
		if on {
			return logLevelSummary, 0, false, true
		}
		return logLevelOff, 0, false, true
	case only("clear_full"):
		var yes bool
		return "", 0, true, json.Unmarshal(input["clear_full"], &yes) == nil && yes
	case only("level"), only("level", "full_for_hours"):
		if json.Unmarshal(input["level"], &level) != nil {
			return "", 0, false, false
		}
		_, timed := input["full_for_hours"]
		if level == logLevelFull {
			return level, hours, false, timed && json.Unmarshal(input["full_for_hours"], &hours) == nil && fullDurations[hours]
		}
		return level, 0, false, !timed && (level == logLevelOff || level == logLevelSummary)
	}
	return "", 0, false, false
}

// describe is the level and each level's limits (caller holds s.mu); serve
// adds the usage. The top-level limits are the full level's, as an older core reads them.
func (s *requestLogStore) describe() Object {
	level := s.level
	if !s.enabled {
		level = logLevelOff
	}
	var until any
	if level == logLevelFull && !s.fullUntil.IsZero() {
		if !s.clock().Before(s.fullUntil) {
			level = logLevelSummary
		} else {
			until = s.fullUntil.UTC().Format(time.RFC3339)
		}
	}
	return Object{
		"enabled": s.enabled, "level": level, "full_until": until, "levels": []string{logLevelOff, logLevelSummary, logLevelFull},
		"limits": Object{
			logLevelSummary: Object{"retention_hours": int(summaryRetention / time.Hour), "storage_budget_bytes": summaryBudget, "per_request_limit_bytes": summaryRequestLimit},
			logLevelFull:    Object{"retention_hours": int(fullRetention / time.Hour), "storage_budget_bytes": fullBudget, "per_request_limit_bytes": fullRequestLimit},
		},
		"per_request_limit_bytes": fullRequestLimit, "retention_hours": int(fullRetention / time.Hour), "storage_budget_bytes": fullBudget,
		"overflow_behavior": "retain_partial_with_metadata",
		// viewer: the logs can be read through /admin/request-logs/{query,detail,read}.
		"viewer": true,
		// viewer_search: the query also takes mode, session_id, sha256 and
		// changed (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §3); an older Worker
		// refuses those keys.
		"viewer_search": true,
	}
}

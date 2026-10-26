package engine

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// The level is kept beside the logs (request-logs.json); an older Worker's
// marker (request-logs.disabled) is read as off and written for off, so a
// rollback keeps logging off. Without either the level is off (2026-10-27):
// it only decides for a request whose policy names no level (one sent by
// hand, or by an older core), and reading it removes nothing.
const requestLogStateFile, requestLogDisabledMarker = "request-logs.json", "request-logs.disabled"

type requestLogState struct {
	Level     string     `json:"level"`
	FullUntil *time.Time `json:"full_until"`
}

// newRequestLogStore reads the account's level. The logs left are kept
// whatever the level: turning it off removed them then (applyLevel), and a
// log written since at the level a request's policy named
// (REQUEST-LOG-POLICY-DESIGN.md §3) must survive a restart. Only an older
// Worker's off (its marker alone) removes them, once: the level is then saved
// as this Worker's own, which the next start reads.
func newRequestLogStore(root string) (*requestLogStore, error) {
	s := &requestLogStore{root: filepath.Join(root, "request-logs"), state: root, level: logLevelOff, active: map[*requestDiagnostic]bool{},
		pruneDue: make(chan struct{}, 1), staging: filepath.Join(root, requestLogStaging)}
	raw, err := os.ReadFile(filepath.Join(root, requestLogStateFile))
	var saved requestLogState
	legacyOff := false
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
			s.level, legacyOff = logLevelOff, true
		} else if !os.IsNotExist(err) {
			return nil, err
		}
	}
	s.enabled = s.level != logLevelOff
	if legacyOff {
		if err := os.RemoveAll(s.root); err != nil {
			return nil, err
		}
		if err := s.writeState(s.level, s.fullUntil); err != nil {
			log.Printf("request log level not saved: %v", err)
		}
	}
	// Logs moved aside to be removed (store.discard) and left by a stopped
	// Worker are removed now, as are sent requests a stopped Worker staged.
	aside, _ := filepath.Glob(s.root + discardedSuffix + "*")
	for _, path := range aside {
		if err := os.RemoveAll(path); err != nil {
			return nil, err
		}
	}
	if err := os.RemoveAll(s.staging); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(s.staging, 0700); err != nil {
		return nil, err
	}
	s.sink = newLogSink(logSinkQueue, logSinkInflight)
	s.startIndex()
	return s, nil
}

// requestLogStaging holds the request the CLI sent, moved out of the
// request's temporary directory until the background writer keeps it
// (keepUpstreamRequest). It sits beside the logs, on the same disk as the
// Worker's temporary directories, so moving a file there is a rename.
const requestLogStaging = "request-logs-staging"

// stage moves a file the CLI wrote into staging.
func (s *requestLogStore) stage(path string) (string, error) {
	staged := filepath.Join(s.staging, uuid())
	if err := os.Rename(path, staged); err != nil {
		// A missing staging directory is not a missing file.
		if _, statErr := os.Lstat(path); statErr == nil {
			return "", fmt.Errorf("stage %s: %w", filepath.Base(path), errors.Join(err, errStagingUnavailable))
		}
		return "", err
	}
	return staged, nil
}

var errStagingUnavailable = errors.New("request log staging unavailable")

// close stops the background writer, letting it drain for a while (§3).
func (s *requestLogStore) close() {
	if s != nil {
		s.sink.close(logSinkDrain)
	}
}

// discardedSuffix names the logs turned off, moved aside to be removed.
const discardedSuffix = ".deleted-"

// writeState saves a level (caller holds s.persist, never s.mu: a request
// never waits for the disk).
func (s *requestLogStore) writeState(level string, fullUntil time.Time) error {
	state := requestLogState{Level: level}
	if level == logLevelFull {
		until := fullUntil.UTC()
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
	if level == logLevelOff {
		return os.WriteFile(marker, []byte("disabled"), 0600)
	}
	if err := os.Remove(marker); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// persistCurrent saves the level the store holds now (the background writer,
// after the full level ended).
func (s *requestLogStore) persistCurrent() {
	s.persist.Lock()
	defer s.persist.Unlock()
	s.mu.Lock()
	level, until := s.level, s.fullUntil
	s.mu.Unlock()
	if err := s.writeState(level, until); err != nil {
		log.Printf("request log level not saved: %v", err)
	}
}

// captureContent says whether a request starting now keeps content (caller
// holds s.mu). The full level ends at its time and the summary applies again;
// the background writer saves that.
func (s *requestLogStore) captureContent() bool {
	if s.level == logLevelFull && !s.clock().Before(s.fullUntil) {
		s.level, s.fullUntil = logLevelSummary, time.Time{}
		s.sink.submit(0, func() int64 {
			s.persistCurrent()
			return 0
		})
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
	// touched under it (see requestDiagnostic.lock).
	mu sync.Mutex
	// io is held by the background writer while it writes a request's files
	// and by turning logs off or clearing them; no request takes it.
	io sync.Mutex
	// persist orders the saves of the level.
	persist sync.Mutex
	// sink is the background writer every log file goes through.
	sink    *logSink
	staging string
	root    string
	// enabled: the store's own level is not off. It decides only for a request
	// whose policy names no level (capture); logs kept at a policy's level are
	// written, listed and read whatever it is.
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
		apiError(w, 400, "invalid_request_error", `Use {"level":"off"|"summary"}, {"level":"full","full_for_hours":1|4|24}, {"clear_full":true}, {"clear_all":true} or {"enabled":bool}`)
		return false
	}
	switch clear {
	case clearFull:
		return s.clearFull(w)
	case clearAll:
		return s.clearAll(w)
	}
	return s.applyLevel(w, level, hours)
}

// What a PUT clears (requestLogChange): the content alone, or every log.
const (
	clearFull = "full"
	clearAll  = "all"
)

// clearAll removes every log, summaries and content, and leaves the level as
// it is (REQUEST-LOG-POLICY-DESIGN.md §3). Like turning the level off, the
// running requests' logs end and the logs are moved aside while no
// background write runs; they are removed after, so no request and no
// background write waits for the disk.
func (s *requestLogStore) clearAll(w http.ResponseWriter) bool {
	s.io.Lock()
	s.mu.Lock()
	s.discardLocked()
	s.mu.Unlock()
	aside, err := s.moveAside()
	s.io.Unlock()
	if err == nil && aside != "" {
		err = removeLogPath(aside)
	}
	if err != nil {
		apiError(w, 500, "api_error", "Cannot clear request logs")
		return false
	}
	return true
}

// clearFull removes the content of every request logged so far; the
// summaries stay. While no background write runs, the requests not yet
// completed stop keeping content (their queued content is then skipped) and
// the logged requests are listed; their files are removed after, so no
// request waits for the disk (audit C7).
func (s *requestLogStore) clearFull(w http.ResponseWriter) bool {
	s.io.Lock()
	s.mu.Lock()
	for d := range s.active {
		d.mu.Lock()
		d.stopContent()
		d.mu.Unlock()
	}
	s.mu.Unlock()
	requests, err := os.ReadDir(s.root)
	s.io.Unlock()
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

// applyLevel saves and sets the level. The level is saved first, outside
// s.mu, so a request never waits for it. Off ends the running requests' logs
// and moves the logs aside; they are removed after.
func (s *requestLogStore) applyLevel(w http.ResponseWriter, level string, hours int) bool {
	s.persist.Lock()
	defer s.persist.Unlock()
	var until time.Time
	if level == logLevelFull {
		until = s.clock().Add(time.Duration(hours) * time.Hour)
	}
	if err := s.writeState(level, until); err != nil {
		apiError(w, 500, "api_error", "Cannot persist request log setting")
		return false
	}
	s.io.Lock()
	s.mu.Lock()
	s.level, s.fullUntil = level, until
	s.enabled = level != logLevelOff
	if !s.enabled {
		s.discardLocked()
	}
	s.mu.Unlock()
	var aside string
	var err error
	if level == logLevelOff {
		aside, err = s.moveAside()
	}
	s.io.Unlock()
	if err == nil && aside != "" {
		err = removeLogPath(aside)
	}
	if err != nil {
		apiError(w, 500, "api_error", "Cannot clear request logs")
		return false
	}
	return true
}

// discardLocked ends every running request's log and empties the index
// (caller holds s.io and s.mu), for the level turned off and for clearing
// every log. A request's queued writes find its directory gone.
func (s *requestLogStore) discardLocked() {
	for d := range s.active {
		d.mu.Lock()
		d.stopContent()
		d.directory = ""
		d.discarded = true
		d.mu.Unlock()
	}
	s.index = map[string]logEntry{}
}

// moveAside moves the logs aside (caller holds s.io) and returns the
// directory to remove, "" when there were no logs; one left by a stopped
// Worker is removed at its next start (newRequestLogStore).
func (s *requestLogStore) moveAside() (string, error) {
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
// content or every log, or an older core's switch (on is the summary).
func requestLogChange(input map[string]json.RawMessage) (level string, hours int, clear string, ok bool) {
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
			return "", 0, "", false
		}
		if on {
			return logLevelSummary, 0, "", true
		}
		return logLevelOff, 0, "", true
	case only("clear_full"):
		var yes bool
		return "", 0, clearFull, json.Unmarshal(input["clear_full"], &yes) == nil && yes
	case only("clear_all"):
		var yes bool
		return "", 0, clearAll, json.Unmarshal(input["clear_all"], &yes) == nil && yes
	case only("level"), only("level", "full_for_hours"):
		if json.Unmarshal(input["level"], &level) != nil {
			return "", 0, "", false
		}
		_, timed := input["full_for_hours"]
		if level == logLevelFull {
			return level, hours, "", timed && json.Unmarshal(input["full_for_hours"], &hours) == nil && fullDurations[hours]
		}
		return level, 0, "", !timed && (level == logLevelOff || level == logLevelSummary)
	}
	return "", 0, "", false
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
		// clear_all: a PUT {"clear_all":true} removes every log and keeps the
		// level (REQUEST-LOG-POLICY-DESIGN.md §3); an older Worker refuses it.
		"clear_all": true,
	}
}

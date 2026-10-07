package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
)

// mainRequestScope binds a per-process system marker to the authenticated Mod
// turn lease. The marker is stripped before forwarding and never enters the
// upstream prompt cache. Auxiliary model.complete/classify calls do not carry
// the CLI append-system-prompt section (verified against CLI 2.1.292).
type mainRequestScope struct {
	marker   string
	mu       sync.Mutex
	active   bool
	applied  int
	baseline int
	failure  error
}

func newMainRequestScope() *mainRequestScope {
	return &mainRequestScope{marker: "<ccgateway-request:" + uuid() + ":" + uuid() + ">"}
}

func (s *mainRequestScope) enter() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.failure != nil {
		return s.failure
	}
	if s.active {
		return fmt.Errorf("overlapping main model turns")
	}
	s.active = true
	s.baseline = s.applied
	return nil
}

func (s *mainRequestScope) leave() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.active {
		s.failure = fmt.Errorf("main model turn ended without an active lease")
	} else if s.applied == s.baseline {
		s.failure = fmt.Errorf("main model turn ended without applying its client feature plan")
	}
	s.active = false
	return s.failure
}

func (s *mainRequestScope) rejectHiddenMarker(message Object) error {
	var encoded bytes.Buffer
	encoder := json.NewEncoder(&encoded)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(message); err != nil {
		return fmt.Errorf("cannot verify main request marker removal")
	}
	if bytes.Contains(encoded.Bytes(), []byte(s.marker)) {
		return fmt.Errorf("main request marker outside its terminal system section")
	}
	return nil
}

// identify strips exactly one terminal append section. An unexpected layout is
// refused rather than removed by a broad replacement of client system text.
func (s *mainRequestScope) identify(message Object, count bool) (bool, error) {
	if s == nil {
		return true, nil
	}
	blocks, ok := message["system"].([]any)
	if !ok {
		if text, yes := message["system"].(string); yes && strings.Contains(text, s.marker) {
			return false, fmt.Errorf("unexpected main request marker layout")
		}
		return false, s.rejectHiddenMarker(message)
	}
	index, text := -1, ""
	for i, value := range blocks {
		block, _ := value.(map[string]any)
		candidate := str(block, "text")
		if !strings.Contains(candidate, s.marker) {
			continue
		}
		if index != -1 || str(block, "type") != "text" || strings.Count(candidate, s.marker) != 1 {
			return false, fmt.Errorf("ambiguous main request marker")
		}
		index, text = i, candidate
	}
	if index == -1 {
		return false, s.rejectHiddenMarker(message)
	}
	if text != s.marker && !strings.HasSuffix(text, "\n\n"+s.marker) {
		return false, fmt.Errorf("main request marker is not its terminal section")
	}
	s.mu.Lock()
	active := s.active
	s.mu.Unlock()
	if !count && !active {
		return false, fmt.Errorf("main model request outside its Mod turn")
	}
	cleanBlocks := append([]any(nil), blocks...)
	if text == s.marker {
		cleanBlocks = append(cleanBlocks[:index:index], cleanBlocks[index+1:]...)
	} else {
		original := blocks[index].(map[string]any)
		clean := Object{}
		for key, value := range original {
			clean[key] = value
		}
		clean["text"] = strings.TrimSuffix(text, "\n\n"+s.marker)
		cleanBlocks[index] = clean
	}
	cleanMessage := Object{}
	for key, value := range message {
		cleanMessage[key] = value
	}
	cleanMessage["system"] = cleanBlocks
	if err := s.rejectHiddenMarker(cleanMessage); err != nil {
		return false, err
	}
	message["system"] = cleanBlocks
	return true, nil
}

func (s *mainRequestScope) recordApplied() {
	if s == nil {
		return
	}
	s.mu.Lock()
	s.applied++
	s.mu.Unlock()
}

func (s *mainRequestScope) verify() error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.failure != nil {
		return s.failure
	}
	if s.active && s.applied == s.baseline {
		return fmt.Errorf("active main model turn has not applied its client feature plan")
	}
	if s.applied == 0 {
		return fmt.Errorf("no attributed main request applied the client feature plan")
	}
	return nil
}

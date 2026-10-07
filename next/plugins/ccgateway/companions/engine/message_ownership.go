package engine

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

const messageOwnershipTTL = time.Hour
const messageOwnershipLimit = 4096

type ownedMessage struct {
	Scope   string    `json:"scope"`
	Created time.Time `json:"created"`
}

type messageOwnershipState struct {
	Generation string                  `json:"generation"`
	Entries    map[string]ownedMessage `json:"entries"`
}

// This independent bounded index is not a debug log and contains only hashes
// and timestamps. It proves local tenant ownership, not provider retention.
type messageOwnership struct {
	mu         sync.Mutex
	path       string
	entries    map[string]ownedMessage
	loadErr    error
	generation string
}

func openMessageOwnership(path string) *messageOwnership {
	s := &messageOwnership{path: path, entries: map[string]ownedMessage{}, generation: uuid()}
	f, err := os.Open(path)
	if os.IsNotExist(err) {
		return s
	}
	if err != nil {
		s.loadErr = err
		return s
	}
	defer f.Close()
	raw, err := io.ReadAll(io.LimitReader(f, 2<<20))
	var state messageOwnershipState
	if err == nil {
		err = json.Unmarshal(raw, &state)
	}
	if err != nil || state.Generation == "" || state.Entries == nil || len(state.Entries) > messageOwnershipLimit {
		s.loadErr = fmt.Errorf("invalid message ownership index")
	} else {
		s.generation, s.entries = state.Generation, state.Entries
	}
	return s
}

func (s *messageOwnership) owns(id, scope string, now time.Time) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.entries[digest(id)]
	return s.loadErr == nil && ok && e.Scope == scope && !now.Before(e.Created) && now.Sub(e.Created) < messageOwnershipTTL
}

func (s *messageOwnership) remember(id, scope string, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.loadErr != nil {
		return s.loadErr
	}
	key := digest(id)
	if previous, exists := s.entries[key]; exists && now.Sub(previous.Created) < messageOwnershipTTL {
		if previous.Scope != scope {
			return fmt.Errorf("message ownership collision")
		}
		return nil
	}
	for key, entry := range s.entries {
		if now.Before(entry.Created) || now.Sub(entry.Created) >= messageOwnershipTTL {
			delete(s.entries, key)
		}
	}
	if len(s.entries) >= messageOwnershipLimit {
		keys := make([]string, 0, len(s.entries))
		for key := range s.entries {
			keys = append(keys, key)
		}
		sort.Slice(keys, func(i, j int) bool {
			a, b := s.entries[keys[i]], s.entries[keys[j]]
			if a.Created.Equal(b.Created) {
				return keys[i] < keys[j]
			}
			return a.Created.Before(b.Created)
		})
		delete(s.entries, keys[0])
	}
	s.entries[key] = ownedMessage{Scope: scope, Created: now}
	err := s.persist()
	if err != nil {
		delete(s.entries, key)
	}
	return err
}

// Caller holds the index lock.
func (s *messageOwnership) persist() error {
	raw, err := json.Marshal(messageOwnershipState{Generation: s.generation, Entries: s.entries})
	if err != nil {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(s.path), ".message-ownership-*")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if _, err = f.Write(raw); err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err == nil {
		err = closeErr
	}
	if err == nil {
		err = os.Rename(f.Name(), s.path)
	}
	return err
}

func (s *messageOwnership) rotateAuthorization() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.generation = uuid()
	s.entries = map[string]ownedMessage{}
	s.loadErr = s.persist()
	// If persistence fails, discard the previous on-disk issuer index so a
	// restart cannot revive it. In-memory comparisons remain fail closed.
	if s.loadErr != nil {
		_ = os.Remove(s.path)
	}
	return s.loadErr
}

func (s *messageOwnership) issuerGeneration() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.generation
}

func (g *Gateway) ownershipIndex() *messageOwnership {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.messageIDs == nil {
		if g.Cache == nil {
			return &messageOwnership{loadErr: fmt.Errorf("message ownership storage unavailable")}
		}
		g.messageIDs = openMessageOwnership(filepath.Join(g.Cache.dir, "message-ownership-v1.json"))
	}
	return g.messageIDs
}

func (x *exchange) ownershipScope() string {
	// Core derives this header from authenticated host metadata. Direct Worker
	// calls are a single tenant under the Worker key; client session IDs and
	// opaque API metadata never establish ownership.
	if x.messageScope == "" {
		x.messageScope = digest([]string{"worker-message-v1", x.g.ownershipIndex().issuerGeneration(), x.g.Key, x.r.Header.Get("X-CCGateway-Session-Scope")})
	}
	return x.messageScope
}

func (x *exchange) rememberMessageID(message Object) {
	id := str(message, "id")
	if id == "" || x.req.CountTokens {
		return
	}
	if err := x.g.ownershipIndex().remember(id, x.ownershipScope(), time.Now()); err != nil {
		x.diagnostic.trace("message_ownership_write_failed", Object{"reason": "ownership_index_unavailable"})
	}
}

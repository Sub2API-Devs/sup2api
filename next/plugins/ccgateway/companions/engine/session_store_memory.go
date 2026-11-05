package engine

import (
	"container/list"
	"context"
	"slices"
	"sync"
	"time"
)

// memoryStore keeps the session memory in process memory: a restart or an
// eviction forgets it, and the thread's next request counts from its own
// history, as a new conversation's does. Each value lives for the lifetime
// it was written with; the least recently answered thread (and the least
// recently used session's tools) goes first past memoryStoreMax. The zero
// value is ready to use.
type memoryStore struct {
	mu sync.Mutex
	// threads, by sessionKey; front: most recently answered.
	order   *list.List
	entries map[string]*list.Element
	// tools, by session; front: most recently used.
	toolsOrder *list.List
	tools      map[string]*list.Element
	now        func() time.Time
}

// memoryStoreMax bounds the memory. A Worker serves one account and a few
// requests at a time, so far fewer threads than this are active in a day.
const memoryStoreMax = 4096

// memoryTools is one session's set in memory. synced: the set holds all the
// shared store had when it was read (fallbackStore); a set merged without
// that may lack what the shared store has.
type memoryTools struct {
	session string
	names   []string
	expires time.Time
	synced  bool
}

func (s *memoryStore) clock() time.Time {
	if s.now != nil {
		return s.now()
	}
	return time.Now()
}

func (s *memoryStore) init() {
	if s.entries == nil {
		s.entries, s.order = map[string]*list.Element{}, list.New()
		s.tools, s.toolsOrder = map[string]*list.Element{}, list.New()
	}
}

// thread is the thread's live entry (s.mu held), forgetting an expired one.
func (s *memoryStore) thread(key string) *sessionEntry {
	element := s.entries[key]
	if element == nil {
		return nil
	}
	entry := element.Value.(*sessionEntry)
	if !s.clock().Before(entry.expires) {
		s.order.Remove(element)
		delete(s.entries, key)
		return nil
	}
	return entry
}

func (s *memoryStore) loadThread(_ context.Context, session, thread string, _ time.Duration) (*sessionEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry := s.thread(sessionKey(session, thread))
	if entry == nil {
		return nil, nil
	}
	return entry.clone(), nil
}

func (s *memoryStore) saveThread(_ context.Context, session, thread string, e *sessionEntry, ttl time.Duration) error {
	s.putThread(session, thread, e, s.clock().Add(ttl))
	return nil
}

// putThread keeps e until expires (a copy read from the shared store keeps
// its own lifetime).
func (s *memoryStore) putThread(session, thread string, e *sessionEntry, expires time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.init()
	key := sessionKey(session, thread)
	entry := e.clone()
	entry.key, entry.expires = key, expires
	if element := s.entries[key]; element != nil {
		element.Value = entry
		s.order.MoveToFront(element)
	} else {
		s.entries[key] = s.order.PushFront(entry)
	}
	for s.order.Len() > memoryStoreMax {
		oldest := s.order.Back()
		s.order.Remove(oldest)
		delete(s.entries, oldest.Value.(*sessionEntry).key)
	}
}

// toolSet is the session's live set (s.mu held), forgetting an expired one.
func (s *memoryStore) toolSet(session string) *memoryTools {
	element := s.tools[session]
	if element == nil {
		return nil
	}
	set := element.Value.(*memoryTools)
	if !s.clock().Before(set.expires) {
		s.toolsOrder.Remove(element)
		delete(s.tools, session)
		return nil
	}
	return set
}

func (s *memoryStore) loadTools(_ context.Context, session string, ttl time.Duration) ([]string, error) {
	names, _, ok := s.readTools(session, ttl)
	if !ok {
		return nil, nil
	}
	return names, nil
}

// readTools is the session's set, renewed for ttl as a read of the shared
// store renews it, and whether it is synced.
func (s *memoryStore) readTools(session string, ttl time.Duration) (names []string, synced, ok bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	set := s.toolSet(session)
	if set == nil {
		return nil, false, false
	}
	set.expires = s.clock().Add(ttl)
	s.toolsOrder.MoveToFront(s.tools[session])
	return slices.Clone(set.names), set.synced, true
}

func (s *memoryStore) mergeTools(_ context.Context, session string, names []string, ttl time.Duration) error {
	s.mergeToolsSynced(session, names, ttl, false)
	return nil
}

// mergeToolsSynced merges names into the set; synced marks a set made from
// what the shared store has (a set already synced stays so).
func (s *memoryStore) mergeToolsSynced(session string, names []string, ttl time.Duration, synced bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.init()
	set := s.toolSet(session)
	if set == nil {
		set = &memoryTools{session: session, names: []string{}}
		s.tools[session] = s.toolsOrder.PushFront(set)
	} else {
		s.toolsOrder.MoveToFront(s.tools[session])
	}
	set.names, _ = mergeToolNames(set.names, names)
	set.expires = s.clock().Add(ttl)
	set.synced = set.synced || synced
	for s.toolsOrder.Len() > memoryStoreMax {
		oldest := s.toolsOrder.Back()
		s.toolsOrder.Remove(oldest)
		delete(s.tools, oldest.Value.(*memoryTools).session)
	}
}

func (s *memoryStore) close() {}

// clone is a copy of e another holder cannot change.
func (e *sessionEntry) clone() *sessionEntry {
	out := *e
	if e.state.Turn != nil {
		turn := *e.state.Turn
		out.state.Turn = &turn
	}
	out.spawns = slices.Clone(e.spawns)
	out.answers = slices.Clone(e.answers)
	return &out
}

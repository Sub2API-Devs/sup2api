package responsesws

import (
	"context"
	"crypto/sha256"
	"fmt"
	"sync"
	"time"

	"github.com/coder/websocket"
)

type nativeWSPool struct {
	mu      sync.Mutex
	entries map[[sha256.Size]byte]*nativeWSEntry
	max     int
	idle    time.Duration
}

type nativeWSEntry struct {
	connection *websocket.Conn
	frames     <-chan nativeWSFrame
	sessionID  string
	scope      string
	inUse      bool
	lastUsed   time.Time
}

type nativeWSLease struct {
	pool       *nativeWSPool
	key        [sha256.Size]byte
	connection *websocket.Conn
	frames     <-chan nativeWSFrame
	reused     bool
}

type nativeWSFrame struct {
	messageType websocket.MessageType
	payload     []byte
	err         error
}

func newNativeWSPool(maxEntries int, idleTimeout time.Duration) *nativeWSPool {
	return &nativeWSPool{entries: make(map[[sha256.Size]byte]*nativeWSEntry), max: maxEntries, idle: idleTimeout}
}

func (p *nativeWSPool) acquire(ctx context.Context, key [sha256.Size]byte, sessionID, scope string, dial func(context.Context) (*websocket.Conn, error)) (*nativeWSLease, error) {
	now := time.Now()
	var stale []*websocket.Conn
	p.mu.Lock()
	for existingKey, entry := range p.entries {
		if !entry.inUse && (now.Sub(entry.lastUsed) >= p.idle || (entry.scope == scope && existingKey != key)) {
			delete(p.entries, existingKey)
			stale = append(stale, entry.connection)
		}
	}
	if entry := p.entries[key]; entry != nil {
		if entry.inUse {
			p.mu.Unlock()
			closeNativeConnections(stale)
			return nil, fmt.Errorf("upstream WebSocket connection is already in use")
		}
		entry.inUse = true
		p.mu.Unlock()
		closeNativeConnections(stale)
		return &nativeWSLease{pool: p, key: key, connection: entry.connection, frames: entry.frames, reused: true}, nil
	}
	if len(p.entries) >= p.max {
		var oldestKey [sha256.Size]byte
		var oldest *nativeWSEntry
		for candidateKey, candidate := range p.entries {
			if !candidate.inUse && (oldest == nil || candidate.lastUsed.Before(oldest.lastUsed)) {
				oldestKey, oldest = candidateKey, candidate
			}
		}
		if oldest == nil {
			p.mu.Unlock()
			closeNativeConnections(stale)
			return nil, fmt.Errorf("upstream WebSocket pool capacity reached")
		}
		delete(p.entries, oldestKey)
		stale = append(stale, oldest.connection)
	}
	p.mu.Unlock()
	closeNativeConnections(stale)

	connection, err := dial(ctx)
	if err != nil {
		return nil, err
	}
	p.mu.Lock()
	if _, exists := p.entries[key]; exists {
		p.mu.Unlock()
		connection.CloseNow()
		return nil, fmt.Errorf("duplicate upstream WebSocket pool key")
	}
	frames := readNativeWSFrames(connection)
	p.entries[key] = &nativeWSEntry{connection: connection, frames: frames, sessionID: sessionID, scope: scope, inUse: true, lastUsed: now}
	p.mu.Unlock()
	return &nativeWSLease{pool: p, key: key, connection: connection, frames: frames}, nil
}

func readNativeWSFrames(connection *websocket.Conn) <-chan nativeWSFrame {
	frames := make(chan nativeWSFrame, 16)
	go func() {
		defer close(frames)
		for {
			messageType, payload, err := connection.Read(context.Background())
			select {
			case frames <- nativeWSFrame{messageType: messageType, payload: payload, err: err}:
			default:
				connection.CloseNow()
				return
			}
			if err != nil {
				return
			}
		}
	}()
	return frames
}

func (l *nativeWSLease) release(keep bool) {
	if l == nil || l.pool == nil || l.connection == nil {
		return
	}
	var closeConnection *websocket.Conn
	l.pool.mu.Lock()
	entry := l.pool.entries[l.key]
	if entry != nil && entry.connection == l.connection {
		if keep {
			entry.inUse = false
			entry.lastUsed = time.Now()
		} else {
			delete(l.pool.entries, l.key)
			closeConnection = entry.connection
		}
	}
	l.pool.mu.Unlock()
	if closeConnection != nil {
		closeConnection.CloseNow()
	}
}

func (l *nativeWSLease) hasPendingFrame() bool {
	if l == nil || l.frames == nil {
		return true
	}
	select {
	case <-l.frames:
		return true
	default:
		return false
	}
}

func (p *nativeWSPool) closeSession(sessionID string) {
	if p == nil {
		return
	}
	var connections []*websocket.Conn
	p.mu.Lock()
	for key, entry := range p.entries {
		if entry.sessionID == sessionID {
			delete(p.entries, key)
			connections = append(connections, entry.connection)
		}
	}
	p.mu.Unlock()
	closeNativeConnections(connections)
}

func (p *nativeWSPool) closeAll() {
	if p == nil {
		return
	}
	var connections []*websocket.Conn
	p.mu.Lock()
	for key, entry := range p.entries {
		delete(p.entries, key)
		connections = append(connections, entry.connection)
	}
	p.mu.Unlock()
	closeNativeConnections(connections)
}

func closeNativeConnections(connections []*websocket.Conn) {
	for _, connection := range connections {
		connection.CloseNow()
	}
}

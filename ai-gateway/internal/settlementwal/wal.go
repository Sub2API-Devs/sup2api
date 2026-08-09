// Package settlementwal persists settlement facts in SQLite until NATS
// JetStream acknowledges durable publication. SQLite provides a transactional,
// crash-safe outbox that is replayed when the Worker restarts.
package settlementwal

import (
	"bytes"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"google.golang.org/protobuf/proto"
	_ "modernc.org/sqlite"
)

const (
	recordSuffix = ".settlement.pb"
	databaseName = "settlements.sqlite3"
)

var (
	ErrFull     = errors.New("settlement WAL is full")
	ErrConflict = errors.New("settlement WAL request ID conflicts with existing facts")
)

type Record struct {
	Name    string
	Request *controlv1.SettleRequestRequest
}

type Store struct {
	db       *sql.DB
	dir      string
	maxBytes int64

	mu    sync.Mutex
	bytes int64
}

func Open(dir string, maxBytes int64) (*Store, error) {
	dir = strings.TrimSpace(dir)
	if dir == "" {
		return nil, fmt.Errorf("settlement WAL path is required")
	}
	if maxBytes <= 0 {
		return nil, fmt.Errorf("settlement WAL maximum bytes must be positive")
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, fmt.Errorf("create settlement WAL directory: %w", err)
	}
	if err := os.Chmod(dir, 0o700); err != nil {
		return nil, fmt.Errorf("secure settlement WAL directory: %w", err)
	}

	path := filepath.Join(dir, databaseName)
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open settlement SQLite outbox: %w", err)
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	store := &Store{db: db, dir: dir, maxBytes: maxBytes}
	if err := store.initialize(); err != nil {
		_ = db.Close()
		return nil, err
	}
	for _, suffix := range []string{"", "-wal", "-shm"} {
		if err := os.Chmod(path+suffix, 0o600); err != nil && !errors.Is(err, os.ErrNotExist) {
			_ = db.Close()
			return nil, fmt.Errorf("secure settlement SQLite outbox: %w", err)
		}
	}
	if err := store.migrateLegacyFiles(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *Store) initialize() error {
	for _, statement := range []string{
		`PRAGMA journal_mode = WAL`,
		`PRAGMA synchronous = FULL`,
		`PRAGMA busy_timeout = 5000`,
		`CREATE TABLE IF NOT EXISTS settlements (
			name TEXT PRIMARY KEY,
			request_id TEXT NOT NULL UNIQUE,
			payload BLOB NOT NULL,
			payload_bytes INTEGER NOT NULL CHECK (payload_bytes >= 0),
			created_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_settlements_created_at ON settlements(created_at, name)`,
	} {
		if _, err := s.db.Exec(statement); err != nil {
			return fmt.Errorf("initialize settlement SQLite outbox: %w", err)
		}
	}
	if err := s.db.QueryRow(`SELECT COALESCE(SUM(payload_bytes), 0) FROM settlements`).Scan(&s.bytes); err != nil {
		return fmt.Errorf("measure settlement SQLite outbox: %w", err)
	}
	return nil
}

// Put transactionally records a settlement before returning. Repeated writes
// for the same request ID are idempotent and never replace original facts.
func (s *Store) Put(request *controlv1.SettleRequestRequest) error {
	if s == nil || s.db == nil {
		return fmt.Errorf("settlement WAL is unavailable")
	}
	requestID := strings.TrimSpace(request.GetRequestId())
	if request == nil || requestID == "" {
		return fmt.Errorf("settlement request ID is required")
	}
	payload, err := proto.MarshalOptions{Deterministic: true}.Marshal(request)
	if err != nil {
		return fmt.Errorf("marshal settlement: %w", err)
	}
	name := recordName(requestID)

	s.mu.Lock()
	defer s.mu.Unlock()
	var existing []byte
	err = s.db.QueryRow(`SELECT payload FROM settlements WHERE request_id = ?`, requestID).Scan(&existing)
	if err == nil {
		if bytes.Equal(existing, payload) {
			return nil
		}
		return ErrConflict
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("inspect settlement SQLite record: %w", err)
	}
	if int64(len(payload)) > s.maxBytes-s.bytes {
		return ErrFull
	}
	if _, err := s.db.Exec(
		`INSERT INTO settlements(name, request_id, payload, payload_bytes) VALUES (?, ?, ?, ?)`,
		name, requestID, payload, len(payload),
	); err != nil {
		return fmt.Errorf("insert settlement SQLite record: %w", err)
	}
	s.bytes += int64(len(payload))
	return nil
}

func (s *Store) List() ([]Record, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("settlement WAL is unavailable")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	rows, err := s.db.Query(`SELECT name, payload FROM settlements ORDER BY created_at, name`)
	if err != nil {
		return nil, fmt.Errorf("scan settlement SQLite outbox: %w", err)
	}
	defer rows.Close()
	var records []Record
	for rows.Next() {
		var name string
		var payload []byte
		if err := rows.Scan(&name, &payload); err != nil {
			return nil, fmt.Errorf("read settlement SQLite record: %w", err)
		}
		request := new(controlv1.SettleRequestRequest)
		if err := proto.Unmarshal(payload, request); err != nil {
			return nil, fmt.Errorf("decode settlement SQLite record %q: %w", name, err)
		}
		if request.GetRequestId() == "" || recordName(request.GetRequestId()) != name {
			return nil, fmt.Errorf("settlement SQLite record %q has an invalid request ID", name)
		}
		records = append(records, Record{Name: name, Request: request})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate settlement SQLite records: %w", err)
	}
	return records, nil
}

// Delete removes only a record already acknowledged by JetStream.
func (s *Store) Delete(record Record) error {
	if s == nil || s.db == nil {
		return fmt.Errorf("settlement WAL is unavailable")
	}
	if !validRecordName(record.Name) {
		return fmt.Errorf("invalid settlement WAL record name")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	var size int64
	err := s.db.QueryRow(`SELECT payload_bytes FROM settlements WHERE name = ?`, record.Name).Scan(&size)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("inspect settlement SQLite record: %w", err)
	}
	if _, err := s.db.Exec(`DELETE FROM settlements WHERE name = ?`, record.Name); err != nil {
		return fmt.Errorf("delete settlement SQLite record: %w", err)
	}
	s.bytes -= size
	if s.bytes < 0 {
		s.bytes = 0
	}
	return nil
}

func (s *Store) migrateLegacyFiles() error {
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		return fmt.Errorf("scan legacy settlement WAL: %w", err)
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), recordSuffix) {
			continue
		}
		path := filepath.Join(s.dir, entry.Name())
		payload, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read legacy settlement WAL record %q: %w", entry.Name(), err)
		}
		request := new(controlv1.SettleRequestRequest)
		if err := proto.Unmarshal(payload, request); err != nil {
			return fmt.Errorf("decode legacy settlement WAL record %q: %w", entry.Name(), err)
		}
		if recordName(request.GetRequestId()) != entry.Name() {
			return fmt.Errorf("legacy settlement WAL record %q has an invalid request ID", entry.Name())
		}
		if err := s.Put(request); err != nil {
			return fmt.Errorf("migrate legacy settlement WAL record %q: %w", entry.Name(), err)
		}
		if err := os.Remove(path); err != nil {
			return fmt.Errorf("remove migrated settlement WAL record %q: %w", entry.Name(), err)
		}
	}
	return nil
}

func (s *Store) Bytes() int64 {
	if s == nil {
		return 0
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.bytes
}

func (s *Store) MaxBytes() int64 {
	if s == nil {
		return 0
	}
	return s.maxBytes
}

func (s *Store) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	_, _ = s.db.Exec(`PRAGMA wal_checkpoint(TRUNCATE)`)
	return s.db.Close()
}

func recordName(requestID string) string {
	digest := sha256.Sum256([]byte(requestID))
	return hex.EncodeToString(digest[:]) + recordSuffix
}

func validRecordName(name string) bool {
	if !strings.HasSuffix(name, recordSuffix) {
		return false
	}
	digest := strings.TrimSuffix(name, recordSuffix)
	if len(digest) != sha256.Size*2 {
		return false
	}
	_, err := hex.DecodeString(digest)
	return err == nil
}

// Package settlementwal persists settlement facts until the authoritative
// control plane acknowledges them. Each request is an independently fsynced
// protobuf file so process crashes cannot turn completed requests into lost
// billing events.
package settlementwal

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"google.golang.org/protobuf/proto"
)

const recordSuffix = ".settlement.pb"

var (
	ErrFull     = errors.New("settlement WAL is full")
	ErrConflict = errors.New("settlement WAL request ID conflicts with existing facts")
)

type Record struct {
	Name    string
	Request *controlv1.SettleRequestRequest
}

type Store struct {
	dir      string
	maxBytes int64

	mu    sync.Mutex
	bytes int64
}

func Open(dir string, maxBytes int64) (*Store, error) {
	if strings.TrimSpace(dir) == "" {
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

	store := &Store{dir: dir, maxBytes: maxBytes}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("scan settlement WAL: %w", err)
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), recordSuffix) {
			continue
		}
		info, statErr := entry.Info()
		if statErr != nil {
			return nil, fmt.Errorf("stat settlement WAL record %q: %w", entry.Name(), statErr)
		}
		store.bytes += info.Size()
	}
	return store, nil
}

// Put durably records a settlement before returning. Repeated writes for the
// same request ID are idempotent and never replace the original facts.
func (s *Store) Put(request *controlv1.SettleRequestRequest) error {
	if s == nil {
		return fmt.Errorf("settlement WAL is unavailable")
	}
	if request == nil || strings.TrimSpace(request.GetRequestId()) == "" {
		return fmt.Errorf("settlement request ID is required")
	}
	payload, err := proto.MarshalOptions{Deterministic: true}.Marshal(request)
	if err != nil {
		return fmt.Errorf("marshal settlement: %w", err)
	}
	name := recordName(request.GetRequestId())

	s.mu.Lock()
	defer s.mu.Unlock()
	path := filepath.Join(s.dir, name)
	if existing, err := os.ReadFile(path); err == nil {
		if bytes.Equal(existing, payload) {
			return nil
		}
		return ErrConflict
	} else if !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("inspect settlement WAL record: %w", err)
	}
	if int64(len(payload)) > s.maxBytes-s.bytes {
		return ErrFull
	}

	temporary, err := os.CreateTemp(s.dir, ".settlement-*")
	if err != nil {
		return fmt.Errorf("create temporary settlement WAL record: %w", err)
	}
	temporaryPath := temporary.Name()
	removeTemporary := true
	defer func() {
		_ = temporary.Close()
		if removeTemporary {
			_ = os.Remove(temporaryPath)
		}
	}()
	if err := temporary.Chmod(0o600); err != nil {
		return fmt.Errorf("secure settlement WAL record: %w", err)
	}
	if _, err := temporary.Write(payload); err != nil {
		return fmt.Errorf("write settlement WAL record: %w", err)
	}
	if err := temporary.Sync(); err != nil {
		return fmt.Errorf("sync settlement WAL record: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("close settlement WAL record: %w", err)
	}
	if err := os.Rename(temporaryPath, path); err != nil {
		return fmt.Errorf("publish settlement WAL record: %w", err)
	}
	removeTemporary = false
	s.bytes += int64(len(payload))
	if err := syncDirectory(s.dir); err != nil {
		return fmt.Errorf("sync settlement WAL directory: %w", err)
	}
	return nil
}

func (s *Store) List() ([]Record, error) {
	if s == nil {
		return nil, fmt.Errorf("settlement WAL is unavailable")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		return nil, fmt.Errorf("scan settlement WAL: %w", err)
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })
	records := make([]Record, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), recordSuffix) {
			continue
		}
		payload, readErr := os.ReadFile(filepath.Join(s.dir, entry.Name()))
		if readErr != nil {
			return nil, fmt.Errorf("read settlement WAL record %q: %w", entry.Name(), readErr)
		}
		request := new(controlv1.SettleRequestRequest)
		if unmarshalErr := proto.Unmarshal(payload, request); unmarshalErr != nil {
			return nil, fmt.Errorf("decode settlement WAL record %q: %w", entry.Name(), unmarshalErr)
		}
		if request.GetRequestId() == "" || recordName(request.GetRequestId()) != entry.Name() {
			return nil, fmt.Errorf("settlement WAL record %q has an invalid request ID", entry.Name())
		}
		records = append(records, Record{Name: entry.Name(), Request: request})
	}
	return records, nil
}

// Delete removes only an already acknowledged record and persists the
// directory update. It is safe when overlapping Caddy runtimes already
// removed the same record.
func (s *Store) Delete(record Record) error {
	if s == nil {
		return fmt.Errorf("settlement WAL is unavailable")
	}
	if !validRecordName(record.Name) {
		return fmt.Errorf("invalid settlement WAL record name")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	path := filepath.Join(s.dir, record.Name)
	info, err := os.Stat(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("stat settlement WAL record: %w", err)
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("delete settlement WAL record: %w", err)
	}
	if err := syncDirectory(s.dir); err != nil {
		return fmt.Errorf("sync settlement WAL directory: %w", err)
	}
	s.bytes -= info.Size()
	if s.bytes < 0 {
		s.bytes = 0
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

func syncDirectory(dir string) error {
	handle, err := os.Open(dir)
	if err != nil {
		return err
	}
	defer handle.Close()
	return handle.Sync()
}

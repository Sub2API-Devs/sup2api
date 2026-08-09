package settlementwal

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"google.golang.org/protobuf/proto"
)

func TestStorePersistsRecoversAndDeletesSettlement(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "settlements")
	store, err := Open(dir, 1<<20)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	request := &controlv1.SettleRequestRequest{RequestId: "request-1", LeaseId: "lease-1"}
	if err := store.Put(request); err != nil {
		t.Fatalf("Put: %v", err)
	}
	if err := store.Put(request); err != nil {
		t.Fatalf("idempotent Put: %v", err)
	}

	reopened, err := Open(dir, 1<<20)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	records, err := reopened.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(records) != 1 || records[0].Request.GetLeaseId() != "lease-1" {
		t.Fatalf("records = %+v", records)
	}
	info, err := os.Stat(filepath.Join(dir, databaseName))
	if err != nil {
		t.Fatalf("stat record: %v", err)
	}
	if info.Mode().Perm() != 0o600 {
		t.Fatalf("record permissions = %o", info.Mode().Perm())
	}
	for _, suffix := range []string{"-wal", "-shm"} {
		info, err := os.Stat(filepath.Join(dir, databaseName) + suffix)
		if err != nil {
			t.Fatalf("stat SQLite sidecar %s: %v", suffix, err)
		}
		if info.Mode().Perm() != 0o600 {
			t.Fatalf("SQLite sidecar %s permissions = %o", suffix, info.Mode().Perm())
		}
	}
	if err := reopened.Delete(records[0]); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if remaining, err := reopened.List(); err != nil || len(remaining) != 0 {
		t.Fatalf("remaining=%+v err=%v", remaining, err)
	}
}

func TestStoreRejectsWriteBeyondMaximum(t *testing.T) {
	store, err := Open(t.TempDir(), 1)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	err = store.Put(&controlv1.SettleRequestRequest{RequestId: "request-1", LeaseId: "lease-1"})
	if !errors.Is(err, ErrFull) {
		t.Fatalf("Put error = %v", err)
	}
}

func TestStoreRejectsConflictingFactsForSameRequestID(t *testing.T) {
	store, err := Open(t.TempDir(), 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Put(&controlv1.SettleRequestRequest{RequestId: "request-1", LeaseId: "lease-1"}); err != nil {
		t.Fatal(err)
	}
	if err := store.Put(&controlv1.SettleRequestRequest{RequestId: "request-1", LeaseId: "lease-2"}); !errors.Is(err, ErrConflict) {
		t.Fatalf("conflicting Put error = %v", err)
	}
}

func TestStoreRejectsCorruptedRecord(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(dir, 1<<20)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	name := recordName("request-1")
	if _, err := store.db.Exec(`INSERT INTO settlements(name, request_id, payload, payload_bytes) VALUES (?, ?, ?, ?)`, name, "request-1", []byte("not-protobuf"), 12); err != nil {
		t.Fatalf("write corrupt record: %v", err)
	}
	if _, err := store.List(); err == nil {
		t.Fatal("expected corrupt record error")
	}
}

func TestStoreMigratesLegacyProtobufFilesIntoSQLite(t *testing.T) {
	dir := t.TempDir()
	request := &controlv1.SettleRequestRequest{RequestId: "legacy-request", LeaseId: "legacy-lease"}
	payload, err := proto.MarshalOptions{Deterministic: true}.Marshal(request)
	if err != nil {
		t.Fatal(err)
	}
	legacyPath := filepath.Join(dir, recordName(request.GetRequestId()))
	if err := os.WriteFile(legacyPath, payload, 0o600); err != nil {
		t.Fatal(err)
	}
	store, err := Open(dir, 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	records, err := store.List()
	if err != nil || len(records) != 1 || records[0].Request.GetLeaseId() != "legacy-lease" {
		t.Fatalf("records=%+v err=%v", records, err)
	}
	if _, err := os.Stat(legacyPath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("legacy file was not removed: %v", err)
	}
}

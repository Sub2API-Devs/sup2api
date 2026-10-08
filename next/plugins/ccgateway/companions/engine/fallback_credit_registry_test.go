package engine

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
)

func TestCreditRegistryEncryptedBoundedAndPersistent(t *testing.T) {
	root := t.TempDir()
	registry, err := newCreditRegistry(root, "synthetic-worker-key", 4096)
	if err != nil {
		t.Fatal(err)
	}
	hash, _ := credits.TokenHash("synthetic-credit-token")
	record := creditSnapshot{Hash: hash, ClientDigests: []string{digest("client")}, WirePrompt: json.RawMessage(`{"system":"PROMPT_SECRET_CANARY","messages":[]}`), ExpiresAt: time.Now().Add(time.Minute)}
	if err = registry.Save(record); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(filepath.Join(root, hash+".credit"))
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(raw, []byte("PROMPT_SECRET_CANARY")) || bytes.Contains(raw, []byte("synthetic-credit-token")) {
		t.Fatal("credit material persisted as plaintext")
	}
	reopened, err := newCreditRegistry(root, "synthetic-worker-key", 4096)
	if err != nil {
		t.Fatal(err)
	}
	loaded, err := reopened.Load(hash)
	if err != nil || digest(loaded) != digest(record) {
		t.Fatal("restart lost encrypted snapshot", err)
	}
	changed := record
	changed.ExpiresAt = record.ExpiresAt.Add(time.Minute)
	if err = registry.Save(changed); err != nil {
		t.Fatal(err)
	}
	loaded, _ = registry.Load(hash)
	if !loaded.ExpiresAt.Equal(record.ExpiresAt) {
		t.Fatal("repeat observation extended expiry")
	}
	changed.WirePrompt = json.RawMessage(`{"system":"different"}`)
	if registry.Save(changed) == nil {
		t.Fatal("same token moved to a different prompt")
	}
	wrong, _ := newCreditRegistry(root, "other-worker-key", 4096)
	if _, err = wrong.Load(hash); err == nil {
		t.Fatal("key rotation decrypted old snapshot")
	}
	tooSmall, _ := newCreditRegistry(t.TempDir(), "synthetic-worker-key", 1)
	if tooSmall.Save(record) == nil {
		t.Fatal("snapshot capacity bypass")
	}
	if _, err = registry.Load("../escape"); err == nil {
		t.Fatal("snapshot path traversal accepted")
	}
	raw[len(raw)-1] ^= 1
	if err = os.WriteFile(filepath.Join(root, hash+".credit"), raw, 0600); err != nil {
		t.Fatal(err)
	}
	if _, err = registry.Load(hash); err == nil {
		t.Fatal("modified ciphertext accepted")
	}
}

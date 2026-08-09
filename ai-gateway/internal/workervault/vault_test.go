package workervault

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	bolt "go.etcd.io/bbolt"
)

func TestVaultEncryptsSecretsAndPersistsSummaries(t *testing.T) {
	path := filepath.Join(t.TempDir(), "worker-vault.db")
	key := bytes.Repeat([]byte{0x42}, 32)
	vault, err := Open(path, key)
	if err != nil {
		t.Fatal(err)
	}
	account := &Account{
		ID: "account-a", Name: "oauth", Kind: "openai_oauth", Status: "active",
		AccessToken: "access-secret-value", RefreshToken: "refresh-secret-value",
		CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	if err := vault.Put(account); err != nil {
		t.Fatal(err)
	}
	if err := vault.Close(); err != nil {
		t.Fatal(err)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	for _, secret := range [][]byte{[]byte(account.AccessToken), []byte(account.RefreshToken)} {
		if bytes.Contains(raw, secret) {
			t.Fatalf("vault file contains plaintext credential %q", secret)
		}
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0o600 {
		t.Fatalf("unexpected vault permissions: %o", info.Mode().Perm())
	}

	reopened, err := Open(path, key)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	loaded, err := reopened.Get(account.ID)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.RefreshToken != account.RefreshToken || loaded.AccessToken != account.AccessToken {
		t.Fatal("reopened vault did not preserve encrypted credentials")
	}
	summary := loaded.Summary()
	if summary.ID != account.ID || summary.Name != account.Name {
		t.Fatalf("unexpected summary: %+v", summary)
	}
}

func TestVaultMigratesLegacyBoltDBToSQLite(t *testing.T) {
	path := filepath.Join(t.TempDir(), "worker-vault.db")
	key := bytes.Repeat([]byte{0x24}, 32)
	block, err := aes.NewCipher(key)
	if err != nil {
		t.Fatal(err)
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		t.Fatal(err)
	}
	sealer := &Vault{aead: aead}
	account := &Account{ID: "legacy-account", Name: "Legacy", APIKey: "encrypted-secret", CreatedAt: time.Now(), UpdatedAt: time.Now()}
	raw, _ := json.Marshal(account)
	sealedAccount, _ := sealer.seal(account.ID, raw)
	sealedCheck, _ := sealer.seal(string(keyCheckName), []byte(keyCheckPlaintext))
	legacy, err := bolt.Open(path, 0o600, nil)
	if err != nil {
		t.Fatal(err)
	}
	if err := legacy.Update(func(tx *bolt.Tx) error {
		accounts, err := tx.CreateBucket(accountsBucket)
		if err != nil {
			return err
		}
		metadata, err := tx.CreateBucket(metadataBucket)
		if err != nil {
			return err
		}
		if err := accounts.Put([]byte(account.ID), sealedAccount); err != nil {
			return err
		}
		return metadata.Put(keyCheckName, sealedCheck)
	}); err != nil {
		t.Fatal(err)
	}
	if err := legacy.Close(); err != nil {
		t.Fatal(err)
	}

	vault, err := Open(path, key)
	if err != nil {
		t.Fatal(err)
	}
	defer vault.Close()
	loaded, err := vault.Get(account.ID)
	if err != nil || loaded.APIKey != account.APIKey {
		t.Fatalf("loaded=%+v err=%v", loaded, err)
	}
	header, err := os.ReadFile(path)
	if err != nil || !bytes.HasPrefix(header, []byte("SQLite format 3")) {
		t.Fatalf("vault was not migrated to SQLite: %v", err)
	}
	if _, err := os.Stat(path + ".bbolt.backup"); err != nil {
		t.Fatalf("legacy encrypted backup is missing: %v", err)
	}
}

func TestVaultFailsClosedWithWrongKey(t *testing.T) {
	path := filepath.Join(t.TempDir(), "worker-vault.db")
	vault, err := Open(path, bytes.Repeat([]byte{1}, 32))
	if err != nil {
		t.Fatal(err)
	}
	if err := vault.Put(&Account{ID: "a", Name: "A", CreatedAt: time.Now(), UpdatedAt: time.Now()}); err != nil {
		t.Fatal(err)
	}
	if err := vault.Close(); err != nil {
		t.Fatal(err)
	}

	if _, err := Open(path, bytes.Repeat([]byte{2}, 32)); err == nil {
		t.Fatal("expected opening the vault with the wrong key to fail closed")
	}
}

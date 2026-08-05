package workervault

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
	"time"
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
